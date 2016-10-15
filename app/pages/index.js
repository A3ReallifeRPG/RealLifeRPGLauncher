const electron = require('electron');
const BrowserWindow = require('electron').remote;
const app = require('electron').remote;
const shell = require('electron').shell;
const storage = require('electron-json-storage');
const Winreg = require('winreg');
const notifier = require('node-notifier');
const winpath = require('path');
const fs = require('fs');
const unzip = require('unzip');
const {
    dialog
} = require('electron').remote;
const {
    ipcRenderer
} = require('electron');

var anim = document.getElementById("content");

var updateMods = [];
var curModId = 0;
var checkListMods = [];
curentPage = "";

checkDebug();
checkVersion();

//show Notification if activated TODO move to extra thread
function showNotf(arg) {
    if (arg.success) {
        document.getElementById('dialog_notf_text').innerHTML = arg.jsonObj.Notification;
        if (arg.jsonObj.UseNotification) {
            var dialog = $('#dialog_notf').data('dialog');
            dialog.open();
            notifyWin('RealLifeRPG Launcher', 'Wichtige Informationen', 'ic_error_outline_white_36dp_2x.png');
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
        case 'full-check-result':
            fullCheckResult(arg);
            break;
        case 'update-tfar-progress':
            updateTFARProgress(arg);
            break;
        case 'progress-cancelled':
            progressCancelled();
            break;
        case 'update-available':
            updateAvailable();
            break;
        case 'no-path-warning':
            resetProgress();
            var dialog = $('#dialog_noPath').data('dialog');
            dialog.open();
            break;
        case 'player-list-callback':
            if (curentPage == "server") {
                setPlayerList(arg.obj.serverId, arg.obj.playerArray);
            };
            break;
        case 'quick-check-updates':
            updateButtons(arg.modList,arg.allMods);
            break;
        default:
            console.log('Packet dropped: ' + arg.message);
            break;
    }
});

function updateButtons(modList,allMods){
    var update_mods_string = "";
    var c = 0;
    for(i = 0; i < allMods.length;i++){
        var mod_id = allMods[i][0];
        if($.inArray(mod_id,modList) != -1){
            document.getElementById('btn_mod_' + mod_id).innerHTML = "Update";
            if(mod_id != 5){ //TODO this sucks, dir scan for installed mods
                update_mods_string += " " + allMods[i][1] + ",";
                c++;
            }
        }else{
            document.getElementById('btn_mod_' + mod_id).innerHTML = "Spielen";
            document.getElementById('btn_mod_' + mod_id).setAttribute('onClick', 'modClickPlay(' + mod_id + ')');
        }
        if ($('#btn_full_' + mod_id).length > 0) {
            document.getElementById('btn_full_' + mod_id).disabled = false;
        }
        document.getElementById('btn_mod_' + mod_id).disabled = false;
        document.getElementById('btn_mod_' + mod_id).setAttribute('class', 'button success');
    }
    if(c > 0){
        update_mods_string = update_mods_string.substring(0, update_mods_string.length - 1);
        var lbl = document.getElementById('lbl_updateModInfo');
        lbl.innerHTML = update_mods_string;

        var dialog = $('#dialog_updateInfo').data('dialog');
        dialog.open();
    }
}

//show quick check success (maybe later more status types)
function fullCheckResult(arg) {
    if (arg.obj.resultType == 1) {
        var pb1 = $("#pb1").data('progress');
        pb1.set(100)
        var pb2 = $("#pb2").data('progress');
        pb2.set(100);
        resetProgress();
        notifyWin('RealLifeRPG Launcher', 'Komplette Überprüfung beendet', 'ic_done_all_white_36dp_2x.png');
        document.getElementById('pb1text').innerHTML = "Komplette Überprüfung beendet";
        document.getElementById('pb2text').innerHTML = "Alle Dateien sind auf dem neuesten Stand";

        document.getElementById('btn_mod_' + curModId).innerHTML = "Spielen";
        document.getElementById('btn_mod_' + curModId).setAttribute('onClick', 'modClickPlay(' + curModId + ')');
        document.getElementById('btn_full_' + curModId).disabled = false;
    }
}

//ask hash dialog buttons
function hashDialogClose() {
    var dwnCompleteDialog = $('#dialog_downloadComplete').data('dialog');
    dwnCompleteDialog.close();
    resetProgress();
    notifyWin('RealLifeRPG Launcher', 'Download abgeschlossen', 'ic_done_white_36dp_2x.png');
    document.getElementById('pb1text').innerHTML = "Download beendet";
    document.getElementById('pb2text').innerHTML = "Spieldateien NICHT auf Fehler geprüft.";

    document.getElementById('btn_mod_' + curModId).innerHTML = "Spielen";
    document.getElementById('btn_mod_' + curModId).setAttribute('onClick', 'modClickPlay(' + curModId + ')');
    document.getElementById('btn_full_' + curModId).disabled = false;
}

function hashDialogConfirm() {
    resetProgress();
    notifyWin('RealLifeRPG Launcher', 'Komplette Überprüfung gestartet', 'ic_description_white_36dp_2x.png');
    var args = {
        message: 'start-fullcheck',
        modId: curModId,
        modUrl: curModUrl
    };
    ipcRenderer.send('message-to-download', args);
    var dwnCompleteDialog = $('#dialog_downloadComplete').data('dialog');
    dwnCompleteDialog.close();
}

//ask path dialog
function noArmaPathSettings() {
    if (debug_mode >= 1) {
        console.log('No arma path found');
    };
    var dialog_noPath = $('#dialog_noPath').data('dialog');
    dialog_noPath.close();
    loadpage('settings.html');
}

function armaPathisFalse() {
    if (debug_mode >= 1) {
        console.log('Arma path is not viable...');
    };
    var pathdialog = $('#dialog_defaultpath').data('dialog');
    pathdialog.close();
    loadpage('settings.html');
    storage.set('settings', {
        armapath: '',
        toast: true,
        sounds: true
    }, function(error) {});
}

function armaPathisCorrect() {
    var pathdialog = $('#dialog_defaultpath').data('dialog');
    pathdialog.close();
    loadpage('home.html')
}

function callDownloadStop() {
    if (debug_mode >= 1) {
        console.log('Stopping progress');
    };
    var args = {
        message: 'stop-download',
        obj: {}
    };
    ipcRenderer.send('message-to-download', args);
    var args = {
        message: 'stop-hashing',
        obj: {}
    };
    ipcRenderer.send('message-to-download', args);
}
//show Notification for hash
function showHashDialog(arg) {
    var dialog = $('#dialog_downloadComplete').data('dialog');
    curModId = arg.modId;
    curModUrl = arg.modUrl;

    if(curModId == 0){
        $("#content").load("home");
        enterPage = WinJS.UI.Animation.enterPage(anim, null);
        curentPage = file.replace('.html', '');
    }

    dialog.open();
}


function updateTFARProgress(arg) {
    var pb2 = $("#pb2").data('progress');
    if (arg.progType == 1) {
        pb2.set(arg.obj.progressObj.percentage);
        var winprogress = arg.obj.progressObj.percentage / 100;
        var args = {
            progress: winprogress
        };
        ipcRenderer.send('winprogress-change', args);
        document.title = "RealLifeRPG Launcher - " + arg.obj.progressObj.percentage.toFixed(1) + "%";
        document.getElementById('pb2text').innerHTML = "TFAR Download " + ((arg.obj.progressObj.speed) / 1048576).toFixed(2) + " MB/s - noch " + arg.obj.progressObj.eta + "s";
    } else if (arg.progType == 2) {
        $('#step2').css("visibility","visible");
        setTimeout(function() {
            resetProgress();
            var dpath = winpath.join(__dirname,"../../TFAR/TFARReallifeRPG.ts3_plugin");
            if(!shell.openItem(dpath)) {
              $('#step2_status').html("Fehlgeschlagen");
              $('#step3').css("visibility","visible");
              var stream = fs.createReadStream(dpath).pipe(unzip.Extract({ path: 'TFAR/Teamspeak3Ordner' }));
              stream.on('close', function(){
                fs.unlinkSync(winpath.join(__dirname,"../../TFAR/Teamspeak3Ordner/package.ini"));
                shell.showItemInFolder(dpath);
                $('#step4').css("visibility","visible");
              });
            };
            $('#downloadtfar').attr("disabled", false);
        }, 500);
    };
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
    document.title = "RealLifeRPG Launcher - " + totalProgress + "%";
    curDownSize = parseFloat((arg.obj.currentDownloadSize / 1073741824).toFixed(3));
    maxDownSize = parseFloat((arg.obj.totalFileSize / 1073741824).toFixed(3));

    if (curDownSize > maxDownSize) {
        curDownSize = maxDownSize;
    };

    var fName = arg.obj.fileObj.FileName;
    fName.replace('.pbo', '');

    if (fName.length > 24) {
        fName = fName.substr(0, 24);
        fName = fName + "...";
    }

    if (arg.progType == 1) {
        document.getElementById('pb1text').innerHTML = totalProgress + "% - " + curDownSize + "GB/" + maxDownSize + "GB";
        document.getElementById('pb2text').innerHTML = fName + " " + ((arg.obj.progressObj.speed) / 1048576).toFixed(2) + " MB/s - noch " + arg.obj.progressObj.eta + "s";
    } else if (arg.progType == 2) {
        resetProgress();
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

    document.title = "RealLifeRPG Launcher - " + totalProgress + "%";

    document.getElementById('pb1text').innerHTML = "Prüfe Datei: " + curCount + " / " + arg.obj.totalFileCount;

    var fName = arg.obj.curObj.FileName;
    fName.replace('.pbo', '');

    if (fName.length > 24) {
        fName = fName.substr(0, 24);
        fName = fName + "...";
    }

    document.getElementById('pb2text').innerHTML = "Dateiname: " + fName;
    document.getElementById('pb2text').setAttribute('title', arg.obj.curObj.FileName);
    if (curentPage == "home") {
        $('#lbl_downInfo').html(arg.obj);
    }
}

function loadpage(file) {
    $("#content").load(file);
    enterPage = WinJS.UI.Animation.enterPage(anim, null);
    curentPage = file.replace('.html', '');
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
                        armapath: path,
                        toast: true,
                        sounds: true
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
                        armapath: path,
                        toast: true,
                        sounds: true
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
                        armapath: path,
                        toast: true,
                        sounds: true
                    }, function(error) {});
                } else {
                    if (debug_mode >= 1) {
                        console.log("RegKeySearch3: '" + filepath + "'  is not a file");
                    };
                    storage.set('settings', {
                        armapath: '',
                        toast: true,
                        sounds: true
                    }, function(error) {});
                    loadpage('settings.html');
                };
            });
        } else {
            if (debug_mode >= 1) {
                console.log("RegKeySearch3: No Regkey found");
            };
            storage.set('settings', {
                armapath: '',
                toast: true,
                sounds: true
            }, function(error) {});
            loadpage('settings.html');
        }
    });
}

function resetProgress() {
    if (debug_mode >= 1) {
        console.log('Resetting progress');
    };
    $('#btn_cancel_progress').delay(500).fadeOut('slow');
    setTitle();
    var args = {
        progress: 0
    };
    ipcRenderer.send('winprogress-change', args);
    document.getElementById('pb1text').innerHTML = "";
    document.getElementById('pb2text').innerHTML = "";
    var pb1 = $("#pb1").data('progress');
    pb1.set(100)
    var pb2 = $("#pb2").data('progress');
    pb2.set(100);
}

ipcRenderer.on('update-downloaded', (event, arg) => {
    if (debug_mode >= 1) {
        console.log('Launcher update downloaded');
    };
    $('#btn_update_restart').css({
        'visibility': 'visible'
    });
    notifyWinRestart('RealLifeRPG Launcher', 'Update heruntergeladen, bitte den Launcher neustarten', 'ic_done_white_36dp_2x.png');
    if (debug_mode >= 1) {
        console.log(arg);
    };
});

function notifyWin(title, text, icon) {
    storage.get('settings', function(error, data) {
        if (data.toast == "") {
            toast = true;
        } else {
            toast = data.toast;
        };
        if (data.sounds == "") {
            sounds = true;
        } else {
            sounds = data.sounds;
        };
        if (toast) {
            notifier.notify({
                title: title,
                message: text,
                icon: winpath.join(__dirname, '../../extracted/icon/' + icon),
                sound: sounds,
                wait: true
            }, function(err, response) {
                ipcRenderer.send('focus-window');
            });
        }
    });
}

function notifyWinRestart(title, text, icon) {
    storage.get('settings', function(error, data) {
        if (data.toast == "") {
            toast = true;
        } else {
            toast = data.toast;
        };
        if (data.sounds == "") {
            sounds = true;
        } else {
            sounds = data.sounds;
        };
        if (toast) {
            notifier.notify({
                title: title,
                message: text,
                icon: winpath.join(__dirname, '../../extracted/icon/' + icon),
                sound: sounds,
                wait: true
            }, function(err, response) {
                restartOnUpdate();
            });
        }
    });
}

function extractIconsFromAsar() {
    if (debug_mode >= 1) {
        console.log('Extracting icons from asar');
    };
    var fs = require('fs');
    var dir1 = 'resources/extracted';
    var dir2 = 'resources/extracted/icon';

    if (!fs.existsSync(dir1)) {
        fs.mkdirSync(dir1);
    };
    if (!fs.existsSync(dir2)) {
        fs.mkdirSync(dir2);
    };
    filesToExtract.forEach(function(entry) {
        fs.createReadStream('resources/app.asar/icon/' + entry).pipe(fs.createWriteStream('resources/extracted/icon/' + entry));
    });
}

function restartOnUpdate() {
    if (debug_mode >= 1) {
        console.log('Restarting');
    };
    ipcRenderer.send('restartOnUpdate');
}

function checkVersion() {
    if (debug_mode >= 1) {
        console.log('Checking version');
    };
    var version = app.app.getVersion();
    storage.get('version', function(error, data) {
        if (jQuery.isEmptyObject(data)) {
            setVersion();
        } else if (data.version != version) {
            extractIconsFromAsar();
            notifyWin('RealLifeRPG Launcher', 'Launcher geupdated!', 'ic_done_white_36dp_2x.png');
            setVersion();
        }
    });
}

function setVersion() {
    var version = app.app.getVersion();
    storage.set('version', {
        version: version
    }, function(error) {});
}

function progressCancelled() {
    if (debug_mode >= 1) {
        console.log('Progress cancelled');
    };
    notifyWin('RealLifeRPG Launcher', 'Abgebrochen', 'ic_clear_white_36dp_2x.png');
    resetProgress();
    $.Notify({
        caption: 'Abgebrochen',
        content: ' ',
        type: 'warning'
    });
}

function openUrl(url) {
    if (debug_mode >= 1) {
        console.log('Opening url: ' + url);
    };
    shell.openExternal(url);
}

function toggleDebug(state) {
    ipcRenderer.send('toggle-devtools');
    if (state) {
        document.title = "RealLifeRPG Launcher - Beta - " + app.app.getVersion() + " - Debug";
        if (debug_mode >= 1) {
            console.log('Enabling debug mode');
        };
    } else {
        document.title = "RealLifeRPG Launcher - Beta - " + app.app.getVersion();
        if (debug_mode >= 1) {
            console.log('Disabling debug mode');
        };
    }
}

function checkDebug() {
    storage.get('settings', function(error, data) {
        var debug = data.debug;
        if (debug) {
            document.title = "RealLifeRPG Launcher - Beta - " + app.app.getVersion() + " - Debug";
                console.log('Running in Debug mode');
            debug_mode = 2;
            ipcRenderer.send('open-devtools');
        } else {
          debug_mode = 0;
        }
    });
}

function setTitle() {
    storage.get('settings', function(error, data) {
        var debug = data.debug;
        if (debug) {
            debug_mode = 2;
            document.title = "RealLifeRPG Launcher - Beta - " + app.app.getVersion() + " - Debug";
        } else {
            debug_mode = 0;
            document.title = "RealLifeRPG Launcher - Beta - " + app.app.getVersion();
        }
    });
}
