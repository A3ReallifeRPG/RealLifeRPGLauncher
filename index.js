const {ipcRenderer, shell, clipboard} = require('electron')
const humanizeDuration = require('humanize-duration')
const fs = require('fs')
const {dialog, app} = require('electron').remote
const storage = require('electron-json-storage')
const Winreg = require('winreg')
const unzip = require('unzip')
const marked = require('marked')
const $ = window.jQuery = require('./resources/jquery/jquery-1.12.3.min.js')
const child = require('child_process')
const L = require('leaflet')
const Shepherd = require('tether-shepherd')
const path = require('path')
const ping = require('ping')
const moment = require('moment')
const Chart = require('chart.js')
const iCheck = require('icheck') // eslint-disable-line
const config = require('./config')

/* global alertify angular SmoothieChart TimeSeries Notification */

const App = angular.module('App', ['720kb.tooltips']).run(($rootScope) => {
  $rootScope.downloading = false
  $rootScope.AppLoaded = true
  $rootScope.ArmaPath = ''
  $rootScope.AppTitle = 'RealLifeRPG Launcher - ' + app.getVersion() + ' - Mods'
  $rootScope.slide = 0
  $rootScope.theme = 'dark'
  $rootScope.updating = false
  $rootScope.update_ready = false
  $rootScope.player_data = null
  $rootScope.apiKey = ''
  $rootScope.logged_in = false
  $rootScope.logging_in = false

  storage.get('settings', (err, data) => {
    if (err) {
      $rootScope.theme = 'dark'
      throw err
    }

    if (typeof data.theme !== 'undefined') {
      $rootScope.theme = data.theme
    }
  })

  storage.get('player', (err, data) => {
    if (err) throw err

    if (typeof data.apikey !== 'undefined') {
      $rootScope.apiKey = data.apikey
      $rootScope.logging_in = true
      getPlayerData($rootScope.apiKey)
    } else {
      storage.get('settings', (err, data) => {
        if (err) throw err
        $rootScope.ArmaPath = data.armapath
        $rootScope.getMods()
      })
    }
  })

  $rootScope.relaunchUpdate = () => {
    ipcRenderer.send('quitAndInstall')
  }

  $rootScope.refresh = () => {
    storage.get('settings', (err) => {
      if (err) throw err
      $rootScope.getMods()
    })
    getServers()
    getChangelog()
    getTwitch()
    if ($rootScope.logged_in) {
      getPlayerData($rootScope.apiKey)
    }
  }

  $rootScope.login = () => {
    alertify.set({labels: {ok: 'Ok', cancel: 'Abbrechen'}})
    alertify.prompt('Bitte füge deinen Login-Schlüssel ein', (e, str) => {
      if (e) {
        if (str) {
          $.ajax({
            url: config.APIBaseURL + config.APIValidatePlayerURL + str,
            type: 'GET',
            success: (data) => {
              if (data.status === 'Success') {
                alertify.success('Willkommen ' + data.name)
                storage.set('player', {apikey: str}, (err) => {
                  if (err) throw err
                })
                $rootScope.apiKey = str
                $rootScope.logging_in = true
                getPlayerData(str)
                $rootScope.$apply()
              } else {
                $rootScope.login()
                alertify.log('Falscher Schlüssel', 'danger')
                $rootScope.login()
              }
            }
          })
        } else {
          $rootScope.login()
        }
      }
    }, '')
  }

  $rootScope.logout = () => {
    storage.remove('player', (err) => {
      if (err) throw err
    })
    $rootScope.ApiKey = ''
    $rootScope.player_data = null
    $rootScope.logged_in = false
    storage.get('settings', (err) => {
      if (err) throw err
      $rootScope.getMods()
    })
  }

  $rootScope.getMods = () => {
    let url = config.APIBaseURL + config.APIModsURL
    if ($rootScope.logged_in) {
      url += '/' + $rootScope.apiKey
    }
    ipcRenderer.send('to-web', {
      type: 'get-url',
      callback: 'mod-callback',
      url: url,
      callBackTarget: 'to-app'
    })
  }

  ipcRenderer.on('to-app', (event, args) => {
    if (typeof args.args !== 'undefined') {
      if (args.args.callback === 'player-callback') {
        $rootScope.player_data = args.data.data[0]
        $rootScope.player_data.last_change = moment(new Date($rootScope.player_data.last_change)).format('H:mm, DD.MM.YYYY')
        $rootScope.player_data.cash_readable = $rootScope.player_data.cash.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.')
        $rootScope.player_data.bankacc_readable = $rootScope.player_data.bankacc.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.')
        $rootScope.player_data.exp_readable = $rootScope.player_data.exp.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.')
        if ($rootScope.player_data.level !== 30) {
          $rootScope.player_data.exp_progress = Math.round(($rootScope.player_data.exp - (($rootScope.player_data.level - 1) * ($rootScope.player_data.level - 1) * 1000)) / (($rootScope.player_data.level * $rootScope.player_data.level * 1000) - (($rootScope.player_data.level - 1) * ($rootScope.player_data.level - 1) * 1000)) * 100)
        } else {
          $rootScope.player_data.exp_progress = 100
        }

        $rootScope.logged_in = true
        $rootScope.logging_in = false
        storage.get('settings', (err, data) => {
          if (err) throw err
          $rootScope.ArmaPath = data.armapath
          $rootScope.getMods()
        })
        $rootScope.$apply()
      }
    }
  })

  ipcRenderer.on('checking-for-update', () => {
    alertify.log('Suche nach Updates...', 'primary')
    $rootScope.updating = true
    $rootScope.$apply()
  })

  ipcRenderer.on('update-not-available', () => {
    alertify.log('Launcher ist aktuell', 'primary')
    $rootScope.updating = false
    $rootScope.$apply()
  })

  ipcRenderer.on('update-available', () => {
    spawnNotification('Update verfügbar, wird geladen...')
    alertify.log('Update verfügbar, wird geladen...', 'primary')
    $rootScope.updating = true
    $rootScope.$apply()
  })

  ipcRenderer.on('update-downloaded', (event, args) => {
    spawnNotification('Update zur Version ' + args.releaseName + ' bereit.')
    $rootScope.updating = false
    $rootScope.update_ready = true
    $rootScope.$apply()
  })

  $rootScope.$on('ngRepeatFinished', () => {
    $rootScope.tour = new Shepherd.Tour({
      defaults: {
        classes: 'shepherd-theme-square-dark'
      }
    })

    $rootScope.tour.addStep('start', {
      title: 'Willkommen',
      text: 'Hallo! Du hast dir gerade unseren Launcher geladen, wir wollen dich auf eine kleine Tour einladen um dich mit ihm vetraut zu machen.',
      buttons: [{
        text: 'Nein Danke',
        classes: 'shepherd-button-secondary',
        action: $rootScope.endTour
      }, {
        text: 'Weiter',
        action: $rootScope.tour.next
      }]
    })

    $rootScope.tour.addStep('mods', {
      title: 'Mods',
      text: 'Hier kannst du unsere Mods downloaden und prüfen sowie das Spiel starten.',
      attachTo: '.modsTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 0
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('servers', {
      title: 'Server',
      text: 'Hier findest du alle unsere Server und Informationen zu ihnen, auch kannst du von diesem Tab direkt auf einen Server joinen.',
      attachTo: '.serversTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 1
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('player', {
      title: 'Spieler',
      text: 'Nachdem du dich eingeloggt hast findest du hier deine Spielerdaten.',
      attachTo: '.playerTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 2
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('changelog', {
      title: 'Changelog',
      text: 'Hier findest du immer alle Änderungen an der Mission, der Map und den Mods.',
      attachTo: '.changelogTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 3
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('tfar', {
      title: 'Task Force Radio',
      text: 'Hier kannst du das Task Force Radio Plugin für deinen Teamspeak 3 Client installieren, sowie einen Skin der im ReallifeRPG Stil gehalten ist.',
      attachTo: '.tfarTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 4
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('settings', {
      title: 'Einstellungen',
      text: 'Hier findest du Einstellungen wie den Arma 3 Pfad, CPU Anzahl, Theme des Launchers und vieles mehr.',
      attachTo: '.settingsTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 5
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('faq', {
      title: 'FAQ',
      text: 'Hier werden viele oft gestellte Fragen direkt beantwortet. Schau kurz mal hier nach bevor du dich im Support meldest, vielleicht wird deine Frage ja direkt beantwortet.',
      attachTo: '.faqTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 6
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('Twitch', {
      title: 'Über',
      text: 'Hier findest du immer Streamer die gerade auf unserem Server spielen.',
      attachTo: '.twitchTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 7
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('map', {
      title: 'Karte',
      text: 'Hier findest du eine Karte von Abramia auf der du dir den Füllstand aller Tankstellen anzeigen lassen kannst.',
      attachTo: '.mapTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 8
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('about', {
      title: 'Über',
      text: 'Hier kannst du allgemeine Informationen zum Launcher finden.',
      attachTo: '.aboutTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 9
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('end', {
      title: 'Viel Spaß!',
      text: 'Genug gelesen, lad dir unseren Mod runter, installier Task Force Radio, betritt den Server und entdecke deine ganz eigene Weise auf ReallifeRPG zu spielen. Viel Spaß von unserem ganzen Team!',
      buttons: {
        text: 'Beenden',
        action: $rootScope.endTour
      },
      when: {
        show: () => {
          $rootScope.slide = 0
          $rootScope.$apply()
        }
      }
    })

    storage.get('tour', (err, data) => {
      if (err) {
        throw err
      }
      if (typeof data.tour === 'undefined' || data.tour === null) {
        $rootScope.tour.start()
      }
    })
  })

  $rootScope.endTour = () => {
    $rootScope.tour.cancel()
    storage.set('tour', {tour: true}, (err) => {
      if (err) throw err
    })
  }
})

App.controller('navbarController', ['$scope', '$rootScope', ($scope, $rootScope) => {
  $scope.tabs = [
    {
      icon: 'glyphicon glyphicon-home', title: 'Mods', tag: 'modsTabBtn'
    }, {
      icon: 'glyphicon glyphicon-tasks', title: 'Server', tag: 'serversTabBtn'
    }, {
      icon: 'fa fa-user-circle-o', title: 'Spieler', tag: 'playerTabBtn'
    }, {
      icon: 'glyphicon glyphicon-list-alt', title: 'Changelog', tag: 'changelogTabBtn'
    }, {
      icon: 'glyphicon glyphicon-headphones', title: 'TFAR', tag: 'tfarTabBtn'
    }, {
      icon: 'glyphicon glyphicon-cog', title: 'Einstellungen', tag: 'settingsTabBtn'
    }, {
      icon: 'glyphicon glyphicon-question-sign', title: 'FAQ', tag: 'faqTabBtn'
    }, {
      icon: 'fa fa-twitch', title: 'Twitch', tag: 'twitchTabBtn'
    }, {
      icon: 'glyphicon glyphicon-map-marker', title: 'Map', tag: 'mapTabBtn'
    }, {
      icon: 'glyphicon glyphicon-book', title: 'Über', tag: 'aboutTabBtn'
    }]

  $scope.switchSlide = (tab) => {
    $rootScope.slide = $scope.tabs.indexOf(tab)
  }

  $rootScope.$watch(
    'slide', () => {
      $('#carousel-main').carousel($rootScope.slide)
      $rootScope.AppTitle = 'RealLifeRPG Launcher - ' + app.getVersion() + ' - ' + $scope.tabs[$rootScope.slide].title
    }, true
  )

  $scope.$watch(
    'AppTitle', () => {
      document.title = $rootScope.AppTitle
    }, true)

  $scope.tourApp = () => {
    $rootScope.tour.start()
  }
}])

App.controller('modController', ['$scope', '$rootScope', ($scope, $rootScope) => {
  $scope.state = 'Gestoppt'
  $scope.hint = 'Inaktiv'
  $rootScope.downloading = false
  $scope.canCancel = false
  $rootScope.downSpeed = 0
  $rootScope.upSpeed = 0
  $scope.totalProgress = ''
  $scope.totalSize = 0
  $scope.totalDownloaded = 0
  $scope.totalETA = ''
  $scope.totalPeers = 0
  $scope.maxConns = 0
  $scope.fileName = ''
  $scope.fileProgress = ''

  ipcRenderer.on('to-app', (event, args) => {
    switch (args.type) {
      case 'mod-callback':
        $scope.mods = args.data.data
        $scope.loading = false
        $scope.checkUpdates()
        $scope.$apply()
        $('#modScroll').perfectScrollbar()
        break
      case 'update-dl-progress-server':
        $scope.update({
          state: 'Server - Verbunden',
          hint: 'Download via Server läuft',
          downloading: true,
          canCancel: true,
          downSpeed: toMB(args.state.speed),
          upSpeed: 0,
          totalProgress: toFileProgress(args.state.totalSize, args.state.totalDownloaded + args.state.size.transferred),
          totalSize: toGB(args.state.totalSize),
          totalDownloaded: toGB(args.state.totalDownloaded + args.state.size.transferred),
          totalETA: humanizeDuration(Math.round(((args.state.totalSize - (args.state.totalDownloaded + args.state.size.transferred)) / args.state.speed) * 1000), {
            language: 'de',
            round: true
          }),
          totalPeers: 0,
          maxConns: 0,
          fileName: cutName(args.state.fileName),
          fileProgress: toProgress(args.state.percent)
        })
        $scope.graphTimeline.append(new Date().getTime(), toMB(args.state.speed))
        $scope.$apply()
        break
      case 'update-dl-progress-server-bisign':
        $scope.update({
          state: 'Server - Verbunden',
          hint: 'Download via Server läuft',
          downloading: true,
          canCancel: true,
          downSpeed: 0,
          upSpeed: 0,
          totalProgress: toFileProgress(args.state.totalSize, args.state.totalDownloaded),
          totalSize: toGB(args.state.totalSize),
          totalDownloaded: toGB(args.state.totalDownloaded),
          totalETA: 'Lade .bisign Dateien',
          totalPeers: 0,
          maxConns: 0,
          fileName: cutName(args.state.fileName),
          fileProgress: 100
        })
        $scope.graphTimeline.append(new Date().getTime(), toMB(args.state.speed))
        $scope.$apply()
        break
      case 'update-dl-progress-torrent':
        $scope.update({
          state: 'Torrent - Verbunden',
          hint: 'Download via Torrent läuft',
          downloading: true,
          canCancel: true,
          downSpeed: toMB(args.state.torrentDownloadSpeedState),
          upSpeed: toMB(args.state.torrentUploadSpeedState),
          totalProgress: toProgress(args.state.torrentProgressState),
          totalSize: toGB(args.state.torrentSizeState),
          totalDownloaded: toGB(args.state.torrentDownloadedState),
          totalETA: humanizeDuration(Math.round(args.state.torrentETAState), {language: 'de', round: true}),
          totalPeers: args.state.torrentNumPeersState,
          maxConns: args.state.torrentMaxConnsState,
          fileName: '',
          fileProgress: ''
        })
        $scope.graphTimeline.append(new Date().getTime(), toMB(args.state.torrentDownloadSpeedState))
        $scope.$apply()
        break
      case 'update-dl-progress-seeding':
        $scope.update({
          state: 'Torrent - Seeding',
          hint: '',
          downloading: true,
          canCancel: true,
          downSpeed: 0,
          upSpeed: toMB(args.state.torrentUploadSpeedState),
          totalProgress: '',
          totalDownloaded: 0,
          totalETA: '',
          totalPeers: args.state.torrentNumPeersState,
          maxConns: args.state.torrentMaxConnsState,
          fileName: '',
          fileProgress: ''
        })
        $scope.graphTimeline.append(new Date().getTime(), toMB(args.state.torrentUploadSpeedState))
        $scope.$apply()
        break
      case 'torrent-init':
        $scope.update({
          state: 'Torrent - Verbinden...',
          hint: '5 - 10 Minuten',
          downloading: true,
          canCancel: false,
          downSpeed: 0,
          upSpeed: 0,
          totalProgress: '',
          totalSize: 0,
          totalDownloaded: 0,
          totalETA: '',
          totalPeers: 0,
          maxConns: 0,
          fileName: '',
          fileProgress: ''
        })
        break
      case 'status-change':
        $scope.update({
          state: args.status,
          hint: args.hint,
          downloading: args.downloading,
          canCancel: true,
          downSpeed: 0,
          upSpeed: 0,
          totalProgress: '',
          totalSize: 0,
          totalDownloaded: 0,
          totalETA: '',
          totalPeers: 0,
          maxConns: 0,
          fileName: '',
          fileProgress: ''
        })
        break
      case 'update-hash-progress':
        $scope.update({
          state: 'Überprüfung - Läuft',
          hint: '5 - 10 Minuten',
          downloading: true,
          canCancel: true,
          downSpeed: 0,
          upSpeed: 0,
          totalProgress: toProgress(args.state.index / args.state.size),
          totalSize: 0,
          totalDownloaded: 0,
          totalETA: '',
          totalPeers: 0,
          maxConns: 0,
          fileName: cutName(args.fileName),
          fileProgress: ''
        })
        break
      case 'update-hash-progress-done':
        $scope.update({
          state: 'Überprüfung - Abgeschlossen',
          hint: '',
          downloading: false,
          canCancel: true,
          downSpeed: 0,
          upSpeed: 0,
          totalProgress: 100,
          totalSize: 0,
          totalDownloaded: 0,
          totalETA: '',
          totalPeers: 0,
          maxConns: 0,
          fileName: '',
          fileProgress: ''
        })
        let size = 0
        args.list.forEach((cur) => {
          size += cur.Size
        })
        if (size !== 0) {
          if (args.mod.Torrent !== '' && args.mod.Torrent !== null) {
            alertify.set({labels: {ok: 'Torrent', cancel: 'Server'}})
            alertify.confirm(args.list.length + ' Dateien müssen heruntergelanden werden (' + toGB(size) + ' GB)', (e) => {
              if (e) {
                $scope.reset()
                $scope.initListDownload(args.list, true, args.mod)
              } else {
                $scope.reset()
                $scope.initListDownload(args.list, false, args.mod)
              }
            })
          } else {
            $scope.initListDownload(args.list, false, args.mod)
          }
          spawnNotification(args.list.length + ' Dateien müssen heruntergelanden werden (' + toGB(size) + ' GB)')
          $scope.$apply()
        } else {
          spawnNotification('Überprüfung abgeschlossen - Mod ist aktuell.')
          $scope.reset()
        }
        break
      case 'update-torrent-progress-init':
        $scope.update({
          state: 'Torrent - Verbinden',
          hint: '5 - 10 Minuten',
          downloading: true,
          canCancel: false,
          downSpeed: 0,
          upSpeed: 0,
          totalProgress: toProgress(args.state.torrentUploadSpeedState),
          totalSize: 0,
          totalDownloaded: 0,
          totalETA: '',
          totalPeers: 0,
          maxConns: 0,
          fileName: '',
          fileProgress: ''
        })
        break
      case 'update-dl-progress-done':
        $scope.state = 'Abgeschlossen'
        $scope.progress = 100
        spawnNotification('Download abgeschlossen.')
        $scope.reset()
        $scope.checkUpdates()
        break
      case 'cancelled':
        $scope.reset()
        break
      case 'notification-callback':
        if (args.data.Active) {
          alertify.set({labels: {ok: 'Schließen'}})
          alertify.alert(args.data.Notification)
        }
        break
      case 'update-quickcheck':
        $scope.mods.forEach((mod) => {
          if (mod.Id === args.mod.Id) {
            if (args.update === 0) {
              mod.state = [1, 'Downloaden']
            } else if (args.update === 1) {
              mod.state = [2, 'Update verfügbar']
            } else {
              mod.state = [3, 'Spielen']
            }
          }
        })
        $scope.$apply()
        break
    }
  })

  $scope.reset = () => {
    $scope.update({
      state: 'Gestoppt',
      hint: '',
      downloading: false,
      canCancel: false,
      downSpeed: 0,
      upSpeed: 0,
      totalProgress: '',
      totalSize: 0,
      totalDownloaded: 0,
      totalETA: '',
      totalPeers: 0,
      maxConns: 0,
      fileName: '',
      fileProgress: ''
    })
  }

  $scope.init = () => {
    $scope.loading = true
    try {
      fs.lstatSync(app.getPath('userData') + '\\settings.json')
      $scope.initGraph()
    } catch (e) {
      $scope.checkregkey1()
    }
  }

  $scope.initTorrent = (mod) => {
    alertify.log('Seeding wird gestartet', 'primary')
    ipcRenderer.send('to-dwn', {
      type: 'start-mod-seed',
      mod: mod,
      path: $rootScope.ArmaPath
    })
  }

  $scope.initDownload = (mod) => {
    alertify.log('Download wird gestartet', 'primary')
    ipcRenderer.send('to-dwn', {
      type: 'start-mod-dwn',
      mod: mod,
      path: $rootScope.ArmaPath
    })
  }

  $scope.initHash = (mod) => {
    alertify.log('Überprüfung wird gestartet', 'primary')
    ipcRenderer.send('to-dwn', {
      type: 'start-mod-hash',
      mod: mod,
      path: $rootScope.ArmaPath
    })
  }

  $scope.initUpdate = (mod) => {
    alertify.log('Update wird gestartet', 'primary')
    ipcRenderer.send('to-dwn', {
      type: 'start-mod-update',
      mod: mod,
      path: $rootScope.ArmaPath
    })
  }

  $scope.initListDownload = (list, torrent, mod) => {
    $scope.update({
      state: 'Download wird gestarted...',
      hint: '',
      downloading: true,
      canCancel: true,
      downSpeed: 0,
      upSpeed: 0,
      totalProgress: 0,
      totalSize: 0,
      totalDownloaded: 0,
      totalETA: '',
      totalPeers: 0,
      maxConns: 0,
      fileName: '',
      fileProgress: ''
    })
    ipcRenderer.send('to-dwn', {
      type: 'start-list-dwn',
      list: list,
      torrent: torrent,
      mod: mod,
      path: $rootScope.ArmaPath
    })
  }

  $scope.initGraph = () => {
    let bgColor, graphColor

    if ($rootScope.theme === 'light') {
      bgColor = '#ffffff'
      graphColor = '#2780e3'
    } else if ($rootScope.theme === 'dark') {
      bgColor = '#2b3e50'
      graphColor = '#df691a'
    }

    let graphOptions = {
      millisPerPixel: 20,
      grid: {fillStyle: bgColor, strokeStyle: bgColor},
      labels: {fillStyle: '#000000', disabled: true}
    }
    $scope.chart = new SmoothieChart(graphOptions)

    let canvas = document.getElementById('smoothie-chart')

    $scope.graphTimeline = new TimeSeries()
    $scope.chart.addTimeSeries($scope.graphTimeline, {lineWidth: 2, strokeStyle: graphColor})
    $scope.chart.streamTo(canvas, 2000)
  }

  $scope.cancel = () => {
    alertify.log('Wird abgebrochen...', 'primary')
    ipcRenderer.send('to-dwn', {
      type: 'cancel'
    })
  }

  $rootScope.$watch(
    'theme', () => {
      if ($scope.chart !== null) {
        let bgColor, graphColor

        if ($rootScope.theme === 'light') {
          bgColor = '#ffffff'
          graphColor = '#2780e3'
        } else if ($rootScope.theme === 'dark') {
          bgColor = '#2b3e50'
          graphColor = '#df691a'
        }

        $scope.chart.options.grid.fillStyle = bgColor
        $scope.chart.options.grid.strokeStyle = bgColor
        $scope.chart.seriesSet[0].options.lineWidth = 2
        $scope.chart.seriesSet[0].options.strokeStyle = graphColor
      }
    }, true)

  $scope.update = (update) => {
    $scope.state = update.state
    $scope.hint = update.hint
    $rootScope.downloading = update.downloading
    $scope.canCancel = update.canCancel
    $rootScope.downSpeed = update.downSpeed
    $rootScope.upSpeed = update.upSpeed
    $scope.totalProgress = update.totalProgress
    $scope.totalSize = update.totalSize
    $scope.totalDownloaded = update.totalDownloaded
    $scope.totalPeers = update.totalPeers
    $scope.maxConns = update.maxConns
    $scope.fileName = update.fileName
    $scope.fileProgress = update.fileProgress
    if (update.totalETA === 'Infinity Jahre') {
      $scope.totalETA = 'Berechne...'
    } else {
      $scope.totalETA = update.totalETA
    }
    $scope.$apply()
  }

  $scope.$watch(
    'totalProgress', () => {
      ipcRenderer.send('winprogress-change', {
        progress: $scope.totalProgress / 100
      })
    }, true)

  $rootScope.$watch(
    'ArmaPath', () => {
      if ($scope.mods !== undefined) {
        $scope.checkUpdates()
      }
    }, true)

  $scope.action = (mod) => {
    switch (mod.state[0]) {
      case 1:
        $scope.initDownload(mod)
        break
      case 2:
        $scope.initUpdate(mod)
        break
      case 3:
        $rootScope.slide = 1
        break
      default:
        break
    }
  }

  $scope.openModDir = (mod) => {
    shell.showItemInFolder(path.join($rootScope.ArmaPath, mod.Directories, 'addons'))
  }

  $scope.checkUpdates = () => {
    $scope.mods.forEach((mod) => {
      if (mod.HasGameFiles) {
        if ($rootScope.ArmaPath !== '') {
          mod.state = [0, 'Suche nach Updates...']
          ipcRenderer.send('to-dwn', {
            type: 'start-mod-quickcheck',
            mod: mod,
            path: $rootScope.ArmaPath
          })
        } else {
          mod.state = [0, 'Kein Pfad gesetzt']
        }
      } else {
        mod.state = [3, 'Spielen']
      }
    })
  }

  $scope.savePath = (path) => {
    if (path !== false) {
      alertify.set({labels: {ok: 'Richtig', cancel: 'Falsch'}})
      alertify.confirm('Möglicher Arma Pfad gefunden: ' + path, (e) => {
        if (e) {
          $rootScope.ArmaPath = path + '\\'
          storage.set('settings', {armapath: $rootScope.ArmaPath}, (err) => {
            if (err) throw err
          })
          $rootScope.getMods()
        } else {
          $rootScope.slide = 5
          alertify.log('Bitte wähle deine Arma Pfad aus', 'primary')
        }
      })
    } else {
      alertify.log('Kein Arma Pfad gefunden', 'danger')
    }
  }

  $scope.checkregkey1 = () => {
    let regKey = new Winreg({
      hive: Winreg.HKLM,
      key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App 107410'
    })

    regKey.keyExists((err, exists) => {
      if (err) throw err
      if (exists) {
        regKey.values((err, items) => {
          if (err) throw err
          if (fs.existsSync(items[3].value + '\\arma3.exe')) {
            $scope.savePath(items[3].value)
          } else {
            $scope.checkregkey2()
          }
        })
      } else {
        $scope.checkregkey2()
      }
    })
  }

  $scope.checkregkey2 = () => {
    let regKey = new Winreg({
      hive: Winreg.HKLM,
      key: '\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App 107410'
    })

    regKey.keyExists((err, exists) => {
      if (err) throw err
      if (exists) {
        regKey.values((err, items) => {
          if (err) throw err
          if (fs.existsSync(items[3].value + '\\arma3.exe')) {
            $scope.savePath(items[3].value)
          } else {
            $scope.checkregkey3()
          }
        })
      } else {
        $scope.checkregkey3()
      }
    })
  }

  $scope.checkregkey3 = () => {
    let regKey = new Winreg({
      hive: Winreg.HKLM,
      key: '\\SOFTWARE\\WOW6432Node\\bohemia interactive studio\\ArmA 3'
    })

    regKey.keyExists((err, exists) => {
      if (err) throw err
      if (exists) {
        regKey.values((err, items) => {
          if (err) throw err
          if (fs.existsSync(items[0].value + '\\arma3.exe')) {
            $scope.savePath(items[0].value)
          } else {
            $scope.savePath(false)
          }
        })
      } else {
        $scope.savePath(false)
      }
    })
  }
}
])

App.controller('serverController', ['$scope', '$sce', ($scope, $sce) => {
  $scope.statisticsData = []

  ipcRenderer.on('to-app', (event, args) => {
    switch (args.type) {
      case 'statistics-callback':
        $scope.statisticsData = args.data.data
        break
    }
  })

  $scope.changePlayersList = (server, side) => {
    switch (side) {
      case 'Zivilisten':
        if (server.ListSide === 'Zivilisten') {
          $scope.resetPlayerList(server)
        } else {
          server.PlayersShow = server.Side.Civs
          server.PlayercountShow = server.Side.Civs.length
          server.ListSide = 'Zivilisten'
        }
        break
      case 'Polizisten':
        if (server.ListSide === 'Polizisten') {
          $scope.resetPlayerList(server)
        } else {
          server.PlayersShow = server.Side.Cops
          server.PlayercountShow = server.Side.Cops.length
          server.ListSide = 'Polizisten'
        }
        break
      case 'Medics':
        if (server.ListSide === 'Medics') {
          $scope.resetPlayerList(server)
        } else {
          server.PlayersShow = server.Side.Medics
          server.PlayercountShow = server.Side.Medics.length
          server.ListSide = 'Medics'
        }
        break
      case 'RAC':
        if (server.ListSide === 'RAC') {
          $scope.resetPlayerList(server)
        } else {
          server.PlayersShow = server.Side.RAC
          server.PlayercountShow = server.Side.RAC.length
          server.ListSide = 'RAC'
        }
        break
    }
  }

  $scope.resetPlayerList = (server) => {
    server.PlayersShow = server.Players
    server.PlayercountShow = server.Playercount
    server.ListSide = 'Spieler'
  }

  $scope.copyToClip = (server) => {
    copyToClipboard(server.IpAddress + ':' + server.Port)
    alertify.log('Kopiert', 'success')
  }

  $scope.redrawChart = (server) => {
    server.chart = new Chart($('#serverChart' + server.Id), {
      type: 'doughnut',
      data: {
        labels: [
          'Zivilisten',
          'Polizisten',
          'Medics',
          'RAC'
        ],
        datasets: [
          {
            data: [server.Civilians, server.Cops, server.Medics, server.Adac],
            backgroundColor: [
              '#8B008B',
              '#0000CD',
              '#228B22',
              '#C00100'
            ]
          }]
      },
      options: {
        responsive: false,
        legend: {
          position: 'bottom'
        },
        animation: {
          animateScale: true
        },
        tooltips: {
          displayColors: false
        }
      }
    })
  }

  $scope.redrawStatistics = (data) => {
    if ($scope.statisticsGraph) {
      $scope.statisticsGraph.destroy()
    }

    let graphData = {}
    graphData.players = []
    graphData.civ = []
    graphData.cop = []
    graphData.medic = []
    graphData.rac = []
    graphData.labels = []
    data.reverse()

    data.forEach(function (cur, i) {
      graphData.players.push({
        x: new Date(cur.created_at).getTime(),
        y: cur.players
      })
      graphData.civ.push({
        x: new Date(cur.created_at).getTime(),
        y: cur.civ
      })
      graphData.cop.push({
        x: new Date(cur.created_at).getTime(),
        y: cur.cop
      })
      graphData.medic.push({
        x: new Date(cur.created_at).getTime(),
        y: cur.medic
      })
      graphData.rac.push({
        x: new Date(cur.created_at).getTime(),
        y: cur.rac
      })
      graphData.labels.push(moment(new Date(cur.created_at)).format('H:mm, DD.MM.YYYY'))
    })

    $scope.statisticsGraph = new Chart($('#statisticsGraph'), {
      type: 'line',
      data: {
        labels: graphData.labels,
        datasets: [{
          label: 'Spieler',
          data: graphData.players,
          fill: false,
          borderColor: '#DF691A'
        }, {
          label: 'Zivs',
          data: graphData.civ,
          fill: false,
          borderColor: '#8B008B'
        }, {
          label: 'Cops',
          data: graphData.cop,
          fill: false,
          borderColor: '#0000CD'
        }, {
          label: 'Medic',
          data: graphData.medic,
          fill: false,
          borderColor: '#228B22'
        }, {
          label: 'RAC',
          data: graphData.rac,
          fill: false,
          borderColor: '#C00100'
        }]
      },
      options: {
        maintainAspectRatio: false,
        legend: {
          display: false
        },
        responsive: true,
        title: {
          display: false
        },
        tooltips: {
          mode: 'index',
          intersect: false
        },
        hover: {
          mode: 'nearest',
          intersect: true
        },
        scales: {
          xAxes: [{
            display: false
          }],
          yAxes: [{
            display: true,
            scaleLabel: {
              display: true,
              labelString: 'Spieler',
              color: '#fff'
            },
            gridLines: {
              color: '#fff'
            },
            ticks: {
              fontColor: '#fff'
            }
          }]
        },
        elements: {
          point: {
            radius: 0
          },
          line: {
            borderWidth: 2
          }
        }
      }
    })
  }

  $scope.init = () => {
    $scope.loading = true
    getServers()
    getNotification()
    $scope.getProfiles()
  }

  $scope.showTab = (tabindex) => {
    $('.serverTab').removeClass('active')
    $('.serverPane').removeClass('active')
    $('#serverTab' + tabindex).addClass('active')
    $('#serverPane' + tabindex).addClass('active')
  }

  $scope.showStatistics = () => {
    $('.serverTab').removeClass('active')
    $('.serverPane').removeClass('active')
    $('#statisticsTab').addClass('active')
    $('#statisticsPane').addClass('active')

    $scope.redrawStatistics($scope.statisticsData)
  }

  $scope.getProfiles = () => {
    $scope.profiles = {
      'available': []
    }

    storage.get('profile', (err, data) => {
      if (err) throw err

      $scope.profiles.selected = data.profile
    })

    let profileDir = app.getPath('documents') + '\\Arma 3 - Other Profiles'

    try {
      fs.lstatSync(profileDir).isDirectory()
      let profiles = fs.readdirSync(profileDir).filter(file => fs.statSync(path.join(profileDir, file)).isDirectory())
      profiles.forEach((profile, i) => {
        $scope.profiles.available.push(decodeURIComponent(profile))
      })
    } catch (e) {
      console.log(e)
      $scope.profiles = false
    }
  }

  $scope.setProfile = () => {
    storage.set('profile', {
      profile: $scope.profiles.selected
    }, (err) => {
      if (err) throw err
    })
  }

  ipcRenderer.on('to-app', (event, args) => {
    switch (args.type) {
      case 'servers-callback':
        $scope.servers = args.data.data
        $scope.loading = false
        $scope.$apply()
        if (typeof $scope.servers !== 'undefined') {
          $scope.servers.forEach((server) => {
            server.DescriptionHTML = $sce.trustAsHtml(server.Description)
            server.last_update = getRefreshTime(server.updated_at.date)
            server.PlayersShow = server.Players
            server.PlayercountShow = server.Playercount
            server.ListSide = 'Spieler'
            server.ping = false
            $scope.redrawChart(server)
            $('#playerScroll' + server.Id).perfectScrollbar()
            ping.promise.probe(server.IpAddress)
              .then(function (res) {
                server.ping = res.time
              })
            getStatisticsData()
            $('#statisticsTab').removeClass('active')
            $('#statisticsPane').removeClass('active')
          })
        }
        break
    }
  })

  $scope.joinServer = (server) => {
    if (server.appId === 107410) {
      storage.get('settings', (err, data) => {
        if (err) throw err

        let params = []

        params.push('-noLauncher')
        params.push('-useBE')
        params.push('-connect=' + server.IpAddress)
        params.push('-port=' + server.Port)
        params.push('-mod=' + server.StartParameters)
        params.push('-password=' + server.ServerPassword)

        if ($scope.profiles && typeof $scope.profiles.selected !== 'undefined') {
          params.push('-name=' + $scope.profiles.selected)
        }

        if (data.splash) {
          params.push('-nosplash')
        }
        if (data.intro) {
          params.push('-skipIntro')
        }
        if (data.ht) {
          params.push('-enableHT')
        }
        if (data.windowed) {
          params.push('-window')
        }

        if (data.mem && typeof data.mem !== 'undefined') {
          params.push('-maxMem=' + data.mem)
        }
        if (data.vram && typeof data.vram !== 'undefined') {
          params.push('-maxVRAM=' + data.vram)
        }
        if (data.cpu && typeof data.cpu !== 'undefined') {
          params.push('-cpuCount=' + data.cpu)
        }
        if (data.thread && typeof data.thread !== 'undefined') {
          params.push('-exThreads=' + data.thread)
        }
        if (data.add_params && typeof data.add_params !== 'undefined') {
          params.push(data.add_params)
        }

        spawnNotification('Arma wird gestartet...')
        alertify.log('Arma wird gestartet...', 'success')
        child.spawn((data.armapath + '\\arma3launcher.exe'), params, [])
        console.log(params)
      })
    } else {
      alertify.log('Das Spiel wird gestartet...', 'success')
      shell.openExternal('steam://connect/' + server.IpAddress + ':' + server.Port)
    }
  }

  $scope.pingServer = (server) => {
    ipcRenderer.send('to-web', {
      type: 'ping-server-via-rdp',
      server: server
    })
  }
}])

App.controller('playerController', ['$scope', '$rootScope', ($scope, $rootScope) => {
  $scope.init = () => {
    $('#playerScroll').perfectScrollbar({wheelSpeed: 0.5, suppressScrollX: true})
  }
}])

App.controller('changelogController', ['$scope', ($scope) => {
  ipcRenderer.on('to-app', (event, args) => {
    switch (args.type) {
      case 'changelog-callback':
        $scope.changelogs = args.data.data
        $scope.loading = false
        $scope.$apply()
        $('#changelogScroll').perfectScrollbar({wheelSpeed: 0.5})
        break
    }
  })

  $scope.init = () => {
    $scope.loading = true
    getChangelog()
  }
}])

App.controller('settingsController', ['$scope', '$rootScope', ($scope, $rootScope) => {
  $scope.init = () => {
    storage.get('settings', (err, data) => {
      if (err) {
        $scope.loaded = true
        $rootScope.theme = 'dark'
        throw err
      }
      if (typeof data.theme !== 'undefined') {
        $rootScope.theme = data.theme
      }
      $rootScope.ArmaPath = data.armapath
      $scope.splash = data.splash
      if ($scope.splash) {
        $('#splashCheck').iCheck('check')
      }
      $scope.intro = data.intro
      if ($scope.intro) {
        $('#introCheck').iCheck('check')
      }
      $scope.ht = data.ht
      if ($scope.ht) {
        $('#htCheck').iCheck('check')
      }
      $scope.windowed = data.windowed
      if ($scope.windowed) {
        $('#windowedCheck').iCheck('check')
      }
      $scope.mem = parseInt(data.mem)
      $scope.cpu = parseInt(data.cpu)
      $scope.vram = parseInt(data.vram)
      $scope.thread = parseInt(data.thread)
      $scope.add_params = data.add_params
      if ($rootScope.theme === 'dark') {
        $('#darkSwitch').iCheck('check')
      } else if ($rootScope.theme === 'light') {
        $('#lightSwitch').iCheck('check')
      }
      $scope.loaded = true
    })
  }

  $('#splashCheck').on('ifChecked', () => {
    if ($scope.loaded) {
      $scope.splash = true
      $scope.saveSettings()
    }
  }).on('ifUnchecked', () => {
    if ($scope.loaded) {
      $scope.splash = false
      $scope.saveSettings()
    }
  })

  $('#introCheck').on('ifChecked', () => {
    if ($scope.loaded) {
      $scope.intro = true
      $scope.saveSettings()
    }
  }).on('ifUnchecked', () => {
    if ($scope.loaded) {
      $scope.intro = false
      $scope.saveSettings()
    }
  })

  $('#htCheck').on('ifChecked', () => {
    if ($scope.loaded) {
      $scope.ht = true
      $scope.saveSettings()
    }
  }).on('ifUnchecked', () => {
    if ($scope.loaded) {
      $scope.ht = false
      $scope.saveSettings()
    }
  })

  $('#windowedCheck').on('ifChecked', () => {
    if ($scope.loaded) {
      $scope.windowed = true
      $scope.saveSettings()
    }
  }).on('ifUnchecked', () => {
    if ($scope.loaded) {
      $scope.windowed = false
      $scope.saveSettings()
    }
  })

  $('#lightSwitch').on('ifChecked', () => {
    if ($scope.loaded) {
      $rootScope.theme = 'light'
      $rootScope.$apply()
      $scope.saveSettings()
    }
  }).on('ifUnchecked', () => {
    if ($scope.loaded) {
      $rootScope.theme = 'dark'
      $rootScope.$apply()
      $scope.saveSettings()
    }
  })

  $scope.saveSettings = () => {
    storage.set('settings', {
      armapath: $rootScope.ArmaPath,
      splash: $scope.splash,
      intro: $scope.intro,
      ht: $scope.ht,
      windowed: $scope.windowed,
      mem: $scope.mem,
      cpu: $scope.cpu,
      vram: $scope.vram,
      thread: $scope.thread,
      add_params: $scope.add_params,
      theme: $rootScope.theme
    }, (err) => {
      if (err) throw err
    })
  }

  $scope.chooseArmaPath = () => {
    let dpath = String(dialog.showOpenDialog({
      filters: [{
        name: 'Arma 3 exe',
        extensions: ['exe']
      }],
      title: 'Bitte wähle eine der Arma 3 exen aus',
      properties: ['openFile']
    }))
    if (dpath !== 'undefined' && dpath.includes('arma3') && dpath.includes('.exe')) {
      $rootScope.ArmaPath = dpath.substring(0, dpath.lastIndexOf('\\')) + '\\'
      $scope.saveSettings()
      $rootScope.refresh()
    } else {
      $rootScope.ArmaPath = ''
      $scope.saveSettings()
    }
  }
}])

App.controller('mapController', ['$scope', ($scope) => {
  ipcRenderer.on('to-app', (event, args) => {
    switch (args.type) {
      case 'fuelstations-callback':
        $scope.fuelstations = args.data.data
        $scope.updateFuels()
        break
    }
  })

  $scope.updateFuels = () => {
    $scope.fuelstations.forEach((instance) => {
      instance.Markers = []

      instance.Fuelstations.forEach((fuelstation) => {
        let fuel = Math.round((fuelstation.Fuel / 30000) * 100)
        let m = {
          x: (fuelstation.Pos.replace('[', '').replace(']', '').split(',')[0] / 10240) * 16384,
          y: ((10240 - fuelstation.Pos.replace('[', '').replace(']', '').split(',')[1]) / 10240) * 16384
        }

        if (fuel > 70) {
          instance.Markers.push(L.marker($scope.map.unproject([m.x, m.y], $scope.map.getMaxZoom()), {
            icon: $scope.gasMarkerGreen
          }).bindPopup('<div class="progress progress-striped active" style="margin-bottom: 0"><div class="progress-bar progress-bar-success" style="width: ' + fuel + '%"></div></div><div class="center"><span class="label label-info label-large">' + fuelstation.Fuel + '/30000 Liter </span></div>', {
            autoClose: false,
            minWidth: 150
          }))
        } else if (fuel > 30) {
          instance.Markers.push(L.marker($scope.map.unproject([m.x, m.y], $scope.map.getMaxZoom()), {
            icon: $scope.gasMarkerOrange
          }).bindPopup('<div class="progress progress-striped active" style="margin-bottom: 0"><div class="progress-bar progress-bar-warning" style="width: ' + fuel + '%"></div></div><div class="center"><span class="label label-info label-large">' + fuelstation.Fuel + '/30000 Liter </span></div>', {
            autoClose: false,
            minWidth: 150
          }))
        } else {
          instance.Markers.push(L.marker($scope.map.unproject([m.x, m.y], $scope.map.getMaxZoom()), {
            icon: $scope.gasMarkerRed
          }).bindPopup('<div class="progress progress-striped active" style="margin-bottom: 0"><div class="progress-bar progress-bar-danger" style="width: ' + fuel + '%"></div></div><div class="center"><span class="label label-info label-large">' + fuelstation.Fuel + '/30000 Liter </span></div>', {
            autoClose: false,
            minWidth: 150
          }))
        }
      })
    })

    L.control.layers({
      'Server 1 Tankstellen': L.layerGroup($scope.fuelstations[0].Markers),
      'Server 2 Tankstellen': L.layerGroup($scope.fuelstations[1].Markers)
    }).addTo($scope.map)
  }

  $scope.init = () => {
    getFuelstations()

    let roads = L.tileLayer('https://tiles.realliferpg.de/1/{z}/{x}/{y}.png', {
      id: 'roads',
      minZoom: 1,
      maxZoom: 6,
      attribution: '<a href="https://realliferpg.de">Abramia Map by ReallifeRPG</a>',
      tms: true
    })

    let sat = L.tileLayer('https://tiles.realliferpg.de/2/{z}/{x}/{y}.png', {
      id: 'sat',
      minZoom: 1,
      maxZoom: 6,
      attribution: '<a href="https://realliferpg.de">Abramia Map by ReallifeRPG</a>',
      tms: true
    })

    $scope.map = L.map('leaflet_map', {
      layers: [roads]
    }).setView([0, 0], 1)

    let baseLayers = {
      'Straßen': roads,
      'Satellit': sat
    }

    $scope.gasMarker = L.icon({
      iconUrl: 'resources/icon/gas.png',
      iconSize: [32, 37],
      iconAnchor: [16, 37],
      popupAnchor: [0, -34]
    })

    $scope.gasMarkerGreen = L.icon({
      iconUrl: 'resources/icon/gas_green.png',
      iconSize: [32, 37],
      iconAnchor: [16, 37],
      popupAnchor: [0, -34]
    })

    $scope.gasMarkerOrange = L.icon({
      iconUrl: 'resources/icon/gas_orange.png',
      iconSize: [32, 37],
      iconAnchor: [16, 37],
      popupAnchor: [0, -34]
    })

    $scope.gasMarkerRed = L.icon({
      iconUrl: 'resources/icon/gas_red.png',
      iconSize: [32, 37],
      iconAnchor: [16, 37],
      popupAnchor: [0, -34]
    })

    L.control.layers(baseLayers).addTo($scope.map)

    let southWest = $scope.map.unproject([0, 16384], $scope.map.getMaxZoom())
    let northEast = $scope.map.unproject([16384, 0], $scope.map.getMaxZoom())
    $scope.map.setMaxBounds(new L.LatLngBounds(southWest, northEast))
  }
}])

App.controller('aboutController', ['$scope', '$sce', ($scope, $sce) => {
  $scope.init = () => {
    fs.readFile('README.md', 'utf8', (err, data) => {
      if (!err) {
        $scope.aboutContent = $sce.trustAsHtml(marked(data))
        $scope.$apply()
        $('#aboutScroll').perfectScrollbar({suppressScrollX: true, wheelSpeed: 0.5})
      } else {
        console.log(err)
      }
    })
  }
}])

App.controller('tfarController', ['$scope', '$rootScope', ($scope) => {
  $scope.initFileDownload = (file) => {
    if (!$scope.fileDownloading) {
      $scope.fileDownloading = true
      ipcRenderer.send('to-web', {
        type: 'start-file-download',
        file: file
      })
    } else {
      alertify.log('Download läuft bereits', 'danger')
    }
  }

  ipcRenderer.on('to-app', (event, args) => {
    switch (args.type) {
      case 'update-dl-progress-file':
        $scope.fileProgress = toProgress(args.state.percent)
        $scope.fileSpeed = toMB(args.state.speed)
        $scope.$apply()
        break
      case 'update-dl-progress-file-done':
        $scope.fileProgress = 100
        $scope.fileSpeed = 0
        $scope.fileDownloading = false
        $scope.$apply()
        alertify.log('Wird ausgeführt...', 'primary')
        if (!shell.openItem(args.filePath)) {
          alertify.log('Fehlgeschlagen', 'danger')
          let stream = fs.createReadStream(args.filePath).pipe(unzip.Extract({path: app.getPath('downloads') + '\\ReallifeRPG'}))
          stream.on('close', () => {
            try {
              fs.unlinkSync(app.getPath('downloads') + '\\ReallifeRPG\\package.ini')
            } catch (err) {
              console.log(err)
            }
            shell.showItemInFolder(app.getPath('downloads') + '\\ReallifeRPG')
          })
        }
        break
    }
  })
}])

App.controller('twitchController', ['$scope', ($scope) => {
  ipcRenderer.on('to-app', (event, args) => {
    switch (args.type) {
      case 'twitch-callback':
        args.data.data.forEach((cur) => {
          cur.sliced = cur.status.slice(0, 25)
        })
        $scope.twitchers = args.data.data
        $('#twitchScroll').perfectScrollbar({
          suppressScrollX: true
        })
        break
    }
  })

  $scope.init = () => {
    getTwitch()
  }
}])

App.directive('onFinishRender', ($timeout) => {
  return {
    restrict: 'A',
    link: (scope, element, attr) => {
      if (scope.$last === true) {
        $timeout(() => {
          scope.$emit(attr.onFinishRender)
          appLoaded()
        })
      }
    }
  }
})

const getChangelog = () => {
  ipcRenderer.send('to-web', {
    type: 'get-url',
    callback: 'changelog-callback',
    url: config.APIBaseURL + config.APIChangelogURL,
    callBackTarget: 'to-app'
  })
}

const getServers = () => {
  ipcRenderer.send('to-web', {
    type: 'get-url',
    callback: 'servers-callback',
    url: config.APIBaseURL + config.APIServersURL,
    callBackTarget: 'to-app'
  })
}

const getNotification = () => {
  ipcRenderer.send('to-web', {
    type: 'get-url',
    callback: 'notification-callback',
    url: config.APIBaseURL + config.APINotificationURL,
    callBackTarget: 'to-app'
  })
}

const getFuelstations = () => {
  ipcRenderer.send('to-web', {
    type: 'get-url',
    callback: 'fuelstations-callback',
    url: config.APIBaseURL + config.APIFuelStationURL,
    callBackTarget: 'to-app'
  })
}

const getTwitch = () => {
  ipcRenderer.send('to-web', {
    type: 'get-url',
    callback: 'twitch-callback',
    url: config.APIBaseURL + config.APITwitchURL,
    callBackTarget: 'to-app'
  })
}

const toGB = (val) => {
  return (val / 1000000000).toFixed(3)
}

const toMB = (val) => {
  return (val / 1000000).toFixed(3)
}

const toProgress = (val) => {
  return (val * 100).toFixed(3)
}

const toFileProgress = (filesize, downloaded) => {
  return (100 / filesize * downloaded).toFixed(2)
}

const cutName = (name) => {
  if (name.length > 30) {
    return name.substring(0, 30) + '...'
  } else {
    return name
  }
}

const spawnNotification = (message) => {
  new Notification('ReallifeRPG', { // eslint-disable-line
    body: message
  })
}

const appLoaded = () => {
  ipcRenderer.send('app-loaded')
}

const getPlayerData = (ApiKey) => {
  ipcRenderer.send('to-web', {
    type: 'get-url',
    callback: 'player-callback',
    url: config.APIBaseURL + config.APIPlayerURL + ApiKey,
    callBackTarget: 'to-app'
  })
}

const getStatisticsData = () => {
  ipcRenderer.send('to-web', {
    type: 'get-url',
    callback: 'statistics-callback',
    url: config.APIBaseURL + config.APIServersLogURL,
    callBackTarget: 'to-app'
  })
}

const getRefreshTime = (date) => {
  let d = new Date(date)
  let hours = d.getHours()
  let minutes = d.getMinutes()
  if (hours < 10) hours = '0' + hours
  if (minutes < 10) minutes = '0' + minutes

  return hours + ':' + minutes
}

const copyToClipboard = (text) => {
  clipboard.writeText(text)
  return text
}
