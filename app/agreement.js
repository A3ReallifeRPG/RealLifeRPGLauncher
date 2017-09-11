/* global PRIVACY_POLICY_VERSION */

const $ = window.jQuery = require('../resources/jquery/jquery-1.12.3.min.js')
const {ipcRenderer, shell} = require('electron')
const storage = require('electron-json-storage')

$('#agreement').html(`<div class="center"><img src="../resources/loading/ring-alt.svg"></div>`)
$.ajax({
  url: 'https://realliferpg.de/pp.json',
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
  storage.set('agreement', {version: PRIVACY_POLICY_VERSION}, (err) => {
    if (err) throw err

    ipcRenderer.send('close-agreement')
  })
})

$('.decline').click(() => {
  storage.set('agreement', {version: PRIVACY_POLICY_VERSION}, (err) => {
    if (err) throw err

    ipcRenderer.send('close-agreement')
  })
})

$(document).on('click', 'a[href^="http"]', function (event) {
  event.preventDefault()
  shell.openExternal(this.href)
})
