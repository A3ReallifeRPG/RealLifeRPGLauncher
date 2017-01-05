var jsonist = require('jsonist')
// noinspection JSAnnotator
const {ipcRenderer} = require('electron')

ipcRenderer.on('to-web', function (event, args) {
  switch (args.type) {
    case 'get-url' :
      getUrl(args)
      break
  }
})

function getUrl (args) {
  var fn = function (err, data, resp) {
    getUrlCallback(args, err, data, resp)
  }
  jsonist.get(args.url, fn)
}

function getUrlCallback (args, err, data, resp) {
  ipcRenderer.send(args.callBackTarget, {
    'type': args.callback,
    'args': args,
    'err': err,
    'data': data,
    'resp': resp
  })
}
