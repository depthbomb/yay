#include "services/settings_service.h"
#include "metadata.h"
#include <tomlplusplus/toml.hpp>
#include <sstream>

namespace
{
    Json parseToml(const std::string& text)
    {
        std::ostringstream json;
        json << toml::json_formatter(toml::parse(text));
        return Json::parse(json.str());
    }

    Json readToml(const std::filesystem::path& path)
    {
        return parseToml(readText(path));
    }

    toml::table settingsTable(const Json& settings)
    {
        toml::table table;
        for (const auto& [key, value] : settings.items())
        {
            if (value.is_string())
            {
                table.insert(key, value.get<std::string>());
            }
            else if (value.is_boolean())
            {
                table.insert(key, value.get<bool>());
            }
            else if (value.is_number_integer())
            {
                table.insert(key, value.get<int64_t>());
            }
        }

        // TOML has no null. Omitted nullable settings are restored by defaults().
        return table;
    }

    void removeRetiredSettings(Json& settings)
    {
        if (settings.is_object())
        {
            settings.erase("enable-local-api-server");
            settings.erase("local-api-server-port");
            settings.erase("local-api-server-token");
        }
    }
} // namespace

SettingsService::SettingsService(const AppPaths& paths, EventBus& events, Logger& logger) : m_paths(paths),
      m_events(events),
      m_logger(logger),
      m_file(paths.data / "yay.cfg")
{
    m_settings = defaults(paths);
    const auto source = std::filesystem::exists(m_file) ? m_file : paths.data / "yay.production.cfg";
    const bool migrating = source != m_file && std::filesystem::exists(source);
    if (std::filesystem::exists(source))
    {
        try
        {
            auto existing = readToml(source);
            removeRetiredSettings(existing);
            validate(existing);
            m_settings.update(existing);
        }
        catch (const std::exception& error)
        {
            m_logger.write(std::string("Cannot load settings: ") + error.what());
            throw std::runtime_error("The existing settings file could not be read. It has been left unchanged.");
        }
    }

    removeRetiredSettings(m_settings);
    saveLocked();
    if (migrating)
    {
        m_logger.write("Migrated settings from yay.production.cfg to yay.cfg. The original file was kept.");
    }

    loadFlags();
}

Json SettingsService::defaults(const AppPaths& paths)
{
    return ipc::settingDefaults(pathUtf8(paths.downloads));
}

Json SettingsService::get(const ipc::SettingsKey setting, const Json& fallback) const
{
    const auto key = ipc::settingName(setting);
    std::lock_guard lock(m_mutex);
    if (!m_settings.contains(key))
    {
        return fallback;
    }

    return m_settings.at(key);
}

Json SettingsService::all() const
{
    std::lock_guard lock(m_mutex);
    return m_settings;
}

Json SettingsService::flags() const
{
    return m_flags;
}

void SettingsService::set(const ipc::SettingsKey setting, const Json& value)
{
    const std::string key(ipc::settingName(setting));
    validate(Json{{key, value}});
    {
        std::lock_guard lock(m_mutex);
        if (m_settings.contains(key) && m_settings.at(key) == value)
        {
            return;
        }

        const auto previous = m_settings;
        m_settings[key] = value;
        try
        {
            saveLocked();
        }
        catch (...)
        {
            m_settings = previous;
            throw;
        }
    }

    m_events.emit<ipc::SettingsChanged>({.key = setting, .value = value});
}

void SettingsService::reset()
{
    {
        std::lock_guard lock(m_mutex);
        const auto previous = m_settings;
        m_settings = defaults(m_paths);
        try
        {
            saveLocked();
        }
        catch (...)
        {
            m_settings = previous;
            throw;
        }
    }

    m_events.emit<ipc::SettingsImported>();
}

void SettingsService::validate(const Json& settings)
{
    if (!settings.is_object())
    {
        throw std::runtime_error("Settings data must be an object.");
    }

    for (const auto& [key, value] : settings.items())
    {
        if (!ipc::validSetting(key, value))
        {
            throw std::runtime_error("Invalid or unsupported setting: " + key + ".");
        }
    }
}

void SettingsService::importFile(const std::filesystem::path& path)
{
    auto text = readText(path);
    if (text.starts_with("\xEF\xBB\xBF"))
    {
        text.erase(0, 3);
    }

    const auto first = text.find_first_not_of(" \r\n\t");
    const bool legacy = first != std::string::npos && text[first] == '{';
    const auto file = legacy ? Json::parse(text) : parseToml(text);
    if (!file.is_object() || file.value("formatVersion", 1) != (legacy ? 1 : 2) || !file.contains("date") ||
        !file.at("date").is_string() || !file.contains("appVersion") || !file.at("appVersion").is_string() ||
        !file.contains("data") || (legacy ? !file.at("data").is_string() : !file.at("data").is_object()) || !file.contains("checksum") ||
        !file.at("checksum").is_string())
    {
        throw std::runtime_error("Invalid exported settings file: missing or invalid fields.");
    }

    const auto data = legacy ? file.at("data").get<std::string>() : file.at("data").dump();
    const std::regex datePattern(
        R"(^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?Z$)");
    if (!std::regex_match(file.at("date").get<std::string>(), datePattern))
    {
        throw std::runtime_error("Invalid exported settings file: invalid date.");
    }

    if (!constantTimeEqual(hashBytes(data, true, true), file.at("checksum").get<std::string>()))
    {
        throw std::runtime_error("Settings data does not match its checksum.");
    }

    auto imported = legacy ? Json::parse(data) : file.at("data");
    removeRetiredSettings(imported);
    validate(imported);
    {
        std::lock_guard lock(m_mutex);
        const auto previous = m_settings;
        m_settings = defaults(m_paths);
        m_settings.update(imported);
        try
        {
            saveLocked();
        }
        catch (...)
        {
            m_settings = previous;
            throw;
        }
    }

    m_events.emit<ipc::SettingsImported>();
}

void SettingsService::exportFile(const std::filesystem::path& directory) const
{
    auto data = settingsTable(all());
    std::ostringstream json;
    json << toml::json_formatter(data);
    const auto checksum = hashBytes(Json::parse(json.str()).dump(), true, true);
    const toml::table exported{
        {"formatVersion", 2},
        {"date", isoDate()},
        {"appVersion", AppVersion},
        {"checksum", checksum},
        {"data", std::move(data)}
    };
    std::ostringstream stream;
    stream << exported;
    writeAtomic(directory / "yay-exported-settings.toml", stream.str());
}

void SettingsService::saveLocked() const
{
    std::ostringstream stream;
    stream << settingsTable(m_settings);
    writeAtomic(m_file, stream.str());
}

void SettingsService::loadFlags()
{
    const auto path = m_paths.data / "features.toml";
    const std::string flagId = "0196518a-ab04-74b7-b69f-98f85176382a";
    bool enabled = true;
    if (std::filesystem::exists(path))
    {
        try
        {
            for (const auto data = readToml(path); const auto& flag : data.value("featureFlags", Json::array()))
            {
                if (flag.value("uuid", "") == flagId)
                {
                    enabled = flag.value("enabled", true);
                }
            }
        }
        catch (const std::exception& error)
        {
            m_logger.write(std::string("Could not read feature flags: ") + error.what());
        }
    }
    else
    {
        writeAtomic(path,
                    "version = 1\n\n[[featureFlags]]\nuuid = \"" + flagId +
                        "\"\ndescription = \"Enable seasonal effects\"\nenabled = true\n");
    }

    m_flags = Json::array({{{"uuid", flagId}, {"description", "Enable seasonal effects"}, {"enabled", enabled}}});
}
