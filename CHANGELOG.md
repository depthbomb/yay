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
