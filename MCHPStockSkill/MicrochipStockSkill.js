'use strict'
var https=require('https');

exports.handler=function(event,context){
  var request=event.request;

  //request.type:
  //LaunchRequest
  //IntentRequest
  //SessionEndedRequest
  try{
    let options={}; 
    if(request.type === "LaunchRequest"){
        options.speechText = `Hello. `;
        //options.speechText += getWish();
        getQuote(function(quote,err){
          if(err){
            context.fail(err);
          }
          else{
            options.speechText += quote;
            options.endSession=true;
            context.succeed(buildResponse(options));
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
            options.speechText += quote;
            options.speechText += ` dollars`;
            options.endSession=true;
            context.succeed(buildResponse(options));
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
