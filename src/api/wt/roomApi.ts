import axiosInstance from "../../utils/axios";

// 创建房间
export const createRoom = () => {
  return axiosInstance.post(`/room/create`);
}

// 加入房间
export const joinRoom = (roomCode: string) => {
  return axiosInstance.post(`/room/join?roomCode=${roomCode}`);
}

// 获取房间内用户
export const getUserDetailsInRoom = (roomCode: string) => {
  return axiosInstance.get(`/room/get-room-user?roomCode=${roomCode}`);
}