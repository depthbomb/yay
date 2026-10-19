#include "services/update_service.h"
#include <future>
#include <iostream>
#include <semaphore>

namespace
{
    void expect(const bool condition, const char* message)
    {
        if (!condition)
        {
            throw std::runtime_error(message);
        }
    }

    class ReleaseClient final : public HttpClient
    {
    public:
        mutable std::binary_semaphore compareStarted{0};
        mutable std::binary_semaphore finishCompare{0};

    private:
        mutable std::mutex m_mutex;
        std::string m_version = "999.1.0";
        mutable std::vector<std::string> m_comparisons;

    public:
        Json getJson(const std::string& url, const std::stop_token&) const override
        {
            std::unique_lock lock(m_mutex);
            if (url.ends_with("/releases/latest"))
            {
                return {{"tag_name", m_version}, {"assets", Json::array()}};
            }

            m_comparisons.push_back(url);
            const auto version = m_version;
            const bool first = m_comparisons.size() == 1;
            lock.unlock();
            if (first)
            {
                compareStarted.release();
                expect(finishCompare.try_acquire_for(std::chrono::seconds(5)),
                       "Timed out releasing the first response");
            }

            return {{"commits", Json::array({{{"sha", version}}})}};
        }

        void setVersion(const std::string& version)
        {
            std::lock_guard lock(m_mutex);
            m_version = version;
        }

        std::vector<std::string> comparisons() const
        {
            std::lock_guard lock(m_mutex);
            return m_comparisons;
        }
    };

    class TemporaryEnvironment
    {
    private:
        std::wstring m_name;
        std::optional<std::wstring> m_previous;

    public:
        TemporaryEnvironment(const wchar_t* name, const std::filesystem::path& value)
            : m_name(name)
        {
            if (const DWORD size = GetEnvironmentVariableW(name, nullptr, 0))
            {
                std::wstring previous(size, L'\0');
                previous.resize(GetEnvironmentVariableW(name, previous.data(), size));
                m_previous = std::move(previous);
            }

            checkWin(SetEnvironmentVariableW(name, value.c_str()), "Set test environment");
        }

        ~TemporaryEnvironment()
        {
            SetEnvironmentVariableW(m_name.c_str(), m_previous ? m_previous->c_str() : nullptr);
        }
    };

    void checkCommitRace(UpdateService& updates, ReleaseClient& http)
    {
        expect(!updates.check(false).at("isErr"), "Initial release check succeeds");
        auto first = std::async(std::launch::async,
                                [&]
                                {
                                    return updates.commits();
                                });
        expect(http.compareStarted.try_acquire_for(std::chrono::seconds(5)), "First comparison has started");
        http.setVersion("999.2.0");
        expect(!updates.check(false).at("isErr"), "Overlapping release check succeeds");
        http.finishCompare.release();
        expect(first.get().at(0).at("sha") == "999.1.0", "An in-flight request retains its release snapshot");

        const auto current = updates.commits();
        expect(current.at(0).at("sha") == "999.2.0", "An old response cannot fill the new release's cache");
        expect(updates.commits() == current, "The current release's commits remain cached");
        const auto comparisons = http.comparisons();
        expect(comparisons.size() == 2 && comparisons[0].ends_with("...999.1.0") &&
                   comparisons[1].ends_with("...999.2.0"),
               "Exactly one comparison is fetched for each release");
    }

    void checkInstallRetry(UpdateService& updates, const std::filesystem::path& temporary)
    {
        expect(!updates.check(false).at("isErr"), "A release is available for the install attempt");
        const auto invalidDirectory = temporary / "not-a-directory";
        writeAtomic(invalidDirectory, "fixture");
        {
            TemporaryEnvironment temp(L"TEMP", invalidDirectory);
            TemporaryEnvironment tmp(L"TMP", invalidDirectory);
            std::error_code error;
            const auto unavailable = std::filesystem::temp_directory_path(error);
            expect(error && unavailable.empty(), "The fixture makes the temporary directory unavailable");
            const auto failed = updates.install();
            expect(failed.at("isErr"), "Temporary directory failure returns an IPC error");
        }

        const auto retried = updates.install();
        expect(retried.at("isErr") &&
                   retried.at("error").get<std::string>().find("expected installer asset") != std::string::npos,
               "A failed attempt releases the install guard so the user can retry");
    }
}

int main()
{
    const auto temporary = std::filesystem::temp_directory_path() / ("yay-update-tests-" + uuid());
    int result = 0;
    try
    {
        const auto paths = AppPaths::discover(temporary);
        Dispatcher dispatcher;
        EventBus events(dispatcher);
        Logger logger(paths);
        SettingsService settings(paths, events, logger);
        ReleaseClient http;
        UpdateService updates(settings, events, http, logger);
        checkCommitRace(updates, http);
        checkInstallRetry(updates, temporary);
        std::cout << "Update service checks passed.\n";
    }
    catch (const std::exception& error)
    {
        result = 1;
        std::cerr << "FAIL: " << error.what() << '\n';
    }

    std::error_code ignored;
    std::filesystem::remove_all(temporary, ignored);
    return result;
}
