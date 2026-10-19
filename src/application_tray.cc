#include "application.h"
#include "metadata.h"
#include "platform/native_theme.h"
#include <wincodec.h>

namespace
{
    constexpr UINT TrayMessage = WM_APP + 2;

    HBITMAP loadMenuBitmap(const std::filesystem::path& path, const UINT size)
    {
        Microsoft::WRL::ComPtr<IWICImagingFactory> factory;
        Microsoft::WRL::ComPtr<IWICBitmapDecoder> decoder;
        Microsoft::WRL::ComPtr<IWICBitmapFrameDecode> frame;
        Microsoft::WRL::ComPtr<IWICBitmapScaler> scaler;
        Microsoft::WRL::ComPtr<IWICFormatConverter> converter;
        if (
            FAILED(CoCreateInstance(CLSID_WICImagingFactory, nullptr, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&factory))) ||
            FAILED(factory->CreateDecoderFromFilename(path.c_str(), nullptr, GENERIC_READ, WICDecodeMetadataCacheOnLoad, &decoder)) ||
            FAILED(decoder->GetFrame(0, &frame)) || FAILED(factory->CreateBitmapScaler(&scaler)) ||
            FAILED(scaler->Initialize(frame.Get(), size, size, WICBitmapInterpolationModeFant)) ||
            FAILED(factory->CreateFormatConverter(&converter)) ||
            FAILED(converter->Initialize(scaler.Get(), GUID_WICPixelFormat32bppPBGRA, WICBitmapDitherTypeNone, nullptr, 0, WICBitmapPaletteTypeCustom))
        )
        {
            return nullptr;
        }

        BITMAPINFO info{};
        info.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
        info.bmiHeader.biWidth = static_cast<LONG>(size);
        info.bmiHeader.biHeight = -static_cast<LONG>(size);
        info.bmiHeader.biPlanes = 1;
        info.bmiHeader.biBitCount = 32;
        void* pixels = nullptr;
        const auto bitmap = CreateDIBSection(nullptr, &info, DIB_RGB_COLORS, &pixels, nullptr, 0);
        if (bitmap && FAILED(converter->CopyPixels(nullptr, size * 4, size * size * 4, static_cast<BYTE*>(pixels))))
        {
            DeleteObject(bitmap);
            return nullptr;
        }

        return bitmap;
    }
} // namespace

void Application::createTray()
{
    if (!m_trayIcon)
    {
        m_trayIcon = static_cast<HICON>(LoadImageW(nullptr,
                                                   (m_paths.directory / "assets/tray/tray.ico").c_str(),
                                                   IMAGE_ICON,
                                                   0,
                                                   0,
                                                   LR_LOADFROMFILE | LR_DEFAULTSIZE));
        m_downloadingIcon =
            static_cast<HICON>(LoadImageW(nullptr,
                                          (m_paths.directory / "assets/tray/tray-downloading.ico").c_str(),
                                          IMAGE_ICON,
                                          0,
                                          0,
                                          LR_LOADFROMFILE | LR_DEFAULTSIZE));
    }

    m_tray.cbSize = sizeof(m_tray);
    m_tray.hWnd = m_host;
    m_tray.uID = 1;
    m_tray.uFlags = NIF_MESSAGE | NIF_ICON | NIF_TIP | NIF_SHOWTIP;
    m_tray.uCallbackMessage = TrayMessage;
    m_tray.hIcon = m_trayIcon;
    wcscpy_s(m_tray.szTip, wide(AppDescription).c_str());
    m_trayCreated = Shell_NotifyIconW(NIM_ADD, &m_tray) != FALSE;
    m_tray.uVersion = NOTIFYICON_VERSION_4;
    Shell_NotifyIconW(NIM_SETVERSION, &m_tray);
}

void Application::updateTray(const bool downloading, const std::string& url)
{
    if (!m_trayCreated)
    {
        return;
    }

    m_tray.hIcon = downloading ? m_downloadingIcon : m_trayIcon;
    const auto tooltip = wide(downloading ? "Downloading " + url : AppDescription);
    wcsncpy_s(m_tray.szTip, tooltip.c_str(), _TRUNCATE);
    Shell_NotifyIconW(NIM_MODIFY, &m_tray);
}

void Application::showTrayMenu()
{
    refreshNativeMenuTheme(m_host);

    const auto menu = CreatePopupMenu();
    AppendMenuW(menu, MF_STRING | MF_DISABLED, 0, L"yay");
    AppendMenuW(menu, MF_SEPARATOR, 0, nullptr);
#ifndef NDEBUG
    const auto developer = CreatePopupMenu();
    AppendMenuW(developer, MF_STRING, 5, L"Delete downloadable binaries");
    AppendMenuW(developer, MF_STRING, 4, L"Relaunch");
    AppendMenuW(menu, MF_POPUP, reinterpret_cast<UINT_PTR>(developer), L"Developer");
    AppendMenuW(menu, MF_SEPARATOR, 0, nullptr);
#endif
    AppendMenuW(menu, MF_STRING, 1, L"Show");
    AppendMenuW(menu, MF_STRING, 2, L"Settings");
    AppendMenuW(menu, MF_SEPARATOR, 0, nullptr);
    AppendMenuW(menu, MF_STRING, 3, L"Quit");
    std::vector<HBITMAP> bitmaps;
    constexpr std::array icons{"logo-16.png", "open-in-new.png", "cog.png", "close.png"};
    for (UINT id = 0; id < icons.size(); ++id)
    {
        if (const auto bitmap = loadMenuBitmap(m_paths.directory / "assets/tray/action-icons" / icons[id], MulDiv(16, GetDpiForWindow(m_host), 96)))
        {
            MENUITEMINFOW item{.cbSize = sizeof(item)};
            item.fMask = MIIM_BITMAP;
            item.hbmpItem = bitmap;
            SetMenuItemInfoW(menu, id, FALSE, &item);
            bitmaps.push_back(bitmap);
        }
    }
    POINT cursor{};
    GetCursorPos(&cursor);
    SetForegroundWindow(m_host);
    const auto selected = TrackPopupMenu(menu, TPM_RETURNCMD | TPM_RIGHTBUTTON, cursor.x, cursor.y, 0, m_host, nullptr);
    DestroyMenu(menu);
    for (const auto bitmap : bitmaps)
    {
        DeleteObject(bitmap);
    }
    PostMessageW(m_host, WM_NULL, 0, 0);
    if (selected == 1)
    {
        m_windows.showMain(m_host);
    }
    else if (selected == 2)
    {
        m_windows.show("settings");
    }
    else if (selected == 3 || selected == 4)
    {
        requestQuit(selected == 4);
    }
    else if (selected == 5)
    {
        m_setup.removeDownloadedBinaries();
    }
}
