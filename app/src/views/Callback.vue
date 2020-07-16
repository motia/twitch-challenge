<template>
  <div>Authentication failed</div>
</template>

<script>
import auth from '../auth';

export default {
  async beforeRouteEnter(to, from, next) {
    if (!to.query.code) {
      return next();
    }

    try {
      await auth.obtainAccessToken(to.query);
    } catch (e) {
      console.error(e);
      return next('/');
    }
    return next('/stream');
  },

};
</script>
