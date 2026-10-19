#include "services/setup_service.h"
#include "platform/process.h"
#include <iostream>

int main()
{
    const auto temporary = std::filesystem::temp_directory_path() / ("yay-setup-test-" + uuid());
    try
    {
        auto paths = AppPaths::discover(temporary / "profile");
        paths.binaries = temporary / "bin";
        Dispatcher dispatcher;
        EventBus events(dispatcher);
        Logger logger(paths);
        HttpClient http;
        SettingsService settings(paths, events, logger);
        settings.set(ipc::SettingsKey::YtDlpPath, pathUtf8(temporary / "missing-ytdlp.exe"));
        settings.set(ipc::SettingsKey::DenoPath, pathUtf8(temporary / "missing-deno.exe"));
        settings.set(ipc::SettingsKey::UpdateYtdlpOnStartup, false);
        DownloadService downloads(paths, settings, events, http, logger);
        SetupService setup(paths, settings, events, http, downloads, logger);
        const auto succeeded = setup.run(
            {},
            [](const Json& options) -> Json
            {
                throw std::runtime_error(options.value("message", "Unexpected setup prompt."));
            },
            true);
        if (!succeeded)
        {
            throw std::runtime_error("First-run dependency setup failed.");
        }

        if (settings.get(ipc::SettingsKey::YtDlpPath) != pathUtf8(paths.binaries / "yt-dlp.exe") ||
            settings.get(ipc::SettingsKey::DenoPath) != pathUtf8(paths.binaries / "deno.exe"))
        {
            throw std::runtime_error("Setup did not save the downloaded executables' bin paths.");
        }

        for (const auto* file : {"yt-dlp.exe", "deno.exe", "ffmpeg.exe", "ffprobe.exe"})
        {
            const std::string name = file;
            const auto argument = name == "deno.exe" ? "--version" : name == "yt-dlp.exe" ? "--version" : "-version";
            // Keep this initializer separate so the condition stays readable.
            // ReSharper disable once CppTooWideScopeInitStatement
            const auto result = runProcess(paths.binaries / file, {argument}, {}, {}, std::chrono::seconds(30));
            if (result.exitCode != 0 || result.output.empty())
            {
                throw std::runtime_error("Downloaded dependency failed to execute: " + name);
            }

            std::cout << name << " verified\n";
        }

        std::cout << "First-run setup downloaded, extracted, and verified all four dependencies.\n";
        std::cout << "Artifacts: " << pathUtf8(temporary) << '\n';
        return 0;
    }
    catch (const std::exception& error)
    {
        std::cerr << error.what() << "\nArtifacts: " << pathUtf8(temporary) << '\n';
        return 1;
    }
}
