import LZString from 'lz-string';
export const encodeUri = (uri) => {
    if (!uri)
        return '';
    // Compress to a URL-safe format directly
    return LZString.compressToEncodedURIComponent(uri);
};
export const decodeUri = (encoded) => {
    if (!encoded)
        return '';
    // Decompress back to original string
    return LZString.decompressFromEncodedURIComponent(encoded) || '';
};
//# sourceMappingURL=uriUtils.js.map