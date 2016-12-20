var dwn = require('dwn');
var progress = require('progress-stream');
var fs = require('fs');
var mkpath = require('mkpath');
window.$ = window.jQuery = require('../resources/jquery/jquery-1.12.3.min.js');

const {
    ipcRenderer
} = require('electron');

ipcRenderer.on('to-dwn', (event, args) => {
    switch (args.type) {
        case "start-mod-dwn":
            getHashlist(args.mod.Id);
            break;
        case "hashlist-callback":
            dwnMod(args);
            break;
    }
})

function dwnMod(args) {
    console.log(args);
    //var hashlist = args.
};

function getHashlist(id) {
    var args = {
        type: "get-url",
        callback: "hashlist-callback",
        url: APIBaseURL + APIModHashlistURL + id,
        callBackTarget: "to-dwn"
    };
    ipcRenderer.send('to-web', args);
}