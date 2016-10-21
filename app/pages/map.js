function addFuels() {
  server1 = [];
  server2 = [];
  for (i = 0; i < fuelData.length; i++) {
    addFuelMarker(fuelData[i]);
  };
  server1group = L.layerGroup(server1);
  server2group = L.layerGroup(server2);
  addLayers();
};

function addFuelMarker(object){
  var name = "marker" + object.Id;
  var arr = object.Pos.replace("[", "").replace("]", "").split(",");
  var percentage = Math.round((object.Fuel / 30000) * 100);
  percentage
  var ArmaX = arr[0];
  var ArmaY = 10240 - arr[1]
  var m = {
      x: (ArmaX / 10240) * 16384,
      y: (ArmaY / 10240) * 16384
  };

  if(object.ServerId == 1) {
    if(percentage > 70) {
      server1.push(
        L.marker(map.unproject([m.x, m.y], map.getMaxZoom()), {
            icon: gasMarker_green
        }).bindPopup("<div class=\"progress small\" data-value=\"" + percentage + "\" data-role=\"progress\" data-color=\"bg-green\"></div>",{
          autoClose: false,
          minWidth: 150
        })
      );
    } else if(percentage > 30) {
      server1.push(
        L.marker(map.unproject([m.x, m.y], map.getMaxZoom()), {
            icon: gasMarker_orange
        }).bindPopup("<div class=\"progress small\" data-value=\"" + percentage + "\" data-role=\"progress\" data-color=\"bg-orange\"></div>",{
          autoClose: false,
          minWidth: 150
        })
      );
    } else {
      server1.push(
        L.marker(map.unproject([m.x, m.y], map.getMaxZoom()), {
            icon: gasMarker_red
        }).bindPopup("<div class=\"progress small\" data-value=\"" + percentage + "\" data-role=\"progress\" data-color=\"bg-red\"></div>",{
          autoClose: false,
          minWidth: 150
        })
      );
    }
  } else if(object.ServerId == 2) {
    if(percentage > 70) {
      server2.push(
        L.marker(map.unproject([m.x, m.y], map.getMaxZoom()), {
            icon: gasMarker_green
        }).bindPopup("<div class=\"progress small\" data-value=\"" + percentage + "\" data-role=\"progress\" data-color=\"bg-green\"></div>",{
          autoClose: false,
          minWidth: 150
        })
      );
    } else if(percentage > 30) {
      server2.push(
        L.marker(map.unproject([m.x, m.y], map.getMaxZoom()), {
            icon: gasMarker_orange
        }).bindPopup("<div class=\"progress small\" data-value=\"" + percentage + "\" data-role=\"progress\" data-color=\"bg-orange\"></div>",{
          autoClose: false,
          minWidth: 150
        })
      );
    } else {
      server2.push(
        L.marker(map.unproject([m.x, m.y], map.getMaxZoom()), {
            icon: gasMarker_red
        }).bindPopup("<div class=\"progress small\" data-value=\"" + percentage + "\" data-role=\"progress\" data-color=\"bg-red\"></div>",{
          autoClose: false,
          minWidth: 150
        })
      );
    }
  };
};

function addLayers() {
  var baseLayers = {
      "Straßen": img1,
      "Satellit": img2
  };
  var overlayMaps = {
      "Server 1 Tankstellen": server1group,
      "Server 2 Tankstellen": server2group
  };

  L.control.layers(baseLayers, overlayMaps).addTo(map);

};

function refreshFuelstations() {
  var args = {
          message: 'get-fuelstations',
          obj: {}
      };
  ipcRenderer.send('message-to-webwin', args);
};
