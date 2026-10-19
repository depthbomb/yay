#pragma once
#include "platform/http_client.h"
#include <functional>

struct WebViewRuntimeActions
{
public:
    std::function<bool()> available;
    std::function<bool()> confirm;
    std::function<DWORD()> install;
};

bool ensureWebViewRuntime(const WebViewRuntimeActions& actions);
bool ensureWebViewRuntime(HttpClient& http, Logger& logger);
