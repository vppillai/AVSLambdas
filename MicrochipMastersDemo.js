'use strict';
var AWS = require('aws-sdk');
var region;
var iot;
var iotData;
var endpointAddress;

// Delay time tracking
var eventTime;

const USER_DEVICES_MOCK = [
  {
    applianceId: 'unique-id-for-non-dimmable-bulb-specific-to-user1',
    manufacturerName: 'SmartHome Product Company',
    modelName: 'NON-DIMMABLE BULB MODEL ABC',
    version: '1.0',
    friendlyName: 'Smart light',
    friendlyDescription: 'Smart light bulb from SmartHome Product Company',
    isReachable: true,
    actions: ['turnOn', 'turnOff'],
    additionalApplianceDetails: {
      extraDetail1: 'optionalDetailForSkillAdapterToReferenceThisDevice',
      extraDetail2: 'There can be multiple entries',
      extraDetail3: 'but they should only be used for reference purposes.',
      extraDetail4: 'This is not a suitable place to maintain current device state',
    },
  }, {
    applianceId: 'unique-id-for-dimmable-bulb-specific-to-user1',
    manufacturerName: 'SmartHome Product Company',
    modelName: 'DIMMABLE BULB MODEL XYZ',
    version: '1.0',
    friendlyName: 'Dimmable light',
    friendlyDescription: 'Dimmable light bulb from SmartHome Product Company',
    isReachable: true,
    actions: ['turnOn', 'turnOff', 'setPercentage', 'incrementPercentage', 'decrementPercentage'],
    additionalApplianceDetails: {
    },
  },
];

var USER_DEVICES=[];
/**
 * Utility functions
 */

function log(title, msg) {
  console.log(`[${title}] ${msg}`);
}

function generateMessageID() {
  return '38A28869-DD5E-48CE-BBE5-A4DB78CECB28'; // Dummy
}

function generateResponse(name, payload) {
  return {
    header: {
      messageId: generateMessageID(),
      name: name,
      namespace: 'Alexa.ConnectedHome.Control',
      payloadVersion: '2',
    },
    payload: payload,
  };
}


function getDevicesFromPartnerCloud(userAccessToken,response,callback) {

  var numDevices;
  // Create the Iot object
  iot = new AWS.Iot({'region': process.env.region, apiVersion: '2015-05-28'});

  var params = {
    maxResults: 100,
    thingTypeName: process.env.thingTypeName
  };

  iot.listThings(params, function(err, data) {
    if (err) {                              // an error occurred
      console.log(err, err.stack); 
      log('ERROR', err.stack);
      callback(new Error(err));
    }
    else     {// successful response
      numDevices=data.things.length;
      //console.log(data);  
      console.log(`found ${numDevices} devices`);
      var i;
      var deviceData={};
      for (i=0;i<numDevices;i++){
        //deep clean before re-fill
        Object.keys(deviceData).forEach(function(key) { delete deviceData[key]; });

        if (!data.things[i].attributes.IDName) continue;
        deviceData.applianceId          =      data.things[i].attributes.IDName;

        if (!data.things[i].attributes.FriendlyName) continue;
        deviceData.friendlyName         =      data.things[i].attributes.FriendlyName;

        if (!data.things[i].thingName) continue;
        deviceData.additionalApplianceDetails={};
        deviceData.additionalApplianceDetails.thingName=data.things[i].thingName

        deviceData.isReachable          =      true;
        deviceData.manufacturerName     =      "Microchip Technologies";
        deviceData.modelName            =      "Microchip smart devices";
        deviceData.version              =      "1.0"
        deviceData.friendlyDescription  =      `Microchip demo device ${i}.`;
        deviceData.actions              =      ['turnOn', 'turnOff']

        //deepCopy
        //console.log(`pushing ${JSON.stringify(deviceData)}`);
        USER_DEVICES.push(JSON.parse(JSON.stringify(deviceData)));
      }
      //console.log( `IoT device data ${JSON.stringify(USER_DEVICES)}`);
      response.payload.discoveredAppliances=USER_DEVICES;

      /**
       * Log the response. These messages will be stored in CloudWatch.
       */
      log('DEBUG', `Discovery Response: ${JSON.stringify(response)}`);

      /**
       * Return result with successful message.
       */
      callback(null, response);
    }
  });
}

function isValidToken() {
  /**
   * Always returns true for sample code.
   * You should update this method to your own access token validation.
   */
  return true;
}

function isDeviceOnline(applianceId) {
  log('DEBUG', `isDeviceOnline (applianceId: ${applianceId})`);

  /**
   * Always returns true for sample code.
   * You should update this method to your own validation.
   */
  return true;
}

function turnOn(applianceId,userAccessToken,callback) {
  log('DEBUG', `turnOn (applianceId: ${applianceId})`);

  // Call device cloud's API to turn on the device

  // Create the Iot object
  iot = new AWS.Iot({'region': process.env.region, apiVersion: '2015-05-28'});

  var params = {
    maxResults: 1,
    //    thingTypeName  : process.env.thingTypeName,
    attributeName  : "IDName",
    attributeValue : applianceId
  };

  iot.listThings(params, function(err, thingData) {
    if (err) {                              // an error occurred
      console.log(err, err.stack); 
      log('ERROR', err.stack);
      callback(new Error(err));
    }
    else     {// successful response
      //console.log(`Thing Data: ${thingData}`);  
      console.log(`found ${applianceId}`);


      iot.describeEndpoint({}, function(err, epData) {
        if (err) {  // an error occurred
          console.log(err, err.stack); 
          callback(new Error(err));
        }
        else    {                             // successful response
          iotData= new AWS.IotData({endpoint: epData.endpointAddress});
          var messageData=JSON.stringify({ STATUS: "ON"});
          var params = {
            topic: thingData.things[0].attributes.controlTopic,
            payload: messageData,
            qos: 1
          };

          iotData.publish(params, function(err, pubData) {
            if (err) {// an error occurred
              console.log(err, err.stack); // an error occurred
              callback(new Error(err));
            }
            else{								  // successful response
              //console.log(`MQTT publish return data ${JSON.stringify(pubData)}`);           
              callback(null, generateResponse('TurnOnConfirmation', {}));
            }
          });
        }
      });	   
    }
  });
}


function turnOff(applianceId,userAccessToken,callback) {
  log('DEBUG', `turnOn (applianceId: ${applianceId})`);

  // Call device cloud's API to turn on the device

  // Create the Iot object
  iot = new AWS.Iot({'region': process.env.region, apiVersion: '2015-05-28'});

  var params = {
    maxResults: 1,
    //    thingTypeName  : process.env.thingTypeName,
    attributeName  : "IDName",
    attributeValue : applianceId
  };

  iot.listThings(params, function(err, thingData) {
    if (err) {                              // an error occurred
      console.log(err, err.stack); 
      log('ERROR', err.stack);
      callback(new Error(err));
    }
    else     {// successful response
      //console.log(`Thing Data: ${thingData}`);  
      console.log(`found ${applianceId}`);


      iot.describeEndpoint({}, function(err, epData) {
        if (err) {  // an error occurred
          console.log(err, err.stack); 
          callback(new Error(err));
        }
        else    {                             // successful response
          iotData= new AWS.IotData({endpoint: epData.endpointAddress});
          var messageData=JSON.stringify({ STATUS: "OFF"});
          var params = {
            topic: thingData.things[0].attributes.controlTopic,
            payload: messageData,
            qos: 1
          };

          iotData.publish(params, function(err, pubData) {
            if (err) {// an error occurred
              console.log(err, err.stack); // an error occurred
              callback(new Error(err));
            }
            else{								  // successful response
              //console.log(`MQTT publish return data ${JSON.stringify(pubData)}`);           
              callback(null, generateResponse('TurnOffConfirmation', {}));
            }
          });
        }
      });	   
    }
  });
}

function setPercentage(applianceId, percentage) {
  log('DEBUG', `setPercentage (applianceId: ${applianceId}), percentage: ${percentage}`);

  // Call device cloud's API to set percentage

  return generateResponse('SetPercentageConfirmation', {});
}

function incrementPercentage(applianceId, delta) {
  log('DEBUG', `incrementPercentage (applianceId: ${applianceId}), delta: ${delta}`);

  // Call device cloud's API to set percentage delta

  return generateResponse('IncrementPercentageConfirmation', {});
}

function decrementPercentage(applianceId, delta) {
  log('DEBUG', `decrementPercentage (applianceId: ${applianceId}), delta: ${delta}`);

  // Call device cloud's API to set percentage delta

  return generateResponse('DecrementPercentageConfirmation', {});
}

function handleDiscovery(request, callback) {
  log('DEBUG', `Discovery Request: ${JSON.stringify(request)}`);

  const userAccessToken = request.payload.accessToken.trim();

  if (!userAccessToken || !isValidToken(userAccessToken)) {
    const errorMessage = `Discovery Request [${request.header.messageId}] failed. Invalid access token: ${userAccessToken}`;
    log('ERROR', errorMessage);
    callback(new Error(errorMessage));
  }

  var response = {
    header: {
      messageId: generateMessageID(),
      name: 'DiscoverAppliancesResponse',
      namespace: 'Alexa.ConnectedHome.Discovery',
      payloadVersion: '2',
    },
    payload: {
      //      discoveredAppliances: 
    },
  };

  getDevicesFromPartnerCloud(userAccessToken,response,callback);
}

function handleControl(request, callback) {
  log('DEBUG', `Control Request: ${JSON.stringify(request)}`);

  const userAccessToken = request.payload.accessToken.trim();

  if (!userAccessToken || !isValidToken(userAccessToken)) {
    log('ERROR', `Discovery Request [${request.header.messageId}] failed. Invalid access token: ${userAccessToken}`);
    callback(null, generateResponse('InvalidAccessTokenError', {}));
    return;
  }

  const applianceId = request.payload.appliance.applianceId;

  if (!applianceId) {
    log('ERROR', 'No applianceId provided in request');
    const payload = { faultingParameter: `applianceId: ${applianceId}` };
    callback(null, generateResponse('UnexpectedInformationReceivedError', payload));
    return;
  }

  if (!isDeviceOnline(applianceId, userAccessToken)) {
    log('ERROR', `Device offline: ${applianceId}`);
    callback(null, generateResponse('TargetOfflineError', {}));
    return;
  }

  let response;

  switch (request.header.name) {
    case 'TurnOnRequest':
      response = turnOn(applianceId,userAccessToken,callback);
      return;
      break;

    case 'TurnOffRequest':
      response = turnOff(applianceId, userAccessToken,callback);
      return;
      break;

    case 'SetPercentageRequest': {
      const percentage = request.payload.percentageState.value;
      if (!percentage) {
        const payload = { faultingParameter: `percentageState: ${percentage}` };
        callback(null, generateResponse('UnexpectedInformationReceivedError', payload));
        return;
      }
      response = setPercentage(applianceId, userAccessToken, percentage);
      break;
    }

    case 'IncrementPercentageRequest': {
      const delta = request.payload.deltaPercentage.value;
      if (!delta) {
        const payload = { faultingParameter: `deltaPercentage: ${delta}` };
        callback(null, generateResponse('UnexpectedInformationReceivedError', payload));
        return;
      }
      response = incrementPercentage(applianceId, userAccessToken, delta);
      break;
    }

    case 'DecrementPercentageRequest': {
      const delta = request.payload.deltaPercentage.value;
      if (!delta) {
        const payload = { faultingParameter: `deltaPercentage: ${delta}` };
        callback(null, generateResponse('UnexpectedInformationReceivedError', payload));
        return;
      }
      response = decrementPercentage(applianceId, userAccessToken, delta);
      break;
    }

    default: {
      log('ERROR', `No supported directive name: ${request.header.name}`);
      callback(null, generateResponse('UnsupportedOperationError', {}));
      return;
    }
  }

  log('DEBUG', `Control Confirmation: ${JSON.stringify(response)}`);

  callback(null, response);
}

exports.handler = (request, context, callback) => {
  // Replace it with the AWS region the lambda will be running in
  if(!process.env.region){
    context.fail("region parameter not set in environment variables")
  }

  if(!process.env.thingTypeName){
    context.fail("thingTypeName not set in environment variables")
  }

  switch (request.header.namespace) {
    case 'Alexa.ConnectedHome.Discovery':
      handleDiscovery(request, callback);
      break;
    case 'Alexa.ConnectedHome.Control':
      handleControl(request, callback);
      break;
    default: {
      const errorMessage = `No supported namespace: ${request.header.namespace}`;
      log('ERROR', errorMessage);
      callback(new Error(errorMessage));
    }
  }
};
