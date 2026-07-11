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

    ; ── Three-way uninstall prompt ──────────────────────────────────────────
    ; YES    → Deep Uninstall   : remove app + wipe all data/db files
    ; NO     → Normal Uninstall : remove app, keep all data for future reinstall
    ; CANCEL → Abort            : do nothing, exit the uninstaller
    ; ─────────────────────────────────────────────────────────────────────────
    MessageBox MB_YESNOCANCEL|MB_ICONQUESTION \
      "How would you like to uninstall FinTrack?$\r$\n$\r$\n\
[YES]    Deep Uninstall$\r$\n\
         Removes the app AND permanently deletes all your$\r$\n\
         transactions, vault data, and settings.$\r$\n\
         This action cannot be undone.$\r$\n$\r$\n\
[NO]     Normal Uninstall$\r$\n\
         Removes the app only. Your database, transactions$\r$\n\
         and settings are preserved for future reinstalls.$\r$\n$\r$\n\
[CANCEL] Cancel$\r$\n\
         Abort the uninstallation and keep everything." \
      IDYES deepUninstall IDNO keepData

    ; ── CANCEL branch: user chose to abort ───────────────────────────────────
    Abort

    ; ── YES branch: deep / clean uninstall ───────────────────────────────────
    deepUninstall:
      RMDir /r "$APPDATA\fintrack"
      RMDir /r "$APPDATA\FinTrack"
      DetailPrint "Deep uninstall complete: all data and vault files removed."
      Goto uninstallDone

    ; ── NO branch: normal uninstall (data kept) ──────────────────────────────
    keepData:
      DetailPrint "Normal uninstall complete: app removed, data preserved."

    uninstallDone:

  ${endif}
!macroend
