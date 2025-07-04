# 1.20.2

- Upgraded to [Electron 37.1.0](https://releases.electronjs.org/release/v37.1.0)

# 1.20.1

- Upgraded to [Electron 36.3.2](https://releases.electronjs.org/release/v36.3.2)

# 1.20.0

- There is now a cooldown between manually checking for app updates
- Added icons to tab buttons in the Settings window
- Added a button to open the application's data folder to the Application section of the Settings window

# 1.19.0

- Tray context menu and global menu icon styles have been updated
- Feature flags can now be viewed in the Developer section of the Settings window

# 1.18.0

- Added the app's full title back to the app header
- A message box is now shown when after attempting to update yt-dlp with info about the update process
- Fixed showing a text selection context menu when right-clicking in the app with nothing selected
- Fixed the taskbar icon progress bar moving backwards in some cases

# 1.17.1

- Tray context menu icons and global menu icons will now use dark icons when using the light theme in Windows

# 1.17.0

- The main window's taskbar icon, when shown, now shows an accurate download progress percentage when downloading media
- Added an option to enable embedding the video's thumbnail in downloaded audio files as cover art when possible
- Audio will now be downloaded at the highest quality when possible

# 1.16.1

- The updater window is now shown when there is a new update when manually checking for updates

# 1.16.0

- Long lines in the output log will now wrap instead of creating a horizontal scrollbar
- Upgraded to [Electron 36.2.0](https://releases.electronjs.org/release/v36.2.0)

# 1.15.1

- Fixed the updater window breaking when switching to the commits tab while downloading the installer
- Fixed the context menu not appearing when right-clicking in the URL input

# 1.15.0

- Added an option to disable hardware acceleration
- Updated the style of loading spinners

# 1.14.1

- Improved the context menu in the URL input
- You can now access a context menu when selecting text in the output log

# 1.14.0

- Fixed **Recheck required binaries** and **Reset settings** actions not working
- Added a button in Settings to open the application's log file

# 1.13.0

- Moved the **Global menu** and **Show hints** options to a new _Interface_ settings tab
- Moved the **Cookies file** and **Don't download YouTube playlists** options to a new _YouTube_ settings tab
- The settings UI can now be accessed from the tray icon context menu
- Operational info is now written to a log file located at `<userData>/logs`

# 1.12.0

- Added the ability to choose a `cookies.txt` file for yt-dlp's `--cookie` option
  - Read more [here](https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies)
- You can now select text in the output log
- Download folder dialog is now treated as a child of the settings window instead of the main window
- Upgraded to [Electron 36.1.0](https://releases.electronjs.org/release/v36.1.0)

# 1.11.0

- You can now manually check for updates in the app settings
- Added the ability to toggle some features

# 1.10.5

- The main window can no longer be closed
- Settings button is no longer disabled when downloading media

# 1.10.4

- Fixed links in the updater window not opening in the default browser (again)

# 1.10.3

- Buttons in the header now show their tooltip below them
- Upgraded to [Electron 35.2.0](https://releases.electronjs.org/release/v35.2.0)

# 1.10.2

- Fixed the updater window appearing during the setup phase instead of after
- Updated design of updater changelog

# 1.10.1

- Improved the spacing of elements in the main window
- Updated the styling of info sections in developer tab in settings
- Fixed some small design issues caused by the old tooltip system
- Fixed the link in one of the hints not being styled
- Fixed links clicked in the main window not opening in the default browser
- Fixed the setup window not being minimizable
- Updater changelog markdown is no longer rendered while an overhauled system is in the works

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

# 1.9.2

- Fixed some settings switches briefly animating to their proper value in some cases

# 1.9.1

- Fixed clickable links not being styled
- Advanced settings buttons are now properly disabled when updating yt-dlp binary

# 1.9.0

- Added a list of commits since the current app's build to the updater window
- The updater window changelog can now be scrolled if it overflows

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

# 1.7.0

- Overhauled settings UI
  - Now contained within its own window to allow for more room for options
  - Updated style of toggle-able elements
- Fixed the updater window displaying automatically when it shouldn't
- Fixed the setup window not displaying when rechecking binaries with the _Hide setup window on startup_ option enabled

# 1.6.0

- Added an option to not download playlists when using a YouTube video URL that contains a playlist
- Fixed download buttons shrinking when downloading media

# 1.5.1

- Slightly adjusted the style of disabled download buttons
- Minor performance improvements

# 1.5.0

- You can now choose to have the setup window hidden when the app starts
  - The window will show itself when your action is needed
- Upgraded to [Electron 35.1.5](https://releases.electronjs.org/release/v35.1.5)

# 1.4.0

- Added seasonal visual additions
- Upgraded to [Electron 35.1.4](https://releases.electronjs.org/release/v35.1.4)

# 1.3.2

- Fixed links in the updater window not opening in the default browser
- Upgraded to [Electron 35.1.1](https://releases.electronjs.org/release/v35.1.1)

# 1.3.1

- Fixed the default download action always downloading audio
- Upgraded to [Electron 35.1.0](https://releases.electronjs.org/release/v35.1.0)

# 1.3.0

- Added app update checking
  - Updates will be checked on launch and every 5 minutes afterwards
  - When an update is available, there will be a new, large button on the main screen that opens the new update window. This window shows what the new version is and a changelog. From this window you can install the new version.
  - This window is shown immediately if the very first update check finds a new version
- Downloaded _YouTube_ thumbnails are now cached to the app's data folder where they may be more reliably reused if needed

# 1.2.0

- Windows toast notifications are now used for notifying upon download completion
  - Removed custom notification sound
  - Added option to disable toast notifications for download completion
  - If a _YouTube_ video is being downloaded, the thumbnail will be displayed in the toast notification

# 1.1.0

- You can now customize the [output name template](https://github.com/yt-dlp/yt-dlp?tab=readme-ov-file#output-template) for downloaded files

# 1.0.0

- Initial release
