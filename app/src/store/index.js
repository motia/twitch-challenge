import Vuex from 'vuex';
import Vue from 'vue';

Vue.use(Vuex);

const clearVar = (userConfig) => {
  const returns = {};
  Object.keys(userConfig).forEach((x) => {
    returns[x] = window.localStorage.getItem(x);
    if (!userConfig[x] || userConfig[x] === 'undefined' || userConfig[x] === 'null') {
      returns[x] = null;
      window.localStorage.removeItem(x);
    }
  });

  return returns;
};

const emptyUserConfig = () => ({
  userName: null,
  twitchOAuthToken: null,
  channelSubscriptionId: null,
  channelSubscriptionSecret: null,
  favoriteStreamerUserName: null,
  channelSubscriptionStreamerName: null,
});

export default new Vuex.Store({
  state() {
    const userConfig = emptyUserConfig();
    Object.keys(userConfig).forEach((x) => {
      userConfig[x] = window.localStorage.getItem(x);
      if (!userConfig[x]) {
        userConfig[x] = null;
        window.localStorage.removeItem(x);
      }
    });

    return { userConfig: clearVar(userConfig) };
  },

  mutations: {
    removeUserConfig(state) {
      state.userConfig = emptyUserConfig();

      Object.keys(state.userConfig).forEach((x) => {
        window.localStorage.removeItem(x);
      });
    },
    updateUserConfig(state, config) {
      Object.assign(state.userConfig, config);
      Object.keys(config).forEach((x) => {
        if (config[x]) {
          window.localStorage.setItem(x, config[x]);
        } else {
          window.localStorage.removeItem(x);
        }
      });
    },
  },
});
