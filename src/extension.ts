import * as vscode from "vscode";
import { DiagnosticManager } from "./diagnostics/diagnosticManager";
import { ParserManager } from "./parser/parserManager";
import { runRules } from "./rules/ruleEngine";

/** Languages that BugRadar supports. */
const SUPPORTED_LANGUAGES = new Set(["python", "javascript"]);

let diagnosticManager: DiagnosticManager;
let parserManager: ParserManager;

/**
 * Called by VS Code when the extension is activated.
 * Sets up the diagnostic manager, initialises tree-sitter parsers,
 * and registers event listeners for document changes and closures.
 */
export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  diagnosticManager = new DiagnosticManager();
  parserManager = new ParserManager();

  // Initialise tree-sitter WASM runtime and preload grammars.
  try {
    await parserManager.init(context);
  } catch (err) {
    console.error(`BugRadar: parser initialisation failed: ${err}`);
    vscode.window.showErrorMessage(
      "BugRadar: failed to initialise tree-sitter parsers. " +
        "Check the debug console for details."
    );
  }

  // Analyze the active document when the extension first activates.
  if (vscode.window.activeTextEditor) {
    analyzeDocument(vscode.window.activeTextEditor.document);
  }

  // Re-analyze whenever the user edits a document.
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      analyzeDocument(event.document);
    })
  );

  // Analyze when a new document is opened or the user switches tabs.
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      analyzeDocument(document);
    })
  );

  // Clean up diagnostics when a document is closed.
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      diagnosticManager.clearDiagnostics(document.uri);
    })
  );

  // Ensure both managers are disposed on deactivation.
  context.subscriptions.push(diagnosticManager);
  context.subscriptions.push({ dispose: () => parserManager.dispose() });

  console.log("BugRadar activated");
}

/**
 * Called by VS Code when the extension is deactivated.
 */
export function deactivate(): void {
  // DiagnosticManager and ParserManager disposal is handled
  // via context.subscriptions.
  console.log("BugRadar deactivated");
}

/**
 * Entry point for analyzing a single document.
 * Parses the document into an AST, runs the rule engine for the
 * document's language, and passes detected issues to the
 * DiagnosticManager for rendering in the editor.
 */
function analyzeDocument(document: vscode.TextDocument): void {
  // Unsupported languages: clear any stale diagnostics and bail out.
  if (!SUPPORTED_LANGUAGES.has(document.languageId)) {
    diagnosticManager.clearDiagnostics(document.uri);
    return;
  }

  const tree = parserManager.parse(document);
  if (!tree) {
    // Parser not ready — clear diagnostics so we don't show stale data.
    diagnosticManager.updateDiagnostics(document, []);
    return;
  }

  let issues;
  try {
    issues = runRules(tree, document.languageId);
  } finally {
    tree.delete();
  }

  // Push issues into the VS Code Diagnostics API.
  diagnosticManager.updateDiagnostics(document, issues);
}
