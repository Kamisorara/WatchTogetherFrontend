<template>
  <!-- 显示正在通话的图标 -->
  <AudioOutlined v-show="isStreaming === true" :class="$attrs.class" class="icon" @click="toggleStreaming" />
  <!-- 显示已静音的图标 -->
  <AudioMutedOutlined v-show="isStreaming === false" :class="$attrs.class" class="icon" @click="toggleStreaming" />
  <!-- 是否接收音频 - 使用替代图标 -->
  <SoundOutlined v-show="isReceivingAudio" :class="$attrs.class" class="icon" @click="toggleReceivingAudio" />
  <CloseCircleOutlined v-show="!isReceivingAudio" :class="$attrs.class" class="icon" @click="toggleReceivingAudio" />
  <!-- 是否播放声音
  <PhoneOutlined :class="$attrs.class" class="icon" /> -->
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive } from 'vue';
import { AudioOutlined, AudioMutedOutlined, PhoneOutlined, SoundOutlined, CloseCircleOutlined } from '@ant-design/icons-vue';
import type { Client, IMessage } from '@stomp/stompjs';

interface AudioPlayerProps {
  stompClient: Client | null;
  roomCode: string;
  userId: string;
}

const props = defineProps<AudioPlayerProps>();

const isStreaming = ref(false);
const isReceivingAudio = ref(true);
let localStream: MediaStream | null = null;

// WebRTC 连接管理
const peerConnections = reactive<Record<string, RTCPeerConnection>>({});
const remoteStreams = reactive<Record<string, MediaStream>>({});

// 音频输出元素 (动态创建)
const audioElements: Record<string, HTMLAudioElement> = {};

const toggleStreaming = async () => {
  console.log('切换通话状态，当前状态:', isStreaming.value);
  isStreaming.value = !isStreaming.value;
  console.log('切换后状态:', isStreaming.value);

  if (isStreaming.value) {
    console.log('开始请求麦克风权限...');
    await startStreaming();
  } else {
    console.log('停止语音通话...');
    stopStreaming();
  }
};

const toggleReceivingAudio = () => {
  isReceivingAudio.value = !isReceivingAudio.value;

  // 更新所有现有音频元素的静音状态
  Object.keys(audioElements).forEach(userId => {
    if (audioElements[userId]) {
      audioElements[userId].muted = !isReceivingAudio.value;
    }
  });
};

const startStreaming = async () => {
  try {
    console.log('开始获取用户麦克风...');
    // 获取用户麦克风权限
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    });

    console.log('麦克风获取成功:', localStream.getTracks().length, '个轨道');

    // 检查WebSocket客户端状态
    console.log('WebSocket客户端状态:', props.stompClient?.connected ? '已连接' : '未连接');

    // 订阅信令消息
    subscribeToSignalingMessages();

    // 广播加入房间消息
    broadcastJoinRoom();

  } catch (error) {
    console.error('获取麦克风失败:', error);
    isStreaming.value = false;
  }
};

const stopStreaming = () => {
  // 停止所有 WebRTC 连接
  Object.keys(peerConnections).forEach(peerId => {
    closePeerConnection(peerId);
  });

  // 停止本地音频流
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  // 广播离开房间消息
  broadcastLeaveRoom();
};

// 创建与特定用户的 WebRTC 连接
const createPeerConnection = (targetUserId: string, isInitiator = false) => {
  try {
    // 创建新的 RTCPeerConnection
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // 添加本地音轨到连接
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream!);
      });
    }

    // 处理 ICE 候选
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate,
          targetUserId
        });
      }
    };

    // 处理连接状态变化
    pc.onconnectionstatechange = () => {
      console.log(`与用户 ${targetUserId} 的连接状态: ${pc.connectionState}`);
    };

    // 处理远程音频流
    pc.ontrack = (event) => {
      console.log(`收到用户 ${targetUserId} 的音频流`);
      const remoteStream = event.streams[0];
      remoteStreams[targetUserId] = remoteStream;

      // 创建音频元素播放远程音频
      createAudioElement(targetUserId, remoteStream);
    };

    // 存储连接
    peerConnections[targetUserId] = pc;

    // 如果是发起方，创建并发送 offer
    if (isInitiator) {
      createAndSendOffer(targetUserId, pc);
    }

    return pc;
  } catch (error) {
    console.error(`创建与用户 ${targetUserId} 的连接失败:`, error);
    return null;
  }
};

// 创建并发送 offer
const createAndSendOffer = async (targetUserId: string, pc: RTCPeerConnection) => {
  try {
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    });

    await pc.setLocalDescription(offer);

    sendSignalingMessage({
      type: 'offer',
      sdp: pc.localDescription,
      targetUserId
    });
  } catch (error) {
    console.error(`创建 offer 失败:`, error);
  }
};

// 处理收到的 offer
const handleOffer = async (offer: RTCSessionDescriptionInit, fromUserId: string) => {
  let pc: any = peerConnections[fromUserId];
  if (!pc) {
    pc = createPeerConnection(fromUserId);
  }

  if (pc) {
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignalingMessage({
        type: 'answer',
        sdp: pc.localDescription,
        targetUserId: fromUserId
      });
    } catch (error) {
      console.error(`处理 offer 失败:`, error);
    }
  }
};

// 处理收到的 answer
const handleAnswer = async (answer: RTCSessionDescriptionInit, fromUserId: string) => {
  const pc = peerConnections[fromUserId];
  if (pc) {
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error(`处理 answer 失败:`, error);
    }
  }
};

// 处理收到的 ICE 候选
const handleIceCandidate = (candidate: RTCIceCandidateInit, fromUserId: string) => {
  const pc = peerConnections[fromUserId];
  if (pc) {
    try {
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error(`添加 ICE 候选失败:`, error);
    }
  }
};

// 关闭与特定用户的连接
const closePeerConnection = (userId: string) => {
  const pc = peerConnections[userId];
  if (pc) {
    pc.close();
    delete peerConnections[userId];
  }

  // 移除音频元素
  removeAudioElement(userId);

  // 清除远程流
  if (remoteStreams[userId]) {
    delete remoteStreams[userId];
  }
};

// 创建音频元素播放远程音频
const createAudioElement = (userId: string, stream: MediaStream) => {
  // 如果已存在，先移除
  removeAudioElement(userId);

  // 创建新的音频元素
  const audioEl = document.createElement('audio');
  audioEl.autoplay = true;
  audioEl.srcObject = stream;
  audioEl.id = `remote-audio-${userId}`;

  // 根据接收状态设置静音
  audioEl.muted = !isReceivingAudio.value;

  // 调试模式：临时添加可见的音频控件
  audioEl.controls = true;
  audioEl.style.position = 'fixed';
  audioEl.style.bottom = '50px';
  audioEl.style.right = '20px';
  audioEl.style.zIndex = '999';
  audioEl.style.width = '300px';

  document.body.appendChild(audioEl);
  audioElements[userId] = audioEl;

  console.log(`为用户 ${userId} 创建了音频元素，静音状态:`, !isReceivingAudio.value);

  // 尝试播放
  audioEl.play().catch(e => {
    console.error('自动播放失败，可能需要用户交互:', e);
    // 添加一个视觉提示，让用户点击页面来允许音频播放
    const notification = document.createElement('div');
    notification.textContent = '点击页面启用音频';
    notification.style.position = 'fixed';
    notification.style.top = '10px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.padding = '10px';
    notification.style.backgroundColor = '#ffcc00';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '10000';
    document.body.appendChild(notification);

    // 点击页面后尝试播放
    const clickHandler = () => {
      audioEl.play().then(() => {
        document.body.removeChild(notification);
        document.removeEventListener('click', clickHandler);
      }).catch(err => console.error('播放失败:', err));
    };
    document.addEventListener('click', clickHandler);
  });
};

// 移除音频元素
const removeAudioElement = (userId: string) => {
  const audioEl = audioElements[userId];
  if (audioEl) {
    document.body.removeChild(audioEl);
    delete audioElements[userId];
  }
};

// 广播加入房间消息
const broadcastJoinRoom = () => {
  sendSignalingMessage({
    type: 'join-room',
    userId: props.userId
  });
};

// 广播离开房间消息
const broadcastLeaveRoom = () => {
  sendSignalingMessage({
    type: 'leave-room', // 添加这个类型字段
    userId: props.userId
  });
};

// 发送信令消息
const sendSignalingMessage = (message: any) => {
  console.log('准备发送信令消息:', message);
  if (props.stompClient?.connected) {
    props.stompClient.publish({
      destination: `/app/rtc-signaling/${props.roomCode}`,
      body: JSON.stringify({
        ...message,
        senderId: props.userId
      })
    });
  } else {
    console.error('WebSocket未连接，无法发送消息');
    // 可以考虑在这里添加重连逻辑或通知用户
  }
};

// 订阅信令消息
const subscribeToSignalingMessages = () => {
  props.stompClient?.subscribe(`/topic/rtc-signaling/${props.roomCode}`, (message: IMessage) => {
    const signalData = JSON.parse(message.body);

    // 忽略自己发送的消息
    if (signalData.senderId === props.userId) {
      return;
    }

    console.log('收到信令消息:', signalData.type, '来自用户:', signalData.senderId);

    switch (signalData.type) {
      case 'join-room':
        // 新用户加入，向其发送 offer
        createPeerConnection(signalData.senderId, true);
        break;

      case 'leave-room':
        // 用户离开，关闭连接
        closePeerConnection(signalData.senderId);
        break;

      case 'offer':
        // 收到 offer，创建 answer
        handleOffer(signalData.sdp, signalData.senderId);
        break;

      case 'answer':
        // 收到 answer
        handleAnswer(signalData.sdp, signalData.senderId);
        break;

      case 'ice-candidate':
        // 收到 ICE 候选
        handleIceCandidate(signalData.candidate, signalData.senderId);
        break;
    }
  });
};

onMounted(() => {
  // 组件挂载时，如果已经设置为流式传输，则开始流式传输
  if (isStreaming.value) {
    startStreaming();
  }
});

onUnmounted(() => {
  // 关闭所有连接
  Object.keys(peerConnections).forEach(peerId => {
    closePeerConnection(peerId);
  });

  // 停止本地流
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }

  // 清理所有音频元素
  Object.keys(audioElements).forEach(userId => {
    removeAudioElement(userId);
  });
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
