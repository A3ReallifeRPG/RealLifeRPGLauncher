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

//show Notification if activated TODO move to extra thread
function showNotf(jsonData, success) {
    if (success) {
        document.getElementById('dialog_notf_text').innerHTML = jsonData.Notification;

        if (jsonData.UseNotification) {
            var dialog = $('#dialog_notf').data('dialog');
            dialog.open();
        }
    } else {
        if(debug_mode >= 2){console.log('Error requesting Notification: ' + jsonData);};
    }
}

//setup event handler for IPC
ipcRenderer.on('render-receiver', (event, arg) => {
    switch (arg.message) {
        case 'update-progress':
            updateDwnProgress(arg);
            break;
        case 'ask-hash':
            showHashDialog(arg);
            break;
        default:
            console.log('Packet dropped');
            break;
    }
})

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
    var winprogress = arg.obj.progressObj.percentage / 100;
    var args = {
        progress: totalProgress
    };
    ipcRenderer.send('winprogress-change', args); //WHAT TODO @Greeny war ich das ?
    curDownSize = (arg.obj.currentDownloadSize/1073741824).toFixed(3);
    maxDownSize = (arg.obj.totalFileSize/1073741824).toFixed(3);
    if(curDownSize > maxDownSize){
        curDownSize = maxDownSize;
    }
    document.getElementById('pb1text').innerHTML = totalProgress + "% - " + curDownSize + "GB/" + maxDownSize + "GB";
    document.getElementById('pb2text').innerHTML = (arg.obj.progressObj.percentage).toFixed(2) + "% - " + ((arg.obj.progressObj.speed) / 1048576).toFixed(2) + " MB/s - noch " + arg.obj.progressObj.eta + "s - " + arg.obj.fileObj.FileName;
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
