const electron = require('electron');
const BrowserWindow = require('electron').remote
const app = require('electron').remote
const shell = require('electron').shell;
const storage = require('electron-json-storage')
const Winreg = require('winreg')
const {
    dialog
} = require('electron').remote
const {
    ipcRenderer
} = require('electron');
getLauncherNotification(showNotf);
searchUpdates();

//show Notification if activated TODO move to extra thread
function showNotf(jsonData, success) {
    if (success) {
        document.getElementById('dialog_notf_text').innerHTML = jsonData.Notification;

        if (jsonData.UseNotification) {
            var dialog = $('#dialog_notf').data('dialog');
            dialog.open();
        }
    } else {
        if(debug_mode >= 1){console.log('Error requesting Notification: ' + jsonData);};
    }
}


//setup event handler for IPC
ipcRenderer.on('render-receiver', (event, arg) => {
    switch (arg.message) {
        case 'update-progress':
            updateDwnProgress(arg);
            break;
        case 'update-hash-progress':
            updateHashProgress(arg);
            break;
        case 'ask-hash':
            showHashDialog(arg);
            break;
        case 'quick-check-result':
            quickCheckResult(arg);
            break;
        case 'full-check-result':
            fullCheckResult(arg);
            break;
        case 'no-path-warning':
            var dialog = $('#dialog_noPath').data('dialog');
            dialog.open();
            break;
        default:
            console.log('Packet dropped');
            break;
    }
})

//show quick check success (maybe later more status types)
function quickCheckResult(arg){
    if(arg.obj.resultType == 1){

        var pb1 = $("#pb1").data('progress');
        pb1.set(100)
        var pb2 = $("#pb2").data('progress');
        pb2.set(100);

        document.getElementById('pb1text').innerHTML = "Schnelle Überprüfung beendet";
        document.getElementById('pb2text').innerHTML = "Wahrscheinlich sind alle Dateien Korrekt";
    }
}

//check for updates
function searchUpdates(){

    var installedMods;
    storage.get('settings', function(error, data) {
        if (jQuery.isEmptyObject(data.installedMods)) {
            installedMods = [];
        }else{
            installedMods = data.installedMods;
        }

        for(i = 0; i < installedMods.length; i++){
            var args = {message: 'start-quickcheck',modId: installedMods[i]};
            ipcRenderer.send('message-to-download', args);
        }
    });
}

//show quick check success (maybe later more status types)
function fullCheckResult(arg){
    if(arg.obj.resultType == 1){

        var pb1 = $("#pb1").data('progress');
        pb1.set(100)
        var pb2 = $("#pb2").data('progress');
        pb2.set(100);

        document.getElementById('pb1text').innerHTML = "Komplette Überprüfung beendet";
        document.getElementById('pb2text').innerHTML = "Alle Dateien sind auf dem neuesten Stand";
    }
}

//ask hash dialog buttons
function hashDialogClose(){
    var dwnCompleteDialog = $('#dialog_downloadComplete').data('dialog');
    dwnCompleteDialog.close();
    document.getElementById('pb1text').innerHTML = "Download beendet";
    document.getElementById('pb2text').innerHTML = "Spieldateien NICHT auf Fehler geprüft.";
}

function hashDialogConfirm(){
    var args = {message: 'start-fullcheck',obj: {}};
    ipcRenderer.send('message-to-download', args);
    var dwnCompleteDialog = $('#dialog_downloadComplete').data('dialog');
    dwnCompleteDialog.close();
}

//ask path dialog
function noArmaPathSettings(){
    var dialog_noPath = $('#dialog_noPath').data('dialog');
    dialog_noPath.close();
    $("#content").load("settings.html");
    curentPage = 'settings';
}


function callDownloadStop(){
    var args = {message: 'stop-download',obj: {}};
    ipcRenderer.send('message-to-download', args);
}
//show Notification for hash
function showHashDialog(arg){
    var dialog = $('#dialog_downloadComplete').data('dialog');
    dialog.open();
}

//update status bar
function updateDwnProgress(arg) {

    var totalProgress = ((100 / arg.obj.totalFileSize) * arg.obj.currentDownloadSize).toFixed(4);
    if(totalProgress > 100){
        totalProgress = 100; //i knwo its cheating but what should I do ?
    }
    var pb1 = $("#pb1").data('progress');
    pb1.set(totalProgress);
    var pb2 = $("#pb2").data('progress');
    pb2.set(arg.obj.progressObj.percentage);
    var winprogress = totalProgress / 100;
    var args = {
        progress: winprogress
    };
    ipcRenderer.send('winprogress-change', args);
    curDownSize = (arg.obj.currentDownloadSize/1073741824).toFixed(3);
    maxDownSize = (arg.obj.totalFileSize/1073741824).toFixed(3);
    if(curDownSize > maxDownSize){
        curDownSize = maxDownSize;
    }

    if(arg.progType == 1){
        document.getElementById('pb1text').innerHTML = totalProgress + "% - " + curDownSize + "GB/" + maxDownSize + "GB";
        document.getElementById('pb2text').innerHTML = (arg.obj.progressObj.percentage).toFixed(2) + "% - " + ((arg.obj.progressObj.speed) / 1048576).toFixed(2) + " MB/s - noch " + arg.obj.progressObj.eta + "s - " + arg.obj.fileObj.FileName;
    }else if(arg.progType == 2){
        document.getElementById('pb1text').innerHTML = "Download Angehalten";
        document.getElementById('pb2text').innerHTML = "";
    }

    //TODO what is that ?
    if (curentPage == "home") {
        $('#lbl_downInfo').html(arg.obj);
    }

}

//update status bar for hashing
function updateHashProgress(arg) {
    curCount = arg.obj.totalFileCount - arg.obj.leftFileCount;
    var totalProgress = ((100 / arg.obj.totalFileCount) * curCount).toFixed(1);
    if(totalProgress > 100){
        totalProgress = 100;
    }
    var pb1 = $("#pb1").data('progress');
    pb1.set(totalProgress);
    var pb2 = $("#pb2").data('progress');
    pb2.set(100);
    var args = {
        progress: totalProgress
    };
    ipcRenderer.send('winprogress-change', args);

    document.getElementById('pb1text').innerHTML = "Prüfe Datei: " + curCount + " / " + arg.obj.totalFileCount;
    document.getElementById('pb2text').innerHTML = "Dateiname: " + arg.obj.curObj.FileName;
    if (curentPage == "home") {
        $('#lbl_downInfo').html(arg.obj);
    }
}

//whatever this is
function runPB1() {
    clearInterval(interval1);
    var pb = $("#pb1").data('progress');
    var val = 0;

    interval1 = setInterval(function() {
        val += 0.1;
        pb.set(val);
        if (val >= 100) {
            val = 0;
            clearInterval(interval1);
            runPB1()
        }
    }, 10);
}
