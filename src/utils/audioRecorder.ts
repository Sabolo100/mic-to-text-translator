export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private monitor: ReturnType<typeof setInterval> | null = null;
  private callback: ((audio: Blob) => void) | null = null;
  private active = false;
  private paused = false;
  private generation = 0;
  private mimeType = '';
  private chunkStart = 0;
  private lastSound = 0;
  private hasSpeech = false;
  private starting = false;
  private finishCurrent: ((flush: boolean) => Promise<void>) | null = null;

  constructor(private onError: () => void = () => undefined) {}

  async start(callback: (audio: Blob) => void) {
    if (this.active || this.starting) return;
    this.starting = true;
    const generation = ++this.generation;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true,
      } });
      if (generation !== this.generation) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      this.stream = stream;
      this.callback = callback;
      this.mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']
        .find(type => MediaRecorder.isTypeSupported(type)) ?? '';
      this.active = true;
      this.paused = false;
      await this.setupAnalysis();
      this.startChunk();
      console.log('Audio recording started with VAD');
    } catch (error) {
      this.stop();
      throw error;
    } finally { this.starting = false; }
  }

  private async setupAnalysis() {
    if (!this.stream) return;
    this.audioContext = new AudioContext();
    await this.audioContext.resume();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.audioContext.createMediaStreamSource(this.stream).connect(this.analyser);
    const samples = new Uint8Array(this.analyser.fftSize);
    this.monitor = setInterval(() => {
      if (!this.analyser || this.paused || this.mediaRecorder?.state !== 'recording') return;
      this.analyser.getByteTimeDomainData(samples);
      const rms = Math.sqrt(samples.reduce((sum, sample) => sum + ((sample - 128) / 128) ** 2, 0) / samples.length);
      const now = Date.now();
      if (rms > 0.02) { this.hasSpeech = true; this.lastSound = now; }
      const duration = now - this.chunkStart;
      if ((duration >= 2000 && now - this.lastSound >= 600) || duration >= 8000) void this.finishCurrent?.(true);
    }, 100);
  }

  private startChunk() {
    if (!this.active || this.paused || !this.stream) return;
    // Each recorder owns its chunks and emits a full container, including its header.
    const recorder = new MediaRecorder(this.stream, {
      ...(this.mimeType ? { mimeType: this.mimeType } : {}), audioBitsPerSecond: 128000,
    });
    const chunks: Blob[] = [];
    const generation = this.generation;
    const callback = this.callback;
    let speech = false;
    let flush = true;
    let resolveStopped: () => void = () => undefined;
    const stopped = new Promise<void>(resolve => { resolveStopped = resolve; });
    this.mediaRecorder = recorder;
    this.chunkStart = this.lastSound = Date.now();
    this.hasSpeech = false;
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || this.mimeType });
      if (flush && speech && blob.size >= 1000 && generation === this.generation) callback?.(blob);
      if (this.mediaRecorder === recorder) { this.mediaRecorder = null; this.finishCurrent = null; }
      resolveStopped();
      if (generation === this.generation && this.active && !this.paused) this.startChunk();
    };
    // Capture the speech flag before stop resets state or another segment begins.
    this.finishCurrent = (shouldFlush: boolean) => {
      flush = shouldFlush;
      speech = this.hasSpeech;
      if (recorder.state !== 'inactive') recorder.stop();
      return stopped;
    };
    recorder.onerror = () => {
      console.error('Audio recorder failed');
      void this.stop(false);
      this.onError();
    };
    recorder.start();
  }

  async pause() {
    this.paused = true;
    const stopped = this.finishCurrent?.(true);
    if (this.monitor) { clearInterval(this.monitor); this.monitor = null; }
    this.analyser = null;
    void this.audioContext?.close().catch(() => undefined);
    this.audioContext = null;
    await stopped;
  }

  async resume() {
    if (!this.active || !this.paused) return;
    if (!this.stream?.getAudioTracks().some(track => track.readyState === 'live')) {
      this.stop();
      throw new Error('A mikrofonkapcsolat megszakadt. Indítsa újra a felvételt.');
    }
    this.paused = false;
    await this.setupAnalysis();
    if (!this.mediaRecorder) this.startChunk();
  }

  async stop(flush = true) {
    this.active = false;
    this.paused = false;
    if (this.monitor) { clearInterval(this.monitor); this.monitor = null; }
    const stopped = this.finishCurrent?.(flush);
    void this.audioContext?.close().catch(() => undefined);
    this.audioContext = null;
    this.analyser = null;
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    // Cancel an outstanding permission prompt, but allow the final segment to flush.
    if (this.starting) this.generation++;
    console.log('Audio recording stopped');
    await stopped;
  }

  isRecording() { return this.active; }
}
