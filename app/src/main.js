import Vue from 'vue';
import App from './App.vue';
import router from './router';
import auth from './auth';
import store from './store';

Vue.config.productionTip = false;

setInterval(() => {
  auth.refreshAuth();
}, 30 * 60 * 1000);

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#app');
