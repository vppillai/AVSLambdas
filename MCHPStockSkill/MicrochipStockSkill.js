'use strict'
var https=require('https');
var mqtt=require('mqtt');

exports.handler=function(event,context){
  var request=event.request;
  var userEmail;
  let options={}; 

  try{
    if (event.session.user.accessToken){
      //console.log(event.session.user.accessToken);
      getUser(event.session.user.accessToken, function(userMail,err){
        if(err){
          userEmail="microchip@microchip.com"
          context.fail(err);
        }
        else{
          userEmail=userMail;
          console.log("User name is : " + userMail);
        }
      });
    }
    else{
      userEmail="microchip@microchip.com"
      options.speechText = `Please use the companion app to authenticate on Amazon to start using this skill`;    
      options.endSession=true;   
      options.accountLinkCard=true;
      context.succeed(buildResponse(options));
    }

    if(request.type === "LaunchRequest"){
      getQuote(function(quote,err){
        if(err){
          context.fail(err);
        }
        else{
          var client  = mqtt.connect({port:1883,host:"test.mosquitto.org"});
          client.on('connect', function () {
            client.publish(userEmail, quote);
            options.speechText = `Last traded value of Microchip share is `; 
            options.speechText += quote; 
            options.speechText += ` U S dollars`;    
            options.endSession=true;   
            context.succeed(buildResponse(options));
          })
        }
      });
    }
    else if (request.type === "IntentRequest"){
      if(request.intent.name === "HelloIntent"){
        options.speechText = `Last traded value of Microchip share is `;
        getQuote(function(quote,err){
          if(err){
            context.fail(err);
          }
          else{
            var client  = mqtt.connect({port:1883,host:"test.mosquitto.org"});
            client.on('connect', function () {
              client.publish(userEmail, quote);
              options.speechText = `Last traded value of Microchip share is `; 
              options.speechText += quote; 
              options.speechText += ` U S dollars`;    
              options.endSession=true;   
              context.succeed(buildResponse(options));
            })
          }
        });

      }
      else{
        throw ("Unknown intent");
      }
    }
    else if (rewuest.type === "SessionEndedRequest"){

    }
    else{
      throw ("Unknown Intent Type");
    }
  }catch(e){
    context.fail("Exception: "+e);
  }
}

function buildResponse(options){

  var response={
    version: "1.0",
    response: {
      outputSpeech: {
        type: "PlainText",
        text: options.speechText
      },
      shouldEndSession: options.endSession
    }
  };

  if(options.repromptText){
    response.response.reprompt={
      outputSpeech: {
        type: "PlainText",
        text: options.repromptText
      }
    }
  }

  if(options.accountLinkCard){
    response.response.card={
      type:"LinkAccount"
    }
  }
  return response;
}

function getQuote(callback){
  var url="https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20in%20(%22MCHP%22)&format=json&diagnostics=false&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys"
    var req= https.get(url,function(res){
      var body = "";

      res.on('data',function(chunk){
        body+=chunk;
      });

      res.on('end',function(){
        console.log(body);
        //body= body.replace(/\\/g,'');
        var quotation = JSON.parse(body);
        callback(quotation.query.results.quote.LastTradePriceOnly);
      });
    });

  req.on('error',function(err){
    callback('',err);
  });
}

function getUser(accessToken,callback){
  var amznProfileURL = 'https://api.amazon.com/user/profile?access_token=';
  amznProfileURL += accessToken;

  var req= https.get(amznProfileURL,function(res){
    var body = "";

    res.on('data',function(chunk){
      body+=chunk;
    });

    res.on('end',function(){
      console.log(body);
      //body= body.replace(/\\/g,'');
      var profile = JSON.parse(body);
      console.log("UserName: " + profile.name);
      console.log("Email: " + profile.email);
      callback(profile.email);
    });
  });

  req.on('error',function(err){
    callback('',err);
  });
}



