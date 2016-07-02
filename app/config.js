/*
    Main config file for all web request URL's

*/

var infoServerURL = "http://panel.realliferpg.de/";

var server_ListPath = "Server/ServerList";
var server_PlayerListPath = "/Server/PlayerList/"; // url/<server id>

var mod_ModList = "/ArmaMod/GetMods";
var mod_FileList = "VersionUpdate/CurrentFileList/"; // url/<mod id>
var mod_Changelog = "/News/GetNews/"; // url/<mod id>

var launcher_Notification = "/LauncherSettings/GetSettings";

var task_force_installer = "https://realliferpg.de/TFARReallifeRPG.ts3_plugin";

var filesToExtract = ['ic_description_white_36dp_2x.png','ic_done_all_white_36dp_2x.png','ic_done_white_36dp_2x.png','ic_error_outline_white_36dp_2x.png','ic_file_download_white_36dp_2x.png','ic_clear_white_36dp_2x.png'];

var task_force_installer_size = 9299813;
debug_mode = 0;

var tfarhpp = "tf_no_auto_long_range_radio = 0;\nTF_give_personal_radio_to_regular_soldier = 0;\nTF_give_microdagr_to_soldier = 1;\ntf_same_sw_frequencies_for_side = 0;\ntf_same_lr_frequencies_for_side = 0;\ntf_same_dd_frequencies_for_side = 0;\ntf_default_radioVolume = 7;\n";
