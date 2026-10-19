set(YAY_WEBVIEW2_DIR "$ENV{LOCALAPPDATA}/yay-build-deps/webview2-1.0.4258.31" CACHE PATH "Extracted WebView2 SDK")
if(NOT EXISTS "${YAY_WEBVIEW2_DIR}/build/native/include/WebView2.h")
    message(FATAL_ERROR "WebView2 SDK is missing. Run scripts/prepare.ps1 or set YAY_WEBVIEW2_DIR.")
endif()
add_library(webview2 STATIC IMPORTED)
set_target_properties(webview2 PROPERTIES
    IMPORTED_LOCATION "${YAY_WEBVIEW2_DIR}/build/native/x64/WebView2LoaderStatic.lib"
    INTERFACE_INCLUDE_DIRECTORIES "${YAY_WEBVIEW2_DIR}/build/native/include")
