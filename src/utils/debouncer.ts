/**
 * A simple debouncer that delays execution until a quiet period has elapsed.
 *
 * Each call to `trigger()` resets the timer. The callback only fires
 * once the specified delay passes without another `trigger()` call.
 * This ensures that rapid-fire events (e.g. keystrokes) result in
 * a single execution after the user pauses.
 */
export class Debouncer {
  private timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * @param delayMs  Milliseconds to wait after the last trigger
   *                 before executing the callback.
   */
  constructor(private readonly delayMs: number) {}

  /**
   * Schedules the callback to run after `delayMs` of inactivity.
   * If called again before the timer fires, the previous timer
   * is cancelled and a new one starts.
   */
  trigger(callback: () => void): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      callback();
    }, this.delayMs);
  }

  /**
   * Cancels any pending execution without firing the callback.
   */
  cancel(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Whether a callback is currently pending.
   */
  get isPending(): boolean {
    return this.timer !== null;
  }
}
