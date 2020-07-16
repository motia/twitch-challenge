import Axios from 'axios';
import store from './store';
import auth from './auth';

const axios = Axios.create({
  baseURL: 'https://api.twitch.tv/helix/',
  headers: {
    'Client-Id': process.env.VUE_APP_TWITCH_CLIENT_ID,
  },
});

axios.interceptors.request.use((config) => {
  if (store.state.userConfig.twitchOAuthToken) {
    // eslint-disable-next-line no-param-reassign
    config.headers.Authorization = `Bearer ${store.state.userConfig.twitchOAuthToken}`;
  }
  return config;
});

axios.interceptors.response.use((response) => {
  if (response && response.status === 401) {
    auth.logout();
  }
  return response;
});

const loadTwitchItem = async (resource, params) => {
  const response = await axios.get(resource, { params });

  return response.data.data[0] || null;
};

export default { loadTwitchItem };
