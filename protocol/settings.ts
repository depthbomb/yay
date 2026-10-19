import { s, type Schema } from './schema';

export interface SettingDefinition {
    schema: Schema;
    default?: string | number | boolean | null;
    defaultFrom?: 'downloads';
}

const text = s.text({
    minBytes: 1,
    maxBytes: 32767,
});

function setting(value: string | number | boolean | null, schema?: Schema): SettingDefinition {
    return {
        schema: schema ?? {
            type: value === null ? 'null' : typeof value as 'string' | 'number' | 'boolean',
        },
        default: value,
    };
}

// Keep persisted keys stable. Limits are UTF-8 bytes, matching native settings files.
export const settings = {
    'enable-new-release-toast': setting(true),
    'enable-global-menu': setting(false),
    'auto-start': setting(false),
    'hide-setup-window': setting(false),
    'download-dir': {
        schema: text,
        defaultFrom: 'downloads',
    },
    'download-name-template': setting('%(title)s [%(id)s].%(ext)s', text),
    'default-download-action': setting('video', s.enum(['video', 'audio'])),
    'cookies-file-path': setting(null, s.nullable(s.text({ maxBytes: 32767 }))),
    'use-thumbnail-for-cover-art': setting(false),
    'enable-download-completion-toast': setting(true),
    'yt-dlp-path': setting('yt-dlp', text),
    'deno-path': setting('deno', text),
    'skip-youtube-playlists': setting(true),
    'disable-hardware-acceleration': setting(false),
    'update-ytdlp-on-startup': setting(true),
    'use-new-twitter-video-downloader': setting(true),
} satisfies Record<string, SettingDefinition>;
