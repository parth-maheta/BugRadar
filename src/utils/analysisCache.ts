import { Issue } from "../types/issue";

/**
 * Cache entry for a single document analysis result.
 */
interface CacheEntry {
  /** The document version at the time of analysis. */
  version: number;
  /** The issues detected for this version. */
  issues: Issue[];
}

/**
 * In-memory cache for analysis results.
 *
 * Keyed by document URI string, stores the most recent analysis
 * result (Issue[]) alongside the document version that produced it.
 * When the same URI + version is requested again, the cached result
 * is returned without re-parsing or re-analyzing.
 *
 * This prevents redundant work when:
 * - VS Code fires multiple change events for the same edit
 * - The user switches tabs back to an unchanged file
 * - Diagnostics are re-requested without any edits
 */
export class AnalysisCache {
  private readonly cache = new Map<string, CacheEntry>();

  /**
   * Returns the cached issues if the document version matches,
   * or `undefined` on a cache miss.
   */
  get(uri: string, version: number): Issue[] | undefined {
    const entry = this.cache.get(uri);
    if (entry && entry.version === version) {
      return entry.issues;
    }
    return undefined;
  }

  /**
   * Stores the analysis result for a document URI + version pair.
   * Overwrites any previous entry for that URI.
   */
  set(uri: string, version: number, issues: Issue[]): void {
    this.cache.set(uri, { version, issues });
  }

  /**
   * Removes the cache entry for a given URI.
   * Called when a document is closed to prevent memory leaks.
   */
  delete(uri: string): void {
    this.cache.delete(uri);
  }

  /**
   * Clears all cached entries.
   * Called during extension deactivation.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Returns the number of cached entries (useful for debugging).
   */
  get size(): number {
    return this.cache.size;
  }
}
