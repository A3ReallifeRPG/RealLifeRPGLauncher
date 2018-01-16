const jsonist = require('jsonist')
const {ipcRenderer} = require('electron')
const fs = require('fs')
const request = require('request')
const progress = require('request-progress')
const {app} = require('electron').remote
const ps = require('ps-node')
const exec = require('child_process').exec
const config = require('../config')

ipcRenderer.on('to-web', (event, args) => {
  switch (args.type) {
    case 'get-url' :
      getUrl(args)
      break
    case 'start-file-download' :
      downloadFILE(args.file)
      break
    case 'ping-server-via-rdp' :
      pingServer(args.server)
      break
  }
})

const getUrl = (args) => {
  jsonist.get(args.url, (err, data, resp) => {
    getUrlCallback(args, err, data, resp)
  })
}

const getUrlCallback = (args, err, data, resp) => {
  ipcRenderer.send(args.callBackTarget, {
    'type': args.callback,
    'args': args,
    'err': err,
    'data': data,
    'resp': resp
  })
}

const downloadFILE = (file) => {
  progress(request(config.STATICFILESERVE + file), {}).on('progress', (state) => {
    ipcRenderer.send('to-app', {
      type: 'update-dl-progress-file',
      state: state
    })
  }).on('error', (err) => {
    console.log(err)
  }).on('end', () => {
    ipcRenderer.send('to-app', {
      type: 'update-dl-progress-file-done',
      filePath: app.getPath('downloads') + '\\' + file
    })
  }).pipe(fs.createWriteStream(app.getPath('downloads') + '\\' + file))
}

const pingServer = (server) => {
  exec('mstsc /v ' + server.IpAddress, () => {})

  ps.lookup({
    command: 'mstsc'
  }, (err, resultList) => {
    if (err) throw err
    resultList.forEach((process) => {
      if (process) {
        ps.kill(process.pid, (err) => {
          if (err) {
            throw err
          } else {
            console.log('Process %s has been killed!', process.pid)
          }
        })
      }
    })
  })
}
