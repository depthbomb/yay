#include "ipc/desktop_handlers.h"
#include "core/ipc_router.h"
#include "platform/desktop.h"
#include "services/settings_service.h"

void registerSystemHandlers(IpcRouter& router, const AppPaths& paths, SettingsService& settings)
{
    router.bind<ipc::NativeClipboardRead>(
        [](const auto&, const RequestContext& context)
        {
            return ipcOk(readClipboard(context.window));
        });

    router.bind<ipc::NativeClipboardWrite>(
        [](const auto& request, const RequestContext& context)
        {
            writeClipboard(context.window, request.value);
            return ipcOk();
        });

    router.bind<ipc::MainShowMessageBox>(
        [](const auto& request, const RequestContext& context)
        {
            return ipcOk(showMessageBox(context.window, Json(request.options)));
        });

    router.bind<ipc::MainPickDownloadDir>(
        [&settings](const auto&, const RequestContext& context)
        {
            const auto path = pickPath(context.window,
                                       L"Choose a download folder",
                                       true,
                                       L"",
                                       pathFromUtf8(settings.get(ipc::SettingsKey::DownloadDir).get<std::string>()));
            if (!path)
            {
                return ipcOk(nullptr);
            }

            settings.set(ipc::SettingsKey::DownloadDir, pathUtf8(*path));
            return ipcOk(pathUtf8(*path));
        });

    router.bind<ipc::MainOpenDownloadDir>(
        [&settings](const auto&, const RequestContext&)
        {
            openPath(pathFromUtf8(settings.get(ipc::SettingsKey::DownloadDir).get<std::string>()));
            return ipcOk();
        });

    router.bind<ipc::MainPickCookiesFile>(
        [&paths, &settings](const auto&, const RequestContext& context)
        {
            const auto path = pickPath(context.window, L"Locate cookies.txt file", false, L"*.txt");
            if (!path)
            {
                return ipcOk(nullptr);
            }

            const auto destination = paths.binaries / "cookies.txt";
            if (*path != destination)
            {
                std::filesystem::copy_file(*path, destination, std::filesystem::copy_options::overwrite_existing);
            }

            settings.set(ipc::SettingsKey::CookiesFilePath, pathUtf8(destination));
            return ipcOk(pathUtf8(destination));
        });

    router.bind<ipc::MainOpenAppDir>(
        [&paths](const auto&, const RequestContext&)
        {
            openPath(paths.directory);
            return ipcOk();
        });

    router.bind<ipc::MainOpenAppData>(
        [&paths](const auto&, const RequestContext&)
        {
            openPath(paths.data);
            return ipcOk();
        });

    router.bind<ipc::MainOpenExternalUrl>(
        [](const auto& request, const RequestContext&)
        {
            openExternal(request.url);
            return ipcOk();
        });

    router.bind<ipc::ThemingGetAccentColor>(
        [](const auto&, const RequestContext&)
        {
            return ipcOk(accentColor());
        });

    router.bind<ipc::SystemGetInfo>(
        [](const auto&, const RequestContext&)
        {
            return ipcOk(systemInfo());
        });
}
