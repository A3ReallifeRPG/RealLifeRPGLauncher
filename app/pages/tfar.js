function downloadTFAR() {
  $('#downloadtfar').attr("disabled", true);
  $('#step1').css("visibility","visible");
    if (debug_mode >= 1) {
        console.log('Sending IPC to webWin for TFAR download');
    };
    var args = {
        type: 1,
        message: "download-tfar"
    }
    ipcRenderer.send('message-to-webwin', args);
};

function installUserconfig() {
    if (debug_mode >= 1) {
        console.log('Installing userconfig');
    };
    storage.get('settings', function(error, data) {
        var path = data.armapath;
        var fs = require('fs');
        var dir1 = path + 'userconfig';
        var dir2 = path + 'userconfig/task_force_radio';
        if (!fs.existsSync(dir1)) {
            fs.mkdirSync(dir1);
        };
        if (!fs.existsSync(dir2)) {
            fs.mkdirSync(dir2);
        };
        fs.stat(path + 'userconfig/task_force_radio/radio_settings.hpp', function(err, stat) {
            if (err == null) {
                var dialog = $('#dialog_hppExists').data('dialog');
                dialog.open();
            } else if (err.code == 'ENOENT') {
                writeHPPFile();
            }
        });
    })
}

function writeHPPFile() {
    if (debug_mode >= 1) {
        console.log('Writing arma3/userconfig .hpp file');
    };
    storage.get('settings', function(error, data) {
        var path = data.armapath;
        var fs = require('fs');
        fs.writeFile(path + 'userconfig/task_force_radio/radio_settings.hpp', tfarhpp, function(err) {
            if (err) {
                return console.log(err);
            }
            notifyWin('RealLifeRPG Launcher', 'TFAR Settings Datei erstellt', 'ic_done_white_36dp_2x.png');
            var dialog = $('#dialog_hppExists').data('dialog');
            dialog.close();
        });
    })
}

function installFull() {

    if (debug_mode >= 1) {
        console.log('Full tfar installation started');
    };
    storage.get('settings', function(error, data) {
        if (data.armapath == "") {
            var dialog = $('#dialog_noPath').data('dialog');
            dialog.open();
        } else {
            downloadTFAR();
            installUserconfig();
        };
    })
}

function installUserconfigOnly() {
    storage.get('settings', function(error, data) {
        if (data.armapath == "") {
            var dialog = $('#dialog_noPath').data('dialog');
            dialog.open();
        } else {
            installUserconfig();
        };
    })
}
