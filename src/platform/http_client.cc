#include "platform/http_client.h"
#include "metadata.h"
#include <winhttp.h>
#include <fstream>
#include <sstream>

namespace
{
    class HttpHandle
    {
    private:
        HINTERNET m_value;

    public:
        explicit HttpHandle(const HINTERNET value) : m_value(value)
        {
            checkWin(value != nullptr, "Initialize HTTP request");
        }

        ~HttpHandle()
        {
            WinHttpCloseHandle(m_value);
        }

        HINTERNET get() const
        {
            return m_value;
        }
    };

    void request(const std::string& url,
                 const std::stop_token& stop,
                 const uint64_t maxBytes,
                 const std::function<void(const char*, size_t)>& write,
                 const std::function<void(int)>& progress,
                 const bool trustedOnly)
    {
        const auto [scheme, host, path, port] = parseUrl(url);
        if (scheme != "https" && scheme != "http")
        {
            throw std::runtime_error("Unsupported URL scheme.");
        }

        const auto userAgent = host == "cdn.syndication.twimg.com"
                                   ? std::string("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, "
                                                 "like Gecko) Chrome/143.0.0.0 Safari/537.36")
                                   : std::string(AppName) + "/" + AppVersion;
        const HttpHandle session(
            WinHttpOpen(wide(userAgent).c_str(), WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY, nullptr, nullptr, 0));
        WinHttpSetTimeouts(session.get(), 10000, 10000, 10000, 10000);
        const HttpHandle connection(WinHttpConnect(session.get(), wide(host).c_str(), port, 0));
        const HttpHandle response(WinHttpOpenRequest(connection.get(),
                                                     L"GET",
                                                     wide(path).c_str(),
                                                     nullptr,
                                                     nullptr,
                                                     nullptr,
                                                     scheme == "https" ? WINHTTP_FLAG_SECURE : 0));
        constexpr DWORD redirectPolicy = WINHTTP_OPTION_REDIRECT_POLICY_DISALLOW_HTTPS_TO_HTTP;
        WinHttpSetOption(response.get(),
                         WINHTTP_OPTION_REDIRECT_POLICY,
                         const_cast<DWORD*>(&redirectPolicy),
                         sizeof(redirectPolicy));
        if (stop.stop_requested())
        {
            throw std::runtime_error("Operation cancelled.");
        }

        checkWin(WinHttpSendRequest(
                     response.get(), L"Accept: application/json, */*\r\n", static_cast<DWORD>(-1), nullptr, 0, 0, 0),
                 "Send HTTP request");
        checkWin(WinHttpReceiveResponse(response.get(), nullptr), "Receive HTTP response");
        DWORD status = 0;
        DWORD bytes = sizeof(status);
        checkWin(WinHttpQueryHeaders(response.get(),
                                     WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
                                     nullptr,
                                     &status,
                                     &bytes,
                                     nullptr),
                 "Read HTTP status");
        if (status < 200 || status >= 300)
        {
            throw std::runtime_error("Request failed with HTTP " + std::to_string(status) + ".");
        }

        if (trustedOnly)
        {
            DWORD urlBytes = 0;
            WinHttpQueryOption(response.get(), WINHTTP_OPTION_URL, nullptr, &urlBytes);
            std::wstring finalUrl(urlBytes / sizeof(wchar_t), L'\0');
            checkWin(WinHttpQueryOption(response.get(), WINHTTP_OPTION_URL, finalUrl.data(), &urlBytes),
                     "Check download origin");
            finalUrl.resize(wcslen(finalUrl.c_str()));
            if (!trustedReleaseUrl(utf8(finalUrl)))
            {
                throw std::runtime_error("Release download redirected to an untrusted host.");
            }
        }

        wchar_t lengthBuffer[64]{};
        bytes = sizeof(lengthBuffer);
        uint64_t expected = 0;
        if (WinHttpQueryHeaders(response.get(), WINHTTP_QUERY_CONTENT_LENGTH, nullptr, lengthBuffer, &bytes, nullptr))
        {
            expected = _wcstoui64(lengthBuffer, nullptr, 10);
        }

        if (expected > maxBytes)
        {
            throw std::runtime_error("Download exceeds the permitted file size.");
        }

        uint64_t received = 0;
        int lastPercent = -1;
        char buffer[65536];
        for (;;)
        {
            if (stop.stop_requested())
            {
                throw std::runtime_error("Operation cancelled.");
            }

            DWORD count = 0;
            checkWin(WinHttpReadData(response.get(), buffer, sizeof(buffer), &count), "Read HTTP response");
            if (!count)
            {
                break;
            }

            received += count;
            if (received > maxBytes)
            {
                throw std::runtime_error("Download exceeds the permitted file size.");
            }

            write(buffer, count);
            // Keep this initializer separate so the condition stays readable.
            // ReSharper disable once CppTooWideScopeInitStatement
            const int percent = expected ? static_cast<int>(std::min<uint64_t>(100, received * 100 / expected)) : -1;
            if (progress && percent != lastPercent)
            {
                lastPercent = percent;
                progress(percent);
            }
        }

        if (expected && received != expected)
        {
            throw std::runtime_error("The download ended before the complete file was received.");
        }
    }
} // namespace

ParsedUrl parseUrl(const std::string& input)
{
    const auto value = wide(input);
    URL_COMPONENTS parts{.dwStructSize = sizeof(parts)};
    parts.dwSchemeLength = parts.dwHostNameLength = parts.dwUrlPathLength = parts.dwExtraInfoLength =
        static_cast<DWORD>(-1);
    if (!WinHttpCrackUrl(value.c_str(), static_cast<DWORD>(value.size()), 0, &parts) || !parts.dwHostNameLength)
    {
        throw std::runtime_error("Invalid URL.");
    }

    ParsedUrl result;
    result.scheme = utf8(std::wstring(parts.lpszScheme, parts.dwSchemeLength));
    result.host = utf8(std::wstring(parts.lpszHostName, parts.dwHostNameLength));
    std::ranges::transform(result.host,
                           result.host.begin(),
                           [](const unsigned char c)
                           {
                               return static_cast<char>(tolower(c));
                           });
    result.path = utf8(std::wstring(parts.lpszUrlPath, parts.dwUrlPathLength));
    if (result.path.empty())
    {
        result.path = "/";
    }

    result.path += utf8(std::wstring(parts.lpszExtraInfo, parts.dwExtraInfoLength));
    result.path = result.path.substr(0, result.path.find('#'));
    result.port = parts.nPort;
    return result;
}

bool validMediaUrl(const std::string& input)
{
    try
    {
        const auto url = parseUrl(input);
        return (url.scheme == "http" || url.scheme == "https") &&
               input.find_first_of("\r\n\0", 0, 3) == std::string::npos;
    }
    catch (...)
    {
        return false;
    }
}

bool allowedExternalUrl(const std::string& input)
{
    try
    {
        const auto url = parseUrl(input);
        return url.scheme == "https" &&
               (url.host == "github.com" || url.host == "electronjs.org" || url.host.ends_with(".electronjs.org"));
    }
    catch (...)
    {
        return false;
    }
}

bool trustedReleaseUrl(const std::string& input)
{
    const auto url = parseUrl(input);
    return url.scheme == "https" && url.port == 443 &&
           (url.host == "github.com" || url.host == "objects.githubusercontent.com" ||
            url.host == "release-assets.githubusercontent.com");
}

// The HTTP client is an injected service, including its stateless operations.
// ReSharper disable once CppMemberFunctionMayBeStatic
std::string HttpClient::get(const std::string& url,
                            const std::stop_token& stop,
                            const size_t maxBytes,
                            const bool trustedReleaseOnly) const
{
    std::string result;
    request(
        url,
        stop,
        maxBytes,
        [&result](const char* bytes, const size_t length)
        {
            result.append(bytes, length);
        },
        {},
        trustedReleaseOnly);
    return result;
}

Json HttpClient::getJson(const std::string& url, const std::stop_token& stop) const
{
    return Json::parse(get(url, stop));
}

// ReSharper disable once CppMemberFunctionMayBeStatic
void HttpClient::download(const std::string& url,
                          const std::filesystem::path& destination,
                          const std::stop_token& stop,
                          const std::function<void(int)>& progress,
                          const uint64_t maxBytes,
                          const bool trustedReleaseOnly) const
{
    std::filesystem::create_directories(destination.parent_path());
    const auto temporary = destination.wstring() + L"." + wide(uuid()) + L".part";
    try
    {
        std::ofstream output(temporary, std::ios::binary | std::ios::trunc);
        output.exceptions(std::ios::failbit | std::ios::badbit);
        request(
            url,
            stop,
            maxBytes,
            [&output](const char* bytes, const size_t length)
            {
                output.write(bytes, static_cast<std::streamsize>(length));
            },
            progress,
            trustedReleaseOnly);
        output.close();
        checkWin(
            MoveFileExW(temporary.c_str(), destination.c_str(), MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH),
            "Save download");
    }
    catch (...)
    {
        DeleteFileW(temporary.c_str());
        throw;
    }
}

std::string decodeUrl(const std::string& input)
{
    std::string result;
    for (size_t i = 0; i < input.size(); ++i)
    {
        if (input[i] == '%' && i + 2 < input.size() && isxdigit(static_cast<unsigned char>(input[i + 1])) &&
            isxdigit(static_cast<unsigned char>(input[i + 2])))
        {
            result += static_cast<char>(std::stoi(input.substr(i + 1, 2), nullptr, 16));
            i += 2;
        }
        else
        {
            result += input[i] == '+' ? ' ' : input[i];
        }
    }

    return result;
}

std::string encodeUrl(const std::string& input)
{
    std::string result;
    for (const unsigned char c : input)
    {
        if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~')
        {
            result += static_cast<char>(c);
        }
        else
        {
            constexpr char digits[] = "0123456789ABCDEF";
            result += '%';
            result += digits[c >> 4];
            result += digits[c & 15];
        }
    }

    return result;
}

std::map<std::string, std::string> urlQuery(const std::string& input)
{
    std::map<std::string, std::string> result;
    const auto start = input.find('?');
    if (start == std::string::npos)
    {
        return result;
    }

    std::istringstream stream(input.substr(start + 1));
    std::string pair;
    while (std::getline(stream, pair, '&'))
    {
        if (const auto equals = pair.find('='); equals != std::string::npos)
        {
            result.emplace(decodeUrl(pair.substr(0, equals)), decodeUrl(pair.substr(equals + 1)));
        }
    }

    return result;
}
