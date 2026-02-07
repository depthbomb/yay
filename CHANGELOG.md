# 1.39.8

- Improved unhandled exception error message
- Upgraded to [Electron 40.2.1](https://releases.electronjs.org/release/v40.2.1)

---

# 1.39.7

- Fixed an application crash related to the lack of a config file

---

# 1.39.6

- Fixed the spacing between icons and text in buttons
- Upgraded to [Electron 40.1.0](https://releases.electronjs.org/release/v40.1.0)

---

# 1.39.5

- Download progress is now also shown on the home screen when downloading
- The updater window will now be displayed on startup, after the setup phase, if there is a new release

---

# 1.39.4

- More minor optimizations and some reduction in file size

---

# 1.39.3

- Minor optimizations and future-proofing

---

# 1.39.2

- Cancelling the folder selection dialog when importing or exporting settings will no longer show an error message box

---

# 1.39.1

- Fixed some URLs, specifically in the updater window changelog, opening within the app rather than in an external browser
- Fixed the application notifying of updates during the setup phase

---

# 1.39.0

- The local REST server (now called _local API server_) has been promoted to a full feature and removed from the feature flags system
  - Can be toggled in the settings (disabled by default)
  - Port can now be configured from settings
  - Responses are now JSON
- Various minor optimizations
- Upgraded to [Electron 40.0.0](https://releases.electronjs.org/release/v40.0.0)

---

# 1.38.2

- Removed an unnecessary prefix to log lines
- Requests made to the local REST server (if enabled) are now logged

---

# 1.38.1

- The updater window will now be displayed when manually checking for updates when there is a new release

---

# 1.38.0

- Added settings exporting and importing
- Moved the update check button to the _About_ settings tab
- The time until you can check for updates is displayed on the _About_ settings tab
- Other minor optimizations

---

# 1.37.1

- Updated update checking
  - Updates can now be manually checked for in settings again
  - The time between automatic update checks will increase linearly
- Fixed the Twitter/X media downloader breaking if a media-less Tweet URL is input
- Adjusted the style of the Twitter/X media downloader

---

# 1.37.0

- Twitter/X media is now handled by a new system that bypasses yt-dlp and is much faster
  - This is enabled by default and can be disabled, opting to use yt-dlp instead, in settings
- Improved context menu handling
- Fixed the layout of the updater window breaking in some cases

---

# 1.36.1

- This is maintenance release to update some dependencies and prepare the application for an upcoming release

---

# 1.36.0

- Overhauled UI and various elements
  - The system's accent color is now used to style many components
  - The settings and updater window now use a custom titlebar and frame
  - Redesigned settings window sidebar
  - Updated titlebar control button icons
- Various minor optimizations

---

# 1.35.0

- Updated the enabled and disabled style of the download buttons
- Added a button under the Application settings section to open the application's folder
- Added a button under the YouTube settings section to clear the video thumbnail cache
- Added icons to action buttons in the settings window
- Updated the Developer settings section
  - Moved the link to the project repository

---

# 1.34.0

- Added an experimental local REST server to allow interacting with the application via HTTP requests
  - This feature is enabled by default and can be disabled via turning the feature flag off and restarting the application
- Fixed some bold fonts being a little blurry
- Fixed an apparent longstanding issue where monospaced fonts weren't using the correct font
- Fixed the styling of icon buttons
- Removed functionality related to legacy settings files and deprecated settings

---

# 1.33.0

- Updated fonts
- Updated settings window
  - Added horizontal rules between subsections
  - Slightly increased window size
- Releases henceforth will no longer include non-US English locales which weren't used anyways, saving more than 40MB of space

---

# 1.32.0

- Overhauled the global menu to now use a web-based UI
  - Menu now disappears when clicking outside of it, eliminating the need for a dedicated close action
- Slightly increased the time between update checks
- Upgraded to [Electron 39.2.4](https://releases.electronjs.org/release/v39.2.4)

---

# 1.31.0

- Removed manual update checking and increased the frequency of update checks
- Upgraded to [Electron 39.2.0](https://releases.electronjs.org/release/v39.2.0)

---

# 1.30.0

- Fixed the tooltips of the icon buttons in the main window persisting when the window is shown again
- Adjusted the color of tab buttons
- Upgraded to [Electron 39.1.1](https://releases.electronjs.org/release/v39.1.1)

---

# 1.29.1

- The main window will now only be moved to its tray position if it its last position differs, this also reduces the amount of lines logged to the app's log file
- Upgraded to [Electron 39.1.0](https://releases.electronjs.org/release/v39.1.0)

---

# 1.29.0

- Removed the menu pinning functionality

---

# 1.28.6

- No notable changes are in this release

---

# 1.28.5

- Upgraded to [Electron 39.0.0](https://releases.electronjs.org/release/v39.0.0)

---

# 1.28.4

- Fixed the UI breaking when downloading from some sources or particularly lengthy media
- Adjusted some colors in the log list

---

# 1.28.3

- Adjusted switch UI elements' accompanying labels
- The global menu settings switch has been moved to the _Application_ section
- Upgraded to [Electron 38.2.1](https://releases.electronjs.org/release/v38.2.1)

---

# 1.28.2

- Added a button to the Application settings page that opens the bug report issue template on GitHub
- Upgraded to [Electron 38.2.0](https://releases.electronjs.org/release/v38.2.0)

---

# 1.28.1

- Fixed the setup process not prompting to download Deno if it isn't found
- Updated the missing dependency message box text
- Deno will now also be checked if it is installed via the system PATH
- yt-dlp binary is now verified if found locally (when placed alongside the yay executable)
- Deno binary is now verified if found locally or in the PATH

---

# 1.28.0

- Added a setup step that will check for and download Deno if it isn't found
  - Read more about why this was added [here](https://github.com/yt-dlp/yt-dlp/issues/14404)

---

# 1.27.0

- The updater window is no longer displayed after startup if there is a new release
- Updated the main window UI elements when there is a new release
- Removed hints footer
- Slightly reduced the overall size of the main window

---

# 1.26.1

- Updates to yt-dlp won't be checked if yt-dlp was just downloaded
- Fixed an error when declining to download required binaries
- Fixed the setup window's minimize and close buttons not being clickable

---

# 1.26.0

- Added an option to check for yt-dlp updates on startup
- Fixed some message boxes appearing in the wrong location
- Updated the setup window:
  - Updated window background
  - Moved the position of the spinner and status text
  - The window can now be dragged from additional areas
- Improved the changelog display of the updater window
- Log files are now rotated, keeping the last 5 days of logs instead of always writing to a single file
- Upgraded to [Electron 38.1.0](https://releases.electronjs.org/release/v38.1.0)

---

# 1.25.0

- Additional optimizations and improvements to underlying systems - again, you probably won't notice any differences

---

# 1.24.1

- Fixed the context menu not appearing when right-clicking the URL input

---

# 1.24.0

- Further adjusted the styling of the setup window depending on window focus
- Improved backend systems, however you won't notice any differences

---

# 1.23.0

- Fixed the main window displaying in the center of the screen if opened via a second instance if it hasn't been displayed already
- Deep links can now be handled when the app is not running

---

# 1.22.3

- Errors during startup are now properly handled instead of being ignored
- Upgraded to [Electron 38.0.0](https://releases.electronjs.org/release/v38.0.0)

---

# 1.22.2

- Fixed the setup window saying _Cancelling..._ when it finishes successfully
- The yt-dlp binary is now downloaded to `%TEMP%` before being moved to its destination

---

# 1.22.1

- Slightly adjusted the styling of the setup window
- Further improved error handling during the setup process

---

# 1.22.0

- Fixed the settings window flashing when opening for the first time
- Added an online check during startup
- Upgraded to [Electron 37.4.0](https://releases.electronjs.org/release/v37.4.0)

---

# 1.21.1

- You are now alerted during the setup process when something fails to download instead of silently failing
- Fixed FFmpeg not being downloaded

---

# 1.21.0

- Improved app updating
  - The setup executable now uses Inno Setup's new file download system, resulting in a very small executable
  - The setup, when ran via updating, now requires no user interaction (silent mode)
- Upgraded to [Electron 37.3.1](https://releases.electronjs.org/release/v37.3.1)

---

# 1.20.2

- Upgraded to [Electron 37.1.0](https://releases.electronjs.org/release/v37.1.0)

---

# 1.20.1

- Upgraded to [Electron 36.3.2](https://releases.electronjs.org/release/v36.3.2)

---

# 1.20.0

- There is now a cooldown between manually checking for app updates
- Added icons to tab buttons in the Settings window
- Added a button to open the application's data folder to the Application section of the Settings window

---

# 1.19.0

- Tray context menu and global menu icon styles have been updated
- Feature flags can now be viewed in the Developer section of the Settings window

---

# 1.18.0

- Added the app's full title back to the app header
- A message box is now shown when after attempting to update yt-dlp with info about the update process
- Fixed showing a text selection context menu when right-clicking in the app with nothing selected
- Fixed the taskbar icon progress bar moving backwards in some cases

---

# 1.17.1

- Tray context menu icons and global menu icons will now use dark icons when using the light theme in Windows

---

# 1.17.0

- The main window's taskbar icon, when shown, now shows an accurate download progress percentage when downloading media
- Added an option to enable embedding the video's thumbnail in downloaded audio files as cover art when possible
- Audio will now be downloaded at the highest quality when possible

---

# 1.16.1

- The updater window is now shown when there is a new update when manually checking for updates

---

# 1.16.0

- Long lines in the output log will now wrap instead of creating a horizontal scrollbar
- Upgraded to [Electron 36.2.0](https://releases.electronjs.org/release/v36.2.0)

---

# 1.15.1

- Fixed the updater window breaking when switching to the commits tab while downloading the installer
- Fixed the context menu not appearing when right-clicking in the URL input

---

# 1.15.0

- Added an option to disable hardware acceleration
- Updated the style of loading spinners

---

# 1.14.1

- Improved the context menu in the URL input
- You can now access a context menu when selecting text in the output log

---

# 1.14.0

- Fixed **Recheck required binaries** and **Reset settings** actions not working
- Added a button in Settings to open the application's log file

---

# 1.13.0

- Moved the **Global menu** and **Show hints** options to a new _Interface_ settings tab
- Moved the **Cookies file** and **Don't download YouTube playlists** options to a new _YouTube_ settings tab
- The settings UI can now be accessed from the tray icon context menu
- Operational info is now written to a log file located at `<userData>/logs`

---

# 1.12.0

- Added the ability to choose a `cookies.txt` file for yt-dlp's `--cookie` option
  - Read more [here](https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies)
- You can now select text in the output log
- Download folder dialog is now treated as a child of the settings window instead of the main window
- Upgraded to [Electron 36.1.0](https://releases.electronjs.org/release/v36.1.0)

---

# 1.11.0

- You can now manually check for updates in the app settings
- Added the ability to toggle some features

---

# 1.10.5

- The main window can no longer be closed
- Settings button is no longer disabled when downloading media

---

# 1.10.4

- Fixed links in the updater window not opening in the default browser (again)

---

# 1.10.3

- Buttons in the header now show their tooltip below them
- Upgraded to [Electron 35.2.0](https://releases.electronjs.org/release/v35.2.0)

---

# 1.10.2

- Fixed the updater window appearing during the setup phase instead of after
- Updated design of updater changelog

---

# 1.10.1

- Improved the spacing of elements in the main window
- Updated the styling of info sections in developer tab in settings
- Fixed some small design issues caused by the old tooltip system
- Fixed the link in one of the hints not being styled
- Fixed links clicked in the main window not opening in the default browser
- Fixed the setup window not being minimizable
- Updater changelog markdown is no longer rendered while an overhauled system is in the works

---

# 1.10.0

This release comes with a major rewrite of the application's backend code to make development easier.

- Download completion notifications will not be sent if the main window is focused
- New release notifications will not be sent if the main window is focused
- Removed the _Show window frame_ option
- Updated the app header
- Fixed some minor style issues in the updater
- Settings are now written to disk in [TOML](https://toml.io/en) format instead of JSON
  - Legacy settings files will be migrated to the new format
  - Overall, you shouldn't notice anything different with this change and no action should be required

---

# 1.9.2

- Fixed some settings switches briefly animating to their proper value in some cases

---

# 1.9.1

- Fixed clickable links not being styled
- Advanced settings buttons are now properly disabled when updating yt-dlp binary

---

# 1.9.0

- Added a list of commits since the current app's build to the updater window
- The updater window changelog can now be scrolled if it overflows

---

# 1.8.0

- Added an option to send a toast notification when a new release is available
- Fixed the settings window staying on top of other windows due to being a child of the main window
- Settings window is now hidden on close instead of actually closing
- Some settings window controls are now disabled when performing maintenance operations (updating yt-dlp binary, rechecking binaries, etc.)
- Updated main window header
  - Redesigned title
  - Added an update indicator that is now displayed instead of replacing the hint footer
- Updated the styling of the updater window
- Increased the frequency of update checks

---

# 1.7.0

- Overhauled settings UI
  - Now contained within its own window to allow for more room for options
  - Updated style of toggle-able elements
- Fixed the updater window displaying automatically when it shouldn't
- Fixed the setup window not displaying when rechecking binaries with the _Hide setup window on startup_ option enabled

---

# 1.6.0

- Added an option to not download playlists when using a YouTube video URL that contains a playlist
- Fixed download buttons shrinking when downloading media

---

# 1.5.1

- Slightly adjusted the style of disabled download buttons
- Minor performance improvements

---

# 1.5.0

- You can now choose to have the setup window hidden when the app starts
  - The window will show itself when your action is needed
- Upgraded to [Electron 35.1.5](https://releases.electronjs.org/release/v35.1.5)

---

# 1.4.0

- Added seasonal visual additions
- Upgraded to [Electron 35.1.4](https://releases.electronjs.org/release/v35.1.4)

---

# 1.3.2

- Fixed links in the updater window not opening in the default browser
- Upgraded to [Electron 35.1.1](https://releases.electronjs.org/release/v35.1.1)

---

# 1.3.1

- Fixed the default download action always downloading audio
- Upgraded to [Electron 35.1.0](https://releases.electronjs.org/release/v35.1.0)

---

# 1.3.0

- Added app update checking
  - Updates will be checked on launch and every 5 minutes afterwards
  - When an update is available, there will be a new, large button on the main screen that opens the new update window. This window shows what the new version is and a changelog. From this window you can install the new version.
  - This window is shown immediately if the very first update check finds a new version
- Downloaded _YouTube_ thumbnails are now cached to the app's data folder where they may be more reliably reused if needed

---

# 1.2.0

- Windows toast notifications are now used for notifying upon download completion
  - Removed custom notification sound
  - Added option to disable toast notifications for download completion
  - If a _YouTube_ video is being downloaded, the thumbnail will be displayed in the toast notification

---

# 1.1.0

- You can now customize the [output name template](https://github.com/yt-dlp/yt-dlp?tab=readme-ov-file#output-template) for downloaded files

---

# 1.0.0

- Initial release
