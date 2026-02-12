import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
    context.subscriptions.push(QuartusRptEditorProvider.register(context));
}

class QuartusRptEditorProvider implements vscode.CustomTextEditorProvider {
    private static readonly viewType = 'quartusRptViz.view';

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new QuartusRptEditorProvider(context);
        return vscode.window.registerCustomEditorProvider(QuartusRptEditorProvider.viewType, provider);
    }

    constructor(private readonly context: vscode.ExtensionContext) {}

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel
    ): Promise<void> {
        webviewPanel.webview.options = { enableScripts: true };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, this.context.extensionUri);

        const updateWebview = () => {
            void webviewPanel.webview.postMessage({
                command: 'setData',
                data: document.getText()
            });
        };

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });

        const messageSubscription = webviewPanel.webview.onDidReceiveMessage(message => {
            if (message?.command === 'ready') {
                updateWebview();
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
            messageSubscription.dispose();
        });

        updateWebview();
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
