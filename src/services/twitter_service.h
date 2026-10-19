#pragma once
#include "services/settings_service.h"
#include "platform/http_client.h"

class TwitterService
{
private:
    struct CacheEntry
    {
    public:
        Json value;
        int64_t accessed;
        int64_t expires;
    };

    SettingsService& m_settings;
    HttpClient& m_http;
    std::mutex m_mutex;
    std::map<std::string, CacheEntry> m_cache;

public:
    DI_INJECT(TwitterService(SettingsService& settings, HttpClient& http));
    Json mediaInfo(const std::string& url, const std::stop_token& stop = {});
    void download(const std::string& url, const std::stop_token& stop = {}) const;
    static Json parseMedia(const Json& value);
};
