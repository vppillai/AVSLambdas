const cloudRegion = 'us-central1'; //change region if required
const projectId = ''; //add project ID here
const serviceAccount = {} //include JSON from service account
//const serviceAccount=process.env.GOOGLE_APPLICATION_CREDENTIALS;



var requestID;
const API_VERSION = 'v1';
const DISCOVERY_API = 'https://cloudiot.googleapis.com/$discovery/rest';
var registryId = "";
const fs = require('fs');
const google = require('googleapis');

// List all of the registries in the given project.
function listRegistries(client, projectId, cloudRegion, callback) {
    const parentName = `projects/${projectId}/locations/${cloudRegion}`;

    const request = {
        parent: parentName
    };

    client.projects.locations.registries.list(request, (err, data) => {
        if (err) {
            console.log('Could not list registries');
            console.log(err);
        } else {
            registryId = data['deviceRegistries'][0].id;
            console.log('Considered registry in project:', registryId);
            callback();
        }
    });
}
//List all of the devices in the given registry.
function listDevices(client, registryId, projectId, cloudRegion, callback) {
    const parentName = `projects/${projectId}/locations/${cloudRegion}`;
    const registryName = `${parentName}/registries/${registryId}`;

    const request = {
        parent: registryName
    };

    client.projects.locations.registries.devices.list(request, (err, data) => {
        if (err) {
            console.log('Could not list devices');
            console.log(err);
        } else {
            console.log('Current devices in registry:', data['devices']);
            callback(data['devices']);
        }
    });
}

//Retrieve the given device from the registry.
function getDevice(client, deviceId, registryId, projectId, cloudRegion, callback) {
    const parentName = `projects/${projectId}/locations/${cloudRegion}`;
    const registryName = `${parentName}/registries/${registryId}`;
    const request = {
        name: `${registryName}/devices/${deviceId}`
    };

    client.projects.locations.registries.devices.get(request, (err, data) => {
        if (err) {
            console.log('Could not find device:', deviceId);
            console.log(err);
        } else {
            console.log('Found device:', deviceId);
            //    console.log(data);
            callback(data);
        }
    });
}

//Returns an authorized API client by discovering the Cloud IoT Core API with
// the provided API key.
function getClient(cb) {
    //const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountJson));

    const jwtAccess = new google.auth.JWT();
    jwtAccess.fromJSON(serviceAccount);
    // Note that if you require additional scopes, they should be specified as a
    // string, separated by spaces.
    jwtAccess.scopes = 'https://www.googleapis.com/auth/cloud-platform';
    // Set the default authentication to the above JWT access.
    google.options({ auth: jwtAccess });

    const discoveryUrl = `${DISCOVERY_API}?version=${API_VERSION}`;

    google.discoverAPI(discoveryUrl, {}, (err, client) => {
        if (err) {
            console.log('Error during API discovery', err);
            return undefined;
        }
        cb(client);
    });
}
// Send configuration data to device.
function setDeviceConfig(
    client,
    deviceId,
    registryId,
    projectId,
    cloudRegion,
    data,
    version,
    callback
) {
    const parentName = `projects/${projectId}/locations/${cloudRegion}`;
    const registryName = `${parentName}/registries/${registryId}`;

    const binaryData = Buffer.from(data).toString('base64');
    const request = {
        name: `${registryName}/devices/${deviceId}`,
        versionToUpdate: version,
        binaryData: binaryData
    };

    client.projects.locations.registries.devices.modifyCloudToDeviceConfig(request,
        (err, data) => {
            if (err) {
                console.log('Could not update config:', deviceId);
                console.log('Message: ', err);
                callback(false);
            } else {
                console.log('Success :', data);
                callback(true);
            }
        });
    // [END iot_set_device_config]
}

function generateMessageID() {
    return requestID;
    // return 'VnlzYWtoIFAgUGlsbGFp'; // Dummy
}

function handleSync(res) {
    //log('DEBUG', `Sync Request: ${JSON.stringify(request)}`);

    //Get User information using Oauth2 Token

    //Auth token is part of Authorization header sent to the API. To get it here, 
    //    create an input mapping with passthrough in the API console

    var response = {
        requestId: generateMessageID(),
        payload: {
            "agentUserId": "VnlzYWtoIFAgUGlsbGFp",
            devices: []
        }
    }

    getDevicesFromPartnerCloud(response, res);
}

function getDevicesFromPartnerCloud(response, res) {
    //process device metadata
    function processDeviceData(devData) {
        var deviceTemplate = {
            "requestId": requestID,
            "payload": {
                "agentUserId": "VnlzYWtoIFAgUGlsbGFp",
                "devices": [
                    {
                        "id": devData.id,
                        "type": "action.devices.types.LIGHT",
                        "traits": ["action.devices.traits.OnOff"],
                        "name": { "name": "" },
                        "willReportState": false,
                        "deviceInfo": {
                            "manufacturer": "Microchip Technologies"
                        },
                        "customData": {
                            "registry": registryId
                        }
                    }]
            }
        };

        if (devData.metadata.name) {
            deviceTemplate.payload.devices[0].name.name = devData.metadata.name;
            console.log("deviceName: " + devData.metadata.name);
        }
        else {
            deviceTemplate.payload.devices[0].name.name = devData.id;
            console.log("we will call him " + devData.id);
        }
        if (devData.metadata.type) {
            console.log("deviceName: " + devData.metadata.type);
        }
        console.log(JSON.stringify(deviceTemplate));
        res.status(200).send(deviceTemplate);

    }

    //getDevice from cloud
    function processDevice(devices) {
        const getDeviceCb = function (client) {
            getDevice(
                client,
                devices[0].id, //currently supporting only one device
                registryId,
                projectId,
                cloudRegion,
                processDeviceData
            );
        };
        getClient(getDeviceCb);
    }

    function deviceList() {
        //get a lsit of devices in the first registry
        const deviceListCb = function (client) {
            listDevices(client,
                registryId,
                projectId,
                cloudRegion,
                processDevice);
        };
        getClient(deviceListCb);
    }

    //get first registery in the project
    const registryIdCb = function (client) {
        listRegistries(client,
            projectId,
            cloudRegion,
            deviceList); //device listing callback
    };
    getClient(registryIdCb);

}

function handleExec(payload, res) {

    function sendResponse(status) {
        var execResponse = {
            "requestId": requestID,
            "payload": {
                "commands": [{
                    "ids": [payload.commands[0].devices[0].id],
                    "status": "SUCCESS", //currently sending blanket success
                    "states": {
                        "on": payload.commands[0].execution[0].params.on,
                        "online": true
                    }
                }]
            }
        }
        console.log(JSON.stringify(execResponse));
        res.status(200).send(execResponse);
    }

    //set device configuration
    const setDeviceConfigCb = function (client) {
        var command = "";
        if ("action.devices.commands.OnOff" == payload.commands[0].execution[0].command) {
            if (true == payload.commands[0].execution[0].params.on) command = "LEDOn"
            else if (false == payload.commands[0].execution[0].params.on) command = "LEDOff"
        }
        setDeviceConfig(
            client,
            payload.commands[0].devices[0].id,
            payload.commands[0].devices[0].customData.registry,
            projectId,
            cloudRegion,
            command,
            0,
            sendResponse
        );
    };
    getClient(setDeviceConfigCb);
}

exports.helloWorld = (req, res) => {
    console.log(JSON.stringify(req));
    intent = req.body.inputs[0].intent;
    requestID = req.body.requestId;
    switch (intent) {
        case "action.devices.SYNC":
            console.error("SYNC called");
            handleSync(res);
            break;
        case "action.devices.QUERY":
            console.error("QUERY called");
            //query(req, res);
            break;
        case "action.devices.EXECUTE":
            console.error("EXEC called");
            handleExec(req.body.inputs[0].payload, res);
            break;
    }
    //res.status(200).send("helloWorld")
};