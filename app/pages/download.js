const storage = require('electron-json-storage');
var dwn = require('dwn');
var progress = require('progress-stream');
var fs = require('fs');
var mkpath = require('mkpath');
window.$ = window.jQuery = require('../resources/jquery/jquery-1.12.3.min.js');

const {
    ipcRenderer
} = require('electron');

var armaPath = "";
var downloadList = [];
var delList = [];
var downloadListTotalSize = 0;
var checkList = [];
var errorList = [];

var curFileObj = null;
var curHashObj = null;
var totalFileSize = 0;
var currentDownloadSize = 0;
var currentModId = 0;

var cancelDownload = false;
var isDownloading = false;

var timert = true;

ipcRenderer.on('download-receiver', (event, arg) => {
    switch (arg.message) {
        case 'start-download':
            if (debug_mode >= 2) {
                console.log('download start');
            };
            storage.get('settings', function(error, data) {
                if (data.armapath == "") {
                    var args = {
                        message: "no-path-warning"
                    };
                    ipcRenderer.send('message-to-render', args);
                } else {
                    armaPath = data.armapath;
                    getModHashList(arg.modId, getHashListCallback);

                    storage.get('settings', function(error, data) {
                        if (jQuery.isEmptyObject(data.installedMods)) {
                            installedMods = [];
                        } else {
                            installedMods = data.installedMods;
                        }
                        if (!(arg.modId in installedMods)) {
                            installedMods.push(arg.modId);
                            storage.set('mods', {
                                installedMods: installedMods
                            }, function(error) {});
                        }

                    });
                };
            });
            break;
        case 'start-fullcheck':
            if (debug_mode >= 2) {
                console.log('fullCheck start');
            };
            storage.get('settings', function(error, data) {
                if (data.armapath == "") {
                    var args = {
                        message: "no-path-warning"
                    };
                    ipcRenderer.send('message-to-render', args);
                } else {
                    armaPath = data.armapath;
                    getModHashList(arg.modId, getHashFullCheckCallback);
                };
            });
            break;
        case 'start-quickcheck':
            if (debug_mode >= 2) {
                console.log('quickCheck start');
            };
            storage.get('settings', function(error, data) {
                if (data.armapath == "") {
                    var args = {
                        message: "no-path-warning"
                    };
                    ipcRenderer.send('message-to-render', args);
                } else {
                    currentModId = arg.modId;
                    armaPath = data.armapath;
                    getModHashList(arg.modId, getHashQuickCheckCallback);
                };
            });
            break;
        case 'stop-download':
            if (debug_mode >= 2) {
                console.log('stop download');
            };
            cancelDownload = true;
            break;
        case 'search-notf':
            //load Notification
            getLauncherNotification(notfCallback);
            break;
        default:
            if (debug_mode >= 2) {
                console.log('Packet dropped');
            };
            break;
    }
})

function notfCallback(json, success) {

    var args = {
        message: "update-notf-dialog",
        jsonObj: json,
        success: success
    };
    ipcRenderer.send('message-to-render', args);
}

function getHashListCallback(jsObj) {
    cancelDownload = false;
    downloadList = jsObj;
    deleteFiles(downloadList);
    calcDownloadStats();
    preDownloadCheck();
    if (downloadList.length > 0) {
        download(downloadList[0]);
    } else {
        isDownloading = false;
        var args = {
            type: 1,
            message: "ask-hash",
            modId: currentModId
        };
        ipcRenderer.send('message-to-render', args);
    };
}

function getHashFullCheckCallback(jsObj) {
    cancelDownload = false;
    downloadList = jsObj;
    downloadListTotalSize = downloadList.length;
    deleteFiles(downloadList);
    fullCheck();
}

function getHashQuickCheckCallback(jsObj) {
    cancelDownload = false;
    downloadList = jsObj;
    calcDownloadStats();
    preDownloadCheck();
    if (downloadList.length > 0) {
        var args = {
            message: "quick-check-result",
            obj: {
                resultType: 2, //1 = success, 2 = update
                modId: currentModId
            }
        };
        ipcRenderer.send('message-to-render', args);
    } else {
        var args = {
            message: "quick-check-result",
            obj: {
                resultType: 1 //1 = success, 2 = update
            }
        };
        ipcRenderer.send('message-to-render', args);
    }
}

//D:\SteamLibrary\SteamApps\common\Arma 3\@RealLifeRPG5.0\addons\abramia.pbo.RL_RPG_201605151413.bisign
function deleteFiles(fileList) {
    var fs = require('fs');
    var rec = require('recursive-readdir');

    var name = fileList[1].RelativPath.split('\\');

    for (i = 0; i < fileList.length; i++) {
        delList.push(fileList[i].RelativPath);
    };
    fileList = [];

    rec((armaPath + name[0]), function(err, files) {
        if (err) throw err;
        files.forEach(function(file) {
            if (delList.indexOf(file.replace(armaPath, '')) == -1) {
                fs.unlinkSync(file);
            };
        });
    });
}

function calcDownloadStats() {
    totalFileSize = 0;
    for (i = 0; i < downloadList.length; i++) {
        totalFileSize = totalFileSize + downloadList[i].Size;
    }
}

function preDownloadCheck() {
    currentDownloadSize = 0;
    checkList = [];

    for (i = 0; i < downloadList.length; i++) {
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

    if (cancelDownload) {
        var args = {
            progType: 2,
            message: "update-progress",
            obj: {
                fileObj: curFileObj,
                progressObj: progress,
                totalFileSize: totalFileSize,
                currentDownloadSize: currentDownloadSize
            }
        };
        ipcRenderer.send('message-to-render', args);
        return;
    }

    var dest = armaPath + fileObj.RelativPath;
    curFileObj = fileObj;
    try {
        stats = fs.lstatSync(dest.replace(fileObj.FileName, ''));
        if (stats.isDirectory()) {};
    } catch (e) {
        mkpath(dest.replace(fileObj.FileName, ''), function() {
            if (debug_mode >= 2) {
                console.log('Directory created');
            };
            download(downloadList[0]);
            return;
        });
    };

    if (timert) {
        $.ajax({
            url: "https://service.realliferpg.de/launcher/report.php",
            type: "POST",
            data: {
                'type': 'downloading'
            },
            success: function() {}
        });
        timert = false;
        setTimeout(function() {
            timert = true;
        }, 300000);
    };

    var stream = dwn._download('http://213.202.212.13/download/' + fileObj.RelativPath); //TODO hardcoded IP

    var str = progress({
        length: fileObj.Size,
        time: 100
    });

    str.on('progress', function(progress) {
        document.getElementById('lbl_downInfo').innerHTML = (progress.percentage).toFixed(2) + "% - " + ((progress.speed) / 1048576).toFixed(2) + " MB/s - noch " + progress.eta + "s - " + curFileObj.FileName;
        document.title = curFileObj.FileName;
        var args = {
            progType: 1,
            message: "update-progress",
            obj: {
                fileObj: curFileObj,
                progressObj: progress,
                totalFileSize: totalFileSize,
                currentDownloadSize: currentDownloadSize
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

    if (!(quickCheck(curFileObj))) {
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
            modId: currentModId
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

//fully checks all file MD5 hashes
function fullCheck() {

    if (cancelDownload) {
        return;
    };

    if (downloadList.length > 0) {
        var fs = require('fs');
        var crypto = require('crypto');

        curHashObj = downloadList[0];

        document.getElementById('lbl_downInfo').innerHTML = curHashObj.FileName;
        document.title = curHashObj.FileName;

        var args = {
            message: "update-hash-progress",
            obj: {
                curObj: curHashObj,
                totalFileCount: downloadListTotalSize,
                leftFileCount: downloadList.length
            }
        };
        ipcRenderer.send('message-to-render', args);

        var file = fs.createReadStream(armaPath + curHashObj.RelativPath);

        var hash = crypto.createHash('md5');
        hash.setEncoding('hex');

        file.on('end', function() {
            hash.end();
            var fileHash = hash.read().toUpperCase();
            if (debug_mode >= 2) {
                console.log('download: ' + fileHash + ' - original: ' + curHashObj.Hash + ' for file ' + curHashObj.FileName);
            };

            if (!(fileHash === curHashObj.Hash)) {
                errorList.push(curHashObj);
                if (debug_mode >= 2) {
                    console.log('invalid checksum for: ' + curHashObj.FileName);
                };
            }
            downloadList.shift();
            fullCheck();
        });

        file.on('error', function() {
            //console.log('invalid checksum for: ' + curHashObj.FileName);
            errorList.push(curHashObj);
            downloadList.shift();
            fullCheck();
        });

        file.pipe(hash);
    } else {
        if (errorList.length > 0) {
            console.log('Error List length: ' + errorList.length);
            downloadList = errorList;
            download(downloadList[0]);
        } else {
            var args = {
                message: "full-check-result",
                obj: {
                    resultType: 1 //1 = success
                }
            };
            ipcRenderer.send('message-to-render', args);
        }
    }
}
