import axiosInstance from "../../utils/axios";

// 登录
export const login = (username: string, password: string) => {
  return axiosInstance.post(`/api/sys/login?username=${username}&password=${password}`);
}

// 注册
export const register = (username: string, password: string, passwordRepeat: string, email: string) => {
  return axiosInstance.post(`/api/sys/register?username=${username}&password=${password}&passwordRepeat=${passwordRepeat}&email=${email}`);
}