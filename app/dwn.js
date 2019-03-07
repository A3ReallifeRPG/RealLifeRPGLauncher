const fs = require('fs')
const request = require('request')
const progress = require('request-progress')
const mkpath = require('mkpath')
const {app} = require('electron').remote
const WebTorrent = require('webtorrent')
const hasha = require('hasha')
const config = require('../config')
require('events').EventEmitter.defaultMaxListeners = Infinity
const {ipcRenderer} = require('electron')
const async = require('async')
const recursive = require('recursive-readdir')
const pathf = require('path')
const os = require('os')

let agent = `RealLifeRPG Launcher/${app.getVersion()} (${os.type()} ${os.release()}; ${os.platform()}; ${os.arch()}) - `

if (typeof process.env.PORTABLE_EXECUTABLE_DIR !== 'undefined') {
  agent = agent.concat('Portable')
} else if (typeof process.windowsStore !== 'undefined') {
  agent = agent.concat('Windows UWP')
} else {
  agent = agent.concat('Desktop')
}

let cancel = false
let cancelDownload = false
let downloaded = 0
let update = null
let debug = false
let downloadTimeouts = 0
let downloadAsyncList = []
let threadLimit = 10

let client = window.client = new WebTorrent({
  maxConns: 150
})

let path = ''

ipcRenderer.on('to-dwn', (event, args) => {
  switch (args.type) {
    case 'start-mod-dwn':
      cancel = false
      path = args.path
      getHashlist(args.mod, 'hashlist-callback-dwn')
      break
    case 'start-mod-seed':
      cancel = false
      path = args.path
      initSeeding(args.path + args.mod.Directories + '\\', args.mod.Torrent)
      break
    case 'start-mod-hash':
      cancel = false
      path = args.path
      changeStatus(true, 'Frage Modinformationen ab...', 'Warte auf Server...')
      getHashlist(args.mod, 'hashlist-callback-hash')
      break
    case 'start-mod-quickcheck':
      cancel = false
      path = args.path
      getHashlist(args.mod, 'hashlist-callback-quickcheck')
      break
    case 'start-mod-update':
      cancelDownload = false
      cancel = false
      path = args.path
      changeStatus(true, 'Frage Modinformationen ab...', 'Warte auf Server...')
      getHashlist(args.mod, 'hashlist-callback-update')
      break
    case 'hashlist-callback-dwn':
      cancel = false
      downloadMod(args)
      break
    case 'hashlist-callback-hash':
      cancel = false
      hashMod(args)
      break
    case 'hashlist-callback-update':
      cancel = false
      updateMod(args)
      break
    case 'start-list-dwn':
      cancel = false
      path = args.path
      downloadList(args)
      break
    case 'hashlist-callback-quickcheck':
      cancel = false
      quickCheckList(args)
      break
    case 'start-bisign-check':
      cancel = false
      deleteBisigns(args)
      break
    case 'cancel':
      cancel = true
      cancelDownload = true
      break
  }
})

const downloadMod = (args) => {
  finishProgressHash(args.data.data, args.args.mod)
}

const downloadList = (args) => {
  downloaded = 0
  if (debug) {
    console.log(args.list)
  }
  args.list.sort((a, b) => {
    return a.Size > b.Size
  })
  launchDownload(args.list, args.mod, path)
}

const updateMod = (args) => {
  async.waterfall([
    (callback) => {
      listDiff(args.data.data, path, args.args.mod, callback)
    },
    (toDelete, callback) => {
      removeFilesList(toDelete, callback)
    },
    (callback) => {
      quickCheckListR(args.data.data, 0, path, [], args.args.mod, callback)
    }
  ],
  (err, result) => {
    if (err) {
      console.log(err)
    }
    finishProgressHash(result, args.args.mod)
  })
}

const deleteBisigns = (args) => {
  async.waterfall([
    (callback) => {
      deleteBisignFiles(path, args.mod, callback)
    }
  ],
  (err, result) => {
    if (err) {
      if (err === 'Cancelled') {
        cancelled()
      } else {
        console.log(err)
      }
    }
    ipcRenderer.send('to-dwn', {
      type: 'start-mod-hash',
      mod: args.mod,
      path: path
    })
  })
}

const hashMod = (args) => {
  async.waterfall([
    (callback) => {
      listDiff(args.data.data, path, args.args.mod, callback)
    },
    (toDelete, callback) => {
      removeFilesList(toDelete, callback)
    },
    (callback) => {
      hashListR(args.data.data, 0, path, [], args.args.mod, 0, callback)
    }
  ],
  (err, result) => {
    if (err) {
      if (err === 'Cancelled') {
        cancelled()
      } else {
        console.log(err)
      }
    }
    finishProgressHash(result, args.args.mod)
  })
}

const quickCheckList = (args) => {
  if (fs.existsSync(path + args.args.mod.Directories)) {
    quickCheckR(args.data.data, 0, path, args.args.mod)
  } else {
    ipcRenderer.send('to-app', {
      type: 'update-quickcheck',
      update: 0,
      mod: args.args.mod
    })
  }
}

const deleteBisignFiles = (basepath, mod, callback) => {
  changeStatus(true, 'Lösche Bisign Dateien...', 'Lösche...')
  recursive(pathf.join(basepath, mod.Directories), (err, files) => {
    if (err) {
      console.log(err)
    }
    files.forEach((cur, i) => {
      if (pathf.extname(cur) === '.bisign') {
        fs.unlinkSync(cur)
      }
    })
    callback(null)
  })
}

const listDiff = (list, basepath, mod, callback) => {
  changeStatus(true, 'Prüfe auf überflüssige Dateien...', 'Prüfung...')
  let modlist = []
  list.forEach((cur, i) => {
    modlist.push(basepath + cur.RelativPath)
  })
  recursive(pathf.join(basepath, mod.Directories), (err, files) => {
    if (err) {
      console.log(err)
    }
    let toDelete = files.filter(val => !modlist.includes(val))
    callback(null, toDelete)
  })
}

const removeFilesList = (list, callback) => {
  changeStatus(true, list.length + ' Dateien werden gelöscht...', 'Lösche...')
  list.forEach((cur, i) => {
    try {
      fs.unlinkSync(cur)
    } catch (e) {
      console.log(e)
    }
  })
  callback(null)
}

const initSeeding = (dirPath, TorrentURL) => {
  update = setInterval(() => {
    updateProgressTorrentInit({
      torrentUploadSpeedState: client.progress
    })
    try {
      client.destroy((err) => {
        if (err) {
          console.log(err)
        }
        client = window.client = new WebTorrent({
          maxConns: 150
        })
        clearInterval(update)
        cancelled()
      })
    } catch (e) {
      console.log(e)
      client = window.client = new WebTorrent({
        maxConns: 150
      })
      clearInterval(update)
      cancelled()
    }
  },
  1000
  )
  client.add(TorrentURL, {
    path: dirPath
  }, (torrent) => {
    clearInterval(update)
    update = setInterval(() => {
      if (!cancel) {
        updateProgressSeeding({
          torrentUploadSpeedState: client.uploadSpeed,
          torrentMaxConnsState: client.maxConns,
          torrentRationState: torrent.ratio,
          torrentUploadedState: torrent.uploaded,
          torrentNumPeersState: torrent.numPeers
        })
      } else {
        torrent.destroy(() => {
          clearInterval(update)
          cancelled()
        })
      }
    },
    1000
    )
  })
}

const launchDownload = (list, mod, basepath) => {
  list.forEach((cur, i) => {
    cur.speed = 0
    cur.size = 0
    cur.transferred = 0
    cur.finished = 0
  })
  downloadAsyncList = list
  let tasks = []
  list.forEach((cur, i) => {
    tasks.push(function (callback) {
      downloadFile(callback, cur, mod, basepath, i)
    })
  })

  async.parallelLimit(tasks, threadLimit, (err, result) => {
    console.log(err)
    if (!err) {
      downloadFinished(mod)
    } else {
      if (err.message === 'Abgebrochen') {
        cancelled()
      } else {
        downloadErrored(err.message)
      }
    }
    clearInterval(update)
  })
  clearInterval(update)
  update = setInterval(() => {
    if (!cancel) {
      getCurrentDownloadStats()
    } else {
      clearInterval(update)
      cancelled()
    }
  },
  1000
  )
}

const updateCurDownloadSpeed = (i, state) => {
  if (state.speed !== 0) {
    downloadAsyncList[i].speed = state.speed
  }
  downloadAsyncList[i].speed = state.speed
  downloadAsyncList[i].transferred = state.size.transferred
}

const getCurrentDownloadStats = () => {
  let speed = 0
  let transferred = 0
  let total = 0
  let threads = 0
  let finished = 0
  downloadAsyncList.forEach((cur, i) => {
    speed += cur.speed
    transferred += cur.transferred
    total += downloadAsyncList[i].Size
    if (cur.speed > 0) {
      threads++
    }
    if (cur.finished) {
      finished++
    }
  })
  if (speed) {
    updateProgressServer({
      totalSize: total,
      totalDownloaded: transferred,
      speed: speed,
      threads: threads,
      count: downloadAsyncList.length,
      finished: finished
    })
  }
}

const resetCurDownloadSpeed = (i) => {
  downloadAsyncList[i].speed = 0
  downloadAsyncList[i].finished = 1
}

const downloadFile = (callback, item, mod, basepath, i) => {
  if (cancelDownload) {
    callback(new Error('Abgebrochen'))
  } else {
    let dest = basepath + item.RelativPath
    let folder = dest.replace(item.FileName, '')

    if (fs.existsSync(folder)) {
      let requestobj = null
      try {
        fs.unlinkSync(dest)
      } catch (e) {
        console.log(e)
      }
      let options = {
        url: mod.DownloadUrl + item.RelativPath,
        headers: {
          'user-agent': agent
        }
      }
      progress(requestobj = request(options), {}).on('progress', (state) => {
        if (cancelDownload) {
          requestobj.abort()
          callback(new Error('Abgebrochen'))
        }
        updateCurDownloadSpeed(i, state)
      }).on('error', (err) => {
        resetCurDownloadSpeed(i)
        if (cancelDownload) {
          requestobj.abort()
          callback(new Error('Abgebrochen'))
        }
        console.log(err)
        switch (err.code) {
          case 'ETIMEDOUT':
            downloadTimeouts += 1
            downloadErrorNotify(`Timeout zum Downloadserver (#${downloadTimeouts})`)
            if (downloadTimeouts < 15) {
              setTimeout(() => {
                downloadFile(callback, item, mod, basepath, i)
              }, 1000)
            } else {
              callback(new Error('Timeoutlimit erreicht'))
            }
            break
          case 'ECONNREFUSED':
            callback(new Error('Verbindung abgelehnt'))
            break
          case 'ENOTFOUND':
            callback(new Error('DNS Fehler'))
            break
          case 'ECONNRESET':
            downloadTimeouts += 1
            downloadErrorNotify(`Verbindungsabbruch zum Downloadserver (#${downloadTimeouts})`)
            if (downloadTimeouts < 15) {
              downloadFile(callback, item, mod, basepath, i)
            } else {
              callback(new Error('Timeoutlimit erreicht'))
            }
            break
          default:
            callback(new Error('err.code'))
            break
        }
      }).on('end', () => {
        resetCurDownloadSpeed(i)
        if (!cancelDownload) {
          callback(null)
        }
      }).pipe(fs.createWriteStream(dest))
    } else {
      mkpath(folder, () => {
        downloadFile(callback, item, mod, basepath, i)
      })
    }
  }
}

const downloadFileR = (list, index, basepath, mod, torrent) => {
  let cur = list[index]
  let dest = basepath + cur.RelativPath
  let folder = dest.replace(cur.FileName, '')

  try {
    let stats = fs.lstatSync(folder)
    if (stats.isDirectory() && folder.includes('addons') && torrent) {
      initTorrent(folder, mod.Torrent)
    } else {
      let size = 0
      let requestobj = null
      list.forEach((cur) => {
        size += cur.Size
      })
      try {
        fs.unlinkSync(dest)
      } catch (e) {
        console.log(e)
      }
      let options = {
        url: mod.DownloadUrl + cur.RelativPath,
        headers: {
          'user-agent': agent
        }
      }
      progress(requestobj = request(options), {}).on('progress', (state) => {
        if (cancel) {
          requestobj.abort()
          cancelled()
        }
        state.totalSize = size
        state.totalDownloaded = downloaded
        state.fileName = cur.FileName
        state.fileSize = cur.Size
        if (state.speed) {
          updateProgressServer(state)
        }
      }).on('error', (err) => {
        console.log(err)
        switch (err.code) {
          case 'ETIMEDOUT':
            downloadTimeouts += 1
            downloadErrorNotify(`Timeout zum Downloadserver (#${downloadTimeouts})`)
            if (index === list.length - 1) {
              downloadFinished(mod)
            } else {
              downloadFileR(list, index, basepath, mod, torrent)
            }
            break
          case 'ECONNREFUSED':
            downloadErrored('Verbindung abgelehnt')
            break
          case 'ENOTFOUND':
            downloadErrored('DNS Fehler')
            break
          case 'ECONNRESET':
            downloadTimeouts += 1
            downloadErrorNotify(`Verbindungsabbruch zum Downloadserver (#${downloadTimeouts})`)
            if (index === list.length - 1) {
              downloadFinished(mod)
            } else {
              downloadFileR(list, index, basepath, mod, torrent)
            }
            break
          default:
            downloadErrored(err.code)
            break
        }
      }).on('end', () => {
        if (cur.RelativPath.includes('.bisign')) {
          updateProgressServerBisign({
            totalSize: size,
            totalDownloaded: downloaded,
            fileName: cur.FileName,
            fileSize: cur.Size
          })
        }
        downloaded += cur.Size
        if (cancel) {
          cancel = false
          cancelled()
        } else {
          if (index === list.length - 1) {
            downloadFinished(mod)
          } else {
            downloadFileR(list, index + 1, basepath, mod, torrent)
          }
        }
      }).pipe(fs.createWriteStream(dest))
    }
  } catch (e) {
    console.log(e)
    mkpath(folder, () => {
      if (index === list.length - 1) {
        downloadFinished(mod)
      } else {
        downloadFileR(list, index, basepath, mod, torrent)
      }
    })
  }
}

const downloadFinished = (mod) => {
  checkModCppSync(path, mod)
  ipcRenderer.send('to-app', {
    type: 'update-dl-progress-done'
  })
}

const downloadErrored = (msg) => {
  ipcRenderer.send('to-app', {
    type: 'update-dl-progress-error',
    err_msg: msg
  })
}

const downloadErrorNotify = (msg) => {
  ipcRenderer.send('to-app', {
    type: 'notify-dl',
    err_msg: msg
  })
}

const initTorrent = (folder, torrentURL) => {
  path = folder.replace('addons', '')
  update = setInterval(() => {
    updateProgressTorrentInit({
      torrentUploadSpeedState: client.progress
    })
    if (cancel) {
      try {
        client.destroy((err) => {
          if (err) {
            console.log(err)
          }
          client = window.client = new WebTorrent({
            maxConns: 150
          })
          clearInterval(update)
          cancelled()
        })
      } catch (e) {
        console.log(e)
        client = window.client = new WebTorrent({
          maxConns: 150
        })
        clearInterval(update)
        cancelled()
      }
    }
  },
  1000
  )
  client.add(torrentURL, {
    path: path
  }, (torrent) => {
    clearInterval(update)
    update = setInterval(() => {
      if (!cancel) {
        updateProgressTorrent({
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
        })
      } else {
        torrent.destroy(() => {
          clearInterval(update)
          cancelled()
        })
      }
    },
    1000
    )
    torrent.on('done', () => {
      torrent.destroy(() => {
        clearInterval(update)
        cancelled()
      })
      changeStatus(false, 'Abgeschlossen - Prüfung ausstehend', 'Inaktiv')
    })
  })

  client.on('error', (err) => {
    changeStatus(false, 'Torrent - Fehler', 'Fataler Fehler')
    console.log(err)
  })
}

const quickCheckR = (list, index, basepath, mod) => {
  let cur = list[index]
  let dest = basepath + cur.RelativPath
  if (fs.existsSync(dest)) {
    try {
      let stats = fs.lstatSync(dest)
      if (dest.includes('.bisign')) {
        hasha.fromFile(dest, {algorithm: 'md5'}).then(hash => {
          if (cur.Hash.toUpperCase() !== hash.toUpperCase()) {
            ipcRenderer.send('to-app', {
              type: 'update-quickcheck',
              update: 1,
              mod: mod
            })
          } else {
            if (index === list.length - 1) {
              ipcRenderer.send('to-app', {
                type: 'update-quickcheck',
                update: 2,
                mod: mod
              })
            } else {
              quickCheckR(list, index + 1, basepath, mod)
            }
          }
        })
      } else {
        if (cur.Size !== stats.size) {
          ipcRenderer.send('to-app', {
            type: 'update-quickcheck',
            update: 1,
            mod: mod
          })
        } else {
          if (index === list.length - 1) {
            ipcRenderer.send('to-app', {
              type: 'update-quickcheck',
              update: 2,
              mod: mod
            })
          } else {
            quickCheckR(list, index + 1, basepath, mod)
          }
        }
      }
    } catch (e) {
      console.log(e)
      ipcRenderer.send('to-app', {
        type: 'update-quickcheck',
        update: 1,
        mod: mod
      })
    }
  } else {
    ipcRenderer.send('to-app', {
      type: 'update-quickcheck',
      update: 1,
      mod: mod
    })
  }
}

const hashListR = (list, index, basepath, dllist, mod, checked, callback) => {
  let cur = list[index]
  let dest = basepath + cur.RelativPath
  let size = 0
  list.forEach((cur) => {
    size += cur.Size
  })
  updateProgressHash({
    index: index,
    size: list.length,
    totalFileSize: size,
    totalChecked: checked
  }, cur.FileName, mod)
  if (fs.existsSync(dest)) {
    try {
      hasha.fromFile(dest, {algorithm: 'md5'}).then(hash => {
        if (cur.Hash.toUpperCase() !== hash.toUpperCase()) {
          dllist.push(cur)
        }
        let stats = fs.lstatSync(dest)
        checked += stats.size
        if (index === list.length - 1) {
          callback(null, dllist)
        } else {
          if (cancel) {
            cancel = false
            let reason = 'Cancelled'
            callback(reason)
          } else {
            hashListR(list, index + 1, basepath, dllist, mod, checked, callback)
          }
        }
      })
    } catch (e) {
      console.log(e)
      dllist.push(cur)
      if (index === list.length - 1) {
        callback(null, dllist)
      } else {
        if (cancel) {
          cancel = false
          let reason = 'Cancelled'
          callback(reason)
        } else {
          hashListR(list, index + 1, basepath, dllist, mod, checked, callback)
        }
      }
    }
  } else {
    dllist.push(cur)
    if (index === list.length - 1) {
      callback(null, dllist)
    } else {
      if (cancel) {
        cancel = false
        let reason = 'Cancelled'
        callback(reason)
      } else {
        hashListR(list, index + 1, basepath, dllist, mod, checked, callback)
      }
    }
  }
}

const checkModCppSync = (basepath, mod) => {
  let dest = basepath + mod.Directories
  if (fs.existsSync(dest)) {
    dest = pathf.join(dest, 'mod.cpp')
    if (!fs.existsSync(dest)) {
      let data = `dir="${mod.Directories}";${os.EOL}name="${mod.Name}";${os.EOL}picture="RealLifeRPG.paa";${os.EOL}actionName="Website";${os.EOL}action="http://realliferpg.de/";${os.EOL}description="${mod.Name}";`
      fs.writeFileSync(dest, data)
    }
  }
}

const quickCheckListR = (list, index, basepath, dllist, mod, callback) => {
  let cur = list[index]
  let dest = basepath + cur.RelativPath
  updateProgressQuick({
    index: index,
    size: list.length
  }, cur.FileName, mod)
  if (fs.existsSync(dest)) {
    try {
      let stats = fs.lstatSync(dest)
      if (dest.includes('.bisign')) {
        hasha.fromFile(dest, {algorithm: 'md5'}).then(hash => {
          if (cur.Hash.toUpperCase() !== hash.toUpperCase()) {
            dllist.push(cur)
          }
          if (index === list.length - 1) {
            callback(null, dllist)
          } else {
            quickCheckListR(list, index + 1, basepath, dllist, mod, callback)
          }
        })
      } else {
        if (cur.Size !== stats.size) {
          dllist.push(cur)
        }
        if (index === list.length - 1) {
          callback(null, dllist)
        } else {
          quickCheckListR(list, index + 1, basepath, dllist, mod, callback)
        }
      }
    } catch (e) {
      console.log(e)
      dllist.push(cur)
      if (index === list.length - 1) {
        callback(null, dllist)
      } else {
        quickCheckListR(list, index + 1, basepath, dllist, mod, callback)
      }
    }
  } else {
    dllist.push(cur)
    if (index === list.length - 1) {
      callback(null, dllist)
    } else {
      quickCheckListR(list, index + 1, basepath, dllist, mod, callback)
    }
  }
}

const updateProgressServer = (state) => {
  ipcRenderer.send('to-app', {
    type: 'update-dl-progress-server',
    state: state
  })
}

const updateProgressServerBisign = (state) => {
  ipcRenderer.send('to-app', {
    type: 'update-dl-progress-server-bisign',
    state: state
  })
}

const updateProgressTorrent = (state) => {
  ipcRenderer.send('to-app', {
    type: 'update-dl-progress-torrent',
    state: state
  })
}

const updateProgressSeeding = (state) => {
  ipcRenderer.send('to-app', {
    type: 'update-dl-progress-seeding',
    state: state
  })
}

const updateProgressTorrentInit = (state) => {
  ipcRenderer.send('to-app', {
    type: 'update-torrent-progress-init',
    state: state
  })
}

const changeStatus = (downloading, status, hint) => {
  ipcRenderer.send('to-app', {
    type: 'status-change',
    status: status,
    downloading: downloading,
    hint: hint
  })
}

const cancelled = () => {
  ipcRenderer.send('to-app', {
    type: 'cancelled'
  })
}

const updateProgressQuick = (state, filename, mod) => {
  ipcRenderer.send('to-app', {
    type: 'update-quickcheck-progress',
    state: state,
    fileName: filename,
    mod: mod
  })
}

const updateProgressHash = (state, filename, mod) => {
  ipcRenderer.send('to-app', {
    type: 'update-hash-progress',
    state: state,
    fileName: filename,
    mod: mod
  })
}

const finishProgressHash = (list, mod) => {
  checkModCppSync(path, mod)
  ipcRenderer.send('to-app', {
    type: 'update-hash-progress-done',
    list: list,
    mod: mod
  })
}

const getHashlist = (mod, callback) => {
  ipcRenderer.send('to-web', {
    type: 'get-url',
    callback: callback,
    url: config.APIBaseURL + config.APIModHashlistURL + mod.Id,
    callBackTarget: 'to-dwn',
    mod: mod
  })
}
