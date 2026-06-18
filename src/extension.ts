import * as vscode from "vscode";
import { DiagnosticManager } from "./diagnostics/diagnosticManager";
import { ParserManager } from "./parser/parserManager";
import { runRules } from "./rules/ruleEngine";
import { Issue, IssueSeverity } from "./types/issue";

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
 * Maps IssueSeverity enum values to human-readable labels for console output.
 */
function severityLabel(severity: IssueSeverity): string {
  switch (severity) {
    case IssueSeverity.Error:
      return "error";
    case IssueSeverity.Warning:
      return "warning";
    case IssueSeverity.Information:
      return "info";
    case IssueSeverity.Hint:
      return "hint";
    default:
      return "unknown";
  }
}

/**
 * Entry point for analyzing a single document.
 * Parses the document into an AST, runs the rule engine for the
 * document's language, and logs detected issues to the Debug Console.
 */
function analyzeDocument(document: vscode.TextDocument): void {
  if (!SUPPORTED_LANGUAGES.has(document.languageId)) {
    return;
  }

  const tree = parserManager.parse(document);
  if (!tree) {
    return;
  }

  let issues: Issue[];
  try {
    issues = runRules(tree, document.languageId);
  } finally {
    tree.delete();
  }

  // --- Log issues to the Debug Console ---
  if (issues.length > 0) {
    console.log(
      `BugRadar: ${issues.length} issue${issues.length === 1 ? "" : "s"} found`
    );
    for (const issue of issues) {
      console.log(`[${severityLabel(issue.severity)}] ${issue.message}`);
    }
  } else {
    console.log("BugRadar: 0 issues found");
  }

  // Diagnostics rendering will be wired up in a future milestone.
  diagnosticManager.updateDiagnostics(document.uri, []);
}
