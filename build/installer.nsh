!macro customHeader
  !define MUI_ABORTWARNING
!macroend

!macro customInit
  SetDetailsPrint both
  DetailPrint "Preparing FinTrack installation..."
!macroend

!macro customInstall
  DetailPrint "FinTrack installation in progress..."
!macroend

!macro customFinishPage
  Function StartAppCustom
    GetDlgItem $0 $HWNDPARENT 1
    EnableWindow $0 0
    GetDlgItem $0 $HWNDPARENT 2
    EnableWindow $0 0
    GetDlgItem $0 $HWNDPARENT 3
    EnableWindow $0 0

    ${if} ${isUpdated}
      StrCpy $1 "--updated"
    ${else}
      StrCpy $1 ""
    ${endif}
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
  FunctionEnd

  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_FUNCTION "StartAppCustom"
  !insertmacro MUI_PAGE_FINISH
!macroend

!macro customUnInstall
  ${ifNot} ${Silent}

    MessageBox MB_YESNO|MB_ICONQUESTION \
      "Do you want to completely delete your local FinTrack$\r$\n\
data profiles and transaction histories?$\r$\n$\r$\n\
(This action cannot be undone)" \
      IDYES purgeData IDNO skip_purge

    purgeData:
      RMDir /r "$APPDATA\fintrack"
      RMDir /r "$APPDATA\FinTrack"
      DetailPrint "Local data purged: $APPDATA\FinTrack removed."
      Goto uninstallDone

    skip_purge:
      DetailPrint "Local data preserved at $APPDATA\FinTrack."

    uninstallDone:

  ${endif}
!macroend
