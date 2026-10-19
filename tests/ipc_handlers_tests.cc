#include "core/ipc_router.h"
#include "ipc/application_handlers.h"
#include <iostream>

namespace
{
    void expect(const bool condition, const std::string& message)
    {
        if (!condition)
        {
            throw std::runtime_error(message);
        }
    }

    void checkApplicationHandlers(const AppPaths& paths)
    {
        Dispatcher dispatcher;
        Logger logger(paths);
        WorkerPool workers;
        IpcRouter router(dispatcher, workers, logger);
        const auto mainThread = std::this_thread::get_id();
        const Json state = {
            {"system", {{"arch", "x64"}, {"type", "Windows_NT"}, {"release", "10.0.22000"},
                        {"platform", "win32"}, {"hostname", "test-host"}}},
            {"versions", {{"webview2", "test"}}},
            {"flags", Json::array()}, {"buildDate", "2026-10-18T00:00:00Z"}
        };
        std::vector<std::string> calls;
        Json diagnostics;
        bool preview = false;
        bool installFails = false;
        bool installRejected = false;
        ApplicationActions actions;
        actions.bootstrap = [&] { return Json(state); };
        actions.rendererReady = [&](const std::string& name)
        {
            expect(std::this_thread::get_id() == mainThread, "ready must run on the dispatching thread");
            calls.push_back("ready:" + name);
        };
        actions.recordDiagnostics = [&](const std::string& name, const Json& data)
        {
            calls.push_back("diagnostics:" + name);
            diagnostics = data;
        };
        actions.resetSettings = [&] { calls.emplace_back("reset"); };
        actions.recheckBinaries = [&] { calls.emplace_back("recheck"); };
        actions.cancelSetup = [&] { calls.emplace_back("cancel"); };
        actions.latestRelease = [] { return Json(nullptr); };
        actions.showUpdater = [&](const bool requestedPreview)
        {
            preview = requestedPreview;
        };
        actions.installUpdate = [&]
        {
            expect(std::this_thread::get_id() != mainThread, "installation must run on a worker");
            if (installFails)
            {
                throw std::runtime_error("fixture install failure");
            }

            return installRejected ? ipcError("fixture rejected installation") : ipcOk({{"installed", true}});
        };
        registerApplicationHandlers(router, std::move(actions));

        const auto invoke = [&](const std::string& channel, const Json& args = Json::array())
        {
            std::optional<Json> result;
            router.dispatch({{"channel", channel}, {"args", args}},
                            {.windowName = "settings", .window = nullptr},
                            [&](Json value)
                            {
                                expect(std::this_thread::get_id() == mainThread, "replies must run on the dispatcher");
                                result = std::move(value);
                            });
            if (channel != "invalid")
            {
                expect(!result, "valid requests must defer their reply until the dispatcher drains");
            }

            const auto deadline = unixMillis() + 5000;
            while (!result && unixMillis() < deadline)
            {
                dispatcher.drain();
                Sleep(1);
            }

            expect(result.has_value(), "request timed out: " + channel);
            return *result;
        };

        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::NativeBootstrap))) == ipcOk(state), "bootstrap envelope must be unchanged");
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::NativeReady))) == ipcOk(), "ready response");
        expect(calls == std::vector<std::string>{"ready:settings"}, "ready receives the source window");
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::NativeDiagnostics)), Json::array({{{"rendered", true}}})) == ipcOk(), "diagnostics response");
        expect(diagnostics == Json{{"rendered", true}}, "diagnostics payload");
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::SettingsReset))) == ipcOk(), "reset response");
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::YtDlpRecheckBinaries))) == ipcOk(), "recheck response");
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::SetupCancel))) == ipcOk(), "cancel response");
        expect(calls == std::vector<std::string>{"ready:settings", "diagnostics:settings", "reset", "recheck", "cancel"},
               "lifecycle actions must keep request order");
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::UpdaterGetLatestRelease))) == ipcOk(nullptr), "absent release stays null");
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::UpdaterShowWindow)), Json::array({true})) == ipcOk() && preview, "preview argument");
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::UpdaterShowWindow))) == ipcOk() && !preview, "omitted preview argument");
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::UpdaterUpdate))) == ipcOk({{"installed", true}}), "worker response envelope");
        installRejected = true;
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::UpdaterUpdate))) == ipcError("fixture rejected installation"), "returned errors stay unwrapped");
        installFails = true;
        expect(invoke(std::string(ipc::channelName(ipc::RequestChannel::UpdaterUpdate))) == ipcError("fixture install failure"), "worker exceptions become errors");
        expect(invoke("invalid").at("isErr") == true, "invalid requests fail immediately");
        workers.stop();
        dispatcher.drain();
    }
}

int main()
{
    const auto temporary = std::filesystem::temp_directory_path() / ("yay-ipc-tests-" + uuid());
    try
    {
        checkApplicationHandlers(AppPaths::discover(temporary));
        std::filesystem::remove_all(temporary);
        std::cout << "Application IPC routing and threading checks passed.\n";
    }
    catch (const std::exception& error)
    {
        std::cerr << error.what() << '\n';
        return 1;
    }

    return 0;
}
