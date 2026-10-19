#pragma once
#include "platform/platform.h"
#include <optional>

Json showMessageBox(HWND owner, const Json& options);
std::optional<std::filesystem::path> pickPath(HWND owner,
                                              const std::wstring& title,
                                              bool folder,
                                              const std::wstring& filter = L"",
                                              const std::filesystem::path& initial = {});
void openPath(const std::filesystem::path& path);
void openExternal(const std::string& url);
std::string readClipboard(HWND owner);
void writeClipboard(HWND owner, const std::string& text);
bool autoStartEnabled();
void setAutoStart(const AppPaths& paths, bool enabled);
void registerProtocol(const AppPaths& paths);
void registerNotificationShortcut(const AppPaths& paths);
void showToast(const std::string& title,
               const std::string& text = "",
               const std::filesystem::path& image = {},
               const std::string& action = "",
               const std::string& launch = "");
