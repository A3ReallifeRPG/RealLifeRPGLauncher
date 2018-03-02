const fs = require('fs')
const request = require('request')
const progress = require('request-progress')
const mkpath = require('mkpath')
const WebTorrent = require('webtorrent')
const hasha = require('hasha')
const config = require('../config')
require('events').EventEmitter.defaultMaxListeners = Infinity
const {ipcRenderer} = require('electron')
const async = require('async')
const recursive = require('recursive-readdir')
const pathf = require('path')

let cancel = false
let downloaded = 0
let update = null

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
    case 'cancel':
      cancel = true
      break
  }
})

const downloadMod = (args) => {
  finishProgressHash(args.data.data, args.args.mod)
}

const downloadList = (args) => {
  downloaded = 0
  downloadFileR(args.list, 0, path, args.mod, args.torrent)
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
      progress(requestobj = request(mod.DownloadUrl + cur.RelativPath), {}).on('progress', (state) => {
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
            downloadFinished()
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
        downloadFinished()
      } else {
        downloadFileR(list, index, basepath, mod, torrent)
      }
    })
  }
}

const downloadFinished = () => {
  ipcRenderer.send('to-app', {
    type: 'update-dl-progress-done'
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
          todrrentETAState: torrent.timeRemaining,
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
    type: 'update-chickcheck-progress',
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
