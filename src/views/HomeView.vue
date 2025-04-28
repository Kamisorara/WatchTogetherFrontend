<template>
  <div class="discord-container">
    <!-- Sidebar Section -->
    <div class="sidebar">
      <div class="logo">WT</div>
      <!-- 创建房间 -->
      <div v-if="!isInRoom" class="icon" @click="toggleCreateRoomDropdown">
        <a-tooltip placement="right" :title="'创建房间'">
          <div>
            <PlusCircleOutlined :spin="false" style="font-size: 24px;" />
          </div>
        </a-tooltip>
        <a-modal v-model:visible="createRoomClicked" :footer="null" :width="320" title="创建新房间" centered destroyOnClose>
          <div style="padding: 16px;">
            <div style="margin-bottom: 20px; text-align: center; color: var(--neutral);">
              创建一个新的观影派对，邀请朋友一起享受！
            </div>
            <a-button type="primary" block size="large" @click="onCreateRoom"
              style="height: 48px; font-size: 16px; color: black;">
              <template #icon>
                <PlusCircleOutlined />
              </template>
              创建房间
            </a-button>
            <div style="margin-top: 16px; text-align: right;">
              <a @click="createRoomHide" style="color: var(--neutral); opacity: 0.8;">取消</a>
            </div>
          </div>
        </a-modal>
      </div>

      <!-- 加入房间 -->
      <div v-if="!isInRoom" class="icon" @click="toggleJoinRoomDropdown">
        <a-tooltip placement="right" :title="'加入房间'">
          <div>
            <SearchOutlined :spin="false" style="font-size: 24px;" />
          </div>
        </a-tooltip>
        <a-modal v-model:visible="joinRoomClicked" :footer="null" :width="380" title="加入观影派对" centered destroyOnClose>
          <div style="padding: 16px;">
            <div style="margin-bottom: 20px; font-weight: 500; color: var(--neutral); text-align: center;">
              输入房间号加入朋友的观影派对
            </div>
            <div style="display: flex; gap: 12px;">
              <a-input v-model:value="roomCodeInput" placeholder="请输入房间号" size="large" style="flex: 1;" />
              <a-button style="color: black;" type="primary" size="large" @click="onJoinRoom">
                <template #icon>
                  <CheckOutlined />
                </template>
                加入
              </a-button>
            </div>
            <div style="margin-top: 16px; text-align: right;">
              <a @click="joinRoomHide" style="color: var(--neutral); opacity: 0.8;">取消</a>
            </div>
          </div>
        </a-modal>
      </div>
    </div>

    <!-- 用户列表 -->
    <div class="channel">
      <div
        style="padding: 20px 16px 0; font-size: 14px; display: flex; justify-content: space-between; align-items: center;">
        <span>观影派对成员</span>
        <span>{{ otherUserList.length }}人在线</span>
      </div>
      <div class="channel-list">
        <div v-for="otherUser, index in otherUserList" class="channel-item" :key="index">
          <div class="other-user-info">
            <a-avatar :size="38" :src="otherUser.userAvatar">
              <template #icon>
                <UserOutlined />
              </template>
            </a-avatar>
            <div class="other-user-info-username">{{ otherUser.userName }}</div>
            <div class="other-user-info-icon">
              <AudioOutlined class="other-info-icon" />
              <PhoneOutlined class="other-info-icon" />
            </div>
          </div>
        </div>
      </div>
      <!-- 个人 -->
      <div class="current-user">
        <div class="user-info">
          <a-avatar :size="38" :src="person.userAvatar">
            <template #icon>
              <UserOutlined />
            </template>
          </a-avatar>
          <div class="user-info-username">{{ person.userName }}</div>
          <div class="user-info-icon">
            <!-- TODO 实现语音的开启和关闭 -->
            <!-- <AudioMutedOutlined class="info-icon" /> -->
            <AudioSync class="info-icon" :user-id="userAccountDetailFromState.id"
              :stomp-client="(stompClient as Client)" :room-code="roomCode" />
            <SettingOutlined class="info-icon" @click="showSettingsDrawer" />
          </div>
        </div>
      </div>
    </div>

    <!-- Main Chat Section -->
    <div class="main-chat">

      <!-- 聊天头部 -->
      <div class="chat-header">
        <div v-show="!isInRoom" class="title">尚未加入房间</div>
        <div v-show="isInRoom" class="title">观影派对: {{ roomCode }}</div>
      </div>

      <!-- 视频部分 -->
      <div class="chat-content">
        <div v-if="!stompClient" class="chat-content-video-none">
          <div class="empty-icon-container">
            <disconnect-outlined />
          </div>
          <div class="empty-text">WebSocket未连接，请先创建或加入房间开始您的观影派对</div>
          <div class="action-buttons">
            <div class="action-button action-button-primary" @click="toggleCreateRoomDropdown" v-if="!isInRoom">
              <plus-circle-outlined />
              <span>创建房间</span>
            </div>
            <div class="action-button action-button-secondary" @click="toggleJoinRoomDropdown" v-if="!isInRoom">
              <search-outlined />
              <span>加入房间</span>
            </div>
          </div>
        </div>
        <!-- 不用管这个error -->
        <VideoPlayer v-if="stompClient" class="chat-content-video" :stompClient="(stompClient as Client)"
          :roomCode="roomCode" />
      </div>
    </div>
    <!-- 设置下拉栏 -->
  </div>
  <a-drawer class="settings-drawer" :width="500" title="个人设置" :placement="placement" :open="settingsDrawerOpen"
    @close="closeSettingsDrawer">
    <template #extra>
      <div style="display: flex; gap: 10px;">
        <a-button style="color: black;" type="primary" @click="closeSettingsDrawer">
          完成
        </a-button>
      </div>
    </template>
    <a-card class="settings-drawer-account" :loading="accountMessageLoading" hoverable title="账号信息">
      <!-- 头像 -->
      <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 30px;">
        <a-upload style="cursor: pointer;" v-model:file-list="avatarFileList" name="file" :show-upload-list="false"
          action="http://localhost:8081/api/sys/minio-upload" :before-upload="beforeUpload" :headers="uploadHeaders"
          @change="handleUploadChange">
          <a-avatar v-if="userAccountDetailFromState.userAvatar !== ''" :size="80"
            :src="userAccountDetailFromState.userAvatar">
            <template #icon>
              <UserOutlined />
            </template>
          </a-avatar>
          <div v-else
            style="width: 80px; height: 80px; border-radius: 50%; background: #f5f5f5; display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <loading-outlined v-if="avatarUploading" style="font-size: 24px;"></loading-outlined>
            <plus-outlined v-else style="font-size: 24px;"></plus-outlined>
            <div class="ant-upload-text" style="margin-top: 8px; font-size: 12px;">上传头像</div>
          </div>
        </a-upload>
      </div>
      <a-form style="margin-top: 20px;" v-bind="userAccountDetailFromLayout" :model="userAccountDetailFromState"
        name="userDetailMessage" @finish="onUserAccountFromFinish" @submit="onUpdateUserDetailSubmit">
        <a-form-item name="id" label="ID">
          <a-input disabled v-model:value="userAccountDetailFromState.id" />
        </a-form-item>
        <a-form-item name="username" label="用户名">
          <a-input disabled v-model:value="userAccountDetailFromState.userName" />
        </a-form-item>
        <a-form-item name="userEmail" label="邮箱">
          <a-input disabled v-model:value="userAccountDetailFromState.userEmail" />
        </a-form-item>
        <a-form-item name="userPhtone" label="手机号">
          <a-input v-model:value="userAccountDetailFromState.userPhone" />
        </a-form-item>
        <a-form-item name="userSex" label="性别">
          <a-radio-group v-model:value="userAccountDetailFromState.userSex">
            <a-radio value="0">男</a-radio>
            <a-radio value="1">女</a-radio>
            <a-radio value="2">未知</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item :wrapper-col="{ span: 12, offset: 15 }">
          <a-button style="color: black;" type="primary" html-type="submit">提交修改</a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </a-drawer>
</template>

<script lang="ts" setup>
import { ref, onBeforeUnmount, onMounted } from 'vue';
import { AudioOutlined, PhoneOutlined, SettingOutlined, PlusCircleOutlined, CheckOutlined, UserOutlined, SearchOutlined, LoadingOutlined, PlusOutlined, DisconnectOutlined } from "@ant-design/icons-vue"
import { createRoom, joinRoom, getUserDetailsInRoom } from '../api/wt/roomApi.ts';
import { notification, DrawerProps, UploadChangeParam, message, UploadFile } from 'ant-design-vue';
import { LOCAL_WEBSOCKET_SERVER_URL } from '../utils/ipAddress.ts';
import SockJS from "sockjs-client";
import { Stomp, Client } from "@stomp/stompjs";
import VideoPlayer from "../components/VideoPlayer.vue";
import AudioSync from '../components/AudioSync.vue';
import { getUserInfoFromToken, updateUserDetailInfo } from '../api/sys/userApi.ts';

interface OhterUser {
  id: string;
  userName: string;
  userAvatar: string;
}

interface User {
  id: string;
  userName: string;
  userAvatar: string;
}

interface userDetailsMessage {
  id: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  userAvatar: string;
  userCreateTime: string;
  userNickName: string;
  userSex: string;
}

// 用户信息
let userAccountDetailFromState = ref<userDetailsMessage>({
  id: "",
  userName: "",
  userEmail: "",
  userPhone: "",
  userAvatar: "",
  userCreateTime: "",
  userNickName: "",
  userSex: "2",
});

//图片上传
const avatarFileList = ref([]);
const avatarUploading = ref<boolean>(false);
const uploadHeaders = ref({
  Authorization: `${localStorage.getItem("token")}`
});

const handleUploadChange = (info: UploadChangeParam) => {
  if (info.file.status === 'uploading') {
    avatarUploading.value = true;
    return;
  }
  if (info.file.status === 'done') {
    // Get this url from response in real world.
    console.log(info.file.response);
    if (info.file.response.success) {
      avatarUploading.value = false;
      message.success("头像更换成功，刷新页面查看");
    }
  }
  if (info.file.status === 'error') {
    avatarUploading.value = false;
    message.error("上传图片时发生错误");
  }
};

const beforeUpload = (file: UploadFile): boolean => {
  if (!file.type) {
    message.error('Unable to determine file type!');
    return false;
  }

  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
  if (!isJpgOrPng) {
    message.error('You can only upload JPG or PNG file!');
    return false;
  }
  // 文件大小限制为2MB
  const isLt2M = file.size! / 1024 / 1024 < 2;
  if (!isLt2M) {
    message.error('Image must smaller than 2MB!');
    return false;
  }

  return true;
};

// 侧拉栏
const onUserAccountFromFinish = (values: any) => {
  console.log('Success:', values);
};

const userAccountDetailFromLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 14 },
};

const placement = ref<DrawerProps['placement']>('left');
const settingsDrawerOpen = ref<boolean>(false);
const showSettingsDrawer = () => {
  settingsDrawerOpen.value = true;
}

const closeSettingsDrawer = () => {
  settingsDrawerOpen.value = false;
}

// 个人信息加载
const accountMessageLoading = ref<boolean>(false);
const detailsMessageLoading = ref<boolean>(false);

// 房间创建加入
const createRoomClicked = ref<boolean>(false);
const createRoomHovered = ref<boolean>(false);
const isInRoom = ref<boolean>(false);
const roomCodeInput = ref<string>('');
const roomCode = ref<string>('');

const createRoomHide = () => {
  createRoomClicked.value = false;
};

const joinRoomHide = () => {
  joinRoomClicked.value = false;
};

const joinRoomClicked = ref<boolean>(false);
const joinRoomHovered = ref<boolean>(false);

const toggleCreateRoomDropdown = () => {
  createRoomClicked.value = !createRoomClicked.value;
  joinRoomClicked.value = false; // 关闭另一个弹窗
};

const toggleJoinRoomDropdown = () => {
  joinRoomClicked.value = !joinRoomClicked.value;
  createRoomClicked.value = false; // 关闭另一个弹窗
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


let otherUserList = ref<OhterUser[]>([]);

let person = ref<User>({
  id: "", userName: "", userAvatar: ""
});

// 获取房间内其余用户
const getOhterUserDetailsInRoom = async (roomCode: string) => {
  const res: any = await getUserDetailsInRoom(roomCode);
  console.log(res);
  if (res.success) {
    console.log("获取成功");
    // 清空原有数组并添加新数据
    otherUserList.value = res.message;
  }
}


// Websocket
const stompClient = ref<Client | null>(null);


const connectToWebSocketServer = (room: string) => {
  const socket = new SockJS(LOCAL_WEBSOCKET_SERVER_URL);
  const stomp = Stomp.over(socket);
  stomp.connect(
    {
      token: localStorage.getItem("token"),
      roomCode: room,
    },
    () => {
      console.log("Connected to WebSocket server");

      // 连接成功后订阅主题
      stomp.subscribe(`/topic/room/${room}`, (message) => {
        const payload = JSON.parse(message.body);
        console.log(payload);
        if (payload.type === "USER_CHANGE") {
          console.log("用户发生变动");
          // TODO 刷新房间用户
          getOhterUserDetailsInRoom(room);
        }
      });

      stompClient.value = stomp;
    },
    (error: any) => {
      console.error("Connection error", error);
    }
  );

  onBeforeUnmount(() => {
    if (stompClient.value) {
      stompClient.value.onDisconnect = () => {
        console.log("Disconnected from server");
      };
      stompClient.value.deactivate();  // 关闭连接的方法
    }
  });
};

onMounted(() => {
  getUserInfo();
});

// 从Token中获取用户信息
const getUserInfo = async () => {
  const res: any = await getUserInfoFromToken();
  console.log(res);
  if (res.success) {
    userAccountDetailFromState.value = res.message;
    person.value = res.message
  }
}

// 提交用户更新操作
const onUpdateUserDetailSubmit = async (event: Event) => {
  event.preventDefault(); // 阻止默认提交行为
  try {
    const res: any = await updateUserDetailInfo(userAccountDetailFromState.value.userPhone, userAccountDetailFromState.value.userSex);
    if (res.success) {
      notification.success({
        message: res.message,
        duration: 2,
        placement: 'topRight',
      });
    }
    console.log(res);
  } catch (error) {
    console.log("更新资料失败", error);
  }
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
      createRoomClicked.value = false; // 关闭弹窗
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
      // 获取房间内用户
      getOhterUserDetailsInRoom(roomCodeInput.value);
      joinRoomClicked.value = false; // 关闭弹窗
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
/* 基础变量 */
:root {
  --primary: #7c4dff;
  --primary-light: #b47cff;
  --primary-dark: #3f1dcb;
  --secondary: #00c853;
  --secondary-light: #5efc82;
  --secondary-dark: #009624;
  --neutral-dark: #263238;
  --neutral: #455a64;
  --neutral-light: #718792;
  --background-light: #f5f7fa;
  --background-dark: #121212;
  --white: #ffffff;
  --error: #ff5252;
  --warning: #ffab40;
  --info: #40c4ff;
  --success: #69f0ae;
}

.discord-container {
  display: flex;
  flex-direction: row;
  height: 100vh;
  background-color: var(--background-light);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  overflow: hidden;
}

/* 侧边栏样式 */
.sidebar {
  min-width: 80px;
  background: linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%);
  padding: 24px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.sidebar .logo {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 36px;
  color: var(--white);
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  letter-spacing: -1px;
}

.sidebar .logo:hover {
  transform: translateY(-5px) scale(1.05);
  box-shadow: 0 12px 20px rgba(0, 0, 0, 0.15);
}

.sidebar .icon {
  width: 56px;
  height: 56px;
  margin-bottom: 24px;
  background: rgba(255, 255, 255, 0.15);
  /* Increased opacity for better contrast */
  border-radius: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--white);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
}

.sidebar .icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 16px;
}

.sidebar .icon:hover {
  transform: translateY(-5px);
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

.sidebar .icon:hover::before {
  opacity: 1;
}

/* 频道列表样式 */
.channel {
  min-width: 280px;
  background-color: var(--neutral-dark);
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 5;
  color: var(--white);
}

.channel-list {
  overflow-y: auto;
  padding: 20px 16px;
  flex: 1;
}

.channel-list::-webkit-scrollbar {
  width: 5px;
}

.channel-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.channel-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}

.channel-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.channel-item {
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.12);
  /* Increased from 0.08 */
  transition: all 0.3s;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  /* Add subtle border */
}

.channel-list .channel-item:hover {
  background: rgba(255, 255, 255, 0.2);
  /* Increased from 0.12 */
  transform: translateX(5px);
}

.other-user-info {
  justify-content: flex-start;
  align-items: center;
  display: flex;
}

.other-user-info-username {
  font-size: 15px;
  font-weight: 600;
  /* Increased from 500 */
  color: rgb(132, 130, 130);
  /* Full opacity for better visibility */
  margin-left: 14px;
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.1);
  /* Add text shadow for better readability */
}

.other-user-info-icon {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.other-user-info-icon .other-info-icon {
  margin-left: 12px;
  color: rgba(125, 125, 125, 0.6);
  font-size: 18px;
  transition: all 0.3s;
  padding: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0);
}

.other-user-info-icon .other-info-icon:hover {
  color: var(--white);
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.15);
}

/* 当前用户区域样式 */
.current-user {
  background: rgba(0, 0, 0, 0.25);
  /* Increased from 0.2 */
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  /* Slightly more visible */
}

.current-user .user-info {
  display: flex;
  align-items: center;
}

.user-info-username {
  font-size: 15px;
  font-weight: 700;
  /* Increased from 600 */
  color: rgba(255, 255, 255, 1);
  /* Full opacity */
  margin-left: 14px;
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.3);
  /* Text shadow for contrast */
}

.user-info-icon {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.user-info-icon .info-icon {
  cursor: pointer;
  margin-left: 16px;
  font-size: 20px;
  color: rgba(73, 71, 71, 0.7);
  transition: all 0.3s;
  padding: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0);
}

.user-info-icon .info-icon:hover {
  color: var(--white);
  transform: scale(1.15);
  background: rgba(255, 255, 255, 0.1);
}

/* 主聊天区域样式 */
.main-chat {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--background-light);
  position: relative;
}

.chat-header {
  display: flex;
  justify-content: center;
  padding: 16px 24px;
  margin: 20px 20px 0;
  border-radius: 16px;
  background: linear-gradient(120deg, var(--white) 0%, rgba(255, 255, 255, 0.9) 100%);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  z-index: 1;
}

.chat-header .title {
  font-size: 18px;
  font-weight: 700;
  /* Increased from 600 */
  color: var(--neutral-dark);
  position: relative;
  padding-bottom: 4px;
}

.chat-header .title::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background: linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%);
  border-radius: 3px;
}

.chat-content {
  flex-grow: 1;
  margin: 20px;
  border-radius: 20px;
  background: var(--white);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  position: relative;
}

.chat-content-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-content-video-none {
  color: var(--neutral);
  font-size: 17px;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  height: 100%;
  width: 100%;
  background: linear-gradient(120deg, rgba(124, 77, 255, 0.02) 0%, rgba(124, 77, 255, 0.08) 100%);
  padding: 60px 20px;
}

.empty-icon-container {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(124, 77, 255, 0.1) 0%, rgba(124, 77, 255, 0.05) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px rgba(124, 77, 255, 0.2);
  margin-bottom: 16px;
}

.empty-icon-container .anticon {
  font-size: 48px;
  color: var(--primary);
  opacity: 0.8;
}

.empty-text {
  max-width: 280px;
  text-align: center;
  color: var(--neutral-dark);
  /* Darker than previous */
  line-height: 1.6;
  margin-bottom: 20px;
  font-weight: 500;
}

/* 设置抽屉样式 */
.settings-drawer-account,
.settings-drawer-details {
  border-radius: 16px;
  transition: all 0.3s;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  margin-bottom: 30px;
  overflow: hidden;
  border: none;
}

.settings-drawer-account:hover,
.settings-drawer-details:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
}

/* Ant Design 组件覆盖样式 */
:deep(.ant-upload) {
  border-radius: 50%;
  overflow: hidden;
  transition: all 0.3s;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

:deep(.ant-upload:hover) {
  transform: scale(1.05);
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.15);
}

:deep(.ant-avatar) {
  border: 3px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

:deep(.ant-btn) {
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  font-weight: 600;
  /* Bolder text */
  letter-spacing: 0.2px;
}

:deep(.ant-btn:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
}

:deep(.ant-btn-primary) {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  border: none;
  color: white;
  /* Ensure text is white */
  text-shadow: 0px 1px 1px rgba(0, 0, 0, 0.2);
  /* Add text shadow */
}

:deep(.ant-btn-primary:hover) {
  background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%);
  color: white;
  /* Maintain white text on hover */
}

:deep(.ant-input) {
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s;
}

:deep(.ant-input:hover),
:deep(.ant-input:focus) {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(124, 77, 255, 0.1);
}

:deep(.ant-modal) {
  border-radius: 20px;
  overflow: hidden;
}

:deep(.ant-modal-content) {
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

:deep(.ant-modal-header) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

:deep(.ant-drawer-content) {
  border-radius: 24px 0 0 24px;
  overflow: hidden;
}

:deep(.ant-drawer-header) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

:deep(.ant-card) {
  border-radius: 16px;
  border: none;
}

:deep(.ant-card-head) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

:deep(.ant-modal-title),
:deep(.ant-drawer-title),
:deep(.ant-card-head-title) {
  font-weight: 700;
  color: var(--neutral-dark);
}

/* 房间按钮样式 */
.action-buttons {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}

.action-button {
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 700;
  /* Increased from 600 */
  font-size: 15px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: 0.3px;
  /* Better letter spacing for readability */
}

.action-button-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  box-shadow: 0 8px 20px rgba(124, 77, 255, 0.3);
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.2);
  /* Text shadow for better contrast */
}

.action-button-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 25px rgba(124, 77, 255, 0.4);
}

.action-button-secondary {
  background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.9) 100%);
  /* Increased opacity */
  color: var(--neutral-dark);
  border: 1px solid rgba(0, 0, 0, 0.1);
  /* Darker border */
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.05);
  font-weight: 700;
}

.action-button-secondary:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 20px rgba(0, 0, 0, 0.1);
}
</style>
