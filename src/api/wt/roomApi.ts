import axiosInstance from "../../utils/axios";

export const createRoom = () => {
  return axiosInstance.post(`/room/create`); 
}

export const joinRoom = (roomCode: string) => {
  return axiosInstance.post(`/room/join?roomCode=${roomCode}`);
}