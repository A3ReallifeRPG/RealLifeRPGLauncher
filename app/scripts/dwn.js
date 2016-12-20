var dwn = require('dwn');
var progress = require('progress-stream');
var fs = require('fs');
var mkpath = require('mkpath');
window.$ = window.jQuery = require('../resources/jquery/jquery-1.12.3.min.js');

const {
    ipcRenderer
} = require('electron');

ipcRenderer.on('to-dwn', (event, arg) => {
    switch (arg.type) {
        case "start-mod-dwn" :
            alert("kappa");
            break;
    }
})
