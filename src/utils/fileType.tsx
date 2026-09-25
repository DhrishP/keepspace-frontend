import React from 'react';
import { 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Link as LinkIcon, 
  File, 
  Music, 
  FileSpreadsheet, 
  Presentation, 
  Archive, 
  Code, 
  FileCode 
} from 'lucide-react';

export type FileCategory = 
  | 'folder'
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'word'
  | 'excel'
  | 'ppt'
  | 'markdown'
  | 'code'
  | 'archive'
  | 'link'
  | 'other';

export function getFileCategory(name: string = '', mimeType: string = '', rawType: string = ''): FileCategory {
  if (rawType === 'folder') return 'folder';
  if (rawType === 'link') return 'link';

  const lowerName = (name || '').toLowerCase();
  const lowerMime = (mimeType || '').toLowerCase();

  // Images
  if (
    rawType === 'image' ||
    lowerMime.startsWith('image/') ||
    /\.(jpe?g|png|gif|webp|svg|bmp|heic|heif|avif|ico|tiff?)$/i.test(lowerName)
  ) {
    return 'image';
  }

  // Videos
  if (
    rawType === 'video' ||
    lowerMime.startsWith('video/') ||
    /\.(mp4|mov|webm|mkv|avi|m4v|3gp|flv|wmv)$/i.test(lowerName)
  ) {
    return 'video';
  }

  // Audio (MP3, WAV, etc.)
  if (
    lowerMime.startsWith('audio/') ||
    /\.(mp3|wav|ogg|m4a|aac|flac|opus|weba|wma|aiff)$/i.test(lowerName)
  ) {
    return 'audio';
  }

  // PDF
  if (
    rawType === 'pdf' ||
    lowerMime === 'application/pdf' ||
    lowerName.endsWith('.pdf')
  ) {
    return 'pdf';
  }

  // Word Docs
  if (
    lowerMime.includes('word') ||
    lowerMime.includes('officedocument.wordprocessingml') ||
    /\.(docx?|rtf|odt|pages)$/i.test(lowerName)
  ) {
    return 'word';
  }

  // Excel / CSV / Spreadsheets
  if (
    lowerMime.includes('spreadsheet') ||
    lowerMime.includes('ms-excel') ||
    lowerMime === 'text/csv' ||
    /\.(xlsx?|csv|tsv|ods|numbers)$/i.test(lowerName)
  ) {
    return 'excel';
  }

  // PowerPoint / Presentations
  if (
    lowerMime.includes('presentation') ||
    lowerMime.includes('ms-powerpoint') ||
    /\.(pptx?|odp|key)$/i.test(lowerName)
  ) {
    return 'ppt';
  }

  // Markdown
  if (
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.markdown') ||
    lowerMime === 'text/markdown'
  ) {
    return 'markdown';
  }

  // Code & Config
  if (
    /\.(js|jsx|ts|tsx|html|css|scss|json|xml|py|rb|php|java|c|cpp|cs|go|rs|sh|bash|zsh|yaml|yml|toml|sql|graphql)$/i.test(lowerName)
  ) {
    return 'code';
  }

  // Archives / Compressed
  if (
    lowerMime.includes('zip') ||
    lowerMime.includes('compressed') ||
    lowerMime.includes('tar') ||
    /\.(zip|tar|gz|bz2|7z|rar|xz|tgz)$/i.test(lowerName)
  ) {
    return 'archive';
  }

  return 'other';
}

export function getFileIconClass(name: string = '', mimeType: string = '', rawType: string = ''): string {
  const cat = getFileCategory(name, mimeType, rawType);
  switch (cat) {
    case 'folder': return 'icon-folder';
    case 'image': return 'icon-image';
    case 'video': return 'icon-video';
    case 'audio': return 'icon-audio';
    case 'pdf': return 'icon-pdf';
    case 'word': return 'icon-word';
    case 'excel': return 'icon-excel';
    case 'ppt': return 'icon-ppt';
    case 'markdown': return 'icon-md';
    case 'code': return 'icon-code';
    case 'archive': return 'icon-archive';
    case 'link': return 'icon-link';
    default: return 'icon-other';
  }
}

export function renderFileIcon(name: string = '', mimeType: string = '', rawType: string = '', size: number = 24): React.ReactElement {
  const cat = getFileCategory(name, mimeType, rawType);
  switch (cat) {
    case 'folder': return <Folder size={size} />;
    case 'image': return <ImageIcon size={size} />;
    case 'video': return <VideoIcon size={size} />;
    case 'audio': return <Music size={size} />;
    case 'pdf': return <FileText size={size} />;
    case 'word': return <FileText size={size} />;
    case 'excel': return <FileSpreadsheet size={size} />;
    case 'ppt': return <Presentation size={size} />;
    case 'markdown': return <FileCode size={size} />;
    case 'code': return <Code size={size} />;
    case 'archive': return <Archive size={size} />;
    case 'link': return <LinkIcon size={size} />;
    default: return <File size={size} />;
  }
}
