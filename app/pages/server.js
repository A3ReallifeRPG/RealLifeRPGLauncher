getServerInfo(getServerCallback);

function getServerCallback(jsObj) {
    for (var i = 0; i < jsObj.length; i++) {

    };
}

function loadHighCharts() {
    var Highcharts = require('highcharts');
    $(function() {
        $('#piechart1').highcharts({
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
                    y: 44
                }, {
                    name: 'Cops',
                    y: 14,
                }, {
                    name: 'Medics',
                    y: 12
                }, {
                    name: 'ADAC',
                    y: 16
                }]
            }],
            colors: ['#8B008B','#0000CD','#228B22','#C00100']
        });
    });
}

function tab_click(tab){
        loadHighCharts();
        return true;
    }
