'use strict';

//Use request module to seng message to Telegram
const request = require('request');

//Use zmq module to pull messages from the bot
const zmq = require('zeromq');

//Set timestamp in log
require('console-stamp')(console, 'yyyy.mm.dd HH:MM:ss.l');

//Define zmw mode, in this case is pull
const sock_in = zmq.socket('pull');

//Define the listen port
const PORT = 3201;

//Token
const TOKEN = '';

//Facebook Messenger API url
const apiUrl = 'https://graph.facebook.com/v2.6/me/messages?access_token=' + TOKEN;

//try to connect to a port
try {
    sock_in.connect('tcp://127.0.0.1:' + PORT);
    console.log('Ready to receive messages in the port:', PORT);
} catch(err) {
    console.log(err);
    return;
}

const app_name = 'Facebook Messenger';

console.log(`${app_name} sender message process is ready`);

sock_in.on('message', (req) => {
    let reqString = req.toString();
    try {
        let reqJson = JSON.parse(reqString);
        if (reqJson.messages) {
            let msg = {};
            if (reqJson.messages.length >= 2){
                let elements = [];
                for (var i = 0; i < reqJson.messages.length;i++) {
                    let obj = {}
                    if (typeof(reqJson.messages[i]) === 'object') {
                        obj = reqJson.messages[i];
                    } else {
                        obj = JSON.parse(reqJson.messages[i]);
                    }
                    var object = {
                        title: obj.place_name,
                        subtitle: obj.address,
                        buttons: [{
                            type: 'web_url',
                            url: `https://www.google.com/maps/?q=${obj.lat},${obj.lng}`,
                            title: 'Maps',
                            webview_height_ratio: 'full'
                        }]
                    }
                    elements.push(object);
                    msg = {
                        recipient: { id: obj.chat_id },
                        messaging_type: 'RESPONSE',
                        message: {
                            attachment: {
                                type: 'template',
                                payload: {
                                    template_type: 'generic',
                                    elements
                                }
                            }
                        }
                    }
                }                
            } else {
                let obj = {}
                if (typeof(reqJson.messages[0]) === 'object') {
                    obj = reqJson.messages[0];
                } else {
                    obj = JSON.parse(reqJson.messages[0]);
                }
                msg = {
                    recipient: { id: obj.chat_id },
                    message: { text: obj.message },
                }
            }
/*            for (var i = 0; i < reqJson.messages.length;i++) {
                let obj = {}
                if (typeof(reqJson.messages[i]) === 'object') {
                    obj = reqJson.messages[i];
                } else {
                    obj = JSON.parse(reqJson.messages[i]);
                }
                let msg = {};
                if (obj.chat_id && obj.place_name) {
                    msg = {
                        chat_id: obj.chat_id,
                        text: obj.place_name + '\n' + obj.address,
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [[{ text: 'Maps', url: `https://www.google.com/maps/?q=${obj.lat},${obj.lng}`}]]
                        }
                    }
                } else if (obj.chat_id && obj.message) {
                    msg = {
                        chat_id: obj.chat_id,
                        text: obj.message
                    }
                }
                request.post(apiUrl, {
                    json: msg
                }, (error, response, body) => {
                    if (error) {
                        console.error('Error while /sendMessage', error);
                        return;
                    }

                    if (response.statusCode != 200) {
                        console.error('Error status code while /sendMessage', body);
                        return;
                    }
                    console.log('Method /sendMessage succeeded');
                });
            }*/
            console.log('MSG:', msg);
            request.post(apiUrl, {
                json: msg
            }, (error, response, body) => {
                if (error) {
                    console.error('Error while /sendMessage', error);
                    return;
                }

                if (response.statusCode != 200) {
                    console.error('Error status code while /sendMessage', body);
                    return;
                }
                console.log('Method /sendMessage succeeded');
            });
        }
    } catch(err) {
        console.log(err);
    }
});
