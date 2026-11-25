export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string' || !reader.result.includes(',')) {
        reject(new Error('Invalid audio data')); return;
      }
      resolve(reader.result.slice(reader.result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Audio read failed'));
    reader.onabort = () => reject(new Error('Audio read cancelled'));
    reader.readAsDataURL(blob);
  });
}
