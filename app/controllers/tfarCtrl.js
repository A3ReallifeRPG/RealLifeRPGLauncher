angular.module('App').controller('tfarCtrl', ['$scope', '$rootScope', ($scope) => {
  $scope.initFileDownload = (file) => {
    if (!$scope.fileDownloading) {
      $scope.fileDownloading = true
      ipcRenderer.send('to-web', {
        type: 'start-file-download',
        file: file
      })
    } else {
      alertify.log('Download läuft bereits', 'danger')
    }
  }

  ipcRenderer.on('to-app', (event, args) => {
    switch (args.type) {
      case 'update-dl-progress-file':
        $scope.fileProgress = helpers.toProgress(args.state.percent)
        $scope.fileSpeed = prettyBytes(args.state.speed)
        $scope.$apply()
        break
      case 'update-dl-progress-file-done':
        $scope.fileProgress = 100
        $scope.fileSpeed = 0
        $scope.fileDownloading = false
        $scope.$apply()
        alertify.log('Wird ausgeführt...', 'primary')
        if (!shell.openItem(args.filePath)) {
          alertify.log('Fehlgeschlagen', 'danger')
          let stream = fs.createReadStream(args.filePath).pipe(unzip.Extract({path: app.getPath('downloads') + '\\ReallifeRPG'}))
          stream.on('close', () => {
            try {
              fs.unlinkSync(app.getPath('downloads') + '\\ReallifeRPG\\package.ini')
            } catch (err) {
              console.log(err)
            }
            shell.showItemInFolder(app.getPath('downloads') + '\\ReallifeRPG')
          })
        }
        break
    }
  })
}])
