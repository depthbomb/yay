#include "platform/desktop.h"
#include "platform/http_client.h"
#include "platform/process.h"
#include "metadata.h"
#include <commctrl.h>
#include <shlobj.h>
#include <shellapi.h>
#include <propsys.h>
#include <propkey.h>
#include <propvarutil.h>
#include <wrl.h>
// Declare XmlDocument directly rather than relying on the notifications header.
// ReSharper disable once CppUnusedIncludeDirective
#include <winrt/Windows.Data.Xml.Dom.h>
#include <winrt/Windows.UI.Notifications.h>

namespace
{
    void registryString(const std::wstring& path, const wchar_t* name, const std::wstring& value)
    {
        HKEY key = nullptr;
        const auto result =
            RegCreateKeyExW(HKEY_CURRENT_USER, path.c_str(), 0, nullptr, 0, KEY_SET_VALUE, nullptr, &key, nullptr);
        if (result != ERROR_SUCCESS)
        {
            throw std::runtime_error("Could not update application registration.");
        }

        const auto written = RegSetValueExW(key,
                                            name,
                                            0,
                                            REG_SZ,
                                            reinterpret_cast<const BYTE*>(value.c_str()),
                                            static_cast<DWORD>((value.size() + 1) * sizeof(wchar_t)));
        RegCloseKey(key);
        if (written != ERROR_SUCCESS)
        {
            throw std::runtime_error("Could not save application registration.");
        }
    }

    std::string xmlEscape(const std::string& text)
    {
        std::string result;
        for (const auto c : text)
        {
            switch (c)
            {
            case '&':
                result += "&amp;";
                break;
            case '<':
                result += "&lt;";
                break;
            case '>':
                result += "&gt;";
                break;
            case '"':
                result += "&quot;";
                break;
            case '\'':
                result += "&apos;";
                break;
            default:
                result += c;
                break;
            }
        }

        return result;
    }
} // namespace

Json showMessageBox(HWND const owner, const Json& options)
{
    const auto title = wide(options.value("title", std::string(AppName)));
    const auto message = wide(options.value("message", ""));
    const auto detail = wide(options.value("detail", ""));
    const auto checkbox = wide(options.value("checkboxLabel", ""));
    const auto labels = options.value("buttons", std::vector<std::string>{"OK"});
    std::vector<std::wstring> texts;
    for (const auto& label : labels)
    {
        texts.push_back(wide(label));
    }

    std::vector<TASKDIALOG_BUTTON> buttons;
    for (size_t i = 0; i < texts.size(); ++i)
    {
        buttons.push_back({.nButtonID = 100 + static_cast<int>(i), .pszButtonText = texts[i].c_str()});
    }

    TASKDIALOGCONFIG config{.cbSize = sizeof(config)};
    config.hwndParent = owner;
    config.dwFlags = TDF_ALLOW_DIALOG_CANCELLATION | TDF_POSITION_RELATIVE_TO_WINDOW | TDF_SIZE_TO_CONTENT;
    if (options.value("checkboxChecked", false))
    {
        config.dwFlags |= TDF_VERIFICATION_FLAG_CHECKED;
    }

    const auto type = options.value("type", "info");
    config.pszMainIcon = type == "error" ? TD_ERROR_ICON : type == "warning" ? TD_WARNING_ICON : TD_INFORMATION_ICON;
    config.pszWindowTitle = title.c_str();
    config.pszContent = message.c_str();
    config.pszExpandedInformation = detail.empty() ? nullptr : detail.c_str();
    config.pszVerificationText = checkbox.empty() ? nullptr : checkbox.c_str();
    config.cButtons = static_cast<UINT>(buttons.size());
    config.pButtons = buttons.data();
    config.nDefaultButton = 100 + options.value("defaultId", 0);
    int selected = IDCANCEL;
    BOOL checked = FALSE;
    if (const auto result = TaskDialogIndirect(&config, &selected, nullptr, &checked); FAILED(result))
    {
        throw std::runtime_error("Unable to show the message dialog.");
    }

    return {
        {"response", selected >= 100 ? selected - 100 : options.value("cancelId", static_cast<int>(labels.size() - 1))},
        {"checkboxChecked", checked != FALSE}};
}

std::optional<std::filesystem::path> pickPath(HWND const owner,
                                              const std::wstring& title,
                                              const bool folder,
                                              const std::wstring& filter,
                                              const std::filesystem::path& initial)
{
    Microsoft::WRL::ComPtr<IFileOpenDialog> dialog;
    if (FAILED(CoCreateInstance(CLSID_FileOpenDialog, nullptr, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&dialog))))
    {
        throw std::runtime_error("Unable to create the file picker.");
    }

    DWORD options = 0;
    checkHresult(dialog->GetOptions(&options), "Read file picker options");
    checkHresult(dialog->SetOptions(options | FOS_FORCEFILESYSTEM | FOS_PATHMUSTEXIST |
                                    (folder ? FOS_PICKFOLDERS : FOS_FILEMUSTEXIST)),
                 "Set file picker options");
    reportHresult(dialog->SetTitle(title.c_str()), "Set file picker title");
    if (!filter.empty())
    {
        const COMDLG_FILTERSPEC types[] = {{.pszName = filter.c_str(), .pszSpec = filter.c_str()}};
        checkHresult(dialog->SetFileTypes(1, types), "Set file picker filter");
    }

    if (!initial.empty())
    {
        Microsoft::WRL::ComPtr<IShellItem> item;
        if (SUCCEEDED(SHCreateItemFromParsingName(initial.c_str(), nullptr, IID_PPV_ARGS(&item))))
        {
            reportHresult(dialog->SetFolder(item.Get()), "Set file picker initial folder");
        }
    }

    const auto shown = dialog->Show(owner);
    if (shown == HRESULT_FROM_WIN32(ERROR_CANCELLED))
    {
        return std::nullopt;
    }

    if (FAILED(shown))
    {
        throw std::runtime_error("The file picker failed.");
    }

    Microsoft::WRL::ComPtr<IShellItem> selected;
    checkHresult(dialog->GetResult(&selected), "Read selected file");
    PWSTR name = nullptr;
    if (FAILED(selected->GetDisplayName(SIGDN_FILESYSPATH, &name)))
    {
        throw std::runtime_error("The selected file has no local path.");
    }

    std::filesystem::path path(name);
    CoTaskMemFree(name);
    return path;
}

void openPath(const std::filesystem::path& path)
{
    const auto result =
        reinterpret_cast<INT_PTR>(ShellExecuteW(nullptr, L"open", path.c_str(), nullptr, nullptr, SW_SHOWNORMAL));
    if (result <= 32)
    {
        throw std::runtime_error("Could not open " + pathUtf8(path));
    }
}

void openExternal(const std::string& url)
{
    if (allowedExternalUrl(url))
    {
        ShellExecuteW(nullptr, L"open", wide(url).c_str(), nullptr, nullptr, SW_SHOWNORMAL);
    }
}

std::string readClipboard(HWND const owner)
{
    if (!OpenClipboard(owner))
    {
        return {};
    }

    std::string text;
    if (const auto memory = GetClipboardData(CF_UNICODETEXT))
    {
        if (const auto data = static_cast<const wchar_t*>(GlobalLock(memory)))
        {
            text = utf8(data);
            GlobalUnlock(memory);
        }
    }

    CloseClipboard();
    return text;
}

void writeClipboard(HWND const owner, const std::string& text)
{
    const auto value = wide(text);
    const auto bytes = (value.size() + 1) * sizeof(wchar_t);
    const auto memory = GlobalAlloc(GMEM_MOVEABLE, bytes);
    checkWin(memory != nullptr, "Allocate clipboard text");
    auto* destination = GlobalLock(memory);
    if (!destination)
    {
        GlobalFree(memory);
        throw std::runtime_error("Cannot lock clipboard memory.");
    }

    memcpy(destination, value.c_str(), bytes);
    GlobalUnlock(memory);
    if (!OpenClipboard(owner))
    {
        GlobalFree(memory);
        throw std::runtime_error("The clipboard is currently unavailable.");
    }

    EmptyClipboard();
    const bool success = SetClipboardData(CF_UNICODETEXT, memory) != nullptr;
    CloseClipboard();
    if (!success)
    {
        GlobalFree(memory);
        throw std::runtime_error("Could not update the clipboard.");
    }
}

bool autoStartEnabled()
{
    DWORD bytes = 0;
    return RegGetValueW(HKEY_CURRENT_USER,
                        L"Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                        L"yay",
                        RRF_RT_REG_SZ,
                        nullptr,
                        nullptr,
                        &bytes) == ERROR_SUCCESS;
}

void setAutoStart(const AppPaths& paths, const bool enabled)
{
    if (paths.isolated)
    {
        return;
    }

    if (enabled)
    {
        registryString(L"Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                       wide(AppName).c_str(),
                       quoteArgument(paths.executable.wstring()) + L" --autostart");
    }
    else
    {
        RegDeleteKeyValueW(
            HKEY_CURRENT_USER, L"Software\\Microsoft\\Windows\\CurrentVersion\\Run", wide(AppName).c_str());
    }
}

void registerProtocol(const AppPaths& paths)
{
    if (paths.isolated)
    {
        return;
    }

    const auto protocol = wide(AppUrlProtocol);
    const auto key = L"Software\\Classes\\" + protocol;
    registryString(key, nullptr, L"URL:" + protocol + L" protocol");
    registryString(key, L"URL Protocol", L"");
    registryString(key + L"\\DefaultIcon", nullptr, quoteArgument(paths.executable.wstring()) + L",0");
    registryString(key + L"\\shell\\open\\command", nullptr, quoteArgument(paths.executable.wstring()) + LR"( "%1")");
}

void registerNotificationShortcut(const AppPaths& paths)
{
    if (paths.isolated)
    {
        return;
    }

    PWSTR programs = nullptr;
    checkHresult(SHGetKnownFolderPath(FOLDERID_Programs, KF_FLAG_CREATE, nullptr, &programs),
                 "Locate the Programs folder");
    const auto shortcut = std::filesystem::path(programs) / wide(AppCompany) / (wide(AppName) + L".lnk");
    CoTaskMemFree(programs);
    std::filesystem::create_directories(shortcut.parent_path());
    Microsoft::WRL::ComPtr<IShellLinkW> link;
    checkHresult(CoCreateInstance(CLSID_ShellLink, nullptr, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&link)),
                 "Create shortcut");
    checkHresult(link->SetPath(paths.executable.c_str()), "Set notification shortcut target");
    checkHresult(link->SetWorkingDirectory(paths.directory.c_str()), "Set notification shortcut directory");
    checkHresult(link->SetDescription(wide(AppDescription).c_str()), "Set notification shortcut description");
    Microsoft::WRL::ComPtr<IPropertyStore> properties;
    checkHresult(link.As(&properties), "Get notification shortcut properties");
    PROPVARIANT appId{};
    checkHresult(InitPropVariantFromString(AppId, &appId), "Create notification application ID");
    const auto result = properties->SetValue(PKEY_AppUserModel_ID, appId);
    (void)PropVariantClear(&appId);
    checkHresult(result, "Set notification application ID");
    checkHresult(properties->Commit(), "Save notification shortcut properties");
    Microsoft::WRL::ComPtr<IPersistFile> file;
    checkHresult(link.As(&file), "Get notification shortcut persistence");
    checkHresult(file->Save(shortcut.c_str(), TRUE), "Save shortcut");
}

void showToast(const std::string& title,
               const std::string& text,
               const std::filesystem::path& image,
               const std::string& action,
               const std::string& launch)
{
    std::string xml = R"(<toast activationType="protocol" launch=")" + xmlEscape(launch) +
                      R"("><visual><binding template="ToastGeneric"><text>)" + xmlEscape(title) + "</text>";
    if (!text.empty())
    {
        xml += "<text>" + xmlEscape(text) + "</text>";
    }

    if (!image.empty())
    {
        xml += R"(<image placement="hero" src=")" + xmlEscape(pathUtf8(image)) + R"("/>)";
    }

    xml += R"(</binding></visual><audio src="ms-winsoundevent:Notification.IM"/>)";
    if (!action.empty())
    {
        xml += R"(<actions><action content=")" + xmlEscape(action) + R"(" activationType="protocol" arguments=")" +
               xmlEscape(launch) + R"("/></actions>)";
    }

    xml += "</toast>";
    const winrt::Windows::Data::Xml::Dom::XmlDocument document;
    document.LoadXml(winrt::to_hstring(xml));
    const winrt::Windows::UI::Notifications::ToastNotification notification(document);
    winrt::Windows::UI::Notifications::ToastNotificationManager::CreateToastNotifier(AppId).Show(notification);
}
