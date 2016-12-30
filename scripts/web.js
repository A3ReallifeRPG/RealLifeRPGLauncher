var jsonist = require('jsonist');

const {ipcRenderer} = require('electron');

ipcRenderer.on('to-web', (event, args) => {
    switch (args.type) {
    case "get-url" :
        getUrl(args);
        break;
    }
})

function getUrl(args) {
    var fn = function (err, data, resp) {
        getUrlCallback(args, err, data, resp);
    };
    jsonist.get(args.url, fn);
}

function getUrlCallback(args, err, data, resp) {
    var content = {
        "type": args.callback,
        "args": args,
        "err": err,
        "data": data,
        "resp": resp
    };
    ipcRenderer.send(args.callBackTarget,content);
};