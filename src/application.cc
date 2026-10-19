#include "application.h"
#include "platform/desktop.h"
#include "platform/native_theme.h"
#include "metadata.h"
#include <future>

namespace
{
    constexpr UINT DispatchWorkMessage = WM_APP + 1;
    constexpr UINT TrayMessage = WM_APP + 2;
    constexpr UINT_PTR UpdateTimer = 1;
#ifdef YAY_DEBUG_BUILD
    constexpr UINT_PTR SmokeTimer = 2;
#endif
    constexpr wchar_t HostClass[] = L"yay.WebView2.Host";
} // namespace

Application::Application(const AppPaths& paths,
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
                         Logger& logger) : m_paths(paths),
      m_options(options),
      m_dispatcher(dispatcher),
      m_events(events),
      m_workers(workers),
      m_settings(settings),
      m_downloads(downloads),
      m_setup(setup),
      m_twitter(twitter),
      m_updates(updates),
      m_windows(windows),
      m_router(router),
      m_logger(logger) {}

Application::~Application()
{
    m_shutdown.request_stop();
    m_updates.cancel();
    m_downloads.stop();
    m_workers.stop();
    m_dispatcher.stop();
    m_windows.clear();
    if (m_trayCreated)
    {
        Shell_NotifyIconW(NIM_DELETE, &m_tray);
    }

    if (m_trayIcon)
    {
        DestroyIcon(m_trayIcon);
    }

    if (m_downloadingIcon)
    {
        DestroyIcon(m_downloadingIcon);
    }

    if (m_host)
    {
        UnregisterHotKey(m_host, 1);
        DestroyWindow(m_host);
    }
}

int Application::run()
{
    WNDCLASSEXW hostClass{.cbSize = sizeof(hostClass)};
    hostClass.hInstance = GetModuleHandleW(nullptr);
    hostClass.lpfnWndProc = hostProcedure;
    hostClass.lpszClassName = HostClass;
    RegisterClassExW(&hostClass);

    m_host = CreateWindowExW(0,
                             HostClass,
                             wide(pathUtf8(m_paths.data)).c_str(),
                             WS_OVERLAPPED,
                             0,
                             0,
                             0,
                             0,
                             nullptr,
                             nullptr,
                             hostClass.hInstance,
                             this);
    checkWin(m_host != nullptr, "Create application dispatcher");
    refreshNativeMenuTheme(m_host);

    m_dispatcher.setWake([this]{ PostMessageW(m_host, DispatchWorkMessage, 0, 0); });

    m_events.subscribe(
        [this](const ipc::EventChannel channel, const Json& payload)
        {
            onEvent(channel, payload);
        });

    registerIpc();

    m_router.verifyCoverage();
    m_logger.write(std::string("Starting yay ") + AppVersion + " with WebView2");

    if (!m_paths.isolated)
    {
        registerProtocol(m_paths);
        try
        {
            registerNotificationShortcut(m_paths);
        }
        catch (const std::exception& error)
        {
            m_logger.write(std::string("Could not register notifications: ") + error.what());
        }

        m_settings.set(ipc::SettingsKey::AutoStart, autoStartEnabled());
    }

    m_windows.initialize(
        [this]
        {
            if (!m_settings.get(ipc::SettingsKey::HideSetupWindow, false).get<bool>() || m_options.updateBinaries)
            {
                m_windows.show("setup");
            }

#ifdef YAY_DEBUG_BUILD
            if (!m_options.smokeReport.empty())
            {
                m_windows.create({"updater", 800, 500, 640, 400, true, false});
                SetTimer(m_host, SmokeTimer, 30000, nullptr);
            }
#endif
        },
        [this](const std::string& name)
        {
            onWindowClosed(name);
        });

    MSG message{};
    while (GetMessageW(&message, nullptr, 0, 0) > 0)
    {
        TranslateMessage(&message);
        DispatchMessageW(&message);
    }

    return static_cast<int>(message.wParam);
}

void Application::rendererReady(const std::string& name)
{
    const auto window = m_windows.get(name);
    if (window)
    {
        window->markReady();
    }

    if (name == "main")
    {
        if (const auto active = m_downloads.active())
        {
            window->emit<ipc::YtDlpDownloadStarted>(*active);
        }

        if (const auto release = m_updates.latest(); !release.is_null())
        {
            window->forwardEvent(ipc::EventChannel::UpdaterOutdated, {{"latestRelease", release}});
        }
    }

    if (m_setupStarted || !m_windows.get("main")->ready() || !m_windows.get("setup")->ready())
    {
        return;
    }

    m_setupStarted = true;
#ifdef YAY_DEBUG_BUILD
    if (m_options.skipSetup || !m_options.smokeReport.empty())
    {
        setupFinished(true);
        return;
    }
#endif

    m_workers.submit(
        [this]
        {
            const auto success = m_setup.run(
                m_shutdown.get_token(),
                [this](const Json& options)
                {
                    return promptFromWorker(options);
                },
                m_options.updateBinaries);
            
            m_dispatcher.post([this, success]{ setupFinished(success); });
        });
}

void Application::setupFinished(const bool success)
{
    if (!success)
    {
        requestQuit();
        return;
    }

    m_ready = true;
    m_windows.get("setup")->hide();

    createTray();
    updateHotkey();

    m_workers.submit([this]{ m_downloads.pruneThumbnailCache(); });

    if (m_options.show)
    {
        m_windows.showMain(m_host);
    }

    handleArguments(m_options.arguments);
    handleArguments(m_pendingLinks);

    m_pendingLinks.clear();
#ifdef YAY_DEBUG_BUILD
    if (!m_options.smokeReport.empty())
    {
        return;
    }
#endif

    m_workers.submit([this]{ m_updates.check(false, m_shutdown.get_token()); });

    SetTimer(m_host, UpdateTimer, 6 * 60 * 60 * 1000, nullptr);
}

void Application::requestQuit(const bool relaunch)
{
    if (!m_quitting)
    {
        m_quitting = true;
        m_relaunch = relaunch;
        m_shutdown.request_stop();
        m_updates.cancel();
        m_downloads.cancel();
        PostQuitMessage(0);
    }
}

void Application::onWindowClosed(const std::string& name)
{
    if (name == "fatal" || (name == "setup" && !m_ready))
    {
        requestQuit();
    }

    m_windows.broadcast<ipc::WindowIsClosed>({.windowName = name});
    if (name == "updater")
    {
        // Defer destruction until the window or IPC callback has returned.
        m_dispatcher.post([this]{ m_windows.remove("updater"); });
    }
}

Json Application::promptFromWorker(const Json& options) const
{
    auto promise = std::make_shared<std::promise<Json>>();
    auto future = promise->get_future();
    m_dispatcher.post(
        [this, promise, options]
        {
            if (m_quitting)
            {
                promise->set_value({{"response", 1}, {"checkboxChecked", false}});
                return;
            }

            try
            {
                m_windows.show("setup");
                const auto result = showMessageBox(m_windows.get("setup")->handle(), options);
                promise->set_value(result);
            }
            catch (...)
            {
                promise->set_exception(std::current_exception());
            }
        });

    while (future.wait_for(std::chrono::milliseconds(50)) != std::future_status::ready)
    {
        if (m_shutdown.stop_requested())
        {
            return {{"response", 1}, {"checkboxChecked", false}};
        }
    }

    return future.get();
}

void Application::updateHotkey() const
{
    UnregisterHotKey(m_host, 1);
    if (m_ready && m_settings.get(ipc::SettingsKey::EnableGlobalMenu, false).get<bool>())
    {
        if (!RegisterHotKey(m_host, 1, MOD_WIN | MOD_NOREPEAT, 'Y'))
        {
            m_logger.write("Win+Y could not be registered. Another application may be using it.");
        }
    }
}

void Application::handleArguments(const std::vector<std::string>& arguments)
{
    if (!m_ready)
    {
        m_pendingLinks.insert(m_pendingLinks.end(), arguments.begin(), arguments.end());
        return;
    }

    for (const auto& argument : arguments)
    {
        if (!argument.starts_with(AppUrlPrefix))
        {
            continue;
        }

        constexpr auto prefixLength = std::string_view(AppUrlPrefix).size();
        // Keep this initializer separate so the condition stays readable.
        // ReSharper disable once CppTooWideScopeInitStatement
        const auto host = argument.substr(prefixLength, argument.find_first_of("/?#", prefixLength) - prefixLength);
        if (host == "open-updater")
        {
            if (!m_updates.latest().is_null())
            {
                m_windows.show("updater");
            }
            else
            {
                m_workers.submit(
                    [this]
                    {
                        m_updates.check(false, m_shutdown.get_token());
                        m_dispatcher.post(
                            [this]
                            {
                                if (!m_updates.latest().is_null())
                                {
                                    m_windows.show("updater");
                                }
                            });
                    });
            }
        }
        else if (host == "download-video" || host == "download-audio")
        {
            if (const auto query = urlQuery(argument); query.contains("url") && validMediaUrl(query.at("url")))
            {
                m_downloads.enqueue(query.at("url"), host == "download-audio");
            }
        }
    }
}

LRESULT Application::processMessage(const UINT message, const WPARAM wparam, const LPARAM lparam)
{
    if (message == RegisterWindowMessageW(L"TaskbarCreated"))
    {
        m_trayCreated = false;
        if (m_ready)
        {
            createTray();
        }

        return 0;
    }

    switch (message)
    {
    case WM_SETTINGCHANGE:
    case WM_THEMECHANGED:
        refreshNativeMenuTheme(m_host);
        break;
    case DispatchWorkMessage:
        m_dispatcher.drain();
        return 0;
    case TrayMessage:
        if (LOWORD(lparam) == NIN_SELECT || LOWORD(lparam) == NIN_KEYSELECT)
        {
            m_windows.showMain(m_host);
        }
        else if (LOWORD(lparam) == WM_CONTEXTMENU)
        {
            showTrayMenu();
        }
        return 0;
    case WM_HOTKEY:
        m_windows.toggleGlobalMenu();
        return 0;
    case WM_COPYDATA:
    {
        // Keep this initializer separate so the condition stays readable.
        // ReSharper disable once CppTooWideScopeInitStatement
        const auto* data = reinterpret_cast<COPYDATASTRUCT*>(lparam);
        if (data && data->dwData == 1 && data->cbData > 0 && data->cbData <= 65536)
        {
            const auto args = Json::parse(std::string(static_cast<const char*>(data->lpData), data->cbData - 1))
                                  .get<std::vector<std::string>>();
            handleArguments(args);
            if (m_ready && std::ranges::none_of(args,
                                                [](const auto& argument)
                                                {
                                                    return argument.starts_with(AppUrlPrefix);
                                                }))
            {
                m_windows.showMain(m_host);
            }
        }

        return TRUE;
    }
    case WM_TIMER:
        if (wparam == UpdateTimer)
        {
            m_workers.submit([this]{ m_updates.check(false, m_shutdown.get_token()); });
        }
#ifdef YAY_DEBUG_BUILD
        else if (wparam == SmokeTimer)
        {
            m_smokeResults["timeout"] = true;
            writeAtomic(m_options.smokeReport, m_smokeResults.dump(2));
            requestQuit();
        }
#endif

        return 0;
    case WM_QUERYENDSESSION:
        return TRUE;
    case WM_ENDSESSION:
        if (wparam)
        {
            requestQuit();
        }
        return 0;
    case WM_CLOSE:
        requestQuit();
        return 0;
    default:
        break;
    }

    return DefWindowProcW(m_host, message, wparam, lparam);
}

LRESULT CALLBACK Application::hostProcedure(HWND const window,
                                            const UINT message,
                                            const WPARAM wparam,
                                            const LPARAM lparam)
{
    auto* self = reinterpret_cast<Application*>(GetWindowLongPtrW(window, GWLP_USERDATA));
    if (message == WM_NCCREATE)
    {
        self = static_cast<Application*>(reinterpret_cast<CREATESTRUCTW*>(lparam)->lpCreateParams);
        self->m_host = window;
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
            self->m_logger.write(std::string("Application message failed: ") + error.what());
        }
    }

    return DefWindowProcW(window, message, wparam, lparam);
}

#ifdef YAY_DEBUG_BUILD
Json Application::previewRelease() const
{
    return {{"tag_name", "1.42.2"},
            {"draft", false},
            {"prerelease", false},
            {"body", "- Example release for the native UI test.\n- [Repository](https://github.com/depthbomb/yay)"},
            {"assets", Json::array()}};
}

void Application::recordDiagnostics(const std::string& name, const Json& data)
{
    if (m_options.smokeReport.empty())
    {
        throw std::runtime_error("Diagnostics are only enabled for an isolated smoke test.");
    }

    m_smokeResults[name] = data;
    const auto window = m_windows.get(name);
    window->show();
    const auto screenshot = m_options.smokeReport.parent_path() / (name + ".png");
    window->capture(screenshot,
                    [this, name](const bool success)
                    {
                        m_smokeResults[name]["captured"] = success;
                        if (++m_smokeCaptures == 5)
                        {
                            writeAtomic(m_options.smokeReport, m_smokeResults.dump(2));
                            KillTimer(m_host, SmokeTimer);
                            requestQuit();
                        }
                    });
}
#endif

bool Application::relaunchRequested() const
{
    return m_relaunch;
}

std::vector<std::string> Application::relaunchArguments() const
{
    std::vector<std::string> arguments;
    if (m_paths.isolated)
    {
        arguments.insert(arguments.end(), {"--data-dir", pathUtf8(m_paths.data)});
    }

    if (m_restartSetup)
    {
        arguments.push_back("--updateBinaries");
    }

    return arguments;
}
