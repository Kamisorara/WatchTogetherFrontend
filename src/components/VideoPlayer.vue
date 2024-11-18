<template>
  <video class="chat-content-video" controls ref="videoRef" @play="handlePlay" @pause="handlePause"
    src="D:\Data\code\web_2024\WatchTogether\FormalProject\WatchTogetherFrontend\public\mv.mp4" muted>
    您的浏览器不支持视频播放。
  </video>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Client, IMessage } from '@stomp/stompjs';

interface VideoPlayerProps {
  stompClient: Client | null;
  roomCode: string;
}

const props = defineProps<VideoPlayerProps>();

const SYNC_THRESHOLD = 1.5; // 允许的时间偏差（秒）
const SYNC_INTERVAL = 2001; // 同步时间间隔（2秒）

const videoRef = ref<HTMLVideoElement | null>(null);
const isControlledByServer = ref(false);

const handlePlay = () => {
  if (videoRef.value) {
    isControlledByServer.value = true;
    const currentTime = videoRef.value.currentTime;
    props.stompClient?.publish({
      destination: `/app/video-control/${props.roomCode}`,
      body: JSON.stringify({ action: 'play', time: currentTime }),
    });
    setTimeout(() => {
      isControlledByServer.value = false;
    }, 101);
  }
};

const handlePause = () => {
  if (videoRef.value) {
    isControlledByServer.value = true;
    const currentTime = videoRef.value.currentTime;
    props.stompClient?.publish({
      destination: `/app/video-control/${props.roomCode}`,
      body: JSON.stringify({ action: 'pause', time: currentTime }),
    });
    setTimeout(() => {
      isControlledByServer.value = false;
    }, 101);
  }
};

const subscribeToSyncMessages = () => {
  const subscription = props.stompClient?.subscribe(
    `/topic/video-sync/${props.roomCode}`,
    (message: IMessage) => {
      const controlParam = JSON.parse(message.body);
      if (videoRef.value && !isControlledByServer.value) {
        const currentTime = videoRef.value.currentTime;
        const timeDifference = Math.abs(currentTime - controlParam.time);

        // 校正客户端的视频进度
        if (timeDifference > SYNC_THRESHOLD) {
          videoRef.value.currentTime = controlParam.time;
        }

        // 根据服务器状态调整播放或暂停
        if (controlParam.action === 'play') {
          videoRef.value.play();
        } else if (controlParam.action === 'pause') {
          videoRef.value.pause();
        }
      }
    }
  );

  return subscription;
};

const syncVideoToServer = () => {
  if (videoRef.value && !videoRef.value.paused) {
    const currentTime = videoRef.value.currentTime;
    props.stompClient?.publish({
      destination: `/app/video-control/${props.roomCode}`,
      body: JSON.stringify({ action: 'sync', time: currentTime }),
    });
  }
}

// 监听视频同步
let syncInterval: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  // 订阅服务器广播的同步消息
  const subscription: any = subscribeToSyncMessages();

  // 定期向服务器发送视频状态
  syncInterval = setInterval(syncVideoToServer, SYNC_INTERVAL);

  onBeforeUnmount(() => {
    subscription.unsubscribe();
    if (syncInterval) {
      clearInterval(syncInterval);
    }
  });
});
</script>
<style scoped></style>