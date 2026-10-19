#pragma once
#include "core/json.h"
#include <functional>
#include <string>

class IpcRouter;

// Callbacks are owned by the router; their captured dependencies must outlive queued work.
struct ApplicationActions
{
public:
    std::function<Json()> bootstrap;
    std::function<void(const std::string&)> rendererReady;
#ifdef YAY_DEBUG_BUILD
    std::function<void(const std::string&, const Json&)> recordDiagnostics;
#endif
    std::function<void()> resetSettings;
    std::function<void()> recheckBinaries;
    std::function<void()> cancelSetup;
    std::function<Json()> latestRelease;
    std::function<void(bool)> showUpdater;
    std::function<Json()> installUpdate;
};

void registerApplicationHandlers(IpcRouter& router, ApplicationActions actions);
