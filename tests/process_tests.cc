#include "platform/process.h"
#include <iostream>
#include <thread>

namespace
{
    void expect(const bool condition, const char* message)
    {
        if (!condition)
        {
            throw std::runtime_error(message);
        }
    }

    std::string fixtureLine(const int index)
    {
        return std::to_string(index) + " 日本語: [download] 12.5% of 200 MiB";
    }

    std::string fixtureOutput()
    {
        std::string output = "\r\n\n";
        for (int i = 0; i < 40000; ++i)
        {
            output += fixtureLine(i);
            output += i % 3 == 0 ? "\r\n" : i % 3 == 1 ? "\r" : "\n";
        }

        return output + " \ntrailing text";
    }

    void writeOutput(const std::string& output)
    {
        for (size_t offset = 0; offset < output.size();)
        {
            DWORD count = 0;
            checkWin(WriteFile(GetStdHandle(STD_OUTPUT_HANDLE),
                               output.data() + offset,
                               static_cast<DWORD>(std::min<size_t>(16384, output.size() - offset)),
                               &count,
                               nullptr),
                     "Write fixture output");
            expect(count > 0, "Fixture output makes progress");
            offset += count;
        }
    }

    void checkOutput(const std::filesystem::path& executable)
    {
        std::vector<std::string> lines;
        const auto [exitCode, cancelled, timedOut, captured] = runProcess(executable,
                                                                          {"--output"},
                                                                          {},
                                                                          [&](const std::string& line)
                                                                          {
                                                                              lines.push_back(line);
                                                                          });
        expect(exitCode == 0 && !cancelled && !timedOut, "Output fixture exits normally");
        expect(lines.size() == 40002, "CR, LF and CRLF delimiters skip only empty lines");
        for (int i = 0; i < 40000; ++i)
        {
            expect(lines[i] == fixtureLine(i), "Lines remain intact across pipe reads, including UTF-8");
        }

        expect(lines[40000] == " " && lines.back() == "trailing text",
               "Whitespace and unterminated lines are delivered");
        const auto expected = fixtureOutput();
        expect(captured == expected.substr(expected.size() - 1024 * 1024), "Captured output retains the final MiB");
        const auto withoutCallback = runProcess(executable, {"--output"});
        expect(withoutCallback.exitCode == 0 && withoutCallback.output == captured,
               "Captured output is independent of the line callback");

        lines.clear();
        const auto longLine = runProcess(executable,
                                         {"--long-output"},
                                         {},
                                         [&](const std::string& line)
                                         {
                                             lines.push_back(line);
                                         });
        std::string combined;
        for (const auto& line : lines)
        {
            expect(!line.empty() && line.size() <= 81920, "Long output is delivered in bounded, nonempty chunks");
            combined += line;
        }

        expect(longLine.exitCode == 0 && lines.size() > 1 && combined == std::string(150000, 'a') &&
                   longLine.output == combined,
               "Long unterminated output loses no bytes");
    }

    void checkCancellation(const std::filesystem::path& executable)
    {
        std::stop_source cancel;
        std::jthread canceller(
            [&]
            {
                Sleep(150);
                cancel.request_stop();
            });
        const auto cancelled = runProcess(executable, {"--wait"}, cancel.get_token());
        expect(cancelled.cancelled && cancelled.exitCode != 0, "Running process cancellation");
        const auto preCancelled = runProcess("does-not-exist.exe", {}, cancel.get_token());
        expect(preCancelled.cancelled && preCancelled.exitCode == ERROR_CANCELLED,
               "A cancelled request never starts a process");
        const auto timedOut = runProcess(executable, {"--wait"}, {}, {}, std::chrono::milliseconds(150));
        expect(timedOut.timedOut && !timedOut.cancelled, "Timeout remains distinct from cancellation");
    }
}

int main(const int argc, char** argv)
{
    try
    {
        if (argc > 1)
        {
            if (const std::string mode = argv[1]; mode == "--output" || mode == "--long-output")
            {
                writeOutput(mode == "--output" ? fixtureOutput() : std::string(150000, 'a'));
            }
            else if (mode == "--echo-args")
            {
                Json args = Json::array();
                for (int i = 2; i < argc; ++i)
                {
                    args.push_back(argv[i]);
                }

                writeOutput(args.dump());
            }
            else if (mode == "--wait")
            {
                Sleep(60000);
            }
            else
            {
                throw std::runtime_error("Unknown fixture mode");
            }

            return 0;
        }

        std::wstring modulePath(32768, L'\0');
        const auto length = GetModuleFileNameW(nullptr, modulePath.data(), static_cast<DWORD>(modulePath.size()));
        expect(length > 0 && length < modulePath.size(), "Fixture executable path is available");
        modulePath.resize(length);
        const std::filesystem::path executable(modulePath);
        const std::vector<std::string> tricky{"", "with spaces", "trailing\\", "a\\\"b", "$(literal)", "--"};
        std::vector<std::string> command{"--echo-args"};
        command.insert(command.end(), tricky.begin(), tricky.end());
        const auto echoed = runProcess(executable, command);
        expect(echoed.exitCode == 0 && Json::parse(echoed.output) == Json(tricky), "Windows process argument quoting");
        checkOutput(executable);
        checkCancellation(executable);
        std::cout << "Process checks passed.\n";
        return 0;
    }
    catch (const std::exception& error)
    {
        std::cerr << "FAIL: " << error.what() << '\n';
        return 1;
    }
}
