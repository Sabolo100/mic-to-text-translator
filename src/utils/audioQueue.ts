export class AudioQueue<T> {
  private pending: T[] = [];
  private running = false;
  private waiters: (() => void)[] = [];

  constructor(private process: (item: T) => Promise<void>, private onBusy: (busy: boolean) => void, private capacity = 12) {}

  enqueue(item: T): boolean {
    if (this.pending.length >= this.capacity) return false;
    this.pending.push(item);
    void this.drain();
    return true;
  }

  clear() { this.pending = []; }

  idle(): Promise<void> {
    if (!this.running && !this.pending.length) return Promise.resolve();
    return new Promise(resolve => this.waiters.push(resolve));
  }

  private async drain() {
    if (this.running) return;
    this.running = true;
    this.onBusy(true);
    try {
      while (this.pending.length) {
        const item = this.pending.shift();
        if (item !== undefined) await this.process(item);
      }
    } catch (error) {
      this.clear();
      console.error('Audio queue failed:', error);
    } finally {
      this.running = false;
      this.onBusy(false);
      this.waiters.splice(0).forEach(resolve => resolve());
    }
  }
}