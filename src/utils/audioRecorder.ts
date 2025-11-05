export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private onDataAvailable: ((audioBlob: Blob) => void) | null = null;
  
  // VAD settings
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private minChunkDuration = 2000; // Min 2 seconds
  private maxChunkDuration = 8000; // Max 8 seconds (faster response)
  private silenceThreshold = 0.02; // Audio energy threshold (less sensitive to noise)
  private silenceDuration = 600; // 600ms of silence = sentence end (faster detection)
  
  private chunkStartTime = 0;
  private lastSoundTime = 0;
  private mimeType = '';

  async start(onDataCallback: (audioBlob: Blob) => void) {
    try {
      this.onDataAvailable = onDataCallback;
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Use webm format with opus codec for better compatibility
      this.mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.mimeType,
        audioBitsPerSecond: 128000,
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        if (this.audioChunks.length > 0) {
          const audioBlob = new Blob(this.audioChunks, { type: this.mimeType });
          this.onDataAvailable?.(audioBlob);
          this.audioChunks = [];
        }
      };

      // Setup audio analysis for VAD
      this.setupAudioAnalysis();

      // Start recording
      this.startNewChunk();

      console.log('Audio recording started with VAD');
    } catch (error) {
      console.error('Error starting audio recording:', error);
      throw new Error('Failed to access microphone. Please ensure microphone permissions are granted.');
    }
  }

  private setupAudioAnalysis() {
    if (!this.stream) return;

    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    
    source.connect(this.analyser);

    this.monitorAudioLevel();
  }

  private monitorAudioLevel() {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkAudio = () => {
      if (!this.analyser || !this.mediaRecorder) return;

      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate RMS (Root Mean Square) for audio level
      const rms = Math.sqrt(
        dataArray.reduce((sum, value) => sum + value * value, 0) / bufferLength
      ) / 255;

      const now = Date.now();
      const hasSound = rms > this.silenceThreshold;

      if (hasSound) {
        this.lastSoundTime = now;
      }

      const chunkDuration = now - this.chunkStartTime;
      const timeSinceLastSound = now - this.lastSoundTime;

      // Check if we should close the current chunk
      const shouldCloseChunk = 
        (chunkDuration >= this.minChunkDuration && timeSinceLastSound >= this.silenceDuration) ||
        chunkDuration >= this.maxChunkDuration;

      if (shouldCloseChunk && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
        setTimeout(() => {
          if (this.mediaRecorder?.state === 'inactive') {
            this.startNewChunk();
          }
        }, 100);
      }

      this.animationFrameId = requestAnimationFrame(checkAudio);
    };

    this.animationFrameId = requestAnimationFrame(checkAudio);
  }

  private startNewChunk() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
      this.chunkStartTime = Date.now();
      this.lastSoundTime = Date.now();
      this.mediaRecorder.start();
    }
  }

  stop() {
    // Stop audio monitoring
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Stop media recorder
    if (this.mediaRecorder) {
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      this.mediaRecorder = null;
    }

    // Stop media stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.analyser = null;
    console.log('Audio recording stopped');
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}
