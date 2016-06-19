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

var updateMods = [];
var curModId = 0;
var checkListMods = [];

searchUpdates();

//wait for finished starup loop
function waitForStartup(){

    if(checkListMods.length > 0){
        return;
    }

    var args = {
        message: "search-notf"
    };
    ipcRenderer.send('message-to-download', args);

    // load home
    $("#content").load("home.html");
    curentPage = 'home';
}

//show Notification if activated TODO move to extra thread
function showNotf(arg) {
    if (arg.success) {
        document.getElementById('dialog_notf_text').innerHTML = arg.jsonObj.Notification;

        if (arg.jsonObj.UseNotification) {
            var dialog = $('#dialog_notf').data('dialog');
            dialog.open();
        }
    } else {
        if (debug_mode >= 1) {
            console.log('Error requesting Notification: ' + arg.jsonObj);
        };
    }
}


//setup event handler for IPC
ipcRenderer.on('render-receiver', (event, arg) => {
    switch (arg.message) {
        case 'update-progress':
            updateDwnProgress(arg);
            break;
        case 'update-notf-dialog':
            showNotf(arg);
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
function quickCheckResult(arg) {
    if (arg.obj.resultType == 1) {

        var pb1 = $("#pb1").data('progress');
        pb1.set(100)
        var pb2 = $("#pb2").data('progress');
        pb2.set(100);

        var index = checkListMods.indexOf(arg.obj.modId);
        checkListMods.splice(index, 1);

        waitForStartup();

        resetWinProgress();
        document.getElementById('pb1text').innerHTML = "Schnelle Überprüfung beendet";
        document.getElementById('pb2text').innerHTML = "Wahrscheinlich sind alle Dateien Korrekt";
    }else if(arg.obj.resultType == 2){

        var lbl = document.getElementById('lbl_updateModInfo');

        updateMods.push(arg.obj.modId);

        var index = checkListMods.indexOf(arg.obj.modId);
        checkListMods.splice(index, 1);

        waitForStartup();

        lbl.innerHTML = lbl.innerHTML + arg.obj.modId + " ";

        var dialog = $('#dialog_updateInfo').data('dialog');
        dialog.open();
    }
}

//check for updates
function searchUpdates() {

    var installedMods;
    storage.get('mods', function(error, data) {
        if (jQuery.isEmptyObject(data.installedMods)) {
            installedMods = [];
        } else {
            installedMods = data.installedMods;
        }
        checkListMods = installedMods;

        waitForStartup();
        for (i = 0; i < installedMods.length; i++) {
            var args = {
                message: 'start-quickcheck',
                modId: installedMods[i]
            };
            ipcRenderer.send('message-to-download', args);
        }
    });
}

//show quick check success (maybe later more status types)
function fullCheckResult(arg) {
    if (arg.obj.resultType == 1) {

        var pb1 = $("#pb1").data('progress');
        pb1.set(100)
        var pb2 = $("#pb2").data('progress');
        pb2.set(100);
        resetWinProgress();
        document.getElementById('pb1text').innerHTML = "Komplette Überprüfung beendet";
        document.getElementById('pb2text').innerHTML = "Alle Dateien sind auf dem neuesten Stand";
    }
}

//ask hash dialog buttons
function hashDialogClose() {
    var dwnCompleteDialog = $('#dialog_downloadComplete').data('dialog');
    dwnCompleteDialog.close();
    var args = {
        progress: winprogress
    };
    ipcRenderer.send('winprogress-change', args);
    document.getElementById('pb1text').innerHTML = "Download beendet";
    document.getElementById('pb2text').innerHTML = "Spieldateien NICHT auf Fehler geprüft.";
}

function hashDialogConfirm() {
    var args = {
        message: 'start-fullcheck',
        modId : curModId
    };

    ipcRenderer.send('message-to-download', args);
    var dwnCompleteDialog = $('#dialog_downloadComplete').data('dialog');
    dwnCompleteDialog.close();
}

//ask path dialog
function noArmaPathSettings() {
    var dialog_noPath = $('#dialog_noPath').data('dialog');
    dialog_noPath.close();
    loadpage('settings.html');
}

function armaPathisFalse() {
    var pathdialog = $('#dialog_defaultpath').data('dialog');
    pathdialog.close();
    loadpage('settings.html');
    storage.set('settings', {
        armapath: ''
    }, function(error) {});
}

function armaPathisCorrect() {
    var pathdialog = $('#dialog_defaultpath').data('dialog');
    pathdialog.close();
    loadpage('home.html')
}

function callDownloadStop() {
    var args = {
        message: 'stop-download',
        obj: {}
    };
    ipcRenderer.send('message-to-download', args);
}
//show Notification for hash
function showHashDialog(arg) {
    var dialog = $('#dialog_downloadComplete').data('dialog');
    curModId = arg.modId;
    dialog.open();
}

//update status bar
function updateDwnProgress(arg) {

    var totalProgress = ((100 / arg.obj.totalFileSize) * arg.obj.currentDownloadSize).toFixed(4);
    if (totalProgress > 100) {
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
    curDownSize = (arg.obj.currentDownloadSize / 1073741824).toFixed(3);
    maxDownSize = (arg.obj.totalFileSize / 1073741824).toFixed(3);
    if (curDownSize > maxDownSize) {
        curDownSize = maxDownSize;
    }

    var fName = arg.obj.fileObj.FileName;
    fName.replace('.pbo','');

    if(fName.length > 24){
        fName = fName.substr(0,24);
        fName = fName + "...";
    }

    if (arg.progType == 1) {
        document.getElementById('pb1text').innerHTML = totalProgress + "% - " + curDownSize + "GB/" + maxDownSize + "GB";
        document.getElementById('pb2text').innerHTML = fName + " " + ((arg.obj.progressObj.speed) / 1048576).toFixed(2) + " MB/s - noch " + arg.obj.progressObj.eta + "s";
    } else if (arg.progType == 2) {
        resetWinProgress();
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
    if (totalProgress > 100) {
        totalProgress = 100;
    }
    var pb1 = $("#pb1").data('progress');
    pb1.set(totalProgress);
    var pb2 = $("#pb2").data('progress');
    pb2.set(100);
    var winprogress = totalProgress / 100;
    var args = {
        progress: winprogress
    };
    ipcRenderer.send('winprogress-change', args);

    document.getElementById('pb1text').innerHTML = "Prüfe Datei: " + curCount + " / " + arg.obj.totalFileCount;

    var fName = arg.obj.curObj.FileName;
    fName.replace('.pbo','');

    if(fName.length > 24){
        fName = fName.substr(0,24);
        fName = fName + "...";
    }

    document.getElementById('pb2text').innerHTML = "Dateiname: " + fName;
    document.getElementById('pb2text').setAttribute('title',arg.obj.curObj.FileName);
    if (curentPage == "home") {
        $('#lbl_downInfo').html(arg.obj);
    }
}

function loadpage(file) {
    $("#content").load(file);
    enterPage = WinJS.UI.Animation.enterPage(anim, null);
    curentPage = file.replace('.html','');
}

function checkregkey1() {
    var fs = require('fs');

    regKey = new Winreg({
        hive: Winreg.HKLM, // HKEY_LOCAL_MACHINE
        key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App 107410' // Arma 3 Key
    })

    regKey.keyExists(function(err, exists /* array of RegistryItem */ ) {
        if (exists) {
            regKey.values(function(err, items /* array of RegistryItem */ ) {
                path = items[3].value;
                if (debug_mode >= 1) {
                    console.log("RegKeySearch1: found: " + path);
                };
                filepath = (path + "\\arma3.exe");
                if (debug_mode >= 1) {
                    console.log("RegKeySearch1: checking if '" + filepath + "' is a file");
                };
                if (fs.lstatSync(filepath).isFile()) {
                    if (debug_mode >= 1) {
                        console.log("RegKeySearch1: '" + filepath + "'  is a file");
                    };
                    var pathdialog = $('#dialog_defaultpath').data('dialog');
                    $('#armapathtext').html(path);
                    pathdialog.open();
                    path = path + "\\";
                    storage.set('settings', {
                        armapath: path
                    }, function(error) {});
                } else {
                    if (debug_mode >= 1) {
                        console.log("RegKeySearch1: '" + filepath + "'  is not a file");
                    };
                    checkregkey2();
                };
            });
        } else {
            if (debug_mode >= 1) {
                console.log("RegKeySearch1: No Regkey found");
            };
            checkregkey2();
        }
    });
};

function checkregkey2() {
    var fs = require('fs');

    regKey2 = new Winreg({
        hive: Winreg.HKLM, // HKEY_LOCAL_MACHINE
        key: '\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App 107410' // Arma 3 Key
    })

    regKey2.keyExists(function(err, exists /* array of RegistryItem */ ) {
        if (exists) {
            regKey2.values(function(err, items /* array of RegistryItem */ ) {
                path = items[3].value;
                if (debug_mode >= 1) {
                    console.log("RegKeySearch2: found: " + path);
                };
                filepath = (path + "\\arma3.exe");
                if (debug_mode >= 1) {
                    console.log("RegKeySearch2: checking if '" + filepath + "' is a file");
                };
                if (fs.lstatSync(filepath).isFile()) {
                    if (debug_mode >= 1) {
                        console.log("RegKeySearch2: '" + filepath + "'  is a file");
                    };
                    var pathdialog = $('#dialog_defaultpath').data('dialog');
                    $('#armapathtext').html(path);
                    pathdialog.open();
                    path = path + "\\";
                    storage.set('settings', {
                        armapath: path
                    }, function(error) {});
                } else {
                    if (debug_mode >= 1) {
                        console.log("RegKeySearch2: '" + filepath + "'  is not a file");
                    };
                    checkregkey3();
                };
            });
        } else {
            if (debug_mode >= 1) {
                console.log("RegKeySearch2: No Regkey found");
            };
            checkregkey3();
        }
    });
}

function checkregkey3() {
    var fs = require('fs');

    regKey3 = new Winreg({
        hive: Winreg.HKLM, // HKEY_LOCAL_MACHINE
        key: '\\SOFTWARE\\WOW6432Node\\bohemia interactive studio\\ArmA 3' // Arma 3 Key
    })

    regKey3.keyExists(function(err, exists /* array of RegistryItem */ ) {
        if (exists) {
            regKey3.values(function(err, items /* array of RegistryItem */ ) {
                path = items[0].value;
                if (debug_mode >= 1) {
                    console.log("RegKeySearch3: found: " + path);
                };
                filepath = (path + "\\arma3.exe");
                if (debug_mode >= 1) {
                    console.log("RegKeySearch3: checking if '" + filepath + "' is a file");
                };
                if (fs.lstatSync(filepath).isFile()) {
                    if (debug_mode >= 1) {
                        console.log("RegKeySearch3: '" + filepath + "'  is a file");
                    };
                    var pathdialog = $('#dialog_defaultpath').data('dialog');
                    $('#armapathtext').html(path);
                    pathdialog.open();
                    path = path + "\\";
                    storage.set('settings', {
                        armapath: path
                    }, function(error) {});
                } else {
                    if (debug_mode >= 1) {
                        console.log("RegKeySearch3: '" + filepath + "'  is not a file");
                    };
                    storage.set('settings', {
                        armapath: ''
                    }, function(error) {});
                    loadpage('settings.html');
                };
            });
        } else {
            if (debug_mode >= 1) {
                console.log("RegKeySearch3: No Regkey found");
            };
            storage.set('settings', {
                armapath: ''
            }, function(error) {});
            loadpage('settings.html');
        }
    });
}


function resetWinProgress() {
  var args = {
      progress: 0
  };
  ipcRenderer.send('winprogress-change', args);
}
