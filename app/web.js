/* global STATICFILESERVE */
var jsonist = require('jsonist')
const {ipcRenderer} = require('electron')
var fs = require('fs')
var request = require('request')
var progress = require('request-progress')
const {app} = require('electron').remote

ipcRenderer.on('to-web', function (event, args) {
  switch (args.type) {
    case 'get-url' :
      getUrl(args)
      break
    case 'start-file-download' :
      downloadFILE(args.file)
      break
  }
})

function getUrl (args) {
  var fn = function (err, data, resp) {
    console.log(err, resp)
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

function downloadFILE (file) {
  console.log(STATICFILESERVE + file)
  progress(request(STATICFILESERVE + file), {}).on('progress', function (state) {
    ipcRenderer.send('to-app', {
      type: 'update-dl-progress-file',
      state: state
    })
  }).on('error', function (err) {
    console.log(err)
  }).on('end', function () {
    ipcRenderer.send('to-app', {
      type: 'update-dl-progress-file-done',
      filePath: app.getPath('downloads') + '\\' + file
    })
  }).pipe(fs.createWriteStream(app.getPath('downloads') + '\\' + file))
}
