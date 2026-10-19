#include "services/download_service.h"
#include "downloads/yt_dlp.h"
#include "platform/process.h"

DownloadService::DownloadService(
    const AppPaths& paths, SettingsService& settings, EventBus& events, HttpClient& http, Logger& logger)
    : m_paths(paths),
      m_settings(settings),
      m_events(events),
      m_http(http),
      m_logger(logger),
      m_worker(
          [this](const std::stop_token& stop)
          {
              run(stop);
          })
{
}

DownloadService::~DownloadService()
{
    stop();
}

void DownloadService::enqueue(const std::string& url, const bool audioOnly)
{
    if (!validMediaUrl(url))
    {
        throw std::runtime_error("Invalid media URL.");
    }

    // Generate the ID before acquiring the queue lock.
    // ReSharper disable once CppTooWideScope
    const ipc::DownloadSession session{.id = uuid(), .url = url, .audioOnly = audioOnly};
    {
        std::lock_guard lock(m_mutex);
        if (m_stopping)
        {
            throw std::runtime_error("The application is shutting down.");
        }

        m_queue.push_back(session);
        m_events.emit<ipc::YtDlpDownloadQueued>(session);
    }

    m_ready.notify_one();
}

bool DownloadService::busy() const
{
    std::lock_guard lock(m_mutex);
    return m_active.has_value() || !m_queue.empty();
}

std::optional<ipc::DownloadSession> DownloadService::active() const
{
    std::lock_guard lock(m_mutex);
    return m_active;
}

void DownloadService::cancel()
{
    std::lock_guard lock(m_mutex);
    if (m_active)
    {
        m_cancel.request_stop();
    }
}

void DownloadService::stop()
{
    m_stopping = true;
    {
        std::lock_guard lock(m_mutex);
        m_queue.clear();
        m_cancel.request_stop();
    }

    m_worker.request_stop();
    m_ready.notify_all();
    if (m_worker.joinable())
    {
        m_worker.join();
    }
}

void DownloadService::run(const std::stop_token& stop)
{
    for (;;)
    {
        ipc::DownloadSession session;
        std::stop_token cancellation;
        {
            std::unique_lock lock(m_mutex);
            m_ready.wait(lock,
                         stop,
                         [this]
                         {
                             return !m_queue.empty() && !m_updating;
                         });
            if (stop.stop_requested())
            {
                return;
            }

            session = std::move(m_queue.front());
            m_queue.pop_front();
            session.startedAt = static_cast<double>(unixMillis());
            m_active = session;
            m_cancel = std::stop_source();
            cancellation = m_cancel.get_token();
        }

        m_events.emit<ipc::YtDlpDownloadStarted>(session);
        try
        {
            perform(session, cancellation);
        }
        catch (const std::exception& error)
        {
            m_logger.write(std::string("Download failed: ") + error.what());
            m_events.emit<ipc::YtDlpStdout>({.lines = {std::string("ERROR: ") + error.what()}});
            session.success = false;
        }

        session.cancelled = cancellation.stop_requested();
        session.finishedAt = static_cast<double>(unixMillis());
        if (cancellation.stop_requested())
        {
            session.success = false;
            m_events.emit<ipc::YtDlpDownloadCanceled>(session);
        }

        m_events.emit<ipc::YtDlpDownloadFinished>(session);
        {
            std::lock_guard lock(m_mutex);
            m_active.reset();
        }
    }
}

void DownloadService::perform(ipc::DownloadSession& session, const std::stop_token& stop)
{
    const auto settings = m_settings.all();
    std::filesystem::create_directories(
        pathFromUtf8(settings.at(ipc::settingName(ipc::SettingsKey::DownloadDir)).get<std::string>()));
    session.youtubeId = youtubeVideoId(session.url);

    std::vector<std::string> logs;
    auto lastLog = std::chrono::steady_clock::now();
    auto lastProgress = lastLog;
    auto flush = [&]
    {
        if (!logs.empty())
        {
            m_events.emit<ipc::YtDlpStdout>({.lines = logs});
            logs.clear();
            lastLog = std::chrono::steady_clock::now();
        }
    };

    const auto result = runProcess(
        pathFromUtf8(settings.at(ipc::settingName(ipc::SettingsKey::YtDlpPath)).get<std::string>()),
        ytDlpArguments(settings, m_paths, session.url, session.audioOnly),
        stop,
        [&](const std::string& line)
        {
            logs.push_back(line);
            const auto now = std::chrono::steady_clock::now();
            if (now - lastLog >= std::chrono::milliseconds(75) || logs.size() >= 200)
            {
                flush();
            }

            if (const auto progress = ytDlpProgress(line))
            {
                session.progress = *progress;
                if (now - lastProgress >= std::chrono::milliseconds(100))
                {
                    m_events.emit<ipc::YtDlpDownloadProgress>(
                        {.id = session.id, .progress = session.progress});
                    lastProgress = now;
                    std::lock_guard lock(m_mutex);
                    m_active = session;
                }
            }
        },
        std::chrono::hours(24),
        m_paths.binaries);
    flush();
    session.success = result.exitCode == 0 && !result.cancelled && !result.timedOut;
    m_events.emit<ipc::YtDlpDownloadProgress>({.id = session.id, .progress = session.progress});
    if (session.success.value_or(false) && session.youtubeId && !stop.stop_requested())
    {
        cacheThumbnail(*session.youtubeId, stop);
    }
}

Json DownloadService::updateBinary(const bool silent, const std::stop_token& stop)
{
    {
        std::lock_guard lock(m_mutex);
        if (m_active || !m_queue.empty() || m_updating.exchange(true))
        {
            return ipcError("A download or yt-dlp update is already in progress.");
        }
    }

    m_events.emit<ipc::YtDlpUpdatingBinary>();
    Json result;
    try
    {
        const auto [exitCode, cancelled, timedOut, output] =
            runProcess(pathFromUtf8(m_settings.get(ipc::SettingsKey::YtDlpPath).get<std::string>()),
                       {"-U"},
                       stop,
                       {},
                       std::chrono::seconds(120),
                       m_paths.binaries);
        if (exitCode != 0 || cancelled || timedOut)
        {
            throw std::runtime_error(timedOut ? "yt-dlp update timed out." : output);
        }

        const auto [version, updated] = parseYtDlpUpdateOutput(output);
        if (!silent)
        {
            m_events.emit<ipc::NativeMessage>(
                {.type = "info",
                 .title = "yt-dlp update",
                 .message = updated ? "yt-dlp was updated to " + version + "."
                                    : "You are using the latest version of yt-dlp (" + version + ")."});
        }

        result = ipcOk();
    }
    catch (const std::exception& error)
    {
        result = ipcError(error.what());
        if (!silent)
        {
            m_events.emit<ipc::NativeMessage>(
                {.type = "error",
                 .title = "yt-dlp update",
                 .message = std::string("yt-dlp could not be updated: ") + error.what()});
        }
    }

    m_updating = false;
    m_ready.notify_all();
    m_events.emit<ipc::YtDlpUpdatedBinary>();
    return result;
}

void DownloadService::cacheThumbnail(const std::string& id, const std::stop_token& stop) const
{
    const auto path = m_paths.data / "thumbnail_cache" / (id + ".jpg");
    if (std::filesystem::exists(path))
    {
        return;
    }

    try
    {
        m_http.download("https://i.ytimg.com/vi/" + id + "/maxresdefault.jpg", path, stop, {}, 8 * 1024 * 1024);
        pruneThumbnailCache();
    }
    catch (const std::exception& error)
    {
        m_logger.write(std::string("Could not cache thumbnail: ") + error.what());
    }
}

void DownloadService::clearThumbnailCache() const
{
    if (const auto directory = m_paths.data / "thumbnail_cache"; std::filesystem::exists(directory))
    {
        for (const auto& entry : std::filesystem::directory_iterator(directory))
        {
            if (entry.is_regular_file() && entry.path().extension() == ".jpg")
            {
                std::filesystem::remove(entry.path());
            }
        }
    }
}

void DownloadService::pruneThumbnailCache() const
{
    const auto directory = m_paths.data / "thumbnail_cache";
    std::error_code error;
    std::vector<std::pair<std::filesystem::file_time_type, std::filesystem::path>> entries;
    for (const auto& entry : std::filesystem::directory_iterator(directory, error))
    {
        if (entry.is_regular_file(error) && entry.path().extension() == ".jpg")
        {
            const auto modified = entry.last_write_time(error);
            if (!error)
            {
                entries.emplace_back(modified, entry.path());
            }
        }
    }

    std::ranges::sort(entries,
                      [](const auto& left, const auto& right)
                      {
                          return left.first > right.first;
                      });
    const auto cutoff = std::filesystem::file_time_type::clock::now() - std::chrono::hours(24 * 30);
    for (size_t index = 0; index < entries.size(); ++index)
    {
        if (index >= 200 || entries[index].first < cutoff)
        {
            std::filesystem::remove(entries[index].second, error);
        }
    }
}
