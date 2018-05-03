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
const PORT = 3001;

//Token
const TOKEN = '';

//Telegram API url
const apiUrl = 'https://api.telegram.org/bot' + TOKEN + '/sendMessage';

//try to connect to a port
try {
    sock_in.connect('tcp://127.0.0.1:' + PORT);
    console.log('Ready to receive messages in the port:', PORT);
} catch(err) {
    console.log(err);
    return;
}

const app_name = 'Telegram';

console.log(`${app_name} sender message process is ready`);

sock_in.on('message', (req) => {
    let reqString = req.toString();
    try {
        let reqJson = JSON.parse(reqString);
        if (reqJson.messages) {
            for (var i = 0; i < reqJson.messages.length;i++) {
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
            }
        }
    } catch(err) {
        console.log(err);
    }
});
