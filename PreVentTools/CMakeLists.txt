add_executable(preventtools AttributeUtils.cpp
ClippingSignalSet.cpp
H5Cat.cpp
main.cpp
OutputSignalData.cpp
StatisticalSignalData.cpp
AppendingUtils.cpp
BSIConverter.cpp
BSICache.cpp
)

target_link_libraries(preventtools formats stdc++fs)

target_compile_options(preventtools PRIVATE -Wall)

target_include_directories(preventtools
    PUBLIC
        $<INSTALL_INTERFACE:include>
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
		PRIVATE
        $<INSTALL_INTERFACE:include>
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/../Formats ${CMAKE_CURRENT_SOURCE_DIR}/../Formats/generated ${HDF5_INCLUDE_DIRS}>
)


install (TARGETS preventtools DESTINATION bin)

