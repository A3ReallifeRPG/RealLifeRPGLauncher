if (require('electron-squirrel-startup')) return;

const electron = require('electron');

const app = require('electron').app

const path = require('path')

const shell = require('electron').shell;

const {session} = require('electron')

const {
    Menu
} = require('electron')

const autoUpdater = require('electron').autoUpdater;

const BrowserWindow = require('electron').BrowserWindow
const {
    ipcMain
} = require('electron');

const filter = {
  urls: ['https://*.twitter.com/i/*']
}

// ------------------------------------------- squirrel stuff (for updating) ----------------------------------------------------------------

// this should be placed at top of index.js to handle setup events quickly
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
            spawnedProcess = ChildProcess.spawn(command, args, {
                detached: true
            });
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


autoUpdater.addListener("update-available", function(event) {

});
autoUpdater.addListener("update-downloaded", function(event, releaseNotes, releaseName, releaseDate, updateURL) {
    var args = {
        releaseNotes: releaseNotes,
        releaseName: releaseName,
        releaseDate: releaseDate,
        updateURL: updateURL
    };
    win.webContents.send('update-downloaded', args);
});
autoUpdater.addListener("error", function(error) {

});
autoUpdater.addListener("checking-for-update", function(event) {

});
autoUpdater.addListener("update-not-available", function(event) {

});

var os = require('electron').os;
var version = app.getVersion();


autoUpdater.setFeedURL('http://deploy.realliferpg.de/update/win/' + version);
autoUpdater.checkForUpdates();

// ------------------------------------------- real stuff that does something ----------------------------------------------------------------

let win;
let downWin;
let webWin;

function createWindow() {

    //web process
    webWin = new BrowserWindow({
        icon: 'icon/workericon.ico',
        width: 1000,
        height: 550
    });
    webWin.loadURL(`file://${__dirname}/pages/web.html`);
    webWin.webContents.openDevTools({
        detach: false
    });
    //download process
    downWin = new BrowserWindow({
        icon: 'icon/workericon.ico',
        width: 1000,
        height: 550
    });
    downWin.loadURL(`file://${__dirname}/app/dwn.html`);
    downWin.webContents.openDevTools({
        detach: false
    });

    // Create the browser window.
    win = new BrowserWindow({
        icon: 'icon/appicon.ico',
        width: 1320,
        height: 700,
        minWidth: 1320,
        minHeight: 700,
        maxWidth: 1920,
        maxHeight: 1080
    });

    win.loadURL(`file://${__dirname}/index.html`);

    win.on('closed', () => {
        app.quit();
    });

    webWin.on('closed', () => {
        app.quit();
    });

    downWin.on('closed', () => {
        app.quit();
    });

    setUpIpcHandlers();
}


function setUpIpcHandlers() {
    ipcMain.on('to-dwn', (event, arg) => {
        downWin.webContents.send('to-dwn', arg);
    });

    ipcMain.on('message-to-webwin', (event, arg) => {
        webWin.webContents.send('webwin-receiver', arg);
    });

    ipcMain.on('message-to-render', (event, arg) => {
        win.webContents.send('render-receiver', arg);
    });
}

app.on('ready', function() {
    createWindow();
    session.defaultSession.webRequest.onBeforeRequest(filter, (callback) => {
      callback.cancel = true;
    })
    /*
    wintray = new Tray(app.getAppPath() + '/app/icon/tray.ico');

    var contextMenu = Menu.buildFromTemplate([{
        label: 'Nach Updates suchen',
        click: function() {
            autoUpdater.checkForUpdates();
        }
    }, {
        label: 'RealLifeRPG.de',
        click: function() {
            shell.openExternal('https://realliferpg.de/');
        }
    }, {
        label: 'Beenden',
        click: function() {
            app.quit();
        }
    }]);
    wintray.setToolTip('RealLifeRPG Launcher')
    wintray.setContextMenu(contextMenu);

    wintray.addListener("click", function(error) {
        win.focus();
    });

    wintray.addListener("double-click", function(error) {
        win.focus();
    });
    */
});

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});

ipcMain.on('winprogress-change', (event, arg) => {
    win.setProgressBar(arg.progress);
});

ipcMain.on('restartOnUpdate', (event, arg) => {
    autoUpdater.quitAndInstall();
});

ipcMain.on('check-for-update', (event) => {
    autoUpdater.checkForUpdates();
});

ipcMain.on('focus-window', (event) => {
    win.focus();
});

ipcMain.on('open-devtools', (event) => {
    win.webContents.openDevTools({
        detach: true
    });
    webWin.show()
    downWin.show()
});

ipcMain.on('close-devtools', (event) => {
    win.webContents.closeDevTools()
    webWin.hide()
    downWin.hide()
});

ipcMain.on('toggle-devtools', (event) => {
    if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools()
        webWin.hide()
        downWin.hide()
    } else {
        win.webContents.openDevTools({
            detach: true
        });
        webWin.show()
        downWin.show()
    }
});
