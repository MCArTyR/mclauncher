function getRunCommand(){
    let id = config.selectedVersion;
    let json;
    let error = null;
    try{
        json = require(config.directory+"/versions/"+id+"/"+id+".json");
    }catch(e){
        error = e;
    }
    if(error) return showError("Произошла ошибка во время получения информации о версии");
    if(!checkInstalledJava(json)){
        return [2, json];
    }
    if(!!json.minecraftArguments) return getOldRunCommand(json);
    let jarPath = config.directory+"/versions/"+id+"/"+id+".jar";
    let nativesPath = config.directory+"/versions/"+id+"/natives";
    let jvm = getJVMArguments(json, jarPath, nativesPath);
    let game = getGameArguments(json);
    let result = [getJavawLocation(json), jvm, game];
    return result.join(" ");
}
function getOldRunCommand(json){
    let id = json.id;
    let jarPath = config.directory+"/versions/"+id+"/"+id+".jar";
    let nativesPath = config.directory+"/versions/"+id+"/natives";
    let jvm = getOldJVMArguments(json, jarPath, nativesPath);
    let game = getGameArguments(json);
    let result = [getJavawLocation(json), jvm, game];
    return result.join(" ");
}
//Windows only
function getJavawLocation(json){
    let type = "jre-legacy";
    if(json.javaVersion) type = json.javaVersion.component;
    return config.directory+"/mclauncherData/java/"+type+"/bin/javaw.exe";
}
function getGameArguments(json){
    let a;
    if(!!json.minecraftArguments) a = [json.minecraftArguments];
    else a = json.arguments.game;
    let user = profiles.selectedProfile;
    if(!user) return showError("Выберите аккаунт");
    user = profiles.profiles.filter(e => e.uuid == user);
    if(!user[0]) return showError("Аккаунт не найден");
    user = user[0];
    let uuid = user.uuid;
    let accessToken = user.accessToken;
    if(user.type === 2) accessToken = uuid;
    let assetsDir = config.directory+"/assets";
    if(json.assets == "legacy") assetsDir = config.directory+"/assets/virtual/legacy";
    if(json.assets == "pre-1.6") assetsDir = config.directory+"/resources";
        let result = [];
    a.forEach(e => {
        if(typeof e !== "string") return;
       result.push(e.replace("${auth_player_name}", user.username)
           .replace("${version_name}", json.id)
           .replace("${game_directory}", config.directory)
           .replace("${assets_root}", assetsDir)
           .replace("${game_assets}", assetsDir)
           .replace("${assets_index_name}", json.assets)
           .replace("${auth_uuid}", uuid)
           .replace("${auth_access_token}", accessToken)
           .replace("${user_type}", accountTypes[user.type])
           .replace("${version_type}", json.type)
            //legacy
           .replace("${auth_session}", "token:"+accessToken+":"+uuid)
       )
    });
    return result.join(" ");
}
//Work only for windows
function getOldJVMArguments(json, jarPath, nativesPath){
    let result = ["-Xmx"+config.java.ram+"M",
    "-XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump",
    "-Djava.library.path="+nativesPath,
    "-Dminecraft.launcher.brand="+launcherName,
    "-Dminecraft.launcher.version="+launcherVersion,
    "-Dminecraft.client.jar="+jarPath];
    if(require("os").release().match("^10\\.")){
        result.push('"-Dos.name=Windows 10"')
        result.push("-Dos.version=10.0")
    }
    result.push("-cp");
    result.push(getLibrariesString(json)+";"+jarPath+" "+json.mainClass);
    return result.join(" ");
}
function getJVMArguments(json, jarPath, nativesPath){
    let jvmArguments = parseJVMArguments(json);
    let librariesString = getLibrariesString(json);
    let result = "";
    jvmArguments.forEach(e => {
       result += e.replace("${natives_directory}", nativesPath)
           .replace("${launcher_name}", launcherName)
           .replace("${launcher_version}", launcherVersion)
           .replace("${classpath}", librariesString+";"+jarPath+" "+json.mainClass);
       result += " ";
    });
    return result.trim().replace("-Dos.name=Windows 10", '"-Dos.name=Windows 10"');
}
function getLibrariesString(json){
    let libraries = json.libraries;
    libraries = libraries.filter(e => getAllows(e.rules));
    libraries = libraries.filter(library => !!library.downloads.artifact);
    libraries = libraries.map(library => library.downloads.artifact.url.replace(librariesMinecraftUrl, ""));
    libraries = libraries.map(library => config.directory+"/libraries/"+library);
    return libraries.join(";");
}
function parseJVMArguments(json){
    let rules = json.arguments.jvm;
    let result = ["-Xmx"+config.java.ram+"M"];
    rules.forEach(arg => {
        if(typeof arg == "string") return result.push(arg);
        if(!getAllows(arg.rules)) return;
        if(arg.rules){
            if(arg.rules.os && arg.rules.os.version && !require("os").release().match(arg.rules.os.version)) return;
            if(arg.rules.os && arg.rules.os.arch && !require("os").arch() == arg.rules.os.arch) return;
        }
        if(!Array.isArray(arg.value)) return result.push(arg.value);
        result = [...result, ...arg.value];
    });
    return result;
}