#include "ui/web_window.h"
#include "platform/desktop.h"
#include "platform/http_client.h"
#include <dwmapi.h>
#include <shellapi.h>
#include <shlwapi.h>
#include <windowsx.h>

namespace
{
    constexpr wchar_t WindowClass[] = L"yay.WebView2.Window";
}

WebWindow::WebWindow(
    WindowOptions options,
    const AppPaths& paths,
    Logger& logger,
    MessageHandler onMessage,
    CloseHandler onClose
) : m_options(std::move(options)),
    m_paths(paths),
    m_logger(logger),
    m_onMessage(std::move(onMessage)),
    m_onClose(std::move(onClose))
{
    WNDCLASSEXW windowClass{.cbSize = sizeof(windowClass)};
    windowClass.lpfnWndProc = windowProcedure;
    windowClass.hInstance = GetModuleHandleW(nullptr);
    windowClass.hCursor = LoadCursorW(nullptr, IDC_ARROW);
    windowClass.hIcon = LoadIconW(windowClass.hInstance, MAKEINTRESOURCEW(1));
    windowClass.hIconSm = windowClass.hIcon;
    windowClass.lpszClassName = WindowClass;
    windowClass.hbrBackground = static_cast<HBRUSH>(GetStockObject(BLACK_BRUSH));
    RegisterClassExW(&windowClass);

    // The host must paint underneath the transparent WebView child after each redraw.
    DWORD style = WS_CAPTION | WS_CLIPSIBLINGS;
    if (m_options.resizable)
    {
        style |= WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX;
    }
    else if (!m_options.trayWindow)
    {
        style |= WS_MINIMIZEBOX;
    }

    // Keep normal DWM window behavior; ITaskbarList excludes tray windows from the taskbar.
    const DWORD extended = m_options.trayWindow ? WS_EX_TOPMOST : WS_EX_APPWINDOW;
    const auto dpi = GetDpiForSystem();
    const int inset = GetSystemMetricsForDpi(SM_CXSIZEFRAME, dpi) + GetSystemMetricsForDpi(SM_CXPADDEDBORDER, dpi);
    m_window = CreateWindowExW(extended,
                               WindowClass,
                               L"yay",
                               style,
                               CW_USEDEFAULT,
                               CW_USEDEFAULT,
                               MulDiv(m_options.width, dpi, 96) + inset * 2,
                               MulDiv(m_options.height, dpi, 96) + inset,
                               nullptr,
                               nullptr,
                               windowClass.hInstance,
                               this);
    checkWin(m_window != nullptr, "Create application window");
    refreshTheme();
    SetWindowPos(m_window, nullptr, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED);
    center();
}

WebWindow::~WebWindow()
{
    close();
}

void WebWindow::initialize(ICoreWebView2Environment* environment, ITaskbarList* taskbar)
{
    m_taskbar = taskbar;
    const auto weak = weak_from_this();
    const auto callback = Microsoft::WRL::Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
        [weak, environment = Microsoft::WRL::ComPtr<ICoreWebView2Environment>(environment)](
            const HRESULT result, ICoreWebView2Controller* controller) -> HRESULT
        {
            const auto self = weak.lock();
            if (!self || !self->m_window)
            {
                return S_OK;
            }

            if (FAILED(result) || !controller)
            {
                self->m_logger.write("Could not create WebView2 controller: " + std::to_string(result));
                MessageBoxW(self->m_window,
                            L"The WebView2 runtime could not create the application window.",
                            L"yay",
                            MB_ICONERROR);
                self->m_onClose("fatal");
                return S_OK;
            }

            self->m_controller = controller;
            try
            {
                checkHresult(controller->get_CoreWebView2(&self->m_webview), "Get WebView controller content");
                self->configureWebView(environment.Get());
            }
            catch (const std::exception& error)
            {
                self->m_logger.write(error.what());
                MessageBoxW(self->m_window, wide(error.what()).c_str(), L"yay", MB_ICONERROR);
                self->m_onClose("fatal");
            }
            return S_OK;
        });
    if (const auto result = environment->CreateCoreWebView2Controller(m_window, callback.Get()); FAILED(result))
    {
        throw std::runtime_error("Unable to start WebView2.");
    }
}

HWND WebWindow::handle() const
{
    return m_window;
}

const std::string& WebWindow::name() const
{
    return m_options.name;
}

bool WebWindow::visible() const
{
    return IsWindowVisible(m_window) != FALSE;
}

bool WebWindow::active() const
{
    return m_active;
}

bool WebWindow::ready() const
{
    return m_ready;
}

void WebWindow::markReady()
{
    m_ready = true;
    for (const auto& event : m_pendingEvents)
    {
        post(event);
    }

    m_pendingEvents.clear();
    if (m_showWhenReady)
    {
        show();
    }
}

void WebWindow::show()
{
    m_showWhenReady = true;
    if (!m_ready)
    {
        return;
    }

    int showState = SW_SHOW;
    if (IsIconic(m_window))
    {
        showState = SW_RESTORE;
    }
    else if (m_options.trayWindow)
    {
        showState = SW_SHOWNORMAL;
    }

    ShowWindow(m_window, showState);
    // STARTUPINFO can override the first SW_SHOWNORMAL when a launcher starts us hidden.
    if (!visible())
    {
        ShowWindow(m_window, showState);
    }

    SetForegroundWindow(m_window);
    if (m_controller)
    {
        reportHresult(m_controller->put_IsVisible(TRUE), "Show WebView", &m_logger);
        reportHresult(m_controller->MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC), "Focus WebView", &m_logger);
    }
}

void WebWindow::hide()
{
    m_showWhenReady = false;
    if (visible())
    {
        // A blur handler must not activate another window while activation is already changing.
        SetWindowPos(m_window,
                     nullptr,
                     0,
                     0,
                     0,
                     0,
                     SWP_HIDEWINDOW | SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOOWNERZORDER);
    }
}

void WebWindow::center() const
{
    const auto monitor = MonitorFromWindow(m_window, MONITOR_DEFAULTTOPRIMARY);
    MONITORINFO info{.cbSize = sizeof(info)};
    GetMonitorInfoW(monitor, &info);
    RECT bounds{};
    GetWindowRect(m_window, &bounds);
    position(info.rcWork.left + (info.rcWork.right - info.rcWork.left - (bounds.right - bounds.left)) / 2,
             info.rcWork.top + (info.rcWork.bottom - info.rcWork.top - (bounds.bottom - bounds.top)) / 2);
}

void WebWindow::position(const int x, const int y) const
{
    SetWindowPos(m_window, nullptr, x, y, 0, 0, SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE);
}

bool WebWindow::togglePinned()
{
    m_pinned = !m_pinned;
    return m_pinned;
}

void WebWindow::minimize() const
{
    if (!m_options.trayWindow)
    {
        ShowWindow(m_window, SW_MINIMIZE);
    }
}

void WebWindow::maximize(const bool restore) const
{
    if (m_options.resizable)
    {
        ShowWindow(m_window, restore || IsZoomed(m_window) ? SW_RESTORE : SW_MAXIMIZE);
    }
}

void WebWindow::reload()
{
    m_ready = false;
    if (m_webview)
    {
        reportHresult(m_webview->Reload(), "Reload WebView", &m_logger);
    }
}

void WebWindow::post(const Json& message) const
{
    if (m_webview)
    {
        const auto serialized = message.dump(-1, ' ', false, Json::error_handler_t::replace);
        reportHresult(m_webview->PostWebMessageAsJson(wide(serialized).c_str()), "Send WebView message", &m_logger);
    }
}

void WebWindow::forwardEvent(const ipc::EventChannel channel, const Json& payload)
{
    const Json message{{"channel", ipc::channelName(channel)}, {"payload", payload}};
    if (!m_ready)
    {
        if (m_pendingEvents.size() < 500)
        {
            m_pendingEvents.push_back(message);
        }
    }
    else
    {
        post(message);
    }
}

#ifdef YAY_DEBUG_BUILD
void WebWindow::capture(const std::filesystem::path& file, std::function<void(bool)> complete)
{
    Microsoft::WRL::ComPtr<IStream> stream;
    if (!m_webview || FAILED(SHCreateStreamOnFileEx(file.c_str(),
                                                    STGM_CREATE | STGM_READWRITE | STGM_SHARE_EXCLUSIVE,
                                                    FILE_ATTRIBUTE_NORMAL,
                                                    TRUE,
                                                    nullptr,
                                                    &stream)))
    {
        complete(false);
        return;
    }

    // The API may fail before scheduling its callback. Complete either path once.
    const auto completion = std::make_shared<std::function<void(bool)>>(std::move(complete));
    const auto finish = [completion](const bool success)
    {
        if (auto callback = std::exchange(*completion, {}))
        {
            callback(success);
        }
    };
    const auto weak = weak_from_this();
    const auto result = m_webview->CapturePreview(
        COREWEBVIEW2_CAPTURE_PREVIEW_IMAGE_FORMAT_PNG,
        stream.Get(),
        Microsoft::WRL::Callback<ICoreWebView2CapturePreviewCompletedHandler>(
            [weak, stream, finish](const HRESULT status) -> HRESULT
            {
                const auto self = weak.lock();
                auto* logger = self ? &self->m_logger : nullptr;
                const bool captured = reportHresult(status, "Capture WebView preview", logger);
                const bool saved = reportHresult(stream->Commit(STGC_DEFAULT), "Save WebView preview", logger);
                finish(captured && saved);
                return S_OK;
            })
            .Get());
    if (!reportHresult(result, "Start WebView preview capture", &m_logger))
    {
        finish(false);
    }
}
#endif

void WebWindow::refreshTheme() const
{
    constexpr BOOL dark = TRUE;
    reportHresult(DwmSetWindowAttribute(m_window, DWMWA_USE_IMMERSIVE_DARK_MODE, &dark, sizeof(dark)),
                  "Apply dark window theme",
                  &m_logger);
    constexpr auto backdrop = DWMSBT_MAINWINDOW;
    reportHresult(DwmSetWindowAttribute(m_window, DWMWA_SYSTEMBACKDROP_TYPE, &backdrop, sizeof(backdrop)),
                  "Apply window backdrop",
                  &m_logger);
    constexpr auto corners = DWMWCP_ROUND;
    reportHresult(DwmSetWindowAttribute(m_window, DWMWA_WINDOW_CORNER_PREFERENCE, &corners, sizeof(corners)),
                  "Apply window corners",
                  &m_logger);
    constexpr COLORREF caption = DWMWA_COLOR_NONE;
    reportHresult(DwmSetWindowAttribute(m_window, DWMWA_CAPTION_COLOR, &caption, sizeof(caption)),
                  "Apply window caption color",
                  &m_logger);
    constexpr MARGINS margins{.cxLeftWidth = -1, .cxRightWidth = -1, .cyTopHeight = -1, .cyBottomHeight = -1};
    reportHresult(DwmExtendFrameIntoClientArea(m_window, &margins), "Extend window frame", &m_logger);
    DWORD accentPreference = 0;
    DWORD size = sizeof(accentPreference);
    RegGetValueW(HKEY_CURRENT_USER,
                 L"Software\\Microsoft\\Windows\\DWM",
                 L"ColorPrevalence",
                 RRF_RT_REG_DWORD,
                 nullptr,
                 &accentPreference,
                 &size);
    COLORREF border = DWMWA_COLOR_DEFAULT;
    if (m_active && accentPreference)
    {
        const auto color = accentColor();
        border = RGB(std::stoi(color.substr(0, 2), nullptr, 16),
                     std::stoi(color.substr(2, 2), nullptr, 16),
                     std::stoi(color.substr(4, 2), nullptr, 16));
    }

    reportHresult(DwmSetWindowAttribute(m_window, DWMWA_BORDER_COLOR, &border, sizeof(border)),
                  "Apply window border color",
                  &m_logger);
}

void WebWindow::resizeWebView() const
{
    if (m_controller)
    {
        RECT bounds{};
        GetClientRect(m_window, &bounds);
        reportHresult(m_controller->put_Bounds(bounds), "Resize WebView", &m_logger);
    }
}

int WebWindow::frameInset() const
{
    const auto dpi = GetDpiForWindow(m_window);
    return GetSystemMetricsForDpi(SM_CXSIZEFRAME, dpi) + GetSystemMetricsForDpi(SM_CXPADDEDBORDER, dpi);
}

LRESULT WebWindow::processMessage(const UINT message, const WPARAM wparam, const LPARAM lparam)
{
    switch (message)
    {
    case WM_NCCALCSIZE:
    {
        auto& client =
            wparam ? reinterpret_cast<NCCALCSIZE_PARAMS*>(lparam)->rgrc[0] : *reinterpret_cast<RECT*>(lparam);
        const auto inset = frameInset();
        client.left += inset;
        client.right -= inset;
        client.bottom -= inset;
        if (IsZoomed(m_window))
        {
            MONITORINFO info{.cbSize = sizeof(info)};
            GetMonitorInfoW(MonitorFromWindow(m_window, MONITOR_DEFAULTTONEAREST), &info);
            client = info.rcWork;
        }

        return 0;
    }
    case WM_NCACTIVATE:
        return DefWindowProcW(m_window, message, wparam, -1);
    case WM_NCPAINT:
    {
        // Clear only the backing frame; DWM still paints its shadow and border.
        if (const auto dc = GetWindowDC(m_window))
        {
            RECT bounds{};
            GetWindowRect(m_window, &bounds);
            OffsetRect(&bounds, -bounds.left, -bounds.top);
            RECT client{};
            GetClientRect(m_window, &client);
            POINT origin{};
            ClientToScreen(m_window, &origin);
            RECT outer{};
            GetWindowRect(m_window, &outer);
            OffsetRect(&client, origin.x - outer.left, origin.y - outer.top);
            ExcludeClipRect(dc, client.left, client.top, client.right, client.bottom);
            FillRect(dc, &bounds, static_cast<HBRUSH>(GetStockObject(BLACK_BRUSH)));
            ReleaseDC(m_window, dc);
        }
        break;
    }
    case WM_ACTIVATE:
    {
        const bool active = LOWORD(wparam) != WA_INACTIVE;
        // Keep this initializer separate so the condition stays readable.
        // ReSharper disable once CppTooWideScopeInitStatement
        const auto other = reinterpret_cast<HWND>(lparam);
        if (!active && other && GetAncestor(other, GA_ROOT) == m_window)
        {
            break;
        }

        m_active = active;
        refreshTheme();
        if (active)
        {
            emit<ipc::WindowIsFocused>();
        }
        else
        {
            emit<ipc::WindowIsBlurred>();
        }
        if (!active && m_options.trayWindow && !m_pinned)
        {
            hide();
        }
        break;
    }
    case WM_SIZE:
        resizeWebView();
        if (wparam == SIZE_MINIMIZED)
        {
            emit<ipc::WindowIsMinimized>();
        }
        else if (m_maximized != (wparam == SIZE_MAXIMIZED))
        {
            m_maximized = wparam == SIZE_MAXIMIZED;
            if (m_maximized)
            {
                emit<ipc::WindowIsMaximized>();
            }
            else
            {
                emit<ipc::WindowIsUnmaximized>();
            }
        }
        return 0;
    case WM_DPICHANGED:
    {
        const auto bounds = reinterpret_cast<RECT*>(lparam);
        SetWindowPos(m_window,
                     nullptr,
                     bounds->left,
                     bounds->top,
                     bounds->right - bounds->left,
                     bounds->bottom - bounds->top,
                     SWP_NOZORDER | SWP_NOACTIVATE);
        resizeWebView();
        return 0;
    }
    case WM_GETMINMAXINFO:
    {
        auto* bounds = reinterpret_cast<MINMAXINFO*>(lparam);
        const auto dpi = GetDpiForWindow(m_window);
        bounds->ptMinTrackSize = {.x = MulDiv(m_options.minWidth, dpi, 96) + frameInset() * 2,
                                  .y = MulDiv(m_options.minHeight, dpi, 96) + frameInset()};
        return 0;
    }
    case WM_NCHITTEST:
    {
        if (m_options.resizable && !IsZoomed(m_window))
        {
            RECT bounds{};
            GetWindowRect(m_window, &bounds);
            const int x = GET_X_LPARAM(lparam);
            const int y = GET_Y_LPARAM(lparam);
            const auto inset = frameInset();
            const bool left = x < bounds.left + inset;
            const bool right = x >= bounds.right - inset;
            const bool top = y < bounds.top + std::max(3, MulDiv(4, GetDpiForWindow(m_window), 96));
            const bool bottom = y >= bounds.bottom - inset;
            if (top)
            {
                return left ? HTTOPLEFT : right ? HTTOPRIGHT : HTTOP;
            }

            if (bottom)
            {
                return left ? HTBOTTOMLEFT : right ? HTBOTTOMRIGHT : HTBOTTOM;
            }

            if (left || right)
            {
                return left ? HTLEFT : HTRIGHT;
            }
        }

        return HTCLIENT;
    }
    case WM_SETTINGCHANGE:
    case WM_THEMECHANGED:
    case WM_DWMCOLORIZATIONCOLORCHANGED:
        refreshTheme();
        emit<ipc::ThemingAccentColorChanged>({.accentColor = accentColor()});
        break;
    case WM_MOVE:
        if (m_controller)
        {
            reportHresult(m_controller->NotifyParentWindowPositionChanged(), "Update WebView position", &m_logger);
        }
        break;
    case WM_WINDOWPOSCHANGED:
        if (m_options.trayWindow && m_taskbar && (reinterpret_cast<WINDOWPOS*>(lparam)->flags & SWP_SHOWWINDOW) != 0)
        {
            reportHresult(m_taskbar->DeleteTab(m_window), "Hide tray window from taskbar", &m_logger);
        }
        break;
    case WM_CLOSE:
        hide();
        m_onClose(m_options.name);
        return 0;
    case WM_ERASEBKGND:
    {
        // Zero-alpha black lets the extended DWM backdrop show through the WebView.
        RECT client{};
        GetClientRect(m_window, &client);
        FillRect(reinterpret_cast<HDC>(wparam), &client, static_cast<HBRUSH>(GetStockObject(BLACK_BRUSH)));
        return 1;
    }
    default:
        break;
    }

    return DefWindowProcW(m_window, message, wparam, lparam);
}

LRESULT CALLBACK WebWindow::windowProcedure(HWND const window,
                                            const UINT message,
                                            const WPARAM wparam,
                                            const LPARAM lparam)
{
    auto* self = reinterpret_cast<WebWindow*>(GetWindowLongPtrW(window, GWLP_USERDATA));
    if (message == WM_NCCREATE)
    {
        self = static_cast<WebWindow*>(reinterpret_cast<CREATESTRUCTW*>(lparam)->lpCreateParams);
        self->m_window = window;
        SetWindowLongPtrW(window, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(self));
    }

    if (self)
    {
        try
        {
            return self->processMessage(message, wparam, lparam);
        }
        catch (const std::exception& error)
        {
            self->m_logger.write(std::string("Window message failed: ") + error.what());
        }
    }

    return DefWindowProcW(window, message, wparam, lparam);
}

void WebWindow::close()
{
    if (m_controller)
    {
        reportHresult(m_controller->Close(), "Close WebView", &m_logger);
        m_controller.Reset();
        m_webview.Reset();
    }

    if (m_window)
    {
        SetWindowLongPtrW(m_window, GWLP_USERDATA, 0);
        DestroyWindow(m_window);
        m_window = nullptr;
    }
}
