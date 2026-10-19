#include "application.h"
#include "ipc/application_handlers.h"
#include "ipc/desktop_handlers.h"
#include "ipc/service_handlers.h"
#include "platform/desktop.h"

void Application::registerIpc()
{
    const auto stop = m_shutdown.get_token();
    registerSystemHandlers(m_router, m_paths, m_settings);
    registerDesktopSettingsHandlers(m_router, m_paths, m_settings);
    registerSettingsHandlers(m_router, m_settings);
    registerDownloadHandlers(m_router, m_downloads, m_settings, m_twitter, stop);
    registerUpdateHandlers(m_router, m_updates, stop);
    registerWindowHandlers(m_router, m_windows, m_settings, m_downloads, [this](const std::string& name){ onWindowClosed(name); });

    ApplicationActions actions;
    actions.bootstrap = [this]
    {
        auto state = m_windows.bootstrapState();
#ifdef YAY_DEBUG_BUILD
        state["diagnostics"] = !m_options.smokeReport.empty();
        state["development"] = true;
#endif
        return state;
    };

    actions.rendererReady = [this](const std::string& name)
    {
        rendererReady(name);
    };

#ifdef YAY_DEBUG_BUILD
    actions.recordDiagnostics = [this](const std::string& name, const Json& data)
    {
        recordDiagnostics(name, data);
    };
#endif

    actions.resetSettings = [this]
    {
        m_settings.reset();
        setAutoStart(m_paths, false);
        requestQuit(true);
    };

    actions.recheckBinaries = [this]
    {
        m_setup.removeDownloadedBinaries();
        m_restartSetup = true;
        requestQuit(true);
    };

    actions.cancelSetup = [this]
    {
        m_events.emit<ipc::SetupStep>({.message = "Cancelling...", .progress = -1});
        requestQuit();
    };

    actions.latestRelease = [this]
    {
#ifdef YAY_DEBUG_BUILD
        if (!m_options.smokeReport.empty())
        {
            return previewRelease();
        }

        if (m_previewUpdater)
        {
            return m_updates.preview();
        }
#endif

        return m_updates.latest();
    };

    actions.showUpdater = [this]([[maybe_unused]] const bool preview)
    {
#ifdef YAY_DEBUG_BUILD
        m_previewUpdater = preview;
        if (m_previewUpdater && !m_updates.preview().is_null())
        {
            m_windows.show("updater");
            return;
        }
#endif
        if (!m_updates.latest().is_null())
        {
            m_windows.show("updater");
        }
    };

    actions.installUpdate = [this]
    {
#ifdef YAY_DEBUG_BUILD
        if (!m_options.smokeReport.empty())
        {
            return ipcError("Installer execution is disabled during smoke tests.");
        }
#endif

        return m_updates.install(m_shutdown.get_token());
    };

    registerApplicationHandlers(m_router, std::move(actions));
}
