'use strict';
var AWS = require('aws-sdk');
var region;
var iot;
var iotData;
var endpointAddress;
console.log('Loading function');

function generateMessageID() {
    return '38A28869-DD5E-48CE-BBE5-A4DB78CECB28'; // Dummy
}

function getDevicesFromPartnerCloud(response, callback) {
    //user auth token should also be passed here.
    var numDevices;
    // Create the Iot object
    iot = new AWS.Iot({ 'region': process.env.region, apiVersion: '2015-05-28' });

    var params = {
        maxResults: 100,
        thingTypeName: process.env.thingTypeName
    };

    iot.listThings(params, function (err, data) {
        if (err) {                              // an error occurred
            console.log(err, err.stack);
            log('ERROR', err.stack);
            callback(new Error(err));
        }
        else {// successful response
            numDevices = data.things.length;
            //console.log(data);  
            console.log(`found ${numDevices} devices`);
            var i;
            var deviceData = {};
            for (i = 0; i < numDevices; i++) {
                //deep clean before re-fill
                Object.keys(deviceData).forEach(function (key) { delete deviceData[key]; });

                if (!data.things[i].attributes.IDName) continue;
                deviceData.id = data.things[i].attributes.IDName;

                //TODO: These traits are hardcoded for now
                deviceData.type = "action.devices.types.LIGHT";
                deviceData.traits = [];
                deviceData.traits[0] = "action.devices.traits.OnOff";

                if (!data.things[i].thingName) continue;
                deviceData.name = {};
                deviceData.name.defaultNames = [];
                deviceData.name.defaultNames[0] = data.things[i].thingName;

                if (!data.things[i].attributes.FriendlyName) continue;
                deviceData.name.name = data.things[i].attributes.FriendlyName;

                //TODO: hardcoded state reporting property
                deviceData.willReportState = false;

                //add controlTopic to CustomData
                deviceData.customData = {}
                deviceData.customData.controlTopic = data.things[i].attributes.controlTopic;

                //deepCopy
                //console.log(`pushing ${JSON.stringify(deviceData)}`);
                response.payload.devices.push(JSON.parse(JSON.stringify(deviceData)));
            }
            console.log(`Discovery Response: ${JSON.stringify(response)}`);
            callback(null, response);
        }
    });
}


function handleSync(callback) {
    //log('DEBUG', `Sync Request: ${JSON.stringify(request)}`);

    //Get User information using Oauth2 Token

    //Auth token is part of Authorization header sent to the API. To get it here, 
    //    create an input mapping with passthrough in the API console

    var response = {
        requestId: generateMessageID(),
        payload: {
            devices: []
        }
    }

    getDevicesFromPartnerCloud(response, callback);
}

function AWSDeviceMessaging(controlTopic, message, callback) {
    iot.describeEndpoint({}, function (err, epData) {
        if (err) {  // an error occurred
            console.log(err, err.stack);
            callback(new Error(err));
        }
        else {                             // successful response
            iotData = new AWS.IotData({ endpoint: epData.endpointAddress });
            var messageData = JSON.stringify(message);
            var params = {
                topic: controlTopic,
                payload: messageData,
                qos: 1
            };

            iotData.publish(params, function (err, pubData) {
                //console.log(`publishing to ${params.topic}`)
                if (err) {// an error occurred
                    console.log(err, err.stack); // an error occurred
                    callback(new Error(err));
                }
                else {								  // successful response
                    callback();
                }
            });
        }
    });
}
//    });
//}

//hardcoded response
function execCompleted(deviceIds, requestOnState, callback) {
    var response = {
        requestId: "ff36a3cc-ec34-11e6-b1a0-64510650abcf", //TODO: should request ID match original incoming request ID?
        payload: {
            commands: [{
                ids: deviceIds,
                status: "SUCCESS",
                states: {
                    on: requestOnState,
                    online: true
                }
            }]
        }
    }
    callback(null, response);
}

function turnOnOff(deviceIds, controlTopic, operationString, callback) {
    // Create the Iot object
    iot = new AWS.Iot({ 'region': process.env.region, apiVersion: '2015-05-28' });

    var total = controlTopic.length;
    var count = 0;

    for (var i = 0; i < total; i++) {
        (function (index) {
            AWSDeviceMessaging(controlTopic[index], { STATUS: operationString }, function (err, response) {
                if (err) {
                    console.log("ERROR>> AWSDeviceMessaging Returned Error")
                }
                count++;
                if (count > total - 1) {
                    if ("ON" == operationString) {
                        execCompleted(deviceIds, true, callback);
                    }
                    else if ("OFF" == operationString) {
                        execCompleted(deviceIds, false, callback);
                    }
                }
            });
        }(i));
    }
}

function handleExec(commands, callback) {

    //TODO: bad coding. But for now, this is the only suported action
    if (commands[0].execution[0].command == "action.devices.commands.OnOff") {
        var devices = [];
        var controltopics = [];
        for (var i = 0; i < commands[0].devices.length; i++) {
            devices.push(JSON.parse(JSON.stringify(commands[0].devices[i].id)));
        }
        for (var i = 0; i < commands[0].devices.length; i++) {
            controltopics.push(JSON.parse(JSON.stringify(commands[0].devices[i].customData.controlTopic)));
        }
        if (true == commands[0].execution[0].params.on) {
            turnOnOff(devices, controltopics, "ON", callback);
        }
        else if (false == commands[0].execution[0].params.on) {
            turnOnOff(devices, controltopics, "OFF", callback);
        }
    }
}


exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    var intent = event.inputs[0].intent;

    if (intent == "action.devices.SYNC") {
        console.log("Received SYNC intent");
        handleSync(callback);
    }
    else if (intent == "action.devices.QUERY") {
        //TODO: Not yet supported
        console.log("Received QUERY intent");
    }
    else if (intent == "action.devices.EXECUTE") {
        console.log("Received EXEC intent")
        handleExec(event.inputs[0].payload.commands, callback);
    }
    //callback('Something went wrong');
};
