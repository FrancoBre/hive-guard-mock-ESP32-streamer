const fs = require("fs");
const ffmpeg = require("ffmpeg");
const sharp = require("sharp");
const WebSocket = require("ws");
const pth = require("path");
const child_process = require("child_process");

const ws = new WebSocket("ws://localhost:8001");

const videoDir = "./video";
const firstVideoFile = fs.readdirSync(videoDir).find((file) =>
  pth.extname(file) === ".mp4"
);
const path = pth.join(videoDir, firstVideoFile);
const outputTo = "images";
const fps = 30;

let images = [];

const extractImages = () => {
  return new Promise((resolve, reject) => {
    try {
      new ffmpeg(path, function (err, video) {
        if (!err) {
          video.fnExtractFrameToJPG(outputTo, {
            every_n_frames: 1, // Extract every frame
            file_name: "image_%t_%s",
          }, function (error, files) {
            if (error) {
              reject(error);
            } else {
              images = files;
              resolve();
            }
          });
        } else {
          reject(err);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
};

const sendImages = () => {
  let index = 0;
  setInterval(() => {
    if (index >= images.length) {
      index = 0; // Reset index to start
    }
    const file = images[index];
    const data = fs.readFileSync(file);
    ws.send(data);
    index++;
  }, 1000 / fps);
};

const sendTemperatureAndHumidity = () => {
  setInterval(() => {
    const sensorData = {
      sensorId: "mockSensorId", // Replace with actual sensor ID if available
      timestamp: new Date(),
      temp: (Math.random() * 10 + 20).toFixed(2), // Random temperature between 20 and 30
      hum: (Math.random() * 20 + 60).toFixed(2), // Random humidity between 60 and 80
      co: Math.random().toFixed(2), // Random CO value
      lpg: Math.random().toFixed(2), // Random LPG value
      smoke: Math.random().toFixed(2), // Random smoke value
    };

    var temp = (Math.random() * 10 + 20).toFixed(2);
    var hum = (Math.random() * 20 + 60).toFixed(2);

    let output = "temp=" + temp + ",hum=" + hum +
      ",light=12;state:ON_BOARD_LED_1=0";

    ws.send(output);
  }, 1000);
};

ws.on("open", async () => {
  await extractImages();
  sendImages();
  sendTemperatureAndHumidity();
});

ws.on("error", function error(err) {
  console.error("WebSocket error:", err);
});

process.on("SIGINT", () => {
  child_process.execSync("node on_server_shutdown.js");
  process.exit();
});
