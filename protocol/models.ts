import { s, references, type Schema } from './schema';
import { settings } from './settings';

export const models = {
    SettingsKey: s.enum(Object.keys(settings), 'string'),
    MessageBoxOptions: s.object({
        type: s.optional(s.enum(['none', 'info', 'error', 'question', 'warning'])),
        title: s.optional(s.string),
        message: s.string,
        detail: s.optional(s.string),
        buttons: s.optional(s.array(s.string)),
        defaultId: s.optional(s.number),
        cancelId: s.optional(s.number),
        checkboxLabel: s.optional(s.string),
        checkboxChecked: s.optional(s.boolean),
        noLink: s.optional(s.boolean),
    }),
    MessageBoxReturnValue: s.object({
        response: s.number,
        checkboxChecked: s.boolean,
    }),
    FeatureFlag: s.object({
        uuid: s.string,
        description: s.string,
        enabled: s.boolean,
    }),
    SystemInfo: s.object({
        arch: s.string,
        type: s.string,
        release: s.string,
        platform: s.string,
        hostname: s.string,
    }),
    DownloadSession: s.object({
        id: s.string,
        url: s.string,
        audioOnly: s.boolean,
        progress: s.number,
        cancelled: s.boolean,
        success: s.nullable(s.boolean),
        startedAt: s.optional(s.number),
        finishedAt: s.optional(s.number),
        youtubeId: s.optional(s.string),
    }),
    VideoVariant: s.object({
        content_type: s.string,
        url: s.string,
        bitrate: s.optional(s.number),
    }),
    VideoInfo: s.object({
        variants: s.array(s.ref('VideoVariant')),
    }),
    TweetMediaDetail: s.object({
        media_url_https: s.string,
        video_info: s.ref('VideoInfo'),
    }),
    TweetMedia: s.object({
        mediaDetails: s.array(s.ref('TweetMediaDetail')),
    }),
    GitHubReleaseAsset: s.object({
        name: s.string,
        browser_download_url: s.string,
        size: s.number,
        digest: s.optional(s.nullable(s.string)),
    }),
    GitHubRelease: s.object({
        tag_name: s.string,
        prerelease: s.boolean,
        draft: s.boolean,
        body: s.nullable(s.string),
        assets: s.array(s.ref('GitHubReleaseAsset')),
    }),
    GitHubCommitUser: s.object({
        login: s.string,
        avatar_url: s.string,
    }),
    GitHubCommitMessage: s.object({
        message: s.string,
    }),
    GitHubCommit: s.object({
        sha: s.string,
        html_url: s.string,
        author: s.nullable(s.ref('GitHubCommitUser')),
        commit: s.ref('GitHubCommitMessage'),
    }),
    NativeVersions: s.object({
        webview2: s.string,
    }, ['webview2']),
    BootstrapState: s.object({
        flags: s.array(s.ref('FeatureFlag')),
        system: s.ref('SystemInfo'),
        buildDate: s.string,
        versions: s.ref('NativeVersions'),
        diagnostics: s.optional(s.debugOnly(s.boolean)),
        development: s.optional(s.debugOnly(s.boolean)),
    }, ['system', 'versions', 'buildDate', 'flags']),
} satisfies Record<string, Schema>;

export const model = references(models);
