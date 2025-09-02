#include <windows.h>
#include "nativelib.h"
#include "processtreeworker.h"

Napi::Value GetProcessTreeAsync(const Napi::CallbackInfo& info)
{
    Napi::Env env = info.Env();

    if (info.Length() != 2 || !info[0].IsNumber() || !info[1].IsFunction()) {
        Napi::TypeError::New(env, "Expected (pid: number, callback: function)").ThrowAsJavaScriptException();
        return env.Null();
    }

    const DWORD pid = info[0].As<Napi::Number>().Uint32Value();
    const auto callback = info[1].As<Napi::Function>();

    auto* worker = new ProcessTreeWorker(callback, pid);
    worker->Queue();

    return env.Undefined();
}

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
    exports.Set("getProcessTree", Napi::Function::New(env, GetProcessTreeAsync));
    return exports;
}

NODE_API_MODULE(nativelib, Init)