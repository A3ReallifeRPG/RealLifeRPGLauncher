const {app} = require('electron')
if (require('electron-squirrel-startup')) app.quit()

const path = require('path')
const autoUpdater = require('electron').autoUpdater
const BrowserWindow = require('electron').BrowserWindow
const {ipcMain} = require('electron')

// ------------------------------------------- squirrel stuff (for updating) ----------------------------------------------------------------

if (handleSquirrelEvent()) app.quit()

function handleSquirrelEvent () {
  if (process.argv.length === 1) {
    return false
  }

  const ChildProcess = require('child_process')

  const appFolder = path.resolve(process.execPath, '..')
  const rootAtomFolder = path.resolve(appFolder, '..')
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'))
  const exeName = path.basename(process.execPath)

  const spawn = function (command, args) {
    let spawnedProcess

    try {
      spawnedProcess = ChildProcess.spawn(command, args, {
        detached: true
      })
    } catch (err) {}
    return spawnedProcess
  }

  const spawnUpdate = function (args) {
    return spawn(updateDotExe, args)
  }

  const squirrelEvent = process.argv[1]
  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(['--createShortcut', exeName])

      setTimeout(app.quit, 1000)
      return true

    case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers

      // Remove desktop and start menu shortcuts
      spawnUpdate(['--removeShortcut', exeName])

      setTimeout(app.quit, 1000)
      return true

    case '--squirrel-obsolete':
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated

      app.quit()
      return true
  }
}

autoUpdater.addListener('update-available', function (event) {

})
autoUpdater.addListener('update-downloaded', function (event, releaseNotes, releaseName, releaseDate, updateURL) {
  var args = {
    releaseNotes: releaseNotes,
    releaseName: releaseName,
    releaseDate: releaseDate,
    updateURL: updateURL
  }
  win.webContents.send('update-downloaded', args)
})

autoUpdater.addListener('error', function (error) { // eslint-disable-line

})

autoUpdater.addListener('checking-for-update', function (event) {

})

autoUpdater.addListener('update-not-available', function (event) {

})

var version = app.getVersion()

autoUpdater.setFeedURL('http://deploy.realliferpg.de/update/win/' + version)
autoUpdater.checkForUpdates()

// ------------------------------------------- real stuff that does something ----------------------------------------------------------------

let win
let downWin
let webWin

function createWindow () {
  // web process
  webWin = new BrowserWindow({
    icon: 'icon/workericon.ico',
    width: 1000,
    height: 550
  })
  webWin.loadURL(`file://${__dirname}/app/web.html`)
  webWin.webContents.openDevTools({
    detach: false
  })
  // download process
  downWin = new BrowserWindow({
    icon: 'icon/workericon.ico',
    width: 1000,
    height: 550
  })
  downWin.loadURL(`file://${__dirname}/app/dwn.html`)
  downWin.webContents.openDevTools({
    detach: false
  })
  // Create the browser window.
  win = new BrowserWindow({
    icon: 'icon/appicon.ico',
    width: 1320,
    height: 750,
    minWidth: 1320,
    minHeight: 750,
    maxWidth: 1920,
    maxHeight: 1080
  })
  win.webContents.openDevTools({
    detach: true
  })
  win.loadURL(`file://${__dirname}/index.html`)

  win.on('closed', function () {
    app.quit()
  })

  webWin.on('closed', function () {
    app.quit()
  })

  downWin.on('closed', function () {
    app.quit()
  })

  setUpIpcHandlers()
}

function setUpIpcHandlers () {
  ipcMain.on('to-dwn', function (event, arg) {
    downWin.webContents.send('to-dwn', arg)
  })

  ipcMain.on('to-web', function (event, arg) {
    webWin.webContents.send('to-web', arg)
  })

  ipcMain.on('to-app', function (event, arg) {
    win.webContents.send('to-app', arg)
  })
}

app.on('ready', function () {
  createWindow()
})

app.on('window-all-closed', function () {
  app.quit()
})

app.on('activate', function () {
  if (win === null) {
    createWindow()
  }
})

ipcMain.on('winprogress-change', function (event, arg) {
  win.setProgressBar(arg.progress)
})

ipcMain.on('restartOnUpdate', function (event, arg) {
  autoUpdater.quitAndInstall()
})

ipcMain.on('check-for-update', function (event) {
  autoUpdater.checkForUpdates()
})

ipcMain.on('focus-window', function (event) {
  win.focus()
})

ipcMain.on('open-devtools', function (event) {
  win.webContents.openDevTools({
    detach: true
  })
  webWin.show()
  downWin.show()
})

ipcMain.on('close-devtools', function (event) {
  win.webContents.closeDevTools()
  webWin.hide()
  downWin.hide()
})

ipcMain.on('toggle-devtools', function (event) {
  if (win.webContents.isDevToolsOpened()) {
    win.webContents.closeDevTools()
    webWin.hide()
    downWin.hide()
  } else {
    win.webContents.openDevTools({
      detach: true
    })
    webWin.show()
    downWin.show()
  }
})
