#include "ipc/desktop_handlers.h"
#include "core/ipc_router.h"
#include "platform/desktop.h"
#include "services/download_service.h"
#include "ui/window_manager.h"

void registerWindowHandlers(
    IpcRouter& router,
    WindowManager& windows,
    SettingsService& settings,
    DownloadService& downloads,
    std::function<void(const std::string&)> onClosed
)
{
    router.bind<ipc::WindowMinimize>(
        [&windows](const auto& request, const RequestContext&)
        {
            if (const auto window = windows.get(request.window))
            {
                window->minimize();
            }

            return ipcOk();
        });

    router.bind<ipc::WindowMaximize>(
        [&windows](const auto& request, const RequestContext&)
        {
            if (const auto window = windows.get(request.window))
            {
                window->maximize();
            }

            return ipcOk();
        });

    router.bind<ipc::WindowUnmaximize>(
        [&windows](const auto& request, const RequestContext&)
        {
            if (const auto window = windows.get(request.window))
            {
                window->maximize(true);
            }

            return ipcOk();
        });

    router.bind<ipc::WindowClose>(
        [&windows, onClosed = std::move(onClosed)](const auto& request, const RequestContext&)
        {
            if (const auto window = windows.get(request.window))
            {
                window->hide();
                onClosed(request.window);
            }

            return ipcOk();
        });

    router.bind<ipc::MainWindowTogglePinned>(
        [&windows](const auto&, const RequestContext&)
        {
            return ipcOk(windows.get("main")->togglePinned());
        });

    router.bind<ipc::SetupShowWindow>(
        [&windows](const auto&, const RequestContext&)
        {
            windows.show("setup");
            return ipcOk();
        });

    router.bind<ipc::SettingsShowUi>(
        [&windows](const auto&, const RequestContext&)
        {
            windows.show("settings");
            return ipcOk();
        });

    router.bind<ipc::GlobalMenuDownloadFromClipboard>(
        [&windows, &downloads](const auto& request, const RequestContext& context)
        {
            windows.get("global-menu")->hide();
            if (const auto text = readClipboard(context.window); !downloads.busy() && validMediaUrl(text))
            {
                downloads.enqueue(text, request.audio);
            }

            return ipcOk();
        });

    router.bind<ipc::GlobalMenuOpenDownloadDir>(
        [&settings](const auto&, const RequestContext&)
        {
            openPath(pathFromUtf8(settings.get(ipc::SettingsKey::DownloadDir).get<std::string>()));
            return ipcOk();
        });
}
