/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { AudioQueue } from './audioQueue';

describe('speech processing queue', () => {
  test('keeps all segments in order while the service is slow', async () => {
    let release: () => void = () => undefined;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    const processed: number[] = [];
    const busy: boolean[] = [];
    const queue = new AudioQueue<number>(async item => {
      if (item === 1) await blocked;
      processed.push(item);
    }, value => busy.push(value));
    queue.enqueue(1); queue.enqueue(2); queue.enqueue(3);
    expect(processed).toEqual([]);
    release(); await queue.idle();
    expect(processed).toEqual([1, 2, 3]);
    expect(busy).toEqual([true, false]);
  });
  test('clears queued work without discarding an already running result', async () => {
    let release: () => void = () => undefined;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    const processed: number[] = [];
    const queue = new AudioQueue<number>(async item => { await blocked; processed.push(item); }, () => undefined);
    queue.enqueue(1); queue.enqueue(2); queue.clear(); release();
    await queue.idle(); expect(processed).toEqual([1]);
  });
  test('bounds pending memory and reports overload', async () => {
    let release: () => void = () => undefined;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    const queue = new AudioQueue<number>(async () => { await blocked; }, () => undefined, 2);
    expect(queue.enqueue(1)).toBe(true);
    expect(queue.enqueue(2)).toBe(true);
    expect(queue.enqueue(3)).toBe(true);
    expect(queue.enqueue(4)).toBe(false);
    release(); await queue.idle();
  });
});
