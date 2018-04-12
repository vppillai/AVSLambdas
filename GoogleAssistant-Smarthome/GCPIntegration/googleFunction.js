var requestID;
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
            "agentUserId":"VnlzYWtoIFAgUGlsbGFp",
            devices: []
        }
    }

    getDevicesFromPartnerCloud(response, res);
}

function getDevicesFromPartnerCloud(response, res) {
   response.payload.devices.push(JSON.parse(JSON.stringify({
    id: "2",
    type: "action.devices.types.LIGHT",
    traits: [
     "action.devices.traits.OnOff",
    ],
    name: {
    defaultNames: [ "Light" ],
    name: "light"
    },
    willReportState: false
   })));
   console.log("SYNC response is "+JSON.stringify(response));
   res.status(200).send(response);
}


exports.helloWorld = (req, res) => {
  intent = req.body.inputs[0].intent;
  requestID=req.body.requestId; 
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

