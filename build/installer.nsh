!macro customFinishPage
  Function StartAppCustom
    ; Grey out/disable Finish (ID 1), Cancel (ID 2), and Back (ID 3) buttons to prevent multiple clicks and indicate loading
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
    MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to delete all vault transactions, settings, and database files (clean uninstall)?$\r$\n$\r$\nClick YES to permanently delete your offline data.$\r$\nClick NO to keep your vault database files for future reinstalls." IDNO keepData
      RMDir /r "$APPDATA\fintrack"
      RMDir /r "$APPDATA\FinTrack"
      DetailPrint "Clean uninstall: Database and vault directories deleted."
    keepData:
  ${endif}
!macroend
