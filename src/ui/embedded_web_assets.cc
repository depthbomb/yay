#include "ui/embedded_web_assets.h"
#include <windows.h>
#include <wrl.h>
#include <WebView2.h>
#include <algorithm>
#include <iterator>
#include <shlwapi.h>
#include <stdexcept>
#include <string>
#include <string_view>

namespace
{
    struct EmbeddedWebAsset
    {
    public:
        std::wstring_view path;
        std::wstring_view contentType;
        WORD resourceId;
    };

#include "web_assets.h"

    const EmbeddedWebAsset* findAsset(std::wstring_view uri)
    {
        constexpr std::wstring_view origin = L"https://yay.local";
        if (!uri.starts_with(origin) || uri.size() <= origin.size() || uri[origin.size()] != L'/')
        {
            return nullptr;
        }

        uri.remove_prefix(origin.size());
        uri = uri.substr(0, uri.find_first_of(L"?#"));
        const auto asset = std::lower_bound(std::begin(EmbeddedWebAssets),
                                            std::end(EmbeddedWebAssets),
                                            uri,
                                            [](const EmbeddedWebAsset& item, const std::wstring_view path)
                                            {
                                                return item.path < path;
                                            });

        return asset != std::end(EmbeddedWebAssets) && asset->path == uri ? asset : nullptr;
    }

    HRESULT respond(ICoreWebView2Environment* environment, ICoreWebView2WebResourceRequestedEventArgs* args)
    {
        Microsoft::WRL::ComPtr<ICoreWebView2WebResourceRequest> request;
        auto result = args->get_Request(&request);
        if (FAILED(result))
        {
            return result;
        }

        PWSTR uri = nullptr;
        result = request->get_Uri(&uri);
        const auto asset = uri ? findAsset(uri) : nullptr;
        CoTaskMemFree(uri);
        if (FAILED(result))
        {
            return result;
        }

        PWSTR method = nullptr;
        result = request->get_Method(&method);
        const bool get = method && std::wstring_view(method) == L"GET";
        const bool head = method && std::wstring_view(method) == L"HEAD";
        CoTaskMemFree(method);
        if (FAILED(result))
        {
            return result;
        }

        int status = 404;
        const auto* reason = L"Not Found";
        std::wstring headers = L"Cache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\n"
                               L"Cross-Origin-Resource-Policy: same-origin\r\n";
        Microsoft::WRL::ComPtr<IStream> content;
        if (!get && !head)
        {
            status = 405;
            reason = L"Method Not Allowed";
            headers += L"Allow: GET, HEAD\r\n";
        }
        else if (asset)
        {
            const auto module = GetModuleHandleW(nullptr);
            const auto resource = FindResourceW(module, MAKEINTRESOURCEW(asset->resourceId), RT_RCDATA);
            const auto size = resource ? SizeofResource(module, resource) : 0;
            const auto loaded = resource ? LoadResource(module, resource) : nullptr;
            const auto bytes = loaded ? static_cast<const BYTE*>(LockResource(loaded)) : nullptr;
            if (!bytes)
            {
                return E_UNEXPECTED;
            }

            if (get)
            {
                content.Attach(SHCreateMemStream(bytes, size));
                if (!content)
                {
                    return E_OUTOFMEMORY;
                }
            }

            status = 200;
            reason = L"OK";
            headers += L"Content-Type: " + std::wstring(asset->contentType) + L"\r\nContent-Length: " +
                       std::to_wstring(size) + L"\r\n";
        }

        Microsoft::WRL::ComPtr<ICoreWebView2WebResourceResponse> response;
        result = environment->CreateWebResourceResponse(content.Get(), status, reason, headers.c_str(), &response);
        if (FAILED(result))
        {
            return result;
        }

        return args->put_Response(response.Get());
    }
}

void installEmbeddedWebAssets(ICoreWebView2* webview, ICoreWebView2Environment* environment)
{
    Microsoft::WRL::ComPtr<ICoreWebView2_22> webview22;
    if (FAILED(webview->QueryInterface(IID_PPV_ARGS(&webview22))))
    {
        throw std::runtime_error("This WebView2 runtime is too old. Please update Microsoft Edge WebView2 Runtime.");
    }

    auto result = webview22->AddWebResourceRequestedFilterWithRequestSourceKinds(
        L"https://yay.local/*",
        COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL,
        COREWEBVIEW2_WEB_RESOURCE_REQUEST_SOURCE_KINDS_ALL);
    if (FAILED(result))
    {
        throw std::runtime_error("Unable to register embedded web assets.");
    }

    EventRegistrationToken token{};
    result = webview->add_WebResourceRequested(
        Microsoft::WRL::Callback<ICoreWebView2WebResourceRequestedEventHandler>(
            [environment = Microsoft::WRL::ComPtr<ICoreWebView2Environment>(environment)](
                ICoreWebView2*, ICoreWebView2WebResourceRequestedEventArgs* args) -> HRESULT
            {
                try
                {
                    return respond(environment.Get(), args);
                }
                catch (...)
                {
                    return E_FAIL;
                }
            })
            .Get(),
        &token);
    if (FAILED(result))
    {
        throw std::runtime_error("Unable to serve embedded web assets.");
    }
}
