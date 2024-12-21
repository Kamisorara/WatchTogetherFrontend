class AudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
      super();
      this.sampleRate = options.processorOptions.sampleRate;
      this.channels = options.processorOptions.channels;
      this.bufferSize = options.processorOptions.bufferSize;
  }

  process(inputs, outputs, parameters) {
      const input = inputs[0];
      if (input.length > 0) {
          const channelData = input[0];
          const buffer = new Float32Array(this.bufferSize);

          for (let i = 0; i < this.bufferSize && i < channelData.length; i++) {
              buffer[i] = channelData[i];
          }
          if (buffer.length > 0) {
              this.port.postMessage(buffer.buffer);
          }
      }
      return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);