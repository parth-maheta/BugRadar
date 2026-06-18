import Parser from "web-tree-sitter";
import { Issue, IssueSeverity } from "../types/issue";
import { walkTree, RuleFunction } from "./ruleEngine";

// ---------------------------------------------------------------------------
// PY001 — Bare except block
// ---------------------------------------------------------------------------
// In tree-sitter-python, a try/except looks like:
//
//   try_statement
//     block
//     except_clause          ← has NO named children when bare
//       block
//
// A bare `except:` has type "except_clause" and contains NO exception type
// child.  A specific `except SomeError:` will contain an identifier or
// expression as a child of field name (none — positional child).
// ---------------------------------------------------------------------------

function checkBareExcept(node: Parser.SyntaxNode): Issue[] {
  if (node.type !== "except_clause") {
    return [];
  }

  // An except_clause's named children are the exception type (if any) and
  // the body block.  A bare `except:` only has the body block.
  // We look for any child whose type is NOT "block" and NOT ":".
  // If none exists, it's a bare except.
  const hasExceptionType = node.namedChildren.some(
    (child) => child.type !== "block"
  );

  if (!hasExceptionType) {
    return [
      {
        message: "Avoid bare except blocks. Catch specific exceptions instead.",
        severity: IssueSeverity.Warning,
        startLine: node.startPosition.row,
        startColumn: node.startPosition.column,
        endLine: node.endPosition.row,
        endColumn: node.endPosition.column,
        ruleId: "PY001",
        source: "rule",
      },
    ];
  }

  return [];
}

// ---------------------------------------------------------------------------
// PY002 — Infinite while loop
// ---------------------------------------------------------------------------
// Tree-sitter-python:
//
//   while_statement
//     condition: true        ← identifier node with text "True"
//     body: block
// ---------------------------------------------------------------------------

function checkInfiniteWhile(node: Parser.SyntaxNode): Issue[] {
  if (node.type !== "while_statement") {
    return [];
  }

  const condition = node.childForFieldName("condition");
  if (condition && condition.type === "true") {
    return [
      {
        message: "Potential infinite loop detected.",
        severity: IssueSeverity.Warning,
        startLine: node.startPosition.row,
        startColumn: node.startPosition.column,
        endLine: node.endPosition.row,
        endColumn: node.endPosition.column,
        ruleId: "PY002",
        source: "rule",
      },
    ];
  }

  return [];
}

// ---------------------------------------------------------------------------
// PY003 — Division by zero
// ---------------------------------------------------------------------------
// Tree-sitter-python:
//
//   binary_operator
//     left:  …
//     operator: "/"
//     right: integer  → text "0"
//
// We check for any binary_operator where the operator is "/" or "//" and
// the right operand is the integer literal 0.
// ---------------------------------------------------------------------------

function checkDivisionByZero(node: Parser.SyntaxNode): Issue[] {
  if (node.type !== "binary_operator") {
    return [];
  }

  const right = node.childForFieldName("right");
  const operator = node.childForFieldName("operator");

  // tree-sitter-python exposes the operator via children rather than a field
  // in some versions; fall back to scanning unnamed children.
  const operatorText = operator
    ? operator.text
    : node.children.find(
        (c) => !c.isNamed && (c.text === "/" || c.text === "//")
      )?.text;

  if (!operatorText || (operatorText !== "/" && operatorText !== "//")) {
    return [];
  }

  if (right && right.type === "integer" && right.text === "0") {
    return [
      {
        message: "Division by zero detected.",
        severity: IssueSeverity.Error,
        startLine: node.startPosition.row,
        startColumn: node.startPosition.column,
        endLine: node.endPosition.row,
        endColumn: node.endPosition.column,
        ruleId: "PY003",
        source: "rule",
      },
    ];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** All Python rule functions. */
const pythonRules: RuleFunction[] = [
  checkBareExcept,
  checkInfiniteWhile,
  checkDivisionByZero,
];

/**
 * Analyzes a parsed Python AST and returns all detected issues.
 */
export function analyzePython(tree: Parser.Tree): Issue[] {
  return walkTree(tree.rootNode, pythonRules);
}
