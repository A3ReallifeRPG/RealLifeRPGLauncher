const fs = require('fs')
const request = require('request')
const progress = require('request-progress')
const mkpath = require('mkpath')
const WebTorrent = require('webtorrent')
const hasha = require('hasha')
const config = require('../config')
require('events').EventEmitter.defaultMaxListeners = Infinity
const {ipcRenderer} = require('electron')

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
      console.log(args.mod.Torrent)
      break
    case 'start-mod-hash':
      cancel = false
      path = args.path
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
      getHashlist(args.mod, 'hashlist-callback-update')
      break
    case 'hashlist-callback-dwn':
      cancel = false
      dwnMod(args)
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
      console.log(args)
      dwnlist(args)
      break
    case 'hashlist-callback-quickcheck':
      cancel = false
      quickchecklist(args)
      break
    case 'cancel':
      cancel = true
      break
  }
})

const dwnMod = (args) => {
  downloaded = 0
  if (args.args.mod.Torrent !== '') {
    downloadFileRecursive(args.data.data, 0, path, args.args.mod.DownloadUrl, true, args.args.mod.Torrent)
  } else {
    downloadFileRecursive(args.data.data, 0, path, args.args.mod.DownloadUrl, false, args.args.mod.Torrent)
  }
}

const dwnlist = (args) => {
  downloaded = 0
  downloadFileRecursive(args.list, 0, path, args.mod.DownloadUrl, args.torrent, args.mod.Torrent)
}

const updateMod = (args) => {
  cleanFileRecursive(listDiff(args.data.data, path, args.args.mod), 0, path, quickCheckRecursiveList, args.data.data, 0, path, [], args.args.mod)
}

const quickchecklist = (args) => {
  try {
    fs.lstatSync(path + args.args.mod.Directories)
    quickCheckRecursive(args.data.data, 0, path, args.args.mod)
  } catch (e) {
    console.log(e)
    ipcRenderer.send('to-app', {
      type: 'update-quickcheck',
      update: 0,
      mod: args.args.mod
    })
  }
}

const hashMod = (args) => {
  cleanFileRecursive(listDiff(args.data.data, path, args.args.mod), 0, path, hashFileRecursive, args.data.data, 0, path, [], args.args.mod)
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

const findFileInList = (list, path, basepath) => {
  let found = false
  list.forEach((listvalue) => {
    if (basepath.replace(/\\/g, '/') + listvalue.RelativPath.replace(/\\/g, '/') === path.replace(/\\/g, '/')) {
      found = true
    }
  })
  return [found, path]
}

const listDiff = (list, basepath, mod) => {
  let files = walkFolder(basepath + mod.Directories)
  let toDelete = []
  files.forEach((filesvalue) => {
    let search = findFileInList(list, filesvalue, basepath)
    if (!search[0]) {
      toDelete.push(search[1])
    }
  })
  return toDelete
}

const cleanFileRecursive = (list, index, basepath, callback, hashlist, hashIndex, path, dllist, mod) => {
  try {
    fs.unlink(list[index])
    if (list.length > index + 1) {
      cleanFileRecursive(list, index + 1, basepath, callback, hashlist, hashIndex, dllist, mod)
    } else {
      callback(hashlist, hashIndex, path, dllist, mod)
    }
  } catch (e) {
    if (list.length > index + 1) {
      cleanFileRecursive(list, index + 1, basepath, callback, hashlist, hashIndex, dllist, mod)
    } else {
      callback(hashlist, hashIndex, path, dllist, mod)
    }
  }
}

const initSeeding = (dirPath, TorrentURL) => {
  update = setInterval(() => {
    updateProgressTorrentInit({
      torrentUploadSpeedState: client.progress
    })
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

const downloadFileRecursive = (list, index, basepath, dlserver, torrent, torrentURL) => {
  let dest = basepath + list[index].RelativPath
  let folder = dest.replace(list[index].FileName, '')

  try {
    let stats = fs.lstatSync(folder)
    if (!(stats.isDirectory() && folder.includes('addons'))) {
      dlFileCallback(list, index, dest, basepath, dlserver, torrent, torrentURL)
    } else {
      if (torrent) {
        initTorrent(folder, torrentURL)
      } else {
        dlFileCallback(list, index, dest, basepath, dlserver, torrent, torrentURL)
      }
    }
  } catch (e) {
    mkpath(folder, () => {
      if (!folder.includes('addons') && torrent) {
        dlFileCallback(list, index, dest, basepath, dlserver, torrent, torrentURL)
      } else {
        if (torrent) {
          initTorrent(folder, torrentURL)
        } else {
          dlFileCallback(list, index, dest, basepath, dlserver, torrent, torrentURL)
        }
      }
    })
  }
}

const dlFileCallback = (list, index, dest, basepath, dlserver, torrent, torrentURL) => {
  let size = 0
  let requestobj = null
  list.forEach((cur) => {
    size += cur.Size
  })
  progress(requestobj = request(dlserver + list[index].RelativPath), {}).on('progress', (state) => {
    if (cancel) {
      requestobj.abort()
    }
    state.totalSize = size
    state.totalDownloaded = downloaded
    state.fileName = list[index].FileName
    state.fileSize = list[index].Size
    updateProgressServer(state)
  }).on('error', (err) => {
    console.log(err)
  }).on('end', () => {
    if (list[index].RelativPath.includes('.bisign')) {
      updateProgressServerBisign({
        totalSize: size,
        totalDownloaded: downloaded,
        fileName: list[index].FileName,
        fileSize: list[index].Size
      })
    }
    downloaded += list[index].Size
    if (cancel) {
      cancel = false
      cancelled()
    } else {
      if (list.length > index + 1) {
        downloadFileRecursive(list, index + 1, basepath, dlserver, torrent, torrentURL)
      } else {
        downloadFinished()
      }
    }
  }).pipe(fs.createWriteStream(dest))
}

const hashFileRecursive = (list, index, basepath, dllist, mod) => {
  let dest = basepath + list[index].RelativPath

  if (cancel) {
    cancel = false
    cancelled()
  } else {
    updateProgressHash({
      index: index,
      size: list.length
    }, list[index].FileName, mod)

    try {
      fs.lstatSync(dest.replace(list[index].FileName, ''))
      fs.lstatSync(dest)
      hasha.fromFile(dest, {
        algorithm: 'md5'
      }).then((hash) => {
        if (list[index].Hash.toUpperCase() !== hash.toUpperCase()) {
          dllist.push(list[index])
        }
        if (list.length > index + 1) {
          hashFileRecursive(list, index + 1, basepath, dllist, mod)
        } else {
          finishProgressHash(dllist, mod)
        }
      })
    } catch (e) {
      dllist.push(list[index])
      if (list.length > index + 1) {
        hashFileRecursive(list, index + 1, basepath, dllist, mod)
      } else {
        finishProgressHash(dllist, mod)
      }
    }
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

const quickCheckRecursive = (list, index, basepath, mod) => {
  try {
    let dest = basepath + list[index].RelativPath
    let stats = fs.lstatSync(dest)
    if (dest.includes('.bisign')) {
      hasha.fromFile(dest, {
        algorithm: 'md5'
      }).then((hash) => {
        if (list[index].Hash.toUpperCase() !== hash.toUpperCase()) {
          ipcRenderer.send('to-app', {
            type: 'update-quickcheck',
            update: 1,
            mod: mod
          })
        } else {
          if (list.length > index + 1) {
            quickCheckRecursive(list, index + 1, basepath, mod)
          } else {
            ipcRenderer.send('to-app', {
              type: 'update-quickcheck',
              update: 2,
              mod: mod
            })
          }
        }
      })
    } else if (list[index].Size !== stats.size) {
      ipcRenderer.send('to-app', {
        type: 'update-quickcheck',
        update: 1,
        mod: mod
      })
    } else {
      if (list.length > index + 1) {
        quickCheckRecursive(list, index + 1, basepath, mod)
      } else {
        ipcRenderer.send('to-app', {
          type: 'update-quickcheck',
          update: 2,
          mod: mod
        })
      }
    }
  } catch (e) {
    ipcRenderer.send('to-app', {
      type: 'update-quickcheck',
      update: 1,
      mod: mod
    })
  }
}

const quickCheckRecursiveList = (list, index, basepath, dllist, mod) => {
  try {
    let dest = basepath + list[index].RelativPath
    let stats = fs.lstatSync(dest)
    if (dest.includes('.bisign')) {
      hasha.fromFile(dest, {
        algorithm: 'md5'
      }).then((hash) => {
        if (list[index].Hash.toUpperCase() !== hash.toUpperCase()) {
          dllist.push(list[index])
        }
        if (list.length > index + 1) {
          quickCheckRecursiveList(list, index + 1, basepath, dllist, mod)
        } else {
          finishProgressHash(dllist, mod)
        }
      })
    } else if (list[index].Size !== stats.size) {
      dllist.push(list[index])
      if (list.length > index + 1) {
        quickCheckRecursiveList(list, index + 1, basepath, dllist, mod)
      } else {
        finishProgressHash(dllist, mod)
      }
    } else {
      if (list.length > index + 1) {
        quickCheckRecursiveList(list, index + 1, basepath, dllist, mod)
      } else {
        finishProgressHash(dllist, mod)
      }
    }
  } catch (e) {
    dllist.push(list[index])
    if (list.length > index + 1) {
      quickCheckRecursiveList(list, index + 1, basepath, dllist, mod)
    } else {
      finishProgressHash(dllist, mod)
    }
  }
}

const walkFolder = (dir) => {
  let results = []
  let list = fs.readdirSync(dir)
  list.forEach((file) => {
    file = dir + '/' + file
    let stat = fs.statSync(file)
    if (stat && stat.isDirectory()) results = results.concat(walkFolder(file))
    else results.push(file)
  })
  return results
}
