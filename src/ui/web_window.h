#pragma once
#include "core/json.h"
#include "generated/ipc_contract.h"
#include "platform/platform.h"
#include <wrl.h>
#include <WebView2.h>
#include <shobjidl.h>
#include <memory>

struct WindowOptions
{
public:
    std::string name;
    int width;
    int height;
    int minWidth;
    int minHeight;
    bool resizable = false;
    bool trayWindow = false;
};

class WebWindow : public std::enable_shared_from_this<WebWindow>
{
public:
    typedef std::function<void(WebWindow&, const Json&)> MessageHandler;
    typedef std::function<void(const std::string&)> CloseHandler;

private:
    WindowOptions m_options;
    const AppPaths& m_paths;
    Logger& m_logger;
    HWND m_window = nullptr;
    Microsoft::WRL::ComPtr<ICoreWebView2Controller> m_controller;
    Microsoft::WRL::ComPtr<ICoreWebView2> m_webview;
    Microsoft::WRL::ComPtr<ITaskbarList> m_taskbar;
    MessageHandler m_onMessage;
    CloseHandler m_onClose;
    bool m_active = false;
    bool m_pinned = false;
    bool m_ready = false;
    bool m_showWhenReady = false;
    bool m_maximized = false;
    std::vector<Json> m_pendingEvents;

public:
    WebWindow(
        WindowOptions options, const AppPaths& paths, Logger& logger, MessageHandler onMessage, CloseHandler onClose);
    ~WebWindow();
    void initialize(ICoreWebView2Environment* environment, ITaskbarList* taskbar);
    HWND handle() const;
    const std::string& name() const;
    bool visible() const;
    bool active() const;
    bool ready() const;
    void markReady();
    void show();
    void hide();
    void center() const;
    void position(int x, int y) const;
    bool togglePinned();
    void minimize() const;
    void maximize(bool restore = false) const;
    void reload();
    void post(const Json& message) const;

    template <ipc::RendererEvent Event> void emit(const Event::Payload& payload)
    {
        forwardEvent(Event::Channel, Json(payload));
    }

    template <ipc::RendererEvent Event> void emit() requires std::same_as<typename Event::Payload, std::nullptr_t>
    {
        emit<Event>(nullptr);
    }

    void forwardEvent(ipc::EventChannel channel, const Json& payload);
#ifdef YAY_DEBUG_BUILD
    void capture(const std::filesystem::path& file, std::function<void(bool)> complete);
#endif
    void refreshTheme() const;
    void close();

private:
    void configureWebView(ICoreWebView2Environment* environment);
    void resizeWebView() const;
    int frameInset() const;
    LRESULT processMessage(UINT message, WPARAM wparam, LPARAM lparam);
    static LRESULT CALLBACK windowProcedure(HWND window, UINT message, WPARAM wparam, LPARAM lparam);
};
