//------------------------------------------------------------
// Accelerometers to control the Servo Motor (needs to be finalized)
//------------------------------------------------------------

var accelButton = document.getElementById('accelPermsButton');
var operatingSystem = ""

if (typeof DeviceMotionEvent.requestPermission === 'function') {
  // iOS 13+
  accelButton.disabled = false
  accelButton.innerHTML = "Get Accelerometer Permissions (iOS : use Bluefy)"
  operatingSystem = "iOS"
}
else if (window.DeviceMotionEvent != undefined) {
  // Android
  accelButton.disabled = false
  accelButton.innerHTML = "Use Accelerometer (Android : use Google Chrome)"
  operatingSystem = "Android"
}
else {
  // Non supported devices
  accelButton.disabled = true
  accelButton.innerHTML = "Use Accelerometer (Not supported on your device)"
  operatingSystem = "other"

}

var rotation_degrees = 0;
var frontToBack_degrees = 0;
var leftToRight_degrees = 0;

var servoAngle = 90;

function getAccel() {
  if (operatingSystem == "iOS") {
    DeviceMotionEvent.requestPermission().then(response => {
      if (response == 'granted') {
        getServoAngle();
      }
    });
  }
  else if (operatingSystem == "Android") {
    getServoAngle();

  }
}

function getServoAngle() {
  // Add a listener to get smartphone orientation 
  // in the alpha-beta-gamma axes (units in degrees)
  window.addEventListener('deviceorientation', (event) => {
    // Expose each orientation angle in a more readable way
    let alpha = event.alpha;    
    let beta = event.beta;
    let gamma = event.gamma;

    // Constrain the alpha angle within a certain range (e.g., 0 to 360 degrees)
    alpha = Math.max(0, Math.min(360, alpha));

    let needle = document.getElementsByClassName("needle")[0]    
    needle.setAttribute('style', "background: red");
    // Calculate the rotation angle for the needle within the defined range
    let rotationAngle = alpha; // Assuming alpha represents the desired rotation angle

    // Update the needle's rotation only if it's within the allowed range
    if (rotationAngle <= 60 || rotationAngle >= 300) {
      needle.style.transform = "rotate(" + rotationAngle + "deg)";
      servoAngle = parseInt(rotationAngle + 90); // Update the servo angle
      handleDirection(servoAngle);
    }
    else {
      let a = parseInt(rotationAngle) - 60;
      let b = parseInt(rotationAngle) - 300;
      let near = plusProcheDeZero(a, b);
      if (near == a){
          needle.style.transform = "rotate(" + 60 + "deg)";
          servoAngle = parseInt(60); // Update the servo angle
          handleDirection(servoAngle);
      }
      if (near == b){
          needle.style.transform = "rotate(" + 300 + "deg)";
          servoAngle = parseInt(300); // Update the servo angle
          handleDirection(servoAngle);
      }
    }
  });
}

function plusProcheDeZero(nombre1, nombre2) {
    // Calculer les valeurs absolues des nombres
    const absNombre1 = Math.abs(nombre1);
    const absNombre2 = Math.abs(nombre2);

    // Vérifier quelle valeur est la plus proche de zéro
    if (absNombre1 < absNombre2) {
        return nombre1;
    } else {
        return nombre2;
    }
}

//------------------------------------------------------------
// Once your done with the Servo Motor, time to go for the Motor !
// Don't forget to change the HTML accordingly.
//------------------------------------------------------------

var motor_speed = 0;


//------------------------------------------------------------
// BLE communication handling
//------------------------------------------------------------

// Get references to UI elements
let connectButton = document.getElementById('connect');
let disconnectButton = document.getElementById('disconnect');
let terminalContainer = document.getElementById('terminal');
let sendForm = document.getElementById('send-form');
let inputField = document.getElementById('input');

var myInterval;

// Connect to the device on Connect button click
connectButton.addEventListener('click', function () {
  connect();
});

// Disconnect from the device on Disconnect button click
disconnectButton.addEventListener('click', function () {
  disconnect();
});

// Handle form submit event
sendForm.addEventListener('submit', function (event) {
  event.preventDefault(); // Prevent form sending
  send(inputField.value); // Send text field contents
  inputField.value = ''; // Zero text field
  inputField.focus(); // Focus on text field
});

// Selected device object cache
let deviceCache = null;

// Launch Bluetooth device picker and connect to the selected device
//Here I use two things to make it easier to read :
//	1. I use p.then when p is a Promise which force operations to follow a certain order (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) and (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then)
//		With the syntax p.then(onFulfilled[, onRejected]);  Here, basically, we want sucesses to continue, otherwise we send an error.
//	2. I use arrow function (https://www.w3schools.com/js/js_arrow_function.asp) where :
//		function (s) { return s.length }
//			simply becomes :
//		s => s.length			(return by default if no {}, just giving parameters (s here) and no name
function connect() {
  return (deviceCache ? Promise.resolve(deviceCache) :
    requestBluetoothDevice()).
  then(device => connectDeviceAndCacheCharacteristic(device)).
  then(characteristic => startNotifications(characteristic)).
  then(myInterval = setInterval(sendingBLEinfo, 100)).
  catch(error => log(error));
}

function sendingBLEinfo() {
  //R = rotation (info on servo motor) ; M = Move (info on motor speed) ; < and > are start and end of packet
  send("<R" + servoAngle + ">" + "<M" + motor_speed + ">", true);
}

function requestBluetoothDevice() {
  log('Requesting bluetooth device...');

  return navigator.bluetooth.requestDevice({
    filters: [{
      services: [0x2365] //[0xFFE0]
    }],
  }).
  then(device => {
    log('"' + device.name + '" bluetooth device selected');
    deviceCache = device;

    // Added line
    deviceCache.addEventListener('gattserverdisconnected',
      handleDisconnection);

    return deviceCache;
  });
}

function handleDisconnection(event) {
  let device = event.target;

  log('"' + device.name +
    '" bluetooth device disconnected, trying to reconnect...');

  connectDeviceAndCacheCharacteristic(device).
  then(characteristic => startNotifications(characteristic)).
  catch(error => log(error));
}


// Characteristic object cache
let characteristicCache = null;

// Connect to the device specified, get service and characteristic
function connectDeviceAndCacheCharacteristic(device) {
  if (device.gatt.connected && characteristicCache) {
    return Promise.resolve(characteristicCache);
  }

  log('Connecting to GATT server...');

  return device.gatt.connect().
  then(server => {
    log('GATT server connected, getting service...');

    return server.getPrimaryService(0x2365);//0x2365
  }).
  then(service => {
    log('Service found, getting characteristic...');

    return service.getCharacteristic(0x0103);//0x0103
  }).
  then(characteristic => {
    log('Characteristic found');
    characteristicCache = characteristic;

    return characteristicCache;
  });
}

// Enable the characteristic changes notification
function startNotifications(characteristic) {
  log('Starting notifications...');

  return characteristic.startNotifications().
  then(() => {
    log('Notifications started');
    // Added line
    characteristic.addEventListener('characteristicvaluechanged',
      handleCharacteristicValueChanged);
  });
}

function disconnect() {
  clearInterval(myInterval); //stop sending data every time
  if (deviceCache) {
    log('Disconnecting from "' + deviceCache.name + '" bluetooth device...');
    deviceCache.removeEventListener('gattserverdisconnected',
      handleDisconnection);

    if (deviceCache.gatt.connected) {
      deviceCache.gatt.disconnect();
      log('"' + deviceCache.name + '" bluetooth device disconnected');
    }
    else {
      log('"' + deviceCache.name +
        '" bluetooth device is already disconnected');
    }
  }

  // Added condition
  if (characteristicCache) {
    characteristicCache.removeEventListener('characteristicvaluechanged',
      handleCharacteristicValueChanged);
    characteristicCache = null;
  }

  deviceCache = null;
}

// Intermediate buffer for incoming data
let readBuffer = '';

// Data receiving
function handleCharacteristicValueChanged(event) {
  let value = new TextDecoder().decode(event.target.value); //We want to decode byte to text

  for (let c of value) { //we receve 20 bytes per 20 bytes, let's make one string until we reach \n
    if (c === '\n') { //Be careful, now we need to add a line break when we use the serial monitor
      let data = readBuffer.trim();
      readBuffer = '';

      if (data) {
        receive(data);
      }
    }
    else {
      readBuffer += c;
    }
  }
}

// Received data handling
function receive(data) {
  //log(data, 'in');
}


function writeToCharacteristic(characteristic, data) {
  characteristic.writeValue(new TextEncoder().encode(data));
}


// Output to terminal
function log(data, type = '') {
  terminalContainer.insertAdjacentHTML('beforeend',
    '<div' + (type ? ' class="' + type + '"' : '') + '>' + data + '</div>');
}

function send(data, logging = true) {
  data = String(data);

  if (!data || !characteristicCache) {
    return;
  }

  data += '\n';

  if (data.length > 20) {
    let chunks = data.match(/(.|[\r\n]){1,20}/g);

    writeToCharacteristic(characteristicCache, chunks[0]);

    for (let i = 1; i < chunks.length; i++) {
      setTimeout(() => {
        writeToCharacteristic(characteristicCache, chunks[i]);
      }, i * 100);
    }
  }
  else {
    writeToCharacteristic(characteristicCache, data);
  }

  if (logging) {
    //log(data, 'out');
  }
}

// Get the speed slider element
const speedSlider = document.getElementById("speedSlider");
const formInput = document.getElementById("input");
let currentSpeed = parseInt(speedSlider.value);

// Event listener to handle slider changes
speedSlider.addEventListener("input", handleSpeedChange);
/*{
  e.preventDefault();
  const speed = parseInt(speedSlider.value);
  // Call a function to handle speed change (e.g., send speed via Bluetooth)
  handleSpeedChange(speed);
});*/


// Event listener to handle slider release
speedSlider.addEventListener("mouseup", function () {
  // Reset slider to minimum value when released
  // Call a function to handle release (e.g., stop sending speed)
  handleSpeedChange("0");
  // Reset slider to minimum value when released
  speedSlider.value = 0;
  slider.value = 0;
});

speedSlider.addEventListener("touchend", function () {
  // Reset slider to minimum value when released
  // Call a function to handle release (e.g., stop sending speed)
  handleSpeedChange("0");
  // Reset slider to minimum value when released
  speedSlider.value = 0;
  slider.value = 0;
});



// Function to handle speed change
function handleSpeedChange(event) {
  let x = servoAngle + ";" + parseInt(currentSpeed);
  // Implement your logic to handle speed change (e.g., send speed via Bluetooth)
  formInput.value = x;
  event.preventDefault(); // Prevent form sending
  send(inputField.value); // Send text field contents
  inputField.value = x; 
  //inputField.focus(); // Focus on text field
  console.log("Speed changed to:", currentSpeed);
}

function handleDirection(angle){
  let x = angle + ";" + parseInt(currentSpeed);
  // Implement your logic to handle speed change (e.g., send speed via Bluetooth)
  formInput.value = x;
  event.preventDefault(); // Prevent form sending
  send(inputField.value); // Send text field contents
  inputField.value = x; 
}

// Get the slider and needle elements
const slider = document.getElementById("speedSlider");
const needle = document.querySelector(".needle");

// Function to handle slider input event
/*slider.addEventListener("input", function () {
  // Get the value of the slider (0 to 100)
  const sliderValue = parseInt(this.value);

  // Calculate the angle for the needle rotation (0 to 180 degrees)
  const angle = (sliderValue / 100) * 180 - 90;

  // Rotate the needle accordingly
  needle.style.transform = `rotate(${angle}deg)`;
});*/

// Function to handle slider change event (when slider is released)
slider.addEventListener("change", function () {
  // If the slider is at the bottom, reset the needle position
  if (this.value === "0") {
    needle.style.transform = "rotate(-90deg)";
  }
});


