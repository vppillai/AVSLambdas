const cloudRegion = 'us-central1';
const projectId = 'microchipgcp-e9571';
const serviceAccount = {} //to be filled with service account JSON
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
        deviceTemplate = {
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


exports.helloWorld = (req, res) => {
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
            //execute(req, res);
            break;
    }
    //res.status(200).send("helloWorld")
};