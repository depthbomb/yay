#include "services/twitter_service.h"

TwitterService::TwitterService(SettingsService& settings, HttpClient& http) : m_settings(settings),
      m_http(http) {}

Json TwitterService::mediaInfo(const std::string& url, const std::stop_token& stop)
{
    const auto parsed = parseUrl(url);
    const std::regex status(R"(^/[^/]+/status/(\d+))");
    std::smatch match;
    if ((parsed.host != "x.com" && parsed.host != "twitter.com" && parsed.host != "www.x.com" &&
         parsed.host != "www.twitter.com") ||
        !std::regex_search(parsed.path, match, status))
    {
        throw std::runtime_error("Invalid Twitter/X status URL.");
    }

    const auto id = match[1].str();
    {
        std::lock_guard lock(m_mutex);
        if (const auto found = m_cache.find(id); found != m_cache.end() && found->second.expires > unixMillis())
        {
            found->second.accessed = unixMillis();
            return found->second.value;
        }
    }

    const auto media =
        parseMedia(m_http.getJson("https://cdn.syndication.twimg.com/tweet-result?id=" + id + "&token=!", stop));
    {
        std::lock_guard lock(m_mutex);
        if (m_cache.size() >= 100)
        {
            const auto oldest = std::ranges::min_element(m_cache,
                                                         [](const auto& a, const auto& b)
                                                         {
                                                             return a.second.accessed < b.second.accessed;
                                                         });
            m_cache.erase(oldest);
        }

        m_cache[id] = {.value = media, .accessed = unixMillis(), .expires = unixMillis() + 15 * 60 * 1000};
    }

    return media;
}

Json TwitterService::parseMedia(const Json& value)
{
    if (!value.is_object() || !value.contains("mediaDetails") || !value.at("mediaDetails").is_array())
    {
        throw std::runtime_error("Tweet lookup returned an invalid response.");
    }

    Json details = Json::array();
    for (const auto& detail : value.at("mediaDetails"))
    {
        if (!detail.is_object())
        {
            continue;
        }

        // Keep this initializer separate so the condition stays readable.
        // ReSharper disable once CppTooWideScopeInitStatement
        const auto image = parseUrl(detail.at("media_url_https").get<std::string>());
        if (image.scheme != "https" || image.host != "pbs.twimg.com")
        {
            throw std::runtime_error("Tweet lookup returned an invalid image URL.");
        }

        if (!detail.contains("video_info") || !detail.at("video_info").is_object() ||
            !detail.at("video_info").contains("variants"))
        {
            continue;
        }

        const auto& variants = detail.at("video_info").at("variants");
        if (!variants.is_array())
        {
            throw std::runtime_error("Tweet lookup returned invalid video details.");
        }

        for (const auto& variant : variants)
        {
            // Keep this initializer separate so the condition stays readable.
            // ReSharper disable once CppTooWideScopeInitStatement
            const auto media = parseUrl(variant.at("url").get<std::string>());
            if (media.scheme != "https" || media.host != "video.twimg.com" || !variant.at("content_type").is_string() ||
                (variant.contains("bitrate") && !variant.at("bitrate").is_number()))
            {
                throw std::runtime_error("Tweet lookup returned invalid video details.");
            }
        }

        details.push_back(
            {{"media_url_https", detail.at("media_url_https")}, {"video_info", {{"variants", variants}}}});
    }

    return details.empty() ? Json(nullptr) : Json{{"mediaDetails", details}};
}

void TwitterService::download(const std::string& url, const std::stop_token& stop) const
{
    const auto parsed = parseUrl(url);
    if (parsed.scheme != "https" || parsed.host != "video.twimg.com")
    {
        throw std::runtime_error("The requested media URL is not allowed.");
    }

    const auto path = parsed.path.substr(0, parsed.path.find('?'));
    const auto filename = path.substr(path.rfind('/') + 1);
    if (filename.empty() || filename.find_first_of("\\:%") != std::string::npos || filename == "." || filename == "..")
    {
        throw std::runtime_error("The requested media URL has no valid filename.");
    }

    m_http.download(url,
                    pathFromUtf8(m_settings.get(ipc::SettingsKey::DownloadDir).get<std::string>()) /
                        pathFromUtf8(filename),
                    stop);
}
