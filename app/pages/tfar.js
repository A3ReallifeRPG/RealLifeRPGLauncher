function downloadTFAR() {
    var args = {
        type: 1,
        message: "download-tfar"
    }
    ipcRenderer.send('message-to-webwin', args);
};

function installUserconfig() {
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
        fs.writeFile(path + 'userconfig/task_force_radio/radio_settings.hpp', tfarhpp, function(err) {
            if (err) {
                return console.log(err);
            }
        });
    })
}


function installFull() {
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
