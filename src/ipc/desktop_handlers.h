#pragma once
#include <functional>
#include <string>

class IpcRouter;
class SettingsService;
class DownloadService;
class WindowManager;
struct AppPaths;

// Dependencies must remain alive until dispatch and queued work have stopped.
void registerSystemHandlers(IpcRouter& router, const AppPaths& paths, SettingsService& settings);
void registerDesktopSettingsHandlers(IpcRouter& router, const AppPaths& paths, SettingsService& settings);
void registerWindowHandlers(
    IpcRouter& router,
    WindowManager& windows,
    SettingsService& settings,
    DownloadService& downloads,
    std::function<void(const std::string&)> onClosed
);
