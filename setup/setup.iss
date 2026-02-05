[Setup]
AppID={#AppID}
AppName={#NameLong}
AppVersion={#Version}
AppVerName={#NameLong}
VersionInfoVersion={#Version}
AppPublisher={#Company}
AppCopyright={#Copyright}
AppPublisherURL={#RepoURL}
AppSupportURL={#RepoURL}
AppUpdatesURL={#RepoURL}
DefaultGroupName={#NameLong}
DefaultDirName={autopf}\{#Company}\{#NameLong}
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\build\release
OutputBaseFilename={#ExeBasename}-setup
SetupIconFile=..\static\icon.ico
Compression=lzma/ultra64
LZMAUseSeparateProcess=yes
; Compression=none
SolidCompression=yes
ArchitecturesAllowed=x64compatible
MinVersion=10.0
WizardStyle=modern dynamic
ShowTasksTreeLines=yes
UninstallDisplayIcon={app}\{#ExeBasename}.exe
UninstallDisplayName={#Description}
ArchiveExtraction=enhanced/nopassword

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "https://github.com/depthbomb/yay/releases/download/{#Version}/yay-online-files.7z"; DestDir: "{app}"; DestName: "yay-online-files.7z"; ExternalSize: 270000000; Flags: external download extractarchive recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{autoprograms}\{#Company}\{#NameLong}"; Filename: "{app}\{#ExeBasename}.exe"; AppUserModelID: "{#AppUserModelID}"; AppUserModelToastActivatorCLSID: "{#AppUserModelToastActivatorClsid}"; Comment: "yay start menu shortcut"; Parameters: "--from-shortcut"
Name: "{autodesktop}\{#NameLong}"; Filename: "{app}\{#ExeBasename}.exe"; Tasks: desktopicon; Comment: "yay desktop shortcut"; Parameters: "--from-shortcut"

[Run]
Filename: "{app}\{#ExeBasename}.exe"; Description: "{cm:LaunchProgram,{#StringChange(NameLong, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
Filename: "{app}\{#ExeBasename}.exe"; Description: "{cm:LaunchProgram,{#StringChange(NameLong, '&', '&&')}}"; Flags: nowait; Check: IsUpdate

[UninstallRun]
Filename: "{app}\{#ExeBasename}"; Parameters: "--uninstall"; RunOnceId: "DisableAutoStart"; Flags: runhidden runascurrentuser

[UninstallDelete]
Type: filesandordirs; Name: "{userappdata}\{#Company}\{#NameLong}\*"
Type: dirifempty; Name: "{userappdata}\{#Company}\{#NameLong}"
Type: filesandordirs; Name: "{app}\*"
Type: dirifempty; Name: "{app}"

[Code]
function CmdLineParamExists(const value: string): Boolean;
var
  i: Integer;
begin
  Result := False;
  for i := 1 to ParamCount do
    if CompareText(ParamStr(i), value) = 0 then
    begin
      Result := True;
      Exit;
    end;
end;

function IsUpdate(): Boolean;
begin
  Result := CmdLineParamExists('/UPDATE')
end;
