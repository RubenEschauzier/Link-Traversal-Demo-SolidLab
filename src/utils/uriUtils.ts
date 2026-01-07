import LZString from 'lz-string';

export const encodeUri = (uri: string): string => {
  if (!uri) return '';
  // Compress to a URL-safe format directly
  return LZString.compressToEncodedURIComponent(uri);
};

export const decodeUri = (encoded: string): string => {
  if (!encoded) return '';
  // Decompress back to original string
  return LZString.decompressFromEncodedURIComponent(encoded) || '';
};
