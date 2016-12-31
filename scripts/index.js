const {ipcRenderer} = require('electron');
var moment = require('moment');
var humanizeDuration = require('humanize-duration');
var Datastore = require('nedb');
var fs = require('fs');
const {dialog} = require('electron').remote;
const {app} = require('electron').remote;

var App = angular.module('App', []).run(function($rootScope) {
    $rootScope.downloading = false;
    $rootScope.AppLoaded = true;
    $rootScope.ArmaPath = "";

    try {
        fs.lstatSync(app.getPath('userData') + "\\settings.nedb");
        $rootScope.NeDB = new Datastore({ filename: app.getPath('userData') + "\\settings.nedb", autoload: true });
    } catch (e) {
        $rootScope.NeDB = new Datastore({ filename: app.getPath('userData') + "\\settings.nedb", autoload: true });

        var defaultSettings = {
            _id: 0
            , armapath: 5
        };

        $rootScope.NeDB.insert(defaultSettings, function (err, newDoc) {

        });
    }

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
        }, {
            icon: 'glyphicon glyphicon-cog', slide: 3
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
        $scope.checkUpdates();
        $scope.$apply();
        $('#modScroll').perfectScrollbar();
        break;
    case "update-dl-progress-server":
        $rootScope.downloading = true;
        $scope.state = "Server - Verbunden";
        $scope.size = toGB(args.state.totalSize);
        $scope.downloaded = toGB(args.state.totalDownloaded);
        $scope.graphTimeline.append(new Date().getTime(),args.state.speed);
        $scope.speed  = toMB(args.state.speed);
        $scope.fileName = cutName(args.fileName);
        $scope.fileProgress = (args.state.percent * 100).toFixed(2);
        $rootScope.downSpeed = $scope.speed;
        $scope.$apply();
        break;
    case "update-dl-progress-torrent":
        $scope.state = "Torrent - Verbunden";
        $rootScope.downloading = true;
        $scope.graphTimeline.append(new Date().getTime(),args.state.torrentDownloadSpeedState);
        $scope.speed = toMB(args.state.torrentDownloadSpeedState);
        $rootScope.downSpeed = $scope.speed;
        $rootScope.upSpeed = toMB(args.state.torrentUploadSpeedState);
        $scope.progress = (args.state.torrentProgressState * 100).toFixed(2);
        $scope.downloaded = toGB(args.state.torrentDownloadedState);
        $scope.size = toGB(args.state.torrentSizeState);
        $scope.eta = humanizeDuration(Math.round(args.state.torrentETAState), { language: 'de' , round: true});
        $scope.peers = args.state.torrentNumPeersState;
        $scope.maxConns = args.state.torrentMaxConnsState;
        $scope.fileName = "";
        $scope.fileProgress = "";
        $scope.$apply();
        break;
    case "torrent-init":
        $scope.state = "Torrent - Verbinden...";
        $rootScope.downloading = true;
        $scope.fileProgress = 0;
        $scope.$apply();
        break;
    case "status-change":
        $scope.state = args.status;
        $rootScope.downloading = args.downloading;
        $scope.hint = args.hint;
        $scope.$apply();
        break;
    case "update-hash-progress":
        $scope.state = "Überprüfung - Läuft";
        $scope.progress = (args.state.index/args.state.size * 100).toFixed(2);
        $scope.fileName = cutName(args.fileName);
        $scope.$apply();
        break;
    case "update-hash-progress-done":
        $scope.state = "Überprüfung - Abgeschlossen";
        $scope.progress = 100;
        var size = 0;
        for(var i = 0; i < args.list.length ; i++) {
            size += args.list[i].Size;
        }
        if(size != 0) {
            alertify.set({ labels : { ok: "Torrent", cancel: "Server" } });
            alertify.confirm(args.list.length + " Dateien müssen heruntergelanden werden (" + toGB(size) + " GB)", function (e) {
                if (e) {
                    $scope.reset();
                    $scope.initListDownload(args.list, true, args.mod, $rootScope.ArmaPath);
                } else {
                    $scope.reset();
                    $scope.initListDownload(args.list, false, args.mod, $rootScope.ArmaPath);
                }
            });
            spawnNotification(args.list.length + " Dateien müssen heruntergelanden werden (" + toGB(size) + " GB)");
            $scope.$apply();
        } else {
            spawnNotification("Überprüfung abgeschlossen - Mod ist aktuell.");
            $scope.reset();
        }
        break;
    case "update-dl-progress-done":
        $scope.state = "Abgeschlossen";
        $scope.progress = 100;
        spawnNotification("Download abgeschlossen.");
        $scope.reset();
        $scope.checkUpdates();
        break;
    case "reset":
        $scope.reset();
        $scope.$apply();
        break;
    case "update-quickcheck":
        for (var j = 0; j < $scope.mods.length; j++) {
            if ($scope.mods[j].Id == args.mod.Id) {
                if (args.update == 0) {
                    $scope.mods[j].state = [1,"Downloaden"];
                } else if (args.update == 1) {
                    $scope.mods[j].state = [2,"Update verfügbar"];
                } else {
                    $scope.mods[j].state = [3,"Spielen"];
                }
            }
        }
        $scope.$apply();
        break;
    }
});

    $scope.reset = function () {
        $scope.state = "Gestoppt";
        $rootScope.downloading = false;
        $rootScope.downSpeed = 0;
        $rootScope.upSpeed = 0;
        $scope.speed = 0;
        $scope.progress = null;
        $scope.downloaded = 0;
        $scope.size = 0;
        $scope.eta = "";
        $scope.fileName = "";
        $scope.peers = 0;
        $scope.maxConns = 0;
        $scope.$apply();
    };

    $scope.state = "Gestoppt";
    $rootScope.downloading = false;
    $rootScope.downSpeed = 0;
    $rootScope.upSpeed = 0;
    $scope.speed = 0;
    $scope.progress = null;
    $scope.downloaded = 0;
    $scope.size = 0;
    $scope.eta = "";
    $scope.fileName = "";
    $scope.peers = 0;
    $scope.maxConns = 0;

    $scope.init = function () {
        $scope.loading = true;
        getMods();
        $scope.initGraph();
    };

    $scope.initDownload = function (mod) {
        $rootScope.downloading = true;
        $scope.state = "Download wird gestarted...";
        var args = {
            type: "start-mod-dwn",
            mod: mod,
            path : $rootScope.ArmaPath
        };
        ipcRenderer.send('to-dwn', args);
    };

    $scope.initHash = function (mod) {
        $rootScope.downloading = true;
        $scope.state = "Überprüfung wird gestarted...";
        var args = {
            type: "start-mod-hash",
            mod: mod,
            path : $rootScope.ArmaPath
        };
        ipcRenderer.send('to-dwn', args);
    };

    $scope.initListDownload = function(list, torrent, mod, path) {
        $rootScope.downloading = true;
        $scope.state = "Download wird gestarted...";
        var args = {
            type: "start-list-dwn",
            list: list,
            torrent: torrent,
            mod: mod,
            path: path
        };
        ipcRenderer.send('to-dwn', args);
    };

    $scope.initGraph = function () {
        $scope.chart = new SmoothieChart({
            millisPerPixel: 20,
            maxValueScale: 1.23,
            minValueScale: 1.23,
            grid: {fillStyle: '#ffffff', strokeStyle: 'transparent', borderVisible: true},
            labels: {fillStyle: '#000000', disabled: true}
        });

        canvas = document.getElementById('smoothie-chart');

        $scope.graphTimeline = new TimeSeries();
        $scope.chart.addTimeSeries($scope.graphTimeline, {lineWidth: 2, strokeStyle: '#2780e3'});
        $scope.chart.streamTo(canvas, 1000);
    };

    $scope.cancel = function () {
        var args = {
            type: "cancel"
        };
        ipcRenderer.send('to-dwn', args);
    };

    $scope.$watch(
        "progress", function () {
            var args = {
                progress: $scope.progress/100
            };
            ipcRenderer.send('winprogress-change', args);
        }, true);

    $rootScope.$watch(
        "ArmaPath", function () {
            if($scope.mods !== undefined) {
                $scope.checkUpdates();
            };
        }, true);

    $scope.action = function (mod) {
        console.log(mod);
        switch (mod.state[0]) {
            case 1:
                $scope.initDownload(mod);
                break;
            case 2:
                $scope.initHash(mod);
                break;
            case 3:
                angular.element($('#bs-navbar-collapse')).injector().switchSlide({slide: 1});
                break;
            default:
                break;
        }
    };

    $scope.setStatus = function(status,hint) {
        if (typeof hint === 'undefined') {
            hint = "";
        }
        $scope.hint = hint;
        $scope.status = status;
        $scope.$apply();
    };

    $scope.checkUpdates = function () {
        for(var i = 0; i < $scope.mods.length; i++) {
            if($rootScope.ArmaPath !== ''){
                $scope.mods[i].state = [0,"Suche nach Updates..."];
                var args = {
                    type: "start-mod-quickcheck",
                    mod: $scope.mods[i],
                    path: $rootScope.ArmaPath
                };
                ipcRenderer.send('to-dwn', args);
            } else {
                $scope.mods[i].state = [0,"Kein Pfad gesetzt"];
            }
        }
        //$scope.setStatus("Suche nach Updates...", "Wir gleichen deine Version der Mods mit der Aktuellen ab.");
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

App.controller('settingsController', ['$scope','$rootScope', function ($scope,$rootScope) {
    $scope.init = function () {
        $rootScope.NeDB.find({ _id: 0 }, function (err, docs) {
            console.log(docs);
        });
    };

    $scope.chooseArmaPath = function () {
        var options = {
            filters: [{
                name: 'Arma3.exe',
                extensions: ['exe']
            }],
            title: "Bitte wähle deine Arma3.exe aus",
            properties: ['openFile']
        };
        path = String(dialog.showOpenDialog(options));
        if (path !== "undefined" && path.indexOf('\\arma3.exe') > -1) {
            console.log($rootScope.ArmaPath = path.replace('arma3.exe', ''));
        } else {
            $rootScope.ArmaPath = '';
        }
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
