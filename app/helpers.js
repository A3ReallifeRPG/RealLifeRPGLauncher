const {ipcRenderer, clipboard} = require('electron')
const config = require('../config')

module.exports = {
  getRefreshTime: (date) => {
    let d = new Date(date)
    let hours = d.getHours()
    let minutes = d.getMinutes()
    if (hours < 10) hours = '0' + hours
    if (minutes < 10) minutes = '0' + minutes

    return hours + ':' + minutes
  },
  copyToClipboard: (text) => {
    clipboard.writeText(text)
    return text
  },
  getChangelog: () => {
    ipcRenderer.send('to-web', {
      type: 'get-url',
      callback: 'changelog-callback',
      url: config.APIBaseURL + config.APIChangelogURL,
      callBackTarget: 'to-app'
    })
  },
  getServers: () => {
    ipcRenderer.send('to-web', {
      type: 'get-url',
      callback: 'servers-callback',
      url: config.APIBaseURL + config.APIServersURL,
      callBackTarget: 'to-app'
    })
  },
  getNotification: () => {
    ipcRenderer.send('to-web', {
      type: 'get-url',
      callback: 'notification-callback',
      url: config.APIBaseURL + config.APINotificationURL,
      callBackTarget: 'to-app'
    })
  },
  getFuelstations: () => {
    ipcRenderer.send('to-web', {
      type: 'get-url',
      callback: 'fuelstations-callback',
      url: config.APIBaseURL + config.APIFuelStationURL,
      callBackTarget: 'to-app'
    })
  },
  getTwitch: () => {
    ipcRenderer.send('to-web', {
      type: 'get-url',
      callback: 'twitch-callback',
      url: config.APIBaseURL + config.APITwitchURL,
      callBackTarget: 'to-app'
    })
  },
  toGB: (val) => {
    return (val / 1000000000).toFixed(3)
  },
  toMB: (val) => {
    return (val / 1000000).toFixed(3)
  },
  toProgress: (val) => {
    return (val * 100).toFixed(3)
  },
  toFileProgress: (filesize, downloaded) => {
    return (100 / filesize * downloaded).toFixed(2)
  },
  cutName: (name) => {
    if (name.length > 30) {
      return name.substring(0, 30) + '...'
    } else {
      return name
    }
  },
  spawnNotification: (message) => {
    new Notification('ReallifeRPG', { // eslint-disable-line
      body: message
    })
  },
  appLoaded: () => {
    ipcRenderer.send('app-loaded')
  },
  getPlayerData: (ApiKey) => {
    ipcRenderer.send('to-web', {
      type: 'get-url',
      callback: 'player-callback',
      url: config.APIBaseURL + config.APIPlayerURL + ApiKey,
      callBackTarget: 'to-app'
    })
  },
  getStatisticsData: () => {
    ipcRenderer.send('to-web', {
      type: 'get-url',
      callback: 'statistics-callback',
      url: config.APIBaseURL + config.APIServersLogURL,
      callBackTarget: 'to-app'
    })
  }
}
