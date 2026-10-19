#pragma once
#include "services/settings_service.h"
#include "platform/http_client.h"

class UpdateService
{
private:
    SettingsService& m_settings;
    EventBus& m_events;
    HttpClient& m_http;
    Logger& m_logger;
    mutable std::mutex m_mutex;
    std::mutex m_checkMutex;
    Json m_release = nullptr;
#ifdef YAY_DEBUG_BUILD
    Json m_previewRelease = nullptr;
#endif
    Json m_commits = nullptr;
    std::string m_notifiedVersion;
    int64_t m_nextManualCheck = 0;
    bool m_startupCheck = true;
    bool m_installing = false;
    std::stop_source m_cancel;

public:
    DI_INJECT(UpdateService(SettingsService& settings, EventBus& events, HttpClient& http, Logger& logger));
    Json check(bool manual, const std::stop_token& stop = {});
    Json latest() const;
#ifdef YAY_DEBUG_BUILD
    Json preview() const;
#endif
    int64_t nextManualCheck() const;
    Json commits(const std::stop_token& stop = {});
    Json install(const std::stop_token& stop = {});
    void cancel();
    static bool newerRelease(const Json& release, const std::string& currentVersion);
    static bool trustedAsset(const std::string& input);
    static std::string checksumFromText(const std::string& text, const std::string& filename);
};
