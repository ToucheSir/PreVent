/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* 
 * File:   AttributeUtils.h
 * Author: ryan
 *
 * Created on March 3, 2019, 9:05 PM
 */

#ifndef ATTRIBUTEUTILS_H
#define ATTRIBUTEUTILS_H

#include <H5Cpp.h>

class AttributeUtils {
public:
	static void printAttributes( H5::H5File& file, const std::string& path = "", bool recursive = true );

private:
	static void iprintAttributes( H5::H5Object& location );

};


#endif /* ATTRIBUTEUTILS_H */

