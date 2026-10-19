#include "services/update_service.h"
#include "platform/process.h"
#include "metadata.h"
#include <sstream>

UpdateService::UpdateService(SettingsService& settings, EventBus& events, HttpClient& http, Logger& logger) : m_settings(settings),
      m_events(events),
      m_http(http),
      m_logger(logger) {}

bool UpdateService::newerRelease(const Json& release, const std::string& currentVersion)
{
    if (!release.is_object() || release.value("draft", false) || release.value("prerelease", false))
    {
        return false;
    }

    const std::regex version(R"(^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\+[0-9A-Za-z.-]+)?$)");
    std::smatch remote;
    std::smatch current;
    // Keep this initializer separate so the condition stays readable.
    // ReSharper disable once CppTooWideScopeInitStatement
    const auto tag = release.value("tag_name", "");
    if (!std::regex_match(tag, remote, version) || !std::regex_match(currentVersion, current, version))
    {
        return false;
    }

    for (int i = 1; i <= 3; ++i)
    {
        const auto a = std::stoull(remote[i].str());
        if (const auto b = std::stoull(current[i].str()); a != b)
        {
            return a > b;
        }
    }

    return false;
}

bool UpdateService::trustedAsset(const std::string& input)
{
    try
    {
        const auto [scheme, host, path, port] = parseUrl(input);
        return scheme == "https" && host == "github.com" && port == 443 &&
               path.starts_with(std::string("/") + AppRepository + "/releases/download/");
    }
    catch (...)
    {
        return false;
    }
}

std::string UpdateService::checksumFromText(const std::string& text, const std::string& filename)
{
    std::istringstream stream(text);
    std::string line;
    const std::regex pattern(R"(^([a-fA-F0-9]{64})\s+\*?(.+?)\s*$)");
    while (std::getline(stream, line))
    {
        if (std::smatch match; std::regex_match(line, match, pattern) && match[2].str() == filename)
        {
            auto hash = match[1].str();
            std::ranges::transform(hash,
                                   hash.begin(),
                                   [](const unsigned char c)
                                   {
                                       return static_cast<char>(tolower(c));
                                   });
            return hash;
        }
    }

    return {};
}

Json UpdateService::check(const bool manual, const std::stop_token& stop)
{
    std::lock_guard checkLock(m_checkMutex);
    if (manual)
    {
        std::lock_guard lock(m_mutex);
        if (unixMillis() < m_nextManualCheck)
        {
            return ipcError("Please wait before checking for updates again.");
        }

        m_nextManualCheck = unixMillis() + 60000;
    }

    try
    {
        const auto release =
            m_http.getJson(std::string("https://api.github.com/repos/") + AppRepository + "/releases/latest", stop);
        const bool newer = newerRelease(release, AppVersion);
        bool show = false;
        bool notify = false;
        {
            std::lock_guard lock(m_mutex);
            m_release = newer ? release : Json(nullptr);
#ifdef YAY_DEBUG_BUILD
            m_previewRelease = release;
#endif
            m_commits = nullptr;
            if (newer)
            {
                show = manual || m_startupCheck;
                notify = !show && m_notifiedVersion != release.at("tag_name").get<std::string>();
                m_notifiedVersion = release.at("tag_name").get<std::string>();
            }

            m_startupCheck = false;
        }

        if (newer)
        {
            m_events.forwardEvent(ipc::EventChannel::UpdaterOutdated, {{"latestRelease", release}});
            if (show)
            {
                m_events.emit<ipc::NativeShowUpdater>();
            }
            else if (notify && m_settings.get(ipc::SettingsKey::EnableNewReleaseToast, true).get<bool>())
            {
                m_events.emit<ipc::NativeUpdateNotification>({.version = release.at("tag_name").get<std::string>()});
            }
        }

        return ipcOk(newer ? release : Json(nullptr));
    }
    catch (const std::exception& error)
    {
        m_logger.write(std::string("Update check failed: ") + error.what());
        return ipcError(error.what());
    }
}

Json UpdateService::latest() const
{
    std::lock_guard lock(m_mutex);
    return m_release;
}

#ifdef YAY_DEBUG_BUILD
Json UpdateService::preview() const
{
    std::lock_guard lock(m_mutex);
    return m_previewRelease;
}
#endif

int64_t UpdateService::nextManualCheck() const
{
    std::lock_guard lock(m_mutex);
    return m_nextManualCheck;
}

Json UpdateService::commits(const std::stop_token& stop)
{
    Json release;
    {
        std::lock_guard lock(m_mutex);
        if (!m_commits.is_null())
        {
            return m_commits;
        }

        release = m_release;
    }

    if (release.is_null())
    {
        return nullptr;
    }

    try
    {
        constexpr auto base = std::string_view(GitHash) == "native" ? AppVersion : GitHash;
        const auto compare =
            m_http.getJson(std::string("https://api.github.com/repos/") + AppRepository + "/compare/" +
                               encodeUrl(base) + "..." + encodeUrl(release.at("tag_name").get<std::string>()),
                           stop);
        const auto& result = compare.at("commits");
        std::lock_guard lock(m_mutex);
        if (m_release == release)
        {
            m_commits = result;
        }

        return result;
    }
    catch (const std::exception& error)
    {
        m_logger.write(std::string("Could not load release commits: ") + error.what());
        return nullptr;
    }
}

Json UpdateService::install(const std::stop_token& stop)
{
    Json release;
    std::stop_token cancellation;
    {
        std::lock_guard lock(m_mutex);
        if (m_installing)
        {
            return ipcError("An update is already in progress.");
        }

        if (m_release.is_null())
        {
            return ipcError("No application update is available.");
        }

        release = m_release;
        m_cancel = std::stop_source();
        cancellation = m_cancel.get_token();
        m_installing = true;
    }

    std::stop_callback cancelled(stop,
                                 [this]
                                 {
                                     cancel();
                                 });
    std::filesystem::path directory;
    bool keepInstaller = false;
    Json result;
    try
    {
        directory = std::filesystem::temp_directory_path() / ("yay-update-" + uuid());
        const auto installer = directory / InstallerAsset;
        Json asset;
        for (const auto& entry : release.at("assets"))
        {
            if (entry.value("name", "") == InstallerAsset)
            {
                asset = entry;
                break;
            }
        }

        if (asset.is_null())
        {
            throw std::runtime_error(std::string("Could not find expected installer asset \"") + InstallerAsset +
                                     "\".");
        }

        const auto size = asset.at("size").get<int64_t>();
        const auto url = asset.at("browser_download_url").get<std::string>();
        if (size <= 0 || size > 500LL * 1024 * 1024 || !trustedAsset(url))
        {
            throw std::runtime_error("The installer has an invalid size or untrusted URL.");
        }

        std::string expected;
        // Keep this initializer separate so the condition stays readable.
        // ReSharper disable once CppTooWideScopeInitStatement
        const auto digest = asset.value("digest", Json(nullptr));
        if (digest.is_string() &&
            std::regex_match(digest.get<std::string>(), std::regex("sha256:[a-fA-F0-9]{64}", std::regex::icase)))
        {
            expected = digest.get<std::string>().substr(7);
        }
        else
        {
            for (const auto& entry : release.at("assets"))
            {
                if (entry.value("name", "") == std::string(InstallerAsset) + ".sha256" &&
                    trustedAsset(entry.at("browser_download_url").get<std::string>()))
                {
                    expected = checksumFromText(
                        m_http.get(entry.at("browser_download_url").get<std::string>(), cancellation, 4096, true),
                        InstallerAsset);
                }
            }
        }

        if (expected.empty())
        {
            throw std::runtime_error("Could not find a SHA-256 checksum for the installer.");
        }

        std::ranges::transform(expected,
                               expected.begin(),
                               [](const unsigned char c)
                               {
                                   return static_cast<char>(tolower(c));
                               });
        m_events.emit<ipc::UpdaterUpdateStep>({.message = "Downloading installer... (0%)"});
        m_http.download(
            url,
            installer,
            cancellation,
            [&](const int percent)
            {
                m_events.emit<ipc::UpdaterUpdateStep>(
                    {.message = "Downloading installer... (" + std::to_string(percent) + "%)"});
            },
            static_cast<uint64_t>(size),
            true);
        m_events.emit<ipc::UpdaterUpdateStep>({.message = "Verifying installer..."});
        if (std::filesystem::file_size(installer) != static_cast<uint64_t>(size) ||
            !constantTimeEqual(hashFile(installer), expected))
        {
            throw std::runtime_error("Installer size or SHA-256 verification failed.");
        }

        if (cancellation.stop_requested())
        {
            throw std::runtime_error("Operation cancelled.");
        }

        m_events.emit<ipc::UpdaterUpdateStep>({.message = "Starting installer..."});
        launchDetached(installer, {"/UPDATE", "/SILENT", "/NORESTART"});
        keepInstaller = true;
        m_events.emit<ipc::NativeQuit>();
        result = ipcOk();
    }
    catch (const std::exception& error)
    {
        result = cancellation.stop_requested() ? ipcOk() : ipcError(error.what());
    }

    if (!keepInstaller && !directory.empty())
    {
        std::error_code error;
        std::filesystem::remove_all(directory, error);
    }

    {
        std::lock_guard lock(m_mutex);
        m_installing = false;
    }

    return result;
}

void UpdateService::cancel()
{
    std::lock_guard lock(m_mutex);
    m_cancel.request_stop();
}
