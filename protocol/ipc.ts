import { request, s, type Protocol } from './schema';
import { models, model } from './models';

// Regenerate with bun scripts/generate_ipc.mjs after changing a contract.
export const protocol: Protocol = {
    version: 1,
    definitions: models,
    requests: {
        'main<-show-message-box': request({
            options: model.MessageBoxOptions,
        }, {
            returns: model.MessageBoxReturnValue,
        }),
        'main<-pick-download-dir': request({}, {
            returns: s.nullable(s.string),
        }),
        'main<-open-download-dir': request(),
        'main<-pick-cookies-file': request({}, {
            returns: s.nullable(s.string),
        }),
        'main<-open-app-dir': request(),
        'main<-open-app-data': request(),
        'main<-open-external-url': request({
            url: s.string,
        }),
        'window<-minimize': request({
            window: s.string,
        }),
        'window<-maximize': request({
            window: s.string,
        }),
        'window<-unmaximize': request({
            window: s.string,
        }),
        'window<-close': request({
            window: s.string,
        }),
        'setup<-show-window': request(),
        'setup<-cancel': request(),
        'main-window<-toggle-pinned': request({}, {
            returns: s.boolean,
        }),
        'settings<-set': request({
            key: model.SettingsKey,
            value: s.unknown,
        }, {
            error: true,
        }),
        'settings<-get': request({
            key: model.SettingsKey,
            defaultValue: s.optional(s.unknown),
        }, {
            returns: s.unknown,
        }),
        'settings<-reset': request(),
        'settings<-import': request({}, {
            returns: s.boolean,
            error: true,
        }),
        'settings<-export': request({}, {
            returns: s.boolean,
            error: true,
        }),
        'settings<-show-ui': request(),
        'settings<-get-all': request(),
        'yt-dlp<-download-video': request({
            url: s.string,
        }),
        'yt-dlp<-download-audio': request({
            url: s.string,
        }),
        'yt-dlp<-download-default': request({
            url: s.string,
        }),
        'yt-dlp<-remove-cookies-file': request(),
        'yt-dlp<-cancel-download': request(),
        'yt-dlp<-recheck-binaries': request(),
        'yt-dlp<-update-binary': request({}, {
            error: true,
        }),
        'twitter<-get-tweet-media-info': request({
            url: s.string,
        }, {
            returns: s.nullable(model.TweetMedia),
            error: true,
        }),
        'twitter<-download-media-url': request({
            url: s.string,
        }, {
            error: true,
        }),
        'autostart<-enable': request({}, {
            returns: s.boolean,
        }),
        'autostart<-disable': request({}, {
            returns: s.boolean,
        }),
        'autostart<-toggle': request({}, {
            returns: s.boolean,
        }),
        'global-menu<-download-from-clipboard': request({
            audio: s.boolean,
        }),
        'global-menu<-open-download-dir': request(),
        'updater<-check-manual': request({}, {
            returns: s.nullable(model.GitHubRelease),
            error: true,
        }),
        'updater<-get-next-manual-check': request({}, {
            returns: s.number,
        }),
        'updater<-get-latest-release': request({}, {
            returns: s.nullable(model.GitHubRelease),
        }),
        'updater<-get-commits-since-build': request({}, {
            returns: s.nullable(s.array(model.GitHubCommit)),
        }),
        'updater<-show-window': request({
            preview: s.debugOnly(s.optional(s.boolean)),
        }),
        'updater<-update': request({}, {
            error: true,
        }),
        'updater<-cancel-update': request(),
        'feature-flag<-get-feature-flags': request({}, {
            returns: s.array(model.FeatureFlag),
        }),
        'theming<-get-accent-color': request({}, {
            returns: s.string,
        }),
        'thumbnail<-clear-cache': request(),
        'system<-get-info': request({}, {
            returns: model.SystemInfo,
        }),
        'native<-clipboard-read': request({}, {
            returns: s.string,
        }),
        'native<-clipboard-write': request({
            value: s.string,
        }, {
            error: true,
        }),
        'native<-ready': request(),
        'native<-bootstrap': request({}, {
            returns: model.BootstrapState,
        }),
        'native<-diagnostics': request({
            data: s.record,
        }, {
            debugOnly: true,
        }),
    },
    internalEvents: {
        'native->show-setup': s.void,
        'native->show-updater': s.void,
        'native->open-external': s.object({
            url: s.string,
        }),
        'native->message': model.MessageBoxOptions,
        'native->update-notification': s.object({
            version: s.string,
        }),
        'native->quit': s.void,
    },
    events: {
        'main->heartbeat': s.number,
        'window->is-minimized': s.void,
        'window->is-maximized': s.void,
        'window->is-unmaximized': s.void,
        'window->is-blurred': s.void,
        'window->is-focused': s.void,
        'window->is-closed': s.object({
            windowName: s.string,
        }),
        'setup->step': s.object({
            message: s.string,
            progress: s.number,
        }),
        'setup->done': s.void,
        'settings->changed': s.object({
            key: model.SettingsKey,
            value: s.unknown,
        }),
        'settings->imported': s.void,
        'yt-dlp->download-queued': model.DownloadSession,
        'yt-dlp->download-started': model.DownloadSession,
        'yt-dlp->download-progress': s.object({
            id: s.string,
            progress: s.number,
        }),
        'yt-dlp->download-canceled': model.DownloadSession,
        'yt-dlp->download-finished': model.DownloadSession,
        'yt-dlp->stdout': s.object({
            lines: s.array(s.string),
        }),
        'yt-dlp->updating-binary': s.void,
        'yt-dlp->updated-binary': s.void,
        'updater->outdated': s.object({
            latestRelease: model.GitHubRelease,
        }),
        'updater->update-step': s.object({
            message: s.string,
        }),
        'theming->accent-color-changed': s.object({
            accentColor: s.string,
        }),
    },
};
