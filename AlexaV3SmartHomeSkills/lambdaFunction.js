
'use strict';
var AWS = require('aws-sdk');
var region;
var iot;
var iotData;
var endpointAddress;
console.log('Loading function');

function generateMessageID() {
    return 'dnlzYWtoIHAgcGlsbGFp'; // Dummy
}

function getDevicesFromPartnerCloud(request, callback) {
    //user auth token should also be passed here.
    var numDevices;
    // Create the Iot object
    iot = new AWS.Iot({ 'region': process.env.region, apiVersion: '2015-05-28' });

    var params = {
        maxResults: 100,
        thingTypeName: process.env.thingTypeName
    };
    var header = request.directive.header;
    header.name = "Discover.Response";
    
    var response = {
            endpoints: []
    };
     var lightCaps= [{
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
                "proactivelyReported":false,
                 "retrievable": false
            }
        }];

    iot.listThings(params, function (err, data) {
        if (err) {                              // an error occurred
            console.log(err, err.stack);
            console.log('ERROR'+ err.stack);
            callback(new Error(err));
        }
        else {// successful response
            numDevices = data.things.length;
            //console.log(data);  
            console.log(`found ${numDevices} devices`);
            var i;
            var deviceData = {};
                deviceData.endpointId=[];
            for (i = 0; i < numDevices; i++) {
                //deep clean before re-fill
                Object.keys(deviceData).forEach(function (key) { delete deviceData[key]; });

                if (!data.things[i].attributes.IDName) continue;
                deviceData.endpointId = data.things[i].attributes.IDName;
                
                if (!data.things[i].attributes.FriendlyName) continue;
                deviceData.friendlyName = data.things[i].attributes.FriendlyName;

                if (!data.things[i].thingName) continue;
                deviceData.description=data.things[i].thingName;
    
                deviceData.manufacturerName="Microchip Technologies";

                //TODO: These traits are hardcoded for now
                deviceData.displayCategories=[];
                deviceData.displayCategories[0] = "LIGHT";

                deviceData.cookie={};
                deviceData.cookie.controlTopic=data.things[i].attributes.controlTopic;

                //deep copy Caps
                deviceData.capabilities=[];
                deviceData.capabilities.push(JSON.parse(JSON.stringify(lightCaps[0])));
                deviceData.capabilities.push(JSON.parse(JSON.stringify(lightCaps[1])));

                //deepCopy
                console.log(`pushing ${JSON.stringify(deviceData)}`);
                response.endpoints.push(JSON.parse(JSON.stringify(deviceData)));
            }
            console.log(`Discovery Response: ${JSON.stringify({ event: { header: header, payload: response } })}`);
            callback.succeed({ event: { header: header, payload: response } });
        }
    });
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


//hardcoded response
function execCompleted(deviceIds, requestOnState, request, callback) {
    var contextResult={}; 
    contextResult["properties"]= [{
            "namespace": "Alexa.PowerController",
            "name": "powerState",
            "value": requestOnState,
            "timeOfSample": "2017-09-03T16:20:50.52Z", //retrieve from result.
            "uncertaintyInMilliseconds": 50
    }];

    var responseHeader = request.directive.header;
    responseHeader.namespace="Alexa";
    responseHeader.name = "Response";
    responseHeader.messageId = responseHeader.messageId + "-R";
    var response = {
        context: contextResult,
        event: {
            header: responseHeader,
            payload: {}
        }
    };
    console.log("DEBUG"+ "Alexa.PowerController "+ JSON.stringify(response));
    callback.succeed(response);
}

function turnOnOff(deviceId, controlTopic, operationString, request, callback) {
    // Create the Iot object
    iot = new AWS.Iot({ 'region': process.env.region, apiVersion: '2015-05-28' });


    AWSDeviceMessaging(controlTopic, { STATUS: operationString }, function (err, response) {
        if (err) {
            console.log("ERROR>> AWSDeviceMessaging Returned Error");
            callback('Something went wrong while sending message via AWSIoT');

        }
        else {
             execCompleted(deviceId, operationString, request, callback);
            }
    });
}
function handlePowerControl(request, callback) {
    // get device ID passed in during discovery
    var requestMethod = request.directive.header.name;
    // get user token pass in request
    var requestToken = request.directive.endpoint.scope.token;
    var requestDevice = request.directive.endpoint.endpointID;
    var requestControlTopic = request.directive.endpoint.cookie.controlTopic;
    var powerResult;

    if (requestMethod === "TurnOn") {

        // Make the call to your device cloud for control 
        // powerResult = stubControlFunctionToYourCloud(endpointId, token, request);
        turnOnOff(requestDevice, requestControlTopic, "ON", request, callback);
    }
    else if (requestMethod === "TurnOff") {
        // Make the call to your device cloud for control and check for success 
        // powerResult = stubControlFunctionToYourCloud(endpointId, token, request);
        turnOnOff(requestDevice, requestControlTopic, "OFF", request,callback);
    }

}


exports.handler = (request, context, callback) => {
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
