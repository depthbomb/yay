#include "platform/platform.h"
#include "metadata.h"
#include <shlobj.h>
#include <bcrypt.h>
#include <wincrypt.h>
#include <winternl.h>
#include <fstream>
#include <iomanip>
#include <sstream>

namespace
{
    std::string hresultMessage(const HRESULT result, const std::string& operation)
    {
        std::ostringstream message;
        message << operation << " failed (HRESULT 0x" << std::hex << std::setw(8) << std::setfill('0')
                << static_cast<unsigned long>(result) << ").";
        return message.str();
    }

    std::filesystem::path knownFolder(const KNOWNFOLDERID& id)
    {
        PWSTR value = nullptr;
        if (const auto result = SHGetKnownFolderPath(id, KF_FLAG_CREATE, nullptr, &value); FAILED(result))
        {
            throw std::runtime_error("Unable to locate Windows user folder.");
        }

        const std::filesystem::path path(value);
        CoTaskMemFree(value);
        return path;
    }

    std::string encodeBase64(const unsigned char* data, const DWORD size)
    {
        DWORD length = 0;
        CryptBinaryToStringA(data, size, CRYPT_STRING_BASE64 | CRYPT_STRING_NOCRLF, nullptr, &length);
        std::string output(length, '\0');
        checkWin(CryptBinaryToStringA(data, size, CRYPT_STRING_BASE64 | CRYPT_STRING_NOCRLF, output.data(), &length),
                 "Encode base64");
        output.resize(length);
        return output;
    }

    std::string encodeHex(const std::vector<unsigned char>& data)
    {
        std::ostringstream output;
        for (const auto value : data)
        {
            output << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(value);
        }

        return output.str();
    }

    class Hash
    {
    private:
        BCRYPT_ALG_HANDLE m_algorithm = nullptr;
        BCRYPT_HASH_HANDLE m_hash = nullptr;

    public:
        explicit Hash(const bool sha512)
        {
            if (BCryptOpenAlgorithmProvider(
                    &m_algorithm, sha512 ? BCRYPT_SHA512_ALGORITHM : BCRYPT_SHA256_ALGORITHM, nullptr, 0) < 0)
            {
                throw std::runtime_error("Cannot initialize hash provider.");
            }

            if (BCryptCreateHash(m_algorithm, &m_hash, nullptr, 0, nullptr, 0, 0) < 0)
            {
                (void)BCryptCloseAlgorithmProvider(m_algorithm, 0);
                throw std::runtime_error("Cannot create hash.");
            }
        }

        ~Hash()
        {
            (void)BCryptDestroyHash(m_hash);
            (void)BCryptCloseAlgorithmProvider(m_algorithm, 0);
        }

        void add(const char* data, const size_t length) const
        {
            if (BCryptHashData(
                    m_hash, reinterpret_cast<PUCHAR>(const_cast<char*>(data)), static_cast<ULONG>(length), 0) < 0)
            {
                throw std::runtime_error("Hash calculation failed.");
            }
        }

        std::vector<unsigned char> finish(const bool sha512) const
        {
            std::vector<unsigned char> bytes(sha512 ? 64 : 32);
            if (BCryptFinishHash(m_hash, bytes.data(), static_cast<ULONG>(bytes.size()), 0) < 0)
            {
                throw std::runtime_error("Hash calculation failed.");
            }

            return bytes;
        }
    };
} // namespace

AppPaths AppPaths::discover(const std::filesystem::path& overrideData)
{
    std::wstring buffer(32768, L'\0');
    buffer.resize(GetModuleFileNameW(nullptr, buffer.data(), static_cast<DWORD>(buffer.size())));
    AppPaths paths;
    paths.executable = buffer;
    paths.directory = paths.executable.parent_path();
    paths.data = overrideData.empty()
                     ? knownFolder(FOLDERID_RoamingAppData) / pathFromUtf8(AppCompany) / pathFromUtf8(AppDirectoryName)
                     : overrideData;
    paths.downloads = knownFolder(FOLDERID_Downloads);
    paths.binaries = paths.directory / "bin";
    paths.isolated = !overrideData.empty();
    std::filesystem::create_directories(paths.data);
    return paths;
}

Logger::Logger(const AppPaths& paths)
{
    const auto directory = paths.data / "logs";
    std::filesystem::create_directories(directory);
    m_path = directory / ("yay-" + isoDate().substr(0, 10) + ".log");
    const auto cutoff = std::filesystem::file_time_type::clock::now() - std::chrono::hours(24 * 5);
    for (const auto& entry : std::filesystem::directory_iterator(directory))
    {
        if (entry.is_regular_file() && entry.path().extension() == ".log" && entry.last_write_time() < cutoff)
        {
            std::error_code error;
            std::filesystem::remove(entry.path(), error);
        }
    }
}

void Logger::write(const std::string& message)
{
    std::lock_guard lock(m_mutex);
    std::ofstream(m_path, std::ios::app) << isoDate() << " " << message << '\n';
}

WinHandle::WinHandle(HANDLE const handle)
    : m_handle(handle)
{
}

WinHandle::~WinHandle()
{
    reset();
}

WinHandle::WinHandle(WinHandle&& other) noexcept
    : m_handle(std::exchange(other.m_handle, nullptr)) {}

WinHandle& WinHandle::operator=(WinHandle&& other) noexcept
{
    if (this != &other)
    {
        reset(std::exchange(other.m_handle, nullptr));
    }

    return *this;
}

HANDLE WinHandle::get() const
{
    return m_handle;
}

WinHandle::operator bool() const
{
    return m_handle && m_handle != INVALID_HANDLE_VALUE;
}

void WinHandle::reset(HANDLE const handle)
{
    if (*this)
    {
        CloseHandle(m_handle);
    }

    m_handle = handle;
}

std::wstring wide(const std::string& value)
{
    if (value.empty())
    {
        return {};
    }

    const int size =
        MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, value.data(), static_cast<int>(value.size()), nullptr, 0);
    checkWin(size > 0, "Decode UTF-8");
    std::wstring output(size, L'\0');
    MultiByteToWideChar(CP_UTF8, 0, value.data(), static_cast<int>(value.size()), output.data(), size);
    return output;
}

std::string utf8(const std::wstring& value)
{
    const int size =
        WideCharToMultiByte(CP_UTF8, 0, value.data(), static_cast<int>(value.size()), nullptr, 0, nullptr, nullptr);
    std::string output(size, '\0');
    WideCharToMultiByte(
        CP_UTF8, 0, value.data(), static_cast<int>(value.size()), output.data(), size, nullptr, nullptr);
    return output;
}

std::string pathUtf8(const std::filesystem::path& path)
{
    return utf8(path.wstring());
}

std::filesystem::path pathFromUtf8(const std::string& path)
{
    return std::filesystem::path(wide(path));
}

std::string readText(const std::filesystem::path& path)
{
    std::ifstream stream(path, std::ios::binary);
    if (!stream)
    {
        throw std::runtime_error("Cannot read " + pathUtf8(path));
    }

    return {std::istreambuf_iterator(stream), std::istreambuf_iterator<char>()};
}

void writeAtomic(const std::filesystem::path& path, const std::string& contents)
{
    std::filesystem::create_directories(path.parent_path());
    const auto temporary = path.wstring() + L"." + wide(uuid()) + L".tmp";
    try
    {
        std::ofstream stream(temporary, std::ios::binary | std::ios::trunc);
        stream.exceptions(std::ios::failbit | std::ios::badbit);
        stream.write(contents.data(), static_cast<std::streamsize>(contents.size()));
        stream.close();
        checkWin(MoveFileExW(temporary.c_str(), path.c_str(), MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH),
                 "Save file");
    }
    catch (...)
    {
        DeleteFileW(temporary.c_str());
        throw;
    }
}

std::string uuid()
{
    GUID value{};
    checkHresult(CoCreateGuid(&value), "Generate unique identifier");
    wchar_t buffer[40]{};
    StringFromGUID2(value, buffer, 40);
    auto result = utf8(buffer);
    result = result.substr(1, result.size() - 2);
    std::ranges::transform(result,
                           result.begin(),
                           [](const unsigned char c)
                           {
                               return static_cast<char>(tolower(c));
                           });
    return result;
}

int64_t unixMillis()
{
    return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch())
        .count();
}

std::string isoDate()
{
    SYSTEMTIME time{};
    GetSystemTime(&time);
    char buffer[40]{};
    snprintf(buffer,
             sizeof(buffer),
             "%04d-%02d-%02dT%02d:%02d:%02dZ",
             time.wYear,
             time.wMonth,
             time.wDay,
             time.wHour,
             time.wMinute,
             time.wSecond);
    return buffer;
}

std::string hashBytes(const std::string& data, const bool sha512, const bool base64)
{
    const Hash hash(sha512);
    hash.add(data.data(), data.size());
    const auto bytes = hash.finish(sha512);
    return base64 ? encodeBase64(bytes.data(), static_cast<DWORD>(bytes.size())) : encodeHex(bytes);
}

std::string hashFile(const std::filesystem::path& path)
{
    std::ifstream input(path, std::ios::binary);
    if (!input)
    {
        throw std::runtime_error("Cannot read file to verify checksum.");
    }

    const Hash hash(false);
    char buffer[65536];
    while (input.read(buffer, sizeof(buffer)) || input.gcount())
    {
        hash.add(buffer, static_cast<size_t>(input.gcount()));
    }

    if (!input.eof())
    {
        throw std::runtime_error("Could not read complete file for verification.");
    }

    return encodeHex(hash.finish(false));
}

bool constantTimeEqual(const std::string& left, const std::string& right)
{
    const auto a = hashBytes(left);
    const auto b = hashBytes(right);
    unsigned int difference = 0;
    for (size_t i = 0; i < a.size(); ++i)
    {
        difference |= static_cast<unsigned char>(a[i]) ^ static_cast<unsigned char>(b[i]);
    }

    return difference == 0;
}

Json systemInfo()
{
    RTL_OSVERSIONINFOW version{.dwOSVersionInfoSize = sizeof(version)};
    typedef LONG(WINAPI * RtlGetVersionFunction)(PRTL_OSVERSIONINFOW);
    const auto getVersion =
        reinterpret_cast<RtlGetVersionFunction>(GetProcAddress(GetModuleHandleW(L"ntdll.dll"), "RtlGetVersion"));
    if (getVersion)
    {
        getVersion(&version);
    }

    wchar_t name[MAX_COMPUTERNAME_LENGTH + 1]{};
    DWORD length = MAX_COMPUTERNAME_LENGTH + 1;
    GetComputerNameW(name, &length);
    return {{"arch", "x64"},
            {"type", "Windows_NT"},
            {"platform", "win32"},
            {"hostname", utf8(name)},
            {"release",
             std::to_string(version.dwMajorVersion) + "." + std::to_string(version.dwMinorVersion) + "." +
                 std::to_string(version.dwBuildNumber)}};
}

bool isWindows11()
{
    const auto release = systemInfo().at("release").get<std::string>();
    return std::stoi(release.substr(release.rfind('.') + 1)) >= 22000;
}

std::string accentColor()
{
    DWORD color = 0x00d77800;
    DWORD length = sizeof(color);
    RegGetValueW(HKEY_CURRENT_USER,
                 L"Software\\Microsoft\\Windows\\DWM",
                 L"AccentColor",
                 RRF_RT_REG_DWORD,
                 nullptr,
                 &color,
                 &length);
    char buffer[9]{};
    snprintf(buffer, sizeof(buffer), "%02lx%02lx%02lxff", color & 255, (color >> 8) & 255, (color >> 16) & 255);
    return buffer;
}

void checkWin(const bool success, const std::string& operation)
{
    if (!success)
    {
        throw std::runtime_error(operation + " failed (Windows error " + std::to_string(GetLastError()) + ").");
    }
}

void checkHresult(const HRESULT result, const std::string& operation)
{
    if (FAILED(result))
    {
        throw std::runtime_error(hresultMessage(result, operation));
    }
}

bool reportHresult(const HRESULT result, const std::string& operation, Logger* logger)
{
    if (SUCCEEDED(result))
    {
        return true;
    }

    const auto message = hresultMessage(result, operation);
    if (logger)
    {
        logger->write(message);
    }
    else
    {
        OutputDebugStringW(wide(message + "\n").c_str());
    }
    return false;
}
