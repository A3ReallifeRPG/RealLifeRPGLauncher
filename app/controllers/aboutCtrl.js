angular.module('App').controller('aboutCtrl', ['$scope', '$sce', ($scope, $sce) => {
  $scope.init = () => {
    if (!(typeof process.windowsStore !== 'undefined')) {
      fs.readFile('README.md', 'utf8', (err, data) => {
        if (!err) {
          $scope.aboutContent = $sce.trustAsHtml(marked(data))
          $scope.$apply()
          $('#aboutScroll').perfectScrollbar({suppressScrollX: true, wheelSpeed: 0.5})
        } else {
          console.log(err)
        }
      })
    } else {
      $scope.aboutContent = $sce.trustAsHtml('<h4>Windows Store Version</h4><br><a href="https://github.com/A3ReallifeRPG/RealLifeRPGLauncher/">Github</a>')
    }
  }
}])
