function checkInstalledJava(json){
    if(!config.directory) return false;
    if(!fs.existsSync(config.directory+"/mclauncherData")) return false;
    let type = "jre-legacy";
    if(json.javaVersion) type = json.javaVersion.component;
    return fs.existsSync(config.directory+"/mclauncherData/java/"+type);
}
function downloadJava(json, percentage){
    return new Promise(async(res, rej) => {
        percentage.show();
        let type = "jre-legacy";
        if(json.javaVersion) type = json.javaVersion.component;
        let error = null;
        let javaVersions = await getJson(javaDownloadUrl).catch(e => error = e);
        if(error) return rej(error);
        let manifestUrl;
        try {
            manifestUrl = javaVersions["windows-" + getArch()][type][0].manifest.url;
        }catch(e){
            error = e;
        }
        if(error) return rej(error);
        let manifest = await getJson(manifestUrl).catch(e => error = e);
        if(error) return rej(error);
        let filesToDownload = Object.keys(manifest.files);
        let awaits = [];
        filesToDownload.forEach(name => {
            let fileInfo = manifest.files[name];
            if(fileInfo.type == "directory"){
                makeDirRecursive(config.directory+"/mclauncherData/java/"+type+"/"+name);
            }else{
                let directory = name.split("/").slice(0, name.split("/").length-1).join("/");
                makeDirRecursive(config.directory+"/mclauncherData/java/"+type+"/"+directory);
                let url = fileInfo.downloads.raw.url;
                awaits.push([url, config.directory+"/mclauncherData/java/"+type+"/"+name]);
            }
        });
        percentage.files = awaits.length;
        let newAwaits = cut(awaits, 10);
        let err = false;
        for await(e of newAwaits){
            await awaitMore(e).catch(e2 => err = e2);
            if(err) break;
            percentage.fileDownloaded(e.length);
        }
        if(err) return rej(err);
        res();
    })

}

//Windows only
function getArch(){
    if(require("os").arch() == "x64") return "x64";
    else return "x86";
}