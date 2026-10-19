#include "services/settings_service.h"
#include <tomlplusplus/toml.hpp>
#include <iostream>
#include <sstream>

namespace
{
    int failures = 0;

    void expect(const bool condition, const std::string& message)
    {
        if (!condition)
        {
            ++failures;
            std::cerr << "FAIL: " << message << '\n';
        }
    }

    template <class Function> void rejects(Function function, const std::string& message)
    {
        try
        {
            function();
            expect(false, message);
        }
        catch (const std::exception&) {}
    }

    Json readToml(const std::filesystem::path& path)
    {
        std::ostringstream json;
        json << toml::json_formatter(toml::parse(readText(path)));
        return Json::parse(json.str());
    }

    Json legacyExport(const Json& settings)
    {
        const auto data = settings.dump();
        return {
            {"date", "2026-10-01T12:30:00.000Z"},
            {"appVersion", "1.42.1"},
            {"checksum", hashBytes(data, true, true)},
            {"data", data}
        };
    }

    void checkMigration(const std::filesystem::path& temporary, EventBus& events)
    {
        const auto paths = AppPaths::discover(temporary / "migration");
        Logger logger(paths);
        const auto oldFile = paths.data / "yay.production.cfg";
        const auto newFile = paths.data / "yay.cfg";
        const std::string original =
            "default-download-action = 'audio'\n"
            "download-dir = 'C:\\日本語\\downloads'\n"
            "cookies-file-path = ''\n"
            "enable-local-api-server = true\n"
            "local-api-server-port = 9876\n"
            "local-api-server-token = 'obsolete encrypted token'\n";
        writeAtomic(oldFile, original);
        SettingsService settings(paths, events, logger);
        expect(settings.get(ipc::SettingsKey::DefaultDownloadAction) == "audio",
               "Migration preserves existing settings");
        expect(settings.get(ipc::SettingsKey::DownloadDir) == "C:\\日本語\\downloads",
               "Migration preserves UTF-8 paths");
        expect(settings.get(ipc::SettingsKey::CookiesFilePath).get<std::string>().empty(),
               "Migration preserves empty nullable strings");
        expect(settings.get(ipc::SettingsKey::SkipYoutubePlaylists) == true, "Migration fills missing defaults");
        expect(readText(oldFile) == original, "Migration leaves the original file intact");
        const auto saved = readToml(newFile);
        expect(!saved.contains("local-api-server-token") && !saved.contains("local-api-server-port") &&
                   !saved.contains("enable-local-api-server"), "Migration discards retired API settings");
        expect(!std::filesystem::exists(paths.data / "Local State"), "Settings no longer generate API credentials");

        settings.set(ipc::SettingsKey::DefaultDownloadAction, "video");
        SettingsService reloaded(paths, events, logger);
        expect(reloaded.get(ipc::SettingsKey::DefaultDownloadAction) == "video",
               "The new file takes precedence over the retained old file");
        expect(readText(oldFile) == original, "Later saves do not modify the old file");
        reloaded.reset();
        expect(!readToml(newFile).contains("local-api-server-token"), "Reset does not recreate API credentials");

        const auto brokenPaths = AppPaths::discover(temporary / "broken");
        Logger brokenLogger(brokenPaths);
        const std::string invalid = "download-dir = [broken";
        writeAtomic(brokenPaths.data / "yay.production.cfg", invalid);
        rejects([&] { SettingsService broken(brokenPaths, events, brokenLogger); }, "Malformed legacy TOML stops migration");
        expect(!std::filesystem::exists(brokenPaths.data / "yay.cfg"), "Failed migration never creates replacement settings");
        expect(readText(brokenPaths.data / "yay.production.cfg") == invalid, "Failed migration preserves the original bytes");

        writeAtomic(newFile, invalid);
        rejects([&] { SettingsService broken(paths, events, logger); }, "A malformed new file cannot silently restore stale legacy values");
        expect(readText(newFile) == invalid, "A malformed new file is left untouched");
    }

    void checkImportExport(const std::filesystem::path& temporary, EventBus& events)
    {
        const auto paths = AppPaths::discover(temporary / "exports");
        Logger logger(paths);
        SettingsService settings(paths, events, logger);
        const auto savedFile = paths.data / "yay.cfg";
        const auto exportFile = paths.data / "yay-exported-settings.toml";
        settings.set(ipc::SettingsKey::DownloadNameTemplate, "日本語 \"quoted\" \\ %(title)s.%(ext)s");
        settings.set(ipc::SettingsKey::DefaultDownloadAction, "audio");
        const auto expected = settings.all();
        settings.exportFile(paths.data);
        const auto exported = readToml(exportFile);
        expect(exported.at("formatVersion") == 2 && exported.at("data").is_object(), "Exports use a versioned TOML data table");
        expect(exported.at("checksum") == hashBytes(exported.at("data").dump(), true, true), "Exports retain checksum verification");
        expect(!exported.at("data").contains("cookies-file-path"), "Null defaults are omitted from TOML");
        expect(!std::filesystem::exists(paths.data / "yay.production.cfg"), "New profiles only create yay.cfg");

        settings.set(ipc::SettingsKey::CookiesFilePath, "cookies.txt");
        settings.set(ipc::SettingsKey::DefaultDownloadAction, "video");
        settings.importFile(exportFile);
        expect(settings.all() == expected, "TOML import replaces settings and restores omitted null defaults");
        SettingsService reloaded(paths, events, logger);
        expect(reloaded.all() == expected, "TOML round trips through disk without changing setting values");

        settings.set(ipc::SettingsKey::CookiesFilePath, "");
        settings.exportFile(paths.data);
        settings.set(ipc::SettingsKey::CookiesFilePath, nullptr);
        settings.importFile(exportFile);
        expect(settings.get(ipc::SettingsKey::CookiesFilePath).get<std::string>().empty(),
               "TOML exports distinguish empty strings from null defaults");

        const auto legacyFile = paths.data / "legacy.json";
        auto legacy = legacyExport({
            {"download-name-template", "legacy template"},
            {"cookies-file-path", nullptr},
            {"enable-local-api-server", true},
            {"local-api-server-port", 9876},
            {"local-api-server-token", "retired"}
        });
        writeAtomic(legacyFile, "\xEF\xBB\xBF" + legacy.dump());
        settings.importFile(legacyFile);
        expect(settings.get(ipc::SettingsKey::DownloadNameTemplate) == "legacy template",
               "Legacy JSON exports without formatVersion remain importable");
        expect(settings.get(ipc::SettingsKey::CookiesFilePath).is_null(), "Legacy JSON nulls remain supported");
        expect(!settings.all().contains("local-api-server-token"), "Legacy imports discard API credentials");
        legacy["formatVersion"] = 1;
        writeAtomic(legacyFile, legacy.dump());
        settings.importFile(legacyFile);

        const auto before = settings.all();
        const auto saved = readText(savedFile);
        legacy["checksum"] = "wrong";
        writeAtomic(legacyFile, legacy.dump());
        rejects([&] { settings.importFile(legacyFile); }, "Legacy checksum mismatches remain rejected");
        settings.exportFile(paths.data);
        auto tampered = readText(exportFile);
        const auto position = tampered.find("legacy template");
        expect(position != std::string::npos, "Exported values are readable TOML");
        tampered.replace(position, std::string("legacy template").size(), "changed template");
        writeAtomic(exportFile, tampered);
        rejects([&] { settings.importFile(exportFile); }, "TOML checksum mismatches are rejected");

        legacy = legacyExport({{"download-dir", ""}});
        writeAtomic(legacyFile, legacy.dump());
        rejects([&] { settings.importFile(legacyFile); }, "Imports still validate setting values");
        expect(settings.all() == before && readText(savedFile) == saved, "Failed imports preserve memory and disk settings");
    }

    void checkInvalidStoredSettings(const std::filesystem::path& temporary, EventBus& events)
    {
        const std::vector<std::string> invalidValues{"download-dir = ['C:\\Downloads']\n",
                                                     "skip-youtube-playlists = 'yes'\n",
                                                     "default-download-action = 'invalid'\n",
                                                     "download-name-template = ''\n",
                                                     "unknown-setting = true\n"};
        for (const auto* filename : {"yay.cfg", "yay.production.cfg"})
        {
            for (size_t i = 0; i < invalidValues.size(); ++i)
            {
                const auto paths = AppPaths::discover(temporary / filename / std::to_string(i));
                Logger logger(paths);
                const auto source = paths.data / filename;
                writeAtomic(source, invalidValues[i]);
                rejects(
                    [&]
                    {
                        SettingsService invalid(paths, events, logger);
                    },
                    "Stored settings are validated before saving or migrating");
                expect(readText(source) == invalidValues[i], "Invalid stored settings retain their original bytes");
                if (source.filename() != "yay.cfg")
                {
                    expect(!std::filesystem::exists(paths.data / "yay.cfg"),
                           "Invalid legacy settings create no replacement");
                }
            }
        }
    }

    void checkFailedSaves(const std::filesystem::path& temporary, EventBus& events)
    {
        const auto paths = AppPaths::discover(temporary / "failed-saves");
        Logger logger(paths);
        SettingsService settings(paths, events, logger);
        settings.exportFile(paths.data);
        settings.set(ipc::SettingsKey::DefaultDownloadAction, "audio");
        const auto before = settings.all();
        const auto savedFile = paths.data / "yay.cfg";
        const auto saved = readText(savedFile);

        // Denying delete/write sharing makes the atomic replacement fail without changing file attributes.
        WinHandle locked(
            CreateFileW(savedFile.c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr, OPEN_EXISTING, 0, nullptr));
        checkWin(static_cast<bool>(locked), "Lock settings fixture");
        const auto failsWithoutChanges = [&](const auto& action, const std::string& operation)
        {
            rejects(action, "Failed " + operation + " reports an error");
            expect(settings.all() == before && readText(savedFile) == saved,
                   "Failed " + operation + " preserves memory and disk settings");
        };
        failsWithoutChanges(
            [&]
            {
                settings.set(ipc::SettingsKey::DefaultDownloadAction, "video");
            },
            "edit");
        failsWithoutChanges(
            [&]
            {
                settings.reset();
            },
            "reset");
        failsWithoutChanges(
            [&]
            {
                settings.importFile(paths.data / "yay-exported-settings.toml");
            },
            "import");
    }
}

int main()
{
    const auto temporary = std::filesystem::temp_directory_path() / ("yay-settings-test-" + uuid());
    try
    {
        Dispatcher dispatcher;
        EventBus events(dispatcher);
        checkMigration(temporary, events);
        checkImportExport(temporary, events);
        checkInvalidStoredSettings(temporary, events);
        checkFailedSaves(temporary, events);
    }
    catch (const std::exception& error)
    {
        ++failures;
        std::cerr << "Unexpected error: " << error.what() << '\n';
    }

    std::error_code ignored;
    std::filesystem::remove_all(temporary, ignored);
    std::cout << (failures == 0 ? "Settings checks passed.\n" : "Settings checks failed.\n");
    return failures == 0 ? 0 : 1;
}
