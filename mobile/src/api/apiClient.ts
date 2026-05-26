import axios from 'axios';
import { Platform } from 'react-native';
import { tokenStorage } from '../utils/tokenStorage';

// WHY: Dynamically resolves the backend API endpoint. We prioritize Expo's public env var,
// fallback to a fixed production Render server in release builds, and fallback to local emulators in development.
const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (__DEV__) {
    // WHY: Android emulator connects to host via 10.0.2.2. iOS simulator uses localhost.
    return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
  }

  // WHY: Fallback production Render link, ensuring we avoid localhost in builds.
  return 'https://tercas-fc-api.onrender.com';
};

const BASE_URL = getBaseUrl();

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
// WHY: Automatically fetches the access token from hybrid tokenStorage and appends it to headers.
apiClient.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor
// WHY: Dual-token strategy handler. If access token is expired (401), it halts calls,
// triggers the refresh API in the background using the long-lived refresh token,
// saves the new tokens, and retries the original request seamlessly.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await tokenStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token found');
        }

        // Call the refresh endpoint directly using pure Axios to avoid looping interceptors.
        const response = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          },
        );

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          response.data;

        await tokenStorage.setItem('accessToken', newAccessToken);
        await tokenStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // WHY: If refresh token has also expired or is invalid, clear credentials immediately.
        await tokenStorage.removeItem('accessToken');
        await tokenStorage.removeItem('refreshToken');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
export { BASE_URL };
