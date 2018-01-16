const App = angular.module('App', ['720kb.tooltips']).run(($rootScope) => {
  $rootScope.downloading = false
  $rootScope.AppLoaded = true
  $rootScope.ArmaPath = ''
  $rootScope.AppTitle = 'RealLifeRPG Launcher - ' + app.getVersion() + ' - Mods'
  $rootScope.slide = 0
  $rootScope.theme = 'dark'
  $rootScope.updating = false
  $rootScope.update_ready = false
  $rootScope.player_data = null
  $rootScope.apiKey = ''
  $rootScope.logged_in = false
  $rootScope.logging_in = false
  $rootScope.map = null

  storage.get('settings', (err, data) => {
    if (err) {
      $rootScope.theme = 'dark'
      throw err
    }

    if (typeof data.theme !== 'undefined') {
      $rootScope.theme = data.theme
    }
  })

  storage.get('agreement', (err, data) => {
    if (err) {
      ipcRenderer.send('open-agreement')
      throw err
    }

    if (data.version !== config.PRIVACY_POLICY_VERSION) {
      ipcRenderer.send('open-agreement')
    }
  })

  storage.get('player', (err, data) => {
    if (err) throw err

    if (typeof data.apikey !== 'undefined') {
      $rootScope.apiKey = data.apikey
      $rootScope.logging_in = true
      helpers.getPlayerData($rootScope.apiKey)
    } else {
      storage.get('settings', (err, data) => {
        if (err) throw err
        $rootScope.ArmaPath = data.armapath
        $rootScope.getMods()
      })
    }
  })

  $rootScope.relaunchUpdate = () => {
    ipcRenderer.send('quitAndInstall')
  }

  $rootScope.refresh = () => {
    storage.get('settings', (err) => {
      if (err) throw err
      $rootScope.getMods()
    })
    helpers.getServers()
    helpers.getChangelog()
    helpers.getTwitch()
    if ($rootScope.logged_in) {
      helpers.getPlayerData($rootScope.apiKey)
    }
  }

  $rootScope.login = () => {
    alertify.set({labels: {ok: 'Ok', cancel: 'Abbrechen'}})
    alertify.prompt('Bitte füge deinen Login-Schlüssel ein', (e, str) => {
      if (e) {
        if (str) {
          $.ajax({
            url: config.APIBaseURL + config.APIValidatePlayerURL + str,
            type: 'GET',
            success: (data) => {
              if (data.status === 'Success') {
                alertify.success('Willkommen ' + data.name)
                storage.set('player', {apikey: str}, (err) => {
                  if (err) throw err
                })
                $rootScope.apiKey = str
                $rootScope.logging_in = true
                helpers.getPlayerData(str)
                $rootScope.$apply()
              } else {
                $rootScope.login()
                alertify.log('Falscher Schlüssel', 'danger')
                $rootScope.login()
              }
            }
          })
        } else {
          $rootScope.login()
        }
      }
    }, '')
  }

  $rootScope.logout = () => {
    storage.remove('player', (err) => {
      if (err) throw err
    })
    $rootScope.ApiKey = ''
    $rootScope.player_data = null
    $rootScope.logged_in = false
    storage.get('settings', (err) => {
      if (err) throw err
      $rootScope.getMods()
    })
  }

  $rootScope.getMods = () => {
    let url = config.APIBaseURL + config.APIModsURL
    if ($rootScope.logged_in) {
      url += '/' + $rootScope.apiKey
    }
    ipcRenderer.send('to-web', {
      type: 'get-url',
      callback: 'mod-callback',
      url: url,
      callBackTarget: 'to-app'
    })
  }

  ipcRenderer.on('to-app', (event, args) => {
    if (typeof args.args !== 'undefined') {
      if (args.args.callback === 'player-callback') {
        $rootScope.player_data = args.data.data[0]
        $rootScope.player_data.last_change = moment(new Date($rootScope.player_data.last_change)).format('H:mm, DD.MM.YYYY')
        $rootScope.player_data.cash_readable = $rootScope.player_data.cash.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.')
        $rootScope.player_data.bankacc_readable = $rootScope.player_data.bankacc.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.')
        $rootScope.player_data.exp_readable = $rootScope.player_data.exp.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1.')
        if ($rootScope.player_data.level !== 30) {
          $rootScope.player_data.exp_progress = Math.round(($rootScope.player_data.exp - (($rootScope.player_data.level - 1) * ($rootScope.player_data.level - 1) * 1000)) / (($rootScope.player_data.level * $rootScope.player_data.level * 1000) - (($rootScope.player_data.level - 1) * ($rootScope.player_data.level - 1) * 1000)) * 100)
        } else {
          $rootScope.player_data.exp_progress = 100
        }

        $rootScope.logged_in = true
        $rootScope.logging_in = false
        storage.get('settings', (err, data) => {
          if (err) throw err
          $rootScope.ArmaPath = data.armapath
          $rootScope.getMods()
        })
        $rootScope.$apply()
      }
    }
  })

  ipcRenderer.on('checking-for-update', () => {
    alertify.log('Suche nach Updates...', 'primary')
    $rootScope.updating = true
    $rootScope.$apply()
  })

  ipcRenderer.on('update-not-available', () => {
    alertify.log('Launcher ist aktuell', 'primary')
    $rootScope.updating = false
    $rootScope.$apply()
  })

  ipcRenderer.on('update-available', () => {
    helpers.spawnNotification('Update verfügbar, wird geladen...')
    alertify.log('Update verfügbar, wird geladen...', 'primary')
    $rootScope.updating = true
    $rootScope.$apply()
  })

  ipcRenderer.on('update-downloaded', (event, args) => {
    helpers.spawnNotification('Update zur Version ' + args.releaseName + ' bereit.')
    $rootScope.updating = false
    $rootScope.update_ready = true
    $rootScope.$apply()
  })

  $rootScope.$on('ngRepeatFinished', () => {
    $rootScope.tour = new Shepherd.Tour({
      defaults: {
        classes: 'shepherd-theme-square-dark'
      }
    })

    $rootScope.tour.addStep('start', {
      title: 'Willkommen',
      text: 'Hallo! Du hast dir gerade unseren Launcher geladen, wir wollen dich auf eine kleine Tour einladen um dich mit ihm vetraut zu machen.',
      buttons: [{
        text: 'Nein Danke',
        classes: 'shepherd-button-secondary',
        action: $rootScope.endTour
      }, {
        text: 'Weiter',
        action: $rootScope.tour.next
      }]
    })

    $rootScope.tour.addStep('mods', {
      title: 'Mods',
      text: 'Hier kannst du unsere Mods downloaden und prüfen sowie das Spiel starten.',
      attachTo: '.modsTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 0
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('servers', {
      title: 'Server',
      text: 'Hier findest du alle unsere Server und Informationen zu ihnen, auch kannst du von diesem Tab direkt auf einen Server joinen.',
      attachTo: '.serversTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 1
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('player', {
      title: 'Spieler',
      text: 'Nachdem du dich eingeloggt hast findest du hier deine Spielerdaten.',
      attachTo: '.playerTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 2
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('changelog', {
      title: 'Changelog',
      text: 'Hier findest du immer alle Änderungen an der Mission, der Map und den Mods.',
      attachTo: '.changelogTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 3
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('tfar', {
      title: 'Task Force Radio',
      text: 'Hier kannst du das Task Force Radio Plugin für deinen Teamspeak 3 Client installieren, sowie einen Skin der im ReallifeRPG Stil gehalten ist.',
      attachTo: '.tfarTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 4
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('settings', {
      title: 'Einstellungen',
      text: 'Hier findest du Einstellungen wie den Arma 3 Pfad, CPU Anzahl, Theme des Launchers und vieles mehr.',
      attachTo: '.settingsTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 5
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('faq', {
      title: 'FAQ',
      text: 'Hier werden viele oft gestellte Fragen direkt beantwortet. Schau kurz mal hier nach bevor du dich im Support meldest, vielleicht wird deine Frage ja direkt beantwortet.',
      attachTo: '.faqTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 6
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('Twitch', {
      title: 'Über',
      text: 'Hier findest du immer Streamer die gerade auf unserem Server spielen.',
      attachTo: '.twitchTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 7
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('map', {
      title: 'Karte',
      text: 'Hier findest du eine Karte von Abramia auf der du dir den Füllstand aller Tankstellen anzeigen lassen kannst.',
      attachTo: '.mapTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 8
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('about', {
      title: 'Über',
      text: 'Hier kannst du allgemeine Informationen zum Launcher finden.',
      attachTo: '.aboutTabBtn bottom',
      buttons: {
        text: 'Weiter',
        action: $rootScope.tour.next
      },
      when: {
        show: () => {
          $rootScope.slide = 9
          $rootScope.$apply()
        }
      }
    })

    $rootScope.tour.addStep('end', {
      title: 'Viel Spaß!',
      text: 'Genug gelesen, lad dir unseren Mod runter, installier Task Force Radio, betritt den Server und entdecke deine ganz eigene Weise auf ReallifeRPG zu spielen. Viel Spaß von unserem ganzen Team!',
      buttons: {
        text: 'Beenden',
        action: $rootScope.endTour
      },
      when: {
        show: () => {
          $rootScope.slide = 0
          $rootScope.$apply()
        }
      }
    })

    storage.get('tour', (err, data) => {
      if (err) {
        throw err
      }
      if (typeof data.tour === 'undefined' || data.tour === null) {
        $rootScope.tour.start()
      }
    })
  })

  $rootScope.endTour = () => {
    $rootScope.tour.cancel()
    storage.set('tour', {tour: true}, (err) => {
      if (err) throw err
    })
  }
})

App.directive('onFinishRender', ($timeout) => {
  return {
    restrict: 'A',
    link: (scope, element, attr) => {
      if (scope.$last === true) {
        $timeout(() => {
          scope.$emit(attr.onFinishRender)
          helpers.appLoaded()
        })
      }
    }
  }
})
