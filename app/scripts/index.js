const {ipcRenderer} = require('electron');

var App = angular.module('App', []);

App.controller('navbarController', ['$scope', function ($scope) {
    $scope.slide = 0;

    $scope.tabs = [
        {
            icon: 'glyphicon glyphicon-home', target: 'home', slide: 0
        }, {
            icon: 'glyphicon glyphicon-tasks', target: 'servers', slide: 1
        }];

    $scope.switchSlide = function (tab) {
        $scope.slide = tab.slide;
    };

    $scope.$watch(
        "slide", function () {
            $("#carousel-main").carousel($scope.slide);
        }, true);
}]);

App.controller('modController', ['$scope', function ($scope) {

    $scope.downloading = false;

    $scope.progress = 0;
    $scope.fileProgress = 0;
    $scope.fileName = 0;

    $scope.chart = null;

    $scope.mods = [
        {
            "Id": 1,
            "Name": "RealLife RPG 5.0",
            "appId": 107410,
            "DownloadUrl": "http://dl1.realliferpg.de/download/",
            "IsActive": true,
            "Description": "RealLife RPG Community Arma 3 Server",
            "ImageUrl": "https://static.realliferpg.de/img/launcher/rlrpg5winter-600300.jpg",
            "HasGameFiles": true,
            "Directories": "@RealLifeRPG5.0"
        },
        {
            "Id": 5,
            "Name": "RealLifeRPG 5.0 BETA",
            "appId": 107410,
            "DownloadUrl": "http://213.202.212.13/download/",
            "IsActive": true,
            "Description": "BETA (inkompatibel mit normalem Server)",
            "ImageUrl": "https://static.realliferpg.de/img/launcher/rlrpg5-600300.jpg",
            "HasGameFiles": true,
            "Directories": "@RealLifeRPG5.0BETA"
        },
        {
            "Id": 6,
            "Name": "RealLifeRPG CSGO",
            "appId": 730,
            "DownloadUrl": "",
            "IsActive": true,
            "Description": "Counterstrike Global Offensive",
            "ImageUrl": "https://static.realliferpg.de/img/launcher/rlrpg5-600300.jpg",
            "HasGameFiles": false,
            "Directories": ""
        }
    ];

    $scope.initDownload = function (mod) {
        var args = {
            type: "start-mod-dwn",
            mod: mod,
            target : "E:\\Steam\\steamapps\\common\\Arma 3\\"
        };
        ipcRenderer.send('to-dwn', args);
    };

    $scope.initGraph = function () {
        $scope.chart = new SmoothieChart({
            millisPerPixel: 27,
            grid: {fillStyle: '#ffffff', strokeStyle: 'transparent', borderVisible: false},
            labels: {fillStyle: '#000000', disabled: true}
        }),
            canvas = document.getElementById('smoothie-chart');

        var random = new TimeSeries();
        setInterval(function () {
            random.append(new Date().getTime(), Math.random() * 10000);
        }, 500);

        chart.addTimeSeries(random, {lineWidth: 2, strokeStyle: '#2780e3'});
        chart.streamTo(canvas, 500);
    };
}]);