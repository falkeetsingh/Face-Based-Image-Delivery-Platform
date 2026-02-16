const autocannon = require("autocannon");

const port = process.env.PORT || 5000;
const url = process.env.LOAD_URL || `http://localhost:${port}/health`;
const duration = Number(process.env.LOAD_DURATION || 20);
const connections = Number(process.env.LOAD_CONNECTIONS || 25);
const pipelining = Number(process.env.LOAD_PIPELINING || 1);

const instance = autocannon(
  {
    url,
    duration,
    connections,
    pipelining
  },
  (err, result) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log("Load test complete");
    console.log(result);
  }
);

autocannon.track(instance, { renderProgressBar: true });
