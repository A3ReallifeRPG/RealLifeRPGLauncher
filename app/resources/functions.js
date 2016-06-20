
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
            callBackFnc(this.status,false);
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
    Query Panel for Connnected Clients
*/
function getServerClients(serverid) {
    var searchUrl = infoServerURL + server_PlayerListPath + serverid;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", searchUrl, true);
    xhr.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var jsObj = JSON.parse(this.responseText);

            var arr = [];

            for(var x in jsObj){
              arr.push("title: " + jsObj[x]);
            };
            return arr;
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
function getModInfo(callBackFnc) {
    var searchUrl = infoServerURL + mod_ModList;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", searchUrl, true);
    xhr.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var jsObj = JSON.parse(this.responseText);
            callBackFnc(jsObj,true);
        }
        if (this.readyState == 4 && this.status == 404) {
            callBackFnc(this.status,false);
        }
    }
    xhr.send();
}

/*
    Query Panel for Mod Information
*/
function getModHashList(modId,callBackFnc) {
    var searchUrl = infoServerURL + mod_FileList + modId;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", searchUrl, true);
    xhr.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var jsObj = JSON.parse(this.responseText);
            callBackFnc(jsObj);
        }
        if (this.readyState == 4 && this.status == 404) {
            document.write('Error 404 in function: getModHashList');
        }
    }
    xhr.send();
}
