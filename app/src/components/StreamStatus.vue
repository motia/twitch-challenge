<template>
  <div class="columns">
    <div class="column">
      <div v-if="game" class="title">
        {{ game ? game.name : "Offline" }}
      </div>
      <div class="subtitle">
        <span :title="channel.login" v-text="channel.login" />
        <template v-if="stream">
          <span> / </span>
          <span :title="channel.title" v-text="stream.title" />
        </template>
      </div>
    </div>
    <div class="column has-text-right-tablet">
      <div>
        {{ uptime }}
      </div>
      <div v-if="stream">
        <header>Viewers</header>
        {{ stream.viewer_count.toLocaleString() }}
      </div>
    </div>
  </div>
</template>

<script>
function getUptime(date) {
  const duration = Date.now() - date;

  let hours = ((duration / (1000 * 60 * 60)) % 24).toFixed();
  let minutes = ((duration / (1000 * 60)) % 60).toFixed();
  let seconds = ((duration / 1000) % 60).toFixed();

  hours = hours < 10 ? `0${hours}` : hours;
  minutes = minutes < 10 ? `0${minutes}` : minutes;
  seconds = seconds < 10 ? `0${seconds}` : seconds;

  return `${hours}:${minutes}:${seconds}`;
}

export default {
  props: {
    channel: {
      type: Object,
      required: true,
    },
    stream: {
      type: Object,
      default: null,
    },
    game: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      uptime: null,
    };
  },
  watch: {
    stream(newValue, oldValue) {
      if (!(newValue && oldValue && newValue.created_at === oldValue.created_at)) {
        this.updateUptime();
      }
    },
  },
  mounted() {
    setInterval(() => {
      this.updateUptime();
    }, 1000);
    this.updateUptime();
  },
  methods: {
    updateUptime() {
      let uptime = null;
      if (this.stream) {
        uptime = getUptime(Date.parse(this.stream.started_at));
      }
      this.uptime = uptime;
    },
  },
};
</script>
