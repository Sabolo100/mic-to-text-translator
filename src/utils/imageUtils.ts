export function resizeImage(file: File, maxWidth = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        console.log(`Original image size: ${width}x${height}`);
        
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const maxHeight = 960;
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
        
        console.log(`Resized to: ${width}x${height}`);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
        
        // Aggressive cleanup for mobile memory
        canvas.width = 0;
        canvas.height = 0;
        (img as any).src = '';
        
        console.log(`Base64 length: ${base64.length}`);
        resolve(base64);
      } catch (err) {
        console.error('Canvas resize error:', err);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
