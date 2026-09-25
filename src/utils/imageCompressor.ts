/**
 * High-Quality Client-Side Image Compressor for KeepSpace
 * Preserves high fidelity (0.88 quality, up to 2880px max edge).
 * Only compresses large camera photos (> 2MB) while keeping visual quality pristine.
 */

export async function compressImageIfNeeded(file: File): Promise<File> {
  // Only process raster images
  if (!file.type || !file.type.startsWith('image/')) {
    return file;
  }

  // Skip SVGs and GIFs to preserve vectors and animations
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  // If already under 2 MB, leave completely untouched
  if (file.size <= 2 * 1024 * 1024) {
    return file;
  }

  try {
    // createImageBitmap with auto orientation handling for camera photos
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      bitmap = await createImageBitmap(file);
    }

    const { width, height } = bitmap;

    // Ultra high resolution cap (2880px matches 5K screens, preserving crisp details)
    const MAX_DIMENSION = 2880;
    let targetWidth = width;
    let targetHeight = height;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      if (width > height) {
        targetWidth = MAX_DIMENSION;
        targetHeight = Math.round((height * MAX_DIMENSION) / width);
      } else {
        targetHeight = MAX_DIMENSION;
        targetWidth = Math.round((width * MAX_DIMENSION) / height);
      }
    }

    // Render using HTMLCanvasElement
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { alpha: file.type === 'image/png' });
    if (!ctx) {
      bitmap.close();
      return file;
    }

    // High quality bicubic scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    // 0.88 quality is visually lossless for JPEG, eliminating sensor noise and huge raw bloat
    const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const quality = 0.88;

    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob(resolve, format, quality);
    });

    if (!blob) {
      return file;
    }

    // Only use compressed result if it actually reduced the size
    if (blob.size >= file.size) {
      return file;
    }

    const compressedFile = new (window as any).File([blob], file.name, {
      type: format,
      lastModified: Date.now(),
    }) as File;

    return compressedFile;
  } catch (err) {
    console.warn('[ImageCompressor] Compression skipped, using original file:', err);
    return file;
  }
}
