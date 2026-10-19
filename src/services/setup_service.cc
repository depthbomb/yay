#include "services/setup_service.h"
#include "platform/process.h"

SetupService::SetupService(const AppPaths& paths,
                           SettingsService& settings,
                           EventBus& events,
                           HttpClient& http,
                           DownloadService& downloads,
                           Logger& logger) : m_paths(paths),
      m_settings(settings),
      m_events(events),
      m_http(http),
      m_downloads(downloads),
      m_logger(logger) {}

void SetupService::step(const std::string& message, const int progress) const
{
    m_logger.write(message);
    m_events.emit<ipc::SetupStep>({.message = message, .progress = static_cast<double>(progress)});
}

bool SetupService::testBinary(const std::filesystem::path& path,
                              const std::string& argument,
                              const std::regex& pattern,
                              const std::stop_token& stop) const
{
    try
    {
        const auto result = runProcess(path, {argument}, stop, {}, std::chrono::seconds(20), m_paths.binaries);
        return result.exitCode == 0 && std::regex_search(result.output, pattern);
    }
    catch (const std::exception&)
    {
        return false;
    }
}

bool SetupService::run(const std::stop_token& stop, const Prompt& prompt, const bool forceDownload) const
{
    try
    {
        std::filesystem::create_directories(m_paths.binaries);
        step("Checking internet connection...");
        try
        {
            (void)m_http.get("https://www.gstatic.com/generate_204", stop, 4096);
        }
        catch (const std::exception&)
        {
            if (stop.stop_requested() ||
                prompt({{"type", "warning"},
                        {"message",
                         "It appears that you have no internet connection.\nThis application cannot function without "
                         "an internet connection.\n\nWould you still like to continue?"},
                        {"buttons", {"Yes", "No"}}})
                        .value("response", 1) != 0)
            {
                return false;
            }
        }

        step("Verifying yt-dlp...");
        const auto localYtdlp = m_paths.binaries / "yt-dlp.exe";
        const auto ytdlp = std::filesystem::exists(localYtdlp)
                               ? localYtdlp
                               : pathFromUtf8(m_settings.get(ipc::SettingsKey::YtDlpPath, "yt-dlp").get<std::string>());
        const bool hasYtdlp = testBinary(ytdlp, "--version", std::regex(R"(\d{4}\.\d+\.\d+)"), stop);
        if (hasYtdlp)
        {
            m_settings.set(ipc::SettingsKey::YtDlpPath, pathUtf8(ytdlp));
        }

        step("Verifying Deno...");
        const auto localDeno = m_paths.binaries / "deno.exe";
        const auto deno = std::filesystem::exists(localDeno)
                              ? localDeno
                              : pathFromUtf8(m_settings.get(ipc::SettingsKey::DenoPath, "deno").get<std::string>());
        const bool hasDeno = testBinary(deno, "-v", std::regex(R"(\d+\.\d+\.\d+)"), stop);
        if (hasDeno)
        {
            m_settings.set(ipc::SettingsKey::DenoPath, pathUtf8(deno));
        }

        step("Checking for FFmpeg...");
        const bool hasFfmpeg = std::filesystem::exists(m_paths.binaries / "ffmpeg.exe") &&
                               std::filesystem::exists(m_paths.binaries / "ffprobe.exe");
        std::string missing;
        if (!hasYtdlp)
        {
            missing += "yt-dlp\n";
        }

        if (!hasDeno)
        {
            missing += "Deno\n";
        }

        if (!hasFfmpeg)
        {
            missing += "FFmpeg\n";
        }

        if (!missing.empty() && !forceDownload)
        {
            m_events.emit<ipc::NativeShowSetup>();
            if (prompt({{"type", "info"},
                        {"message",
                         "Some files that yay uses are missing from your system:\n\n" + missing +
                             "\nWould you like yay to download them?"},
                        {"buttons", {"Yes", "No"}}})
                    .value("response", 1) != 0)
            {
                return false;
            }
        }

        if (stop.stop_requested())
        {
            return false;
        }

        if (!hasYtdlp)
        {
            step("Starting yt-dlp download...");
            try
            {
                const auto asset = releaseAsset(
                    "yt-dlp/yt-dlp",
                    [](const std::string& name)
                    {
                        return name == "yt-dlp.exe";
                    },
                    stop);
                downloadBinary(asset, "yt-dlp", {"yt-dlp.exe"}, stop);
                if (!testBinary(localYtdlp, "--version", std::regex(R"(\d{4}\.\d+\.\d+)"), stop))
                {
                    throw std::runtime_error("Downloaded yt-dlp binary failed verification.");
                }

                m_settings.set(ipc::SettingsKey::YtDlpPath, pathUtf8(localYtdlp));
            }
            catch (const std::exception& error)
            {
                m_logger.write(error.what());
                if (stop.stop_requested() ||
                    prompt({{"type", "error"},
                            {"message",
                             "There was an issue downloading the latest release of yt-dlp.\nYou can try to manually "
                             "download the latest release and place the file into the bin folder beside yay.exe\n\nWould "
                             "you like to continue to the download?"},
                            {"buttons", {"Yes", "No"}}})
                            .value("response", 1) != 0)
                {
                    return false;
                }

                m_events.emit<ipc::NativeOpenExternal>(
                    {.url = "https://github.com/yt-dlp/yt-dlp/releases/download/latest/yt-dlp.exe"});
            }
        }

        if (!hasDeno && !stop.stop_requested())
        {
            step("Starting Deno download...");
            try
            {
                const auto asset = releaseAsset(
                    "denoland/deno",
                    [](const std::string& name)
                    {
                        return name.ends_with("deno-x86_64-pc-windows-msvc.zip");
                    },
                    stop);
                downloadBinary(asset, "Deno", {"deno.exe"}, stop);
                if (!testBinary(localDeno, "-v", std::regex(R"(\d+\.\d+\.\d+)"), stop))
                {
                    throw std::runtime_error("Downloaded Deno binary failed verification.");
                }

                m_settings.set(ipc::SettingsKey::DenoPath, pathUtf8(localDeno));
            }
            catch (const std::exception& error)
            {
                m_logger.write(error.what());
                if (stop.stop_requested() ||
                    prompt({{"type", "error"},
                            {"message",
                             "There was an issue downloading the latest release of Deno.\nThis file is currently not "
                             "required but will likely be in the future.\n\nWould you like to continue?"},
                            {"buttons", {"Yes", "No"}}})
                            .value("response", 1) != 0)
                {
                    return false;
                }
            }
        }

        if (!hasFfmpeg && !stop.stop_requested())
        {
            step("Starting FFmpeg download...");
            try
            {
                const auto asset = releaseAsset(
                    "yt-dlp/FFmpeg-Builds",
                    [](const std::string& name)
                    {
                        return name.find("win64-gpl.zip") != std::string::npos;
                    },
                    stop);
                downloadBinary(asset, "FFmpeg", {"ffmpeg.exe", "ffprobe.exe"}, stop);
            }
            catch (const std::exception& error)
            {
                m_logger.write(error.what());
                if (stop.stop_requested())
                {
                    return false;
                }

                const auto result = prompt({{"type", "error"},
                                            {"message",
                                             "There was an issue downloading the latest release of FFmpeg.\nYou can "
                                             "try to manually download the latest release and extract the files into "
                                             "the bin folder beside yay.exe\n\nWould you like to continue?"},
                                            {"buttons", {"Yes", "No"}},
                                            {"checkboxLabel", "Open latest release page?"},
                                            {"checkboxChecked", false}});
                if (result.value("checkboxChecked", false))
                {
                    m_events.emit<ipc::NativeOpenExternal>(
                        {.url = "https://github.com/yt-dlp/FFmpeg-Builds/releases/latest"});
                }

                if (result.value("response", 1) != 0)
                {
                    return false;
                }
            }
        }

        if (hasYtdlp && m_settings.get(ipc::SettingsKey::UpdateYtdlpOnStartup, true).get<bool>() &&
            !stop.stop_requested())
        {
            step("Checking for yt-dlp updates...");
            m_downloads.updateBinary(true, stop);
        }

        if (stop.stop_requested())
        {
            return false;
        }

        step("Done!");
        m_events.emit<ipc::SetupDone>();
        return true;
    }
    catch (const std::exception& error)
    {
        if (!stop.stop_requested())
        {
            m_logger.write(std::string("Setup failed: ") + error.what());
            prompt({{"type", "error"},
                    {"title", "Setup failed"},
                    {"message",
                     std::string(error.what()) + "\n\nYou can also place yt-dlp.exe, deno.exe, ffmpeg.exe, and "
                                                 "ffprobe.exe in the bin folder beside yay.exe and restart."}});
        }

        return false;
    }
}

Json SetupService::releaseAsset(const std::string& repository,
                                const std::function<bool(const std::string&)>& match,
                                const std::stop_token& stop) const
{
    // Keep this initializer separate so the condition stays readable.
    // ReSharper disable once CppTooWideScopeInitStatement
    const auto releases = m_http.getJson("https://api.github.com/repos/" + repository + "/releases?per_page=1", stop);
    if (releases.is_array() && !releases.empty())
    {
        for (const auto& asset : releases.front().at("assets"))
        {
            if (match(asset.at("name").get<std::string>()))
            {
                return asset;
            }
        }
    }

    throw std::runtime_error("Could not find the required download in " + repository + ".");
}

void SetupService::downloadBinary(const Json& asset,
                                  const std::string& name,
                                  const std::vector<std::string>& files,
                                  const std::stop_token& stop) const
{
    const auto temp = std::filesystem::temp_directory_path() / ("yay-setup-" + uuid());
    std::filesystem::create_directories(temp);
    const auto archive = temp / pathFromUtf8(asset.at("name").get<std::string>()).filename();
    try
    {
        m_http.download(
            asset.at("browser_download_url").get<std::string>(),
            archive,
            stop,
            [&](const int progress)
            {
                step("Downloading " + name + "... (" + std::to_string(progress) + "%)", progress);
            },
            1024ULL * 1024 * 1024,
            true);
        // Keep this initializer separate so the condition stays readable.
        // ReSharper disable once CppTooWideScopeInitStatement
        const auto digest = asset.value("digest", Json(nullptr));
        if (digest.is_string() && digest.get<std::string>().starts_with("sha256:") &&
            hashFile(archive) != digest.get<std::string>().substr(7))
        {
            throw std::runtime_error("Downloaded binary checksum verification failed.");
        }

        if (archive.extension() == ".zip")
        {
            step("Extracting " + name + "...");
            const auto extraction = temp / "extracted";
            std::vector<std::string> args{"e", pathUtf8(archive), "-r", "-o" + pathUtf8(extraction), "-aoa"};
            args.insert(args.end(), files.begin(), files.end());
            const auto result =
                runProcess(m_paths.directory / "bin" / "7za.exe", args, stop, {}, std::chrono::minutes(5));
            if (result.exitCode != 0 || result.cancelled)
            {
                throw std::runtime_error("Archive extraction failed.");
            }

            for (const auto& file : files)
            {
                std::filesystem::copy_file(
                    extraction / file, m_paths.binaries / file, std::filesystem::copy_options::overwrite_existing);
            }
        }
        else
        {
            std::filesystem::copy_file(
                archive, m_paths.binaries / files.front(), std::filesystem::copy_options::overwrite_existing);
        }

        step("Cleaning up...");
        std::filesystem::remove_all(temp);
    }
    catch (...)
    {
        std::error_code error;
        std::filesystem::remove_all(temp, error);
        throw;
    }
}

void SetupService::removeDownloadedBinaries() const
{
    if (m_downloads.busy())
    {
        throw std::runtime_error("Wait for the current download before rechecking binaries.");
    }

    for (const auto* name : {"yt-dlp.exe", "deno.exe", "ffmpeg.exe", "ffprobe.exe"})
    {
        std::filesystem::remove(m_paths.binaries / name);
    }

    m_settings.set(ipc::SettingsKey::YtDlpPath, "yt-dlp");
    m_settings.set(ipc::SettingsKey::DenoPath, "deno");
}
