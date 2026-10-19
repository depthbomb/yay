#include "services/download_service.h"
#include "downloads/yt_dlp.h"
#include "core/ipc_router.h"
#include <iostream>
#include <random>
#include <regex>

namespace
{
    void expect(const bool condition, const std::string& message)
    {
        if (!condition)
        {
            throw std::runtime_error(message);
        }
    }

    template <class Predicate> void waitUntil(Dispatcher& dispatcher, Predicate done)
    {
        const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(5);
        while (!done())
        {
            expect(std::chrono::steady_clock::now() < deadline, "Timed out waiting for download events");
            dispatcher.drain();
            Sleep(10);
        }
    }

    void checkArguments(const AppPaths& paths)
    {
        auto settings = SettingsService::defaults(paths);
        const Json video{{"url", "https://example.test/--literal?title=日本語"}, {"audioOnly", false}};
        std::vector<std::string> expected{"--newline",
                                          "--encoding",
                                          "utf-8",
                                          "-o",
                                          pathUtf8(paths.downloads / "%(title)s [%(id)s].%(ext)s"),
                                          "--ffmpeg-location",
                                          pathUtf8(paths.binaries / "ffmpeg.exe"),
                                          "--no-playlist",
                                          "--",
                                          video.at("url").get<std::string>()};
        expect(ytDlpArguments(settings, paths, video.at("url").get<std::string>(), false) == expected,
               "Default video argument order");

        settings["use-thumbnail-for-cover-art"] = true;
        settings["cookies-file-path"] = "C:\\cookies file.txt";
        settings["skip-youtube-playlists"] = false;
        settings["deno-path"] = "C:\\tools with spaces\\deno.exe";
        const Json audio{{"url", "https://example.test/audio"}, {"audioOnly", true}};
        expected = {"--newline",
                    "--encoding",
                    "utf-8",
                    "-x",
                    "--audio-format",
                    "mp3",
                    "--audio-quality",
                    "0",
                    "--embed-thumbnail",
                    "-o",
                    pathUtf8(paths.downloads / "%(title)s [%(id)s].%(ext)s"),
                    "--ffmpeg-location",
                    pathUtf8(paths.binaries / "ffmpeg.exe"),
                    "--cookies",
                    "C:\\cookies file.txt",
                    "--js-runtimes",
                    "deno:C:\\tools with spaces\\deno.exe",
                    "--",
                    audio.at("url").get<std::string>()};
        expect(ytDlpArguments(settings, paths, audio.at("url").get<std::string>(), true) == expected,
               "Configured audio argument order");

        settings["cookies-file-path"] = "";
        const auto emptyCookies = ytDlpArguments(settings, paths, audio.at("url").get<std::string>(), true);
        const auto cookies = std::ranges::find(emptyCookies, "--cookies");
        expect(cookies != emptyCookies.end() && (cookies + 1)->empty(), "Empty cookie path stays an explicit argument");
        expect(parseYtDlpUpdateOutput("Current: 2026.01.01\nUpdated to 2026.10.14.2") ==
                   std::pair<std::string, bool>{"2026.10.14.2", true},
               "Update uses the last version in output");
        expect(parseYtDlpUpdateOutput("yt-dlp is up to date (2026.10.14)") ==
                   std::pair<std::string, bool>{"2026.10.14", false},
               "Already current version output");
        expect(youtubeVideoId("https://youtu.be/abcdefghijk?t=1") == "abcdefghijk" &&
                   youtubeVideoId("https://WWW.YOUTUBE.COM/watch?v=abcdefghijk") == "abcdefghijk",
               "YouTube ID extraction");
        expect(!youtubeVideoId("https://example.test/video"), "Non-YouTube downloads have no thumbnail ID");
    }

    void checkProgress()
    {
        const std::vector<std::pair<std::string, std::optional<double>>> cases{{"[download] 12.5% at 2MB/s", 12.5},
                                                                               {"120%", 100},
                                                                               {"0%", 0},
                                                                               {"[info] downloading", std::nullopt},
                                                                               {"25% then 50%", 25},
                                                                               {"% 12.% .5%", 5},
                                                                               {"1.2.3%", 2.3},
                                                                               {"-12%", 12},
                                                                               {"1e2%", 2},
                                                                               {"25 %", std::nullopt},
                                                                               {"１２%", std::nullopt},
                                                                               {"", std::nullopt}};
        for (const auto& [line, expected] : cases)
        {
            expect(ytDlpProgress(line) == expected, "Progress parsing preserves existing substring matching: " + line);
        }

        // Compare with the previous parser to catch changes in unusual downloader output.
        const std::regex previousPattern(R"((\d+(?:\.\d+)?)%)");
        std::mt19937 random(86432);
        const std::string alphabet = "0123456789.%eE+- abc\r\n";
        for (int i = 0; i < 10000; ++i)
        {
            std::string line(random() % 100, ' ');
            for (auto& character : line)
            {
                character = alphabet[random() % alphabet.size()];
            }

            std::smatch match;
            const auto previous = std::regex_search(line, match, previousPattern)
                                      ? std::optional(std::clamp(std::stod(match[1].str()), 0.0, 100.0))
                                      : std::nullopt;
            expect(ytDlpProgress(line) == previous, "Progress parser agrees with the previous regex: " + line);
        }

        for (const auto& line : {std::string(400, '9') + "%", "0." + std::string(400, '0') + "1%"})
        {
            bool rejected = false;
            try
            {
                ytDlpProgress(line);
            }
            catch (const std::out_of_range&)
            {
                rejected = true;
            }

            expect(rejected, "Overflow and underflow keep the existing conversion failure behavior");
        }
    }

    void checkQueue(const std::filesystem::path& temporary)
    {
        auto paths = AppPaths::discover(temporary);
        paths.downloads = temporary / "downloads";
        paths.binaries = temporary / "bin";
        std::filesystem::create_directories(paths.binaries);
        checkArguments(paths);
        checkProgress();

        Dispatcher dispatcher;
        EventBus events(dispatcher);
        Logger logger(paths);
        HttpClient http;
        SettingsService settings(paths, events, logger);
        settings.set(ipc::SettingsKey::DownloadDir, pathUtf8(paths.downloads));
        settings.set(ipc::SettingsKey::YtDlpPath, pathUtf8(paths.executable));
        DownloadService downloads(paths, settings, events, http, logger);
        std::vector<Json> queued;
        std::vector<Json> started;
        std::vector<Json> finished;
        std::vector<std::string> order;
        std::vector<std::string> logs;
        std::vector<double> progress;
        int cancelled = 0;
        int updating = 0;
        int updated = 0;
        events.subscribe(
            [&](const ipc::EventChannel channel, const Json& payload)
            {
                IpcRouter::validateEvent(channel, payload);
                if (channel == ipc::EventChannel::YtDlpDownloadQueued)
                {
                    queued.push_back(payload);
                }
                else if (channel == ipc::EventChannel::YtDlpDownloadStarted)
                {
                    started.push_back(payload);
                    order.push_back("started");
                    if (payload.at("url") == "https://example.test/cancel")
                    {
                        expect(downloads.busy(), "Active cancellation is busy");
                        expect(downloads.active()->id == payload.at("id").get<std::string>(), "Active session identity");
                        expect(!downloads.updateBinary(true).at("isOk").get<bool>(), "Cannot update during a download");
                        downloads.cancel();
                    }
                }
                else if (channel == ipc::EventChannel::YtDlpDownloadFinished)
                {
                    finished.push_back(payload);
                    order.push_back("finished");
                }
                else if (channel == ipc::EventChannel::YtDlpDownloadCanceled)
                {
                    ++cancelled;
                    expect(payload.at("cancelled") == true && payload.at("success") == false,
                           "Cancelled event reports failure");
                    order.push_back("cancelled");
                }
                else if (channel == ipc::EventChannel::YtDlpStdout)
                {
                    for (const auto& line : payload.at("lines"))
                    {
                        logs.push_back(line.get<std::string>());
                    }
                }
                else if (channel == ipc::EventChannel::YtDlpDownloadProgress)
                {
                    progress.push_back(payload.at("progress").get<double>());
                }
                else if (channel == ipc::EventChannel::YtDlpUpdatingBinary)
                {
                    ++updating;
                }
                else if (channel == ipc::EventChannel::YtDlpUpdatedBinary)
                {
                    ++updated;
                }
            });

        expect(!downloads.active() && !downloads.busy(), "Initially idle");
        expect(downloads.updateBinary(true).at("isOk") == true, "Fixture binary update succeeds");
        dispatcher.drain();
        expect(updating == 1 && updated == 1, "Update emits matching start and finish events");
        downloads.enqueue("https://example.test/video");
        downloads.enqueue("https://example.test/failure", true);
        downloads.enqueue("https://example.test/cancel");
        downloads.enqueue("https://www.youtube.com/watch?v=abcdefghijk&case=/failure");
        waitUntil(dispatcher,
                  [&]
                  {
                      return finished.size() == 4 && !downloads.busy();
                  });
        dispatcher.drain();

        expect(queued.size() == 4 && started.size() == 4, "Every queued download starts");
        expect(order == std::vector<std::string>{"started",
                                                 "finished",
                                                 "started",
                                                 "finished",
                                                 "started",
                                                 "cancelled",
                                                 "finished",
                                                 "started",
                                                 "finished"},
               "FIFO lifecycle event order");
        for (size_t index = 0; index < queued.size(); ++index)
        {
            expect(queued[index].size() == 6 && queued[index].at("progress") == 0 &&
                       queued[index].at("success").is_null() && queued[index].at("cancelled") == false,
                   "Queued session shape and defaults");
            expect(started[index].size() == 7 && started[index].contains("startedAt") &&
                       !started[index].contains("finishedAt"),
                   "Started session shape");
            expect(queued[index].at("id") == finished[index].at("id") &&
                       queued[index].at("url") == finished[index].at("url"),
                   "FIFO session identity");
            expect(finished[index].at("finishedAt") >= started[index].at("startedAt"), "Lifecycle timestamps");
        }

        expect(finished[0].at("success") == true && finished[0].at("progress") == 100,
               "Successful progress is clamped");
        expect(finished[1].at("success") == false && finished[1].at("audioOnly") == true,
               "Process failure is preserved");
        expect(finished[2].at("cancelled") == true && cancelled == 1, "Cancellation emits once");
        expect(finished[3].at("youtubeId") == "abcdefghijk" && finished[3].at("success") == false,
               "YouTube metadata survives a failed download");
        expect(std::ranges::find(logs, "[download] 12.5%") != logs.end(), "Process logs are delivered");
        expect(std::ranges::find(progress, 12.5) != progress.end(), "Fractional progress is delivered");
        expect(!downloads.active(), "Finished sessions are cleared");
        downloads.stop();
        bool rejected = false;
        try
        {
            downloads.enqueue("https://example.test/after-stop");
        }
        catch (const std::exception& error)
        {
            rejected = std::string(error.what()) == "The application is shutting down.";
        }

        expect(rejected, "Shutdown rejects new downloads");
    }
}

int main(const int argc, char** argv)
{
    // The service launches this executable as a deterministic yt-dlp fixture.
    if (argc > 1 && std::string(argv[1]) == "-U")
    {
        std::cout << "Updated yt-dlp to stable@2026.10.14\n";
        return 0;
    }

    if (argc > 1 && std::string(argv[1]) == "--newline")
    {
        const std::string url = argv[argc - 1];
        if (url.ends_with("/cancel"))
        {
            Sleep(10000);
            return 0;
        }

        Sleep(150);
        std::cout << "[download] 12.5%" << std::endl;
        Sleep(150);
        std::cout << "[download] 120%" << std::endl;
        return url.ends_with("/failure") ? 1 : 0;
    }

    const auto temporary = std::filesystem::temp_directory_path() / ("yay-download-tests-" + uuid());
    try
    {
        checkQueue(temporary);
        std::cout << "Download arguments, queue, failure, cancellation, and update checks passed.\n";
        return 0;
    }
    catch (const std::exception& error)
    {
        std::cerr << error.what() << '\n';
        return 1;
    }
}
