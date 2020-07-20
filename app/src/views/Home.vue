<template>
  <section class="section">
    <div class="columns">
      <div class="column is-6 is-offset-3">
        <div class="card login-card">
          <!-- <div class="card-header">
            <span class="card-header-title">
              Login with Twitch
            </span>
          </div> -->

          <form
            class="card-content has-text-centered"
            @submit.prevent="attemptLogin"
          >
            <div class="message">
              Enter your favourite twitch channel and click Login
            </div>
            <div class="is-inline-block">
              <div class="field has-addons">
                <p class="control">
                  <a class="button is-static">
                    twitch/
                  </a>
                </p>
                <div class="control is-expanded">
                  <input v-model="channel" class="input" required>
                </div>
              </div>
            </div>
            <div style="margin-top: 16px;">
              <button class="button is-rounded is-primary" type="submit">
                <template v-if="loggedIn">
                  Join stream
                </template>
                <template v-else>
                  Login with Twitch
                </template>
              </button>
            </div>
            <div v-if="loggedIn" style="margin-top: 16px;">
              <button class="button is-small is-info is-inverted is-text"
                type="button"
                @click="logout"
              >
                Logout
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import axios from 'axios';
import auth from '../auth';
// Source: https://www.thepolyglotdeveloper.com/2015/03/create-a-random-nonce-string-using-javascript/
function nonce(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export default {
  name: 'HomePage',

  data() {
    return {
      channel: this.$store.state.userConfig.favoriteStreamerUserName || '',
    };
  },

  computed: {
    loggedIn() {
      return !!this.$store.state.userConfig.twitchOAuthToken;
    },
  },

  methods: {
    logout() {
      auth.logout();
      axios.delete('/api/subscription');
    },
    attemptLogin() {
      if (!this.channel) {
        throw new Error('Channel should not be empty');
      }

      // keep date for posterior state
      this.$store.commit('updateUserConfig', {
        favoriteStreamerUserName: this.channel,
      });

      if (this.loggedIn) {
        this.$router.push('/stream');
        return;
      }

      const redirectURI = `${window.location.protocol}//${window.location.host}/callback`;
      const scope = [
        'user:read:email',
        'bits:read',
        'chat:edit',
        'chat:read',
        'whispers:edit',
        'whispers:read',
      ].join('+');

      sessionStorage.twitchOAuthState = nonce(15);

      window.location = `${'https://api.twitch.tv/kraken/oauth2/authorize'
        + '?response_type=code'
        + '&client_id='}${process.env.VUE_APP_TWITCH_CLIENT_ID
      }&redirect_uri=${redirectURI
      }&state=${sessionStorage.twitchOAuthState
      }&scope=${scope}`;
    },
  },
};
</script>

<style>
.login-card {
  margin: auto;
  max-width: 420px;
}
</style>
