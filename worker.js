~async function() {
  const { default: __wbg_init, new_fft, process_fft, drop_fft } = await import("./rustfft_wasm.js");

  await __wbg_init({
    module_or_path: await WebAssembly.compile(await (await fetch("./rustfft_wasm.wasm")).arrayBuffer())
  });

  const doFft = (audioBuffer, audioStepSize, audioBlockSize) => {
    const audioSamples = new Float32Array(audioBuffer[0].length);
    for (let i = 0; i < audioSamples.length; i++) {
      let sum = 0;
      for (let n = 0; n < audioBuffer.length; n++) {
        sum += audioBuffer[n][i];
      }
      audioSamples[i] = sum / audioBuffer.length;
    }

    const p = new_fft(audioBlockSize);
    const stftMagnitudes = [];
    for(let audioSampleIndex = 0; audioSampleIndex < audioSamples.length - audioBlockSize; audioSampleIndex += audioStepSize){
      const audioBlock = audioSamples.slice(audioSampleIndex, audioSampleIndex + audioBlockSize);
      const magnitudes = process_fft(p, audioBlock);
      stftMagnitudes.push(magnitudes);
    }
    drop_fft(p);
    return stftMagnitudes;
  };

  self.addEventListener("message", async e => {
    const { id, audioStepSize, data, audioBlockSize } = e.data;
    self.postMessage({ id, data: doFft(data, audioStepSize, audioBlockSize) });
  });
}();
