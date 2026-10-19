#include "ipc/service_handlers.h"
#include "core/ipc_router.h"
#include "services/update_service.h"

void registerUpdateHandlers(IpcRouter& router, UpdateService& updates, const std::stop_token& stop)
{
    router.bindBackground<ipc::UpdaterCheckManual>(
        [&updates, stop](const auto&, const RequestContext&)
        {
            return updates.check(true, stop);
        });
    router.bind<ipc::UpdaterGetNextManualCheck>(
        [&updates](const auto&, const RequestContext&)
        {
            return ipcOk(updates.nextManualCheck());
        });
    router.bindBackground<ipc::UpdaterGetCommitsSinceBuild>(
        [&updates, stop](const auto&, const RequestContext&)
        {
            return ipcOk(updates.commits(stop));
        });
    router.bind<ipc::UpdaterCancelUpdate>(
        [&updates](const auto&, const RequestContext&)
        {
            updates.cancel();
            return ipcOk();
        });
}
