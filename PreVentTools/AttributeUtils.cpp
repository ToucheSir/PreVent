/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

#include "AttributeUtils.h"

#include <iostream>
#include <deque>

void AttributeUtils::printAttributes( H5::H5File& file, const std::string& path, bool recursive ) {

  std::deque<std::string> todo;

  todo.push_front( "" == path ? "/" : path );

  bool first = true;
  while ( !todo.empty( ) ) {
    std::string itempath = todo.front( );
    todo.pop_front( );

    H5G_stat_t stats = { };
    try {
      file.getObjinfo( itempath, stats );
    }
    catch ( H5::FileIException error ) {
      std::cerr << "could not open dataset/group: " << itempath << std::endl;
      return;
    }

    if ( stats.type == H5G_GROUP ) {
      H5::Group grp = file.openGroup( itempath );
      iprintAttributes( grp );

      if ( recursive ) {
        for ( hsize_t i = 0; i < grp.getNumObjs( ); i++ ) {
          todo.push_front( itempath + ( first ? "" : "/" ) + grp.getObjnameByIdx( i ) );
        }
      }
    }
    else if ( stats.type == H5G_DATASET ) {
      H5::DataSet ds = file.openDataSet( itempath );
      iprintAttributes( ds );
    }

    first = false;
  }
}

void AttributeUtils::iprintAttributes( H5::H5Object& location ) {
  for ( hsize_t i = 0; i < location.getNumAttrs( ); i++ ) {
    std::cout << location.getObjName( );

    H5::Attribute attr = location.openAttribute( i );
    H5::DataType dt = attr.getDataType( );

    std::cout << "|" << attr.getName( ) << "|";

    switch ( attr.getDataType( ).getClass( ) ) {
      case H5T_INTEGER:
      {
        int val = 0;
        attr.read( dt, &val );
        std::cout << val;
      }
        break;
      case H5T_FLOAT:
      {
        double val = 0.0;
        attr.read( dt, &val );
        std::cout << val;
      }
        break;
      case H5T_STRING:
      {
        std::string val;
        attr.read( dt, val );
        std::cout << val;
      }
        break;
    }

    attr.close( );
    std::cout << std::endl;
  }
}

void AttributeUtils::setAttribute( H5::H5File& file, const std::string& path, const std::string& attr,
    const std::string& val ) {
  H5G_stat_t stats = { };

  try {
    file.getObjinfo( path, stats );
  }
  catch ( H5::FileIException error ) {
    std::cerr << "could not open dataset/group: " << path << std::endl;
    return;
  }

  if ( stats.type == H5G_GROUP ) {
    H5::Group grp = file.openGroup( path );
    isetAttribute( grp, attr, val );
  }
  else if ( stats.type == H5G_DATASET ) {
    H5::DataSet ds = file.openDataSet( path );
    isetAttribute( ds, attr, val );
  }
  std::cout << attr << " attribute written to " << path << std::endl;
}

void AttributeUtils::isetAttribute( H5::H5Object& location, const std::string& attr,
    const std::string& val ) {
  if ( location.attrExists( attr ) ) {
    location.removeAttr( attr );
  }

  H5::DataSpace space = H5::DataSpace( H5S_SCALAR );
  H5::StrType st( H5::PredType::C_S1, H5T_VARIABLE );
  st.setCset( H5T_CSET_UTF8 );

  H5::Attribute attrib = location.createAttribute( attr, st, space );
  attrib.write( st, val );
  attrib.close( );
}


