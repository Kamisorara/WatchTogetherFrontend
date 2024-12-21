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

    await audioContext.audioWorklet.addModule('/audio-processor.js'); // Load the worklet

    const source = audioContext.createMediaStreamSource(mediaStream);
    audioWorkletNode = new AudioWorkletNode(audioContext, 'audio-processor', {
      processorOptions: { sampleRate: SAMPLE_RATE, channels: CHANNELS, bufferSize: BUFFER_SIZE }
    });

    audioWorkletNode.port.onmessage = (event) => {
      const audioData = event.data;
      if (audioData) {
        const base64Audio = Buffer.from(new Uint8Array(audioData)).toString('base64');
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

const playAudio = async (audioData: string) => { // Expecting base64 string
  try {
    if (!audioContext) {
      audioContext = new AudioContext({ sampleRate: 16000 });
    }

    const decodedAudio = Buffer.from(audioData, 'base64').buffer;

    const audioBuffer = await audioContext.decodeAudioData(decodedAudio);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start(0);

  } catch (error) {
    console.error("Error playing audio:", error);
  }
};


const subscribeToAudioMessages = () => {
  props.stompClient?.subscribe(`/topic/audio-sync/${props.roomCode}`, (message: IMessage) => {
    const audioMessage = JSON.parse(message.body);
    playAudio(audioMessage.audioData); // Pass the base64 string directly
  });
};

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
