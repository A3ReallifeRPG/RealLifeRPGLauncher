var electronInstaller = require('electron-winstaller');


resultPromise = electronInstaller.createWindowsInstaller({
    appDirectory: 'F:/Developement/Electron/RealLifeRPG/node_modules/electron-prebuilt/dist/',
    outputDirectory: '/tmp/build/',
    authors: 'My App Inc.',
    exe: 'electron.exe'
  });

resultPromise.then(() => console.log("It worked!"), (e) => console.log(`No dice: ${e.message}`));
