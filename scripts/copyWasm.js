/**
 * copyWasm.js
 *
 * Copies tree-sitter WASM files into `out/parsers/` so the extension
 * can locate them at runtime via `context.extensionPath`.
 *
 * Run automatically as part of `npm run compile` and `npm run watch`.
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const destDir = path.join(projectRoot, "out", "parsers");

// Files to copy: [source relative to project root, destination filename]
const filesToCopy = [
  [
    path.join("node_modules", "web-tree-sitter", "tree-sitter.wasm"),
    "tree-sitter.wasm",
  ],
  [
    path.join(
      "node_modules",
      "tree-sitter-wasms",
      "out",
      "tree-sitter-python.wasm"
    ),
    "tree-sitter-python.wasm",
  ],
  [
    path.join(
      "node_modules",
      "tree-sitter-wasms",
      "out",
      "tree-sitter-javascript.wasm"
    ),
    "tree-sitter-javascript.wasm",
  ],
];

// Ensure destination directory exists.
fs.mkdirSync(destDir, { recursive: true });

for (const [srcRelative, destName] of filesToCopy) {
  const src = path.join(projectRoot, srcRelative);
  const dest = path.join(destDir, destName);

  if (!fs.existsSync(src)) {
    console.error(`  ✗ Source not found: ${srcRelative}`);
    process.exit(1);
  }

  fs.copyFileSync(src, dest);
  console.log(`  ✓ ${destName}`);
}

console.log("WASM files copied to out/parsers/");
