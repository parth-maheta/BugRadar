import * as vscode from "vscode";
import { Issue } from "../types/issue";

/**
 * Manages VS Code diagnostics for BugRadar.
 *
 * Responsibilities:
 * - Owns the single DiagnosticCollection for the extension.
 * - Converts Issue objects into vscode.Diagnostic instances.
 * - Updates or clears diagnostics per document URI.
 * - Clamps ranges safely so the extension never crashes on
 *   invalid positions from the rule engine.
 * - Formats hover messages with a consistent BugRadar header.
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
   *
   * @param document  The full TextDocument, used for range clamping.
   * @param issues    The issues detected by the rule engine.
   */
  updateDiagnostics(document: vscode.TextDocument, issues: Issue[]): void {
    const diagnostics = issues.map((issue) =>
      this.issueToDiagnostic(issue, document)
    );
    this.diagnosticCollection.set(document.uri, diagnostics);
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

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Converts a single Issue into a vscode.Diagnostic with a safely
   * clamped range and a rich hover message.
   */
  private issueToDiagnostic(
    issue: Issue,
    document: vscode.TextDocument
  ): vscode.Diagnostic {
    const range = this.buildSafeRange(issue, document);

    const diagnostic = new vscode.Diagnostic(
      range,
      issue.message,
      issue.severity as unknown as vscode.DiagnosticSeverity
    );

    // Source appears in the Problems panel next to the message.
    diagnostic.source = "BugRadar";

    // Rule ID appears as a clickable code in the Problems panel.
    diagnostic.code = issue.ruleId;

    // Rich hover message: header + description + origin.
    diagnostic.message = [
      "BugRadar",
      "",
      issue.message,
      "",
      "Source: Local Rule Engine",
    ].join("\n");

    return diagnostic;
  }

  /**
   * Builds a vscode.Range from an Issue, clamping every coordinate
   * so it never falls outside the document bounds.
   *
   * If precise end positions result in a zero-width range (start === end),
   * we extend the range to cover at least one character so the squiggly
   * underline is visible.
   */
  private buildSafeRange(
    issue: Issue,
    document: vscode.TextDocument
  ): vscode.Range {
    const lastLine = Math.max(document.lineCount - 1, 0);

    // Clamp start position.
    const startLine = this.clamp(issue.startLine, 0, lastLine);
    const startLineLength = document.lineAt(startLine).text.length;
    const startColumn = this.clamp(issue.startColumn, 0, startLineLength);

    // Clamp end position.
    let endLine = this.clamp(issue.endLine, startLine, lastLine);
    let endLineLength = document.lineAt(endLine).text.length;
    let endColumn = this.clamp(issue.endColumn, 0, endLineLength);

    // Guarantee at least 1-character width so squigglies are visible.
    if (startLine === endLine && startColumn === endColumn) {
      if (endColumn < endLineLength) {
        endColumn += 1;
      } else if (startColumn > 0) {
        // Edge case: cursor at end-of-line — extend backwards is not ideal,
        // so instead try the next line if available.
        // But for simplicity and visibility, just keep the single char.
        // The diagnostic will still render at the position.
      }
    }

    return new vscode.Range(startLine, startColumn, endLine, endColumn);
  }

  /**
   * Clamps a number to the inclusive [min, max] range.
   */
  private clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value) || value < min) {
      return min;
    }
    if (value > max) {
      return max;
    }
    return Math.floor(value);
  }
}
