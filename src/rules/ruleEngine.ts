import Parser from "web-tree-sitter";
import { Issue } from "../types/issue";
import { analyzePython } from "./pythonRules";
import { analyzeJavaScript } from "./javascriptRules";

/**
 * A rule function receives a single AST node and returns zero or more issues.
 */
export type RuleFunction = (node: Parser.SyntaxNode) => Issue[];

/**
 * Recursively walks every node in the tree (depth-first) and applies
 * each rule function to each node.  Collects and returns all issues.
 *
 * This is the single traversal entry-point shared by both language
 * analyzers so traversal logic is never duplicated.
 */
export function walkTree(
  root: Parser.SyntaxNode,
  rules: RuleFunction[]
): Issue[] {
  const issues: Issue[] = [];

  function visit(node: Parser.SyntaxNode): void {
    for (const rule of rules) {
      const found = rule(node);
      if (found.length > 0) {
        issues.push(...found);
      }
    }

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        visit(child);
      }
    }
  }

  visit(root);
  return issues;
}

/**
 * Runs the correct language-specific analyzer on a parsed tree.
 *
 * @param tree        The tree-sitter parse tree for the document.
 * @param languageId  The VS Code language identifier ("python" | "javascript").
 * @returns           An array of detected issues, or an empty array if the
 *                    language is not supported.
 */
export function runRules(tree: Parser.Tree, languageId: string): Issue[] {
  switch (languageId) {
    case "python":
      return analyzePython(tree);
    case "javascript":
      return analyzeJavaScript(tree);
    default:
      return [];
  }
}
