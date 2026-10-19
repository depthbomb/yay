#pragma once
#include "platform/platform.h"
#include <stop_token>
#include <functional>

struct ParsedUrl
{
public:
    std::string scheme;
    std::string host;
    std::string path;
    unsigned short port = 0;
};

class HttpClient
{
public:
    DI_INJECT(HttpClient()) = default;
    virtual ~HttpClient() = default;
    [[nodiscard]] std::string get(const std::string& url,
                                  const std::stop_token& stop = {},
                                  size_t maxBytes = 16 * 1024 * 1024,
                                  bool trustedReleaseOnly = false) const;
    [[nodiscard]] virtual Json getJson(const std::string& url, const std::stop_token& stop) const;
    void download(const std::string& url,
                  const std::filesystem::path& destination,
                  const std::stop_token& stop = {},
                  const std::function<void(int)>& progress = {},
                  uint64_t maxBytes = 1024ULL * 1024 * 1024 * 32,
                  bool trustedReleaseOnly = false) const;
};

ParsedUrl parseUrl(const std::string& input);
bool validMediaUrl(const std::string& input);
bool allowedExternalUrl(const std::string& input);
bool trustedReleaseUrl(const std::string& input);
std::string decodeUrl(const std::string& input);
std::string encodeUrl(const std::string& input);
std::map<std::string, std::string> urlQuery(const std::string& input);
