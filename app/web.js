const jsonist = require('jsonist')
const {ipcRenderer} = require('electron')
const fs = require('fs')
const request = require('request')
const progress = require('request-progress')
const {app} = require('electron').remote
const ps = require('ps-node')
const exec = require('child_process').exec
const config = require('../config')
const pathf = require('path')

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
    case 'upload_rpt' :
      uploadRPT(getLatestRptFile(getArmaAppData()), args.pid)
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

const getLatestRptFile = (dir) => {
  let files = fs.readdirSync(dir).filter(function (v) {
    return pathf.extname(v) === '.rpt'
  }).map(function (v) {
    return {
      name: dir + v,
      time: fs.statSync(dir + v).mtime.getTime()
    }
  }).sort(function (a, b) {
    return b.time - a.time
  }).map(function (v) {
    return v.name
  })

  if (files.length > 0) {
    return files[0]
  } else {
    console.log('Keine RPT Logs vorhanden')
    ipcRenderer.send('to-app', {
      'type': 'rpt_upload_callback',
      'success': false,
      'url': ''
    })
  }
}

const getArmaAppData = () => {
  return pathf.join(app.getPath('appData'), '..', 'Local', 'Arma 3', '\\')
}

const uploadRPT = (rptfile, playerid) => {
  let formData = {
    file: fs.createReadStream(rptfile)
  }
  if (playerid) {
    formData.pid = playerid
  }
  request.post({
    url: 'https://api.realliferpg.de/v1/rpt_upload',
    formData: formData
  }, function optionalCallback (err, httpResponse, body) {
    if (err) {
      ipcRenderer.send('to-app', {
        'type': 'rpt_upload_callback',
        'success': false,
        'url': ''
      })
      return console.error('upload failed:', err)
    }
    body = JSON.parse(body)
    if (body.status === 200) {
      ipcRenderer.send('to-app', {
        'type': 'rpt_upload_callback',
        'success': true,
        'url': body.data.link
      })
    }
  })
}
