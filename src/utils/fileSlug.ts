// Human-readable URL slug generator & ID extractor

export function createFileSlug(fileName: string): string {
  if (!fileName) return 'file';
  // Strip file extension
  const withoutExt = fileName.replace(/\.[^/.]+$/, '').trim();
  // Convert spaces and special characters to hyphens
  const clean = withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-');
  
  if (!clean) return 'file';
  const words = clean.split('-').filter(Boolean);
  if (words.length === 0) return 'file';
  // Include primary name identifier (e.g. "aadhar" for "aadhar card", "creds" for "creds")
  return words[0].slice(0, 24);
}

export function extractDocIdFromParam(param: string): string {
  if (!param) return '';
  // Match standard 36-char UUID format (8-4-4-4-12 hex)
  const match = param.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  if (match) {
    return match[0];
  }
  return param;
}
