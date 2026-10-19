cmake_minimum_required(VERSION 4.4)
file(READ "${CMAKE_CURRENT_SOURCE_DIR}/protocol/product.json" YAY_PRODUCT_JSON)
string(JSON YAY_VERSION GET "${YAY_PRODUCT_JSON}" version)
project(yay VERSION "${YAY_VERSION}" DESCRIPTION "Yet Another YouTube Downloader" LANGUAGES CXX RC)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>DLL")
if(NOT CMAKE_CONFIGURATION_TYPES AND NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Debug CACHE STRING "Build configuration" FORCE)
endif()

find_program(BUN_EXECUTABLE bun REQUIRED)
include(scripts/cmake/Metadata.cmake)
include(scripts/cmake/Dependencies.cmake)

# Test executables and their runtime hooks belong to a dedicated Debug build tree.
set(YAY_DEBUG_ONLY OFF)
if(CMAKE_CONFIGURATION_TYPES STREQUAL "Debug" OR
   (NOT CMAKE_CONFIGURATION_TYPES AND CMAKE_BUILD_TYPE STREQUAL "Debug"))
    set(YAY_DEBUG_ONLY ON)
endif()
option(BUILD_TESTING "Build the Debug test suites" ${YAY_DEBUG_ONLY})
if(BUILD_TESTING AND NOT YAY_DEBUG_ONLY)
    message(FATAL_ERROR "BUILD_TESTING requires a Debug-only build tree. Use the debug preset or set BUILD_TESTING=OFF.")
endif()
include(CTest)
# Release verification inspects build artifacts without compiling a test executable.
enable_testing()

set(YAY_IPC_DIRECTORY "${PROJECT_BINARY_DIR}/ipc/$<CONFIG>")
add_custom_target(yay_protocol
    COMMAND "${BUN_EXECUTABLE}" "${PROJECT_SOURCE_DIR}/scripts/generate_ipc.mjs" --build-root "${YAY_IPC_DIRECTORY}"
    BYPRODUCTS "${YAY_IPC_DIRECTORY}/src/generated/ipc_contract.cc"
        "${YAY_IPC_DIRECTORY}/ui/src/ipc/ipc.generated.ts"
        "${YAY_IPC_DIRECTORY}/ui/src/ipc/ipc.debug.generated.ts"
        "${YAY_IPC_DIRECTORY}/wire-channels.json"
    WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}"
    COMMENT "Generating shared C++ and TypeScript IPC contracts with fresh wire IDs")

add_library(yay_core STATIC
    src/core/runtime.cc
    src/core/ipc_router.cc
    "${YAY_IPC_DIRECTORY}/src/generated/ipc_contract.cc"
    src/downloads/yt_dlp.cc
    src/ipc/application_handlers.cc
    src/ipc/settings_handlers.cc
    src/ipc/download_handlers.cc
    src/ipc/update_handlers.cc
    src/platform/platform.cc
    src/platform/process.cc
    src/platform/http_client.cc
    src/services/settings_service.cc
    src/services/download_service.cc
    src/services/setup_service.cc
    src/services/twitter_service.cc
    src/services/update_service.cc
)
add_dependencies(yay_core yay_protocol)
target_include_directories(yay_core PUBLIC src "${PROJECT_BINARY_DIR}/generated/$<CONFIG>" "${PROJECT_BINARY_DIR}/generated")
target_include_directories(yay_core SYSTEM PUBLIC third_party)
target_link_libraries(yay_core PUBLIC winhttp bcrypt crypt32 shell32 shlwapi ole32 uuid advapi32)
target_compile_definitions(yay_core PUBLIC UNICODE _UNICODE WIN32_LEAN_AND_MEAN NOMINMAX _WIN32_WINNT=0x0A00)
target_compile_definitions(yay_core PUBLIC "$<$<CONFIG:Debug>:YAY_DEBUG_BUILD>")
target_compile_options(yay_core PUBLIC /utf-8 /permissive- /Zc:preprocessor PRIVATE /W4)
target_precompile_headers(yay_core PRIVATE src/core/pch.h)

add_executable(yay WIN32 src/main.cc src/application.cc src/application_ipc.cc
    src/application_events.cc src/application_tray.cc
    src/ipc/system_handlers.cc src/ipc/desktop_settings_handlers.cc src/ipc/window_handlers.cc
    src/ui/web_window.cc src/ui/web_window_webview.cc src/ui/embedded_web_assets.cc
    src/ui/window_manager.cc src/ui/webview_runtime.cc src/platform/desktop.cc src/platform/native_theme.cc
    "${PROJECT_BINARY_DIR}/generated/yay.rc" "${PROJECT_BINARY_DIR}/generated/$<CONFIG>/web_assets.rc" "${PROJECT_BINARY_DIR}/generated/yay.manifest")
get_filename_component(YAY_EXECUTABLE_STEM "${YAY_EXECUTABLE_NAME}" NAME_WE)
set_target_properties(yay PROPERTIES OUTPUT_NAME "${YAY_EXECUTABLE_STEM}")
target_link_libraries(yay PRIVATE yay_core webview2 dwmapi comctl32 windowsapp propsys windowscodecs wintrust)
target_compile_options(yay PRIVATE /W4)
# Keep MSVC's PCH debug database local to each target during incremental builds.
target_precompile_headers(yay PRIVATE src/core/pch.h)

file(GLOB_RECURSE UI_SOURCES CONFIGURE_DEPENDS ui/src/*)
file(GLOB PROTOCOL_SOURCES CONFIGURE_DEPENDS protocol/*.ts)
file(GLOB IPC_GENERATOR_SOURCES CONFIGURE_DEPENDS scripts/ipc/*.mjs)
add_custom_command(OUTPUT "${PROJECT_BINARY_DIR}/generated/$<CONFIG>/web_assets.rc" "${PROJECT_BINARY_DIR}/generated/$<CONFIG>/web_assets.h"
    BYPRODUCTS "${PROJECT_BINARY_DIR}/generated/$<CONFIG>/ui-licenses.json"
    COMMAND "${BUN_EXECUTABLE}" run typecheck
    COMMAND "${CMAKE_COMMAND}" -E env "YAY_IPC_DIRECTORY=${YAY_IPC_DIRECTORY}"
        "YAY_LICENSE_MANIFEST=${PROJECT_BINARY_DIR}/generated/$<CONFIG>/ui-licenses.json"
        "YAY_GIT_HASH=${YAY_GIT_HASH}" "${BUN_EXECUTABLE}" node_modules/vite/bin/vite.js build
        --mode "$<IF:$<CONFIG:Debug>,development,production>" --outDir "${PROJECT_BINARY_DIR}/web/$<CONFIG>"
    COMMAND "${BUN_EXECUTABLE}" "${PROJECT_SOURCE_DIR}/scripts/embed_web_assets.mjs"
        "${PROJECT_BINARY_DIR}/web/$<CONFIG>" "${PROJECT_BINARY_DIR}/generated/$<CONFIG>"
    WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}/ui"
    DEPENDS ${UI_SOURCES} ui/package.json ui/bun.lock ui/vite.config.ts protocol/product.json ui/tsconfig.json
        scripts/embed_web_assets.mjs scripts/generate_ipc.mjs ${IPC_GENERATOR_SOURCES} ${PROTOCOL_SOURCES}
        "${YAY_IPC_DIRECTORY}/ui/src/ipc/ipc.generated.ts" "${YAY_IPC_DIRECTORY}/ui/src/ipc/ipc.debug.generated.ts"
    COMMENT "Building and embedding the WebView2 UI"
    VERBATIM)
add_custom_target(yay_ui DEPENDS "${PROJECT_BINARY_DIR}/generated/$<CONFIG>/web_assets.rc" "${PROJECT_BINARY_DIR}/generated/$<CONFIG>/web_assets.h")
add_dependencies(yay_ui yay_protocol)
add_dependencies(yay yay_ui)

add_custom_target(yay_runtime_assets
    COMMAND "${CMAKE_COMMAND}" -E make_directory "$<TARGET_FILE_DIR:yay>/assets"
    COMMAND "${CMAKE_COMMAND}" -E copy_directory_if_different "${PROJECT_SOURCE_DIR}/assets/tray" "$<TARGET_FILE_DIR:yay>/assets/tray"
    COMMAND "${CMAKE_COMMAND}" -E copy_directory_if_different "${PROJECT_SOURCE_DIR}/assets/notifications" "$<TARGET_FILE_DIR:yay>/assets/notifications"
    COMMAND "${CMAKE_COMMAND}" -E copy_directory_if_different "${PROJECT_SOURCE_DIR}/assets/bin" "$<TARGET_FILE_DIR:yay>/bin"
    COMMAND "${CMAKE_COMMAND}" -E copy_directory_if_different "${PROJECT_SOURCE_DIR}/assets/licenses" "$<TARGET_FILE_DIR:yay>/licenses"
    COMMENT "Staging application assets, binaries, and licenses"
    VERBATIM)
add_dependencies(yay yay_runtime_assets)

add_custom_command(TARGET yay POST_BUILD
    COMMAND "${BUN_EXECUTABLE}" "${PROJECT_SOURCE_DIR}/scripts/verify_release.mjs"
        "$<CONFIG>" "$<TARGET_FILE:yay>" "${PROJECT_BINARY_DIR}/web/$<CONFIG>"
    VERBATIM)

add_test(NAME release_artifacts
    COMMAND "${BUN_EXECUTABLE}" "${PROJECT_SOURCE_DIR}/scripts/verify_release.mjs"
        "$<CONFIG>" "$<TARGET_FILE:yay>" "${PROJECT_BINARY_DIR}/web/$<CONFIG>"
    CONFIGURATIONS Release RelWithDebInfo MinSizeRel)

if(CMAKE_CONFIGURATION_TYPES STREQUAL "Release" OR CMAKE_BUILD_TYPE STREQUAL "Release")
    find_program(POWERSHELL_EXECUTABLE pwsh REQUIRED)
    add_custom_target(yay_distribution
        COMMAND "${POWERSHELL_EXECUTABLE}" -NoProfile -File "${PROJECT_SOURCE_DIR}/scripts/package.ps1"
            -SkipBuild -BuildDirectory "${PROJECT_BINARY_DIR}"
        DEPENDS yay
        WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}"
        COMMENT "Packaging the application and installer under dist"
        VERBATIM)
endif()

if(BUILD_TESTING)
    add_executable(yay_webview_runtime_tests tests/webview_runtime_tests.cc src/ui/webview_runtime.cc "${PROJECT_BINARY_DIR}/generated/yay.manifest")
    target_link_libraries(yay_webview_runtime_tests PRIVATE yay_core webview2 comctl32 wintrust)
    add_test(NAME webview_runtime COMMAND yay_webview_runtime_tests)
    set_tests_properties(webview_runtime PROPERTIES TIMEOUT 30)
    add_executable(yay_ipc_tests tests/ipc_handlers_tests.cc)
    target_link_libraries(yay_ipc_tests PRIVATE yay_core)
    add_test(NAME application_ipc COMMAND yay_ipc_tests)
    set_tests_properties(application_ipc PROPERTIES TIMEOUT 30)
    add_executable(yay_tests tests/core_tests.cc)
    target_link_libraries(yay_tests PRIVATE yay_core)
    add_test(NAME native_services COMMAND yay_tests)
    add_executable(yay_process_tests tests/process_tests.cc)
    target_link_libraries(yay_process_tests PRIVATE yay_core)
    add_test(NAME process COMMAND yay_process_tests)
    set_tests_properties(process PROPERTIES TIMEOUT 30)
    add_executable(yay_settings_tests tests/settings_tests.cc)
    target_link_libraries(yay_settings_tests PRIVATE yay_core)
    add_test(NAME settings COMMAND yay_settings_tests)
    set_tests_properties(settings PROPERTIES TIMEOUT 30)
    add_executable(yay_update_tests tests/update_service_tests.cc)
    target_link_libraries(yay_update_tests PRIVATE yay_core)
    add_test(NAME update_service COMMAND yay_update_tests)
    set_tests_properties(update_service PROPERTIES TIMEOUT 30)
    add_executable(yay_download_tests tests/download_service_tests.cc)
    target_link_libraries(yay_download_tests PRIVATE yay_core)
    add_test(NAME download_service COMMAND yay_download_tests)
    set_tests_properties(download_service PROPERTIES TIMEOUT 30)
    add_test(NAME renderer COMMAND "${BUN_EXECUTABLE}" run test WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}/ui")
    add_test(NAME ipc_contract COMMAND "${BUN_EXECUTABLE}" "${PROJECT_SOURCE_DIR}/scripts/generate_ipc.mjs" --check)
    add_test(NAME product_contract COMMAND "${BUN_EXECUTABLE}" "${PROJECT_SOURCE_DIR}/scripts/generate_product.mjs" --check)
    add_test(NAME protocol_schema COMMAND "${BUN_EXECUTABLE}" run test:protocol WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}/ui")
    add_executable(yay_download_integration tests/download_integration.cc)
    target_link_libraries(yay_download_integration PRIVATE yay_core ws2_32)
    add_executable(yay_setup_integration tests/setup_integration.cc)
    target_link_libraries(yay_setup_integration PRIVATE yay_core)
    option(YAY_TEST_ONLINE_SETUP "Download and verify dependencies during CTest" OFF)
    if(YAY_TEST_ONLINE_SETUP)
        add_test(NAME online_setup COMMAND yay_setup_integration)
        set_tests_properties(online_setup PROPERTIES TIMEOUT 600)
    endif()
    find_program(YAY_TEST_YTDLP yt-dlp)
    find_program(YAY_TEST_FFMPEG ffmpeg)
    if(YAY_TEST_YTDLP AND YAY_TEST_FFMPEG)
        add_test(NAME download_integration COMMAND yay_download_integration "${YAY_TEST_YTDLP}" "${YAY_TEST_FFMPEG}")
        set_tests_properties(download_integration PROPERTIES TIMEOUT 90)
    endif()
    find_program(POWERSHELL_EXECUTABLE pwsh REQUIRED)
    add_test(NAME native_ui COMMAND "${POWERSHELL_EXECUTABLE}" -NoProfile -File "${PROJECT_SOURCE_DIR}/scripts/smoke_test.ps1" -Executable "$<TARGET_FILE:yay>")
    add_test(NAME window_lifecycle COMMAND "${POWERSHELL_EXECUTABLE}" -NoProfile -File "${PROJECT_SOURCE_DIR}/tests/window_lifecycle.ps1" -Executable "$<TARGET_FILE:yay>")
    set_tests_properties(native_ui window_lifecycle PROPERTIES TIMEOUT 60 RESOURCE_LOCK native_desktop)
endif()

install(TARGETS yay RUNTIME DESTINATION .)
install(DIRECTORY assets/tray assets/notifications DESTINATION assets)
install(DIRECTORY assets/bin/ DESTINATION bin)
install(DIRECTORY assets/licenses/ DESTINATION licenses)
install(FILES LICENSE DESTINATION .)
install(FILES third_party/nlohmann/LICENSE.MIT DESTINATION licenses RENAME nlohmann-json.txt)
install(FILES third_party/tomlplusplus/LICENSE DESTINATION licenses RENAME tomlplusplus.txt)
install(FILES "${YAY_WEBVIEW2_DIR}/LICENSE.txt" DESTINATION licenses RENAME webview2.txt)
install(CODE "execute_process(COMMAND \"${BUN_EXECUTABLE}\" \"${PROJECT_SOURCE_DIR}/scripts/collect_licenses.mjs\" \"\$ENV{DESTDIR}\${CMAKE_INSTALL_PREFIX}/licenses/ui\" \"${PROJECT_BINARY_DIR}/generated/$<CONFIG>/ui-licenses.json\" COMMAND_ERROR_IS_FATAL ANY)")
set(CMAKE_INSTALL_SYSTEM_RUNTIME_LIBS_SKIP TRUE)
include(InstallRequiredSystemLibraries)
get_filename_component(YAY_COMPILER_DIRECTORY "${CMAKE_CXX_COMPILER}" DIRECTORY)
configure_file(scripts/cmake/InstallRuntime.cmake.in generated/install_runtime.cmake @ONLY)
install(CODE "set(YAY_EXECUTABLE \"$<TARGET_FILE:yay>\")")
install(SCRIPT "${PROJECT_BINARY_DIR}/generated/install_runtime.cmake")
set(CPACK_GENERATOR ZIP)
set(CPACK_PACKAGE_FILE_NAME "yay-webview2-${PROJECT_VERSION}-win64")
include(CPack)
