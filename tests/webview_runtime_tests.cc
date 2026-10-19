#include "ui/webview_runtime.h"
#include <iostream>

int main()
{
    int failures = 0;
    const auto expect = [&](const bool condition, const char* message)
    {
        if (!condition)
        {
            std::cerr << message << '\n';
            ++failures;
        }
    };
    bool installed = true;
    bool consent = false;
    bool installCompletes = true;
    DWORD exitCode = ERROR_SUCCESS;
    int prompts = 0;
    int installs = 0;
    const WebViewRuntimeActions actions{
        .available = [&] { return installed; },
        .confirm = [&] { ++prompts; return consent; },
        .install = [&] { ++installs; installed = installCompletes; return exitCode; },
    };
    expect(ensureWebViewRuntime(actions) && prompts == 0 && installs == 0, "An available runtime skips setup");
    installed = false;
    expect(!ensureWebViewRuntime(actions) && prompts == 1 && installs == 0, "Declining never runs the installer");
    consent = true;
    expect(ensureWebViewRuntime(actions) && installs == 1, "Successful installation allows startup to continue");
    const auto rejects = [&](const char* expected)
    {
        installed = false;
        try
        {
            ensureWebViewRuntime(actions);
            expect(false, "Setup failure must block WebView creation");
        }
        catch (const std::exception& error)
        {
            expect(std::string(error.what()).find(expected) != std::string::npos, error.what());
        }
    };
    installCompletes = false;
    exitCode = 1603;
    rejects("1603");
    exitCode = ERROR_SUCCESS;
    rejects("still unavailable");
    exitCode = ERROR_SUCCESS_REBOOT_REQUIRED;
    rejects("requires a restart");
    installCompletes = true;
    installed = false;
    expect(ensureWebViewRuntime(actions), "A usable runtime does not require a reboot just because the installer requested one");
    auto failedDownload = actions;
    installed = false;
    failedDownload.install = []() -> DWORD { throw std::runtime_error("Download failed"); };
    try
    {
        ensureWebViewRuntime(failedDownload);
        expect(false, "Download errors must reach the startup error dialog");
    }
    catch (const std::exception& error)
    {
        expect(std::string(error.what()) == "Download failed", "Preserve the download failure reason");
    }

    return failures ? 1 : 0;
}
