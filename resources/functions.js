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
