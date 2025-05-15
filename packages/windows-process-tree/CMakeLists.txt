cmake_minimum_required(VERSION 3.31)
project(windows_process_tree)

set(CMAKE_CXX_STANDARD 26)

include_directories(
        ../../node_modules/node-addon-api
        ../../node_modules/node-addon-api/napi
        "C:\\Program Files\\nodejs\\include\\node"
        "C:\\Program Files (x86)\\Windows Kits\\10\\Include\\10.0.26100.0\\cppwinrt"
)

add_library(windows_process_tree lib/addon.cc)
