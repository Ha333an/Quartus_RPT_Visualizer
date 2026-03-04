# Changelog

All notable changes to this project are documented in this file.

## [1.0.9] - 2026-03-04

### Fixed
- Windows drive-letter paths (for example `D:/...`) are no longer misparsed as module labels, preventing incorrect bolding of `D:`.
- Clickable file-path detection now preserves full drive-prefixed paths so file open works reliably.
- Custom editor state is retained when switching between files, preventing unnecessary re-open/reload behavior on return.

## [1.0.8] - 2026-03-04

### Fixed
- Table content text no longer appears muted/gray; table cells now render with explicit readable text color.

## [1.0.7] - 2026-03-04

### Added
- Drag-and-drop support for loading `.rpt` files in webpage/dev mode.
- Clickable hyperlink support for web URLs in report lines.
- Clickable `File: ... Line: ...` references that open files at the target line.
- Clickable filesystem path detection for:
  - absolute drive paths (`C:/...`, `C:\...`)
  - root paths (`/...`)
  - relative paths (`./...`, `../...`)

### Changed
- Improved module-instance bold formatting so descriptive prefixes are no longer bolded.
- File/link navigation opens in the same VS Code editor group as the report view.
- Relative file paths are resolved against the current `.rpt` file location.
- Top toolbar was compacted into a tighter, mostly single-line workflow.
- `Go to Section` navigation now prioritizes `Table of Contents` entries and jumps to mapped sections.
- `Go to Section` dropdown now renders as a floating overlay instead of being constrained by header height.

### Fixed
- Incorrect bold styling in lines such as `Parameter Settings for User Entity Instance: ...` where only the instance token should be bold.
- Paths containing `|` (design hierarchy style) are no longer treated as clickable file paths.
- Path-like text with only a single `/` is ignored to reduce false-positive path links.
