module.exports = {
  apps: [
    {
      name: "ssd",
      script: "index.js",
      env: {
        PROFILE: "replication",
        TZ: "utc",
      },
    },
    {
      name: "ssds",
      script: "notificationClusters.js",
      env: {
        PROFILE: "replication",
        TZ: "utc",
        stand: "asd",
      },
    },
    {
      name: "ssdo",
      script: "schedule.js",
      env: { PROFILE: "replication", TZ: "utc", stand: "asd" },
    },
  ],
};
