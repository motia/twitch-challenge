import Vue from 'vue';
import VueRouter from 'vue-router';
import Home from '../views/Home.vue';
import auth from '../auth';

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/callback',
    name: 'Callback',
    component: () => import(/* webpackChunkName: "stream" */ '../views/Callback.vue'),
  },
  {
    path: '/stream',
    name: 'Stream',
    component: () => import(/* webpackChunkName: "stream" */ '../views/Stream.vue'),
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

router.beforeEach(async (to, from, next) => {
  if (to.path.includes('callback')) {
    return next();
  }

  auth.refreshAuth();

  return next();
});

export default router;
