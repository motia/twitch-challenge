<template>
  <section class="section">
    <!-- Display Error in loading page -->
    <div class="columns" v-if="error">
      <div class="column is-6 is-offset-3">
          <div class="card error-indicator">
            <div class="card-content">
              <div class="message is-warning">
                <p>{{ error }}</p>
              </div>

              <div>
                <router-link to="/" class="button is-info is-rounded">
                  Choose favourite channel
                </router-link>
              </div>

            </div>
        </div>
      </div>
    </div>

    <!-- Page content -->
    <div class="container" v-else>
      <!-- Display stream when channel is loaded -->
      <div v-if="channel" class="columns">
        <div class="column is-8">
          <iframe
            v-if="enableEmbeds"
            :style="{height: '500px', width: '100%'}"
            :id="channel.login"
            :src="`https://player.twitch.tv/?channel=${channel.login}&parent=localhost&muted=false`"
            height="700"
            width="800"
            frameborder="0"
            scrolling="no"
            allowfullscreen="true"
          />
        </div>
        <div class="column is-4">
          <iframe
            v-if="enableEmbeds"
            :style="{height: '500px', width: '100%'}"
            :id="channel.login"
            :src="`https://www.twitch.tv/embed/${channel.login}/chat?parent=localhost`"
            frameborder="0"
            scrolling="no"
            height="400"
            width="350"
          />
        </div>
      </div>
      <LoadingIndicator  v-else />
    </div>
  </section>
</template>

<script>
import axios from 'axios';
import io from 'socket.io-client';
import LoadingIndicator from '../components/LoadingIndictor.vue';

const parseTokenFromRedirect = (hash) => {
  if (!hash.match(/access_token=(\w+)/)) {
    return;
  }

  // assert nonce stored in session
  if (!sessionStorage.twitchOAuthState) {
    throw new Error('Token mismatch');
  }

  // check login token
  const hashMatch = (expr) => {
    const match = hash.match(expr);
    return match ? match[1] : null;
  };
  const state = hashMatch(/state=(\w+)/);
  // assert nonce of request is same of session
  if (`${sessionStorage.twitchOAuthState}` === `${state}`) {
    sessionStorage.twitchOAuthToken = hashMatch(/access_token=(\w+)/);
  } else {
    sessionStorage.twitchOAuthToken = null;
  }
};

export default {
  components: {
    LoadingIndicator,
  },
  beforeRouteEnter(to, from, next) {
    if (!to.hash) {
      return next();
    }

    try {
      console.log(window.location.href);
      parseTokenFromRedirect(to.hash);
    } catch (e) {
      console.error(e);
    }
    return next(to.path);
  },

  data() {
    return {
      enableEmbeds: false, // for debug only
      loggedIn: !!sessionStorage.twitchOAuthToken,
      channelSlug: sessionStorage.twitchFavouriteChannel,
      channel: null,
      error: null,
      messages: [],
    };
  },

  async created() {
    if (!this.channelSlug) {
      this.error = 'No channel is selected';
      return;
    }
    try {
      this.channel = await this.loadChannelData();
    } catch (e) {
      this.error = 'Channel information could not be loaded';
      console.error('Channel information could not be loaded');
      console.error(e);
    }
    if (!this.channel && !this.error) {
      this.error = 'Channel not found';
    }

    this.registerSocketIo();
  },

  methods: {
    async loadChannelData() {
      const response = await axios.get('https://api.twitch.tv/helix/users', {
        params: {
          login: this.channelSlug,
        },
        headers: {
          Authorization: `Bearer ${sessionStorage.twitchOAuthToken}`,
          'Client-Id': process.env.VUE_APP_TWITCH_CLIENT_ID,
        },
      });

      return response.data.data[0] || null;
    },
    registerSocketIo() {
      const socket = io({
        autoConnect: true,
      });

      socket.on('connect', () => {
        socket.emit('twitch_subscribe', this.channel.id);
      });

      socket.on('twitch_event', (message) => {
        this.messages.push(JSON.parse(message));
      });

      this.$on('hook:beforeDestroy', () => socket.disconnect);
    },
  },
};
</script>

<style>
.error-indicator {
  max-width: 420px;
  margin: auto;
  text-align: center;
}
</style>
