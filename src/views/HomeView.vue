<template>
  <div class="discord-container">
    <!-- Sidebar Section -->
    <div class="sidebar">
      <div class="logo">WT</div>
      <!-- 创建房间 -->
      <div v-if="!isInRoom" class="icon" @mouseenter="createRoomHandleHoverChange(true)"
        @mouseleave="createRoomHandleHoverChange(false)">
        <a-tooltip placement="right" :title="createRoomHovered ? '' : '点击创建房间'">
          <a-dropdown :trigger="['click']" placement="bottomRight" :open="createRoomClicked"
            @openChange="createRoomHandleClickChange">
            <div>
              <PlusCircleOutlined :spin="false" style="font-size: 24px;" />
            </div>
            <template #overlay>
              <a-menu style="width: 160px; padding: 8px;">
                <div style="padding: 12px;">
                  <a-button type="primary" block size="middle" @click="onCreateRoom">
                    创建房间
                  </a-button>
                  <div style="margin-top: 12px; text-align: right;">
                    <a @click="createRoomHide">关闭</a>
                  </div>
                </div>
              </a-menu>
            </template>
          </a-dropdown>
        </a-tooltip>
      </div>

      <!-- 加入房间 button with similar updated styling -->
      <div v-if="!isInRoom" class="icon" @mouseenter="joinRoomHandleHoverChange(true)"
        @mouseleave="joinRoomHandleHoverChange(false)">
        <a-tooltip placement="right" :title="joinRoomHovered ? '' : '点击加入房间'">
          <a-dropdown :trigger="['click']" placement="bottomRight" :open="joinRoomClicked"
            @openChange="joinRoomHandleClickChange">
            <div>
              <SearchOutlined :spin="false" style="font-size: 24px;" />
            </div>
            <template #overlay>
              <a-menu style="width: 240px; padding: 8px;">
                <div style="padding: 12px;">
                  <div style="margin-bottom: 12px; font-weight: 600;">加入房间</div>
                  <div style="display: flex; gap: 8px;">
                    <a-input v-model:value="roomCodeInput" placeholder="请输入房间号" />
                    <a-button type="primary" @click="onJoinRoom">
                      <template #icon>
                        <CheckOutlined />
                      </template>
                    </a-button>
                  </div>
                  <div style="margin-top: 12px; text-align: right;">
                    <a @click="joinRoomHide">关闭</a>
                  </div>
                </div>
              </a-menu>
            </template>
          </a-dropdown>
        </a-tooltip>
      </div>
    </div>

    <!-- 用户列表 -->
    <div class="channel">
      <div class="channel-list">
        <div v-for="otherUser, index in otherUserList" class="channel-item" :key="index">
          <div class="other-user-info">
            <a-avatar :size="32" :src="otherUser.userAvatar">
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
          <a-avatar :size="32" :src="person.userAvatar">
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
      <div class="chat-header">
        <div v-show="!isInRoom" class="title">尚未加入房间</div>
        <div v-show="isInRoom" class="title">当前房间: {{ roomCode }}</div>
      </div>

      <!-- 视频部分 -->
      <div class="chat-content">
        <div v-if="!stompClient" class="chat-content-video-none">
          <disconnect-outlined style="font-size: 64px; color: #d9d9d9;" />
          <span>WebSocket未连接，请先创建或加入房间</span>
        </div>
        <!-- 不用管这个error -->
        <VideoPlayer v-if="stompClient" class="chat-content-video" :stompClient="(stompClient as Client)"
          :roomCode="roomCode" />
      </div>
    </div>
    <!-- 设置下拉栏 -->
  </div>
  <a-drawer class="settings-drawer" :width="500" title="设置" :placement="placement" :open="settingsDrawerOpen"
    @close="closeSettingsDrawer">
    <template #extra>
    </template>
    <a-card class="settings-drawer-account" :loading="accountMessageLoading" hoverable title="账号信息">
      <!-- 头像 -->
      <div style="display: flex;justify-content: center; align-items: center;">
        <a-upload style="cursor: pointer;" v-model:file-list="avatarFileList" name="file" :show-upload-list="false"
          action="http://localhost:8080/api/sys/fastdfs-upload" :before-upload="beforeUpload" :headers="uploadHeaders"
          @change="handleUploadChange">
          <a-avatar v-if="userAccountDetailFromState.userAvatar !== ''" :size="64"
            :src="userAccountDetailFromState.userAvatar">
            <template #icon>
              <UserOutlined />
            </template>
          </a-avatar>
          <div v-else>
            <loading-outlined v-if="avatarUploading"></loading-outlined>
            <plus-outlined v-else></plus-outlined>
            <div class="ant-upload-text">Upload</div>
          </div>
        </a-upload>
      </div>
      <div>
      </div>
      <a-form style="margin-top: 20px;" v-bind="userAccountDetailFromLayout" :model="userAccountDetailFromState"
        name="userDetailMessage" @finish="onUserAccountFromFinish" @submit="onUpdateUserDetailSubmit">
        <a-form-item name="id" label="id">
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
          <a-button type="primary" html-type="submit">提交修改</a-button>
        </a-form-item>
      </a-form>
    </a-card>
    <a-card class="settings-drawer-details" :loading="detailsMessageLoading" hoverable title="修改密码">...</a-card>
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
  token: localStorage.getItem("token")
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
  background-color: #f9fafb;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.sidebar {
  min-width: 72px;
  background-color: #ffffff;
  padding: 24px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.sidebar .logo {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 32px;
  color: #1890ff;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e6f7ff;
  border-radius: 12px;
  transition: all 0.3s;
}

.sidebar .logo:hover {
  transform: scale(1.05);
}

.sidebar .icon {
  width: 48px;
  height: 48px;
  margin-bottom: 24px;
  background-color: #f0f5ff;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #1890ff;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.sidebar .icon:hover {
  background-color: #e6f7ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
}

.channel {
  min-width: 260px;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  z-index: 5;
}

.channel-list {
  color: #333;
  overflow-y: auto;
  padding: 16px 12px;
  flex: 1;
}

.channel-list::-webkit-scrollbar {
  width: 4px;
}

.channel-list::-webkit-scrollbar-track {
  background: transparent;
}

.channel-list::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 4px;
}

.channel-item {
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 8px;
  background-color: #f5f5f5;
  transition: all 0.3s;
}

.channel-list .channel-item:hover {
  background-color: #e6f7ff;
  transform: translateY(-1px);
}

.other-user-info {
  justify-content: flex-start;
  align-items: center;
  display: flex;
}

.other-user-info-username {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
  margin-left: 12px;
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.other-user-info-icon {
  margin-left: auto;
}

.other-user-info-icon .other-info-icon {
  margin-left: 10px;
  color: #8c8c8c;
  font-size: 16px;
  transition: color 0.3s;
}

.other-user-info-icon .other-info-icon:hover {
  color: #1890ff;
}

.current-user {
  background-color: #fafafa;
  padding: 16px;
  border-top: 1px solid #f0f0f0;
}

.current-user .user-info {
  display: flex;
  align-items: center;
}

.user-info-username {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
  margin-left: 12px;
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-info-icon {
  margin-left: auto;
  display: flex;
}

.user-info-icon .info-icon {
  cursor: pointer;
  margin-left: 16px;
  font-size: 18px;
  color: #595959;
  transition: all 0.3s;
}

.user-info-icon .info-icon:hover {
  color: #1890ff;
  transform: scale(1.1);
}

.main-chat {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background-color: #f9fafb;
}

.chat-header {
  display: flex;
  justify-content: center;
  padding: 16px;
  margin: 16px 16px 0;
  border-radius: 12px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.chat-header .title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.chat-content {
  flex-grow: 1;
  margin: 16px;
  border-radius: 12px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.chat-content-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-content-video-none {
  color: #8c8c8c;
  font-size: 16px;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.chat-content-video-none:before {
  content: "";
  width: 64px;
  height: 64px;
  background-color: #f0f0f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-drawer-account,
.settings-drawer-details {
  border-radius: 12px;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
  overflow: hidden;
}

.settings-drawer-account:hover,
.settings-drawer-details:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

/* Ant Design overrides and custom classes */
:deep(.ant-upload) {
  border-radius: 50%;
  overflow: hidden;
  transition: all 0.3s;
}

:deep(.ant-upload:hover) {
  transform: scale(1.05);
}

:deep(.ant-avatar) {
  border: 2px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

:deep(.ant-btn) {
  border-radius: 8px;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.02);
}

:deep(.ant-input) {
  border-radius: 8px;
}

:deep(.ant-drawer-content) {
  border-radius: 16px 0 0 16px;
  overflow: hidden;
}
</style>
