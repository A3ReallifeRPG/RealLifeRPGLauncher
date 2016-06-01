var dwn = require('dwn');
var progress = require('progress-stream');
var fs = require('fs');
var mkpath = require('mkpath');
window.$ = window.jQuery = require('../resources/jquery/jquery-1.12.3.min.js');

const {
    ipcRenderer
} = require('electron');


var armaPath = "D:/SteamLibrary/SteamApps/common/Arma 3/"; //TODO use settings path
var downloadList = [];
var checkList = [];
var errorList = [];

var curFileObj = null;
var curHashObj = null;
var totalFileSize = 0;
var currentDownloadSize = 0;

var isDownloading = false;

ipcRenderer.on('download-receiver', (event, arg) => {
    switch (arg.message) {
        case 'start-download':
            if(debug_mode >= 2){console.log('download start');};
            getModHashList(18, getHashListCallback);
            break;
        default:
            if(debug_mode >= 2){console.log('Packet dropped');};
            break;
    }
})

function getHashListCallback(jsObj) {
    downloadList = jsObj;
    calcDownloadStats();
    preDownloadCheck();
    download(downloadList[0]);
    //fullCheck();
}

function calcDownloadStats() {
    totalFileSize = 0;
    for (i = 0; i < downloadList.length; i++) {
        totalFileSize = totalFileSize + downloadList[i].Size;
    }
}

function preDownloadCheck(){
    currentDownloadSize = 0;
    checkList = [];

    for(i = 0; i < downloadList.length; i++){
        fileObj = downloadList[i];
        if (!quickCheck(fileObj)) {
            checkList.push(fileObj);
        };
    }
    downloadList = checkList;
    checkList = []; //free potantially large amount of memory
}

function download(fileObj) {
    isDownloading = true;

    var dest = armaPath + fileObj.RelativPath;
    curFileObj = fileObj;

    try {
        stats = fs.lstatSync(dest.replace(fileObj.FileName, ''));
        if (stats.isDirectory()) {};
    } catch (e) {
        mkpath(dest.replace(fileObj.FileName, ''), function() {
            if(debug_mode >= 2){console.log('Directory created');};
            download(downloadList[0]);
            return;
        });
    };

    var stream = dwn._download('http://213.202.212.13/download/' + fileObj.RelativPath); //TODO hardcoded IP

    var str = progress({
        length: fileObj.Size,
        time: 100
    });

    str.on('progress', function(progress) {
        document.getElementById('lbl_downInfo').innerHTML = (progress.percentage).toFixed(2) + "% - " + ((progress.speed) / 1048576).toFixed(2) + " MB/s - noch " + progress.eta + "s - " + curFileObj.FileName;
        var args = {
            type: 1,
            message: "update-progress",
            obj: {
                fileObj: curFileObj,
                progressObj: progress,
                totalFileSize : totalFileSize,
                currentDownloadSize : currentDownloadSize
            }
        };
        ipcRenderer.send('message-to-render', args);
    });

    stream.on('end', function() {
        currentDownloadSize = currentDownloadSize + curFileObj.Size;
        downloadNext();
    });

    stream.pipe(str).pipe(fs.createWriteStream(dest));
}

function downloadNext() {

    if(!(quickCheck(curFileObj))){
        errorList.push(curFileObj);
    }

    checkList.push(curFileObj);
    downloadList.shift();

    if (downloadList.length > 0) {
        download(downloadList[0]);
    } else {
        isDownloading = false;
        var args = {
            type: 1,
            message: "ask-hash",
            obj: {}
        };
        ipcRenderer.send('message-to-render', args);
    }

}

function quickCheck(fileObj) {
    try {
        var stats = fs.lstatSync(armaPath + fileObj.RelativPath);

        if (stats['size'] != fileObj.Size) {
            return false;
        }

        currentDownloadSize = currentDownloadSize + fileObj.Size;
        return true;
    } catch (e) {
        return false;
    }

}

function fullCheck() {

    if (downloadList.length > 0) {
        var fs = require('fs');
        var crypto = require('crypto');

        curHashObj = downloadList[0];

        var file = fs.createReadStream(armaPath + curHashObj.RelativPath);

        var hash = crypto.createHash('md5');
        hash.setEncoding('hex');

        file.on('end', function () {
            hash.end();
            var fileHash = hash.read().toUpperCase();
            if(debug_mode >= 2){console.log('download: ' + fileHash + ' - original: ' + curHashObj.Hash + ' for file ' + curHashObj.FileName);};

            if(!(fileHash === curHashObj.Hash)){
                errorList.push(curHashObj);
                if(debug_mode >= 2){console.log('invalid checksum for: ' + curHashObj.FileName);};
            }
            downloadList.shift();
            fullCheck();
        });

        file.on('error',function(){
            //console.log('invalid checksum for: ' + curHashObj.FileName);
            errorList.push(curHashObj);
            downloadList.shift();
            fullCheck();
        });

        file.pipe(hash);
    } else {
        console.log('Error List length: ' + errorList.length);
    }

}
