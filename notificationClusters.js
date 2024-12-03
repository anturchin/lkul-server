/* eslint-disable no-constant-condition */
const cluster = require("cluster");
const os = require("os");
const schedule = require("node-schedule");
require("./db")();
const {
  sendMetNotifications,
  sending,
  sendingEmailAboutMetBlocking,
  sendDocsOnEmail,
} = require("./controllers/NotificationClasterController");
const moment = require("moment");

const workers = {};
const workerBusyFlags = {};

if (cluster.isMaster) {
  const cpus = os.cpus();
  for (let i = 0; i < cpus.length - 1; i++) {
    const worker = cluster.fork();
    console.log(worker.process.pid);
    workers[worker.process.pid] = worker;
    workerBusyFlags[worker.process.pid] = false;
    worker.on("error", (err) => {
      console.error(err);
    });
    worker.on("message", (data) => {
      if (workerBusyFlags[data]) {
        console.log("Send in master to false ", data);
        workerBusyFlags[data] = false;
      }
    });
  }

  const workersBusy = async (cn, cons_UID, type, data) => {
    loop: while (true) {
      for (const i in workerBusyFlags) {
        if (!workerBusyFlags[i]) {
          console.log("UPDATE TO TRUE ", i);
          workers[i].send({
            type,
            cn: { ...cn, cons_UIDs: [] },
            cons_UID,
            ...data,
          });
          workerBusyFlags[i] = true;
          break loop;
        }
      }
      await new Promise((resolve, _reject) => {
        setImmediate(() => {
          resolve();
        });
      });
    }
  };

  schedule.scheduleJob("0 0 6 * * *", sendMetNotifications(workersBusy));
  //   const today = moment();
  //   schedule.scheduleJob(
  //     `${today.minutes() + 1} ${today.hour()} ${today.format("D")} * *`,
  //     sendMetNotifications(workersBusy)
  //   );
  sendDocsOnEmail(workersBusy);
}

if (cluster.isWorker) {
  process.on("message", async (data) => {
    const { cons_UID, emailCurrentMonthYear, metBLockingDate, type, cn } = data;
    console.log("Start in worker ", cons_UID);
    try {
      if (type) {
        await sending(cons_UID, cn);
      } else {
        await sendingEmailAboutMetBlocking(
          cons_UID,
          emailCurrentMonthYear,
          metBLockingDate
        );
      }
    } catch (err) {
      console.error(err);
    }
    process.send(process.pid);
  });
}
