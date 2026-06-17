import * as vscode from "vscode";
import { Issue } from "../types/issue";

/**
 * Manages VS Code diagnostics for BugRadar.
 *
 * Responsibilities:
 * - Owns the single DiagnosticCollection for the extension.
 * - Converts Issue objects into vscode.Diagnostic instances.
 * - Updates or clears diagnostics per document URI.
 */
export class DiagnosticManager {
  private readonly diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection("bugradar");
  }

  /**
   * Replaces all diagnostics for the given document with the supplied issues.
   * Pass an empty array to clear diagnostics for that document.
   */
  updateDiagnostics(uri: vscode.Uri, issues: Issue[]): void {
    const diagnostics = issues.map((issue) => this.issueToDiagnostic(issue));
    this.diagnosticCollection.set(uri, diagnostics);
  }

  /**
   * Removes all diagnostics for a specific document.
   */
  clearDiagnostics(uri: vscode.Uri): void {
    this.diagnosticCollection.delete(uri);
  }

  /**
   * Removes all BugRadar diagnostics across every open document.
   */
  clearAll(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * Disposes the underlying DiagnosticCollection.
   * Called automatically when the extension deactivates.
   */
  dispose(): void {
    this.diagnosticCollection.dispose();
  }

  /**
   * Converts a single Issue into a vscode.Diagnostic.
   */
  private issueToDiagnostic(issue: Issue): vscode.Diagnostic {
    const range = new vscode.Range(
      issue.startLine,
      issue.startColumn,
      issue.endLine,
      issue.endColumn
    );

    const diagnostic = new vscode.Diagnostic(
      range,
      issue.message,
      issue.severity as unknown as vscode.DiagnosticSeverity
    );

    diagnostic.source = "BugRadar";
    diagnostic.code = issue.ruleId;

    return diagnostic;
  }
}
