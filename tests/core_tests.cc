#include "core/ipc_router.h"
#include "downloads/yt_dlp.h"
#include "ipc/service_handlers.h"
#include "services/download_service.h"
#include "services/twitter_service.h"
#include "services/update_service.h"
#include <iostream>
#include <objbase.h>

namespace
{
    static_assert(ipc::EventContract<ipc::SetupStep>);
    static_assert(ipc::RendererEvent<ipc::SetupStep>);
    static_assert(!ipc::RendererEvent<ipc::NativeQuit>);
    static_assert(!ipc::EventContract<ipc::SettingsGet>);
    static_assert(!std::is_convertible_v<ipc::EventChannel, ipc::RequestChannel>);
    static_assert(!std::is_convertible_v<const char*, ipc::SettingsKey>);
    static_assert(std::same_as<decltype(ipc::SettingsGet::key), ipc::SettingsKey>);
    static_assert(std::same_as<decltype(ipc::SettingsSet::key), ipc::SettingsKey>);
    static_assert(std::same_as<decltype(ipc::SettingsChangedPayload::key), ipc::SettingsKey>);
    int failures = 0;

    void expect(const bool condition, const std::string& message)
    {
        if (!condition)
        {
            ++failures;
            std::cerr << "FAIL: " << message << '\n';
        }
    }

    template <class Function> void rejects(Function function, const std::string& message)
    {
        try
        {
            function();
            expect(false, message);
        }
        catch (const std::exception&) {}
    }

    void checkGeneratedContracts()
    {
        for (const auto channel : ipc::RequestChannels)
        {
            const auto name = ipc::channelName(channel);
            expect(ipc::parseRequestChannel(name) == channel, "Request channel enum round trip");
            expect(ipc::schema().at("requests").contains(std::string(name)), "Request enum has a schema");
        }

        for (const auto channel : ipc::EventChannels)
        {
            const auto name = ipc::channelName(channel);
            expect(ipc::parseEventChannel(name) == channel, "Event channel enum round trip");
            expect(ipc::isRendererEvent(channel) == ipc::schema().at("events").contains(std::string(name)),
                   "Native events are never broadcast to renderers");
        }

        expect(!ipc::parseRequestChannel("unknown") && !ipc::parseEventChannel("unknown"), "Unknown channels are rejected");
        rejects([] { ipc::channelName(static_cast<ipc::EventChannel>(-1)); }, "Invalid event enum values are rejected");
        Dispatcher dispatcher;
        EventBus events(dispatcher);
        std::vector<std::pair<ipc::EventChannel, Json>> received;
        events.subscribe([&](ipc::EventChannel channel, const Json& payload) { received.emplace_back(channel, payload); });
        events.emit<ipc::SetupStep>({.message = "Installing", .progress = -1});
        events.emit<ipc::SetupDone>();
        events.emit<ipc::UpdaterUpdateStep>({.message = "Downloading"});
        const Json release = {{"latestRelease", {{"id", 42}, {"new_github_field", "preserved"}}}};
        events.forwardEvent(ipc::EventChannel::UpdaterOutdated, release);
        expect(received.empty(), "Typed events retain queued delivery");
        dispatcher.drain();
        expect(received.size() == 4, "Typed event delivery count");
        expect(received.at(0).second == Json({{"message", "Installing"}, {"progress", -1}}), "Required event fields keep their shape");
        expect(received.at(1).second.is_null(), "Void event payloads remain null");
        expect(received.at(2).second == Json({{"message", "Downloading"}}), "Optional event fields remain absent");
        expect(received.at(3).second == release, "Forwarding preserves external fields");
    }

    void checkSettingContracts(const AppPaths& paths)
    {
        const Json expected{
            {"enable-new-release-toast", true},
            {"enable-global-menu", false},
            {"auto-start", false},
            {"hide-setup-window", false},
            {"download-dir", pathUtf8(paths.downloads)},
            {"download-name-template", "%(title)s [%(id)s].%(ext)s"},
            {"default-download-action", "video"},
            {"cookies-file-path", nullptr},
            {"use-thumbnail-for-cover-art", false},
            {"enable-download-completion-toast", true},
            {"yt-dlp-path", "yt-dlp"},
            {"deno-path", "deno"},
            {"skip-youtube-playlists", true},
            {"disable-hardware-acceleration", false},
            {"update-ytdlp-on-startup", true},
            {"use-new-twitter-video-downloader", true}
        };
        expect(SettingsService::defaults(paths) == expected, "Generated defaults preserve existing settings and omit credentials");
        expect(std::size(ipc::SettingsKeys) == expected.size(), "Every persisted setting has a generated enum key");
        for (const auto key : ipc::SettingsKeys)
        {
            const auto name = ipc::settingName(key);
            expect(expected.contains(name) && ipc::parseSettingKey(name) == key,
                   "Setting enum names match persisted keys");
            const Json encoded = key;
            expect(encoded.get<std::string>() == name && encoded.get<ipc::SettingsKey>() == key,
                   "Setting keys serialize as stable strings");
        }

        expect(!ipc::parseSettingKey("unknown"), "Unknown setting names are rejected");
        rejects(
            []
            {
                static_cast<void>(Json("unknown").get<ipc::SettingsKey>());
            },
            "Unknown JSON setting keys are rejected");
        rejects(
            []
            {
                static_cast<void>(Json(0).get<ipc::SettingsKey>());
            },
            "Numeric setting ordinals are never accepted over IPC");
        rejects(
            []
            {
                ipc::settingName(static_cast<ipc::SettingsKey>(-1));
            },
            "Invalid setting enum values are rejected");
        expect(Json(ipc::SettingsChangedPayload{.key = ipc::SettingsKey::AutoStart, .value = true}) ==
                   Json({{"key", "auto-start"}, {"value", true}}),
               "Typed setting events keep their wire payload");
        SettingsService::validate(expected);

        for (const auto& [key, value] : expected.items())
        {
            if (value.is_boolean())
            {
                SettingsService::validate({{key, true}});
                SettingsService::validate({{key, false}});
                for (const auto& invalid : Json::array({0, "true", nullptr, Json::object(), Json::array()}))
                {
                    rejects([&] { SettingsService::validate({{key, invalid}}); }, key + " requires a boolean");
                }
            }
        }

        const std::string maximumText(32767, 'a');
        const std::string oversizedText(32768, 'a');
        for (const auto* key : {"download-dir", "download-name-template", "yt-dlp-path", "deno-path", "cookies-file-path"})
        {
            SettingsService::validate({{key, maximumText}});
            SettingsService::validate({{key, std::string(32765, 'a') + "é"}});
            rejects([&] { SettingsService::validate({{key, oversizedText}}); }, std::string(key) + " retains its byte limit");
            rejects([&] { SettingsService::validate({{key, std::string(32766, 'a') + "é"}}); }, "Text limits count UTF-8 bytes");
            rejects([&] { SettingsService::validate({{key, false}}); }, "Text settings reject booleans");
            if (std::string_view(key) != "cookies-file-path")
            {
                rejects([&] { SettingsService::validate({{key, ""}}); }, "Required text settings reject empty strings");
                rejects([&] { SettingsService::validate({{key, nullptr}}); }, "Required text settings reject null");
            }
        }

        SettingsService::validate({{"cookies-file-path", nullptr}});
        SettingsService::validate({{"cookies-file-path", ""}});
        SettingsService::validate({{"default-download-action", "video"}});
        SettingsService::validate({{"default-download-action", "audio"}});
        rejects([] { SettingsService::validate({{"default-download-action", "other"}}); }, "Download action values stay restricted");
        try
        {
            SettingsService::validate({{"download-dir", ""}});
            expect(false, "Invalid settings throw the original error");
        }
        catch (const std::exception& error)
        {
            expect(std::string(error.what()) == "Invalid or unsupported setting: download-dir.", "Settings errors retain their wording");
        }

        const Json textSchema{{"type", "string"}, {"minBytes", 1}, {"maxBytes", 2}};
        IpcRouter::validateValue("é", textSchema, "text");
        rejects([&] { IpcRouter::validateValue("", textSchema, "text"); }, "Schema minimum byte length");
        rejects([&] { IpcRouter::validateValue("éa", textSchema, "text"); }, "Schema maximum byte length");
        const Json numberSchema{{"type", "integer"}, {"minimum", 1}, {"maximum", 65535}};
        IpcRouter::validateValue(1, numberSchema, "port");
        IpcRouter::validateValue(65535, numberSchema, "port");
        rejects([&] { IpcRouter::validateValue(0, numberSchema, "port"); }, "Schema minimum value");
        rejects([&] { IpcRouter::validateValue(65536, numberSchema, "port"); }, "Schema maximum value");
    }

    void checkServiceHandlers(
        const AppPaths& paths, Dispatcher& dispatcher, EventBus& events, Logger& logger,
        HttpClient& http, SettingsService& settings, DownloadService& downloads)
    {
        TwitterService twitter(settings, http);
        UpdateService updates(settings, events, http, logger);
        WorkerPool workers;
        IpcRouter router(dispatcher, workers, logger);
        registerSettingsHandlers(router, settings);
        registerDownloadHandlers(router, downloads, settings, twitter, {});
        registerUpdateHandlers(router, updates, {});

        const auto invoke = [&](const std::string& channel, const Json& args = Json::array())
        {
            std::optional<Json> result;
            router.dispatch({{"channel", channel}, {"args", args}}, {}, [&](Json value)
            {
                result = std::move(value);
            });
            const auto deadline = unixMillis() + 5000;
            while (!result && unixMillis() < deadline)
            {
                dispatcher.drain();
                Sleep(1);
            }

            if (!result)
            {
                throw std::runtime_error("IPC handler did not reply: " + channel);
            }

            return *result;
        };

        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::SettingsSet)), Json::array({"default-download-action", "audio"})) == ipcOk(),
               "headless settings handler returns the original success envelope");
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::SettingsGet)), Json::array({"default-download-action", nullptr})) == ipcOk("audio"),
               "headless settings handler decodes optional arguments");
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::SettingsGet)), Json::array({"default-download-action", nullptr, true})).at("isErr") == true,
               "settings reads reject the removed secure argument");
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::SettingsSet)), Json::array({"default-download-action", "video", true})).at("isErr") == true,
               "settings writes reject the removed secure argument");
        expect(settings.get(ipc::SettingsKey::DefaultDownloadAction) == "audio", "rejected requests do not change settings");
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::SettingsSet)), Json::array({"download-dir", ""})).at("isErr") == true,
               "service failures become IPC errors");
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::SettingsGet)), Json::array({"unknown"})).at("isErr") == true,
               "invalid requests fail before invoking handlers");
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::FeatureFlagGetFeatureFlags))) == ipcOk(settings.flags()), "feature flag handler response");
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::UpdaterGetNextManualCheck))) == ipcOk(updates.nextManualCheck()), "updater handler response");
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::UpdaterCancelUpdate))) == ipcOk(), "updater cancellation handler response");

        const auto cookieFile = paths.data / "cookies.txt";
        writeAtomic(cookieFile, "fixture");
        settings.set(ipc::SettingsKey::CookiesFilePath, pathUtf8(cookieFile));
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::YtDlpRemoveCookiesFile))) == ipcOk() &&
                   !std::filesystem::exists(cookieFile) && settings.get(ipc::SettingsKey::CookiesFilePath).is_null(),
               "cookie handler clears settings and deletes the file");
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::ThumbnailClearCache))) == ipcOk(), "background handler replies through the dispatcher");
        rejects([&] { registerSettingsHandlers(router, settings); }, "duplicate service handlers are rejected");
        workers.stop();
        dispatcher.drain();
    }
} // namespace

int main()
{
    if (FAILED(CoInitializeEx(nullptr, COINIT_MULTITHREADED)))
    {
        std::cerr << "Could not initialize COM for the service tests.\n";
        return 1;
    }
    const auto temporary = std::filesystem::temp_directory_path() / ("yay-tests-" + uuid());
    try
    {
        auto paths = AppPaths::discover(temporary);
        expect(paths.binaries == paths.directory / "bin", "managed binaries live beside the app in bin");
        paths.downloads = temporary / "downloads";
        checkGeneratedContracts();
        checkSettingContracts(paths);
        Dispatcher dispatcher;
        EventBus events(dispatcher);
        Logger logger(paths);
        checkHresult(S_OK, "Successful operation");
        checkHresult(S_FALSE, "Successful operation with a status");
        rejects(
            []
            {
                checkHresult(E_FAIL, "Required initialization");
            },
            "Required COM failures throw");
        const auto log = paths.data / "logs" / ("yay-" + isoDate().substr(0, 10) + ".log");
        const auto before = std::filesystem::exists(log) ? readText(log) : "";
        expect(reportHresult(S_FALSE, "Successful optional operation", &logger), "Successful COM status is accepted");
        expect((std::filesystem::exists(log) ? readText(log) : "") == before, "Successful COM status is not logged");
        expect(!reportHresult(E_ACCESSDENIED, "Optional window operation", &logger),
               "Optional COM failures return false");
        expect(readText(log).find("Optional window operation failed (HRESULT 0x80070005)") != std::string::npos,
               "Optional COM failures log their operation and error code");
        HttpClient http;
        SettingsService settings(paths, events, logger);
        DownloadService downloads(paths, settings, events, http, logger);

        expect(hashBytes("abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
               "SHA-256 known vector");
        expect(constantTimeEqual("same", "same") && !constantTimeEqual("same", "other"),
               "constant-time checksum comparison");
        expect(wide(utf8(L"日本語 é 🎵")) == L"日本語 é 🎵", "UTF-8 round trip");

        expect(settings.get(ipc::SettingsKey::SkipYoutubePlaylists) == true, "settings defaults");
        settings.set(ipc::SettingsKey::DownloadNameTemplate, "%(title)s.%(ext)s");
        settings.exportFile(temporary);
        settings.set(ipc::SettingsKey::SkipYoutubePlaylists, false);
        settings.importFile(temporary / "yay-exported-settings.toml");
        expect(settings.get(ipc::SettingsKey::SkipYoutubePlaylists) == true, "import replaces prior values");
        SettingsService reloaded(paths, events, logger);
        expect(reloaded.get(ipc::SettingsKey::DownloadNameTemplate) ==
                   settings.get(ipc::SettingsKey::DownloadNameTemplate),
               "TOML persistence");
        rejects(
            []
            {
                SettingsService::validate({{"unknown", true}});
            },
            "unknown settings rejected");
        const Json session{{"url", "https://example.com/--evil"}, {"audioOnly", true}};
        auto options = settings.all();
        options["use-thumbnail-for-cover-art"] = true;
        options["cookies-file-path"] = "C:\\cookies file.txt";
        const auto args = ytDlpArguments(options, paths, session.at("url").get<std::string>(), true);
        expect(args.at(args.size() - 2) == "--" && args.back() == session.at("url").get<std::string>(),
               "media URL is never parsed as an option");
        expect(std::ranges::find(args, "--embed-thumbnail") != args.end(), "audio cover art option");
        expect(std::ranges::find(args, "--no-playlist") != args.end(), "playlist option");
        expect(
            parseYtDlpUpdateOutput("Latest version: stable@2026.10.14\nUpdated yt-dlp to stable@2026.10.14")
                .second,
            "yt-dlp update output");
        rejects(
            []
            {
                parseYtDlpUpdateOutput("broken output");
            },
            "unrecognized updater output rejected");

        expect(validMediaUrl("https://example.com/video") && !validMediaUrl("file:///C:/data"), "media URL validation");
        expect(!allowedExternalUrl("https://github.com.evil.test/a") &&
                   allowedExternalUrl("https://github.com/depthbomb/yay"),
               "external origin policy");
        expect(decodeUrl(encodeUrl("https://x.test/a?x=1&y=日本語")) == "https://x.test/a?x=1&y=日本語",
               "URL query encoding");

        Json release{{"tag_name", "v1.43.0"}, {"draft", false}, {"prerelease", false}};
        expect(UpdateService::newerRelease(release, "1.42.1"), "stable version comparison");
        release["prerelease"] = true;
        expect(!UpdateService::newerRelease(release, "1.42.1"), "prereleases excluded");
        expect(UpdateService::trustedAsset("https://github.com/depthbomb/yay/releases/download/1.43.0/yay-setup.exe"),
               "release origin accepted");
        expect(!UpdateService::trustedAsset("https://github.com/other/yay/releases/download/1.43.0/yay-setup.exe"),
               "different repository rejected");
        const auto hash = hashBytes("installer");
        expect(UpdateService::checksumFromText(hash + " *yay-setup.exe\n", "yay-setup.exe") == hash,
               "checksum sidecar parsing");

        expect(TwitterService::parseMedia({{"mediaDetails", Json::array()}}).is_null(), "media-less tweet");
        rejects(
            []
            {
                TwitterService::parseMedia(Json::array());
            },
            "invalid tweet response rejected");
        rejects(
            []
            {
                TwitterService::parseMedia(
                    {{"mediaDetails", Json::array({{{"media_url_https", "https://evil.test/image.jpg"}}})}});
            },
            "tweet media host validation");

        IpcRouter::validateArguments(std::string(ipc::channelName(ipc::RequestChannel::YtDlpDownloadVideo)), Json::array({"https://example.com"}));
        rejects(
            []
            {
                IpcRouter::validateArguments(std::string(ipc::channelName(ipc::RequestChannel::YtDlpDownloadVideo)), Json::array({12}));
            },
            "wrong IPC argument type rejected");
        rejects(
            []
            {
                IpcRouter::validateArguments("unknown", Json::array());
            },
            "unknown IPC channel rejected");
        rejects(
            []
            {
                IpcRouter::validateArguments(std::string(ipc::channelName(ipc::RequestChannel::SettingsSet)), Json::array({"unknown", true}));
            },
            "unknown IPC settings key rejected");
        const auto [url] = ipc::YtDlpDownloadAudio::parse(Json::array({"https://example.com"}));
        expect(url == "https://example.com", "generated C++ request decoding");
        checkServiceHandlers(paths, dispatcher, events, logger, http, settings, downloads);
        downloads.stop();
        dispatcher.drain();
    }
    catch (const std::exception& error)
    {
        ++failures;
        std::cerr << "Unexpected error: " << error.what() << '\n';
    }

    std::error_code ignored;
    std::filesystem::remove_all(temporary, ignored);
    CoUninitialize();
    std::cout << (failures == 0 ? "All native service checks passed.\n" : "Native service checks failed.\n");
    return failures == 0 ? 0 : 1;
}
