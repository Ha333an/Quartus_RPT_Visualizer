# Quartus RPT Visualizer (VS Code Extension)

Quartus RPT Visualizer is a custom editor extension for `.rpt` files. Opening a Quartus report in VS Code renders an interactive view with section navigation, message filtering, and search.

## Build and package

1. Open this folder in a terminal.
2. Run `npm install`.
3. Run `npm run compile` to build the webview bundle and extension host code.
4. Run `npm run package` (or `npx vsce package`) to generate a `.vsix` file.

Install the generated `.vsix` from **Extensions: Install from VSIX...** in VS Code.