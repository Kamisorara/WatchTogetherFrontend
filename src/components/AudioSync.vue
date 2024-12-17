<template>
  <!-- 显示正在录音的图标 -->
  <AudioOutlined v-show="isRecording === true" :class="$attrs.class" class="icon" @click="toggleRecording" />
  <!-- 显示已静音的图标 -->
  <AudioMutedOutlined v-show="isRecording === false" :class="$attrs.class" class="icon" @click="toggleRecording" />
  <!-- 挂机图标 -->
  <PhoneOutlined :class="$attrs.class" class="icon"/>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { AudioOutlined, AudioMutedOutlined, PhoneOutlined } from '@ant-design/icons-vue';

// 是否开启语音
const isRecording = ref<boolean>(false);

// 切换录音状态
const toggleRecording = () => {
  isRecording.value = !isRecording.value;
};
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
