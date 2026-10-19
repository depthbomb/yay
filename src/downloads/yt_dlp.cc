#include "downloads/yt_dlp.h"
#include "generated/ipc_contract.h"
#include "platform/platform.h"
#include <algorithm>
#include <regex>

std::vector<std::string> ytDlpArguments(const Json& settings,
                                        const AppPaths& paths,
                                        const std::string& url,
                                        const bool audioOnly)
{
    std::vector<std::string> args{"--newline", "--encoding", "utf-8"};
    if (audioOnly)
    {
        args.insert(args.end(), {"-x", "--audio-format", "mp3", "--audio-quality", "0"});
        if (settings.value(ipc::settingName(ipc::SettingsKey::UseThumbnailForCoverArt), false))
        {
            args.push_back("--embed-thumbnail");
        }
    }

    const auto output =
        pathFromUtf8(settings.at(ipc::settingName(ipc::SettingsKey::DownloadDir)).get<std::string>()) /
        pathFromUtf8(settings.at(ipc::settingName(ipc::SettingsKey::DownloadNameTemplate)).get<std::string>());
    args.insert(args.end(), {"-o", pathUtf8(output), "--ffmpeg-location", pathUtf8(paths.binaries / "ffmpeg.exe")});
    if (settings.contains(ipc::settingName(ipc::SettingsKey::CookiesFilePath)) &&
        settings.at(ipc::settingName(ipc::SettingsKey::CookiesFilePath)).is_string())
    {
        args.insert(args.end(),
                    {"--cookies", settings.at(ipc::settingName(ipc::SettingsKey::CookiesFilePath)).get<std::string>()});
    }

    if (settings.value(ipc::settingName(ipc::SettingsKey::SkipYoutubePlaylists), true))
    {
        args.push_back("--no-playlist");
    }

    if (const auto deno = settings.value(ipc::settingName(ipc::SettingsKey::DenoPath), "deno"); deno != "deno")
    {
        args.insert(args.end(), {"--js-runtimes", "deno:" + deno});
    }

    args.insert(args.end(), {"--", url});
    return args;
}

std::optional<std::string> youtubeVideoId(const std::string& url)
{
    static const std::regex pattern(
        R"((?:youtube\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/\s]{11}))", std::regex::icase);
    if (std::smatch match; std::regex_search(url, match, pattern))
    {
        return match[1].str();
    }

    return std::nullopt;
}

std::optional<double> ytDlpProgress(const std::string& line)
{
    const auto isDigit = [](const char character)
    {
        return character >= '0' && character <= '9';
    };
    for (auto percent = line.find('%'); percent != std::string::npos; percent = line.find('%', percent + 1))
    {
        auto start = percent;
        while (start > 0 && isDigit(line[start - 1]))
        {
            --start;
        }

        if (start == percent)
        {
            continue;
        }

        if (start > 1 && line[start - 1] == '.' && isDigit(line[start - 2]))
        {
            start -= 2;
            while (start > 0 && isDigit(line[start - 1]))
            {
                --start;
            }
        }

        return std::clamp(std::stod(line.substr(start, percent - start)), 0.0, 100.0);
    }

    return std::nullopt;
}

std::pair<std::string, bool> parseYtDlpUpdateOutput(const std::string& output)
{
    static const std::regex version(R"((\d{4}\.\d{2}\.\d{2}(?:\.\d+)?))");
    std::smatch match;
    std::string found;
    auto remaining = output.begin();
    while (std::regex_search(remaining, output.end(), match, version))
    {
        found = match[1].str();
        remaining = match[0].second;
    }

    if (found.empty())
    {
        throw std::runtime_error("Could not determine the yt-dlp version from its update output.");
    }

    return {found,
            output.find("Updated yt-dlp") != std::string::npos || output.find("Updated to") != std::string::npos};
}
