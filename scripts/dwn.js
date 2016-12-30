var fs = require('fs');
var request = require('request');
var progress = require('request-progress');
var mkpath = require('mkpath');
var WebTorrent = require('webtorrent');
var hasha = require("hasha");
require('events').EventEmitter.defaultMaxListeners = Infinity;
window.$ = window.jQuery = require('../resources/jquery/jquery-1.12.3.min.js');
const {ipcRenderer} = require('electron');
const {dialog} = require('electron').remote;

var index = 0;
var client = new WebTorrent();

ipcRenderer.on('to-dwn', (event, args) => {
    switch (args.type) {
    case "start-mod-dwn":
        getHashlist(args.mod.Id,"hashlist-callback-dwn");
        break;
    case "start-mod-hash":
        getHashlist(args.mod.Id,"hashlist-callback-hash");
        break;
    case "hashlist-callback-dwn":
        dwnMod(args);
        break;
    case "hashlist-callback-hash":
        hashMod(args);
        break;
    }
})

function dwnMod(args) {
    downloadList(args.data.data,0,TestPath,TestDlServer);
}

function hashMod(args) {
    var dllist = [];
    hashList(args.data.data,0,TestPath,dllist);
}

function getHashlist(id, callback) {
    var args = {
        type: "get-url",
        callback: callback,
        url: APIBaseURL + APIModHashlistURL + id,
        callBackTarget: "to-dwn"
    };
    ipcRenderer.send('to-web', args);
}

function downloadList(hashlist,startIndex, basepath, dlserver) {
    if (typeof startIndex === 'undefined') { startIndex = 0; }
    downloadFileRecursive(hashlist, startIndex, basepath, dlserver, true);
}

function hashList(hashlist,startIndex, basepath, dllist) {
    if (typeof startIndex === 'undefined') { startIndex = 0; }
    hashFileRecursive(hashlist, startIndex, basepath, dllist);
}

function downloadFileRecursive(list, index, basepath, dlserver, torrent) {

    var dest = basepath + list[index].RelativPath;
    var folder = dest.replace(list[index].FileName, '');

    try {
        stats = fs.lstatSync(folder);
        if (!(stats.isDirectory() && folder.includes("addons") && torrent)) {
            progress(request(dlserver + list[index].RelativPath), {}).on('progress', function (state) {
                updateProgressServer(state, list[index].FileName);
            }).on('error', function (err) {
                console.log(err);
            }).on('end', function () {
                if(list.length >= index + 1) {
                    downloadFileRecursive(list, index + 1, basepath, dlserver);
                } else {
                    downloadFinished();
                };
            }).pipe(fs.createWriteStream(dest));
        } else {
            initTorrent(folder);
        }
    } catch (e) {
        mkpath(folder, function() {
            if (!folder.includes("addons") && torrent) {
                progress(request(dlserver + list[index].RelativPath), {}).on('progress', function (state) {
                    updateProgressServer(state, list[index].FileName);
                }).on('error', function (err) {
                    console.log(err);
                }).on('end', function () {
                    if(list.length >= index + 1) {
                        downloadFileRecursive(list, index + 1, basepath, dlserver);
                    } else {
                        downloadFinished();
                    }
                }).pipe(fs.createWriteStream(dest));
            } else {
                initTorrent(folder);
            }
        });
    }
}

function hashFileRecursive(list, index, basepath, dllist) {

    var dest = basepath + list[index].RelativPath;
    var folder = dest.replace(list[index].FileName, '');

    updateProgressHash({
        index: index,
        size: list.length
    }, list[index].FileName);

    try {
        stats = fs.lstatSync(folder);
        hasha.fromFile(dest, {algorithm: 'md5'}).then(function (hash) {
            if(list[index].Hash.toUpperCase() !== hash.toUpperCase()) {
                dllist.push(list[index]);
            }
            if(list.length > index + 1) {
                hashFileRecursive(list,index + 1, basepath,dllist);
            } else {
                console.log(dllist);
                finishProgressHash(dllist);
            }
        });
    } catch (e) {
        console.log(e);
        dllist.push(list[index]);
        if(list.length > index + 1) {
            hashFileRecursive(list,index + 1, basepath,dllist);
        } else {
            finishProgressHash(dllist);
        }
    }
}

function downloadFinished(){
    changeStatus("Abgeschlossen");
}

function initTorrent(folder) {
    changeStatus("Torrent - Verbinden...");
    path = folder.replace('addons', '');
    var opts = {
        path: path
    };
    client.add(magnet,opts, function (torrent) {
        var update = setInterval(function () {
            var state = {
                torrentDownloadSpeedState: client.downloadSpeed,
                torrentUploadSpeedState: client.uploadSpeed,
                torrentMaxConnsState: client.maxConns,
                torrentProgressState: torrent.progress,
                torrentRationState: torrent.ratio,
                torrentETAState: torrent.timeRemaining,
                torrentDownloadedState: torrent.downloaded,
                torrentUploadedState: torrent.uploaded,
                torrentNumPeersState: torrent.numPeers,
                torrentSizeState: torrent.length
            };
            updateProgressTorrent(state);
        }, 1000);
        ipcRenderer.on('to-dwn', (event, args) => {
            switch (args.type) {
            case "stop-torrent-dwn":
                torrent.destroy(function () {
                    update = null;
                    changeStatus("Abgebrochen");
                });
                break;
            }
        });
        torrent.on('done', function () {
            changeStatus("Torrent - Seeding");
        })
    });

    client.on('error', function (err) {
        changeStatus("Torrent - Fehler");
        console.log(err);
    });
}

function updateProgressServer(state,filename) {
    var args = {
        type: "update-dl-progress-server",
        state: state,
        filename: filename
    };
    ipcRenderer.send('to-app', args);
}

function updateProgressTorrent(state) {
    var args = {
        type: "update-dl-progress-torrent",
        state: state
    };
    ipcRenderer.send('to-app', args);
}

function changeStatus(status) {
    var args = {
        type: "status-change",
        status: status
    };
    ipcRenderer.send('to-app', args);
}

function resetStatus() {
    var args = {
        type: "reset"
    };
    ipcRenderer.send('to-app', args);
}

function updateProgressHash(state,filename) {
    var args = {
        type: "update-hash-progress",
        state: state,
        filename: filename
    };
    ipcRenderer.send('to-app', args);
}

function finishProgressHash(list) {
    resetStatus();
    var args = {
        type: "update-hash-progress-done",
        list: list
    };
    ipcRenderer.send('to-app', args);
}