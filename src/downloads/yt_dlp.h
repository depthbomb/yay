#pragma once
#include "core/json.h"
#include <optional>
#include <string>
#include <utility>
#include <vector>

struct AppPaths;

std::vector<std::string> ytDlpArguments(const Json& settings,
                                        const AppPaths& paths,
                                        const std::string& url,
                                        bool audioOnly);
std::optional<std::string> youtubeVideoId(const std::string& url);
std::optional<double> ytDlpProgress(const std::string& line);
std::pair<std::string, bool> parseYtDlpUpdateOutput(const std::string& output);
