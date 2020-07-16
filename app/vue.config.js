// vue.config.js
module.exports = {
  devServer: {
    proxy: {
      '^/api': {
        target: `http://localhost:${process.env.SOCKET_IO_SERVER_PORT || 9005}`,
        secure: false,
        changeOrigin: true,
      },
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
