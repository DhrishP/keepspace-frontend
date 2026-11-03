// Image & Text clipboard utility

export async function convertBlobToPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 300;
        canvas.height = img.naturalHeight || img.height || 300;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            resolve(pngBlob);
          } else {
            reject(new Error('Canvas conversion to PNG blob returned null'));
          }
        }, 'image/png');
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for PNG conversion'));
    };
    img.src = url;
  });
}

export async function copyImageToClipboard(imageUrl: string): Promise<{ type: 'blob' | 'url' }> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const blob = await res.blob();

    let pngBlob = blob;
    if (blob.type !== 'image/png') {
      pngBlob = await convertBlobToPng(blob);
    }

    if (navigator.clipboard && typeof (window as any).ClipboardItem !== 'undefined') {
      const item = new ClipboardItem({ 'image/png': pngBlob });
      await navigator.clipboard.write([item]);
      return { type: 'blob' };
    }
  } catch (err) {
    console.warn("Direct blob clipboard write failed, attempting text link fallback:", err);
  }

  // Fallback: copy image URL
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(imageUrl);
    return { type: 'url' };
  }

  throw new Error("Clipboard API not available in this browser environment");
}

