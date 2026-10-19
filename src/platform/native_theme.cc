#include "platform/native_theme.h"
#include <winternl.h>

namespace
{
    enum class PreferredAppMode
    {
        Default,
        AllowDark
    };

    class MenuThemeApi
    {
    private:
        typedef PreferredAppMode(WINAPI* SetPreferredAppMode)(PreferredAppMode);
        typedef bool(WINAPI* AllowDarkModeForWindow)(HWND, bool);
        typedef void(WINAPI* RefreshImmersiveColorPolicyState)();
        typedef void(WINAPI* FlushMenuThemes)();
        HMODULE m_module = nullptr;
        SetPreferredAppMode m_setPreferredAppMode = nullptr;
        AllowDarkModeForWindow m_allowDarkModeForWindow = nullptr;
        RefreshImmersiveColorPolicyState m_refreshColorPolicy = nullptr;
        FlushMenuThemes m_flushMenuThemes = nullptr;

    public:
        MenuThemeApi()
        {
            // These optional UXTheme exports changed signatures before Windows 10 1903.
            typedef LONG(WINAPI * GetVersion)(PRTL_OSVERSIONINFOW);
            const auto getVersion =
                reinterpret_cast<GetVersion>(GetProcAddress(GetModuleHandleW(L"ntdll.dll"), "RtlGetVersion"));
            RTL_OSVERSIONINFOW version{.dwOSVersionInfoSize = sizeof(version)};
            if (!getVersion || getVersion(&version) != 0 || version.dwBuildNumber < 18362)
            {
                return;
            }

            m_module = LoadLibraryExW(L"uxtheme.dll", nullptr, LOAD_LIBRARY_SEARCH_SYSTEM32);
            if (!m_module)
            {
                return;
            }

            m_setPreferredAppMode =
                reinterpret_cast<SetPreferredAppMode>(GetProcAddress(m_module, MAKEINTRESOURCEA(135)));
            m_allowDarkModeForWindow =
                reinterpret_cast<AllowDarkModeForWindow>(GetProcAddress(m_module, MAKEINTRESOURCEA(133)));
            m_refreshColorPolicy =
                reinterpret_cast<RefreshImmersiveColorPolicyState>(GetProcAddress(m_module, MAKEINTRESOURCEA(104)));
            m_flushMenuThemes = reinterpret_cast<FlushMenuThemes>(GetProcAddress(m_module, MAKEINTRESOURCEA(136)));
        }

        ~MenuThemeApi()
        {
            if (m_module)
            {
                FreeLibrary(m_module);
            }
        }

        MenuThemeApi(const MenuThemeApi&) = delete;
        MenuThemeApi& operator=(const MenuThemeApi&) = delete;

        void refresh(HWND const owner) const
        {
            HIGHCONTRASTW contrast{.cbSize = sizeof(contrast)};
            SystemParametersInfoW(SPI_GETHIGHCONTRAST, sizeof(contrast), &contrast, 0);
            const bool allowDark = !(contrast.dwFlags & HCF_HIGHCONTRASTON);
            if (m_refreshColorPolicy)
            {
                m_refreshColorPolicy();
            }

            if (m_setPreferredAppMode)
            {
                m_setPreferredAppMode(allowDark ? PreferredAppMode::AllowDark : PreferredAppMode::Default);
            }

            if (m_allowDarkModeForWindow)
            {
                m_allowDarkModeForWindow(owner, allowDark);
            }

            if (m_flushMenuThemes)
            {
                m_flushMenuThemes();
            }
        }
    };
}

void refreshNativeMenuTheme(HWND const owner)
{
    static const MenuThemeApi theme;
    theme.refresh(owner);
}
