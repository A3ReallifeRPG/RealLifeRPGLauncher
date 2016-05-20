const electron = require('electron');
// Module to control application life.

const app = require('electron').app
    // Module to create native browser window.
const BrowserWindow = require('electron').BrowserWindow

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
let downWin;

function createWindow() {
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

    downWin = new BrowserWindow({
        width: 1000,
        height: 550
    });
    downWin.loadURL(`file://${__dirname}/pages/download.html`);
    downWin.webContents.openDevTools({
        detach: false
    });


    win.on('closed', () => {
        downWin = null;
        win = null;
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
