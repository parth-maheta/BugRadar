import * as vscode from "vscode";

/**
 * Severity levels for detected issues.
 * Maps directly to vscode.DiagnosticSeverity for seamless integration.
 */
export enum IssueSeverity {
  Error = vscode.DiagnosticSeverity.Error,
  Warning = vscode.DiagnosticSeverity.Warning,
  Information = vscode.DiagnosticSeverity.Information,
  Hint = vscode.DiagnosticSeverity.Hint,
}

/**
 * Represents a single issue detected by a rule.
 *
 * This is the contract between rule implementations and the diagnostic system.
 * Rules produce Issue objects; the DiagnosticManager converts them into
 * vscode.Diagnostic instances for display in the editor.
 */
export interface Issue {
  /** Human-readable description of the problem. */
  message: string;

  /** Severity of the issue. */
  severity: IssueSeverity;

  /** Zero-based line number where the issue starts. */
  startLine: number;

  /** Zero-based column number where the issue starts. */
  startColumn: number;

  /** Zero-based line number where the issue ends. */
  endLine: number;

  /** Zero-based column number where the issue ends. */
  endColumn: number;

  /** Identifier for the rule that produced this issue (e.g., "PY001"). */
  ruleId: string;

  /** Which analysis source produced this issue. */
  source: "rule" | "ai";
}
