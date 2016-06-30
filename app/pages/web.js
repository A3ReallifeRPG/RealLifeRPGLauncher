const storage = require('electron-json-storage');
var dwn = require('dwn');
var progress = require('progress-stream');
var fs = require('fs');
var mkpath = require('mkpath');
window.$ = window.jQuery = require('../resources/jquery/jquery-1.12.3.min.js');
var task_force_installer = "https://realliferpg.de/TFARReallifeRPG.ts3_plugin";
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
        default:
            if (debug_mode >= 2) {
                console.log('Packet dropped');
            };
            break;
    }
})

function downloadTFAR() {
    isDownloading = true;

    var dest = 'TFARReallifeRPG.ts3_plugin';

    var stream = dwn._download(task_force_installer);

    var str = progress({
        length: "9299813",
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
