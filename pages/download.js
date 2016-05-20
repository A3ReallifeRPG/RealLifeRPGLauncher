var dwn = require('dwn');
var progress = require('progress-stream');
var fs = require('fs');
var mkpath = require('mkpath');
window.$ = window.jQuery = require('../resources/jquery/jquery-1.12.3.min.js');

const {ipcRenderer} = require('electron');


var armaPath = "D:/SteamLibrary/SteamApps/common/Arma 3/";
var downloadList = [];
var curFileObj = null;

ipcRenderer.on('download-receiver',(event, arg) => {
    switch (arg.message) {
        case 'start-download':
            console.log('download start');
            getModHashList(18, getHashListCallback);
            break;
        default:
            console.log('Packet dropped');
            break;
    }
})

function getHashListCallback(jsObj) {
    downloadList = jsObj;
    download(downloadList[0]);
}

function download(fileObj) {

    if(quickCheck(fileObj)){
        downloadNext();
        return;
    }

    var dest = armaPath + fileObj.RelativPath;
    curFileObj = fileObj;

    try {
        stats = fs.lstatSync(dest.replace(fileObj.FileName, ''));
        if (stats.isDirectory()) {}

    } catch (e) {
        mkpath(dest.replace(fileObj.FileName, ''), function(err) {
            if (err) throw err;
            console.log('Directory created');
            download(downloadList[0]);
            return;
        });
    }

    var stream = dwn._download('http://213.202.212.13/download/' + fileObj.RelativPath);

    var str = progress({
        length: fileObj.Size,
        time: 100
    });

    str.on('progress', function(progress) {
        //console.log(progress);
        document.getElementById('lbl_downInfo').innerHTML = (progress.percentage).toFixed(2) + "% - " + ((progress.speed)/1000000).toFixed(2) + " MB/s - noch " + progress.eta + "s - " + curFileObj.FileName;
        var args = { type:1,message:"update-progress",obj:((progress.percentage).toFixed(2) + "% - " + ((progress.speed)/1000000).toFixed(2) + " MB/s - noch " + progress.eta + "s - " + curFileObj.FileName)};
        ipcRenderer.send('message-to-render',args);
    });

    stream.on('end', function() {
        downloadNext();
    });

    stream.pipe(str).pipe(fs.createWriteStream(dest));
}

function downloadNext() {

    //quickCheck(curFileObj)

    downloadList.shift();

    if (downloadList.length > 0) {
        download(downloadList[0]);
    } else {

    }

}

function quickCheck(fileObj){
    try{
        var stats = fs.lstatSync(armaPath + fileObj.RelativPath);

        if(stats['size'] != fileObj.Size){
            console.log(fileObj.FileName);
            return false;
        }
        /*
        if(stats['ctime'].getTime() != fileObj.ModifiedAt){
            error = true;
            debugger;
        }*/
        return true;
    }catch(e){
        return false;
    }
}

// http://213.202.212.13/download/%40RealLifeRPG5.0/addons/CUP_Weapons_Bizon.pbo
// size 3910264
