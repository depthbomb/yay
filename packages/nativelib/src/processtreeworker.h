#pragma once
#include <string>
#include <vector>
#include <windows.h>
#include <tlhelp32.h>
#include <napi.h>

class ProcessTreeWorker final : public Napi::AsyncWorker {
public:
    struct ProcessNode {
        DWORD pid;
        std::wstring name;
        std::vector<ProcessNode> children;
    };

    explicit ProcessTreeWorker(const Napi::Function& callback, DWORD pid);

    void Execute() override;
    void OnOK() override;

private:
    DWORD m_pid;
    ProcessNode m_root;
    bool m_success;

    std::wstring GetProcessName(DWORD pid);
    void BuildProcessTree(ProcessNode& node);
    Napi::Object ConvertToJSObject(Napi::Env env, const ProcessNode& node);
};