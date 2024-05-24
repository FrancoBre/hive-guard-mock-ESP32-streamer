const fs = require("fs");
const ffmpeg = require("ffmpeg");
const sharp = require("sharp");
const WebSocket = require("ws");
const pth = require("path");
const child_process = require("child_process");
const events = require('events');
const net = require('net');
const eventEmitter = new events.EventEmitter();
const videoDir = "./video";
const firstVideoFile = fs.readdirSync(videoDir).find((file) => pth.extname(file) === ".mp4");
const path = pth.join(videoDir, firstVideoFile);
const outputTo = "images";
const fps = 30;

let ws;

var clientOfMasterServerIP = undefined;

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
            timestamp: new Date(), temp: (Math.random() * 10 + 20).toFixed(2), // Random temperature between 20 and 30
            hum: (Math.random() * 20 + 60).toFixed(2), // Random humidity between 60 and 80
            co: Math.random().toFixed(2), // Random CO value
            lpg: Math.random().toFixed(2), // Random LPG value
            smoke: Math.random().toFixed(2), // Random smoke value
        };

        var temp = (Math.random() * 10 + 20).toFixed(2);
        var hum = (Math.random() * 20 + 60).toFixed(2);

        let output = "temp=" + temp + ",hum=" + hum + ",light=12;state:ON_BOARD_LED_1=0";

        ws.send(output);
    }, 1000);
};

function sendSensorRegistrationData() {
    const randomId = Math.floor(Math.random() * 1000000);

    const sensorData = {
        [`esp32cam${randomId}`]: {
            "port": 8001,
            "saveSensorData": true,
            "detectObjects": true,
            "class": "cam-instance",
            "display": `Cam #${randomId}`,
            "commands": [{
                "id": "ON_BOARD_LED", "name": "Camera flashlight", "class": "led-light", "state": 0
            }]
        }
    };

    ws.send(JSON.stringify(sensorData));
}

// discovery of master server part

// part 1: i will send a request to every ip in the subnet to check if there is a master server
//  but right here were just getting the ip from the mf docker compose process of creating all of
//  the containers and the network
//  or we're hardcoding it, the answer will surprise you
function hitMasterIpSoItHitsBack(ip) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();

        client.connect(8000, ip, () => {
            client.write('GET /isMaster HTTP/1.1\r\n');
            client.write(`Host: ${ip}\r\n`);
            client.write('Connection: close\r\n\r\n');
        });

        client.on('data', (data) => {
            console.log('Received: ' + data);
            client.destroy(); // kill client after server's response
        });

        client.on('close', () => {
            resolve();
        });

        client.on('error', (err) => {
            reject(err);
        });
    });
}

hitMasterIpSoItHitsBack().then(r => console.log(r)).catch(e => console.error(e));

// part 2: omfg i hit the master server, and now it will send me a separate request with
//  the ip of the 'client', which is the one that receives the sensor data, and the one
//  i have to create a websocket connection with

const express = require('express');
const app = express();

app.use(express.json());

app.post('/iAmMaster', (req, res) => {
    // TODO del lado del esp32 va a haber que hacer que deserialice el json
    clientOfMasterServerIp = req.body.clientIp;

    console.log(`Master server IP saved successfully: ${clientOfMasterServerIp}`);
    console.log('Ready for websocket connection');

    // Emit an event when clientOfMasterServerIp is defined
    eventEmitter.emit('clientIpDefined', clientOfMasterServerIp);

    res.sendStatus(200);
});

app.listen(9000, () => {
    console.log('Server is listening on port 9000');
});

// --------------------------------------------
// the real mf sending of the mock sensor data

eventEmitter.on('clientIpDefined', () => {
    ws = new WebSocket(`ws://${clientOfMasterServerIp}:8001`);

    ws.on("open", async () => {

        // TODO esto está pendiente, primero tenemos que ver cómo mierda va a encontrar
        //  el master server el esp32streamer
        // sendSensorRegistrationData();

        await extractImages();
        sendImages();
        sendTemperatureAndHumidity();
    });

    ws.on("error", function error(err) {
        console.error("WebSocket error:", err);
    });
});

process.on("SIGINT", () => {
    child_process.execSync("node on_server_shutdown.js");
    process.exit();
});
