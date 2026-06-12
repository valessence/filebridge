export const CHUNK_SIZE = 16384; // 16KB chunks

export type FileMetadata = {
  type: 'file-start';
  transferId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export type FileDone = {
  type: 'file-done';
  transferId: string;
};

export type TransferMessage = FileMetadata | FileDone;

export function generateTransferId(): string {
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generatePeerId(): string {
  return `peer-${Math.random().toString(36).slice(2, 10)}`;
}

export async function* fileChunks(file: File): AsyncGenerator<ArrayBuffer, void, unknown> {
  let offset = 0;
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await chunk.arrayBuffer();
    yield buffer;
    offset += buffer.byteLength;
  }
}

export class FileReassembler {
  private chunks: Uint8Array[] = [];
  private receivedBytes = 0;
  private metadata: FileMetadata | null = null;

  start(metadata: FileMetadata) {
    this.metadata = metadata;
    this.chunks = [];
    this.receivedBytes = 0;
  }

  addChunk(chunk: ArrayBuffer): number {
    const bytes = new Uint8Array(chunk);
    this.chunks.push(bytes);
    this.receivedBytes += bytes.byteLength;
    return this.receivedBytes;
  }

  isComplete(): boolean {
    return this.metadata !== null && this.receivedBytes >= this.metadata.fileSize;
  }

  assemble(): Blob {
    if (!this.metadata) throw new Error('No metadata');
    return new Blob(this.chunks as unknown as BlobPart[], { type: this.metadata.mimeType });
  }

  getProgress(): number {
    if (!this.metadata || this.metadata.fileSize === 0) return 0;
    return Math.min(100, Math.round((this.receivedBytes / this.metadata.fileSize) * 100));
  }

  getMetadata(): FileMetadata | null {
    return this.metadata;
  }

  reset() {
    this.chunks = [];
    this.receivedBytes = 0;
    this.metadata = null;
  }
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatSpeed(bps: number): string {
  if (bps < 1024) return `${bps.toFixed(0)} B/s`;
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
}
