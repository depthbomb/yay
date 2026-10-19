#include "ipc/service_handlers.h"
#include "core/ipc_router.h"
#include "services/settings_service.h"

void registerSettingsHandlers(IpcRouter& router, SettingsService& settings)
{
    router.bind<ipc::SettingsGet>(
        [&settings](const auto& request, const RequestContext&)
        {
            return ipcOk(settings.get(request.key, request.defaultValue.value_or(Json(nullptr))));
        });
    router.bind<ipc::SettingsGetAll>(
        [&settings](const auto&, const RequestContext&)
        {
            return ipcOk(settings.all());
        });
    router.bind<ipc::SettingsSet>(
        [&settings](const auto& request, const RequestContext&)
        {
            settings.set(request.key, request.value);
            return ipcOk();
        });
    router.bind<ipc::FeatureFlagGetFeatureFlags>(
        [&settings](const auto&, const RequestContext&)
        {
            return ipcOk(settings.flags());
        });
}
