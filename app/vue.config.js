// vue.config.js
module.exports = {
  devServer: {
    proxy: {
      '^/socket.io': {
        target: {
          host: 'localhost',
          port: process.env.SOCKET_IO_SERVER_PORT || 9000,
          protocol: 'ws',
        },
        ws: true,
        changeOrigin: true,
      },
    },
  },
};
