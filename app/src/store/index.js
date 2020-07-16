import Vuex from 'vuex';
import Vue from 'vue';

Vue.use(Vuex);

const emptyUserConfig = () => ({
  userName: null,
  twitchOAuthToken: null,
  channelSubscriptionId: null,
  channelSubscriptionSecret: null,
  favoriteStreamerUserName: null,
});

export default new Vuex.Store({
  state() {
    const userConfig = emptyUserConfig();
    Object.keys(userConfig).forEach((x) => {
      userConfig[x] = window.localStorage.getItem(x);
      if (!userConfig[x] || userConfig[x] === 'undefined' || userConfig[x] === 'null') {
        userConfig[x] = null;
        window.localStorage.removeItem(x);
      }
    });

    return { userConfig };
  },

  mutations: {
    removeUserConfig(state) {
      state.userConfig = emptyUserConfig();

      Object.keys(state.userConfig).forEach((x) => {
        if (state.userConfig[x]) {
          window.localStorage.setItem(x, state.userConfig[x]);
        } else {
          window.localStorage.removeItem(x);
        }
      });
    },
    updateUserConfig(state, config) {
      Object.assign(state.userConfig, config);

      Object.keys(state.userConfig).forEach((x) => {
        if (state.userConfig[x]) {
          window.localStorage.setItem(x, config[x]);
        } else {
          window.localStorage.removeItem(x);
        }
      });
    },
  },
});
