const zmq = require('zeromq');
let sockets_in = [];
//zmq.socket('pull');
let sockets_out = [];
//zmq.socket('push');
const uuidv4 = require('uuid/v4');
const apiai = require('apiai');
const request = require('request');
const APIAI_ACCESS_TOKEN = ''
const APIAI_LANG = 'es';
const MY_NAMESPACE = '';
const in_ports = [3000,3100,3200];
const out_ports = [3001,3101,3201];
let sessionIds;

out_ports.forEach((port) => {
    let sock_out = zmq.socket('push');
    try {
        sock_out.bindSync('tcp://127.0.0.1:' + port);
        console.log('Worker connected to outgoing port:', port);
        let obj = {
            port,
            sock: sock_out
        };
        sockets_out.push(obj);
    } catch (err) {
        console.log('Error to bind port:', port);
        console.log(err);
        return;
    }
});

in_ports.forEach((port) => {
    let sock_in = zmq.socket('pull');
    sock_in.connect('tcp://127.0.0.1:' + port);
    console.log('Worker connected to incoming port:', port);
    sock_in.on('message', (req, ret) => {
        let messageBody =  JSON.parse(req.toString());
        let outgoingSock;
        sockets_out.forEach((sockObj) => {
            if (sockObj.port === messageBody.port) {
                outgoingSock = sockObj.sock;
            }
        });
        if (typeof(outgoingSock) !== 'undefined') {
            processMessage(messageBody, outgoingSock);
        }
    });
});


function processMessage(messageBody, outgoingSock) {
    let chatId = messageBody.chat_id;
    console.log(chatId);
    let message = messageBody.message;
    if (chatId && message) {
        sessionIds = new Map();
        if (!sessionIds.has(chatId)) {
            sessionIds.set(chatId, uuidv4());
        }
        console.log('SessionID:', sessionIds.get(chatId));

        let apiaiOptions = {
            language: APIAI_LANG
        }

        let apiaiService = apiai(APIAI_ACCESS_TOKEN, apiaiOptions);
        let apiaiRequest = apiaiService.textRequest(message,
        {
            sessionId: chatId
        });
        apiaiRequest.on('response', (response) => {
            console.log(JSON.stringify(response));
            //console.log(JSON.stringify(response.result));
            if (response.result) {
                let responseText = response.result.fulfillment.speech;
                let intent = response.result.metadata.intentName;
                let incomplete = response.result.actionIncomplete;
                if (intent === "SearchFood" && !incomplete) {                    
                    let tipoComida = response.result.parameters.TipoComida.replace(" ","+");
                    let comuna = response.result.parameters.Comuna.replace(" ","+");
                    var options = {
                        uri: 'https://maps.googleapis.com/maps/api/place/textsearch/json?',
                        method: 'GET',
                        json: true,
                        qs: {
                            query: tipoComida.concat("+", comuna, "+Chile"),
                            type: 'restaurant',
                            key: 'AIzaSyDAkJ9LCT093LkAUNKHcANtLpOLdEr9HnQ'
                        }
                    }
                    //console.log('options:', options);
                    request(options, (error, response, body) => {
                        if (error) {
                            console.log('Error requesting googlemaps:', error);
                            return;
                        }
                        if (body.status === "OK") {
                            let elements = []
                            for (var i = 0; i < body.results.length; i++) {
                                elements.push(JSON.stringify({
                                    chat_id: chatId,
                                    place_name: body.results[i].name,
                                    address: body.results[i].formatted_address,
                                    lat: body.results[i].geometry.location.lat,
                                    lng: body.results[i].geometry.location.lng
                                }));
                                //console.log("Message from google maps:", messageBody);
                                //sock_out.send(messageBody);
                                if(i === 5) { break; }
                            }
                            //console.log(elements);
                            let messageBody = JSON.stringify({ messages: elements });
                            //console.log('OBJETO A PASAR:', messageBody);
                            outgoingSock.send(messageBody);
                        }
                    });
                } else {
                    //sendMessage_FromDialogFlow_ToChannel
                    console.log('Message from DialogFlow');
                    let messageBody = JSON.stringify({ messages: [{
                        chat_id: chatId,
                        message: responseText
                    }]});
                    outgoingSock.send(messageBody);
                }
            }
        });
        apiaiRequest.on('error', (error) => {
            console.error('Error while call to api.ai', error);
            return;
        });
        apiaiRequest.end();
    }
}

function setSessionIds(value) {
    this._sessionIds = value;
}

function getSessionIds() {
    return this._sessionIds;
}
