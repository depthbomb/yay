#include "ipc/application_handlers.h"
#include "core/ipc_router.h"

void registerApplicationHandlers(IpcRouter& router, ApplicationActions actions)
{
    router.bind<ipc::NativeBootstrap>(
        [action = std::move(actions.bootstrap)](const auto&, const RequestContext&)
        {
            return ipcOk(action());
        });

    router.bind<ipc::NativeReady>(
        [action = std::move(actions.rendererReady)](const auto&, const RequestContext& context)
        {
            action(context.windowName);
            return ipcOk();
        });

#ifdef YAY_DEBUG_BUILD
    router.bind<ipc::NativeDiagnostics>(
        [action = std::move(actions.recordDiagnostics)](const auto& request, const RequestContext& context)
        {
            action(context.windowName, request.data);
            return ipcOk();
        });
#endif

    router.bind<ipc::SettingsReset>(
        [action = std::move(actions.resetSettings)](const auto&, const RequestContext&)
        {
            action();
            return ipcOk();
        });

    router.bind<ipc::YtDlpRecheckBinaries>(
        [action = std::move(actions.recheckBinaries)](const auto&, const RequestContext&)
        {
            action();
            return ipcOk();
        });

    router.bind<ipc::SetupCancel>(
        [action = std::move(actions.cancelSetup)](const auto&, const RequestContext&)
        {
            action();
            return ipcOk();
        });

    router.bind<ipc::UpdaterGetLatestRelease>(
        [action = std::move(actions.latestRelease)](const auto&, const RequestContext&)
        {
            return ipcOk(action());
        });

    router.bind<ipc::UpdaterShowWindow>(
        [action = std::move(actions.showUpdater)](const auto& request, const RequestContext&)
        {
#ifdef YAY_DEBUG_BUILD
            action(request.preview.value_or(false));
#else
            (void)request;
            action(false);
#endif
            return ipcOk();
        });

    router.bindBackground<ipc::UpdaterUpdate>(
        [action = std::move(actions.installUpdate)](const auto&, const RequestContext&)
        {
            return action();
        });
}
