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

/* global APIBaseURL APIModsURL APIChangelogURL APIServersURL APIBetaADD alertify angular SmoothieChart TimeSeries Chart Notification */

var App = angular.module('App', ['720kb.tooltips']).run(function ($rootScope) {
  $rootScope.downloading = false
  $rootScope.AppLoaded = true
  $rootScope.ArmaPath = ''
  $rootScope.AppTitle = 'RealLifeRPG Launcher - ' + app.getVersion()
  $rootScope.slide = 0
})

App.controller('navbarController', ['$scope', '$rootScope', function ($scope, $rootScope) {
  $scope.tabs = [
    {
      icon: 'glyphicon glyphicon-home', slide: 0
    }, {
      icon: 'glyphicon glyphicon-tasks', slide: 1
    }, {
      icon: 'glyphicon glyphicon-list-alt', slide: 2
    }, {
      icon: 'glyphicon glyphicon-headphones', slide: 3
    }, {
      icon: 'glyphicon glyphicon-cog', slide: 4
    }, {
      icon: 'glyphicon glyphicon-question-sign', slide: 5
    }, {
      icon: 'glyphicon glyphicon-book', slide: 6
    }]

  $scope.switchSlide = function (tab) {
    $rootScope.slide = tab.slide
  }

  $rootScope.$watch(
    'slide', function () {
      $('#carousel-main').carousel($rootScope.slide)
    }, true)

  $scope.$watch(
    'AppTitle', function () {
      document.title = $rootScope.AppTitle
    }, true)

  $scope.refresh = function () {
    getMods()
    getServers()
  }
}])

App.controller('modController', ['$scope', '$rootScope', function ($scope, $rootScope) {
  $scope.state = 'Gestoppt'
  $scope.hint = 'Inaktiv'
  $rootScope.downloading = false
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
  $scope.betaMods = false

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
          downSpeed: toMB(args.state.speed),
          upSpeed: 0,
          totalProgress: toFileProgress(args.state.totalSize, args.state.totalDownloaded),
          totalSize: toGB(args.state.totalSize),
          totalDownloaded: toGB(args.state.totalDownloaded),
          totalETA: '',
          totalPeers: 0,
          maxConns: 0,
          fileName: cutName(args.fileName),
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
          downSpeed: toMB(args.state.speed),
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
          spawnNotification(args.list.length + ' Dateien müssen heruntergelanden werden (' + toGB(size) + ' GB)')
          $scope.$apply()
        } else {
          spawnNotification('Überprüfung abgeschlossen - Mod ist aktuell.')
          $scope.reset()
        }
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
        getMods($scope.betaMods)
        $scope.initGraph()
      })
    } catch (e) {
      $scope.checkregkey1()
    }
  }

  $scope.initTorrent = function (mod) {
    alertify.log('Seeding wird gestartet...', 'primary')
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

  $scope.initListDownload = function (list, torrent, mod) {
    $scope.update({
      state: 'Download wird gestarted...',
      hint: '',
      downloading: true,
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
    $scope.chart = new SmoothieChart({
      millisPerPixel: 20,
      grid: {fillStyle: '#ffffff', strokeStyle: '#ffffff'},
      labels: {fillStyle: '#000000', disabled: true}
    })

    var canvas = document.getElementById('smoothie-chart')

    $scope.graphTimeline = new TimeSeries()
    $scope.chart.addTimeSeries($scope.graphTimeline, {lineWidth: 2, strokeStyle: '#2780e3'})
    $scope.chart.streamTo(canvas, 1000)
  }

  $scope.cancel = function () {
    ipcRenderer.send('to-dwn', {
      type: 'cancel'
    })
  }

  $scope.update = function (update) {
    $scope.state = update.state
    $scope.hint = update.hint
    $rootScope.downloading = update.downloading
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
        $scope.initHash(mod)
        break
      case 3:
        $rootScope.slide = 1
        break
      default:
        break
    }
  }

  $('#betaSwitch').on('ifChecked', function (event) {
    $scope.betaMods = true
    getMods($scope.betaMods)
  }).on('ifUnchecked', function (event) {
    $scope.betaMods = false
    getMods($scope.betaMods)
  })

  $scope.checkUpdates = function () {
    for (var i = 0; i < $scope.mods.length; i++) {
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
          getMods($scope.betaMods)
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
      if (err) {
        console.log(err)
      }
      if (exists) {
        regKey.values(function (err, items) {
          console.log(err)
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
      if (err) {
        console.log(err)
      }
      if (exists) {
        regKey.values(function (err, items) {
          console.log(err)
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
      if (err) {
        console.log(err)
      }
      if (exists) {
        regKey.values(function (err, items) {
          console.log(err)
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
}])

App.controller('serverController', ['$scope', function ($scope) {
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
            $scope.redrawChart($scope.servers[i])
            $('#playerScroll' + $scope.servers[i].Id).perfectScrollbar()
          }
        }
        break
    }
  })
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
      if (error) throw error
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
    })
  }

  $('#splashCheck').on('ifChecked', function (event) {
    $scope.splash = true
    $scope.saveSettings()
  }).on('ifUnchecked', function (event) {
    $scope.splash = false
    $scope.saveSettings()
  })

  $('#introCheck').on('ifChecked', function (event) {
    $scope.intro = true
    $scope.saveSettings()
  }).on('ifUnchecked', function (event) {
    $scope.intro = false
    $scope.saveSettings()
  })

  $('#htCheck').on('ifChecked', function (event) {
    $scope.ht = true
    $scope.saveSettings()
  }).on('ifUnchecked', function (event) {
    $scope.ht = false
    $scope.saveSettings()
  })

  $('#windowedCheck').on('ifChecked', function (event) {
    $scope.windowed = true
    $scope.saveSettings()
  }).on('ifUnchecked', function (event) {
    $scope.windowed = false
    $scope.saveSettings()
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
      add_params: $scope.add_params
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
      storage.set('settings', {armapath: $rootScope.ArmaPath}, function (error) {
        if (error) throw error
      })
    } else {
      $rootScope.ArmaPath = ''
    }
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
  $scope.initTFARDownload = function () {
    $scope.tfarDownloading = true
    ipcRenderer.send('to-web', {
      type: 'start-tfar-download'
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

function getMods (betaMods) {
  var url = APIBaseURL + APIModsURL
  if (betaMods) {
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
