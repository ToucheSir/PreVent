/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

#include "FileNamer.h"
#include "SignalSet.h"
#include "config.h"
#include <sys/stat.h>
#include <iostream>
#include <ctime>
#include <sstream>
#include <time.h>
#include <stdio.h>

//this should fetch current working directory regardless of platform
#ifdef _WIN32
#include <direct.h>
#define GetCurrentDir _getcwd
#else
#include <unistd.h>
#define GetCurrentDir getcwd
#endif

namespace FormatConverter{
  const std::string FileNamer::DEFAULT_PATTERN = "%d%i-p%p-%s.%t";
  const std::string FileNamer::FILENAME_PATTERN = "%i.%t";

  FileNamer::FileNamer( const std::string& pat ) : pattern( pat ), offset( 0 ) {
  }

  FileNamer::FileNamer( const FileNamer& orig ) : pattern( orig.pattern ),
  conversions( orig.conversions.begin( ), orig.conversions.end( ) ),
  lastname( orig.lastname ), inputfile( orig.inputfile ), offset( 0 ) {
  }

  FileNamer::~FileNamer( ) {
  }

  FileNamer& FileNamer::operator=(const FileNamer& orig ) {
    if ( this != &orig ) {
      pattern = orig.pattern;
      conversions.clear( );
      conversions.insert( orig.conversions.begin( ), orig.conversions.end( ) );
      lastname = orig.lastname;
      inputfile = orig.inputfile;
      offset = orig.offset;
    }
    return *this;
  }

  FileNamer FileNamer::parse( const std::string& pattern ) {
    std::string expand = pattern;
    size_t pos = expand.find( "%S" );
    while ( pos != std::string::npos ) //initially sorts through file for all standard form flags and expands them
    {
      std::cout << "replacing %S with %i-p%p-%s.%t" << std::endl;
      expand.replace( pos, 2, "%i-p%p-%s.%t" );
      pos = expand.find( "%S", pos + 1 );
    }
    return FileNamer( expand );
  }

  void FileNamer::inputfilename( const std::string& inny ) {
    inputfile = inny;

    //Last modification date
    struct stat t_stat;
    stat( inputfile.c_str( ), &t_stat ); //reads metadata of input file
    struct tm * timeinfo = localtime( &t_stat.st_mtime ); //stores last modification time in pointer
    conversions["%m"] = YYYYMMDD( timeinfo );

    const size_t sfxpos = inny.rfind( "." );
    std::string input = inny;
    if ( std::string::npos != sfxpos ) {
      input = inny.substr( 0, sfxpos );
      conversions["%i"] = input;
      conversions["%x"] = inny.substr( sfxpos + 1 );
    }

    // get rid of any leading directories
    const size_t basepos = input.rfind( dirsep );
    if ( std::string::npos != basepos ) {
      conversions["%i"] = input.substr( basepos + 1 );
      conversions["%d"] = input.substr( 0, basepos ) + dirsep;
    }
    else {
      conversions["%i"] = input;
      conversions["%d"] = "";
    }
  }

  std::string FileNamer::inputfilename( ) const {
    return inputfile;
  }

  std::string FileNamer::filenameNoExt( SignalSet * data ) {
    // for now, always the same thing
    const size_t pos = lastname.rfind( "." );
    return lastname.substr( 0, pos );
  }

  void FileNamer::timeoffset_ms( long off ) {
    offset = off;
  }

  std::string FileNamer::filename( SignalSet * data ) {
    // we need to have data for all the conversion keys in here

    conversions["%s"] = getDateSuffix( data->earliest( ), "", offset );
    conversions["%e"] = getDateSuffix( data->latest( ), "", offset );

    //Current Date
    time_t tim;
    time( &tim );
    struct tm *curr_time = localtime( &tim );
    conversions["%D"] = YYYYMMDD( curr_time );

    //Current working directory
    char cCurrentPath[FILENAME_MAX];
    if ( !GetCurrentDir( cCurrentPath, sizeof (cCurrentPath ) ) ) {
      perror( "Error accesing current directory" );
    }
    conversions["%C"] = std::string( cCurrentPath ) + dirsep;

    lastname = pattern;
    const std::string replacements[] = {
      "%d",
      "%i",
      "%p",
      "%s",
      "%t",
      "%o",
      "%C",
      "%D",
      "%e",
      "%x",
      "%m",
      "%S"
    };

    for ( auto x : replacements ) {
      size_t pos = lastname.find( x );
      while ( pos != std::string::npos ) {
        std::cout << "replacing " << x << " with " << conversions[x] << std::endl;
        lastname.replace( pos, 2, conversions[x] );
        pos = lastname.find( x, pos + 1 );
      }
    }

    return lastname;
  }

  std::string FileNamer::filename( ) {
    lastname = filenameNoExt( );
    if ( 0 != conversions.count( "tofmt" ) ) {
      lastname += conversions.at( "tofmt" );
    }
    return lastname;
  }

  std::string FileNamer::filenameNoExt( ) {
    // for now, always the same thing
    if ( 0 == conversions.count( "%p" ) ) {
      conversions["%p"] = 1;
    }
    lastname = conversions["%d"] + dirsep + conversions["%i"] + conversions["%p"];
    return lastname;
  }

  void FileNamer::patientOrdinal( int patient ) {
    conversions["%p"] = std::to_string( patient );
  }

  void FileNamer::fileOrdinal( int fnum ) {
    conversions["%o"] = std::to_string( fnum );
  }

  void FileNamer::tofmt( const std::string& ext ) {
    conversions["%t"] = ext;
  }

  std::string FileNamer::last( ) const {
    return lastname;
  }

  std::string FileNamer::getDateSuffix( const dr_time& date, const std::string& sep,
      long offset_ms ) {
    time_t mytime = ( date + offset_ms ) / 1000;
    tm * dater = std::gmtime( &mytime );
    // we want YYYYMMDD format, but cygwin seems to misinterpret %m for strftime
    // so we're doing it manually (for now)
    std::string ret = sep;
    ret += std::to_string( dater->tm_year + 1900 );

    if ( dater->tm_mon + 1 < 10 ) {
      ret += '0';
    }
    ret += std::to_string( dater->tm_mon + 1 );

    if ( dater->tm_mday < 10 ) {
      ret += '0';
    }
    ret += std::to_string( dater->tm_mday );

    return ret;
  }

  std::string FileNamer::YYYYMMDD( struct tm * time ) {//It was easier to just make my own method
    std::stringstream ss; //continuing with manual date entry because of cygwin
    ss << ( 1900 + time->tm_year );
    if ( time->tm_mon + 1 < 10 ) ss << 0;
    ss << time->tm_mon + 1;
    if ( time->tm_mday < 10 ) ss << 0;
    ss << time->tm_mday;
    return ss.str( );
  }
}