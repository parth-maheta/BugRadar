import * as vscode from "vscode";
import * as path from "path";
import Parser from "web-tree-sitter";

/**
 * Maps VS Code language identifiers to their tree-sitter WASM grammar filenames.
 */
const LANGUAGE_WASM_FILES: ReadonlyMap<string, string> = new Map([
  ["python", "tree-sitter-python.wasm"],
  ["javascript", "tree-sitter-javascript.wasm"],
]);

/**
 * Manages tree-sitter parsers for all supported languages.
 *
 * Responsibilities:
 * - Initialises the tree-sitter WASM runtime exactly once.
 * - Loads language grammars from `.wasm` files bundled in `out/parsers/`.
 * - Provides a `parse()` method that returns an AST for a given document.
 * - Caches `Parser.Language` instances so each grammar is loaded only once.
 */
export class ParserManager {
  /** Cached Language objects, keyed by VS Code language ID. */
  private readonly languages = new Map<string, Parser.Language>();

  /** One parser instance reused across all parse calls. */
  private parser: Parser | null = null;

  /** Whether the WASM runtime has been initialised. */
  private initialised = false;

  /**
   * Absolute path to the directory containing WASM files.
   * Set during `init()` from the extension context.
   */
  private wasmDir = "";

  /**
   * Initialises the tree-sitter WASM runtime and preloads all
   * supported language grammars.
   *
   * Must be called once during extension activation before any
   * `parse()` calls.
   *
   * @param context  The VS Code extension context (used to resolve
   *                 the extension install path for WASM files).
   */
  async init(context: vscode.ExtensionContext): Promise<void> {
    if (this.initialised) {
      return;
    }

    this.wasmDir = path.join(context.extensionPath, "out", "parsers");

    // Point the WASM loader at our bundled `tree-sitter.wasm`.
    const treeSitterWasmPath = path.join(this.wasmDir, "tree-sitter.wasm");

    await Parser.init({
      locateFile: () => treeSitterWasmPath,
    });

    this.parser = new Parser();

    // Preload all language grammars so parsing is instant on first edit.
    for (const [langId, wasmFile] of LANGUAGE_WASM_FILES) {
      const wasmPath = path.join(this.wasmDir, wasmFile);
      try {
        const language = await Parser.Language.load(wasmPath);
        this.languages.set(langId, language);
        console.log(`BugRadar: loaded grammar for ${langId}`);
      } catch (err) {
        console.error(
          `BugRadar: failed to load grammar for ${langId}: ${err}`
        );
      }
    }

    this.initialised = true;
    console.log("BugRadar: ParserManager initialised");
  }

  /**
   * Returns the set of language IDs for which a grammar was
   * successfully loaded.
   */
  getSupportedLanguages(): ReadonlySet<string> {
    return new Set(this.languages.keys());
  }

  /**
   * Returns `true` if a grammar is available for the given language ID.
   */
  hasLanguage(languageId: string): boolean {
    return this.languages.has(languageId);
  }

  /**
   * Parses the full text of a VS Code document and returns the
   * tree-sitter syntax tree.
   *
   * Returns `null` if:
   * - The ParserManager has not been initialised.
   * - No grammar is loaded for the document's language.
   *
   * @param document  The VS Code text document to parse.
   */
  parse(document: vscode.TextDocument): Parser.Tree | null {
    if (!this.parser) {
      console.warn("BugRadar: ParserManager.parse() called before init()");
      return null;
    }

    const language = this.languages.get(document.languageId);
    if (!language) {
      return null;
    }

    this.parser.setLanguage(language);
    return this.parser.parse(document.getText());
  }

  /**
   * Releases all tree-sitter resources.
   * Called automatically when the extension deactivates.
   */
  dispose(): void {
    if (this.parser) {
      this.parser.delete();
      this.parser = null;
    }
    this.languages.clear();
    this.initialised = false;
  }
}
