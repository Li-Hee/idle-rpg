module.exports = {
  apps: [{
    name: 'idle-chronicles',
    script: 'server/src/index.js',
    env: {
      PORT: 3001,
      JWT_SECRET: 'bd0bcb36c755d7bbdeacdf895a9f2df0972f81b799ab8287be164e3226270964'
    }
  }]
};
