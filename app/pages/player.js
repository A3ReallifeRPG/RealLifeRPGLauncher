function getPlayerData(secret) {
  var args = {
          message: 'get-player-data',
          secret: secret
      };
  ipcRenderer.send('message-to-webwin', args);
};

function renderPlayerData(data) {
  $('#player_data_name').html(data.name);
  $('#player_content').css("visibility","visible");
  $('#install').css("visibility","hidden");
};

function savePlayerSecret(key) {
  storage.set('player', {
          secret: key
      }, function(error) {
        console.log(error)
      });
};
