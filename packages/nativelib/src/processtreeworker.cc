#include <string>
#include <vector>
#include <windows.h>
#include <tlhelp32.h>
#include <napi.h>
#include "processtreeworker.h"

ProcessTreeWorker::ProcessTreeWorker(const Napi::Function& callback, DWORD pid)
	: Napi::AsyncWorker(callback), m_pid(pid), m_success(false) {}

void ProcessTreeWorker::Execute()
{
	m_root.pid = m_pid;
	m_root.name = GetProcessName(m_pid);
	if (m_root.name.empty()) {
		return;
	}

	BuildProcessTree(m_root);

	m_success = true;
}

void ProcessTreeWorker::OnOK()
{
	Napi::HandleScope scope(Env());

	if (m_success) {
		Callback().Call({ ConvertToJSObject(Env(), m_root) });
	} else {
		Callback().Call({ Env().Undefined() });
	}
}

std::wstring ProcessTreeWorker::GetProcessName(DWORD pid)
{
	auto snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);

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

void ProcessTreeWorker::BuildProcessTree(ProcessNode& node)
{
	auto snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);

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

Napi::Object ProcessTreeWorker::ConvertToJSObject(Napi::Env env, const ProcessNode& node)
{
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
