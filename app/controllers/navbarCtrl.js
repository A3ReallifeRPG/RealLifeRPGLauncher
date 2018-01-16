angular.module('App').controller('navbarCtrl', ['$scope', '$rootScope', ($scope, $rootScope) => {
  $scope.tabs = [
    {
      icon: 'glyphicon glyphicon-home', title: 'Mods', tag: 'modsTabBtn'
    }, {
      icon: 'glyphicon glyphicon-tasks', title: 'Server', tag: 'serversTabBtn'
    }, {
      icon: 'fa fa-user-circle-o', title: 'Spieler', tag: 'playerTabBtn'
    }, {
      icon: 'glyphicon glyphicon-list-alt', title: 'Changelog', tag: 'changelogTabBtn'
    }, {
      icon: 'glyphicon glyphicon-headphones', title: 'TFAR', tag: 'tfarTabBtn'
    }, {
      icon: 'glyphicon glyphicon-cog', title: 'Einstellungen', tag: 'settingsTabBtn'
    }, {
      icon: 'glyphicon glyphicon-question-sign', title: 'FAQ', tag: 'faqTabBtn'
    }, {
      icon: 'fa fa-twitch', title: 'Twitch', tag: 'twitchTabBtn'
    }, {
      icon: 'glyphicon glyphicon-map-marker', title: 'Map', tag: 'mapTabBtn'
    }, {
      icon: 'glyphicon glyphicon-book', title: 'Über', tag: 'aboutTabBtn'
    }]

  $scope.switchSlide = (tab) => {
    $rootScope.slide = $scope.tabs.indexOf(tab)
  }

  $rootScope.$watch(
    'slide', () => {
      $('#carousel-main').carousel($rootScope.slide)
      if (typeof process.env.PORTABLE_EXECUTABLE_DIR !== 'undefined') {
        $rootScope.portable = true
        $rootScope.AppTitle = 'RealLifeRPG Launcher - ' + app.getVersion() + ' Portable - ' + $scope.tabs[$rootScope.slide].title
      } else {
        $rootScope.portable = false
        $rootScope.AppTitle = 'RealLifeRPG Launcher - ' + app.getVersion() + ' - ' + $scope.tabs[$rootScope.slide].title
      }
      if ($rootScope.map) {
        $rootScope.map.invalidateSize(false)
      }
    }, true
  )

  $scope.$watch(
    'AppTitle', () => {
      document.title = $rootScope.AppTitle
    }, true)

  $scope.tourApp = () => {
    $rootScope.tour.start()
  }
}])
