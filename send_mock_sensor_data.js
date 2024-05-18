const WebSocket = require('ws');

// Create a WebSocket connection to your server
const ws = new WebSocket('ws://localhost:8999');

ws.on('message', function open() {
  // Define the function to send mock sensor data
  const sendMockSensorData = () => {
    // Generar un valor de temperatura aleatorio entre 20 y 30
    const randomTemperature = (Math.random() * (30 - 20) + 20).toFixed(2);
    const randomHumidity = (Math.random() * (60 - 20) + 20).toFixed(2);

    // Mock sensor data
    const mockSensorData = "temp=" + randomTemperature + ",hum=" + randomHumidity + ",light=12;state:ON_BOARD_LED_1=1";
    /*const mockSensorData = {
      operation: 'function',
      command: {
        recipient: 'sensorId1',
        message: {
          key: 'temp',
          value: randomTemperature
        }
      }
    };*/

    // Send the mock sensor data to the server
    ws.send(JSON.stringify(mockSensorData));
  };

  // Call the function every 2 seconds
  setInterval(sendMockSensorData, 2000);
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});
