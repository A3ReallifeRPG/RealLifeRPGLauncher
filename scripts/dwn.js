var fs = require('fs');
var request = require('request');
var progress = require('request-progress');
var mkpath = require('mkpath');
var WebTorrent = require('webtorrent');
var EventEmitter = require('events').EventEmitter;
window.$ = window.jQuery = require('../resources/jquery/jquery-1.12.3.min.js');
const {
    ipcRenderer
} = require('electron');

var magnet = "magnet:?xt=urn:btih:cfc02a92423c9c876dc5ec1e8e56ec113a1d2856&dn=addons&tr=udp%3A%2F%2Fexodus.desync.com%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com";
var index = 0;

var client = new WebTorrent();

ipcRenderer.on('to-dwn', (event, args) => {
    switch (args.type) {
case "start-mod-dwn":
    getHashlist(args.mod.Id);
    break;
case "hashlist-callback":
    dwnMod(args);
    break;
}
})

function dwnMod(args) {
    downloadList(args.data.data,0,TestPath,TestDlServer);
}

function getHashlist(id) {
    var args = {
        type: "get-url",
        callback: "hashlist-callback",
        url: APIBaseURL + APIModHashlistURL + id,
        callBackTarget: "to-dwn"
    };
    ipcRenderer.send('to-web', args);
}

function downloadList(hashlist,startIndex, basepath, dlserver) {
    if (typeof startIndex === 'undefined') { startIndex = 0; }
    downloadFileWithCallback(hashlist, startIndex, basepath, dlserver);
}

function downloadFileWithCallback(hashlist, index, basepath, dlserver) {

    var dest = basepath + hashlist[index].RelativPath;
    var folder = dest.replace(hashlist[index].FileName, '');

    try {
        stats = fs.lstatSync(folder);
        if (stats.isDirectory() && folder.includes("addons")) {
            initTorrent(folder);
        } else {
            progress(request(dlserver + hashlist[index].RelativPath), {

            }).on('progress', function (state) {
                updateProgressServer(state,hashlist[index].FileName);
            }).on('error', function (err) {
                console.log(err);
            }).on('end', function () {
                downloadFileWithCallback(hashlist, index + 1, basepath,dlserver);
            }).pipe(fs.createWriteStream(dest));
        }
    } catch (e) {
        mkpath(folder, function() {
            if (folder.includes("addons")) {
                initTorrent(folder);
            } else {
                progress(request(dlserver + hashlist[index].RelativPath), {

                }).on('progress', function (state) {
                    updateProgressServer(state,hashlist[index].FileName);
                }).on('error', function (err) {
                    console.log(err);
                }).on('end', function () {
                    downloadFileWithCallback(hashlist, index + 1, basepath,dlserver);
                }).pipe(fs.createWriteStream(dest));
            }
        });
    }
}

function initTorrent(folder) {
    path = folder.replace('addons', '');
    var opts = {
        path: path
    };
    client.add("https://static.realliferpg.de/torrent/rlrpg.torrent",opts);

    client.on('torrent', function (torrent) {
        console.log(torrent);
        window.setInterval(function(){
            var torrentProgress = client.progress;
            var state = {
                torrentDownloadSpeedState: client.downloadSpeed,
                torrentUploadSpeedState: client.uploadSpeed,
                torrentProgressState: torrentProgress,
                torrentRationState: client.ratio,
                torrentState: torrent
            };
            updateProgressTorrent(state);
        }, 1000);
    });

    client.on('error', function (err) {
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

