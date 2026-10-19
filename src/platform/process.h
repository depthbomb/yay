#pragma once
#include "platform/platform.h"
#include <functional>
#include <stop_token>

struct ProcessResult
{
public:
    DWORD exitCode = 0;
    bool cancelled = false;
    bool timedOut = false;
    std::string output;
};

std::wstring quoteArgument(const std::wstring& argument);
ProcessResult runProcess(const std::filesystem::path& executable,
                         const std::vector<std::string>& arguments,
                         const std::stop_token& stop = {},
                         const std::function<void(const std::string&)>& onLine = {},
                         std::chrono::milliseconds timeout = std::chrono::hours(24),
                         const std::filesystem::path& workingDirectory = {});
void launchDetached(const std::filesystem::path& executable, const std::vector<std::string>& arguments);
