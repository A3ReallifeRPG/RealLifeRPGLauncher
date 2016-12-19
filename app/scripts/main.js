var App = angular.module('App',[]);

App.controller('navbarController', ['$scope', function ($scope) {
    $scope.page = 'home';

    $scope.tabs = [{icon:'glyphicon glyphicon-home', target:'home'}, {icon:'glyphicon glyphicon-tasks', target:'servers'}];

    $scope.switchPage = function (tab) {
        $("#content").hide().load("pages/" + tab.target + ".html").fadeIn('500');
        $scope.page = tab.target;
    }
}]);