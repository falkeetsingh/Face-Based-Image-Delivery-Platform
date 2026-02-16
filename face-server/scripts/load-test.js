const autocannon = require("autocannon");

const port = process.env.PORT || 4000;
const url = process.env.LOAD_URL || `http://localhost:${port}/api/events/recognize`;
const duration = Number(process.env.LOAD_DURATION || 120);
const connections = Number(process.env.LOAD_CONNECTIONS || 20);
const pipelining = Number(process.env.LOAD_PIPELINING || 1);

const defaultEventId = "001";
const defaultImageUrls = [
  "https://res.cloudinary.com/dzfpcdvlp/image/upload/v1769241176/events/6973a44aec247ebbe8f75a80/stxbwv0sfqrnsnubjfb1.jpg"
];

const eventId = process.env.LOAD_EVENT_ID || defaultEventId;
const imageUrls = (process.env.LOAD_IMAGE_URLS
  ? process.env.LOAD_IMAGE_URLS.split(",").map((url) => url.trim())
  : defaultImageUrls
).filter(Boolean);

const body = JSON.stringify({ eventId, imageUrls });

const instance = autocannon(
  {
    url,
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body,
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
