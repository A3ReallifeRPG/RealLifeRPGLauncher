var dwn = require('dwn');
var progress = require('progress-stream');
var fs = require('fs');
var jsonist = require('jsonist');
window.$ = window.jQuery = require('../resources/jquery/jquery-1.12.3.min.js');

const {
    ipcRenderer
} = require('electron');

ipcRenderer.on('to-web', (event, args) => {
    switch (args.type) {
    case "get-url" :
        getUrl(args);
        break;
    }
})

function getUrl(args) {
    var fn = function (err, data, resp) {
        getUrlCallback(args, err, data, resp);
    };
    jsonist.get(args.url, fn);
}

function getUrlCallback(args, err, data, resp) {
    var content = {
        "type": args.callback,
        "args": args,
        "err": err,
        "data": data,
        "resp": resp
    };
    ipcRenderer.send(args.callBackTarget,content);
};