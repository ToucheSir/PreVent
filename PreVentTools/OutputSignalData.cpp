
#include "OutputSignalData.h"
#include "SignalUtils.h"
#include "DataRow.h"
#include <cmath>

namespace FormatConverter{

  OutputSignalData::OutputSignalData( std::ostream& out ) : BasicSignalData( "-" ),
      output( out ) { }

  OutputSignalData::~OutputSignalData( ) { }

  bool OutputSignalData::add( const FormatConverter::DataRow& row ) {
    int period = BasicSignalData::chunkInterval( );
    int mspervalue = period / BasicSignalData::readingsPerChunk( );
    int scale = BasicSignalData::scale( );
    double scalefactor = std::pow( 10, scale );

    std::vector<int> vals = row.ints( scale );
    dr_time time = row.time;

    if ( 0 == scale ) {
      for ( auto x : vals ) {
        output << time << " " << x << std::endl;
        time += mspervalue;
      }
    }
    else {
      for ( auto x : vals ) {
        output << time << " " << SignalUtils::tosmallstring( (double) x, scalefactor ) << std::endl;
        time += mspervalue;
      }
    }

    return true;
  }
}