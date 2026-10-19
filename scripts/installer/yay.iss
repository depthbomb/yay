#if Ver < EncodeVer(7, 1, 0)
  #error Inno Setup 7.1 or later is required.
#endif
#ifndef PackageDir
  #error PackageDir must point to the CMake installation directory.
#endif
#include "product.generated.iss"

[Setup]
AppId={#ProductInstallerId}
AppName={#ProductName}
AppVersion={#ProductVersion}
AppVerName={cm:NameAndVersion,{#ProductName},{#ProductVersion}}
AppPublisher={#ProductCompany}
AppPublisherURL={#ProductRepositoryUrl}
AppSupportURL={#ProductRepositoryUrl}/issues
AppUpdatesURL={#ProductRepositoryUrl}
DefaultDirName={autopf}\{#ProductCompany}\{#ProductDirectoryName}
DefaultGroupName={#ProductName}
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
RestartApplications=no
CloseApplications=yes
CloseApplicationsFilter={#ProductExecutable}
OutputDir=..\..\dist
OutputBaseFilename={#ProductInstallerBaseName}
SetupIconFile=..\..\assets\icon.ico
Compression=lzma/ultra64
SolidCompression=yes
SetupArchitecture=x64
TimeStampsInUTC=yes
ArchiveExtraction=basic
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
WizardStyle=modern dynamic
UninstallDisplayIcon={app}\{#ProductExecutable}
UninstallDisplayName={#ProductName}
VersionInfoCompany={#ProductCompany}
VersionInfoDescription={#ProductDescription}
VersionInfoOriginalFileName={#ProductInstallerBaseName}.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#PackageDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#ProductCompany}\{#ProductName}"; Filename: "{app}\{#ProductExecutable}"; AppUserModelID: "{#ProductAppId}"; Parameters: "--from-shortcut"
Name: "{autodesktop}\{#ProductName}"; Filename: "{app}\{#ProductExecutable}"; Tasks: desktopicon; Parameters: "--from-shortcut"

[Registry]
Root: HKCU; Subkey: "Software\Classes\{#ProductProtocol}"; ValueType: string; ValueData: "URL:{#ProductProtocol} protocol"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\{#ProductProtocol}"; ValueType: string; ValueName: "URL Protocol"; ValueData: ""
Root: HKCU; Subkey: "Software\Classes\{#ProductProtocol}\DefaultIcon"; ValueType: string; ValueData: """{app}\{#ProductExecutable}"",0"
Root: HKCU; Subkey: "Software\Classes\{#ProductProtocol}\shell\open\command"; ValueType: string; ValueData: """{app}\{#ProductExecutable}"" ""%1"""
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueName: "{#ProductName}"; Flags: uninsdeletevalue

[Run]
Filename: "{app}\{#ProductExecutable}"; Description: "{cm:LaunchProgram,{#ProductName}}"; Flags: nowait postinstall skipifsilent
Filename: "{app}\{#ProductExecutable}"; Flags: nowait skipifnotsilent; Check: IsUpdate

[Code]
var
  RemoveUserData: Boolean;

function IsUpdate: Boolean;
var
  Index: Integer;
begin
  Result := False;
  for Index := 1 to ParamCount do
    if CompareText(ParamStr(Index), '/UPDATE') = 0 then
      Result := True;
end;

procedure CurUninstallStepChanged(Step: TUninstallStep);
begin
  if Step = usUninstall then
  begin
    RemoveUserData := False;
    if not UninstallSilent then
      RemoveUserData := SuppressibleMsgBox(
        'Would you also like to remove your yay settings, logs, and cached data?',
        mbConfirmation, MB_YESNO or MB_DEFBUTTON2, IDNO) = IDYES;
  end
  else if (Step = usPostUninstall) and RemoveUserData then
    if not DelTree(ExpandConstant('{userappdata}\{#ProductCompany}\{#ProductDirectoryName}'), True, True, True) then
      Log('Could not remove all yay user data.');
end;
