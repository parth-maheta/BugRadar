# BugRadar

**Detect bugs while you type.** BugRadar is a VS Code extension that performs real-time, rule-based code analysis for Python and JavaScript — surfacing issues directly in the editor as you write.

## Features (MVP)

- **Real-time diagnostics** — issues appear as you type, using VS Code's native diagnostic system (squiggly underlines in the editor and entries in the Problems panel).
- **Python & JavaScript** — initial support for the two most popular scripting languages.
- **Rule-based analysis** — fast, local, zero-latency checks powered by tree-sitter AST parsing.

## Getting Started

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

## Roadmap

| Milestone | Description | Status |
|-----------|-------------|--------|
| 1 | Project setup, diagnostic pipeline | ✅ |
| 2 | Tree-sitter AST parsing | ⬜ |
| 3 | Rule-based analysis (Python + JS) | ⬜ |
| 4 | AI-powered analysis | ⬜ |

## License

MIT
