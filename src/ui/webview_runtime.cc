#include "ui/webview_runtime.h"
#include "platform/process.h"
#include "metadata.h"
#include <objbase.h>
#include <WebView2.h>
#include <commctrl.h>
#include <future>
#include <wintrust.h>
#include <softpub.h>

namespace
{
    class InstallerDirectory
    {
    public:
        const std::filesystem::path path = std::filesystem::temp_directory_path() / ("yay-webview2-" + uuid());

        InstallerDirectory()
        {
            if (!std::filesystem::create_directory(path))
            {
                throw std::runtime_error("Could not create a temporary directory for the WebView2 installer.");
            }
        }

        ~InstallerDirectory()
        {
            std::error_code ignored;
            std::filesystem::remove_all(path, ignored);
        }
    };

    struct InstallProgress
    {
    public:
        std::function<DWORD(HWND)> install;
        std::future<DWORD> work;
        std::exception_ptr error;
        DWORD exitCode = 0;
        bool finished = false;
    };

    bool runtimeAvailable()
    {
        PWSTR version = nullptr;
        const auto result = GetAvailableCoreWebView2BrowserVersionString(nullptr, &version);
        const bool available = SUCCEEDED(result) && version && *version;
        CoTaskMemFree(version);
        return available;
    }

    void verifyInstaller(const std::filesystem::path& installer)
    {
        WINTRUST_FILE_INFO file{.cbStruct = sizeof(file)};
        file.pcwszFilePath = installer.c_str();
        WINTRUST_DATA trust{.cbStruct = sizeof(trust)};
        trust.dwUIChoice = WTD_UI_NONE;
        trust.fdwRevocationChecks = WTD_REVOKE_WHOLECHAIN;
        trust.dwUnionChoice = WTD_CHOICE_FILE;
        trust.pFile = &file;
        trust.dwStateAction = WTD_STATEACTION_VERIFY;
        trust.dwProvFlags = WTD_REVOCATION_CHECK_CHAIN_EXCLUDE_ROOT;
        GUID policy = WINTRUST_ACTION_GENERIC_VERIFY_V2;
        const auto result = WinVerifyTrust(nullptr, &policy, &trust);
        trust.dwStateAction = WTD_STATEACTION_CLOSE;
        WinVerifyTrust(nullptr, &policy, &trust);
        if (result != ERROR_SUCCESS)
        {
            throw std::runtime_error("The WebView2 installer signature could not be verified. Please try again. (" +
                                     std::to_string(result) + ")");
        }
    }

    DWORD runInstaller(const std::filesystem::path& installer)
    {
        // The bootstrapper manages its own installer processes. Do not put it in a download process job.
        auto command = quoteArgument(installer.wstring()) + L" /silent /install";
        STARTUPINFOW startup{.cb = sizeof(startup)};
        startup.dwFlags = STARTF_USESHOWWINDOW;
        startup.wShowWindow = SW_HIDE;
        PROCESS_INFORMATION process{};
        checkWin(CreateProcessW(installer.c_str(), command.data(), nullptr, nullptr, FALSE, CREATE_NO_WINDOW,
                                nullptr, installer.parent_path().c_str(), &startup, &process),
                 "Start WebView2 installer");
        const WinHandle processHandle(process.hProcess);
        WinHandle threadHandle(process.hThread);
        checkWin(WaitForSingleObject(processHandle.get(), INFINITE) == WAIT_OBJECT_0, "Wait for WebView2 installer");
        DWORD exitCode = 0;
        checkWin(GetExitCodeProcess(processHandle.get(), &exitCode), "Read WebView2 installer result");
        return exitCode;
    }

    HRESULT CALLBACK progressCallback(HWND const window, const UINT notification, WPARAM, LPARAM, const LONG_PTR data)
    {
        auto& progress = *reinterpret_cast<InstallProgress*>(data);
        if (notification == TDN_CREATED)
        {
            SendMessageW(window, TDM_ENABLE_BUTTON, IDOK, FALSE);
            SendMessageW(window, TDM_SET_MARQUEE_PROGRESS_BAR, TRUE, 0);
            SendMessageW(window, TDM_SET_PROGRESS_BAR_MARQUEE, TRUE, 0);
            try
            {
                progress.work = std::async(std::launch::async, [&progress, window]
                {
                    return progress.install(window);
                });
            }
            catch (...)
            {
                progress.error = std::current_exception();
                progress.finished = true;
            }
        }
        else if (notification == TDN_TIMER)
        {
            if (progress.work.valid() && progress.work.wait_for(std::chrono::seconds(0)) == std::future_status::ready)
            {
                try
                {
                    progress.exitCode = progress.work.get();
                }
                catch (...)
                {
                    progress.error = std::current_exception();
                }

                progress.finished = true;
            }

            if (progress.finished)
            {
                SendMessageW(window, TDM_ENABLE_BUTTON, IDOK, TRUE);
                SendMessageW(window, TDM_CLICK_BUTTON, IDOK, 0);
            }
        }
        else if (notification == TDN_BUTTON_CLICKED && !progress.finished)
        {
            return S_FALSE;
        }

        return S_OK;
    }

    DWORD installWithProgress(HttpClient& http)
    {
        InstallProgress progress;
        progress.install = [&http](HWND const window)
        {
            const InstallerDirectory temporary;
            const auto installer = temporary.path / "MicrosoftEdgeWebview2Setup.exe";
            http.download(WebViewRuntimeDownloadUrl, installer, {}, {}, 32 * 1024 * 1024);
            verifyInstaller(installer);
            SendMessageW(window, TDM_SET_ELEMENT_TEXT, TDE_CONTENT,
                         reinterpret_cast<LPARAM>(L"Installing the runtime. This may take a few minutes."));
            return runInstaller(installer);
        };

        TASKDIALOGCONFIG dialog{.cbSize = sizeof(dialog)};
        dialog.dwFlags = TDF_SHOW_MARQUEE_PROGRESS_BAR | TDF_CALLBACK_TIMER;
        dialog.dwCommonButtons = TDCBF_OK_BUTTON;
        dialog.pszWindowTitle = L"yay";
        dialog.pszMainInstruction = L"Setting up Microsoft Edge WebView2";
        dialog.pszContent = L"Downloading the runtime installer from Microsoft...";
        dialog.pfCallback = progressCallback;
        dialog.lpCallbackData = reinterpret_cast<LONG_PTR>(&progress);
        if (const auto result = TaskDialogIndirect(&dialog, nullptr, nullptr, nullptr); FAILED(result))
        {
            throw std::runtime_error("Could not open the WebView2 installation dialog. (" + std::to_string(result) + ")");
        }

        if (progress.error)
        {
            std::rethrow_exception(progress.error);
        }

        return progress.exitCode;
    }
} // namespace

bool ensureWebViewRuntime(const WebViewRuntimeActions& actions)
{
    if (actions.available())
    {
        return true;
    }

    if (!actions.confirm())
    {
        return false;
    }

    const auto exitCode = actions.install();
    if (exitCode != ERROR_SUCCESS && exitCode != ERROR_SUCCESS_REBOOT_REQUIRED)
    {
        throw std::runtime_error("The WebView2 installer failed with exit code " + std::to_string(exitCode) +
                                 ". Please check your internet connection and launch yay again to retry.");
    }

    if (!actions.available())
    {
        throw std::runtime_error(exitCode == ERROR_SUCCESS_REBOOT_REQUIRED
                                     ? "WebView2 installation requires a restart. Restart Windows, then launch yay again."
                                     : "The installer finished, but WebView2 is still unavailable. Restart Windows or "
                                       "install the Evergreen WebView2 Runtime manually, then launch yay again.");
    }

    return true;
}

bool ensureWebViewRuntime(HttpClient& http, Logger& logger)
{
    try
    {
        return ensureWebViewRuntime({
            .available = runtimeAvailable,
            .confirm = []
            {
                return MessageBoxW(nullptr,
                                   L"yay needs the Microsoft Edge WebView2 Runtime to display its windows.\n\n"
                                   L"Would you like to download it from Microsoft and install it now?",
                                   L"Install WebView2 Runtime?", MB_YESNO | MB_ICONQUESTION) == IDYES;
            },
            .install = [&]
            {
                logger.write("Downloading and installing Microsoft Edge WebView2 Runtime");
                const auto result = installWithProgress(http);
                logger.write("WebView2 installer exit code: " + std::to_string(result));
                return result;
            },
        });
    }
    catch (const std::exception& error)
    {
        logger.write(std::string("WebView2 setup failed: ") + error.what());
        throw;
    }
}
