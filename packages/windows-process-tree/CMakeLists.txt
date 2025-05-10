cmake_minimum_required(VERSION 3.31)
project(windows_process_tree)

set(CMAKE_CXX_STANDARD 26)

include_directories(../../node_modules/node-addon-api)

add_library(windows_process_tree lib/addon.cc)
