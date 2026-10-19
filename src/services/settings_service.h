#pragma once
#include "core/runtime.h"
#include "platform/platform.h"

class SettingsService
{
private:
    const AppPaths& m_paths;
    EventBus& m_events;
    Logger& m_logger;
    mutable std::mutex m_mutex;
    Json m_settings;
    Json m_flags;
    std::filesystem::path m_file;

public:
    DI_INJECT(SettingsService(const AppPaths& paths, EventBus& events, Logger& logger));
    Json get(ipc::SettingsKey setting, const Json& fallback = nullptr) const;
    Json all() const;
    Json flags() const;
    void set(ipc::SettingsKey setting, const Json& value);
    void reset();
    void importFile(const std::filesystem::path& path);
    void exportFile(const std::filesystem::path& directory) const;
    static void validate(const Json& settings);
    static Json defaults(const AppPaths& paths);

private:
    void saveLocked() const;
    void loadFlags();
};
