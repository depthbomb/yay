#include "application.h"
#include "platform/desktop.h"
#include "metadata.h"

void Application::onEvent(const ipc::EventChannel channel, const Json& payload)
{
    if (m_quitting)
    {
        return;
    }

    if (ipc::isRendererEvent(channel))
    {
        m_windows.forwardEvent(channel, payload);
    }

    if (channel == ipc::EventChannel::SettingsChanged && payload.at("key") == ipc::SettingsKey::EnableGlobalMenu)
    {
        updateHotkey();
    }
    else if (channel == ipc::EventChannel::SettingsChanged && payload.at("key") == ipc::SettingsKey::AutoStart)
    {
        setAutoStart(m_paths, payload.at("value").get<bool>());
    }
    else if (channel == ipc::EventChannel::SettingsImported)
    {
        updateHotkey();
        setAutoStart(m_paths, m_settings.get(ipc::SettingsKey::AutoStart, false).get<bool>());
        m_windows.reloadAll();
    }
    else if (channel == ipc::EventChannel::YtDlpDownloadStarted)
    {
        updateTray(true, payload.at("url").get<std::string>());
        m_windows.progress("main", 0, true);
    }
    else if (channel == ipc::EventChannel::YtDlpDownloadProgress)
    {
        m_windows.progress("main", payload.at("progress").get<double>());
    }
    else if (channel == ipc::EventChannel::YtDlpDownloadFinished)
    {
        updateTray(false);

        m_windows.progress("main", -1);

        const auto main = m_windows.get("main");
        FLASHWINFO flash{.cbSize = sizeof(flash),
                         .hwnd = main->handle(),
                         .dwFlags = FLASHW_TRAY | FLASHW_TIMERNOFG,
                         .uCount = 3,
                         .dwTimeout = 0};
        FlashWindowEx(&flash);

        if (
            payload.value("success", false) &&
            payload.contains("youtubeId") &&
            !main->active() &&
            m_settings.get(ipc::SettingsKey::EnableDownloadCompletionToast, true).get<bool>()
        )
        {
            auto image = m_paths.data / "thumbnail_cache" / (payload.at("youtubeId").get<std::string>() + ".jpg");
            if (!std::filesystem::exists(image))
            {
                image = m_paths.directory / "assets/notifications/logo.png";
            }

            try
            {
                showToast(AppDescription,
                          "Operation Finished!",
                          image,
                          "Open Folder",
                          "file:///" + m_settings.get(ipc::SettingsKey::DownloadDir).get<std::string>());
            }
            catch (const std::exception& error)
            {
                m_logger.write(std::string("Could not show notification: ") + error.what());
            }
        }
    }
    else if (channel == ipc::EventChannel::SetupStep)
    {
        const auto progress = payload.at("progress").get<double>();
        m_windows.progress("setup", progress, progress < 0);
    }
    else if (channel == ipc::EventChannel::SetupDone)
    {
        m_windows.progress("setup", -1);
    }
    else if (channel == ipc::EventChannel::NativeShowSetup)
    {
        m_windows.show("setup");
    }
    else if (channel == ipc::EventChannel::NativeShowUpdater)
    {
        m_windows.show("updater");
    }
    else if (channel == ipc::EventChannel::NativeOpenExternal)
    {
        openExternal(payload.at("url").get<std::string>());
    }
    else if (channel == ipc::EventChannel::NativeMessage)
    {
        showMessageBox(m_windows.get("settings")->handle(), payload);
    }
    else if (channel == ipc::EventChannel::NativeUpdateNotification)
    {
        try
        {
            showToast("Version " + payload.at("version").get<std::string>() + " is available!",
                      "",
                      {},
                      "",
                      std::string(AppUrlPrefix) + "open-updater");
        }
        catch (const std::exception& error)
        {
            m_logger.write(error.what());
        }
    }
    else if (channel == ipc::EventChannel::NativeQuit)
    {
        requestQuit();
    }
}
