var img;
var myDevice;
var myService = "0000181a-0000-1000-8000-00805f9b34fb"; //environmental sensing
var myCharacteristic = "00002a6e-0000-1000-8000-00805f9b34fb"; // temperature characteristic from the environmental sensing
var myTemperature;
var connect_act = 0;
function getTemperature() {
	var temperatureControl = document.getElementById('temp'),
		iTemp = 0;
	temperatureControl.value = myTemperature;
	// Ensure the temperature value is a number
	if (myTemperature !== null) {
		iTemp = myTemperature * 1.0;
	}

	// Sanity checks
	if (iTemp > 50) {
		iTemp = 50;
	} else if (iTemp < -30) {
		iTemp = -30;
	}

	return iTemp;
}

function getRatio(iTemp) {
	/* The image is not in proportion this the gauge to pixel 
	 * ratio need slight adjustment
	 */

	var iRatio;

	if (iTemp > 0) {
		iRatio = 7.1;
	} else if (iTemp <= 0) {
		iRatio = 6.9;
	} else if (iTemp < -20) {
		iRatio = 6.77;
	}

	return iRatio;
}

function convertTempToScreenCoord(iRatio, iTemp) {
	/* Algorithm to convert the temperature to the correct x screen coord.
	 * Odd, but works!
	 */
	var iMAX_TEMP = 50,
		iSTART_Y_POS = 147;

	return iSTART_Y_POS + (iRatio * (iMAX_TEMP - iTemp));
}

function drawLiquid(ctx, iTempToYCoord) {
	/* Draw red rectangle to represent the fluid in the glass tube
	 * Coordinates you Y and are fixed!
	 * TODO: Calculare Y coord base on image X,Y
	 */

	var iX_POS = 111,
		iY_POS = 7,
		iY_OFFSET = 686,
		iWIDTH = 35;

	ctx.fillStyle = "rgb(200,0,0)";

	// Draw rectangle from -30 to iTempToYCoord
	ctx.fillRect(iX_POS, iTempToYCoord, iY_POS, iY_OFFSET - iTempToYCoord);

	// Draw rectangle from botton to -30
	ctx.fillRect(iX_POS, iY_OFFSET, iY_POS, iWIDTH);

	ctx.stroke();
}

function imgOnLoaded() {
	/* Simply grabs a handle to the canvas element and
	 * check the context (Canvas support). 
	*/

	var canvas = document.getElementById('thermometer'),
		ctx = null,
		iTemp = 0,
		iRatio  = 0,
		iTempToYCoord = 0;

	// Canvas supported?
	if (canvas.getContext) {

		ctx = canvas.getContext('2d');
		iTemp = getTemperature();
		iRatio = getRatio(iTemp);
		iTempToYCoord = convertTempToScreenCoord(iRatio, iTemp);

		// Draw the loaded image onto the canvas
		ctx.drawImage(img, 0, 0);

		// Draw the liquid level
		drawLiquid(ctx, iTempToYCoord);

	} else {
		alert("Canvas not supported!");
	}
}

function draw() {
	/* Main entry point got the thermometer Canvas example
	 * Simply grabs a handle to the canvas element and
	 * check the conect (Canvas support). 
	 */

	var canvas = document.getElementById('thermometer');

	// Create the image resource
	img = new Image();

	// Canvas supported?
	if (canvas.getContext) {
		// Setup the onload event
		img.onload = imgOnLoaded;

		// Load the image
		img.src = 'thermometer-template.png';
	} else {
		alert("Canvas not supported!");
	}
}

function action() {
	if(connect_act == 0)
	{
		connect();
	}
	else
	{
		disconnect();
		connect_act = 0;
	}
}

function connect() {
    navigator.bluetooth.requestDevice({
            // filters: [myFilters]       // you can't use filters and acceptAllDevices together
            optionalServices: [myService],
            acceptAllDevices: true
        })
        .then(function(device) {
            // save the device returned so you can disconnect later:
            myDevice = device;
            console.log(device);
            // connect to the device once you find it:
            return device.gatt.connect();
        })
        .then(function(server) {
            // get the primary service:
            return server.getPrimaryService(myService);
        })
        .then(function(service) {
            // get the  characteristic:
            console.log(service.getCharacteristics())
            return service.getCharacteristics();
        })
        .then(function(characteristics) {
            // subscribe to the characteristic:
            for (c in characteristics) {
                console.log(characteristics[c].uuid)
                if (myCharacteristic == characteristics[c].uuid) {
									  console.log("entro");
                    characteristic_obj = characteristics[c];
                    characteristics[c].startNotifications()
                        .then(subscribeToChanges);
                    return characteristics[c];
                }
            }
        })
        .catch(function(error) {
            // catch any errors:
            console.error('Connection failed!', error);
        });
}

// subscribe to changes 
function subscribeToChanges(characteristic) {
    console.log("subscribe")
		connect_act = 1;
		document.getElementById("act_button").innerHTML ="Disconnect";
    characteristic.oncharacteristicvaluechanged = handleData;
}


// handle incoming data:
function handleData(event) {
    // get the data buffer from the meter:
    console.log("get data")
    var buf = new Uint8Array(event.target.value.buffer);
    myTemperature = buf[0] +  buf[1]*256;
		myTemperature = myTemperature/100;
		document.getElementById("tValue").innerHTML = myTemperature.toString() + "°C";
		console.log(buf);
		draw();
}

// disconnect function:
function disconnect() {
    if (myDevice) {
        // disconnect:
        characteristic_obj.stopNotifications();
        myDevice.gatt.disconnect();
				document.getElementById("act_button").innerHTML ="Get Temperature";
    }
}