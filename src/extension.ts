import * as vscode from "vscode";
import { DiagnosticManager } from "./diagnostics/diagnosticManager";
import { ParserManager } from "./parser/parserManager";
import { runRules } from "./rules/ruleEngine";
import { AnalysisCache } from "./utils/analysisCache";
import { Debouncer } from "./utils/debouncer";

/** Languages that BugRadar supports. */
const SUPPORTED_LANGUAGES = new Set(["python", "javascript"]);

/** Milliseconds to wait after the last keystroke before analyzing. */
const DEBOUNCE_DELAY_MS = 500;

let diagnosticManager: DiagnosticManager;
let parserManager: ParserManager;
let analysisCache: AnalysisCache;

/**
 * Per-document debouncers, keyed by URI string.
 * Each document gets its own timer so edits in one file
 * don't delay analysis of another.
 */
const debouncers = new Map<string, Debouncer>();

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
  analysisCache = new AnalysisCache();

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
  // No debounce needed — this is a one-shot on startup.
  if (vscode.window.activeTextEditor) {
    analyzeDocument(vscode.window.activeTextEditor.document);
  }

  // Re-analyze whenever the user edits a document (debounced).
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      scheduleAnalysis(event.document);
    })
  );

  // Analyze when a new document is opened or the user switches tabs.
  // No debounce — opening a file should show diagnostics immediately,
  // and the cache will short-circuit if the file was already analyzed.
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      analyzeDocument(document);
    })
  );

  // Clean up diagnostics and cache when a document is closed.
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      const uriStr = document.uri.toString();
      diagnosticManager.clearDiagnostics(document.uri);
      analysisCache.delete(uriStr);

      // Cancel and remove the debouncer for this document.
      const debouncer = debouncers.get(uriStr);
      if (debouncer) {
        debouncer.cancel();
        debouncers.delete(uriStr);
      }
    })
  );

  // Ensure all managers are disposed on deactivation.
  context.subscriptions.push(diagnosticManager);
  context.subscriptions.push({
    dispose: () => {
      parserManager.dispose();
      analysisCache.clear();

      // Cancel all pending debouncers.
      for (const debouncer of debouncers.values()) {
        debouncer.cancel();
      }
      debouncers.clear();
    },
  });

  console.log("BugRadar activated");
}

/**
 * Called by VS Code when the extension is deactivated.
 */
export function deactivate(): void {
  // DiagnosticManager, ParserManager, AnalysisCache, and debouncers
  // disposal is handled via context.subscriptions.
  console.log("BugRadar deactivated");
}

/**
 * Schedules an analysis for the given document after the debounce
 * delay. Rapid consecutive calls (e.g. keystrokes) cancel previous
 * timers so only one analysis runs after typing stops.
 */
function scheduleAnalysis(document: vscode.TextDocument): void {
  if (!SUPPORTED_LANGUAGES.has(document.languageId)) {
    diagnosticManager.clearDiagnostics(document.uri);
    return;
  }

  const uriStr = document.uri.toString();

  let debouncer = debouncers.get(uriStr);
  if (!debouncer) {
    debouncer = new Debouncer(DEBOUNCE_DELAY_MS);
    debouncers.set(uriStr, debouncer);
  }

  debouncer.trigger(() => {
    // Resolve the document fresh — it may have changed since
    // the timer was set.
    const currentDoc = vscode.workspace.textDocuments.find(
      (d) => d.uri.toString() === uriStr
    );
    if (currentDoc) {
      analyzeDocument(currentDoc);
    }
  });
}

/**
 * Entry point for analyzing a single document.
 * Checks the cache first; on a hit, reuses the cached issues.
 * On a miss, parses the document, runs the rule engine, caches
 * the result, and pushes diagnostics to the editor.
 */
function analyzeDocument(document: vscode.TextDocument): void {
  // Unsupported languages: clear any stale diagnostics and bail out.
  if (!SUPPORTED_LANGUAGES.has(document.languageId)) {
    diagnosticManager.clearDiagnostics(document.uri);
    return;
  }

  const uriStr = document.uri.toString();
  const version = document.version;

  // --- Cache lookup ---
  const cached = analysisCache.get(uriStr, version);
  if (cached !== undefined) {
    console.log(`BugRadar: [Cache hit] ${document.fileName} v${version} — analysis skipped`);
    diagnosticManager.updateDiagnostics(document, cached);
    return;
  }

  console.log(`BugRadar: [Cache miss] ${document.fileName} v${version} — running analyzer...`);

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

  // Store in cache and push to diagnostics.
  analysisCache.set(uriStr, version, issues);
  diagnosticManager.updateDiagnostics(document, issues);
}
