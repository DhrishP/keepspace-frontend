/**
 * Secure client-side blob download utility for KeepSpace
 * Ensures the HTML5 download attribute is respected across origins
 * and prevents iOS / Android PWA navigation breaks.
 */
export async function downloadDocument(url: string, filename: string): Promise<boolean> {
  try {
    const downloadUrl = url.includes('?') ? `${url}&download=true` : `${url}?download=true`;
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      throw new Error(`Download failed with status: ${res.status}`);
    }
    
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    // Clean up DOM and ObjectURL
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 15000);
    
    return true;
  } catch (err) {
    console.error('[Download Engine] Blob download failed, falling back to direct navigation:', err);
    // Fallback: open in separate window/tab
    const fallbackUrl = url.includes('?') ? `${url}&download=true` : `${url}?download=true`;
    window.open(fallbackUrl, '_blank');
    return false;
  }
}
