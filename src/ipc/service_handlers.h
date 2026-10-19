#pragma once
#include <stop_token>

class IpcRouter;
class SettingsService;
class DownloadService;
class TwitterService;
class UpdateService;

// Services must outlive the router's handlers and any queued work.
void registerSettingsHandlers(IpcRouter& router, SettingsService& settings);
void registerDownloadHandlers(IpcRouter& router,
                              DownloadService& downloads,
                              SettingsService& settings,
                              TwitterService& twitter,
                              const std::stop_token& stop);
void registerUpdateHandlers(IpcRouter& router, UpdateService& updates, const std::stop_token& stop);
