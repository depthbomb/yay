#pragma once
#include "ui/window_manager.h"
#include "services/download_service.h"
#include "services/setup_service.h"
#include "services/twitter_service.h"
#include "services/update_service.h"
#include <shellapi.h>

struct AppOptions
{
public:
    bool show = false;
    bool updateBinaries = false;
#ifdef YAY_DEBUG_BUILD
    bool skipSetup = false;
    std::filesystem::path smokeReport;
#endif
    std::vector<std::string> arguments;
};

class Application
{
private:
    const AppPaths& m_paths;
    const AppOptions& m_options;
    Dispatcher& m_dispatcher;
    EventBus& m_events;
    WorkerPool& m_workers;
    SettingsService& m_settings;
    DownloadService& m_downloads;
    SetupService& m_setup;
    TwitterService& m_twitter;
    UpdateService& m_updates;
    WindowManager& m_windows;
    IpcRouter& m_router;
    Logger& m_logger;
    HWND m_host = nullptr;
    NOTIFYICONDATAW m_tray{};
    HICON m_trayIcon = nullptr;
    HICON m_downloadingIcon = nullptr;
    bool m_trayCreated = false;
    bool m_ready = false;
    bool m_setupStarted = false;
    bool m_quitting = false;
    bool m_relaunch = false;
    bool m_restartSetup = false;
    std::stop_source m_shutdown;
    std::vector<std::string> m_pendingLinks;
#ifdef YAY_DEBUG_BUILD
    bool m_previewUpdater = false;
    Json m_smokeResults = Json::object();
    int m_smokeCaptures = 0;
#endif

public:
    DI_INJECT(Application(const AppPaths& paths,
                          const AppOptions& options,
                          Dispatcher& dispatcher,
                          EventBus& events,
                          WorkerPool& workers,
                          SettingsService& settings,
                          DownloadService& downloads,
                          SetupService& setup,
                          TwitterService& twitter,
                          UpdateService& updates,
                          WindowManager& windows,
                          IpcRouter& router,
                          Logger& logger));
    ~Application();
    int run();
    [[nodiscard]] bool relaunchRequested() const;
    [[nodiscard]] std::vector<std::string> relaunchArguments() const;

private:
    void registerIpc();
    void rendererReady(const std::string& name);
    void setupFinished(bool success);
    void requestQuit(bool relaunch = false);
    void onEvent(ipc::EventChannel channel, const Json& payload);
    void onWindowClosed(const std::string& name);
    void createTray();
    void updateTray(bool downloading, const std::string& url = "");
    void showTrayMenu();
    void updateHotkey() const;
    void handleArguments(const std::vector<std::string>& arguments);
    Json promptFromWorker(const Json& options) const;
#ifdef YAY_DEBUG_BUILD
    void recordDiagnostics(const std::string& name, const Json& data);
    Json previewRelease() const;
#endif
    LRESULT processMessage(UINT message, WPARAM wparam, LPARAM lparam);
    static LRESULT CALLBACK hostProcedure(HWND window, UINT message, WPARAM wparam, LPARAM lparam);
};
