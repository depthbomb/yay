#pragma once
#include <nlohmann/json.hpp>
typedef nlohmann::json Json;

inline Json ipcOk(Json data = Json::object())
{
    return {{"isOk", true}, {"isErr", false}, {"data", std::move(data)}};
}

inline Json ipcError(const std::string& message)
{
    return {{"isOk", false}, {"isErr", true}, {"error", message}};
}
