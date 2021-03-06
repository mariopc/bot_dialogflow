'use strict';

//Use express module to listen messages from telegram
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());

//Use fs module to read url from a file
const fs = require('fs');

//Use request module to set the webhook
const request = require('request');

//Listen port from the app
const PORT = 5100;

//Webhook URL
const WEBHOOK_URL = ''
const app_name = 'Whatsapp';
const TOKEN = "";
const CFG_FILE = './cfg/whatsapp-webhook';

//Send queue port
const SEND_PORT = 3100;
//Return message port (anothes process must listen in this port)
const RETURN_PORT = 3101;
//If is true the url is extracted from a file, else the url will be constant: WEBHOOK_URL
const RAND_URL = true;
//Define timestamp for logs
require('console-stamp')(console, 'yyyy.mm.dd HH:MM:ss.l');

//Use zeromq module to send messages to a queue
const zmq = require('zeromq');
const sock = zmq.socket('push');
sock.bindSync('tcp://127.0.0.1:' + SEND_PORT);


function defineUrl() {
    let baseUrl = WEBHOOK_URL;
    if (RAND_URL) {
        try {
            baseUrl = fs.readFileSync(CFG_FILE, 'UTF-8').split("\n")[1].split(" ")[3].replace("\n","");
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.log('no such file or directory, open:', CFG_FILE);
            } else {
                console.log(err);
            }
            return;
        }
    }
    console.log('Set', app_name, 'webhook: ', baseUrl);
    return baseUrl;
}

function setWebHook() {
    console.log('Trying to set', app_name, 'webhook...');
    let setWebHookFullURL = 'https://api.telegram.org/bot' + TOKEN + '/setWebhook';
    let baseUrl = defineUrl();
    return new Promise( (res, rej) => {
        request.post(setWebHookFullURL, {
            json: {
                url: baseUrl + '/webhook'
            }
        }, (error, response, body) => {
            if (error) {
                rej('Error while /setWebhook', error);
                return;
            }

            if (response.statusCode != 200) {
                rej('Error status code while /setWebhook', body);
                return;
            }
            res('Method /setWebhook completed', body);
        });
    });
}

function main() {
    let dataPromise = setWebHook();
    dataPromise.then( (res) => {
        console.log(res);
        app.listen(PORT, () => {
            console.log(app_name + ' Webhook listening on port ' + PORT);
        });
    }, (err) => {
        console.log(err);
    });
}

app.post('/webhook', (req, res) => {
    console.log('POST webhook');
    try {
        let messageBody = req.body;
        if (messageBody && messageBody.message) {
            let obj = {
                chat_id: messageBody.message.chat.id,
                sender: messageBody.message.from.first_name + ' ' + messageBody.message.from.last_name,
                message: messageBody.message.text,
                port: RETURN_PORT
            }
            let message = JSON.stringify(obj);
            sock.send(message);
        }
        return res.status(200).json({
            status: {
                code: 200,
                message: 'Message processed'
            }
        });
        //processMessage(req, res);
    } catch (err) {
        console.log(err);
        return res.status(400).send('Error while processing ' + err.message);
    }
});

main();
