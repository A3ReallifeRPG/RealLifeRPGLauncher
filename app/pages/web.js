const storage = require('electron-json-storage');
var dwn = require('dwn');
var progress = require('progress-stream');
var fs = require('fs');
var mkpath = require('mkpath');
window.$ = window.jQuery = require('../resources/jquery/jquery-1.12.3.min.js');

const {
    ipcRenderer
} = require('electron');

require('getmac').getMac(function(err,macAddress){
	if (err)  throw err
  $.ajax({
      url: "https://service.realliferpg.de/launcher/report.php",
      type: "POST",
      data: {
          'type': 'opened',
          'mac' : macAddress
      },
      success: function() {}
  });
})
