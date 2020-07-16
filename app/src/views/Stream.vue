<template>
  <section class="section">
    <!-- Display Error in loading page -->
    <div class="columns" v-if="displayedError">
      <div class="column is-6 is-offset-3">
          <div class="card error-indicator">
            <div class="card-content">
              <div class="message is-warning">
                <p>{{ displayedError.error }}</p>
              </div>

              <div>
                <router-link to="/" class="button is-info is-rounded">
                {{ displayedError.action }}
                </router-link>
              </div>

            </div>
        </div>
      </div>
    </div>

    <!-- Page content -->
    <div class="container" v-else>
      <!-- Display stream when channel is loaded -->
      <div v-if="channel" class="columns is-multiline">
        <div class="column is-12">
          <stream-status v-bind="{channel, stream, game}" />
        </div>
        <div class="column is-6">
          <iframe
            v-if="enableEmbeds"
            :style="{height: '500px', width: '100%'}"
            :id="channel.login"
            :src="`https://player.twitch.tv/?channel=${channel.login}&parent=${hostname}&muted=false`"
            height="700"
            width="800"
            frameborder="0"
            scrolling="no"
            allowfullscreen="true"
          />
        </div>
        <div class="column is-3">
          <iframe
            v-if="enableEmbeds"
            :style="{height: '500px', width: '100%'}"
            :id="channel.login"
            :src="`https://www.twitch.tv/embed/${channel.login}/chat?parent=${hostname}`"
            frameborder="0"
            scrolling="no"
            height="400"
            width="350"
          />
        </div>

        <div class="column">
          <div class="card">
            <div class="card-header">
              <div class="card-header-title">
                Events
              </div>
            </div>
            <div class="card-content">
              <!-- TODO: Add events here -->
            </div>
          </div>
        </div>
      </div>
      <LoadingIndicator v-else-if="loading" />
    </div>
  </section>
</template>

<script>
import io from 'socket.io-client';
import axios from 'axios';
import LoadingIndicator from '../components/LoadingIndictor.vue';
import StreamStatus from '../components/StreamStatus.vue';
import twitchApi from '../twitchApi';
import auth from '../auth';

export default {
  components: {
    LoadingIndicator,
    StreamStatus,
  },

  data() {
    return {
      enableEmbeds: true, // for debug only
      error: null,
      messages: [],
      channel: null,
      stream: null,
      game: null,
      hostname: window.location.hostname,
      loading: true,
    };
  },

  computed: {
    displayedError() {
      if (!this.loggedIn) {
        return {
          error: 'Unauthenticated',
          action: 'Login',
        };
      }
      if (this.error) {
        return {
          error: this.error,
          action: 'Choose favourite streamer',
        };
      }
      return null;
    },
    loggedIn() {
      return !!this.$store.state.userConfig.twitchOAuthToken;
    },
  },

  created() {
    this.loadData().finally(() => {
      this.loading = false;
    });
  },

  methods: {
    async loadData() {
      const channelSlug = this.$store.state.userConfig.favoriteStreamerUserName;
      if (!channelSlug) {
        this.error = 'No channel is selected';
        return;
      }
      try {
        this.channel = await twitchApi.loadTwitchItem('users', { login: channelSlug });
      } catch (e) {
        this.error = 'Channel information could not be loaded';
        console.error('Channel information could not be loaded');
        console.error(e);
      }

      if (!this.channel) {
        this.error = 'Channel not found';
        return;
      }

      this.loadStreamAndGame();

      try {
        const { data } = await axios.put('api/subscription', {
          favoriteStreamerUserName: this.channel.login,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        this.$store.commit('updateUserConfig', {
          favoriteStreamerUserName: this.channel.login,
          channelSubscriptionId: data.channelSubscriptionId,
          channelSubscriptionSecret: data.channelSubscriptionSecret,
        });
      } catch (e) {
        console.error(e);
        if (e.response) {
          this.error = e.response.data.error;
          if (e.response.status === 401) {
            auth.logout();
          }
        }
      }
      this.registerSocketIo();
    },

    async loadStreamAndGame() {
      this.stream = await twitchApi.loadTwitchItem('streams', {
        user_login: this.channel.login,
      });
      if (this.stream && this.stream.game_id) {
        this.game = await twitchApi.loadTwitchItem('games', {
          id: this.stream.game_id,
        });
      }
    },

    registerSocketIo() {
      const socket = io({
        autoConnect: true,
      });

      socket.on('connect', () => {
        const { channelSubscriptionId, channelSubscriptionSecret } = this.$store.state.userConfig;
        if (!channelSubscriptionId || !channelSubscriptionSecret) {
          console.error('Could not subscribe to channel');
        }

        socket.emit('twitch_subscribe', {
          id: channelSubscriptionId,
          secret: channelSubscriptionSecret,
        });
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
