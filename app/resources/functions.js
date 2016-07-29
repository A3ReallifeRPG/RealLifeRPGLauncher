
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
function getServerInfo(callBackFnc) {
    var searchUrl = infoServerURL + server_ListPath;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", searchUrl, true);
    xhr.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var jsObj = JSON.parse(this.responseText);
            callBackFnc(jsObj);
        }
        if (this.readyState == 4 && this.status == 404) {
            callBackFnc(this.status,false);
        }
    }
    xhr.send();
}

/*
    Query Panel for Connnected Clients
*/
function getServerClients(serverid,callBackFnc) {
    var searchUrl = infoServerURL + server_PlayerListPath + serverid;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", searchUrl, true);
    xhr.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var jsObj = JSON.parse(this.responseText);

            callBackFnc(jsObj,this.data);
        }
        if (this.readyState == 4 && this.status == 404) {
            document.write('Error 404');
        }
    }
    xhr.data = serverid;
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
    try{
        xhr.send();
    }catch (err) {

    }

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
            callBackFnc(jsObj,false);
        }else if (this.readyState == 4 && this.status == 410){
            callBackFnc(jsObj,false);
        }
    }

    xhr.send();

}
