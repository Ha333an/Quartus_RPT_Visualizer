import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext): void {
    context.subscriptions.push(QuartusRptEditorProvider.register(context));
}

class QuartusRptEditorProvider implements vscode.CustomTextEditorProvider {
    private static readonly viewType = 'quartusRptViz.view';

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new QuartusRptEditorProvider(context);
        return vscode.window.registerCustomEditorProvider(QuartusRptEditorProvider.viewType, provider, {
            webviewOptions: {
                retainContextWhenHidden: true,
            },
        });
    }

    constructor(private readonly context: vscode.ExtensionContext) {}

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel
    ): Promise<void> {
        webviewPanel.webview.options = { enableScripts: true };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, this.context.extensionUri);

        const updateWebview = async () => {
            await webviewPanel.webview.postMessage({
                command: 'processing',
                active: true
            });

            try {
                await webviewPanel.webview.postMessage({
                    command: 'setData',
                    data: document.getText()
                });
            } finally {
                await webviewPanel.webview.postMessage({
                    command: 'processing',
                    active: false
                });
            }
        };

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.uri.toString() === document.uri.toString()) {
                void updateWebview();
            }
        });

        const openFileAtLocation = async (filePath: string, line: number) => {
            try {
                const targetLine = Number.isFinite(line) && line > 0 ? line : 1;
                const cleanedPath = String(filePath ?? '').trim().replace(/^['"]|['"]$/g, '');
                if (!cleanedPath) {
                    return;
                }

                let fileUri: vscode.Uri;
                if (cleanedPath.startsWith('file://')) {
                    fileUri = vscode.Uri.parse(cleanedPath);
                } else {
                    const isAbsolutePath = /^[A-Za-z]:[\\/]/.test(cleanedPath) || cleanedPath.startsWith('/') || path.isAbsolute(cleanedPath);
                    const resolvedPath = isAbsolutePath
                        ? cleanedPath
                        : path.resolve(path.dirname(document.uri.fsPath), cleanedPath);
                    fileUri = vscode.Uri.file(resolvedPath);
                }

                const targetDocument = await vscode.workspace.openTextDocument(fileUri);
                const editor = await vscode.window.showTextDocument(targetDocument, {
                    viewColumn: webviewPanel.viewColumn,
                    preview: false,
                    preserveFocus: false,
                });
                const position = new vscode.Position(targetLine - 1, 0);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
            } catch {
                void vscode.window.showWarningMessage(`Unable to open file: ${filePath}`);
            }
        };

        const messageSubscription = webviewPanel.webview.onDidReceiveMessage(message => {
            if (message?.command === 'ready') {
                void updateWebview();
                return;
            }

            if (message?.command === 'openFileAtLocation' && typeof message.filePath === 'string') {
                const line = Number.parseInt(String(message.line ?? '1'), 10);
                void openFileAtLocation(message.filePath, Number.isFinite(line) ? line : 1);
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
            messageSubscription.dispose();
        });

    }

    private getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'bundle.js'));

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quartus RPT Visualizer</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            margin: 0;
            padding: 0;
        }
        .mono {
            font-family: 'JetBrains Mono', monospace;
        }
        #root {
            min-height: 100vh;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script>
        window.vscode = acquireVsCodeApi();
    </script>
    <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
    }
}
