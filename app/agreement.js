const $ = window.jQuery = require('../resources/jquery/jquery-1.12.3.min.js')
const {ipcRenderer, shell} = require('electron')
const storage = require('electron-json-storage')
const config = require('../config.js')

$('#agreement').html(`<div class="center"><img src="../resources/loading/ring-alt.svg"></div>`)
$.ajax({
  url: config.PRIVACY_POLICY_URL,
  statusCode: {
    304: (data) => {
      $('#agreement').html(data.responseText)
    },
    200: (data) => {
      $('#agreement').html(data.responseText)
    }
  }
})

$('.accept').click(() => {
  storage.set('agreement', {version: config.PRIVACY_POLICY_VERSION}, (err) => {
    if (err) throw err

    ipcRenderer.send('close-agreement')
  })
})

$('.decline').click(() => {
  shell.openItem('ms-settings:appsfeatures')
  ipcRenderer.send('close-app')
})

$(document).on('click', 'a[href^="http"]', function (event) {
  event.preventDefault()
  shell.openExternal(this.href)
})
