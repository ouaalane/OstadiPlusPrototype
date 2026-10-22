# EAS archive: Windows ENOSPC

`ENOSPC ... AppData/Local/Temp/eas-cli-nodejs/...shallow-clone` means the local temporary volume ran out of space before upload. Expo authentication, project linking and Android keystore creation have already succeeded. This is not a Gradle/native compilation error.

EAS uses the Git repository root when copying this monorepo. The root `.easignore` now excludes dashboard-only public assets, original media, design inputs, documentation and review outputs. It keeps mobile assets/source, local Swift/Kotlin modules, config plugins, shared code, both lockfiles and npm workspace metadata. A root `.easignore` replaces the nested `.gitignore` rules for archiving, so their relevant exclusions are included explicitly. Generated `apps/student-app/android` and `ios` are excluded; custom native source under `modules/capture-protection` is retained.

Validated on the checkout: 353.2 MiB before, 79.1 MiB after filtering; all 98 registry assets and required mobile/native/workspace files retained. A compressed archive was created locally. Actual sizes depend on local files. This checks archive contents, not an EAS cloud build.

After the failed build has stopped, run in PowerShell:

```powershell
# Delete failed EAS scratch copies only, not the project or Android credentials.
Remove-Item -LiteralPath "$env:LOCALAPPDATA\Temp\eas-cli-nodejs" -Recurse -Force -ErrorAction SilentlyContinue

cd C:\test2\OstadiPlusPrototype
git pull
cd apps\student-app
npx eas-cli@latest build --profile preview --platform android
```

Leave at least 1–2 GB of free space on the temporary volume as a practical margin; more is needed if local bundled media is larger. Do not clear the entire Windows Temp directory while other applications/builds are running.

If C: has no room but another drive does, set a temporary directory on that drive for this PowerShell session. For example, **only if D: exists and has free space**:

```powershell
New-Item -ItemType Directory -Force D:\EAS-Temp
$env:TEMP = 'D:\EAS-Temp'
$env:TMP = $env:TEMP
npx eas-cli@latest build --profile preview --platform android
```

Do not delete or recreate the EAS project/keystore to solve ENOSPC. Keep the local `extra.eas.projectId` that EAS added to app.json; archive filtering does not require changing it. The `cli.appVersionSource` warning is resolved by using the existing local app version.

Archive implementation checked against EAS CLI sources: [Git client](https://github.com/expo/eas-cli/blob/main/packages/eas-cli/src/vcs/clients/git.ts) and [archive ignore/copy implementation](https://github.com/expo/eas-cli/blob/main/packages/eas-cli/src/vcs/local.ts).
