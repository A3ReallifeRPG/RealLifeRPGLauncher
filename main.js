if(require('electron-squirrel-startup')) return;

const electron = require('electron');

const app = require('electron').app

const BrowserWindow = require('electron').BrowserWindow
const {
    ipcMain
} = require('electron');

let win;
let downWin;

function createWindow() {

    //download process
    downWin = new BrowserWindow({
        width: 1000,
        height: 550
    });
    downWin.loadURL(`file://${__dirname}/pages/download.html`);
    downWin.webContents.openDevTools({
        detach: false
    });

    // Create the browser window.
    win = new BrowserWindow({
        width: 1000,
        height: 550,
        minWidth: 1000,
        minHeight: 550
    });
    win.loadURL(`file://${__dirname}/pages/index.html`);

    win.webContents.openDevTools({
        detach: true
    });


    win.on('closed', () => {
        downWin = null;
        win = null;
    });

    setUpIpcHandlers();
}

function setUpIpcHandlers() {
    ipcMain.on('message-to-download', (event, arg) => {
        downWin.webContents.send('download-receiver',arg);
    });

    ipcMain.on('message-to-render', (event, arg) => {
        win.webContents.send('render-receiver',arg);
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});

ipcMain.on('winprogress-change',(event, arg) => {
    win.setProgressBar(arg.progress);
});


//
//  WIN AUTO UPDATE STUFF
//

// this should be placed at top of main.js to handle setup events quickly
if (handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

function handleSquirrelEvent() {
  if (process.argv.length === 1) {
    return false;
  }

  const ChildProcess = require('child_process');
  const path = require('path');

  const appFolder = path.resolve(process.execPath, '..');
  const rootAtomFolder = path.resolve(appFolder, '..');
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
  const exeName = path.basename(process.execPath);

  const spawn = function(command, args) {
    let spawnedProcess, error;

    try {
      spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
    } catch (error) {}

    return spawnedProcess;
  };

  const spawnUpdate = function(args) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(['--createShortcut', exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers

      // Remove desktop and start menu shortcuts
      spawnUpdate(['--removeShortcut', exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-obsolete':
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated

      app.quit();
      return true;
  }
};
