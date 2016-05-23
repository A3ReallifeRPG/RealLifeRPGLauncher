const electron = require('electron');

const app = require('electron').app

const BrowserWindow = require('electron').BrowserWindow

const {
    ipcMain
} = require('electron');

const {ipcRenderer} = require('electron');

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
