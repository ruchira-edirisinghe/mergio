; Mergio Windows installer (Inno Setup 6).
; Built by `npm run package` on Windows, which passes the version and paths:
;   ISCC /DAppVersion=1.1.0 /DSourceExe=..\..\dist\Mergio.exe /DOutputDir=..\..\dist\release mergio.iss

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif
#ifndef SourceExe
  #define SourceExe "..\..\dist\Mergio.exe"
#endif
#ifndef OutputDir
  #define OutputDir "..\..\dist\release"
#endif
#define AppName "Mergio"
#define AppExe "Mergio.exe"
#define AppUrl "https://github.com/ruchira-edirisinghe/mergio"

[Setup]
AppId={{D822005D-DA83-4740-8570-C73CFAEF6D41}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher=Ruchira Edirisinghe
AppPublisherURL={#AppUrl}
AppSupportURL={#AppUrl}/issues
AppUpdatesURL={#AppUrl}/releases
AppCopyright=Copyright (c) 2026 Ruchira Edirisinghe (MIT License with credit to the creator)
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
OutputBaseFilename=Mergio-Setup-windows-x64
SetupIconFile=..\..\assets\icon.ico
UninstallDisplayIcon={app}\{#AppExe}
UninstallDisplayName={#AppName}
; Dark, violet to pink: the same look as the website and the control panel.
; The artwork is made from the logo by a script; each image comes in three sizes for sharp results at any display scaling.
WizardStyle=modern dark hidebevels includetitlebar
WizardBackColor=#0d0c14
WizardImageBackColor=#0b0a12
WizardSmallImageBackColor=#0d0c14
WizardImageFile=wizard-large.png,wizard-large-150.png,wizard-large-200.png
WizardSmallImageFile=wizard-small.png,wizard-small-150.png,wizard-small-200.png
WizardBackImageFile=wizard-back.png,wizard-back-150.png,wizard-back-200.png
; Start with a welcome page that says what gets installed.
DisableWelcomePage=no
Compression=lzma2/max
SolidCompression=yes
CloseApplications=no

[Messages]
; Every page says what is being installed, where it goes and why Mergio needs it.
WelcomeLabel1=Welcome to Mergio
WelcomeLabel2=Mergio puts the live chat from YouTube, Twitch, Kick, TikTok and Facebook into one overlay for OBS.%n%nThis installs:%n  •  The Mergio app: one program file, Mergio.exe%n  •  A Start menu shortcut, so you can open it%n  •  A mergio:// link, so its control panel window can start it%n%nNo drivers, services or browser add-ons, and no account. Everything stays on this PC, and you can remove it any time in Windows Settings > Apps.
LicenseLabel3=Mergio is free and open source under the MIT License. Please read the terms below; you need to accept them to continue.
SelectDirDesc=Where should the Mergio app go?
SelectDirLabel3=Mergio.exe is copied into this folder. It holds the whole app: the chat connections, the overlays and the control panel.%n%nYour settings and chat list are saved in a "data" folder next to it (or in your own AppData\Roaming\Mergio folder when this folder is read-only, like Program Files). Only your Windows account can open that folder, because it can hold your Facebook token.
SelectTasksDesc=Shortcuts and starting with Windows
SelectTasksLabel2=Pick what Mergio should add. You can change both later: the shortcut is a normal Windows shortcut, and starting with Windows is also a switch in Mergio > Settings.
ReadyLabel1=Ready to install Mergio
ReadyLabel2a=Here is everything that will be added to this PC, and why. Click Install to continue, or Back to change something.
InstallingLabel=Copying Mergio onto this PC. This only takes a few seconds.
FinishedHeadingLabel=Mergio is ready
FinishedLabelNoIcons=Mergio is installed. Its control panel opens in your browser: add your chats, then copy the overlay link into OBS as a Browser source.%n%nMergio only runs on this PC (at http://localhost:8787) and can't be reached from the internet.
FinishedLabel=Mergio is installed. Its control panel opens in your browser: add your chats, then copy the overlay link into OBS as a Browser source.%n%nMergio only runs on this PC (at http://localhost:8787) and can't be reached from the internet. Open it again any time from the Start menu.
PrivilegesRequiredOverrideText2=Install Mergio just for you (no admin needed, recommended), or for everyone who uses this PC (needs admin rights).

[Tasks]
Name: "desktopicon"; Description: "Desktop shortcut: opens the Mergio control panel"; GroupDescription: "Shortcuts:"
Name: "autostart"; Description: "Start Mergio quietly when I sign in, so the overlays in OBS are ready as soon as OBS opens (adds a shortcut to your Startup folder)"; GroupDescription: "Starting with Windows:"; Flags: unchecked

[Files]
Source: "{#SourceExe}"; DestDir: "{app}"; DestName: "{#AppExe}"; Flags: ignoreversion
Source: "..\..\LICENSE"; DestDir: "{app}"; DestName: "LICENSE.txt"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#AppName}"; Filename: "{app}\{#AppExe}"; Comment: "Open the Mergio control panel"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Comment: "Open the Mergio control panel"; Tasks: desktopicon
; Same file the in-app "Start with Windows" switch manages, so both stay in sync.
Name: "{userstartup}\{#AppName}"; Filename: "{app}\{#AppExe}"; Parameters: "--autostart"; Comment: "Mergio chat overlay"; Tasks: autostart

[Registry]
; The mergio:// link lets the control panel app window start Mergio (its "Start Mergio" button).
Root: HKA; Subkey: "Software\Classes\mergio"; ValueType: string; ValueName: ""; ValueData: "URL:Mergio"; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\mergio"; ValueType: string; ValueName: "URL Protocol"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\mergio\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\{#AppExe},0"
Root: HKA; Subkey: "Software\Classes\mergio\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#AppExe}"" ""%1"""

[Run]
Filename: "{app}\{#AppExe}"; Description: "Open Mergio now"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{sys}\taskkill.exe"; Parameters: "/F /IM {#AppExe}"; Flags: runhidden; RunOnceId: "StopApp"

[UninstallDelete]
Type: files; Name: "{userstartup}\{#AppName}.lnk"
Type: files; Name: "{app}\data\mergio.log"

[Code]
// The Ready page lists everything that will be added, where it goes and why Mergio needs it.
function UpdateReadyMemo(Space, NewLine, MemoUserInfoInfo, MemoDirInfo, MemoTypeInfo, MemoComponentsInfo, MemoGroupInfo, MemoTasksInfo: String): String;
var
  S, Data, Scope: String;
begin
  if IsAdminInstallMode then begin
    Data := ExpandConstant('{userappdata}\Mergio');
    Scope := 'for everyone on this PC';
  end else begin
    Data := ExpandConstant('{app}\data');
    Scope := 'for your Windows account';
  end;
  S := 'The app' + NewLine +
    Space + ExpandConstant('{app}\{#AppExe}') + NewLine +
    Space + 'The whole of Mergio in one file: it connects to your chats and serves the overlays and the control panel.' + NewLine + NewLine +
    'Your settings' + NewLine +
    Space + Data + NewLine +
    Space + 'Your chats, styles and keys. Kept when you update, and only your account can open it.' + NewLine + NewLine +
    'Start menu' + NewLine +
    Space + 'A Mergio shortcut, to open the control panel.' + NewLine + NewLine;
  if WizardIsTaskSelected('desktopicon') then
    S := S + 'Desktop' + NewLine + Space + 'A Mergio shortcut, to open the control panel.' + NewLine + NewLine;
  if WizardIsTaskSelected('autostart') then
    S := S + 'Starting with Windows' + NewLine + Space + 'A shortcut in your Startup folder, so Mergio is running and the overlays are ready when you open OBS.' + NewLine + NewLine;
  S := S + 'mergio:// link (Windows registry, ' + Scope + ')' + NewLine +
    Space + 'Lets the Mergio control panel window start Mergio when it isn''t running (its "Start Mergio" button).' + NewLine + NewLine +
    'Uninstaller' + NewLine +
    Space + 'Windows Settings > Apps > Mergio removes everything above. Your settings folder is kept in case you reinstall.' + NewLine + NewLine +
    'Not installed: no services, drivers or browser add-ons. Mergio only talks to the chat sites you add, and to GitHub to check for updates.';
  Result := S;
end;

// Long lines in the Ready summary wrap instead of running off the side.
procedure InitializeWizard;
begin
  WizardForm.ReadyMemo.WordWrap := True;
  WizardForm.ReadyMemo.ScrollBars := ssVertical;
end;

// The app has no window, so stop a running copy before files are replaced.
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Code: Integer;
begin
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM {#AppExe}', '', SW_HIDE, ewWaitUntilTerminated, Code);
  Sleep(300);
  Result := '';
end;
