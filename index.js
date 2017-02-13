const {ipcRenderer} = require('electron')
const {shell} = require('electron') // eslint-disable-line
const humanizeDuration = require('humanize-duration')
const fs = require('fs')
const {dialog} = require('electron').remote
const {app} = require('electron').remote
const storage = require('electron-json-storage')
const Winreg = require('winreg')
const unzip = require('unzip')
const marked = require('marked')
const $ = window.jQuery = require('./resources/jquery/jquery-1.12.3.min.js')
const child = require('child_process')
const beta = require('electron').remote.getGlobal('beta')
const L = require('leaflet')

/* global APIBaseURL APIModsURL APIChangelogURL APIServersURL APIBetaADD alertify angular SmoothieChart TimeSeries Chart Notification APINotificationURL APIFuelStationURL */

var App = angular.module('App', ['720kb.tooltips']).run(function ($rootScope) {
  $rootScope.downloading = false
  $rootScope.AppLoaded = true
  $rootScope.ArmaPath = ''
  $rootScope.AppTitle = 'RealLifeRPG Launcher - ' + app.getVersion() + ' - Mods'
  $rootScope.slide = 0
  $rootScope.theme = 'dark'
  $rootScope.updating = false
  $rootScope.update_ready = false

  storage.get('settings', function (error, data) {
    if (error) {
      $rootScope.theme = 'dark'
      throw error
    }

    if (typeof data.theme !== 'undefined') {
      $rootScope.theme = data.theme
    }
  })

  $rootScope.relaunchUpdate = function () {
    ipcRenderer.send('quitAndInstall')
  }

  $rootScope.refresh = function () {
    getMods()
    getServers()
    getChangelog()
  }

  ipcRenderer.on('checking-for-update', function (event) {
    alertify.log('Suche nach Updates...', 'primary')
    $rootScope.updating = true
    $rootScope.$apply()
  })

  ipcRenderer.on('update-not-available', function (event) {
    alertify.log('Launcher ist aktuell', 'primary')
    $rootScope.updating = false
    $rootScope.$apply()
  })

  ipcRenderer.on('update-available', function (event) {
    spawnNotification('Update verfügbar, wird geladen...')
    alertify.log('Update verfügbar, wird geladen...', 'primary')
    $rootScope.updating = true
    $rootScope.$apply()
  })

  ipcRenderer.on('update-downloaded', function (event, args) {
    spawnNotification('Update zur Version ' + args.releaseName + ' bereit.')
    $rootScope.updating = false
    $rootScope.update_ready = true
    $rootScope.$apply()
  })
})

App.controller('navbarController', ['$scope', '$rootScope', function ($scope, $rootScope) {
  $scope.tabs = [
    {
      icon: 'glyphicon glyphicon-home', slide: 0, title: 'Mods'
    }, {
      icon: 'glyphicon glyphicon-tasks', slide: 1, title: 'Server'
    }, {
      icon: 'glyphicon glyphicon-list-alt', slide: 2, title: 'Changelog'
    }, {
      icon: 'glyphicon glyphicon-headphones', slide: 3, title: 'TFAR'
    }, {
      icon: 'glyphicon glyphicon-cog', slide: 4, title: 'Einstellungen'
    }, {
      icon: 'glyphicon glyphicon-question-sign', slide: 5, title: 'FAQ'
    }, {
      icon: 'glyphicon glyphicon-map-marker', slide: 6, title: 'Map'
    }, {
      icon: 'glyphicon glyphicon-book', slide: 7, title: 'Über'
    }]

  $scope.switchSlide = function (tab) {
    $rootScope.slide = tab.slide
    $rootScope.AppTitle = 'RealLifeRPG Launcher - ' + app.getVersion() + ' - ' + tab.title
  }

  $rootScope.$watch(
    'slide', function () {
      $('#carousel-main').carousel($rootScope.slide)
    }, true)

  $scope.$watch(
    'AppTitle', function () {
      document.title = $rootScope.AppTitle
    }, true)
}])

App.controller('modController', ['$scope', '$rootScope', function ($scope, $rootScope) {
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

  ipcRenderer.on('to-app', function (event, args) {
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
        var size = 0
        for (var i = 0; i < args.list.length; i++) {
          size += args.list[i].Size
        }
        if (size !== 0) {
          if (args.mod.Torrent !== '') {
            alertify.set({labels: {ok: 'Torrent', cancel: 'Server'}})
            alertify.confirm(args.list.length + ' Dateien müssen heruntergelanden werden (' + toGB(size) + ' GB)', function (e) {
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
          alertify.alert(args.data.Notification)
        }
        break
      case 'update-quickcheck':
        for (var j = 0; j < $scope.mods.length; j++) {
          if ($scope.mods[j].Id === args.mod.Id) {
            if (args.update === 0) {
              $scope.mods[j].state = [1, 'Downloaden']
            } else if (args.update === 1) {
              $scope.mods[j].state = [2, 'Update verfügbar']
            } else {
              $scope.mods[j].state = [3, 'Spielen']
            }
          }
        }
        $scope.$apply()
        break
    }
  })

  $scope.reset = function () {
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

  $scope.init = function () {
    $scope.loading = true
    try {
      fs.lstatSync(app.getPath('userData') + '\\settings.json')
      storage.get('settings', function (error, data) {
        if (error) throw error
        $rootScope.ArmaPath = data.armapath
        getMods()
        $scope.initGraph()
      })
    } catch (e) {
      $scope.checkregkey1()
    }
  }

  $scope.initTorrent = function (mod) {
    alertify.log('Seeding wird gestartet', 'primary')
    ipcRenderer.send('to-dwn', {
      type: 'start-mod-seed',
      mod: mod,
      path: $rootScope.ArmaPath
    })
  }

  $scope.initDownload = function (mod) {
    alertify.log('Download wird gestartet', 'primary')
    ipcRenderer.send('to-dwn', {
      type: 'start-mod-dwn',
      mod: mod,
      path: $rootScope.ArmaPath
    })
  }

  $scope.initHash = function (mod) {
    alertify.log('Überprüfung wird gestartet', 'primary')
    ipcRenderer.send('to-dwn', {
      type: 'start-mod-hash',
      mod: mod,
      path: $rootScope.ArmaPath
    })
  }

  $scope.initUpdate = function (mod) {
    alertify.log('Update wird gestartet', 'primary')
    ipcRenderer.send('to-dwn', {
      type: 'start-mod-update',
      mod: mod,
      path: $rootScope.ArmaPath
    })
  }

  $scope.initListDownload = function (list, torrent, mod) {
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

  $scope.initGraph = function () {
    var bgColor = ''
    var graphColor = ''

    if ($rootScope.theme === 'light') {
      bgColor = '#ffffff'
      graphColor = '#2780e3'
    } else if ($rootScope.theme === 'dark') {
      bgColor = '#2b3e50'
      graphColor = '#df691a'
    }

    var graphOptions = {
      millisPerPixel: 20,
      grid: {fillStyle: bgColor, strokeStyle: bgColor},
      labels: {fillStyle: '#000000', disabled: true}
    }
    $scope.chart = new SmoothieChart(graphOptions)

    var canvas = document.getElementById('smoothie-chart')

    $scope.graphTimeline = new TimeSeries()
    $scope.chart.addTimeSeries($scope.graphTimeline, {lineWidth: 2, strokeStyle: graphColor})
    $scope.chart.streamTo(canvas, 2000)
  }

  $scope.cancel = function () {
    alertify.log('Wird abgebrochen...', 'primary')
    ipcRenderer.send('to-dwn', {
      type: 'cancel'
    })
  }

  $rootScope.$watch(
    'theme', function () {
      if ($scope.chart != null) {
        var bgColor = ''
        var graphColor = ''

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

  $scope.update = function (update) {
    $scope.state = update.state
    $scope.hint = update.hint
    $rootScope.downloading = update.downloading
    $scope.canCancel = update.canCancel
    $rootScope.downSpeed = update.downSpeed
    $rootScope.upSpeed = update.upSpeed
    $scope.totalProgress = update.totalProgress
    $scope.totalSize = update.totalSize
    $scope.totalDownloaded = update.totalDownloaded
    $scope.totalETA = update.totalETA
    $scope.totalPeers = update.totalPeers
    $scope.maxConns = update.maxConns
    $scope.fileName = update.fileName
    $scope.fileProgress = update.fileProgress
    $scope.$apply()
  }

  $scope.$watch(
    'totalProgress', function () {
      ipcRenderer.send('winprogress-change', {
        progress: $scope.totalProgress / 100
      })
    }, true)

  $rootScope.$watch(
    'ArmaPath', function () {
      if ($scope.mods !== undefined) {
        $scope.checkUpdates()
      }
    }, true)

  $scope.action = function (mod) {
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

  $scope.openModDir = function (mod) {
    shell.showItemInFolder($rootScope.ArmaPath + '\\' + mod.Directories + '\\addons')
  }

  $scope.checkUpdates = function () {
    for (var i = 0; i < $scope.mods.length; i++) {
      if ($scope.mods[i].HasGameFiles) {
        if ($rootScope.ArmaPath !== '') {
          $scope.mods[i].state = [0, 'Suche nach Updates...']
          ipcRenderer.send('to-dwn', {
            type: 'start-mod-quickcheck',
            mod: $scope.mods[i],
            path: $rootScope.ArmaPath
          })
        } else {
          $scope.mods[i].state = [0, 'Kein Pfad gesetzt']
        }
      } else {
        $scope.mods[i].state = [3, 'Spielen']
      }
    }
  }

  $scope.savePath = function (path) {
    if (path !== false) {
      alertify.set({labels: {ok: 'Richtig', cancel: 'Falsch'}})
      alertify.confirm('Möglicher Arma Pfad gefunden: ' + path, function (e) {
        if (e) {
          $rootScope.ArmaPath = path + '\\'
          storage.set('settings', {armapath: $rootScope.ArmaPath}, function (error) {
            if (error) throw error
          })
          getMods()
        } else {
          $rootScope.slide = 4
          alertify.log('Bitte wähle deine Arma Pfad aus', 'primary')
        }
      })
    } else {
      alertify.log('Kein Arma Pfad gefunden', 'danger')
    }
  }

  $scope.checkregkey1 = function () {
    var regKey = new Winreg({
      hive: Winreg.HKLM,
      key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App 107410'
    })

    regKey.keyExists(function (err, exists) {
      if (err) throw err
      if (exists) {
        regKey.values(function (err, items) {
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

  $scope.checkregkey2 = function () {
    var regKey = new Winreg({
      hive: Winreg.HKLM,
      key: '\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App 107410'
    })

    regKey.keyExists(function (err, exists) {
      if (err) throw err
      if (exists) {
        regKey.values(function (err, items) {
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

  $scope.checkregkey3 = function () {
    var regKey = new Winreg({
      hive: Winreg.HKLM,
      key: '\\SOFTWARE\\WOW6432Node\\bohemia interactive studio\\ArmA 3'
    })

    regKey.keyExists(function (err, exists) {
      if (err) throw err
      if (exists) {
        regKey.values(function (err, items) {
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

App.controller('serverController', ['$scope', '$sce', function ($scope, $sce) {
  $scope.redrawChart = function (server) {
    var data = {
      labels: [
        ' Zivilisten',
        ' Polizisten',
        ' Medics',
        ' ADAC'
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
    }

    var xhx = $('#serverChart' + server.Id)
    var chart = new Chart(xhx, { // eslint-disable-line
      type: 'pie',
      data: data,
      options: {
        responsive: false,
        legend: {
          position: 'bottom'
        }
      }
    })
  }

  $scope.init = function () {
    $scope.loading = true
    getServers()
    getNotification()
  }

  $scope.showTab = function (tabindex) {
    $('.serverTab').removeClass('active')
    $('.serverPane').removeClass('active')
    $('#serverTab' + tabindex).addClass('active')
    $('#serverPane' + tabindex).addClass('active')
  }

  ipcRenderer.on('to-app', function (event, args) {
    switch (args.type) {
      case 'servers-callback':
        $scope.servers = args.data.data
        $scope.loading = false
        $scope.$apply()
        if (typeof $scope.servers !== 'undefined') {
          for (var i = 0; i < $scope.servers.length; i++) {
            $scope.servers[i].DescriptionHTML = $sce.trustAsHtml($scope.servers[i].Description)
            $scope.redrawChart($scope.servers[i])
            $('#playerScroll' + $scope.servers[i].Id).perfectScrollbar()
          }
        }
        break
    }
  })

  $scope.joinServer = function (server) {
    if (server.appId === 107410) {
      storage.get('settings', function (err, data) {
        if (err) throw err

        var params = []

        params.push('-noLauncher')
        params.push('-useBE')
        params.push('-connect=' + server.IpAddress)
        params.push('-port=' + server.Port)
        params.push('-mod=' + server.StartParameters)
        params.push('-password=' + server.ServerPassword)

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

        if (data.mem != null && data.mem !== '' && typeof data.mem !== 'undefined') {
          params.push('-maxMem=' + data.mem)
        }
        if (data.vram != null && data.vram !== '' && typeof data.vram !== 'undefined') {
          params.push('-maxVRAM=' + data.vram)
        }
        if (data.cpu != null && data.cpu !== '' && typeof data.cpu !== 'undefined') {
          params.push('-cpuCount=' + data.cpu)
        }
        if (data.thread != null && data.thread !== '' && typeof data.thread !== 'undefined') {
          params.push('-exThreads=' + data.thread)
        }
        if (data.add_params != null && data.add_params !== '' && typeof data.add_params !== 'undefined') {
          params.push(data.add_params)
        }

        spawnNotification('Arma wird gestartet...')
        child.spawn((data.armapath + '\\arma3launcher.exe'), params, [])
      })
    } else {
      spawnNotification('Das Spiel wird gestartet...')
      shell.openExternal('steam://connect/' + server.IpAddress + ':' + server.Port)
    }
  }
}])

App.controller('changelogController', ['$scope', function ($scope) {
  ipcRenderer.on('to-app', function (event, args) {
    switch (args.type) {
      case 'changelog-callback':
        $scope.changelogs = args.data.data
        $scope.loading = false
        $scope.$apply()
        $('#changelogScroll').perfectScrollbar({wheelSpeed: 0.5})
        break
    }
  })

  $scope.init = function () {
    $scope.loading = true
    getChangelog()
  }
}])

App.controller('settingsController', ['$scope', '$rootScope', function ($scope, $rootScope) {
  $scope.init = function () {
    storage.get('settings', function (error, data) {
      if (error) {
        $scope.loaded = true
        $rootScope.theme = 'dark'
        throw error
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

  $('#splashCheck').on('ifChecked', function (event) {
    if ($scope.loaded) {
      $scope.splash = true
      $scope.saveSettings()
    }
  }).on('ifUnchecked', function (event) {
    if ($scope.loaded) {
      $scope.splash = false
      $scope.saveSettings()
    }
  })

  $('#introCheck').on('ifChecked', function (event) {
    if ($scope.loaded) {
      $scope.intro = true
      $scope.saveSettings()
    }
  }).on('ifUnchecked', function (event) {
    if ($scope.loaded) {
      $scope.intro = false
      $scope.saveSettings()
    }
  })

  $('#htCheck').on('ifChecked', function (event) {
    if ($scope.loaded) {
      $scope.ht = true
      $scope.saveSettings()
    }
  }).on('ifUnchecked', function (event) {
    if ($scope.loaded) {
      $scope.ht = false
      $scope.saveSettings()
    }
  })

  $('#windowedCheck').on('ifChecked', function (event) {
    if ($scope.loaded) {
      $scope.windowed = true
      $scope.saveSettings()
    }
  }).on('ifUnchecked', function (event) {
    if ($scope.loaded) {
      $scope.windowed = false
      $scope.saveSettings()
    }
  })

  $('#lightSwitch').on('ifChecked', function (event) {
    if ($scope.loaded) {
      $rootScope.theme = 'light'
      $rootScope.$apply()
      $scope.saveSettings()
    }
  }).on('ifUnchecked', function (event) {
    if ($scope.loaded) {
      $rootScope.theme = 'dark'
      $rootScope.$apply()
      $scope.saveSettings()
    }
  })

  $scope.saveSettings = function () {
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
    }, function (error) {
      if (error) throw error
    })
  }

  $scope.chooseArmaPath = function () {
    var options = {
      filters: [{
        name: 'Arma3.exe',
        extensions: ['exe']
      }],
      title: 'Bitte wähle deine Arma3.exe aus',
      properties: ['openFile']
    }
    var path = String(dialog.showOpenDialog(options))
    if (path !== 'undefined' && path.indexOf('\\arma3.exe') > -1) {
      $rootScope.ArmaPath = path.replace('arma3.exe', '')
      $scope.saveSettings()
      $rootScope.refresh()
    } else {
      $rootScope.ArmaPath = ''
      $scope.saveSettings()
    }
  }
}])

App.controller('mapController', ['$scope', function ($scope) {
  ipcRenderer.on('to-app', function (event, args) {
    switch (args.type) {
      case 'fuelstations-callback':
        $scope.fuelstations = args.data.data
        $scope.updateFuels()
        break
    }
  })

  $scope.updateFuels = function () {
    for (var i = 0; i < $scope.fuelstations.length; i++) {
      $scope.fuelstations[i].Markers = []

      for (var j = 0; j < $scope.fuelstations[i].Fuelstations.length; j++) {
        var tmpArr = $scope.fuelstations[i].Fuelstations[j].Pos.replace('[', '').replace(']', '').split(',')
        var fuel = Math.round(($scope.fuelstations[i].Fuelstations[j].Fuel / 30000) * 100)
        var m = {
          x: (tmpArr[0] / 10240) * 16384,
          y: ((10240 - tmpArr[1]) / 10240) * 16384
        }

        $scope.fuelstations[i].Markers.push(L.marker($scope.map.unproject([m.x, m.y], $scope.map.getMaxZoom()), {
          icon: $scope.gasMarker
        }).bindPopup('<div class="progress progress-striped active" style="margin-bottom: 0"><div class="progress-bar progress-bar-success" style="width: ' + fuel + '%"></div></div>', {
          autoClose: false,
          minWidth: 150
        }))
      }
    }

    var overlayMaps = {
      'Server 1 Tankstellen': L.layerGroup($scope.fuelstations[0].Markers),
      'Server 2 Tankstellen': L.layerGroup($scope.fuelstations[1].Markers)
    }

    L.control.layers(overlayMaps).addTo($scope.map)
  }

  $scope.init = function () {
    getFuelstations()

    var roads = L.tileLayer('https://tiles.realliferpg.de/1/{z}/{x}/{y}.png', {
      id: 'roads',
      minZoom: 1,
      maxZoom: 6,
      attribution: '<a href="https://realliferpg.de">Abramia Map by ReallifeRPG</a>',
      tms: true
    })

    var sat = L.tileLayer('https://tiles.realliferpg.de/2/{z}/{x}/{y}.png', {
      id: 'sat',
      minZoom: 1,
      maxZoom: 6,
      attribution: '<a href="https://realliferpg.de">Abramia Map by ReallifeRPG</a>',
      tms: true
    })

    $scope.map = L.map('leaflet_map', {
      layers: [roads]
    }).setView([0, 0], 1)

    var baseLayers = {
      'Straßen': roads,
      'Satellit': sat
    }

    $scope.gasMarker = L.icon({
      iconUrl: 'icon/gas.png',
      iconSize: [32, 37], // size of the icon
      iconAnchor: [16, 37], // point of the icon which will correspond to marker's location
      popupAnchor: [0, -34] // point from which the popup should open relative to the iconAnchor
    })

    L.control.layers(baseLayers).addTo($scope.map)

    var southWest = $scope.map.unproject([0, 16384], $scope.map.getMaxZoom())
    var northEast = $scope.map.unproject([16384, 0], $scope.map.getMaxZoom())
    $scope.map.setMaxBounds(new L.LatLngBounds(southWest, northEast))
  }
}])

App.controller('aboutController', ['$scope', '$sce', function ($scope, $sce) {
  $scope.init = function () {
    fs.readFile('README.md', 'utf8', function (err, data) {
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

App.controller('tfarController', ['$scope', '$rootScope', function ($scope, $rootScope) {
  $scope.initTFARDownload = function (version) {
    $scope.tfarDownloading = true
    ipcRenderer.send('to-web', {
      type: 'start-tfar-download',
      version: version
    })
  }

  $scope.tfarProgress = 0
  $scope.tfarSpeed = 0
  $scope.tfarDownloading = false

  ipcRenderer.on('to-app', function (event, args) {
    switch (args.type) {
      case 'update-dl-progress-tfar':
        $scope.tfarProgress = toProgress(args.state.percent)
        $scope.tfarSpeed = toMB(args.speed)
        break
      case 'update-dl-progress-tfar-done':
        $scope.tfarProgress = 100
        $scope.tfarSpeed = 0
        alertify.log('Wird ausgeführt...', 'primary')
        if (!shell.openItem(args.tfarPath)) {
          alertify.log('Fehlgeschlagen', 'danger')
          var stream = fs.createReadStream(args.tfarPath).pipe(unzip.Extract({path: app.getPath('downloads') + '\\TFAR'}))
          stream.on('close', function () {
            fs.unlinkSync(app.getPath('downloads') + '\\TFAR\\package.ini')
            shell.showItemInFolder(app.getPath('downloads') + '\\TFAR')
          })
        }
        break
    }
  })
}])

function getMods () {
  var url = APIBaseURL + APIModsURL
  if (beta.beta) {
    url += APIBetaADD
  }
  ipcRenderer.send('to-web', {
    type: 'get-url',
    callback: 'mod-callback',
    url: url,
    callBackTarget: 'to-app'
  })
}

function getChangelog () {
  ipcRenderer.send('to-web', {
    type: 'get-url',
    callback: 'changelog-callback',
    url: APIBaseURL + APIChangelogURL,
    callBackTarget: 'to-app'
  })
}

function getServers () {
  ipcRenderer.send('to-web', {
    type: 'get-url',
    callback: 'servers-callback',
    url: APIBaseURL + APIServersURL,
    callBackTarget: 'to-app'
  })
}

function getNotification () {
  ipcRenderer.send('to-web', {
    type: 'get-url',
    callback: 'notification-callback',
    url: APIBaseURL + APINotificationURL,
    callBackTarget: 'to-app'
  })
}

function getFuelstations () {
  ipcRenderer.send('to-web', {
    type: 'get-url',
    callback: 'fuelstations-callback',
    url: APIBaseURL + APIFuelStationURL,
    callBackTarget: 'to-app'
  })
}

function toGB (val) {
  return (val / 1000000000).toFixed(3)
}

function toMB (val) {
  return (val / 1000000).toFixed(3)
}

function toProgress (val) {
  return (val * 100).toFixed(3)
}

function toFileProgress (filesize, downloaded) {
  return (100 / filesize * downloaded).toFixed(2)
}

function cutName (name) {
  if (name.length > 30) {
    return name.substring(0, 30) + '...'
  } else {
    return name
  }
}

function spawnNotification (message) {
  new Notification('ReallifeRPG', { // eslint-disable-line
    body: message
  })
}

function appLoaded () { // eslint-disable-line
  ipcRenderer.send('app-loaded')
}

