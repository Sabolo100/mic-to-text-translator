/// <reference types="bun" />
import { afterEach, beforeEach, expect, test } from 'bun:test';
import { AudioRecorder } from './audioRecorder';

let now = 0;
let loud = true;
let monitor: (() => void) | undefined;
let tracksStopped = 0;
let contextsClosed = 0;
const originals = new Map<string, PropertyDescriptor | undefined>();
const originalNow = Date.now;
class FakeRecorder {
  static instances: FakeRecorder[] = [];
  static isTypeSupported(type: string) { return type.startsWith('audio/webm'); }
  mimeType = 'audio/webm;codecs=opus';
  state = 'inactive';
  ondataavailable?: (event: { data: Blob }) => void;
  onstop?: () => void;
  onerror?: () => void;
  constructor() { FakeRecorder.instances.push(this); }
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    const bytes = new Uint8Array(1400); bytes.set([0x1a, 0x45, 0xdf, 0xa3]);
    queueMicrotask(() => {
      this.ondataavailable?.({ data: new Blob([bytes]) });
      this.onstop?.();
    });
  }
}
function replace(name: string, value: unknown) {
  originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}
beforeEach(() => {
  now = 0; loud = true; tracksStopped = 0; contextsClosed = 0; FakeRecorder.instances = [];
  Date.now = () => now;
  replace('navigator', { mediaDevices: { getUserMedia: async () => ({
    getTracks: () => [{ stop: () => { tracksStopped++; } }],
    getAudioTracks: () => [{ readyState: 'live' }],
  }) } });
  replace('MediaRecorder', FakeRecorder);
  replace('AudioContext', class {
    resume() { return Promise.resolve(); }
    close() { contextsClosed++; return Promise.resolve(); }
    createMediaStreamSource() { return { connect: () => undefined }; }
    createAnalyser() { return { fftSize: 2048, getByteTimeDomainData: (data: Uint8Array) => data.fill(loud ? 180 : 128) }; }
  });
  replace('setInterval', (callback: () => void) => { monitor = callback; return 1; });
  replace('clearInterval', () => { monitor = undefined; });
});
afterEach(() => {
  Date.now = originalNow;
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
  originals.clear();
});
const tick = async (time: number, sound = true) => { now = time; loud = sound; monitor?.(); await Promise.resolve(); };

test('closes speech after 600ms silence and keeps a complete container per segment', async () => {
  const blobs: Blob[] = [];
  const recorder = new AudioRecorder(); await recorder.start(blob => blobs.push(blob));
  await tick(1400); await tick(1999, false);
  expect(blobs).toHaveLength(0);
  await tick(2000, false);
  expect(blobs).toHaveLength(1);
  expect(FakeRecorder.instances).toHaveLength(2);
  expect(Array.from(new Uint8Array(await blobs[0].arrayBuffer()).slice(0, 4))).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
  await recorder.stop(false);
});
test('closes continuous speech at the 8-second maximum', async () => {
  const blobs: Blob[] = [];
  const recorder = new AudioRecorder(); await recorder.start(blob => blobs.push(blob));
  await tick(7999); expect(blobs).toHaveLength(0);
  await tick(8000); expect(blobs).toHaveLength(1);
  await recorder.stop(false);
});
test('does not send silence to the speech recognition service', async () => {
  const blobs: Blob[] = [];
  const recorder = new AudioRecorder(); await recorder.start(blob => blobs.push(blob));
  await tick(8000, false); expect(blobs).toHaveLength(0);
  await recorder.stop(false);
});
test('pause waits for the final speech segment before image processing', async () => {
  const blobs: Blob[] = [];
  const recorder = new AudioRecorder(); await recorder.start(blob => blobs.push(blob));
  await tick(1000);
  await recorder.pause();
  expect(blobs).toHaveLength(1);
  expect(FakeRecorder.instances).toHaveLength(1);
  await recorder.resume(); expect(FakeRecorder.instances).toHaveLength(2);
  await recorder.stop(false);
});
test('stop flushes final speech and releases microphone resources', async () => {
  const blobs: Blob[] = [];
  const recorder = new AudioRecorder(); await recorder.start(blob => blobs.push(blob));
  await tick(500); await recorder.stop();
  expect(blobs).toHaveLength(1);
  expect(FakeRecorder.instances).toHaveLength(1);
  expect(tracksStopped).toBe(1);
  expect(contextsClosed).toBe(1);
  expect(recorder.isRecording()).toBe(false);
});
test('fatal service errors stop without submitting another paid segment', async () => {
  const blobs: Blob[] = [];
  const recorder = new AudioRecorder(); await recorder.start(blob => blobs.push(blob));
  await tick(500); await recorder.stop(false);
  expect(blobs).toHaveLength(0);
});
