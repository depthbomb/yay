# yay

_yay_ (**Y**et **A**nother **Y**ouTube Downloader) is an [Electron](https://www.electronjs.org/)-based GUI wrapper around [yt-dlp](https://github.com/yt-dlp/yt-dlp) for Windows that runs in the system tray. Despite the name, yay can of course download from any site that yt-dlp supports.

## Installation

yay can be installed by downloading and running the latest setup in [releases](https://github.com/depthbomb/yay/releases/latest).

Upon first run, yay will automatically download the latest version of yt-dlp if it isn't found in your system's PATH. It will also download and use [yt-dlp's builds of FFmpeg and FFprobe](https://github.com/yt-dlp/FFmpeg-Builds).

## Planned features

- [ ] Allow customizing yt-dlp options when downloading
  - [x] Allow customizing output name
  - [ ] Allow supplying raw options
- [x] Improved download completion notifying
- [ ] Application update checking

## Screenshots

![The main window of yay](art/ss1.png "The main window of yay")
![The main window of yay showing the download buttons enabled](art/ss2.png "The main window of yay showing the download buttons enabled")
![The main window of yay showing a download in progress](art/ss3.png "The main window of yay showing a download in progress")
![The main window of yay showing a completed download](art/ss4.png "The main window of yay showing a completed download")
