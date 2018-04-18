'use strict';
const cloudRegion = 'us-central1';
const projectId = 'microchipgcp-e9571';
const serviceAccount = {}


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
    //return requestID;
    return 'VnlzYWtoIFAgUGlsbGFp'; // Dummy
}

function getDevicesFromPartnerCloud(request, callback) {
    function processDeviceData(devData) {

        var header = request.directive.header;
        header.name = "Discover.Response";
        var response = {
            endpoints: []
        };
        var lightCaps = [{
            "type": "AlexaInterface",
            "interface": "Alexa",
            "version": "3"
        },
        {
            "type": "AlexaInterface",
            "interface": "Alexa.PowerController",
            "version": "3",
            "properties": {
                "supported": [{
                    "name": "powerState"
                }],
                "proactivelyReported": false,
                "retrievable": false
            }
        }];
        var deviceData = {};
        deviceData.endpointId = [];

        deviceData.endpointId = devData.id;
        if (devData.metadata.name) {
            deviceData.friendlyName = devData.metadata.name;
            console.log("deviceName: " + devData.metadata.name);
        }
        else {
            deviceData.friendlyName = devData.id;
            console.log("we will call him " + devData.id);
        }

        deviceData.description = "GCP Light";
        deviceData.manufacturerName = "Microchip Technologies";
        //TODO: These traits are hardcoded for now
        deviceData.displayCategories = [];
        deviceData.displayCategories[0] = "LIGHT";

        deviceData.cookie = {};
        deviceData.cookie.registry = registryId;

        //deep copy Caps
        deviceData.capabilities = [];
        deviceData.capabilities.push(JSON.parse(JSON.stringify(lightCaps[0])));
        deviceData.capabilities.push(JSON.parse(JSON.stringify(lightCaps[1])));

        //deepCopy
        console.log(`pushing ${JSON.stringify(deviceData)}`);
        response.endpoints.push(JSON.parse(JSON.stringify(deviceData)));


        console.log(`Discovery Response: ${JSON.stringify({ event: { header: header, payload: response } })}`);
        callback.succeed({ event: { header: header, payload: response } });
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


function turnOnOff(deviceId, requestRegistry, operationString, request, callback) {
    //hardcoded response
    function execCompleted() {
        var contextResult = {};

        contextResult["properties"] = [{
            "namespace": "Alexa.PowerController",
            "name": "powerState",
            "value": operationString,
            "timeOfSample": "2018-02-03T16:20:50.52Z", //retrieve from result.
            "uncertaintyInMilliseconds": 50
        }];
       // contextResult.properties[0].timeOfSample=Date.now();

        var responseHeader = request.directive.header;
        responseHeader.namespace = "Alexa";
        responseHeader.name = "Response";
        responseHeader.messageId = responseHeader.messageId + "-R";
        var response = {
            context: contextResult,
            event: {
                header: responseHeader,
                payload: {}
            }
        };
        console.log("DEBUG" + "Alexa.PowerController " + JSON.stringify(response));
        callback.succeed(response);
    }

    //set device configuration
    const setDeviceConfigCb = function (client) {
        var command = "";

        if ("ON" == operationString) command = "LEDOn"
        else if ("OFF" == operationString) command = "LEDOff"
        setDeviceConfig(
            client,
            deviceId,
            requestRegistry,
            projectId,
            cloudRegion,
            command,
            0,
            execCompleted
        );
    };
    console.log("request for device: " + deviceId);
    getClient(setDeviceConfigCb);

}
function handlePowerControl(request, callback) {
    // get device ID passed in during discovery
    var requestMethod = request.directive.header.name;
    // get user token pass in request
    var requestToken = request.directive.endpoint.scope.token;
    var requestDevice = request.directive.endpoint.endpointId;
    var requestRegistry = request.directive.endpoint.cookie.registry;
    var powerResult;

    if (requestMethod === "TurnOn") {

        // Make the call to your device cloud for control 
        // powerResult = stubControlFunctionToYourCloud(endpointId, token, request);
        turnOnOff(requestDevice, requestRegistry, "ON", request, callback);
        console.log("request for device: " + requestDevice);
    }
    else if (requestMethod === "TurnOff") {
        // Make the call to your device cloud for control and check for success 
        // powerResult = stubControlFunctionToYourCloud(endpointId, token, request);
        turnOnOff(requestDevice, requestRegistry, "OFF", request, callback);
        console.log("request for device: " + requestDevice);
    }

}


exports.handler = (request, context, callback) => {
    console.log(JSON.stringify(request))
    if (request.directive.header.namespace === 'Alexa.Discovery' && request.directive.header.name === 'Discover') {
        console.log("DEBUG:" + "Discover request" + JSON.stringify(request));
        getDevicesFromPartnerCloud(request, context);
    }
    else if (request.directive.header.namespace === 'Alexa.PowerController') {
        if (request.directive.header.name === 'TurnOn' || request.directive.header.name === 'TurnOff') {
            console.log("DEBUG:" + "TurnOn or TurnOff Request" + JSON.stringify(request));
            handlePowerControl(request, context);
        }
        //callback('Something went wrong');
    };
}
