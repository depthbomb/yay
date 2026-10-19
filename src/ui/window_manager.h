#pragma once
#include "ui/web_window.h"
#include "services/settings_service.h"
#include "core/ipc_router.h"
#include "platform/http_client.h"
#include <shobjidl.h>

class WindowManager
{
private:
    const AppPaths& m_paths;
    SettingsService& m_settings;
    Logger& m_logger;
    IpcRouter& m_router;
    HttpClient& m_http;
    Microsoft::WRL::ComPtr<ICoreWebView2Environment> m_environment;
    Microsoft::WRL::ComPtr<ITaskbarList3> m_taskbar;
    std::map<std::string, std::shared_ptr<WebWindow>> m_windows;
    std::function<void(const std::string&)> m_onClose;
    std::function<void()> m_onInitialized;
    std::string m_runtimeVersion;

public:
    DI_INJECT(WindowManager(const AppPaths& paths,
                            SettingsService& settings,
                            Logger& logger,
                            IpcRouter& router,
                            HttpClient& http));
    ~WindowManager();
    void initialize(std::function<void()> ready, std::function<void(const std::string&)> close);
    std::shared_ptr<WebWindow> create(const WindowOptions& options);
    std::shared_ptr<WebWindow> get(const std::string& name) const;
    void show(const std::string& name);
    void showMain(HWND trayOwner) const;
    void toggleGlobalMenu() const;

    template <ipc::RendererEvent Event> void broadcast(const Event::Payload& payload)
    {
        forwardEvent(Event::Channel, Json(payload));
    }

    void forwardEvent(ipc::EventChannel channel, const Json& payload);
    void reloadAll();
    void progress(const std::string& name, double percent, bool indeterminate = false) const;
    void clear();
    void remove(const std::string& name);
    Json bootstrapState() const;
};
