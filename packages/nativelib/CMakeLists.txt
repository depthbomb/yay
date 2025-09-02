cmake_minimum_required (VERSION 3.8)

if (POLICY CMP0141)
  cmake_policy(SET CMP0141 NEW)
  set(CMAKE_MSVC_DEBUG_INFORMATION_FORMAT "$<IF:$<AND:$<C_COMPILER_ID:MSVC>,$<CXX_COMPILER_ID:MSVC>>,$<$<CONFIG:Debug,RelWithDebInfo>:EditAndContinue>,$<$<CONFIG:Debug,RelWithDebInfo>:ProgramDatabase>>")
endif()

project ("nativelib")

add_executable (nativelib
    "src/nativelib.h"
    "src/nativelib.cc"
    "src/processtreeworker.h"
    "src/processtreeworker.cc"
    
)

include_directories(
        ../../node_modules/node-addon-api
        ../../node_modules/node-addon-api/napi
)

if (CMAKE_VERSION VERSION_GREATER 3.12)
  set_property(TARGET nativelib PROPERTY CXX_STANDARD 20)
endif()
