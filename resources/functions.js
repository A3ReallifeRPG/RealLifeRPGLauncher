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