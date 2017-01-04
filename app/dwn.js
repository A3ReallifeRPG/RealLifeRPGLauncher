var fs = require('fs');
var request = require('request');
var progress = require('request-progress');
var mkpath = require('mkpath');
var WebTorrent = require('webtorrent');
var hasha = require("hasha");
require('events').EventEmitter.defaultMaxListeners = Infinity;
const {ipcRenderer} = require('electron');

var index = 0;
var cancel = false;
var downloaded = 0;

let client = window.client = new WebTorrent();

var path = "";

ipcRenderer.on('to-dwn', (event, args) => {
    switch (args.type) {
    case "start-mod-dwn":
        cancel = false;
        path = args.path;
        getHashlist(args.mod,"hashlist-callback-dwn");
        break;
    case "start-mod-seed":
        cancel = false;
        path = args.path;
        initSeeding(args.path + args.mod.Directories + "\\",args.mod.Torrent);
        console.log(args.mod.Torrent);
        break;
    case "start-mod-hash":
        cancel = false;
        path = args.path;
        getHashlist(args.mod,"hashlist-callback-hash");
        break;
    case "start-mod-quickcheck":
        cancel = false;
        path = args.path;
        getHashlist(args.mod,"hashlist-callback-quickcheck");
        break;
    case "hashlist-callback-dwn":
        cancel = false;
        dwnMod(args);
        break;
    case "hashlist-callback-hash":
        cancel = false;
        hashMod(args);
        break;
    case "start-list-dwn":
        cancel = false;
        path = args.path;
        dwnlist(args);
        break;
    case "hashlist-callback-quickcheck":
        cancel = false;
        quickchecklist(args);
        break;
    case "cancel":
        cancel = true;
        break;
    }
})

function dwnMod(args) {
    downloadFileRecursive(args.data.data,0,path,args.args.mod.DownloadUrl, true, args.args.mod.Torrent);
}

function dwnlist(args) {
    downloadFileRecursive(args.list,0,path,args.mod.DownloadUrl, args.torrent, args.mod.Torrent);
}

function quickchecklist(args) {
    try {
        fs.lstatSync(path + args.args.mod.Directories);
        quickCheckRecursive(args.data.data,0,path,args.args.mod);
    } catch (e) {
        console.log(e);
        var args = {
            type: "update-quickcheck",
            update: 0,
            mod: args.args.mod
        };
        ipcRenderer.send('to-app', args);
    }
}

function hashMod(args) {
    var dllist = [];
    cleanFileRecursive(listDiff(args.data.data,path,args.args.mod),0,path,hashFileRecursive,args.data.data,0,path,dllist,args.args.mod);
}

function getHashlist(mod, callback) {
    var args = {
        type: "get-url",
        callback: callback,
        url: APIBaseURL + APIModHashlistURL + mod.Id,
        callBackTarget: "to-dwn",
        mod: mod
    };
    ipcRenderer.send('to-web', args);
}

function findFileInList(list,path,basepath) {
    var basepath = basepath.replace(/\\/g, '/');

    var found = false;
    list.forEach(function (listvalue) {
        if(basepath + listvalue.RelativPath.replace(/\\/g, '/') === path.replace(/\\/g, '/')) {
            found = true;
        }
    });

    return [found,path];
}

function listDiff(list,basepath,mod) {
    var files = walkFolder(basepath + mod.Directories);
    var toDelete = [];
    files.forEach(function (filesvalue) {
        var search = findFileInList(list,filesvalue,basepath);
        if(!search[0]) {
            toDelete.push(search[1]);
        }
    });
    return toDelete;
}

function cleanFileRecursive(list, index, basepath, callback, hashlist, hashIndex, path, dllist, mod) {
    var dest = list[index];

    try {
        fs.unlink(dest);
        if(list.length > index + 1) {
            cleanFileRecursive(list, index + 1, basepath, callback, hashlist, hashIndex, dllist, mod);
        } else {
            callback(hashlist, hashIndex, path, dllist, mod);
        }
    } catch (e) {
        if(list.length > index + 1) {
            cleanFileRecursive(list, index + 1, basepath, callback, hashlist, hashIndex, dllist, mod);
        } else {
            callback(hashlist, hashIndex, path, dllist, mod);
        }
    }
}

function initSeeding(dirPath, TorrentURL) {
    console.log(dirPath);
    var opts = {
        path: dirPath
    };
    client.add(TorrentURL,opts, function (torrent) {
        console.log(torrent);
        var update = setInterval(function () {
            if(!cancel) {
                var state = {
                    torrentUploadSpeedState: client.uploadSpeed,
                    torrentMaxConnsState: client.maxConns,
                    torrentRationState: torrent.ratio,
                    torrentUploadedState: torrent.uploaded,
                    torrentNumPeersState: torrent.numPeers
                };
                updateProgressSeeding(state);
            } else {
                torrent.destroy(function () {
                    clearInterval(update);
                    cancelled();
                });
            }
        }, 1000);
    });
}

function downloadFileRecursive(list, index, basepath, dlserver, torrent, torrentURL) {

    var dest = basepath + list[index].RelativPath;
    var folder = dest.replace(list[index].FileName, '');

    try {
        stats = fs.lstatSync(folder);
        if (!(stats.isDirectory() && folder.includes("addons") && torrent)) {
            dlFileCallback(list, index, dest, basepath, dlserver, torrent, torrentURL);
        } else {
            initTorrent(folder, torrentURL);
        }
    } catch (e) {
        mkpath(folder, function () {
            if (!folder.includes("addons") && torrent) {
                dlFileCallback(list, index, dest, basepath, dlserver, torrent, torrentURL);
            } else {
                initTorrent(folder, torrentURL);
            }
        });
    }
}

function dlFileCallback(list,index,dest,basepath,dlserver,torrent,torrentURL) {
    changeStatus(true,"Server - Verbunden");
    var size = 0;
    for(var i = 0; i < list.length; i++) {
        size += list[i].Size;
    }
    progress(request(dlserver + list[index].RelativPath), {}).on('progress', function (state) {
        state.totalSize = size;
        state.totalDownloaded = downloaded;
        updateProgressServer(state, list[index].FileName);
    }).on('error', function (err) {
        console.log(err);
    }).on('end', function () {
        downloaded += list[index].Size;
        if(cancel) {
            cancel = false;
            cancelled();
        } else {
            if(list.length > index + 1) {
                downloadFileRecursive(list, index + 1, basepath, dlserver,torrent, torrentURL);
            } else {
                downloadFinished();
            }
        }
    }).pipe(fs.createWriteStream(dest));
}

function hashFileRecursive(list, index, basepath, dllist, mod) {

    var dest = basepath + list[index].RelativPath;
    var folder = dest.replace(list[index].FileName, '');

    if(cancel) {
        cancel = false;
        cancelled();
    } else {
        updateProgressHash({
            index: index,
            size: list.length
        }, list[index].FileName,mod);

        try {
            fs.lstatSync(folder);
            fs.lstatSync(dest);
            hasha.fromFile(dest, {algorithm: 'md5'}).then(function (hash) {
                if (list[index].Hash.toUpperCase() !== hash.toUpperCase()) {
                    dllist.push(list[index]);
                }
                if (list.length > index + 1) {
                    hashFileRecursive(list, index + 1, basepath, dllist, mod);
                } else {
                    finishProgressHash(dllist, mod);
                }
            });
        } catch (e) {
            dllist.push(list[index]);
            if (list.length > index + 1) {
                hashFileRecursive(list, index + 1, basepath, dllist, mod);
            } else {
                finishProgressHash(dllist, mod);
            }
        }
    }
}

function downloadFinished(){
    var args = {
        type: "update-dl-progress-done"
    };
    ipcRenderer.send('to-app', args);
}

function initTorrent(folder,torrentURL) {
    changeStatus(true,"Torrent - Verbinden...","Das Verbinden zum Torrent kann einige Minuten dauern.");
    path = folder.replace('addons', '');
    var opts = {
        path: path
    };
    console.log(path);
    client.add(torrentURL,opts, function (torrent) {
        var update = setInterval(function () {
            if(!cancel) {
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
            } else {
                torrent.destroy(function () {
                    clearInterval(update);
                    cancelled();
                });
            }
        }, 1000);
        torrent.on('done', function () {
            changeStatus(false,"Abgeschlossen");
        })
    });

    client.on('error', function (err) {
        changeStatus(false,"Torrent - Fehler");
        console.log(err);
    });
}

function updateProgressServer(state,filename) {
    var args = {
        type: "update-dl-progress-server",
        state: state,
        fileName: filename
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

function updateProgressSeeding(state) {
    var args = {
        type: "update-dl-progress-seeding",
        state: state
    };
    ipcRenderer.send('to-app', args);
}

function changeStatus(downloading,status,hint) {
    var args = {
        type: "status-change",
        status: status,
        downloading: downloading,
        hint: hint
    };
    ipcRenderer.send('to-app', args);
}

function cancelled() {
    var args = {
        type: "cancelled"
    };
    ipcRenderer.send('to-app', args);
}

function updateProgressHash(state,filename,mod) {
    var args = {
        type: "update-hash-progress",
        state: state,
        fileName: filename,
        mod: mod
    };
    ipcRenderer.send('to-app', args);
}

function finishProgressHash(list,mod) {
    var args = {
        type: "update-hash-progress-done",
        list: list,
        mod: mod
    };
    ipcRenderer.send('to-app', args);
}

function quickCheckRecursive(list, index, basepath, mod) {
    try {
        var dest = basepath + list[index].RelativPath;
        stats = fs.lstatSync(dest);
        if(dest.includes(".bisign")) {
            hasha.fromFile(dest, {algorithm: 'md5'}).then(function (hash) {
                if (list[index].Hash.toUpperCase() !== hash.toUpperCase()) {
                    var args = {
                        type: "update-quickcheck",
                        update: 1,
                        mod: mod
                    };
                    ipcRenderer.send('to-app', args);
                } else {
                    if (list.length > index + 1) {
                        quickCheckRecursive(list, index + 1, basepath, mod)
                    } else {
                        var args = {
                            type: "update-quickcheck",
                            update: 2,
                            mod: mod
                        };
                        ipcRenderer.send('to-app', args);
                    }
                }
            });
        } else if (list[index].Size !== stats.size) {
            var args = {
                type: "update-quickcheck",
                update: 1,
                mod: mod
            };
            ipcRenderer.send('to-app', args);
        } else {
            if (list.length > index + 1) {
                quickCheckRecursive(list, index + 1, basepath, mod)
            } else {
                var args = {
                    type: "update-quickcheck",
                    update: 2,
                    mod: mod
                };
                ipcRenderer.send('to-app', args);
            }
        }
    } catch (e) {
        var args = {
            type: "update-quickcheck",
            update: 1,
            mod: mod
        };
        ipcRenderer.send('to-app', args);
    }
}
