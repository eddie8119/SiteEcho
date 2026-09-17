/**
 * Format bytes to human-readable storage (e.g., "100 MB", "5 GB")
 * @param bytes - The number of bytes to format
 * @returns Formatted storage string
 */
export const formatStorage = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  const gb = mb / 1024;

  if (gb >= 1) {
    return `${gb.toFixed(1)} GB`;
  }
  return `${mb.toFixed(0)} MB`;
};
