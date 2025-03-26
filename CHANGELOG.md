# 1.3.0

- Added app update checking
  - Updates will be checked on launch and every 5 minutes afterwords
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
