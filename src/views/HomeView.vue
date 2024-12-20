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
            <PlusCircleOutlined :spin="false" style="font-size: 30px;" />
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
            <SearchOutlined :spin="false" style="font-size: 30px;" />
          </a-popover>
        </a-popover>
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
            <AudioSync class="info-icon" :stomp-clinet="(stompClient as Client)" :room-code="roomCode" />
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
        <!-- <video class="chat-content-video" controls
          src="D:\Data\code\web_2024\WatchTogether\FormalProject\WatchTogetherFrontend\public\mv.mp4" muted>
          您的浏览器不支持视频播放。
        </video> -->
        <div v-if="!stompClient" class="chat-content-video-none">WebSocket未连接</div>
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
import { AudioOutlined, PhoneOutlined, SettingOutlined, PlusCircleOutlined, CheckOutlined, UserOutlined, SearchOutlined, LoadingOutlined, PlusOutlined } from "@ant-design/icons-vue"
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

.settings-drawer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.settings-drawer-account {
  cursor: auto;
}

.settings-drawer-details {
  margin-top: 20px;
  cursor: auto;
}
</style>
