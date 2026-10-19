#include "ui/window_manager.h"
#include "ui/webview_runtime.h"
#include "platform/desktop.h"
#include "metadata.h"
#include <WebView2EnvironmentOptions.h>
#include <shellapi.h>
#include <array>
#include <ranges>

WindowManager::WindowManager(
    const AppPaths& paths,
    SettingsService& settings,
    Logger& logger,
    IpcRouter& router,
    HttpClient& http
) : m_paths(paths),
    m_settings(settings),
    m_logger(logger),
    m_router(router),
    m_http(http) {}

WindowManager::~WindowManager()
{
    clear();
}

void WindowManager::initialize(std::function<void()> ready, std::function<void(const std::string&)> close)
{
    m_onInitialized = std::move(ready);
    m_onClose = std::move(close);
    if (!ensureWebViewRuntime(m_http, m_logger))
    {
        m_onClose("fatal");
        return;
    }

    reportHresult(CoCreateInstance(CLSID_TaskbarList, nullptr, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&m_taskbar)), "Create taskbar integration", &m_logger);

    if (m_taskbar)
    {
        if (!reportHresult(m_taskbar->HrInit(), "Initialize taskbar integration", &m_logger))
        {
            m_taskbar.Reset();
        }
    }

    const auto options = Microsoft::WRL::Make<CoreWebView2EnvironmentOptions>();
    checkHresult(
        options->put_AdditionalBrowserArguments(
            m_settings.get(ipc::SettingsKey::DisableHardwareAcceleration, false).get<bool>() ? L"--disable-gpu" : L""),
        "Set WebView browser arguments");
    checkHresult(options->put_Language(L"en-US"), "Set WebView language");
    const auto result = CreateCoreWebView2EnvironmentWithOptions(
        nullptr,
        (m_paths.data / "WebView2").c_str(),
        options.Get(),
        Microsoft::WRL::Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
            [this](const HRESULT status, ICoreWebView2Environment* environment) -> HRESULT
            {
                if (FAILED(status) || !environment)
                {
                    m_logger.write("WebView2 environment failed: " + std::to_string(status));
                    MessageBoxW(nullptr,
                                L"Microsoft Edge WebView2 Runtime is required. Install the Evergreen WebView2 Runtime "
                                L"and launch yay again.",
                                L"yay",
                                MB_ICONERROR);
                    m_onClose("fatal");
                    return S_OK;
                }

                m_environment = environment;
                PWSTR version = nullptr;
                reportHresult(
                    environment->get_BrowserVersionString(&version), "Read WebView runtime version", &m_logger);
                m_runtimeVersion = version ? utf8(version) : "unknown";
                CoTaskMemFree(version);
                try
                {
                    create({.name = "main",
                            .width = 380,
                            .height = 500,
                            .minWidth = 380,
                            .minHeight = 500,
                            .resizable = false,
                            .trayWindow = true});
                    create({.name = "settings",
                            .width = 610,
                            .height = 520,
                            .minWidth = 610,
                            .minHeight = 520,
                            .resizable = true,
                            .trayWindow = false});
                    create({.name = "global-menu",
                            .width = 210,
                            .height = 110,
                            .minWidth = 210,
                            .minHeight = 110,
                            .resizable = false,
                            .trayWindow = true});
                    create({.name = "setup",
                            .width = 500,
                            .height = 300,
                            .minWidth = 500,
                            .minHeight = 300,
                            .resizable = false,
                            .trayWindow = false});
                    m_onInitialized();
                }
                catch (const std::exception& error)
                {
                    m_logger.write(error.what());
                    MessageBoxW(nullptr, wide(error.what()).c_str(), L"yay", MB_ICONERROR);
                    m_onClose("fatal");
                }

                return S_OK;
            })
            .Get());
    if (FAILED(result))
    {
        throw std::runtime_error("Unable to initialize WebView2. Install Microsoft Edge WebView2 Runtime.");
    }
}

std::shared_ptr<WebWindow> WindowManager::create(const WindowOptions& options)
{
    if (const auto existing = get(options.name))
    {
        return existing;
    }

    auto window = std::make_shared<WebWindow>(
        options,
        m_paths,
        m_logger,
        [this](WebWindow& source, const Json& message)
        {
            if (!message.is_object() || !message.contains("id") || !message.at("id").is_number_unsigned())
            {
                return;
            }

            const auto& id = message.at("id");
            const std::weak_ptr weak = source.shared_from_this();
            m_router.dispatch(message,
                              {.windowName = source.name(), .window = source.handle()},
                              [weak, id](Json result)
                              {
                                  if (const auto target = weak.lock())
                                  {
                                      target->post({{"id", id}, {"result", std::move(result)}});
                                  }
                              });
        },
        m_onClose);
    m_windows.emplace(options.name, window);
    window->initialize(m_environment.Get(), m_taskbar.Get());
    return window;
}

std::shared_ptr<WebWindow> WindowManager::get(const std::string& name) const
{
    const auto found = m_windows.find(name);
    return found == m_windows.end() ? nullptr : found->second;
}

void WindowManager::show(const std::string& name)
{
    if (name == "updater" && !get(name))
    {
        create({.name = "updater",
                .width = 800,
                .height = 500,
                .minWidth = 640,
                .minHeight = 400,
                .resizable = true,
                .trayWindow = false});
    }

    if (const auto window = get(name))
    {
        window->show();
    }
}

// The handle itself is constant; HWND does not point to a const window object.
// NOLINTNEXTLINE(misc-misplaced-const)
void WindowManager::showMain(HWND const trayOwner) const
{
    const auto main = get("main");
    if (!main)
    {
        return;
    }

    NOTIFYICONIDENTIFIER identifier{.cbSize = sizeof(identifier)};
    identifier.hWnd = trayOwner;
    identifier.uID = 1;
    RECT tray{};
    POINT point{};
    GetCursorPos(&point);
    if (SUCCEEDED(Shell_NotifyIconGetRect(&identifier, &tray)))
    {
        point = {.x = tray.left + (tray.right - tray.left) / 2, .y = tray.top + (tray.bottom - tray.top) / 2};
    }

    MONITORINFO info{.cbSize = sizeof(info)};
    GetMonitorInfoW(MonitorFromPoint(point, MONITOR_DEFAULTTONEAREST), &info);
    RECT bounds{};
    GetWindowRect(main->handle(), &bounds);
    const int width = bounds.right - bounds.left;
    const int height = bounds.bottom - bounds.top;
    const int gap = isWindows11() ? MulDiv(8, static_cast<int>(GetDpiForWindow(main->handle())), 96) : 0;
    enum class Edge
    {
        Top,
        Right,
        Bottom,
        Left
    };
    auto edge = Edge::Bottom;
    if (info.rcWork.top > info.rcMonitor.top)
    {
        edge = Edge::Top;
    }
    else if (info.rcWork.left > info.rcMonitor.left)
    {
        edge = Edge::Left;
    }
    else if (info.rcWork.right < info.rcMonitor.right)
    {
        edge = Edge::Right;
    }
    else if (info.rcWork.bottom == info.rcMonitor.bottom)
    {
        // With an auto-hidden taskbar, its tray icon identifies the nearest edge.
        const auto distances = std::to_array({std::abs(point.y - info.rcMonitor.top),
                                              std::abs(info.rcMonitor.right - point.x),
                                              std::abs(info.rcMonitor.bottom - point.y),
                                              std::abs(point.x - info.rcMonitor.left)});
        edge = static_cast<Edge>(std::ranges::min_element(distances) - distances.begin());
    }

    int x = std::clamp(point.x - width / 2, info.rcWork.left, info.rcWork.right - width);
    int y = info.rcWork.bottom - height - gap;
    if (edge == Edge::Top)
    {
        y = info.rcWork.top + gap;
    }
    else if (edge == Edge::Left)
    {
        x = info.rcWork.left + gap;
        y = std::clamp(point.y - height / 2, info.rcWork.top, info.rcWork.bottom - height);
    }
    else if (edge == Edge::Right)
    {
        x = info.rcWork.right - width - gap;
        y = std::clamp(point.y - height / 2, info.rcWork.top, info.rcWork.bottom - height);
    }

    main->position(x, y);
    main->show();
}

void WindowManager::toggleGlobalMenu() const
{
    const auto menu = get("global-menu");
    if (!menu)
    {
        return;
    }

    if (menu->visible())
    {
        menu->hide();
        return;
    }

    POINT cursor{};
    GetCursorPos(&cursor);
    MONITORINFO monitor{.cbSize = sizeof(monitor)};
    GetMonitorInfoW(MonitorFromPoint(cursor, MONITOR_DEFAULTTONEAREST), &monitor);
    RECT bounds{};
    GetWindowRect(menu->handle(), &bounds);
    menu->position(std::clamp(cursor.x, monitor.rcWork.left, monitor.rcWork.right - (bounds.right - bounds.left)),
                   std::clamp(cursor.y, monitor.rcWork.top, monitor.rcWork.bottom - (bounds.bottom - bounds.top)));
    menu->show();
}

void WindowManager::forwardEvent(const ipc::EventChannel channel, const Json& payload)
{
    IpcRouter::validateEvent(channel, payload);
    for (const auto& [name, window] : m_windows)
    {
        if (channel == ipc::EventChannel::YtDlpStdout && name != "main")
        {
            continue;
        }

        window->forwardEvent(channel, payload);
    }
}

void WindowManager::reloadAll()
{
    for (const auto& window : m_windows | std::views::values)
    {
        window->reload();
    }
}

void WindowManager::progress(const std::string& name, const double percent, const bool indeterminate) const
{
    const auto window = get(name);
    if (window && m_taskbar)
    {
        reportHresult(m_taskbar->SetProgressState(window->handle(),
                                                  indeterminate ? TBPF_INDETERMINATE
                                                  : percent < 0 ? TBPF_NOPROGRESS
                                                                : TBPF_NORMAL),
                      "Set taskbar progress state",
                      &m_logger);
        if (percent >= 0 && !indeterminate)
        {
            reportHresult(m_taskbar->SetProgressValue(
                              window->handle(), static_cast<ULONGLONG>(std::clamp(percent, 0.0, 100.0) * 100), 10000),
                          "Set taskbar progress value",
                          &m_logger);
        }
    }
}

void WindowManager::clear()
{
    for (const auto& window : m_windows | std::views::values)
    {
        window->close();
    }

    m_windows.clear();
    m_environment.Reset();
}

void WindowManager::remove(const std::string& name)
{
    if (const auto window = get(name))
    {
        window->close();
        m_windows.erase(name);
    }
}

Json WindowManager::bootstrapState() const
{
    return {{"system", systemInfo()},
            {"flags", m_settings.flags()},
            {"buildDate", BuildDate},
            {"versions", {{"webview2", m_runtimeVersion}, {"chrome", m_runtimeVersion}, {"native", "C++23 / MSVC"}}}};
}
