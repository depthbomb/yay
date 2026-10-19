#pragma once
#include "services/settings_service.h"
#include "platform/http_client.h"
#include "generated/ipc_contract.h"
#include <atomic>
#include <deque>

class DownloadService
{
private:
    const AppPaths& m_paths;
    SettingsService& m_settings;
    EventBus& m_events;
    HttpClient& m_http;
    Logger& m_logger;
    mutable std::mutex m_mutex;
    std::condition_variable_any m_ready;
    std::deque<ipc::DownloadSession> m_queue;
    std::optional<ipc::DownloadSession> m_active;
    std::stop_source m_cancel;
    std::atomic<bool> m_updating = false;
    std::atomic<bool> m_stopping = false;
    std::jthread m_worker;

public:
    DI_INJECT(DownloadService(
        const AppPaths& paths, SettingsService& settings, EventBus& events, HttpClient& http, Logger& logger));
    ~DownloadService();
    void enqueue(const std::string& url, bool audioOnly = false);
    bool busy() const;
    std::optional<ipc::DownloadSession> active() const;
    void cancel();
    void stop();
    Json updateBinary(bool silent, const std::stop_token& stop = {});
    void clearThumbnailCache() const;
    void pruneThumbnailCache() const;

private:
    void run(const std::stop_token& stop);
    void perform(ipc::DownloadSession& session, const std::stop_token& stop);
    void cacheThumbnail(const std::string& id, const std::stop_token& stop) const;
};
