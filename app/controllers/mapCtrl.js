angular.module('App').controller('mapCtrl', ['$scope', '$rootScope', ($scope, $rootScope) => {
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
          x: (fuelstation.Pos.replace('[', '').replace(']', '').split(',')[0] / 15360) * 8192,
          y: ((15360 - fuelstation.Pos.replace('[', '').replace(']', '').split(',')[1]) / 15360) * 8192
        }

        if (fuel > 70) {
          instance.Markers.push(L.marker($rootScope.map.unproject([m.x, m.y], $rootScope.map.getMaxZoom()), {
            icon: $scope.gasMarkerGreen
          }).bindPopup('<div class="progress progress-striped active" style="margin-bottom: 0"><div class="progress-bar progress-bar-success" style="width: ' + fuel + '%"></div></div><div class="center"><span class="label label-info label-large">' + fuelstation.Fuel + '/30000 Liter </span></div>', {
            autoClose: false,
            minWidth: 150
          }))
        } else if (fuel > 30) {
          instance.Markers.push(L.marker($rootScope.map.unproject([m.x, m.y], $rootScope.map.getMaxZoom()), {
            icon: $scope.gasMarkerOrange
          }).bindPopup('<div class="progress progress-striped active" style="margin-bottom: 0"><div class="progress-bar progress-bar-warning" style="width: ' + fuel + '%"></div></div><div class="center"><span class="label label-info label-large">' + fuelstation.Fuel + '/30000 Liter </span></div>', {
            autoClose: false,
            minWidth: 150
          }))
        } else {
          instance.Markers.push(L.marker($rootScope.map.unproject([m.x, m.y], $rootScope.map.getMaxZoom()), {
            icon: $scope.gasMarkerRed
          }).bindPopup('<div class="progress progress-striped active" style="margin-bottom: 0"><div class="progress-bar progress-bar-danger" style="width: ' + fuel + '%"></div></div><div class="center"><span class="label label-info label-large">' + fuelstation.Fuel + '/30000 Liter </span></div>', {
            autoClose: false,
            minWidth: 150
          }))
        }
      })
    })

    let layers = {}

    $scope.fuelstations.forEach((cur, i) => {
      layers['Tankstellen Server ' + cur.Id] = L.layerGroup(cur.Markers)
    })

    L.control.layers(layers).addTo($rootScope.map)
  }

  $scope.init = () => {
    helpers.getFuelstations()

    let base = L.tileLayer('https://tiles.realliferpg.de/map/{z}/{x}/{y}.png', {
      minZoom: 1,
      maxZoom: 5,
      attribution: '<a target="_blank" href="https://realliferpg.de">Havenborn Map by ReallifeRPG</a>',
      tms: true
    })
    let sat = L.tileLayer('https://tiles.realliferpg.de/sat/{z}/{x}/{y}.png', {
      minZoom: 1,
      maxZoom: 5,
      attribution: '<a target="_blank" href="https://realliferpg.de">Havenborn Map by ReallifeRPG</a>',
      tms: true
    })
    let roads = L.tileLayer('https://tiles.realliferpg.de/roads/{z}/{x}/{y}.png', {
      minZoom: 1,
      maxZoom: 5,
      attribution: '<a target="_blank" href="https://realliferpg.de">Havenborn Map by ReallifeRPG</a>',
      tms: true
    })

    $rootScope.map = L.map('leaflet_map', {
      layers: [base]
    }).setView([0, 0], 1)

    let baseLayers = {
      'Karte': base,
      'Satellit': sat
    }

    let overlayLayers = {
      'Straßen': roads
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

    L.control.layers(baseLayers, overlayLayers).addTo($rootScope.map)

    let southWest = $rootScope.map.unproject([0, 8192], $rootScope.map.getMaxZoom())
    let northEast = $rootScope.map.unproject([8192, 0], $rootScope.map.getMaxZoom())
    $rootScope.map.setMaxBounds(new L.LatLngBounds(southWest, northEast))
  }
}])
