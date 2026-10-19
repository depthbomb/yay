#include "ui/web_window.h"
#include "ui/embedded_web_assets.h"
#include "platform/desktop.h"
#include "platform/http_client.h"

namespace
{
    constexpr wchar_t RendererUrl[] = L"https://yay.local/renderer.html";

    bool internalUrl(const std::wstring& url)
    {
        const std::wstring expected = RendererUrl;
        return url == expected || url.starts_with(expected + L"#");
    }
} // namespace

void WebWindow::configureWebView(ICoreWebView2Environment* environment)
{
    Microsoft::WRL::ComPtr<ICoreWebView2Controller2> controller2;
    if (SUCCEEDED(m_controller.As(&controller2)))
    {
        reportHresult(controller2->put_DefaultBackgroundColor(
                          isWindows11() ? COREWEBVIEW2_COLOR{.A = 0, .R = 0, .G = 0, .B = 0}
                                        : COREWEBVIEW2_COLOR{.A = 255, .R = 25, .G = 25, .B = 25}),
                      "Set WebView background",
                      &m_logger);
    }

    installEmbeddedWebAssets(m_webview.Get(), environment);

    Microsoft::WRL::ComPtr<ICoreWebView2Settings> settings;
    checkHresult(m_webview->get_Settings(&settings), "Get WebView settings");
    checkHresult(settings->put_IsStatusBarEnabled(FALSE), "Disable WebView status bar");
    checkHresult(settings->put_IsZoomControlEnabled(FALSE), "Disable WebView zoom controls");
    checkHresult(settings->put_AreDefaultScriptDialogsEnabled(FALSE), "Disable default script dialogs");
    checkHresult(settings->put_IsWebMessageEnabled(TRUE), "Enable WebView messages");
    checkHresult(settings->put_AreHostObjectsAllowed(FALSE), "Disable WebView host objects");
    Microsoft::WRL::ComPtr<ICoreWebView2Settings3> settings3;
    if (SUCCEEDED(settings.As(&settings3)))
    {
        reportHresult(
            settings3->put_AreBrowserAcceleratorKeysEnabled(FALSE), "Disable WebView browser shortcuts", &m_logger);
    }
#ifndef YAY_DEBUG_BUILD
    checkHresult(settings->put_AreDevToolsEnabled(FALSE), "Disable developer tools");
#else
    checkHresult(settings->put_AreDevToolsEnabled(TRUE), "Enable developer tools");
#endif
    Microsoft::WRL::ComPtr<ICoreWebView2Settings9> settings9;
    if (SUCCEEDED(settings.As(&settings9)))
    {
        reportHresult(
            settings9->put_IsNonClientRegionSupportEnabled(TRUE), "Enable WebView window dragging", &m_logger);
    }

    Microsoft::WRL::ComPtr<ICoreWebView2Settings6> settings6;
    if (SUCCEEDED(settings.As(&settings6)))
    {
        reportHresult(settings6->put_IsSwipeNavigationEnabled(FALSE), "Disable WebView swipe navigation", &m_logger);
    }

    const auto weak = weak_from_this();
    EventRegistrationToken token{};
    checkHresult(
        m_webview->add_WebMessageReceived(
            Microsoft::WRL::Callback<ICoreWebView2WebMessageReceivedEventHandler>(
                [weak](ICoreWebView2*, ICoreWebView2WebMessageReceivedEventArgs* args) -> HRESULT
                {
                    const auto self = weak.lock();
                    if (!self)
                    {
                        return S_OK;
                    }

                    PWSTR source = nullptr;
                    if (!reportHresult(args->get_Source(&source), "Read WebView message origin", &self->m_logger))
                    {
                        return S_OK;
                    }
                    const bool trusted = source && internalUrl(source);
                    CoTaskMemFree(source);
                    if (!trusted)
                    {
                        return S_OK;
                    }

                    PWSTR raw = nullptr;
                    if (!reportHresult(args->get_WebMessageAsJson(&raw), "Read WebView message", &self->m_logger))
                    {
                        return S_OK;
                    }
                    const auto text = raw ? utf8(raw) : "";
                    CoTaskMemFree(raw);
                    if (text.size() > 1024 * 1024)
                    {
                        return S_OK;
                    }

                    try
                    {
                        self->m_onMessage(*self, Json::parse(text));
                    }
                    catch (const std::exception& error)
                    {
                        self->m_logger.write(std::string("Invalid UI message: ") + error.what());
                    }

                    return S_OK;
                })
                .Get(),
            &token),
        "Register WebView message handler");
    checkHresult(m_webview->add_NavigationStarting(
                     Microsoft::WRL::Callback<ICoreWebView2NavigationStartingEventHandler>(
                         [weak](ICoreWebView2*, ICoreWebView2NavigationStartingEventArgs* args) -> HRESULT
                         {
                             const auto self = weak.lock();
                             if (!self)
                             {
                                 return S_OK;
                             }
                             PWSTR uri = nullptr;
                             if (!reportHresult(args->get_Uri(&uri), "Read WebView navigation URL", &self->m_logger))
                             {
                                 return S_OK;
                             }
                             const std::wstring url = uri ? uri : L"";
                             CoTaskMemFree(uri);
                             if (!internalUrl(url))
                             {
                                 if (!reportHresult(
                                         args->put_Cancel(TRUE), "Cancel external WebView navigation", &self->m_logger))
                                 {
                                     return S_OK;
                                 }
                                 openExternal(utf8(url));
                             }

                             return S_OK;
                         })
                         .Get(),
                     &token),
                 "Register WebView navigation handler");
    checkHresult(
        m_webview->add_NewWindowRequested(
            Microsoft::WRL::Callback<ICoreWebView2NewWindowRequestedEventHandler>(
                [weak](ICoreWebView2*, ICoreWebView2NewWindowRequestedEventArgs* args) -> HRESULT
                {
                    const auto self = weak.lock();
                    if (!self)
                    {
                        return S_OK;
                    }
                    if (!reportHresult(args->put_Handled(TRUE), "Handle WebView new window request", &self->m_logger))
                    {
                        return S_OK;
                    }
                    PWSTR url = nullptr;
                    if (!reportHresult(args->get_Uri(&url), "Read WebView new window URL", &self->m_logger))
                    {
                        return S_OK;
                    }
                    if (url)
                    {
                        openExternal(utf8(url));
                        CoTaskMemFree(url);
                    }

                    return S_OK;
                })
                .Get(),
            &token),
        "Register WebView new window handler");
    checkHresult(m_webview->add_PermissionRequested(
                     Microsoft::WRL::Callback<ICoreWebView2PermissionRequestedEventHandler>(
                         [weak](ICoreWebView2*, ICoreWebView2PermissionRequestedEventArgs* args) -> HRESULT
                         {
                             const auto self = weak.lock();
                             if (!self)
                             {
                                 return S_OK;
                             }
                             if (!reportHresult(args->put_State(COREWEBVIEW2_PERMISSION_STATE_DENY),
                                                "Deny WebView permission",
                                                &self->m_logger))
                             {
                                 return S_OK;
                             }
                             return S_OK;
                         })
                         .Get(),
                     &token),
                 "Register WebView permission handler");
    checkHresult(
        m_webview->add_DocumentTitleChanged(Microsoft::WRL::Callback<ICoreWebView2DocumentTitleChangedEventHandler>(
                                                [weak](ICoreWebView2* webview, IUnknown*) -> HRESULT
                                                {
                                                    if (const auto self = weak.lock())
                                                    {
                                                        PWSTR title = nullptr;
                                                        if (reportHresult(webview->get_DocumentTitle(&title),
                                                                          "Read WebView document title",
                                                                          &self->m_logger))
                                                        {
                                                            SetWindowTextW(self->m_window, title);
                                                        }
                                                        CoTaskMemFree(title);
                                                    }

                                                    return S_OK;
                                                })
                                                .Get(),
                                            &token),
        "Register WebView title handler");
    checkHresult(m_webview->add_ProcessFailed(
                     Microsoft::WRL::Callback<ICoreWebView2ProcessFailedEventHandler>(
                         [weak](ICoreWebView2*, ICoreWebView2ProcessFailedEventArgs*) -> HRESULT
                         {
                             if (const auto self = weak.lock())
                             {
                                 self->m_logger.write("WebView2 renderer process failed in " + self->name());
                                 self->reload();
                             }

                             return S_OK;
                         })
                         .Get(),
                     &token),
                 "Register WebView process failure handler");

    Microsoft::WRL::ComPtr<ICoreWebView2_11> webview11;
    if (SUCCEEDED(m_webview.As(&webview11)))
    {
        checkHresult(
            webview11->add_ContextMenuRequested(
                Microsoft::WRL::Callback<ICoreWebView2ContextMenuRequestedEventHandler>(
                    [weak](ICoreWebView2*, ICoreWebView2ContextMenuRequestedEventArgs* args) -> HRESULT
                    {
                        const auto self = weak.lock();
                        if (!self)
                        {
                            return S_OK;
                        }
                        Microsoft::WRL::ComPtr<ICoreWebView2ContextMenuItemCollection> items;
                        if (!reportHresult(args->get_MenuItems(&items), "Read WebView context menu", &self->m_logger))
                        {
                            return S_OK;
                        }
                        UINT count = 0;
                        if (!reportHresult(
                                items->get_Count(&count), "Read WebView context menu count", &self->m_logger))
                        {
                            return S_OK;
                        }
                        for (int i = static_cast<int>(count) - 1; i >= 0; --i)
                        {
                            Microsoft::WRL::ComPtr<ICoreWebView2ContextMenuItem> item;
                            if (!reportHresult(items->GetValueAtIndex(i, &item),
                                               "Read WebView context menu item",
                                               &self->m_logger))
                            {
                                continue;
                            }
                            PWSTR raw = nullptr;
                            if (!reportHresult(
                                    item->get_Name(&raw), "Read WebView context menu item name", &self->m_logger))
                            {
                                continue;
                            }
                            const std::wstring name = raw ? raw : L"";
                            CoTaskMemFree(raw);
                            if (name != L"cut" && name != L"copy" && name != L"paste" && name != L"selectAll")
                            {
                                reportHresult(
                                    items->RemoveValueAtIndex(i), "Remove WebView context menu item", &self->m_logger);
                            }
                        }

                        return S_OK;
                    })
                    .Get(),
                &token),
            "Register WebView context menu handler");
    }

    resizeWebView();
    const auto route = m_options.name == "main" ? "" : m_options.name;
    checkHresult(m_webview->Navigate((std::wstring(RendererUrl) + L"#/" + wide(route)).c_str()),
                 "Load application renderer");
}
