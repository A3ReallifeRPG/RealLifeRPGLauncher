
/*
    Query Panel if launcher Notification should be shown
*/
function getLauncherNotification(callBackFnc) {
    var searchUrl = infoServerURL + launcher_Notification;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", searchUrl, true);
    xhr.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var jsObj = JSON.parse(this.responseText);

            callBackFnc(jsObj,true);
        }else if (this.readyState == 4 && !(this.status == 200)){
            callBackFnc(this.status,true);
        }
    }
    xhr.send();
}

/*
    Query Panel for Server Information
*/
function getServerInfo() {
    var searchUrl = infoServerURL + server_ListPath;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", searchUrl, true);
    xhr.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var jsObj = JSON.parse(this.responseText);

            for (var i = 0; i < jsObj.length; i++) {
                document.write(jsObj[i].Id + ' - ' + jsObj[i].Servername + ' - ' + jsObj[i].IpAddress + '<br/>')
            };

        }
        if (this.readyState == 4 && this.status == 404) {
            document.write('Error 404');
        }
    }
    xhr.send();
}

/*
    Query Panel for Mod Information
*/
function getModInfo() {
    var searchUrl = infoServerURL + mod_ModList;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", searchUrl, true);
    xhr.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var jsObj = JSON.parse(this.responseText);

            for (var i = 0; i < jsObj.length; i++) {
                document.write(jsObj[i].Id + ' - ' + jsObj[i].Name + ' - ' + jsObj[i].DownloadUrl + '<br/>')
            };
        }
        if (this.readyState == 4 && this.status == 404) {
            document.write('Error 404');
        }
    }
    xhr.send();
}
