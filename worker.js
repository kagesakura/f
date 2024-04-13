importScripts("./pffft.simd.js");

const audioBlockSize = 1024;
const bytesPerElement = 4;

const promiseOfFFT = pffft_simd().then(Module => (audioBuffer, audioStepSize) => {
  const audioSamples = new Float32Array(audioBuffer[0].length);
  for (let i = 0; i < audioSamples.length; i++) {
    let sum = 0;
    for (let n = 0; n < audioBuffer.length; n++) {
      sum += audioBuffer[n][i];
    }
    audioSamples[i] = sum / audioBuffer.length;
  }

  const stftMagnitudes = new Array();
  const pffftRunner = Module._pffft_runner_new(audioBlockSize, bytesPerElement);
  const nDataBytes = audioBlockSize * bytesPerElement;
  const dataPtr = Module._malloc(nDataBytes);
  const dataHeap = new Uint8Array(Module.HEAPU8.buffer, dataPtr, nDataBytes);
  for(let audioSampleIndex = 0; audioSampleIndex < audioSamples.length - audioBlockSize; audioSampleIndex += audioStepSize){
    const audioBlock = audioSamples.slice(audioSampleIndex, audioSampleIndex + audioBlockSize);
    dataHeap.set(new Uint8Array(audioBlock.buffer));
    Module._pffft_runner_transform(pffftRunner, dataHeap.byteOffset);
    const fftResult = new Float32Array(dataHeap.buffer, dataHeap.byteOffset, audioBlock.length);
    const magnitudes = new Float32Array(audioBlockSize / 2);
    for (let i = 0; i < audioBlockSize; i += 2)
      magnitudes[i / 2] = Math.log((fftResult[i] ** 2 + fftResult[i + 1] ** 2) + 0.03);
    stftMagnitudes.push(magnitudes);
  }
  Module._free(dataPtr);
  Module._pffft_runner_destroy(pffftRunner);
  return stftMagnitudes;
});

self.addEventListener("message", async e => {
  const { id, audioStepSize, data } = e.data;
  self.postMessage({ id, data: (await promiseOfFFT)(data, audioStepSize) });
});
