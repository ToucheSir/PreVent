/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* 
 * File:   CacheFileHdf5Writer.cpp
 * Author: ryan
 * 
 * Created on August 26, 2016, 12:55 PM
 * 
 * Almost all the zlib code was taken from http://www.zlib.net/zlib_how.html
 */

#include "ZlReader2.h"
#include "SignalData.h"
#include "DataRow.h"
#include "Hdf5Writer.h"
#include "StreamChunkReader.h"

#include <iostream>
#include <fstream>
#include <sstream>
#include <filesystem>
#include "config.h"
#include "json.hpp"

#if defined(MSDOS) || defined(OS2) || defined(WIN32) || defined(__CYGWIN__)
#include <fcntl.h>
#include <io.h>
#define SET_BINARY_MODE(file) setmode(fileno(file), O_BINARY)
#else
#define SET_BINARY_MODE(file)
#endif

namespace fs = std::filesystem;
namespace FormatConverter{

  ZlReader2::ZlReader2( ) : Reader( "Zl" ), firstread( true ) { }

  ZlReader2::ZlReader2( const std::string& name ) : Reader( name ), firstread( true ) { }

  ZlReader2::ZlReader2( const ZlReader2& orig ) : Reader( orig ), firstread( orig.firstread ) { }

  ZlReader2::~ZlReader2( ) { }

  void ZlReader2::finish( ) {
    signalToReaderLkp.clear( );
  }

  int ZlReader2::prepare( const std::string& input, SignalSet * data ) {
    int rslt = Reader::prepare( input, data );
    if ( rslt != 0 ) {
      return rslt;
    }

    // the new format is a directory full of gzip-compressed files
    fs::path p1 = input;
    if ( !fs::is_directory( p1 ) ) {
      return -1;
    }

    signalToReaderLkp.clear( );
    for ( const auto& path : fs::directory_iterator( p1 ) ) {
      std::string filename( path.path( ).generic_string( ) );

      size_t lastdash = filename.find_last_of( '-' ) + 1;
      size_t ext = filename.find_last_of( '.' );
      std::string signal( filename.substr( lastdash, ext - lastdash ) );

      signalToReaderLkp[signal] = StreamChunkReader::fromFile( filename );
    }

    return 0;
  }

  ReadResult ZlReader2::fill( SignalSet * info, const ReadResult& lastrr ) {
    // we need to loop through all our signals to fill the SignalSet

    // the format looks like this:
    // [
    //  [
    //    "1519448400229",
    //    "1010068",
    //    "0,0,0,0,0,0,0,0,0,0,0,0,0,0,0"
    //  ],
    //  [
    //    "1519448400478",                  <-- sample time (ms)
    //    "1010069",                        <-- sequence number (ignored)
    //    "0,0,0,0,0,0,0,0,0,0,0,0,0,0,0"   <-- readings
    //  ],
    //  ...
    // ]

    ReadResult ss = ReadResult::END_OF_FILE;
    for ( const auto& x : signalToReaderLkp ) {
      // the pull parsing doesn't seem to work quite yet
      // for now, just read in the whole file

      bool added;
          SignalData * signal = info->addWave( x.first, &added );

          std::string data = normalizeText( x.first, x.second->readNextChunk( ) );
      while ( ReadResult::NORMAL == x.second->rr ) {
        // process what we just read
        if ( "" != data ) {
          auto jj = nlohmann::json::parse( data );

              // we have one array of many arrays
              // iterate through the array, and add DataRows
          for ( auto j2 : jj ) {
            std::string timestr = j2[0];
                std::string data = j2[2];

            if ( waveIsOk( data ) ) {
              auto row = DataRow::many( modtime( std::stol( timestr ) ), data );

              if ( added ) {
                int readings = static_cast<int> ( row->data.size( ) );
                    signal->setChunkIntervalAndSampleRate( 250, readings );
              }

              signal->add( std::move( row ) );
            }
          }
        }

        data = normalizeText( x.first, x.second->readNextChunk( ) );
      }

      if ( ReadResult::END_OF_FILE == x.second->rr ) {
        // we're done with the file, so load our last bit of data
        if ( "" != data ) {
          auto jj = nlohmann::json::parse( data );

              // we have one array of many arrays
              // iterate through the array, and add DataRows
          for ( auto j2 : jj ) {
            std::string timestr = j2[0];
                std::string data = j2[2];
            if ( waveIsOk( data ) ) {
              auto row = DataRow::many( modtime( std::stol( timestr ) ), data );
              if ( added ) {
                int readings = static_cast<int> ( row->data.size( ) );
                    signal->setChunkIntervalAndSampleRate( 250, readings );
              }

              signal->add( std::move( row ) );
            }
          }
        }
      }
      else {

        ss = x.second->rr;
      }
    }
    return ss;
  }

  std::string ZlReader2::normalizeText( const std::string& signalname, std::string text ) {
    std::string data = leftovers[signalname] + text;

        // we happened to split *just* before our final
        // array closing, so there's nothing left now
    if ( ']' == data[0] ) {
      leftovers[signalname].clear( );
      return "";
    }

    // if we start with a "[[", remove the first [
    std::string first2 = data.substr( 0, 2 );
    if ( "[[" == first2 ) {
      data = data.substr( 1 );
    }
    else if ( ", " == first2 ) {
      // if we start with a comma, remove the it
      data = data.substr( 2 );
    }

    size_t lastclose = data.find_last_of( ']' );
    if ( std::string::npos == lastclose ) {
      // no ending array marker, so _everything_ goes to leftovers  
      leftovers[signalname] = data;
      return "";
    }
    else {
      // our JSON will end with "]]", so check for it
      if ( ']' == data[lastclose - 1] ) {
        // we're at the very end of our stream
        leftovers[signalname].clear( );
        return "[" + data.substr( 0, lastclose + 1 );
      }

      // we have a ] so save the stuff after it
      leftovers[signalname] = data.substr( lastclose + 1 );

      return "[" + data.substr( 0, lastclose + 1 ) + "]";
    }
  }

  bool ZlReader2::waveIsOk( const std::string& wavedata ) {
    // if all the values are -32768 or -32753, this isn't a valid reading
    std::stringstream stream( wavedata );
    for ( std::string each; std::getline( stream, each, ',' ); ) {
      if ( !( "-32768" == each || "-32753" == each ) ) {
        return true;
      }
    }
    return false;
  }
}