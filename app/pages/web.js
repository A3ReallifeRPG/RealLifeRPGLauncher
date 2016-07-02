const storage = require('electron-json-storage');
var dwn = require('dwn');
var progress = require('progress-stream');
var fs = require('fs');
var mkpath = require('mkpath');
window.$ = window.jQuery = require('../resources/jquery/jquery-1.12.3.min.js');
const {
    ipcRenderer
} = require('electron');

ipcRenderer.on('webwin-receiver', (event, arg) => {
    switch (arg.message) {
        case 'download-tfar':
            if (debug_mode >= 2) {
                console.log('TFAR-download start');
            };
            downloadTFAR();
            break;
        case 'get-server-player':
            if (debug_mode >= 2) {
                console.log('Server Player Query started');
            };
            getServerClients(arg.serverId,queryPlayerInfocallback);
            break;
        default:
            if (debug_mode >= 2) {
                console.log('Packet dropped');
            };
            break;
    }
})

function queryPlayerInfocallback(jsObj,sId){
    array = [];
    for(i = 0; i < jsObj.Playernames.length; i++){
        array.push(jsObj.Playernames[i]);
    }

    var args = {
        message: "player-list-callback",
        obj: {
            serverId: sId,
            playerArray: array
        }
    };
    ipcRenderer.send('message-to-render', args);
}

function downloadTFAR() {
    isDownloading = true;

    var dest = 'TFARReallifeRPG.ts3_plugin';

    var stream = dwn._download(task_force_installer);

    var str = progress({
        length: task_force_installer_size,
        time: 100
    });

    str.on('progress', function(progress) {
        document.getElementById('lbl_webInfo').innerHTML = (progress.percentage).toFixed(2) + "% - " + ((progress.speed) / 1048576).toFixed(2) + " MB/s - noch " + progress.eta + "s - ";
        var args = {
            progType: 1,
            message: "update-tfar-progress",
            obj: {
                progressObj: progress
            }
        };
        ipcRenderer.send('message-to-render', args);
    });

    stream.on('end', function() {
      var args = {
          progType: 2,
          message: "update-tfar-progress",
          obj: {
              progressObj: progress
          }
      };
      ipcRenderer.send('message-to-render', args);
    });

    stream.pipe(str).pipe(fs.createWriteStream(dest));
}
