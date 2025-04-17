import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestHeaders } from "axios";
import { REMOTE_SERVER_IP, LOCAL_SERVER_IP } from "./ipAddress";

// 创建 Axios 实例
const axiosInstance: AxiosInstance = axios.create({
  baseURL: `http://${LOCAL_SERVER_IP}:8081`,
  timeout: 5000,
});

// 请求拦截器：可以在请求头添加 token 等认证信息
axiosInstance.interceptors.request.use(
  (config: any) => {
    // 登录和注册等操作不需要进行携带token
    if (config.url.includes('/api/sys/login') || config.url.includes("/api/sys/register")) {
      delete config.headers['token'];
    } else {
      const token = localStorage.getItem('token'); // 从 localStorage 获取 token

      // 如果 headers 为 undefined，初始化为一个空对象
      if (!config.headers) {
        config.headers = {} as AxiosRequestHeaders;
      }

      // 如果 token 存在，添加到 headers 中
      if (token) {
        (config.headers as AxiosRequestHeaders)['token'] = token;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);
// 响应拦截器：处理响应结果，统一处理错误
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;  // 只返回 data 部分
  },
  (error: AxiosError) => {
    // 统一错误处理
    console.error("API 请求失败:", error);
    if (error.response) {
      // 可以根据错误码做更精细的处理，例如跳转到登录页面
      switch (error.response.status) {
        case 400:
          console.log("发生错误");
          // 跳转到登录页面的逻辑
          break;
        case 500:
          console.log("服务器错误");
          break;
        default:
          console.log("其他错误");
          break;
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
