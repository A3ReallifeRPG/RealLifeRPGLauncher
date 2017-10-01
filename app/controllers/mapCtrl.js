angular.module('App').controller('mapCtrl', ['$scope', ($scope) => {

  /*
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
    helpers.getFuelstations()

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

  */
}])
