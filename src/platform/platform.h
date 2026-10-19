#pragma once
#include "core/json.h"
#include <windows.h>
#include <filesystem>
#include "core/di.h"
#include <mutex>

struct AppPaths
{
public:
    std::filesystem::path executable;
    std::filesystem::path directory;
    std::filesystem::path data;
    std::filesystem::path downloads;
    std::filesystem::path binaries;
    bool isolated = false;
    static AppPaths discover(const std::filesystem::path& overrideData = {});
};

class Logger
{
private:
    std::mutex m_mutex;
    std::filesystem::path m_path;

public:
    DI_INJECT(Logger(const AppPaths& paths));
    void write(const std::string& message);
};

class WinHandle
{
private:
    HANDLE m_handle = nullptr;

public:
    explicit WinHandle(HANDLE handle = nullptr);
    ~WinHandle();
    WinHandle(const WinHandle&) = delete;
    WinHandle& operator=(const WinHandle&) = delete;
    WinHandle(WinHandle&& other) noexcept;
    WinHandle& operator=(WinHandle&& other) noexcept;
    [[nodiscard]] HANDLE get() const;
    explicit operator bool() const;
    void reset(HANDLE handle = nullptr);
};

std::wstring wide(const std::string& value);
std::string utf8(const std::wstring& value);
std::string pathUtf8(const std::filesystem::path& path);
std::filesystem::path pathFromUtf8(const std::string& path);
std::string readText(const std::filesystem::path& path);
void writeAtomic(const std::filesystem::path& path, const std::string& contents);
std::string uuid();
int64_t unixMillis();
std::string isoDate();
std::string hashBytes(const std::string& data, bool sha512 = false, bool base64 = false);
std::string hashFile(const std::filesystem::path& path);
bool constantTimeEqual(const std::string& left, const std::string& right);
Json systemInfo();
bool isWindows11();
std::string accentColor();
void checkWin(bool success, const std::string& operation);
void checkHresult(HRESULT result, const std::string& operation);
bool reportHresult(HRESULT result, const std::string& operation, Logger* logger = nullptr);
