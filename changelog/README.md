# Changelog Policy

This project keeps one Markdown changelog file per release in this folder.

## Rules

- Create one file for each version.
- The filename must match the Git tag exactly.
- Use the format `vX.Y.Z.md`.
- Each changelog file must describe only the changes introduced in that version.
- Do not append older release history into newer release notes.

## Release Workflow

1. Merge the release-ready changes onto `main`.
2. Run `npm run release -- patch` or `npm run release -- 1.2.0`.
3. The script will update the package version, refresh the README badge, validate `npm run typecheck`, commit the release metadata, create the matching tag, and push the branch plus tag.
4. If `changelog/vX.Y.Z.md` does not exist yet, the script will scaffold it and open `$EDITOR`.
5. GitHub Actions will build:
   - `RxFHIR-macOS-<version>.dmg`
   - `RxFHIR-macOS-<version>.zip`
   - `RxFHIR-Windows-Setup-<version>.exe`
   - `RxFHIR-Windows-Portable-<version>.exe`
   - `RxFHIR-Linux-<version>.AppImage`
   - `RxFHIR-Linux-<version>.deb`
6. The GitHub Release body will prepend a platform download guide, then use only that version's changelog file.

If you want to provide notes from another file directly, run:

```bash
npm run release -- patch --notes-file ./path/to/notes.md
```

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
