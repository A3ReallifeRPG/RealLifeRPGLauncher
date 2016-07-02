getServerInfo(getServerCallback);

function getServerCallback(jsObj) {
    if (jsObj.length > 0) {
        defaultServer = jsObj[0].Id;
        for (var i = 0; i < jsObj.length; i++) {
            insertServerTab(jsObj[i], i);
        };
        $(function() {
            $("#tabcontroller").tabcontrol();
        });
        $('#tabcontroller').css({
            'visibility': 'visible'
        });
        $('#serverpreloader').remove();
    }
}

/*
<div class="frame" id="mod1">
    <div class="row">
        <div class="col-md-4" style="height:100%">
            <div id="piechart1" style="min-width: 20%; height: 200px;"></div>
            Aktuelle Spieler: 1337<br>
            IP: 46.20.46.31:2302<br>
            <button class="button loading-pulse lighten success" style="margin-top:20px"> Server beitreten</button>
        </div>
        <div class="col-md-8">
            <div id="table-wrapper">
                <div id="table-scroll">
                    <table class="table">
                        <thead>
                            <tr>
                                <th><span class="text">Name</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Vabene</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<li><a href="#mod1">Server 1</a></li>
*/

function insertServerTab(serverObj, index) {
    if (serverObj.Slots != 0) {
        //build server info
        var wrapper = document.createElement('div');
        wrapper.setAttribute('class', 'frame');
        wrapper.setAttribute('id', ('server_' + serverObj.Id));

        var row = document.createElement('div');
        row.setAttribute('class', 'row');

        var col4 = document.createElement('div');
        col4.setAttribute('class', 'col-md-4');
        col4.setAttribute('style', 'height:100%');

        var charDiv = document.createElement('div');
        charDiv.setAttribute('id', 'char_server_' + serverObj.Id);
        charDiv.setAttribute('style', 'min-width: 20%; height: 200px;');

        var br = document.createElement("br");
        var br2 = document.createElement("br");
        var txtPlayers = document.createTextNode("Aktuelle Spieler: " + serverObj.Players + "/" + serverObj.Slots);
        var txtIp = document.createTextNode("IP: " + serverObj.IpAddress + " Port: " + serverObj.Port);

        var btnJoin = document.createElement('button');
        btnJoin.setAttribute('class', 'button loading-pulse lighten success');
        btnJoin.setAttribute('style', 'margin-top:20px');
        btnJoin.setAttribute('id', ('btn_start_' + serverObj.Id));
        btnJoin.setAttribute('onclick', 'joinServer("' + serverObj.IpAddress + '","' + serverObj.Port + '","' + serverObj.ServerPassword + '","' + serverObj.StartParameters + '")');
        var txtBtnJoin = document.createTextNode(" Server beitreten");
        btnJoin.appendChild(txtBtnJoin);

        col4.appendChild(charDiv);
        col4.appendChild(txtPlayers);
        col4.appendChild(br);
        col4.appendChild(txtIp);
        col4.appendChild(br2);
        col4.appendChild(btnJoin);
        row.appendChild(col4);

        //build player list
        var col8 = document.createElement('div');
        col8.setAttribute('class', 'col-md-8');

        var tbWrapper = document.createElement('div');
        tbWrapper.setAttribute('id', 'table-wrapper');

        var tbScroll = document.createElement('div');
        tbScroll.setAttribute('id', 'table-scroll');

        var tbl = document.createElement('table');
        tbl.setAttribute('class', 'table');


        var tblHead = document.createElement('thead');
        var tblHeadRow = document.createElement('tr');
        var tblHeadRowH = document.createElement('th');
        var tblHeadRowHSpan = document.createElement('span');
        var txtTblHead = document.createTextNode("Name");

        tblHeadRowHSpan.appendChild(txtTblHead);
        tblHeadRowH.appendChild(tblHeadRowHSpan);;
        tblHeadRow.appendChild(tblHeadRowH);
        tblHead.appendChild(tblHeadRow);

        var tblBody = document.createElement('tbody');
        tblBody.setAttribute('id', ('tb_list_' + serverObj.Id));

        tbl.appendChild(tblHead);
        tbl.appendChild(tblBody);

        tbScroll.appendChild(tbl);
        tbWrapper.appendChild(tbScroll);
        col8.appendChild(tbWrapper);

        row.appendChild(col8);

        wrapper.appendChild(row);
        //attach to host
        document.getElementById('server_tabs').appendChild(wrapper);
        var txtTab = document.createTextNode("Server " + (index + 1));
        var li = document.createElement('li');
        var liA = document.createElement('a');
        liA.setAttribute('href', ('#server_' + serverObj.Id));
        liA.appendChild(txtTab);
        li.appendChild(liA);

        document.getElementById('server_tabHost').appendChild(li);

        loadHighCharts(("char_server_" + serverObj.Id), serverObj.Civilians, serverObj.Cops, serverObj.Medics, serverObj.Adac);

        var args = {
            message: 'get-server-player',
            serverId: defaultServer
        };
        ipcRenderer.send('message-to-webwin', args);
    };
}
// ('joinServer(' + serverObj.IpAddress + ','+serverObj.Port+','+serverObj.ServerPassword+','+serverObj.StartParameters+')'));
function joinServer(serverIp, serverPort, serverPw, serverParams) {
    //var cp = require("child_process");
    //cp.exec('start "D:\\SteamLibrary\\SteamApps\\common\\Arma 3\\arma3.exe" -nosplash -skipIntro -cpucount=4 -maxmem=12288 -connect=server -port=port "-mod=" -nolauncher -useBE');
    shell.openItem('D:\\SteamLibrary\\SteamApps\\common\\Arma 3\\arma3.exe -nosplash -skipIntro -connect=' + serverIp + ' -port=' + serverPort + ' -mod="' + serverParams + '" -password=' + serverPw + ' -nolauncher -useBE');
}

function setPlayerList(serverId, playerList) {
    var tBody = document.getElementById('tb_list_' + serverId);
    for (i = 0; i < playerList.length; i++) {

        var tbRow = document.createElement('tr');
        var tbCol = document.createElement('td');
        var txtCol = document.createTextNode(playerList[i]);

        tbCol.appendChild(txtCol);
        tbRow.appendChild(tbCol);
        tBody.appendChild(tbRow);
    }
}

function loadHighCharts(chart, civ, cop, med, adac) {
    var Highcharts = require('highcharts');
    $(function() {
        $('#' + chart).highcharts({
            chart: {
                plotBackgroundColor: '#999999',
                plotBorderWidth: null,
                plotShadow: false,
                type: 'pie',
                backgroundColor: '#999999'
            },
            title: {
                text: false
            },
            yAxis: {
                title: {
                    text: false
                }
            },
            tooltip: {
                pointFormat: '{series.name}: <b>{point.y}</b>'
            },
            credits: {
                enabled: false
            },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    borderWidth: 0,
                    dataLabels: {
                        enabled: false
                    }
                },
                borderWidth: 0
            },
            series: [{
                name: 'Spieler',
                colorByPoint: true,
                data: [{
                    name: 'Zivilisten',
                    y: civ
                }, {
                    name: 'Cops',
                    y: cop,
                }, {
                    name: 'Medics',
                    y: med
                }, {
                    name: 'ADAC',
                    y: adac
                }]
            }],
            colors: ['#8B008B', '#0000CD', '#228B22', '#C00100']
        });
    });
}

function tab_click(tab) {

    //loadHighCharts("char_server_31",58, 8, 5, 4);
    return true;
}
