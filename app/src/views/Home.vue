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
            @submit.prevent="attemptLogin"
            class="card-content has-text-centered"
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
                <input class="input" v-model="channel" required />
              </div>
            </div>
            <div style="margin-top: 8px;">
              <button class="button is-primary is-rounded">
                Login with Twitch
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
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
      channel: sessionStorage.twitchFavouriteChannel || '' || 'benjyfishy',
    };
  },

  methods: {
    attemptLogin() {
      if (!this.channel) {
        throw new Error('Channel should not be empty');
      }

      const redirectURI = `${window.location.protocol}//${window.location.host}/stream`;
      const scope = [
        // 'user:read:email',
        // 'bits:read',
        // 'chat:edit',
        // 'chat:read',
        // 'whispers:edit',
        // 'whispers:read',
      ].join('+');

      sessionStorage.twitchFavouriteChannel = this.channel;
      sessionStorage.twitchOAuthState = nonce(15);

      window.location = `${'https://api.twitch.tv/kraken/oauth2/authorize'
        + '?response_type=token'
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
