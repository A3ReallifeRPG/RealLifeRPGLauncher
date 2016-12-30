const {ipcRenderer} = require('electron');
var moment = require('moment');
var humanizeDuration = require('humanize-duration');
var vex = require('vex-js');
vex.registerPlugin(require('vex-dialog'));
vex.defaultOptions.className = 'vex-theme-plain';

var App = angular.module('App', []).run(function($rootScope) {
    $rootScope.downloading = false;
    $rootScope.AppLoaded = true;
});

App.controller('navbarController', ['$scope','$rootScope', function ($scope,$rootScope) {
    $scope.slide = 0;

    $scope.tabs = [
        {
            icon: 'glyphicon glyphicon-home', slide: 0
        }, {
            icon: 'glyphicon glyphicon-tasks',  slide: 1
        }, {
            icon: 'glyphicon glyphicon-list-alt', slide: 2
        }];

    $scope.switchSlide = function (tab) {
        $scope.slide = tab.slide;
    };

    $scope.$watch(
        "slide", function () {
            $("#carousel-main").carousel($scope.slide);
        }, true);

    $scope.refresh = function () {
        getMods();
        getServers();
    };
}]);

App.controller('modController', ['$scope','$rootScope', function ($scope,$rootScope) {
    ipcRenderer.on('to-app', (event, args) => {
        switch (args.type) {
        case "mod-callback":
            $scope.mods = args.data.data;
            $scope.loading = false;
            $scope.$apply();
            $('#modScroll').perfectScrollbar();
            break;
        case "update-dl-progress-server":
            $rootScope.downloading = true;
            $scope.dlType = "Server - Verbunden";
            $scope.graphTimeline.append(new Date().getTime(),args.state.speed);
            $scope.fileSpeed = Math.round((args.state.speed / 1000000) * 100) / 100;
            $scope.$apply();
            break;
        case "update-dl-progress-torrent":
            $scope.dlType = "Torrent - Verbunden";
            $rootScope.downloading = true;
            $scope.graphTimeline.append(new Date().getTime(),args.state.torrentDownloadSpeedState);
            $rootScope.downSpeed = (args.state.torrentDownloadSpeedState / 1000000).toFixed(2);
            $rootScope.upSpeed = (args.state.torrentUploadSpeedState / 1000000).toFixed(2);
            $scope.fileSpeed = (args.state.torrentDownloadSpeedState / 1000000).toFixed(2);
            $scope.progress = (args.state.torrentProgressState * 100).toFixed(2);
            $scope.downloaded = (args.state.torrentDownloadedState / 1000000000).toFixed(2);
            $scope.torrentSize = (args.state.torrentSizeState / 1000000000).toFixed(2);
            $scope.eta = humanizeDuration(Math.round(args.state.torrentETAState), { language: 'de' , round: true});
            $scope.peers = args.state.torrentNumPeersState;
            $scope.maxConns = args.state.torrentMaxConnsState;
            $scope.$apply();
            break;
        case "torrent-init":
            $scope.dlType = "Torrent - Verbinden...";
            $rootScope.downloading = false;
            $scope.$apply();
            break;
        case "status-change":
            $scope.dlType = args.status;
            $scope.$apply();
            break;
        case "update-hash-progress":
            $scope.dlType = "Überprüfung - Läuft";
            $scope.progress = (args.state.index/args.state.size * 100).toFixed(2);
            $scope.$apply();
            break;
        case "update-hash-progress-done":
            $scope.dlType = "Überprüfung - Abgeschlossen";
            $scope.progress = 100;
            vex.dialog.alert({
                message: 'Testing the wireframe theme.',
                className: 'vex-theme-wireframe' // Overwrites defaultOptions
            });
            spawnNotification(args.list.length + " Datein werden erneut heruntergelanden");
            $scope.$apply();
            break;
        case "reset":
            $scope.dlType = "Gestoppt";
            $rootScope.downloading = false;
            $rootScope.downSpeed = 0;
            $rootScope.upSpeed = 0;
            $scope.fileSpeed = 0;
            $scope.progress = 100;
            $scope.downloaded = 0;
            $scope.torrentSize = 0;
            $scope.eta = "-";
            $scope.peers = 0;
            $scope.maxConns = 0;
            $scope.$apply();
            break;
        }
    });

    $scope.dlType = "Gestoppt";
    $scope.eta = "-";
    $rootScope.downloading = false;

    $scope.maxConns = 0;
    $scope.peers = 0;
    $scope.progress = 0;
    $scope.fileProgress = 0;
    $scope.fileName = 0;
    $scope.fileSpeed = 0;
    $scope.downloaded = 0;
    $scope.size = 0;
    $scope.torrentSize = 0;

    $scope.init = function () {
        $scope.loading = true;
        getMods();
        $scope.initGraph();
    };

    $scope.initDownload = function (mod) {
        $scope.dlType = "Download wird gestarted...";
        var args = {
            type: "start-mod-dwn",
            mod: mod,
            target : "E:\\Steam\\steamapps\\common\\Arma 3\\"
        };
        ipcRenderer.send('to-dwn', args);
    };

    $scope.initHash = function (mod) {
        $scope.dlType = "Überprüfung wird gestarted...";
        var args = {
            type: "start-mod-hash",
            mod: mod,
            target : "E:\\Steam\\steamapps\\common\\Arma 3\\"
        };
        ipcRenderer.send('to-dwn', args);
    };

    $scope.initGraph = function () {
        $scope.chart = new SmoothieChart({
            millisPerPixel: 20,
            grid: {fillStyle: '#ffffff', strokeStyle: 'transparent', borderVisible: true},
            labels: {fillStyle: '#000000', disabled: true}
        });

        canvas = document.getElementById('smoothie-chart');

        $scope.graphTimeline = new TimeSeries();
        $scope.chart.addTimeSeries($scope.graphTimeline, {lineWidth: 2, strokeStyle: '#2780e3'});
        $scope.chart.streamTo(canvas, 1000);
    };
}]);

App.controller('serverController', ['$scope', function ($scope) {
    ipcRenderer.on('to-app', (event, args) => {
        switch (args.type) {
    case "servers-callback":
        $scope.servers = args.data.data;
        $scope.loading = false;
        $scope.$apply();
        for (var i = 0; i < $scope.servers.length; i++) {
            $scope.redrawChart($scope.servers[i]);
            $('#playerScroll' + $scope.servers[i].Id).perfectScrollbar();
        }
        break;
    }
});

    $scope.redrawChart = function (server) {
        var data = {
            labels: [
                " Zivilisten",
                " Polizisten",
                " Medics",
                " ADAC"
            ],
            datasets: [
                {
                    data: [server.Civilians, server.Cops, server.Medics, server.Adac],
                    backgroundColor: [
                        "#8B008B",
                        "#0000CD",
                        "#228B22",
                        "#C00100"
                    ]
                }]
        };

        var xhx = $("#serverChart" + server.Id);
        var serverChart1 = new Chart(xhx, {
            type: 'pie',
            data: data,
            options: {
                responsive: false,
                legend: {
                    position: 'bottom'
                }
            }
        });
    };

    $scope.init = function () {
        $scope.loading = true;
        getServers();
    };

    $scope.showTab = function (tabindex) {
        $('.serverTab').removeClass('active');
        $('.serverPane').removeClass('active');
        $('#serverTab' + tabindex).addClass('active');
        $('#serverPane' + tabindex).addClass('active');
    };
}]);

App.controller('changelogController', ['$scope', function ($scope) {
    ipcRenderer.on('to-app', (event, args) => {
        switch (args.type) {
        case "changelog-callback":
        $scope.changelogs = args.data.data;
        $scope.loading = false;
        $scope.$apply();
        $('#changelogScroll').perfectScrollbar({wheelSpeed: 0.5});
        break;
    }
});

    $scope.init = function () {
        $scope.loading = true;
        getChangelog();
    };
}]);

function getMods() {
    var args = {
        type: "get-url",
        callback: "mod-callback",
        url: APIBaseURL + APIModsURL,
        callBackTarget: "to-app"
    };
    ipcRenderer.send('to-web', args);
}

function getChangelog() {
    var args = {
        type: "get-url",
        callback: "changelog-callback",
        url: APIBaseURL + APIChangelogURL,
        callBackTarget: "to-app"
    };
    ipcRenderer.send('to-web', args);
}

function getServers() {
    var args = {
        type: "get-url",
        callback: "servers-callback",
        url: APIBaseURL + APIServersURL,
        callBackTarget: "to-app"
    };
    ipcRenderer.send('to-web', args);
}