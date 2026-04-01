# Changelog Policy

This project keeps one Markdown changelog file per release in this folder.

## Rules

- Create one file for each version.
- The filename must match the Git tag exactly.
- Use the format `vX.Y.Z.md`.
- Each changelog file must describe only the changes introduced in that version.
- Do not append older release history into newer release notes.

## Release Workflow

1. Update `package.json` version if needed.
2. Create a new changelog file, for example `changelog/v1.2.0.md`.
3. Write only the new or changed items for that version.
4. Commit the changes.
5. Create and push the matching Git tag, for example `v1.2.0`.
6. GitHub Actions will build:
   - `RxFHIR-macOS-<version>.dmg`
   - `RxFHIR-macOS-<version>.zip`
   - `RxFHIR-Windows-Setup-<version>.exe`
   - `RxFHIR-Windows-Portable-<version>.exe`
   - `RxFHIR-Linux-<version>.AppImage`
   - `RxFHIR-Linux-<version>.deb`
7. The GitHub Release body will prepend a platform download guide, then use only that version's changelog file.

## Template

```md
# RxFHIR vX.Y.Z

## Added

- ...

## Changed

- ...

## Fixed

- ...
```
