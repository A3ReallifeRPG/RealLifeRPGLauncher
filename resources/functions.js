function spawnNotification(message) {
    new Notification('ReallifeRPG', {
        body: message
    });
}
/*
    Check if value in array
*/
function inArray(val, array){
    x = 0;
    for(x = 0; x < array.length; x++){
        if(array[x] == val){
            return true;
        }
    }
    return false;
}


function toGB(val) {
    return (val / 1000000000).toFixed(3);
}

function toMB(val) {
    return (val / 1000000).toFixed(3);
}

function cutName(name) {
    if(name.length > 30) {
        return name.substring(0,30) + "...";
    } else {
        return name;
    }
}

function walkFolder (dir) {
    var results = [];
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()) results = results.concat(walkFolder(file));
        else results.push(file)
    });
    return results
}