/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* 
 * File:   WfdbWriter.h
 * Author: ryan
 *
 * Created on July 11, 2017, 7:16 AM
 */

#ifndef WFDBWRITER_H
#define WFDBWRITER_H

#include "Writer.h"

#include <wfdb/wfdb.h>

class SignalData;

class WfdbWriter : public Writer {
public:
	WfdbWriter( );
	virtual ~WfdbWriter( );

protected:
	int initDataSet( const std::string& outdir, const std::string& namestart,
			int compression );
	std::vector<std::string> closeDataSet( );
	int drain( SignalSet& );

private:
	WfdbWriter( const WfdbWriter& orig );

	int write( std::map<std::string, std::unique_ptr<SignalData>>&data );
	std::vector<std::vector<WFDB_Sample>> sync( std::map<std::string, std::unique_ptr<SignalData>>&data,
			std::vector<std::string>& labels );

	std::string fileloc;
	std::string currdir;
	std::map<std::string, WFDB_Siginfo> sigmap;
};


#endif /* WFDBWRITER_H */

