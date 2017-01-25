/* global TFARFileURL */
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
    case 'start-tfar-download' :
      downloadTFAR(args.version)
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

function downloadTFAR (version) {
  console.log(TFARFileURL + '_' + version)
  progress(request(TFARFileURL + '_' + version), {}).on('progress', function (state) {
    updateProgressTFAR(state)
  }).on('error', function (err) {
    console.log(err)
  }).on('end', function () {
    ipcRenderer.send('to-app', {
      type: 'update-dl-progress-tfar-done',
      tfarPath: app.getPath('downloads') + '\\ReallifeRPGTFAR.ts3_plugin'
    })
  }).pipe(fs.createWriteStream(app.getPath('downloads') + '\\ReallifeRPGTFAR.ts3_plugin'))
}

function updateProgressTFAR (state) {
  ipcRenderer.send('to-app', {
    type: 'update-dl-progress-tfar',
    state: state
  })
}
