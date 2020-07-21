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
          <nav class="panel">
            <p class="panel-heading">
              Events
            </p>
            <a class="panel-block"
              :class="{'is-active': i === 1 }"
              v-for="(m, i) in messages"
              :key="i"
            >
              <div class="columns" style="width: 100%;">
                <div class="column">
                  {{ m.text }}
                </div>
                <div class="column is-narrow">
                  {{ m.createdAt.substr(14, 5) }}
                </div>
              </div>
            </a>
          </nav>

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
      socket: null,
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
      this.authenticateSocketIo()
        .then(() => {
          this.registerSocketIo();
        });
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

    async authenticateSocketIo() {
      const {
        channelSubscriptionId,
        channelSubscriptionSecret,
        channelSubscriptionStreamerName,
        favoriteStreamerUserName,
      } = this.$store.state.userConfig;
      if (channelSubscriptionId && channelSubscriptionSecret
        && channelSubscriptionStreamerName === favoriteStreamerUserName
      ) {
        console.log('Socket.io already authenticated');
        return;
      }
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
          channelSubscriptionStreamerName: this.channel.login,
        });
      } catch (e) {
        console.error(e);
        if (e.response) {
          this.error = e.response.data.error;
          if (e.response.status === 401) {
            auth.logout();
          }
        }
        throw e;
      }
    },

    subscriptToChannel() {
      const { channelSubscriptionId, channelSubscriptionSecret } = this.$store.state.userConfig;

      if (!channelSubscriptionId || !channelSubscriptionSecret) {
        return;
      }
      this.socket.emit('twitch_subscribe', {
        id: this.$store.state.userConfig.channelSubscriptionId,
        secret: this.$store.state.userConfig.channelSubscriptionSecret,
      });
    },

    async registerSocketIo() {
      this.socket = io({
        autoConnect: false,
      });

      this.socket.on('connect', () => {
        this.subscriptToChannel();
      });

      this.socket.on('twitch_subscribe_unauthorized', () => {
        this.$store.commit('updateUserConfig', {
          favoriteStreamerUserName: this.channel.login,
          channelSubscriptionId: null,
          channelSubscriptionSecret: null,
          channelSubscriptionStreamerName: null,
        });
        this.authenticateSocketIo()
          .then(() => this.subscriptToChannel());
      });

      this.socket.on('twitch_event', (message) => {
        let text = '';
        debugger;
        if (message.eventType === 'follow') {
          text = `${message.details.followerName} has started following ${this.channel.login}!`;
        } else if (message.eventType === 'stream') {
          text = `The ${message.details.title} stream has ${message.details.action}!`;
        } else if (message.eventType === 'user' && message.details.displayName !== this.channel.displayName) {
          text = `The ${this.channel.display_name} has changed his display name to ${message.details.displayName}!`;
        } else if (message.type === 'user' && message.details.description !== this.channel.description) {
          text = `The ${message.details.displayName} has updated his description!`;
        }
        console.log('New event', text, message);
        if (!text) {
          return;
        }
        if (this.messages.length > 10) {
          this.messages.pop();
        }
        this.messages.unshift({
          ...message,
          text,
        });
      });

      this.socket.connect();
      this.$on('hook:beforeDestroy', () => this.socket.disconnect());
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
