angular.module('App').controller('serverCtrl', ['$scope', '$sce', ($scope, $sce) => {
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
    helpers.copyToClipboard(server.IpAddress + ':' + server.Port)
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
    helpers.getServers()
    helpers.getNotification()
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
            server.last_update = helpers.getRefreshTime(server.updated_at.date)
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
            helpers.getStatisticsData()
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

        helpers.spawnNotification('Arma wird gestartet...')
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
