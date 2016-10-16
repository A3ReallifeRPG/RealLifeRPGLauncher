function downloadTFAR() {
  $('#downloadtfar').attr("disabled", true);
  $('#step1').css("visibility","visible");
    if (debug_mode >= 1) {
        console.log('Sending IPC to webWin for TFAR download');
    };
    var args = {
        type: 1,
        message: "download-tfar"
    }
    ipcRenderer.send('message-to-webwin', args);
};
