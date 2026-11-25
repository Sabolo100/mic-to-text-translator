export function resizeImage(file: File, maxWidth = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const cleanup = () => { URL.revokeObjectURL(url); img.src = ''; };
    img.onload = () => {
      const canvas = document.createElement('canvas');
      try {
        const ratio = Math.min(1, Math.min(maxWidth, 1280) / img.width, 960 / img.height);
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
        if (!base64) throw new Error('Could not encode image');
        resolve(base64);
      } catch (error) { reject(error); }
      finally { canvas.width = 0; canvas.height = 0; cleanup(); }
    };
    img.onerror = () => { cleanup(); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}
