; ZUNO-CHAT Windows installer (Inno Setup 6).
; Built by `npm run package` on Windows, which passes the version and paths:
;   ISCC /DAppVersion=1.1.0 /DSourceExe=..\..\dist\ZUNO-CHAT.exe /DOutputDir=..\..\dist\release zuno-chat.iss

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif
#ifndef SourceExe
  #define SourceExe "..\..\dist\ZUNO-CHAT.exe"
#endif
#ifndef OutputDir
  #define OutputDir "..\..\dist\release"
#endif
#define AppName "ZUNO-CHAT"
#define AppExe "ZUNO-CHAT.exe"
#define AppUrl "https://github.com/ruchira-edirisinghe/zuno-chat"

[Setup]
AppId={{D822005D-DA83-4740-8570-C73CFAEF6D41}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher=Ruchira Edirisinghe
AppPublisherURL={#AppUrl}
AppSupportURL={#AppUrl}/issues
AppUpdatesURL={#AppUrl}/releases
AppCopyright=MIT License
VersionInfoVersion={#AppVersion}
VersionInfoDescription={#AppName} installer
; Installs for the current user by default (no admin prompt); the first page lets people choose "all users".
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
UsePreviousAppDir=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
LicenseFile=..\..\LICENSE
OutputDir={#OutputDir}
OutputBaseFilename=ZUNO-CHAT-Setup-windows-x64
SetupIconFile=..\..\assets\icon.ico
UninstallDisplayIcon={app}\{#AppExe}
UninstallDisplayName={#AppName}
WizardStyle=modern
WizardImageFile=wizard-large.bmp,wizard-large-2x.bmp
WizardSmallImageFile=wizard-small.bmp,wizard-small-2x.bmp
Compression=lzma2/max
SolidCompression=yes
CloseApplications=no

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Shortcuts:"
Name: "autostart"; Description: "Start ZUNO-CHAT quietly when I sign in to Windows (keeps the overlay ready)"; GroupDescription: "Startup:"; Flags: unchecked

[Files]
Source: "{#SourceExe}"; DestDir: "{app}"; DestName: "{#AppExe}"; Flags: ignoreversion
Source: "..\..\LICENSE"; DestDir: "{app}"; DestName: "LICENSE.txt"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#AppName}"; Filename: "{app}\{#AppExe}"; Comment: "Open the ZUNO-CHAT control panel"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Comment: "Open the ZUNO-CHAT control panel"; Tasks: desktopicon
; Same file the in-app "Start with Windows" switch manages, so both stay in sync.
Name: "{userstartup}\{#AppName}"; Filename: "{app}\{#AppExe}"; Parameters: "--autostart"; Comment: "ZUNO-CHAT chat overlay"; Tasks: autostart

[Run]
Filename: "{app}\{#AppExe}"; Description: "Open ZUNO-CHAT now"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{sys}\taskkill.exe"; Parameters: "/F /IM {#AppExe}"; Flags: runhidden; RunOnceId: "StopApp"

[UninstallDelete]
Type: files; Name: "{userstartup}\{#AppName}.lnk"
Type: files; Name: "{app}\data\zuno-chat.log"

[Code]
// The app has no window, so stop a running copy before files are replaced.
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Code: Integer;
begin
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM {#AppExe}', '', SW_HIDE, ewWaitUntilTerminated, Code);
  Sleep(300);
  Result := '';
end;
