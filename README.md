# 🐛 BugRadar

**Detect bugs while you type.** BugRadar is a VS Code extension that performs real-time, rule-based code analysis for Python and JavaScript — surfacing issues directly in the editor as you write.

> Completely offline. Zero external dependencies. Instant feedback.

---

## ✨ Features

- **🔴 Red squiggly underlines** for errors (e.g. division by zero)
- **🟡 Yellow squiggly underlines** for warnings (e.g. bare except, loose equality)
- **🔵 Blue info markers** for suggestions (e.g. missing await)
- **📋 Problems Panel** — all issues appear in `View → Problems` with severity, file, and line number
- **💬 Rich hover messages** — hover over any underline to see a detailed explanation with the source
- **⚡ Live updates** — diagnostics refresh instantly while typing; fixing code removes underlines immediately
- **🌳 Tree-sitter powered** — fast, accurate AST parsing via WebAssembly grammars
- **🔒 Fully offline** — no network requests, no telemetry, no API keys

---

## 🛡️ Supported Rules

### Python

| Rule | Severity | Description |
|------|----------|-------------|
| PY001 | ⚠️ Warning | Bare `except` block — catch specific exceptions instead |
| PY002 | ⚠️ Warning | `while True` infinite loop detected |
| PY003 | ❌ Error | Division by zero (`/ 0` or `// 0`) |

### JavaScript

| Rule | Severity | Description |
|------|----------|-------------|
| JS001 | ⚠️ Warning | Loose equality `==` — use strict `===` instead |
| JS002 | ⚠️ Warning | Empty `catch` block |
| JS003 | ℹ️ Info | Possible missing `await` on async-looking function call |

---

## 🏗️ Architecture

```text
VS Code Document Change / Open / Tab Switch
        │
        ▼
  analyzeDocument(document)
        │
        ├── Unsupported language? → Clear diagnostics → return
        │
        ├── Tree-sitter WASM Parser → AST
        │
        ├── Rule Engine → Issue[]
        │
        └── DiagnosticManager.updateDiagnostics(document, issues)
               │
               ├── Safe range clamping (never crashes)
               ├── Rich hover message formatting
               └── VS Code DiagnosticCollection
                    │
                    ▼
              Editor renders:
              • Squiggly underlines
              • Problems panel entries
              • Hover tooltips
```

---

## 🚀 Getting Started

### Prerequisites

- [VS Code](https://code.visualstudio.com/) 1.85 or later
- [Node.js](https://nodejs.org/) 18 or later

### Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode (recompiles on save)
npm run watch
```

### Running

1. Open this folder in VS Code.
2. Press **F5** to launch the Extension Development Host.
3. Open or create a `.py` or `.js` file — BugRadar activates automatically.

### Quick Test — Python

Create a file `test.py`:

```python
try:
    x = 5 / 0
except:
    pass

while True:
    print("Hello")
```

You should see **3 diagnostics**: red on `5 / 0`, yellow on `except:`, yellow on `while True:`.

### Quick Test — JavaScript

Create a file `test.js`:

```javascript
if (a == b) {
}

try {
    risky();
} catch (e) {
}

fetchUsers();
```

You should see **3 diagnostics**: yellow on `==`, yellow on `catch (e) {}`, blue on `fetchUsers()`.

---

## 📁 Project Structure

```text
src/
├── extension.ts                  # Extension entry point & event wiring
├── diagnostics/
│   └── diagnosticManager.ts      # Issue → vscode.Diagnostic conversion
├── parser/
│   └── parserManager.ts          # Tree-sitter WASM parser management
├── rules/
│   ├── ruleEngine.ts             # AST walker & language dispatcher
│   ├── pythonRules.ts            # Python-specific rules (PY001–PY003)
│   └── javascriptRules.ts        # JavaScript-specific rules (JS001–JS003)
└── types/
    └── issue.ts                  # Issue interface & severity enum
```

---

## 🗺️ Roadmap

| Milestone | Description | Status |
|-----------|-------------|--------|
| 1 | VS Code extension setup & diagnostic pipeline | ✅ |
| 2 | Tree-sitter AST parsing (WASM) | ✅ |
| 3 | Local rule engine (Python + JavaScript) | ✅ |
| 4 | VS Code Diagnostics integration (squigglies, Problems panel, hover) | ✅ |
| 5 | AI-powered analysis | ⬜ |

---

## 📄 License

MIT
