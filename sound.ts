function generateWavData(freq: number, durationMs = 100): Uint8Array {
  const sampleRate = 44100;
  const numSamples = (durationMs / 1000) * sampleRate;
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + numSamples * bytesPerSample);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  // WAV Header
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * bytesPerSample, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true);  // PCM format
  view.setUint16(22, 1, true);  // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, numSamples * bytesPerSample, true);

  // Sine wave samples
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * freq * t);
    const intSample = Math.floor(sample * 32767);
    view.setInt16(44 + i * 2, intSample, true);
  }

  return new Uint8Array(buffer);
}

export async function playTone(freq: number, durationMs = 100) {
  const wavData = generateWavData(freq, durationMs);
  const tmpFile = await Deno.makeTempFile({ suffix: ".wav" });
  await Deno.writeFile(tmpFile, wavData);

  try {
    const proc = Deno.run({ cmd: ["afplay", tmpFile], stdout: "null", stderr: "null" });
    await proc.status();
    proc.close();
  } finally {
    await Deno.remove(tmpFile).catch(() => {});
  }
}
