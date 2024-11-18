<template>
  <div class="discord-container">
    <!-- Sidebar Section -->
    <div class="sidebar">
      <div class="logo">WT</div>
      <!-- 创建房间 -->
      <div v-if="!isInRoom" class="icon">
        <a-popover style="width: 500px" title="" trigger="hover" :open="createRoomHovered"
          @openChange="createRoomHandleHoverChange" placement="rightTop">
          <template #content>
            <div>点击创建房间</div>
          </template>
          <a-popover title="" trigger="click" :open="createRoomClicked" @openChange="createRoomHandleClickChange"
            placement="rightTop">
            <template #content>
              <div style="width: 100px; height: 70px; display: flex; flex-direction: column;">
                <a-button type="primary" size="large" @click="onCreateRoom">
                  创建房间
                </a-button>
                <a @click="createRoomHide" style="margin-top: auto; display: flex;">
                  <div style="margin-left: auto;">
                    关闭
                  </div>
                </a>
              </div>
            </template>
            <!-- 使用 button 作为触发器 -->
            <!-- <a-button></a-button> -->
            <PlusCircleOutlined spin style="font-size: 30px;" />
          </a-popover>
        </a-popover>
      </div>
      <!-- 添加房间 -->
      <div v-if="!isInRoom" class="icon">
        <a-popover style="width: 500px" title="" trigger="hover" :open="joinRoomHovered"
          @openChange="joinRoomHandleHoverChange" placement="rightTop">
          <template #content>
            <div>点击加入房间</div>
          </template>
          <a-popover title="加入房间" trigger="click" :open="joinRoomClicked" @openChange="joinRoomHandleClickChange"
            placement="rightTop">
            <template #content>
              <div style="width: 180px; height: 70px;display: flex; flex-direction: column; ">
                <div style="display: flex; justify-content: center; align-items: center;">
                  <a-input style="min-width: 130px;" v-model:value="roomCodeInput" placeholder="请输入房间号" />
                  <a-button style="margin-left: 5px;" type="primary" size="middle" @click="onJoinRoom">
                    <template #icon>
                      <CheckOutlined />
                    </template>
                  </a-button>
                </div>
                <a @click="joinRoomHide" style="margin-top: auto; display: flex;">
                  <div style="margin-left: auto;">
                    关闭
                  </div>
                </a>
              </div>
            </template>
            <!-- 使用 button 作为触发器 -->
            <!-- <a-button></a-button> -->
            <PlusCircleOutlined spin style="font-size: 30px;" />
          </a-popover>
        </a-popover>
      </div>
    </div>

    <!-- Channel List Section with Scroll -->
    <div class="channel">
      <div class="channel-list">
        <div v-for="otherUser, index in otherUserList" class="channel-item" :key="index">
          <div class="other-user-info">
            <a-avatar :size="32" :src="otherUser.avatar">
              <template #icon>
                <UserOutlined />
              </template>
            </a-avatar>
            <div class="other-user-info-username">{{ otherUser.username }}</div>
            <div class="other-user-info-icon">
              <AudioOutlined class="other-info-icon" />
              <PhoneOutlined class="other-info-icon" />
            </div>
          </div>
        </div>
      </div>
      <!-- Fixed Current User at the bottom -->
      <div class="current-user">
        <div class="user-info">
          <a-avatar :size="32" :src="person.avatar">
            <template #icon>
              <UserOutlined />
            </template>
          </a-avatar>
          <div class="user-info-username">{{ person.username }}</div>
          <div class="user-info-icon">
            <AudioOutlined class="info-icon" />
            <PhoneOutlined class="info-icon" />
            <SettingOutlined class="info-icon" />
          </div>
        </div>
      </div>
    </div>

    <!-- Main Chat Section -->
    <div class="main-chat">
      <div class="chat-header">
        <div v-show="!isInRoom" class="title">尚未加入房间</div>
        <div v-show="isInRoom" class="title">当前房间: {{ roomCode }}</div>
      </div>

      <!-- 视频部分 -->
      <div class="chat-content">
        <!-- <video class="chat-content-video" controls
          src="D:\Data\code\web_2024\WatchTogether\FormalProject\WatchTogetherFrontend\public\mv.mp4" muted>
          您的浏览器不支持视频播放。
        </video> -->
        <div v-if="!stompClient" class="chat-content-video-none">WebSocket未连接</div>
        <VideoPlayer v-if="stompClient" class="chat-content-video" :stompClient="stompClient"
          :roomCode="roomCode" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref, onBeforeUnmount } from 'vue';
import { AudioOutlined, PhoneOutlined, SettingOutlined, PlusCircleOutlined, CheckOutlined, UserOutlined } from "@ant-design/icons-vue"
import { createRoom, joinRoom } from '../api/wt/roomApi.ts';
import { notification } from 'ant-design-vue';
import { LOCAL_WEBSOCKET_SERVER_URL } from '../utils/ipAddress.ts';
import SockJS from "sockjs-client";
import { Stomp, Client } from "@stomp/stompjs";
import VideoPlayer from "../components/VideoPlayer.vue";

interface OhterUser {
  id: string;
  username: string;
  avatar: string;
}

interface User {
  id: string;
  username: string;
  avatar: string;
}


const createRoomClicked = ref<boolean>(false);
const createRoomHovered = ref<boolean>(false);
const isInRoom = ref<boolean>(false);
const roomCodeInput = ref<string>('');
const roomCode = ref<string>('');

const createRoomHide = () => {
  createRoomClicked.value = false;
  createRoomHovered.value = false;
};

const createRoomHandleHoverChange = (visible: boolean) => {
  createRoomClicked.value = false;
  createRoomHovered.value = visible;
};

const createRoomHandleClickChange = (visible: boolean) => {
  createRoomClicked.value = visible;
  createRoomHovered.value = false;
};


const joinRoomClicked = ref<boolean>(false);
const joinRoomHovered = ref<boolean>(false);

const joinRoomHide = () => {
  joinRoomClicked.value = false;
  joinRoomHovered.value = false;
};

const joinRoomHandleHoverChange = (visible: boolean) => {
  joinRoomClicked.value = false;
  joinRoomHovered.value = visible;
};

const joinRoomHandleClickChange = (visible: boolean) => {
  joinRoomClicked.value = visible;
  joinRoomHovered.value = false;
};

const showCreateRoomSuccessNotification = () => {
  notification.success({
    message: `房间创建成功`,
    description: `房间号为${roomCode.value}`,
    duration: 1.5,
    placement: 'topRight',
  });
}

const showCreateRoomFailNotification = () => {
  notification.error({
    message: `房间创建失败`,
    duration: 1.5,
    placement: 'topRight',
  });
}

const showJoinRoomSuccessNotification = () => {
  notification.success({
    message: `成功加入房间`,
    duration: 1.5,
    placement: 'topRight',
  });
}

const showJoinRoomFailNotification = () => {
  notification.error({
    message: `无法加入房间`,
    description: "请检查房间号是否正确",
    duration: 1.5,
    placement: 'topRight',
  });
}


const otherUserList = reactive<OhterUser[]>([
  { id: "1", username: "AA", avatar: "data:image/jpeg;base64,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" },
  { id: "1", username: "BB", avatar: "data:image/jpeg;base64,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" },
  { id: "1", username: "CC", avatar: "data:image/jpeg;base64,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" },
  { id: "1", username: "DD", avatar: "data:image/jpeg;base64,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" },
  { id: "1", username: "HH", avatar: "data:image/jpeg;base64,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" },
]);

const person = reactive<User>({
  id: "123", username: "Atas", avatar: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQZRXnKW-qw36dDDqtzvwc_WrhWPENEf62gzg&s"
});

// Reactive properties
const stompClient = ref<Client | null>(null); // WebSocket Client

// Connect to WebSocket server
const connectToWebSocketServer = (room: string) => {
  const socket = new SockJS(LOCAL_WEBSOCKET_SERVER_URL);
  const stomp = Stomp.over(socket);
  stomp.connect(
    {
      token: localStorage.getItem("token"), // Assuming token is stored in localStorage
      roomCode: room,
    },
    () => {
      console.log("Connected to WebSocket server");
      stompClient.value = stomp;
    },
    (error: any) => {
      console.error("Connection error", error);
    }
  );

  // Cleanup on unmount
  onBeforeUnmount(() => {
    if (stompClient.value) {
      stompClient.value.onDisconnect = () => {
        console.log("Disconnected from server");
      };
      stompClient.value.deactivate();  // 关闭连接的方法
    }
  });
};


const onCreateRoom = async () => {
  try {
    const res: any = await createRoom();
    console.log(res);
    if (res.success) {
      const newRoomCode = res.message;
      roomCode.value = newRoomCode;
      isInRoom.value = true;
      connectToWebSocketServer(roomCode.value);
      showCreateRoomSuccessNotification();
    } else {
      showCreateRoomFailNotification();
    }
  } catch (err) {
    showCreateRoomFailNotification();
    console.error("创建房间失败", err);
  }
}

const onJoinRoom = async () => {
  try {
    const res: any = await joinRoom(roomCodeInput.value);
    console.log(res);
    if (res.success) {
      roomCode.value = roomCodeInput.value;
      isInRoom.value = true;
      connectToWebSocketServer(roomCode.value);
      showJoinRoomSuccessNotification();
    } else {
      showJoinRoomFailNotification();
    }
  } catch (err) {
    console.log("加入房间失败");
    showJoinRoomFailNotification();
  }
}


</script>

<style scoped>
.discord-container {
  display: flex;
  flex-direction: row;
  height: 100vh;
  background-color: #fff5f5;
}

.sidebar {
  min-width: 80px;
  background-color: #fff5f5;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #e1e1e1;
  border-right: 1px solid #f5d5d5;
}

.sidebar .logo {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #1b1c1c;
}

.sidebar .icon {
  width: 40px;
  height: 40px;
  margin-bottom: 20px;
  background-color: #a5a9e4;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #fff;
  cursor: pointer;
}

.channel {
  min-width: 240px;
  background-color: #fee7e7;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.3);

}

.channel-list {
  color: #1e1d1d;
  overflow-y: auto;
}

.channel-list::-webkit-scrollbar {
  display: none;
}

.channel-item {
  margin: 5px;
  padding: 12px;
  border-radius: 10px;
  margin-top: 10px;
  background-color: #f5d4d4;
  border-bottom: 1px solid #f1cece;
  transition: background-color 0.3s;
}

.channel-list .channel-item:hover {
  background-color: #e8dede;
}

.other-user-info {
  justify-content: center;
  align-items: center;
  display: flex;
}

.other-user-info-username {
  font-size: small;
  color: #6e6a6a;
  margin-left: 6px;
  flex-grow: 1;
  min-width: 100px
}

.other-user-info-icon {
  margin-left: auto;
}

.other-user-info-icon .other-info-icon {
  margin-left: 10px;
}

.current-user {
  margin-top: auto;
  background-color: #f9ecec;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #333;
}

.current-user .user-info {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  justify-content: center;
}

.user-info-username {
  font-size: small;
  color: #6e6a6a;
  margin-left: 6px;
  min-width: 100px;
}

.user-info-icon {
  margin-left: auto;
}

.user-info-icon .info-icon {
  cursor: pointer;
  margin-left: 10px;
  flex-grow: 1;
  transition: 0.3s;
}

.user-info-icon .info-icon:hover {
  color: #6e6a6a;
}

.current-user button {
  background: none;
  color: #ff9800;
  border: none;
  font-size: 20px;
  cursor: pointer;
}

.main-chat {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background-color: #fff5f5;
  color: #fff5f5;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.3);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  padding: 15px;
  margin: 5px;
  border-radius: 15px;
  background-color: #ecdede;
  border-bottom: 1px solid #333;
  align-items: center;
  justify-content: center;
}

.chat-header .title {
  font-size: 18px;
  font-weight: bold;
  color: #030303;
}


.chat-content {
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #fbe9e9;
  border-radius: 15px;
  margin: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  object-fit: cover;
}

.chat-content::-webkit-scrollbar {
  display: none;
}

.chat-content-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* 根据需要调整为 contain 或 fill */
  border-radius: 15px;
  /* 保持圆角样式 */
}

.chat-content-video-none {
  color: #7f7a7a;
  font-size: large;
  font-weight: bold;
  object-fit: cover;
  /* 根据需要调整为 contain 或 fill */
  border-radius: 15px;
  /* 保持圆角样式 */
}
</style>
