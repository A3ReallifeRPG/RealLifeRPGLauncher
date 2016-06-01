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

function showNotf(jsonData, success) {
    if (success) {
        document.getElementById('dialog_notf_text').innerHTML = jsonData.Notification;

        if (jsonData.UseNotification) {
            var dialog = $('#dialog_notf').data('dialog');
            dialog.open();
        }
    } else {
        console.log('Error requesting Notification: ' + jsonData);
    }
}


ipcRenderer.on('render-receiver', (event, arg) => {
    switch (arg.message) {
        case 'update-progress':
            updateDwnProgress(arg);
            break;
        default:
            console.log('Packet dropped');
            break;
    }
})


function updateDwnProgress(arg) {
    var totalProgress = (((100 / arg.obj.totalFileSize) * arg.obj.currentDownloadSize) / 100).toFixed(4);
    var pb1 = $("#pb1").data('progress');
    pb1.set(totalProgress);
    var pb2 = $("#pb2").data('progress');
    pb2.set(arg.obj.progressObj.percentage);
    var winprogress = arg.obj.progressObj.percentage / 100;
    var args = {
        progress: winprogress
    };
    ipcRenderer.send('winprogress-change', args);
    document.getElementById('pb1text').innerHTML = totalProgress + "% " + (arg.obj.currentDownloadSize/1073741824).toFixed(3) + "GB/" + (arg.obj.totalFileSize/1073741824).toFixed(3) + "GB";
    document.getElementById('pb2text').innerHTML = (arg.obj.progressObj.percentage).toFixed(2) + "% - " + ((arg.obj.progressObj.speed) / 1048576).toFixed(2) + " MB/s - noch " + arg.obj.progressObj.eta + "s - " + arg.obj.fileObj.FileName;
    if (curentPage == "home") {
        $('#lbl_downInfo').html(arg.obj);
    }
}
