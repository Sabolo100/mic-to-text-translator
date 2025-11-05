export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private onDataAvailable: ((audioBlob: Blob) => void) | null = null;

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
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
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
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          this.onDataAvailable?.(audioBlob);
          this.audioChunks = [];
        }
      };

      // Record in 3-second chunks for real-time processing
      this.mediaRecorder.start();
      
      // Create interval to stop and restart recording every 3 seconds
      const recordingInterval = setInterval(() => {
        if (this.mediaRecorder?.state === 'recording') {
          this.mediaRecorder.stop();
          setTimeout(() => {
            if (this.mediaRecorder?.state === 'inactive') {
              this.mediaRecorder.start();
            }
          }, 100);
        }
      }, 3000);

      // Store interval ID for cleanup
      (this.mediaRecorder as any).recordingInterval = recordingInterval;

      console.log('Audio recording started');
    } catch (error) {
      console.error('Error starting audio recording:', error);
      throw new Error('Failed to access microphone. Please ensure microphone permissions are granted.');
    }
  }

  stop() {
    if (this.mediaRecorder) {
      // Clear the recording interval
      if ((this.mediaRecorder as any).recordingInterval) {
        clearInterval((this.mediaRecorder as any).recordingInterval);
      }
      
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      this.mediaRecorder = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    console.log('Audio recording stopped');
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}
