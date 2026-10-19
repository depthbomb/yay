#include "ipc/desktop_handlers.h"
#include "core/ipc_router.h"
#include "platform/desktop.h"
#include "services/settings_service.h"

void registerDesktopSettingsHandlers(IpcRouter& router, const AppPaths& paths, SettingsService& settings)
{
    router.bind<ipc::SettingsImport>(
        [&settings](const auto&, const RequestContext& context)
        {
            const auto path = pickPath(context.window, L"Import settings", false, L"*.toml;*.json");
            if (!path)
            {
                return ipcOk(false);
            }

            settings.importFile(*path);
            return ipcOk(true);
        });

    router.bind<ipc::SettingsExport>(
        [&settings](const auto&, const RequestContext& context)
        {
            const auto path = pickPath(context.window, L"Export settings", true);
            if (!path)
            {
                return ipcOk(false);
            }

            settings.exportFile(*path);
            return ipcOk(true);
        });

    router.bind<ipc::AutostartEnable>(
        [&paths, &settings](const auto&, const RequestContext&)
        {
            setAutoStart(paths, true);
            settings.set(ipc::SettingsKey::AutoStart, true);
            return ipcOk(true);
        });

    router.bind<ipc::AutostartDisable>(
        [&paths, &settings](const auto&, const RequestContext&)
        {
            setAutoStart(paths, false);
            settings.set(ipc::SettingsKey::AutoStart, false);
            return ipcOk(false);
        });

    router.bind<ipc::AutostartToggle>(
        [&paths, &settings](const auto&, const RequestContext&)
        {
            const bool enabled = !settings.get(ipc::SettingsKey::AutoStart, false).get<bool>();
            setAutoStart(paths, enabled);
            settings.set(ipc::SettingsKey::AutoStart, enabled);
            return ipcOk(enabled);
        });
}
