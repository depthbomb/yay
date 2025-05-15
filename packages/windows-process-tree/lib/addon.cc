#include <napi.h>
#include <string>
#include <vector>
#include <windows.h>
#include <tlhelp32.h>

std::wstring GetProcessName(DWORD pid) {
    HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    PROCESSENTRY32W entry = {};
    entry.dwSize = sizeof(PROCESSENTRY32W);
    std::wstring name;

    if (Process32FirstW(snapshot, &entry)) {
        do {
            if (entry.th32ProcessID == pid) {
                name = entry.szExeFile;
                break;
            }
        } while (Process32NextW(snapshot, &entry));
    }

    CloseHandle(snapshot);
    return name;
}

struct ProcessNode {
    DWORD pid;
    std::wstring name;
    std::vector<ProcessNode> children;
};

void BuildProcessTree(ProcessNode& node) {
    HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    PROCESSENTRY32 entry = {};
    entry.dwSize = sizeof(PROCESSENTRY32);

    if (Process32First(snapshot, &entry)) {
        do {
            if (entry.th32ParentProcessID == node.pid && entry.th32ProcessID != node.pid) {
                ProcessNode child;
                child.pid = entry.th32ProcessID;
                child.name = GetProcessName(child.pid);
                BuildProcessTree(child);
                node.children.push_back(child);
            }
        } while (Process32Next(snapshot, &entry));
    }

    CloseHandle(snapshot);
}

Napi::Object ConvertToJSObject(Napi::Env env, const ProcessNode& node) {
    Napi::Object obj = Napi::Object::New(env);
    const std::string name(node.name.begin(), node.name.end());

    obj.Set("pid", Napi::Number::New(env, node.pid));
    obj.Set("name", Napi::String::New(env, name));

    Napi::Array children = Napi::Array::New(env, node.children.size());
    for (size_t i = 0; i < node.children.size(); ++i) {
        children.Set(i, ConvertToJSObject(env, node.children[i]));
    }

    obj.Set("children", children);
    return obj;
}

class ProcessTreeWorker final : public Napi::AsyncWorker {
public:
    ProcessTreeWorker(const Napi::Function& callback, const DWORD pid) : AsyncWorker(callback), pid(pid), success(false) {}

    void Execute() override {
        root.pid = pid;
        root.name = GetProcessName(pid);
        if (root.name.empty()) {
            return;  // Fail silently, no tree
        }
        BuildProcessTree(root);
        success = true;
    }

    void OnOK() override {
        Napi::HandleScope scope(Env());
        if (success) {
            Callback().Call({ ConvertToJSObject(Env(), root) });
        } else {
            Callback().Call({ Env().Undefined() });
        }
    }

private:
    DWORD pid;
    ProcessNode root;
    bool success;
};

Napi::Value GetProcessTreeAsync(const Napi::CallbackInfo& info) {
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

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("getProcessTree", Napi::Function::New(env, GetProcessTreeAsync));
    return exports;
}

NODE_API_MODULE(WindowsProcessTree, Init)
