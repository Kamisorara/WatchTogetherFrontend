<template>
  <!-- 显示正在录音的图标 -->
  <AudioOutlined v-show="isStreaming === true" :class="$attrs.class" class="icon" @click="toggleStreaming" />
  <!-- 显示已静音的图标 -->
  <AudioMutedOutlined v-show="isStreaming === false" :class="$attrs.class" class="icon" @click="toggleStreaming" />
  <!-- 是否播放声音 -->
  <PhoneOutlined :class="$attrs.class" class="icon" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { AudioOutlined, AudioMutedOutlined, PhoneOutlined } from '@ant-design/icons-vue';
import type { Client, IMessage } from '@stomp/stompjs';
import * as RecordRTC from 'recordrtc';
import { Buffer } from 'buffer';

interface AudioPlayerProps {
  stompClient: Client | null;
  roomCode: string;
  userId: string;
}

const props = defineProps<AudioPlayerProps>();

const isStreaming = ref(false);
let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;
let audioWorkletNode: AudioWorkletNode | null = null;

// Audio processing constants
const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 128; // Adjust for latency/CPU usage
const CHANNELS = 1;


const toggleStreaming = async () => {
  isStreaming.value = !isStreaming.value;
  if (isStreaming.value) {
    await startStreaming();
  } else {
    stopStreaming();
  }
};


const startStreaming = async () => {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });

    await audioContext.audioWorklet.addModule('/audio-processor.js');

    const source = audioContext.createMediaStreamSource(mediaStream);
    audioWorkletNode = new AudioWorkletNode(audioContext, 'audio-processor', {
      processorOptions: { sampleRate: SAMPLE_RATE, channels: CHANNELS, bufferSize: BUFFER_SIZE }
    });

    audioWorkletNode.port.onmessage = (event) => {
      const audioData = event.data;
      if (audioData) {
        let arrayBuffer: ArrayBuffer;
        if (audioData instanceof ArrayBuffer) {
          arrayBuffer = audioData;
        } else if (audioData.data instanceof ArrayBuffer) {
          arrayBuffer = audioData.data;
        } else {
          console.error("错误：audioData 不是 ArrayBuffer 类型，而是", audioData.constructor.name);
          return;
        }

        const uint8Array = new Uint8Array(arrayBuffer);
        console.log("Uint8Array (before encoding):", uint8Array.slice(0, 20)); // Log more bytes
        console.log("Uint8Array length:", uint8Array.length);

        const base64Audio = Buffer.from(uint8Array).toString('base64');
        console.log("Base64 (sent):", base64Audio.substring(0, 200) + "..."); // Log more characters
        console.log("Base64 length:", base64Audio.length);

        props.stompClient?.publish({
          destination: `/app/audio/${props.roomCode}`,
          body: JSON.stringify({ audioData: base64Audio, senderId: props.userId }),
        });
      }
    };

    source.connect(audioWorkletNode).connect(audioContext.destination);
    subscribeToAudioMessages();
  } catch (error) {
    console.error('Error starting streaming:', error);
    isStreaming.value = false;
  }
};

const stopStreaming = () => {
  if (audioWorkletNode) {
    audioWorkletNode.disconnect();
    audioWorkletNode = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
};

const playAudio = async (audioData: string) => {
  try {
    if (!audioContext) {
      audioContext = new AudioContext({ sampleRate: 16000 });
    }

    console.log("接收到的 Base64 字符串 (前 100 字符):", audioData.substring(0, 100) + "...");
    console.log("Base64 字符串长度:", audioData.length);

    try {
      const decodedAudio = Buffer.from(audioData, 'base64');
      console.log("Base64 解码后的 byte[] 长度:", decodedAudio.length);
      const uint8Array = new Uint8Array(decodedAudio);
      console.log("解码后的 Uint8Array 前 10 个字节：", uint8Array.slice(0, 10));

      const audioBuffer = await audioContext.decodeAudioData(decodedAudio.buffer);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
      console.log("音频播放成功！");
    } catch (decodeError) {
      console.error("Buffer.from 解码失败:", decodeError);
      // 移除 atob 尝试，因为它并不能解决根本问题
    }
  } catch (error) {
    console.error("播放音频时发生错误:", error);
  }
};


const subscribeToAudioMessages = () => {
  props.stompClient?.subscribe(`/topic/audio-sync/${props.roomCode}`, (message: IMessage) => {
    const audioMessage = JSON.parse(message.body);
    playAudio(audioMessage.audioData); // Pass the base64 string directly
  });
};


const testBase64EncodingDecoding = async () => {
  try {
    // 1. Create a test ArrayBuffer (replace with actual audio data if available)
    const testArrayBuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).buffer; // Example data

    // 2. Encode to Base64
    const testBase64 = Buffer.from(new Uint8Array(testArrayBuffer)).toString('base64');
    console.log("Test Base64 (sent):", testBase64);

    // 3. Decode from Base64
    const decodedTestBuffer = Buffer.from(testBase64, 'base64').buffer;
    console.log("Test Base64 decoded successfully. Length:", decodedTestBuffer.byteLength);

    // 4. Try to decode as audio (if you have a test audio context)
    if (audioContext) {
      const testAudioBuffer = await audioContext.decodeAudioData(decodedTestBuffer);
      console.log("Test audio decoded successfully!");
    }

  } catch (error) {
    console.error("Test failed:", error);
  }
};

onMounted(() => {
  testBase64EncodingDecoding(); // Call the test function
});

onUnmounted(() => {
  stopStreaming(); // Stop streaming on unmount
});
</script>


<style scoped>
.icon {
  cursor: pointer;
  margin-left: 10px;
}

.icon:hover {
  transition: 0.3s;
  color: #6e6a6a;
}
</style>
