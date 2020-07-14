// vue.config.js
module.exports = {
  devServer: {
    proxy: {
      '^/socket.io': {
        target: 9000,
        ws: true,
        changeOrigin: true,
      },
    },
  },
};
