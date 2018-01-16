angular.module('App').controller('twitchCtrl', ['$scope', ($scope) => {
  ipcRenderer.on('to-app', (event, args) => {
    switch (args.type) {
      case 'twitch-callback':
        args.data.data.forEach((cur) => {
          cur.sliced = cur.status.slice(0, 25)
        })
        $scope.twitchers = args.data.data
        $('#twitchScroll').perfectScrollbar({
          suppressScrollX: true
        })
        break
    }
  })

  $scope.init = () => {
    helpers.getTwitch()
  }
}])
