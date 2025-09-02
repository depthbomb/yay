#pragma once
#include <napi.h>

Napi::Value GetProcessTreeAsync(const Napi::CallbackInfo& info);
Napi::Object Init(Napi::Env env, Napi::Object exports);