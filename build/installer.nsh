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
