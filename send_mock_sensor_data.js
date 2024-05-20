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

ws.on("open", async () => {
  await extractImages();
  sendImages();
});

ws.on("error", function error(err) {
  console.error("WebSocket error:", err);
});

process.on("SIGINT", () => {
  child_process.execSync("node on_server_shutdown.js");
  process.exit();
});
