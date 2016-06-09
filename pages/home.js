getModInfo(showModInfo);

/*
<div class="carousel-item active" >
    <img src="https://upload.realliferpg.de/uploads/Keppo_5752b42b0be5b.png" alt="First slide" class="img-responsive center-block">
    <div class="carousel-caption">
        <h1>RealLifeRPG 5.0 Mod</h1>
        <p style="text-size:18"><b>Das ist die RLRPG Mod für die 5.0</b></p>
        <button class="btn btn-success">Downlaod</button>

      </div>
</div>

{
    "Id":18,
    "ModType":0,
    "Name":"RealLife RPG 5.0 ",
    "DownloadUrl":"http://213.202.212.13/download/",
    "IsActive":true,
    "Description":"RealLife RPG Community Arma 3 Server ",
    "ImageUrl":"http://fs5.directupload.net/images/160418/33uqn5it.png",
    "HasGameFiles":true
}

*/
function showModInfo(jsonData, success){

    if (success) {
        for (var i = 0; i < jsonData.length; i++) {
            var carItem = document.createElement('div');
            if(i == 0){
                carItem.setAttribute('class','carousel-item active');
            }else{
                carItem.setAttribute('class','carousel-item');
            }

            var img = document.createElement('img');
            img.setAttribute('src',jsonData[i].ImageUrl);
            img.setAttribute('alt',jsonData[i].Id);
            img.setAttribute('class','img-responsive center-block');

            var infoDiv = document.createElement('div');
            infoDiv.setAttribute('class','carousel-caption');

            var infoDivHeading = document.createElement('h1');
            var node = document.createTextNode(jsonData[i].Name);
            infoDivHeading.appendChild(node);

            var infoDivPar = document.createElement('p');
            infoDivPar.setAttribute('class',"style='text-size:18'");

            var infoDivBold = document.createElement('b');
            node = document.createTextNode(jsonData[i].Description);
            infoDivBold.appendChild(node)

            var infoDivButton = document.createElement('button');
            infoDivButton.setAttribute('id','btn_mod_' + jsonData[i].Id);
            infoDivButton.setAttribute('class','btn btn-success');
            infoDivButton.setAttribute('onClick','modClick(' + jsonData[i].Id + ')');
            node = document.createTextNode("Download");
            infoDivButton.appendChild(node)

            infoDivPar.appendChild(infoDivBold);
            infoDiv.appendChild(infoDivHeading);
            infoDiv.appendChild(infoDivPar);
            infoDiv.appendChild(infoDivButton);
            carItem.appendChild(img);
            carItem.appendChild(infoDiv);

            var container = document.getElementById("crs_modList");
            container.appendChild(carItem);
        };
        if(jsonData.length == 1){
            document.getElementById("car_left").style.visibility = 'hidden';
            document.getElementById("car_right").style.visibility = 'hidden';
        }
    } else {
        if(debug_mode >= 1){console.log('Error requesting Mod List: ' + jsonData);};
    }
}

function modClick(id){
    var args = {
        type: 1,
        message: "start-download",
        modId: id
    }
    ipcRenderer.send('message-to-download', args);
    
    let myNotification = new Notification('Title', {
        body: 'Lorem Ipsum Dolor Sit Amet'
    });
}
