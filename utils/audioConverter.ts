import { Mp3Encoder } from '@breezystack/lamejs';

const MAX_DIRECT_SIZE = 50 * 1024 * 1024; // 50 MB

export function needsConversion(file: File): boolean {
  return file.size > MAX_DIRECT_SIZE;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function compressAudioToMp3(
  file: File,
  onProgress: (pct: number) => void
): Promise<File> {
  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Decode audio data
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  await audioContext.close();

  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const totalSamples = audioBuffer.length;

  // Get PCM data as Int16Array
  const floatToInt16 = (float32: Float32Array): Int16Array => {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  };

  const leftChannel = floatToInt16(audioBuffer.getChannelData(0));
  const rightChannel = channels > 1 ? floatToInt16(audioBuffer.getChannelData(1)) : undefined;

  // Encode to MP3 at 320kbps
  const encoder = new Mp3Encoder(channels, sampleRate, 320);
  const mp3Chunks: Uint8Array[] = [];
  const blockSize = 1152;

  for (let i = 0; i < totalSamples; i += blockSize) {
    const leftChunk = leftChannel.subarray(i, i + blockSize);
    const mp3buf = channels === 1 || !rightChannel
      ? encoder.encodeBuffer(leftChunk)
      : encoder.encodeBuffer(leftChunk, rightChannel.subarray(i, i + blockSize));
    if (mp3buf.length > 0) mp3Chunks.push(mp3buf);
    // Report progress every ~100 blocks to avoid excessive updates
    if (i % (blockSize * 100) === 0) {
      onProgress(Math.round((i / totalSamples) * 100));
    }
  }

  const finalBuf = encoder.flush();
  if (finalBuf.length > 0) mp3Chunks.push(finalBuf);
  onProgress(100);

  // Combine chunks into a single Blob
  const totalLength = mp3Chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const mp3Data = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of mp3Chunks) {
    mp3Data.set(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength), offset);
    offset += chunk.length;
  }

  // Build output file with .mp3 extension
  const originalName = file.name.replace(/\.[^.]+$/, '');
  return new File([mp3Data], `${originalName}.mp3`, { type: 'audio/mpeg' });
}
