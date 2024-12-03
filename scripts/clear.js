require("../db")();
const mongoose = require("mongoose");

try {
  const connectionStates = mongoose.Connection.STATES;
  const readyState = mongoose.connection.readyState;
  const drop = () => {
    mongoose.connection.db.dropDatabase(() => console.log("cleared!"));
  };
  if (connectionStates[readyState] === "connected") {
    drop();
  } else {
    mongoose.connection.once("connected", drop);
  }
} catch (error) {
  console.log("error", error);
}
