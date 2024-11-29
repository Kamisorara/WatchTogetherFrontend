import axiosInstance from "../../utils/axios";

// 登录
export const login = (username: string, password: string) => {
  return axiosInstance.post(`/api/sys/login?username=${username}&password=${password}`);
}

// 注册
export const register = (username: string, password: string, passwordRepeat: string, email: string) => {
  return axiosInstance.post(`/api/sys/register?username=${username}&password=${password}&passwordRepeat=${passwordRepeat}&email=${email}`);
}

// 根据Token获取用户信息
export const getUserInfoFromToken = () => {
  return axiosInstance.get(`/api/sys/user-info`);
}

// 更新用户基本信息
export const updateUserDetailInfo = (userPhone: string, userSex: string) => {
  return axiosInstance.post(`/api/sys/update-userDetailInfo?userPhone=${userPhone}&userSex=${userSex}`);
}