var fs = require('fs');
var request = require('request');
var progress = require('request-progress');
var mkpath = require('mkpath');
window.$ = window.jQuery = require('../resources/jquery/jquery-1.12.3.min.js');
const {
    ipcRenderer
} = require('electron');


var index = 0;

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

    console.log(dlserver + hashlist[index].RelativPath);

    try {
        stats = fs.lstatSync(dest.replace(hashlist[index].FileName, ''));
        if (stats.isDirectory()) {
            try {
                progress(request(dlserver + hashlist[index].RelativPath), {

                }).on('progress', function (state) {
                    updateProgress(state,hashlist[index].FileName);
                }).on('error', function (err) {
                    console.log(err);
                }).on('end', function () {
                    downloadFileWithCallback(hashlist, index + 1, basepath,dlserver);
                }).pipe(fs.createWriteStream(dest));
            } catch(e) {
                console.log(e);
            }
        }
    } catch (e) {
        mkpath(dest.replace(hashlist[index].FileName, ''), function() {
            try {
                progress(request(dlserver + hashlist[index].RelativPath), {

                }).on('progress', function (state) {
                    updateProgress(state,hashlist[index].FileName);
                }).on('error', function (err) {
                    console.log(err);
                }).on('end', function () {
                    downloadFileWithCallback(hashlist, index + 1, basepath,dlserver);
                }).pipe(fs.createWriteStream(dest));
            } catch(e) {
                console.log(e);
            }
        });
    }
}

function updateProgress(state,filename) {
    var args = {
        type: "update-dl-progress",
        state: state,
        filename: filename
    };
    ipcRenderer.send('to-app', args);
}

