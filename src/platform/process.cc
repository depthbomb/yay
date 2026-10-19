#include "platform/process.h"

std::wstring quoteArgument(const std::wstring& argument)
{
    std::wstring result = L"\"";
    size_t slashes = 0;
    for (const auto character : argument)
    {
        if (character == L'\\')
        {
            ++slashes;
            continue;
        }

        if (character == L'\"')
        {
            result.append(slashes * 2 + 1, L'\\');
        }
        else
        {
            result.append(slashes, L'\\');
        }

        result += character;
        slashes = 0;
    }

    result.append(slashes * 2, L'\\');
    result += L'\"';
    return result;
}

ProcessResult runProcess(const std::filesystem::path& executable,
                         const std::vector<std::string>& arguments,
                         const std::stop_token& stop,
                         const std::function<void(const std::string&)>& onLine,
                         const std::chrono::milliseconds timeout,
                         const std::filesystem::path& workingDirectory)
{
    if (stop.stop_requested())
    {
        return {.exitCode = ERROR_CANCELLED, .cancelled = true, .timedOut = false, .output = {}};
    }

    std::wstring command = quoteArgument(executable.wstring());
    for (const auto& argument : arguments)
    {
        command += L" " + quoteArgument(wide(argument));
    }

    SECURITY_ATTRIBUTES security{.nLength = sizeof(security), .lpSecurityDescriptor = nullptr, .bInheritHandle = TRUE};
    HANDLE readPipeRaw = nullptr;
    HANDLE writePipeRaw = nullptr;
    checkWin(CreatePipe(&readPipeRaw, &writePipeRaw, &security, 0), "Create process output pipe");
    WinHandle readPipe(readPipeRaw);
    WinHandle writePipe(writePipeRaw);
    checkWin(SetHandleInformation(readPipe.get(), HANDLE_FLAG_INHERIT, 0), "Configure process pipe");
    WinHandle nullInput(
        CreateFileW(L"NUL", GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, &security, OPEN_EXISTING, 0, nullptr));
    WinHandle job(CreateJobObjectW(nullptr, nullptr));
    checkWin(static_cast<bool>(job), "Create process job");
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits{};
    limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    checkWin(SetInformationJobObject(job.get(), JobObjectExtendedLimitInformation, &limits, sizeof(limits)),
             "Configure process job");

    STARTUPINFOEXW startup{};
    startup.StartupInfo.cb = sizeof(startup);
    startup.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
    startup.StartupInfo.hStdInput = nullInput.get();
    startup.StartupInfo.hStdOutput = writePipe.get();
    startup.StartupInfo.hStdError = writePipe.get();
    SIZE_T attributeBytes = 0;
    InitializeProcThreadAttributeList(nullptr, 1, 0, &attributeBytes);
    std::vector<unsigned char> attributeStorage(attributeBytes);
    startup.lpAttributeList = reinterpret_cast<LPPROC_THREAD_ATTRIBUTE_LIST>(attributeStorage.data());
    checkWin(InitializeProcThreadAttributeList(startup.lpAttributeList, 1, 0, &attributeBytes),
             "Initialize process attributes");
    HANDLE const inherited[] = {writePipe.get(), nullInput.get()};
    const bool attributesOk = UpdateProcThreadAttribute(startup.lpAttributeList,
                                                        0,
                                                        PROC_THREAD_ATTRIBUTE_HANDLE_LIST,
                                                        const_cast<HANDLE*>(inherited),
                                                        sizeof(inherited),
                                                        nullptr,
                                                        nullptr) != FALSE;
    if (!attributesOk)
    {
        DeleteProcThreadAttributeList(startup.lpAttributeList);
        checkWin(false, "Configure inherited process handles");
    }

    PROCESS_INFORMATION process{};
    const auto cwd = workingDirectory.wstring();
    const bool created = CreateProcessW(nullptr,
                                        command.data(),
                                        nullptr,
                                        nullptr,
                                        TRUE,
                                        CREATE_NO_WINDOW | CREATE_SUSPENDED | EXTENDED_STARTUPINFO_PRESENT,
                                        nullptr,
                                        cwd.empty() ? nullptr : cwd.c_str(),
                                        &startup.StartupInfo,
                                        &process) != FALSE;
    const DWORD createError = GetLastError();
    DeleteProcThreadAttributeList(startup.lpAttributeList);
    if (!created)
    {
        SetLastError(createError);
        checkWin(false, "Start " + pathUtf8(executable));
    }

    WinHandle processHandle(process.hProcess);
    WinHandle threadHandle(process.hThread);
    if (!AssignProcessToJobObject(job.get(), processHandle.get()))
    {
        TerminateProcess(processHandle.get(), 1);
        throw std::runtime_error("Cannot track the download process tree.");
    }

    ResumeThread(threadHandle.get());
    writePipe.reset();
    const auto started = std::chrono::steady_clock::now();
    ProcessResult result;
    std::string pending;
    bool exited = false;
    for (;;)
    {
        if (const bool expired = std::chrono::steady_clock::now() - started > timeout; stop.stop_requested() || expired)
        {
            result.cancelled = stop.stop_requested();
            result.timedOut = expired;
            TerminateJobObject(job.get(), ERROR_CANCELLED);
            WaitForSingleObject(processHandle.get(), 5000);
            break;
        }

        DWORD available = 0;
        const bool pipeOpen = PeekNamedPipe(readPipe.get(), nullptr, 0, nullptr, &available, nullptr) != FALSE;
        if (pipeOpen && available > 0)
        {
            char buffer[16384];
            DWORD count = 0;
            if (ReadFile(readPipe.get(), buffer, std::min<DWORD>(available, sizeof(buffer)), &count, nullptr) && count)
            {
                result.output.append(buffer, count);
                if (result.output.size() > 1024 * 1024)
                {
                    result.output.erase(0, result.output.size() - 1024 * 1024);
                }

                pending.append(buffer, count);
                size_t newline = 0;
                while ((newline = pending.find_first_of("\r\n")) != std::string::npos)
                {
                    const auto line = pending.substr(0, newline);
                    pending.erase(0, newline + 1);
                    if (onLine && !line.empty())
                    {
                        onLine(line);
                    }
                }

                if (pending.size() > 65536)
                {
                    if (onLine)
                    {
                        onLine(pending);
                    }

                    pending.clear();
                }
            }

            continue;
        }

        if (exited || !pipeOpen)
        {
            if (WaitForSingleObject(processHandle.get(), 20) == WAIT_OBJECT_0)
            {
                break;
            }
        }

        exited = WaitForSingleObject(processHandle.get(), 20) == WAIT_OBJECT_0;
    }

    if (onLine && !pending.empty())
    {
        onLine(pending);
    }

    GetExitCodeProcess(processHandle.get(), &result.exitCode);
    return result;
}

void launchDetached(const std::filesystem::path& executable, const std::vector<std::string>& arguments)
{
    std::wstring command = quoteArgument(executable.wstring());
    for (const auto& argument : arguments)
    {
        command += L" " + quoteArgument(wide(argument));
    }

    STARTUPINFOW startup{.cb = sizeof(startup)};
    PROCESS_INFORMATION process{};
    checkWin(CreateProcessW(executable.c_str(),
                            command.data(),
                            nullptr,
                            nullptr,
                            FALSE,
                            DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP,
                            nullptr,
                            executable.parent_path().c_str(),
                            &startup,
                            &process),
             "Launch application");
    CloseHandle(process.hThread);
    CloseHandle(process.hProcess);
}
