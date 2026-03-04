# Quartus RPT Visualizer (VS Code Extension)

Quartus RPT Visualizer is a custom editor extension for Intel Quartus `.rpt` files. Open any report in VS Code and get a structured, searchable, developer-friendly view.

## Highlights

- Structured report sections with fast section jumping
- `Go to Section` menu sourced from `Table of Contents` entries with direct jump-to-section
- Message filtering for Info, Warning, Critical Warning, and Error
- Incremental search with next/previous match navigation
- Raw mode and structured mode toggle
- Drag-and-drop report loading in webpage/dev view
- Compact single-row top toolbar for faster navigation
- Clickable links:
	- Web URLs (`https://...`, `www...`)
	- `File: ... Line: ...` references
	- Filesystem-style paths (`C:/...`, `/...`, `./...`, `../...`)
- Smart non-link filtering for hierarchy-like text (for example paths containing `|`)
- File links open in the same VS Code editor group and jump to the target line
- Improved table readability with explicit non-gray table text styling

## Usage

### In VS Code

1. Open a `.rpt` file.
2. The custom editor opens automatically.
3. Use search/filter controls or click file/path links to jump into source files.

### In webpage/dev mode

1. Run `npm run dev`.
2. Upload a `.rpt` file, or drag and drop it onto the page.

## Development

1. Install dependencies: `npm install`
2. Build extension + webview bundle: `npm run compile`
3. Optional dev preview: `npm run dev`

## Packaging

1. Build everything: `npm run compile`
2. Create VSIX: `npm run package` (or `npx vsce package`)
3. Install from VS Code command palette: `Extensions: Install from VSIX...`