/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* 
 * File:   FileOrCinStream.h
 * Author: ryan
 *
 * Created on July 12, 2017, 3:59 PM
 */

#ifndef FILEORCINSTREAM_H
#define FILEORCINSTREAM_H

#include <string>
#include <iostream>

#include <zlib.h>

#include "Reader.h"

/**
 * Class to read either raw or zlib-compressed text from either stdin or a file.
 * Unlike other readers, the only provides unprocessed text from the files,
 * without any interpretation of it.
 */
class StreamChunkReader {
public:
	StreamChunkReader( std::istream * input, bool compressed, bool isStdin,
			int chunksize = DEFAULT_CHUNKSIZE );

	virtual ~StreamChunkReader( );
	void close( );

	/**
	 * Reads this many bytes 
	 * @param numbytes
	 * @return
	 */
	std::string read( int numbytes );
	std::string readNextChunk( );
	void setChunkSize( int size );

	ReadResult rr;
private:
	static const int DEFAULT_CHUNKSIZE;

	std::string readNextCompressedChunk( int numbytes );
	void initZlib( );

	bool iscompressed;
	bool usestdin;
	int chunksize;

	std::istream * stream;


	// zlib-only var
	z_stream strm;
};

#endif /* FILEORCINSTREAM_H */
