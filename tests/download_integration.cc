#include <winsock2.h>
#include <ws2tcpip.h>
#include "services/download_service.h"
#include "platform/process.h"
#include <objbase.h>
#include <iostream>

int main(const int argc, char** argv)
{
    if (argc != 3)
    {
        std::cerr << "Usage: yay_download_integration <yt-dlp.exe> <ffmpeg.exe>\n";
        return 2;
    }

    if (FAILED(CoInitializeEx(nullptr, COINIT_MULTITHREADED)))
    {
        std::cerr << "Could not initialize COM for the download test.\n";
        return 1;
    }
    WSADATA sockets{};
    WSAStartup(MAKEWORD(2, 2), &sockets);
    const auto temporary = std::filesystem::temp_directory_path() / ("yay-download-test-" + uuid());
    int exitCode = 0;
    try
    {
        auto paths = AppPaths::discover(temporary);
        paths.downloads = temporary / "downloads";
        const auto ffmpeg = std::filesystem::absolute(pathFromUtf8(argv[2]));
        paths.binaries = ffmpeg.parent_path();
        const auto sample = temporary / "sample.mp4";
        const auto generated = runProcess(ffmpeg,
                                          {"-hide_banner",
                                           "-loglevel",
                                           "error",
                                           "-f",
                                           "lavfi",
                                           "-i",
                                           "color=c=blue:s=160x90:r=10",
                                           "-f",
                                           "lavfi",
                                           "-i",
                                           "sine=frequency=1000:sample_rate=44100",
                                           "-t",
                                           "1",
                                           "-c:v",
                                           "libx264",
                                           "-pix_fmt",
                                           "yuv420p",
                                           "-c:a",
                                           "aac",
                                           "-y",
                                           pathUtf8(sample)},
                                          {},
                                          {},
                                          std::chrono::seconds(20));
        if (generated.exitCode != 0)
        {
            throw std::runtime_error("Could not generate the download fixture: " + generated.output);
        }

        const auto media = readText(sample);
        const SOCKET listener = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
        sockaddr_in address{};
        address.sin_family = AF_INET;
        address.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
        address.sin_port = 0;
        if (bind(listener, reinterpret_cast<sockaddr*>(&address), sizeof(address)) || listen(listener, 5))
        {
            throw std::runtime_error("Cannot start fixture server.");
        }

        int addressSize = sizeof(address);
        getsockname(listener, reinterpret_cast<sockaddr*>(&address), &addressSize);
        const auto port = ntohs(address.sin_port);
        std::jthread server(
            [listener, &media](const std::stop_token& stop)
            {
                while (!stop.stop_requested())
                {
                    fd_set set;
                    FD_ZERO(&set);
                    FD_SET(listener, &set);
                    timeval timeout{.tv_sec = 0, .tv_usec = 100000};
                    if (select(0, &set, nullptr, nullptr, &timeout) <= 0)
                    {
                        continue;
                    }

                    const auto client = accept(listener, nullptr, nullptr);
                    if (client == INVALID_SOCKET)
                    {
                        continue;
                    }

                    DWORD deadline = 2000;
                    setsockopt(
                        client, SOL_SOCKET, SO_RCVTIMEO, reinterpret_cast<const char*>(&deadline), sizeof(deadline));
                    char request[8192]{};
                    if (const auto count = recv(client, request, sizeof(request) - 1, 0); count > 0)
                    {
                        const bool head = std::string_view(request, count).starts_with("HEAD ");
                        const auto output = "HTTP/1.1 200 OK\r\nContent-Type: video/mp4\r\nContent-Length: " +
                                            std::to_string(media.size()) + "\r\nConnection: close\r\n\r\n" +
                                            (head ? "" : media);
                        size_t sent = 0;
                        while (sent < output.size())
                        {
                            const auto bytes =
                                send(client, output.data() + sent, static_cast<int>(output.size() - sent), 0);
                            if (bytes <= 0)
                            {
                                break;
                            }

                            sent += bytes;
                        }
                    }

                    closesocket(client);
                }

                closesocket(listener);
            });

        Dispatcher dispatcher;
        EventBus events(dispatcher);
        Logger logger(paths);
        HttpClient http;
        SettingsService settings(paths, events, logger);
        settings.set(ipc::SettingsKey::YtDlpPath, pathUtf8(std::filesystem::absolute(pathFromUtf8(argv[1]))));
        settings.set(ipc::SettingsKey::DownloadNameTemplate, "%(id)s.%(ext)s");
        DownloadService downloads(paths, settings, events, http, logger);
        std::vector<Json> finished;
        std::vector<std::string> order;
        events.subscribe(
            [&](const ipc::EventChannel channel, const Json& payload)
            {
                if (channel == ipc::EventChannel::YtDlpDownloadStarted || channel == ipc::EventChannel::YtDlpDownloadFinished)
                {
                    order.emplace_back(ipc::channelName(channel));
                }

                if (channel == ipc::EventChannel::YtDlpDownloadFinished)
                {
                    finished.push_back(payload);
                }

                if (channel == ipc::EventChannel::YtDlpStdout)
                {
                    for (const auto& line : payload.at("lines"))
                    {
                        std::cout << line.get<std::string>() << '\n';
                    }
                }
            });

        const auto url = "http://127.0.0.1:" + std::to_string(port) + "/sample.mp4";
        const auto received = temporary / "http-copy.mp4";
        http.download(url, received);
        if (hashFile(received) != hashFile(sample))
        {
            throw std::runtime_error("Native HTTP download corrupted the fixture.");
        }

        downloads.enqueue(url, false);
        downloads.enqueue("http://127.0.0.1:" + std::to_string(port) + "/audio.mp4", true);
        const auto deadline = unixMillis() + 60000;
        while (finished.size() < 2 && unixMillis() < deadline)
        {
            dispatcher.drain();
            Sleep(20);
        }

        downloads.stop();
        dispatcher.drain();
        if (finished.size() != 2 || !finished[0].value("success", false) || !finished[1].value("success", false))
        {
            throw std::runtime_error("Queued video/audio downloads did not both finish successfully.");
        }

        const std::vector expected{std::string(ipc::channelName(ipc::EventChannel::YtDlpDownloadStarted)),
                                   std::string(ipc::channelName(ipc::EventChannel::YtDlpDownloadFinished)),
                                   std::string(ipc::channelName(ipc::EventChannel::YtDlpDownloadStarted)),
                                   std::string(ipc::channelName(ipc::EventChannel::YtDlpDownloadFinished))};
        if (order != expected)
        {
            throw std::runtime_error("Download queue event order was incorrect.");
        }

        bool video = false;
        bool audio = false;
        for (const auto& file : std::filesystem::directory_iterator(paths.downloads))
        {
            if (file.path().extension() == ".mp4" && file.file_size() > 0)
            {
                video = true;
            }

            if (file.path().extension() == ".mp3" && file.file_size() > 0)
            {
                audio = true;
            }
        }

        if (!video || !audio)
        {
            throw std::runtime_error("Expected MP4 and MP3 files were not produced.");
        }

        server.request_stop();
        std::cout << "Real yt-dlp video, MP3 conversion, native HTTP, and queue checks passed.\n";
    }
    catch (const std::exception& error)
    {
        std::cerr << error.what() << '\n';
        exitCode = 1;
    }

    std::error_code ignored;
    std::filesystem::remove_all(temporary, ignored);
    WSACleanup();
    CoUninitialize();
    return exitCode;
}
