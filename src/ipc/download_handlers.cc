#include "ipc/service_handlers.h"
#include "core/ipc_router.h"
#include "services/download_service.h"
#include "services/twitter_service.h"

void registerDownloadHandlers(IpcRouter& router,
                              DownloadService& downloads,
                              SettingsService& settings,
                              TwitterService& twitter,
                              const std::stop_token& stop)
{
    router.bind<ipc::YtDlpDownloadVideo>(
        [&downloads](const auto& request, const RequestContext&)
        {
            downloads.enqueue(request.url);
            return ipcOk();
        });
    router.bind<ipc::YtDlpDownloadAudio>(
        [&downloads](const auto& request, const RequestContext&)
        {
            downloads.enqueue(request.url, true);
            return ipcOk();
        });
    router.bind<ipc::YtDlpDownloadDefault>(
        [&settings, &downloads](const auto& request, const RequestContext&)
        {
            downloads.enqueue(request.url, settings.get(ipc::SettingsKey::DefaultDownloadAction, "video") == "audio");
            return ipcOk();
        });
    router.bind<ipc::YtDlpCancelDownload>(
        [&downloads](const auto&, const RequestContext&)
        {
            downloads.cancel();
            return ipcOk();
        });
    router.bind<ipc::YtDlpRemoveCookiesFile>(
        [&settings](const auto&, const RequestContext&)
        {
            const auto path = settings.get(ipc::SettingsKey::CookiesFilePath);
            settings.set(ipc::SettingsKey::CookiesFilePath, nullptr);
            if (path.is_string())
            {
                std::filesystem::remove(pathFromUtf8(path.get<std::string>()));
            }

            return ipcOk();
        });
    router.bindBackground<ipc::YtDlpUpdateBinary>(
        [&downloads, stop](const auto&, const RequestContext&)
        {
            return downloads.updateBinary(false, stop);
        });
    router.bindBackground<ipc::TwitterGetTweetMediaInfo>(
        [&twitter, stop](const auto& request, const RequestContext&)
        {
            return ipcOk(twitter.mediaInfo(request.url, stop));
        });
    router.bindBackground<ipc::TwitterDownloadMediaUrl>(
        [&twitter, stop](const auto& request, const RequestContext&)
        {
            twitter.download(request.url, stop);
            return ipcOk();
        });
    router.bindBackground<ipc::ThumbnailClearCache>(
        [&downloads](const auto&, const RequestContext&)
        {
            downloads.clearThumbnailCache();
            return ipcOk();
        });
}
