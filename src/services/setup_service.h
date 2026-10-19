#pragma once
#include "services/download_service.h"
#include <regex>

class SetupService
{
public:
    typedef std::function<Json(const Json&)> Prompt;

private:
    const AppPaths& m_paths;
    SettingsService& m_settings;
    EventBus& m_events;
    HttpClient& m_http;
    DownloadService& m_downloads;
    Logger& m_logger;

public:
    DI_INJECT(SetupService(const AppPaths& paths,
                           SettingsService& settings,
                           EventBus& events,
                           HttpClient& http,
                           DownloadService& downloads,
                           Logger& logger));
    bool run(const std::stop_token& stop, const Prompt& prompt, bool forceDownload = false) const;
    void removeDownloadedBinaries() const;

private:
    void step(const std::string& message, int progress = -1) const;
    bool testBinary(const std::filesystem::path& path,
                    const std::string& argument,
                    const std::regex& pattern,
                    const std::stop_token& stop) const;
    Json releaseAsset(const std::string& repository,
                      const std::function<bool(const std::string&)>& match,
                      const std::stop_token& stop) const;
    void downloadBinary(const Json& asset,
                        const std::string& name,
                        const std::vector<std::string>& files,
                        const std::stop_token& stop) const;
};
