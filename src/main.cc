#include "application.h"
#include "platform/process.h"
#include "metadata.h"
#include <winrt/base.h>
#include <commctrl.h>

int WINAPI wWinMain(HINSTANCE, HINSTANCE, PWSTR, int)
{
    try
    {
        winrt::init_apartment(winrt::apartment_type::single_threaded);
        checkHresult(SetCurrentProcessExplicitAppUserModelID(AppId), "Set application identity");
        INITCOMMONCONTROLSEX controls{.dwSize = sizeof(controls), .dwICC = ICC_STANDARD_CLASSES};
        InitCommonControlsEx(&controls);

        int argumentCount = 0;
        auto* arguments = CommandLineToArgvW(GetCommandLineW(), &argumentCount);
        AppOptions options;
        std::filesystem::path dataDirectory;
        for (int i = 1; i < argumentCount; ++i)
        {
            const std::wstring argument = arguments[i];
            options.arguments.push_back(utf8(argument));
            if (argument == L"--show")
            {
                options.show = true;
            }
            else if (argument == L"--updateBinaries")
            {
                options.updateBinaries = true;
            }
            else if (argument == L"--data-dir" && i + 1 < argumentCount)
            {
                dataDirectory = arguments[++i];
            }
#ifdef YAY_DEBUG_BUILD
            else if (argument == L"--skip-setup")
            {
                options.skipSetup = true;
            }
            else if (argument == L"--smoke-report" && i + 1 < argumentCount)
            {
                options.smokeReport = arguments[++i];
            }
#endif
        }

        LocalFree(arguments);
#ifdef YAY_DEBUG_BUILD
        if (!options.smokeReport.empty() && dataDirectory.empty())
        {
            throw std::runtime_error("A smoke test requires --data-dir pointing to an isolated profile.");
        }
#endif

        const auto paths = AppPaths::discover(dataDirectory);
        const auto instanceName = std::wstring(L"Local\\") + AppId + L".WebView2." + wide(hashBytes(pathUtf8(paths.data)).substr(0, 16));
        WinHandle instance(CreateMutexW(nullptr, FALSE, instanceName.c_str()));
        const auto instanceError = GetLastError();

        checkWin(static_cast<bool>(instance), "Create application instance lock");

        if (instanceError == ERROR_ALREADY_EXISTS)
        {
            HWND existing = nullptr;
            for (int attempt = 0; attempt < 100 && !existing; ++attempt)
            {
                existing = FindWindowW(L"yay.WebView2.Host", wide(pathUtf8(paths.data)).c_str());
                if (!existing)
                {
                    Sleep(50);
                }
            }

            if (existing)
            {
                const auto command = Json(options.arguments).dump();
                COPYDATASTRUCT message{.dwData = 1,
                                       .cbData = static_cast<DWORD>(command.size() + 1),
                                       .lpData = const_cast<char*>(command.c_str())};
                DWORD processId = 0;
                GetWindowThreadProcessId(existing, &processId);
                AllowSetForegroundWindow(processId);
                DWORD_PTR ignored = 0;
                SendMessageTimeoutW(existing, WM_COPYDATA, 0, reinterpret_cast<LPARAM>(&message), SMTO_ABORTIFHUNG, 5000, &ignored);
            }

            return 0;
        }

        bool relaunch = false;
        int exitCode = 0;
        std::vector<std::string> relaunchArguments;
        {
            di::ContainerBuilder builder;
            builder.bindInstance(paths);
            builder.bindInstance(options);
            builder.bind<Dispatcher>();
            builder.bind<EventBus>();
            builder.bind<WorkerPool>();
            builder.bind<Logger>();
            builder.bind<HttpClient>();
            builder.bind<SettingsService>();
            builder.bind<DownloadService>();
            builder.bind<SetupService>();
            builder.bind<TwitterService>();
            builder.bind<UpdateService>();
            builder.bind<IpcRouter>();
            builder.bind<WindowManager>();
            auto container = builder.build();
            auto application = container.create<Application>();
            exitCode = application.run();
            relaunch = application.relaunchRequested();
            relaunchArguments = application.relaunchArguments();
        }

        instance.reset();
        if (relaunch)
        {
            launchDetached(paths.executable, relaunchArguments);
        }

        return exitCode;
    }
    catch (const std::exception& error)
    {
        MessageBoxW(nullptr, wide(error.what()).c_str(), L"yay could not start", MB_OK | MB_ICONERROR);
        return 1;
    }
}
