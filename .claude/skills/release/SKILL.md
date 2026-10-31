---
name: release
description: Build and verify the portable Disk Cleaner executable. Use when asked to build, package or update the exe ("собери приложение", "обнови exe").
---

# Release

1. Bump `version` in `package.json` by semver if behaviour changed since the last build.
2. Run `npm run check`, then `npm run test:e2e`. Stop and report on any failure.
3. Run `npm run package`. If a running `DiskCleaner.exe` holds the output folder, ask the user to close it; don't kill the process.
4. Check the build: `release/DiskCleaner-win32-x64/DiskCleaner.exe` exists and `resources/app.asar` contains only `package.json` and `out/`.
5. Launch the exe with `node scripts/screenshot.mjs <png> --packaged` and look at the picture: rows are filled in and the text is readable. Never press clean in this step.
6. Report the version, size and path, and what you checked. Commit only if the user asks.
