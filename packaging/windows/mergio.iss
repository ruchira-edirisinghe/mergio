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
; Each image comes in three sizes for sharp results at any display scaling. The Welcome and Finished pages swap in
; wizard-banner*.png, the same background with the Mergio banner down the whole left side (see CurPageChanged); the
; left-side wizard picture is the top of that banner, so together they run from the top of the window to the bottom.
WizardStyle=modern dark hidebevels includetitlebar
WizardBackColor=#0d0c14
WizardImageBackColor=#0b0a12
WizardSmallImageBackColor=#0d0c14
WizardImageFile=wizard-large.png,wizard-large-150.png,wizard-large-200.png
WizardImageStretch=yes
WizardSmallImageFile=wizard-small.png,wizard-small-150.png,wizard-small-200.png
WizardBackImageFile=wizard-back.png,wizard-back-150.png,wizard-back-200.png
; Start with a welcome page that shows how Mergio works. The Ready page shows everything that gets added, as a picture list.
DisableWelcomePage=no
DisableReadyMemo=yes
Compression=lzma2/max
SolidCompression=yes
CloseApplications=no

[Messages]
; Every page says what is being installed, where it goes and why Mergio needs it; the pictures are added by the code at the end.
WelcomeLabel1=Welcome to Mergio
WelcomeLabel2=Mergio brings the live chat, alerts and viewer counts from YouTube, Twitch, Kick, TikTok and Facebook into OBS. It's free, open source, and runs only on this PC.
LicenseLabel3=Mergio is free and open source under the MIT License. Please read the terms below; you need to accept them to continue.
SelectDirDesc=Where should the Mergio app go?
SelectDirLabel3=Mergio goes into this folder. Your settings are kept in a private "data" folder next to it, or in your AppData\Roaming\Mergio folder when this one is read-only (like Program Files).
SelectTasksDesc=Shortcuts and starting with Windows
SelectTasksLabel2=Pick what Mergio should add. You can change both later: the shortcut is a normal Windows shortcut, and starting with Windows is also a switch in Mergio > Settings.
ReadyLabel1=Ready to install Mergio
ReadyLabel2a=Here is everything Setup adds to this PC, and why. Click Install to go ahead, or Back to change something.
ReadyLabel2b=Here is everything Setup adds to this PC, and why. Click Install to go ahead, or Back to change something.
InstallingLabel=Setting up Mergio on this PC. This only takes a few seconds.
FinishedHeadingLabel=Mergio is ready
ClickFinish=
FinishedLabelNoIcons=Mergio is installed. Its control panel opens in your browser, and it only runs on this PC, so nobody can reach it from the internet.
FinishedLabel=Mergio is installed. Its control panel opens in your browser, and it only runs on this PC, so nobody can reach it from the internet.
PrivilegesRequiredOverrideText2=Install Mergio just for you (no admin needed, recommended), or for everyone who uses this PC (needs admin rights).

[Tasks]
Name: "desktopicon"; Description: "Desktop shortcut: opens the Mergio control panel"; GroupDescription: "Shortcuts:"
Name: "autostart"; Description: "Start Mergio quietly when I sign in, so the overlays and OBS docks are ready as soon as OBS opens (adds a shortcut to your Startup folder)"; GroupDescription: "Starting with Windows:"; Flags: unchecked

[Files]
Source: "{#SourceExe}"; DestDir: "{app}"; DestName: "{#AppExe}"; Flags: ignoreversion
Source: "..\..\LICENSE"; DestDir: "{app}"; DestName: "LICENSE.txt"; Flags: ignoreversion
; Pictures for the wizard pages only; they are never copied onto the PC.
Source: "wizard-back*.png"; Flags: dontcopy
Source: "wizard-banner*.png"; Flags: dontcopy
Source: "inst-*.png"; Flags: dontcopy

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
// Picture guide: each page shows what is happening in a simple picture, so nobody has to read a wall of text.
// The pictures are made by a script in three sizes; ScaleSuffix picks the one that fits the display scaling.
const
  WhyColor = $C2B1BC;   // soft lilac grey (Inno colours are BGR)
  WhereColor = $A0928F;
  RowCount = 7;

var
  BackPlain, BackBanner: TArrayOfGraphic;
  BannerShown: Boolean;
  WelcomeNote, ReadyNote: TNewStaticText;
  NextImage: TBitmapImage;
  RowIcon: array of TBitmapImage;
  RowTitle, RowWhy, RowWhere: array of TNewStaticText;

function ScaleSuffix: String;
begin
  if ScaleX(100) >= 190 then Result := '-200'
  else if ScaleX(100) >= 140 then Result := '-150'
  else Result := '';
end;

function LoadPng(const Name: String): TPngImage;
begin
  ExtractTemporaryFile(Name);
  Result := TPngImage.Create;
  Result.LoadFromFile(ExpandConstant('{tmp}\' + Name));
end;

function LoadBack(const Stem: String): TArrayOfGraphic;
begin
  SetLength(Result, 3);
  Result[0] := LoadPng(Stem + '.png');
  Result[1] := LoadPng(Stem + '-150.png');
  Result[2] := LoadPng(Stem + '-200.png');
end;

function AddImage(Parent: TWinControl; const Stem: String; X, Y, W, H: Integer): TBitmapImage;
begin
  Result := TBitmapImage.Create(WizardForm);
  Result.Parent := Parent;
  Result.Stretch := True;
  Result.PngImage := LoadPng(Stem + ScaleSuffix + '.png');
  Result.SetBounds(ScaleX(X), ScaleY(Y), ScaleX(W), ScaleY(H));
end;

function AddText(Parent: TWinControl; const Text: String; X, Y, W, H: Integer; Color: TColor; Bold: Boolean): TNewStaticText;
begin
  Result := TNewStaticText.Create(WizardForm);
  Result.Parent := Parent;
  Result.Caption := Text;
  Result.Left := ScaleX(X);
  Result.Top := ScaleY(Y);
  if W > 0 then begin
    Result.AutoSize := False;
    Result.WordWrap := H > 20;
    Result.Width := ScaleX(W);
    Result.Height := ScaleY(H);
  end;
  if Color <> clNone then Result.Font.Color := Color;
  if Bold then Result.Font.Style := [fsBold];
end;

// One line of the Ready page list: an icon, what it is, why Mergio needs it, and where it goes.
procedure AddRow(I: Integer; const Icon, Title, Why: String);
var
  Page: TWinControl;
begin
  Page := WizardForm.ReadyPage;
  RowIcon[I] := AddImage(Page, 'inst-ico-' + Icon, 0, 0, 28, 28);
  RowTitle[I] := AddText(Page, Title, 38, 0, 0, 0, clNone, True);
  RowWhy[I] := AddText(Page, Why, 38, 0, 400, 16, WhyColor, False);
  RowWhere[I] := AddText(Page, '', 38, 0, 478, 16, WhereColor, False);
end;

procedure PlaceRow(I: Integer; Show: Boolean; const Where: String; var Y: Integer);
begin
  RowIcon[I].Visible := Show;
  RowTitle[I].Visible := Show;
  RowWhy[I].Visible := Show;
  RowWhere[I].Visible := Show;
  if not Show then Exit;
  RowIcon[I].Top := Y + ScaleY(2);
  RowTitle[I].Top := Y;
  RowWhy[I].Top := Y;
  RowWhy[I].Left := RowTitle[I].Left + RowTitle[I].Width + ScaleX(6);
  RowWhy[I].Width := WizardForm.ReadyPage.ClientWidth - RowWhy[I].Left;
  RowWhere[I].Caption := Where;
  RowWhere[I].Top := Y + ScaleY(16);
  Y := Y + ScaleY(34);
end;

procedure LayoutReady;
var
  Y: Integer;
  Data, Scope: String;
begin
  if IsAdminInstallMode then begin
    Data := ExpandConstant('{userappdata}\Mergio');
    Scope := 'for everyone on this PC';
  end else begin
    Data := ExpandConstant('{app}\data');
    Scope := 'for your Windows account';
  end;
  Y := WizardForm.ReadyLabel.Top + WizardForm.ReadyLabel.Height + ScaleY(10);
  PlaceRow(0, True, ExpandConstant('{app}\{#AppExe}'), Y);
  PlaceRow(1, True, Data, Y);
  PlaceRow(2, True, 'Start menu > Mergio', Y);
  PlaceRow(3, WizardIsTaskSelected('desktopicon'), 'Desktop > Mergio', Y);
  PlaceRow(4, WizardIsTaskSelected('autostart'), 'Your Startup folder > Mergio', Y);
  PlaceRow(5, True, 'Windows registry, ' + Scope, Y);
  PlaceRow(6, True, 'Windows Settings > Apps > Mergio', Y);
  ReadyNote.Top := Y + ScaleY(2);
end;

// The Finished page: text, then the four steps, then "Open Mergio now". Set before the page is first drawn as well,
// because the tick box keeps a copy of whatever was behind it when it first appeared.
procedure PlaceFinished;
begin
  WizardForm.FinishedLabel.Height := NextImage.Top - WizardForm.FinishedLabel.Top - ScaleY(8);
  WizardForm.RunList.Top := NextImage.Top + NextImage.Height + ScaleY(10);
  WizardForm.RunList.Height := ScaleY(24);
end;

procedure InitializeWizard;
begin
  BackPlain := LoadBack('wizard-back');
  BackBanner := LoadBack('wizard-banner');
  BannerShown := False;

  // Welcome: how Mergio works, in three pictures
  WizardForm.WelcomeLabel2.Height := ScaleY(48);
  AddImage(WizardForm.WelcomePage, 'inst-how', 214, 124, 362, 182);
  WelcomeNote := AddText(WizardForm.WelcomePage, 'Before anything is copied, Setup shows you exactly what goes where.', 214, 318, 362, 32, WhyColor, False);

  // Folder: what goes into the chosen folder
  AddImage(WizardForm.SelectDirPage, 'inst-folder', 0, 166, 516, 104);

  // Ready: everything that gets added, as a picture list
  SetLength(RowIcon, RowCount);
  SetLength(RowTitle, RowCount);
  SetLength(RowWhy, RowCount);
  SetLength(RowWhere, RowCount);
  AddRow(0, 'app', 'The Mergio app', 'chat, alerts, counters, OBS docks and the control panel, in one file');
  AddRow(1, 'settings', 'Your settings', 'channels, looks and keys. Kept when you update; only you can open them');
  AddRow(2, 'startmenu', 'Start menu shortcut', 'opens the control panel');
  AddRow(3, 'desktop', 'Desktop shortcut', 'opens the control panel');
  AddRow(4, 'startup', 'Start with Windows', 'overlays and docks are ready when OBS opens');
  AddRow(5, 'link', 'mergio:// link', 'lets the control panel window start Mergio');
  AddRow(6, 'uninstall', 'Uninstaller', 'removes all of the above; your settings are kept in case you come back');
  ReadyNote := AddText(WizardForm.ReadyPage, 'Nothing else: no services, drivers, browser add-ons or account.', 0, 0, 516, 16, WhyColor, False);

  // Installing: what Setup is doing right now
  AddImage(WizardForm.InstallingPage, 'inst-doing', 0, 100, 516, 178);

  // Finished: the first four steps to an overlay in OBS
  NextImage := AddImage(WizardForm.FinishedPage, 'inst-next', 214, 112, 362, 196);
  PlaceFinished;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  // The Mergio banner runs down the whole left side on the first and last page.
  if ((CurPageID = wpWelcome) or (CurPageID = wpFinished)) <> BannerShown then begin
    BannerShown := not BannerShown;
    if BannerShown then WizardSetBackImage(BackBanner, True, True, 255)
    else WizardSetBackImage(BackPlain, True, True, 255);
  end;
  if CurPageID = wpReady then LayoutReady;
  if CurPageID = wpFinished then PlaceFinished;
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
