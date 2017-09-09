angular.module('App').controller('playerCtrl', ['$scope', '$rootScope', ($scope, $rootScope) => {
  $scope.init = () => {
    $('#playerScroll').perfectScrollbar({wheelSpeed: 0.5, suppressScrollX: true})
  }
}])
