import Parser from "web-tree-sitter";
import { Issue, IssueSeverity } from "../types/issue";
import { walkTree, RuleFunction } from "./ruleEngine";

// ---------------------------------------------------------------------------
// JS001 — Loose equality
// ---------------------------------------------------------------------------
// Tree-sitter-javascript:
//
//   binary_expression
//     left:     …
//     operator: "=="
//     right:    …
//
// We flag `==` but not `===`.  The same check also catches `!=` vs `!==`
// but the requirement only asks for `==`, so we limit to that.
// ---------------------------------------------------------------------------

function checkLooseEquality(node: Parser.SyntaxNode): Issue[] {
  if (node.type !== "binary_expression") {
    return [];
  }

  // In tree-sitter-javascript the operator is an unnamed child between
  // the left and right operands.  We find it by scanning children.
  const operatorNode = node.children.find(
    (child) => !child.isNamed && child.text === "=="
  );

  if (!operatorNode) {
    return [];
  }

  return [
    {
      message: "Use strict equality (===) instead of ==.",
      severity: IssueSeverity.Warning,
      startLine: operatorNode.startPosition.row,
      startColumn: operatorNode.startPosition.column,
      endLine: operatorNode.endPosition.row,
      endColumn: operatorNode.endPosition.column,
      ruleId: "JS001",
      source: "rule",
    },
  ];
}

// ---------------------------------------------------------------------------
// JS002 — Empty catch block
// ---------------------------------------------------------------------------
// Tree-sitter-javascript:
//
//   try_statement
//     body: statement_block { … }
//     handler: catch_clause
//       parameter: catch_clause_parameter (e)
//       body: statement_block { }     ← empty when namedChildCount === 0
//
// An empty catch has a `statement_block` body with no named children
// (only the anonymous `{` and `}` tokens).
// ---------------------------------------------------------------------------

function checkEmptyCatch(node: Parser.SyntaxNode): Issue[] {
  if (node.type !== "catch_clause") {
    return [];
  }

  const body = node.childForFieldName("body");
  if (body && body.type === "statement_block" && body.namedChildCount === 0) {
    return [
      {
        message: "Empty catch block detected.",
        severity: IssueSeverity.Warning,
        startLine: node.startPosition.row,
        startColumn: node.startPosition.column,
        endLine: node.endPosition.row,
        endColumn: node.endPosition.column,
        ruleId: "JS002",
        source: "rule",
      },
    ];
  }

  return [];
}

// ---------------------------------------------------------------------------
// JS003 — Missing await on async-looking calls
// ---------------------------------------------------------------------------
// Tree-sitter-javascript:
//
//   expression_statement
//     call_expression
//       function: identifier   ← name starts with fetch / get / load
//       arguments: arguments
//
// An awaited call looks like:
//
//   expression_statement
//     await_expression
//       call_expression
//         …
//
// So if a `call_expression` whose function name starts with one of the
// prefixes is NOT the direct child of an `await_expression`, we flag it.
// ---------------------------------------------------------------------------

/** Prefixes that suggest the function is asynchronous. */
const ASYNC_PREFIXES = ["fetch", "get", "load"];

function checkMissingAwait(node: Parser.SyntaxNode): Issue[] {
  if (node.type !== "call_expression") {
    return [];
  }

  const functionNode = node.childForFieldName("function");
  if (!functionNode || functionNode.type !== "identifier") {
    return [];
  }

  const name = functionNode.text;
  const matchesPrefix = ASYNC_PREFIXES.some((prefix) =>
    name.startsWith(prefix)
  );

  if (!matchesPrefix) {
    return [];
  }

  // If the parent is an await_expression the call is properly awaited.
  if (node.parent && node.parent.type === "await_expression") {
    return [];
  }

  return [
    {
      message: "Possible missing await for asynchronous function call.",
      severity: IssueSeverity.Information,
      startLine: node.startPosition.row,
      startColumn: node.startPosition.column,
      endLine: node.endPosition.row,
      endColumn: node.endPosition.column,
      ruleId: "JS003",
      source: "rule",
    },
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** All JavaScript rule functions. */
const javascriptRules: RuleFunction[] = [
  checkLooseEquality,
  checkEmptyCatch,
  checkMissingAwait,
];

/**
 * Analyzes a parsed JavaScript AST and returns all detected issues.
 */
export function analyzeJavaScript(tree: Parser.Tree): Issue[] {
  return walkTree(tree.rootNode, javascriptRules);
}
