function downloadVersionJson(link){
    return new Promise((res, rej) => {
        request(link, {json: true}).then(result => {
            let id = result.id;
            makeDirRecursive(config.directory+"/versions/"+id);
            fs.writeFile(config.directory+"/versions/"+id+"/"+id+".json", JSON.stringify(result), (err) => {
                if(err) console.log(err);
                res(result);
            })
        }).catch(e => rej(e));
    });
}
function downloadFile(link, path, cancel){
        return new Promise((res, rej) => {
            let e3 = null;
            var file;
            try{
                file = fs.createWriteStream(path);
            }catch(e){
                e3 = e;
            }
            if(e3) return rej(e3);
            https.get(link, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    res();
                })
            }).on('error', function(err) {
                fs.unlink(path, (err) => {

                });
                rej(err);
            });;
        });
}

function downloadLibraries(json, percentage){
    return new Promise(async (res, rej) => {
        let awaits = [];
        let e2 = false;
        json.libraries.forEach(e => {
            if(e2) return;
            let library = e.downloads.artifact;
            if(!library) return;
            if(!getAllows(e.rules)) return;
            if(!library.path) library.path = library.url.replace(librariesMinecraftUrl, "");
            let path = library.path;
            let nPath = "";
            path.split("/").slice(0, path.split("/").length-1).forEach(a => {
                makeDirRecursive(config.directory+"/libraries/"+nPath+"/"+a);
                nPath += a+"/";
            })
            if(fs.existsSync(config.directory+"/libraries/"+library.path)){
                try{
                    fs.rmSync(config.directory+"/libraries/"+library.path)
                }catch(e){
                    e2 = e;
                }
            }
                if(e2) return;
                awaits.push([library.url, config.directory+"/libraries/"+library.path]);
        });
        if(e2) return rej(e2);
        if(!awaits[0]) res();
        let error = false;
        for await(e of awaits){
            await downloadFile(e[0], e[1]).catch(e => error = e);
            if(error) break;
            if(percentage) percentage.fileDownloaded();
        }
        if(error) return rej(error);
        res();
    });
}

function downloadNatives(json, path, percentage){
    let e2 = false;
    try{
        fs.rmSync(path, {recursive: true});
    }catch(e){
        e2 = e;
    }
    if(e2) return Promise.reject(e2);
    let libraries = [];
    json.libraries.forEach(e => {
        let natives = e.downloads.classifiers;
        if (!natives) return;
        if (!natives["natives-windows"]) return;
        natives = natives["natives-windows"];
        if(!getAllows(e.rules)) return;
        if(!natives.path){
            e.downloads.classifiers["natives-windows"].path = natives.url.replace(librariesMinecraftUrl, "");
        }
        libraries.push(e);
    });
    return new Promise(async(res, rej) => {
        await new Promise(async(res, rej) => {
            let awaits = [];
            libraries.forEach(e => {
                let natives = e.downloads.classifiers["natives-windows"];
                let name = natives.path.split("/").pop();
                let nPath = natives.path.split("/").slice(0, natives.path.split("/").length - 1).join("/");
                    makeDirRecursive(config.directory+"/libraries/"+nPath);
                    makeDirRecursive(config.directory+"/versions/"+json.id+"/natives");
                    awaits.push([natives.url, config.directory+"/libraries/"+natives.path]);
            })
            let error = false;
            for await(e of awaits){
                await downloadFile(e[0], e[1]).catch(e => error = e);
                if(error) break;
                if(percentage) percentage.fileDownloaded();
            }
            if(error) return rej(error);
            res();
        });
        let awaits = [];
        libraries.forEach(e => {
            let natives = e.downloads.classifiers["natives-windows"];
            let name = natives.path.split("/").pop();
            let extractMetaInf = true;
            if(e.extract && e.extract.exclude && e.extract.exclude == "META-INF/") extractMetaInf = false;
            awaits.push(extractTo(config.directory+"/libraries/"+natives.path, path, extractMetaInf));
        });
        Promise.all(awaits).then(() => res()).catch((e) => rej(e));
    });
}

function extractTo(path, newPath, extractMetaInf){
    return new Promise((res, rej) => {
        yauzl.open(path, (err, zipfile) => {
           if(err) return rej(err);
           //entry
           zipfile.on("entry", (entry) => {
               if(!entry.fileName.endsWith("/")){
                   if(entry.fileName.startsWith("META-INF/")  && !extractMetaInf) return;
                   let path = entry.fileName.split("/").slice(0, entry.fileName.split("/").length-1);
                   if(path.length > 1){
                       let nPath = "";
                       path.forEach(p => {
                           nPath += p+"/";
                           makeDirRecursive(newPath+"/"+nPath);
                       })
                   }
                    //Saving file
                   let fileStream = fs.createWriteStream(newPath+"/"+entry.fileName);
                   zipfile.openReadStream(entry, (err, readStream) => {
                       if(err) return rej(err);
                       readStream.on("end", () => {
                           fileStream.close();
                       });
                       readStream.pipe(fileStream);
                   })
               }else{
                   if(entry.fileName.startsWith("META-INF") && !extractMetaInf) return;
                   let path = entry.fileName.split("/");
                   if(path.length > 1){
                       let nPath = "";
                       path.forEach(p => {
                           nPath += p+"/";
                           makeDirRecursive(newPath+"/"+nPath);
                       })
                   }
               }

           //entry
           });
            zipfile.once("close", () => res());
        //zipfile
        });
    });
}

function downloadClient(json, path){
    let client = json.downloads.client.url;
    let e2 = false;
    if(fs.existsSync(path)){
        try{
            fs.rmSync(path, {recursive: true});
        }catch(e){
            e2 = e;
        }
    }
    if(e2) return Promise.reject(e2);
    return downloadFile(client, path);
}

function downloadAssets(json, percentage){
    return new Promise(async(res, rej) => {
        let assetIndexLink = json.assetIndex.url;
        let id = json.assetIndex.id;
        let error = undefined;
        makeDirRecursive(config.directory+"/assets/indexes");
        await downloadFile(assetIndexLink, config.directory+"/assets/indexes/"+id+".json").catch(e => error = e);
        if(error) return rej(error);
        // Download assets
        let indexFile = null;
        try{
            indexFile = require(config.directory+"/assets/indexes/"+id+".json");
        }catch(e){}
        if(!indexFile) return rej(new Error("assetIndex file not found"));
        let filesToDownload = Object.keys(indexFile.objects);
        if(percentage) percentage.setAssets(filesToDownload.length);
        let awaits = [];
        filesToDownload.forEach(key => {
            let e = indexFile.objects[key];
            let path = e.hash.slice(0, 2)+"/"+e.hash;
            let eDir = key.split("/").slice(0, key.split("/").length-1).join("/");
            if(indexFile.virtual) makeDirRecursive(config.directory+"/assets/virtual/legacy/"+eDir);
            else if(indexFile.map_to_resources) makeDirRecursive(config.directory+"/resources/"+eDir);
            else makeDirRecursive(config.directory+"/assets/objects/"+e.hash.slice(0, 2));
            let url = assetsUrl+path;
            if(indexFile.virtual) awaits.push([url, config.directory+"/assets/virtual/legacy/"+key]);
            else if(indexFile.map_to_resources) awaits.push([url, config.directory+"/resources/"+key]);
            else awaits.push([url, config.directory+"/assets/objects/"+path]);
        });
        let newAwaits = cut(awaits, 10);
        let err = false;
        for await(e of newAwaits){
            await awaitMore(e).catch(e2 => err = e2);
            if(err) break;
            if(percentage) percentage.assetDownloaded(e.length);
        }
        if(err) return rej(err);
        res();
    });
}
function cut(toCut, size = 3){
    let length = toCut.length;
    let cutted = [];
    for(let i = 0; i < length; i+=size){
        cutted.push(toCut.slice(i, i+size));
    }
    return cutted;
}
function awaitMore(awaits){
    return new Promise((res, rej) => {
       let newAwaits = [];
       awaits.forEach(e => newAwaits.push(downloadFile(e[0], e[1])));
        Promise.all(newAwaits).then(res).catch(rej)
    });
}
function getFileCount(json){
    let result = 0;
    json.libraries.forEach(e => {
        if(!getAllows(e.rules)) return;
        result++;
    })
    json.libraries.forEach(e => {
        let natives = e.downloads.classifiers;
        if (!natives) return;
        if (!natives["natives-windows"]) return;
        natives = natives["natives-windows"];
        if (!getAllows(e.rules)) return;
        result++;
    });
    return result;

}

function downloadVersion(link, percentage){
    return new Promise(async (res, rej) => {
        let error = false;
        let json = await downloadVersionJson(link).catch(e => error = e);
        if(error) return errorFun(rej, error, percentage, 0)
        if(!json) return errorFun(rej, error, percentage, 0);
        if(percentage) percentage.setFiles(getFileCount(json));
        if(percentage) percentage.downloadedJson();
        await downloadClient(json, config.directory+"/versions/"+json.id+"/"+json.id+".jar").catch(e => error = e);
        if(error) return errorFun(rej, error, percentage, 1)
        if(percentage) percentage.downloadedClient();
        await downloadLibraries(json, percentage).catch(e => error = e);
        if(error) return errorFun(rej, error, percentage, 2);
        makeDirRecursive(config.directory+"/versions/"+json.id+"/natives");
        await downloadNatives(json, config.directory+"/versions/"+json.id+"/natives", percentage).catch(e => error = e);
        if(error) return errorFun(rej, error, percentage, 2)
        await downloadAssets(json, percentage).catch(e => error = e);
        if(error) return errorFun(rej, error, percentage, 4)
        res();
    });
}
let errors = ["получения версии", "скачивания клиента", "скачивания библиотек", "скачивания ресурсов"];
function errorFun(rej, error, percentage, num){
    showError("Произошла ошибка во время "+errors[num]);
    rej(error);
    if(percentage) percentage.setError();
}
function getVersions(){
    return new Promise((res, rej) => {
        request("https://launchermeta.mojang.com/mc/game/version_manifest_v2.json", {json: true}).then(result => {
            res(result);
        }).catch(e => {
            res(undefined)
        });
    });
}

function getAllows(json){
    if(!json) return true;
    if(!json[0]) return true;
    let allowed = [];
    let disallowed = [];
    json.forEach(e => {
       if(e.action == "allow" && !e.os) allowed = true;
       else if(e.action == "allow" && e.os.name == "windows"){
           if(allowed === true) return;
           allowed = allowed.filter(e => e != "windows");
           allowed.push("windows");
       }else if(e.action == "allow" && e.os.name == "osx"){
           if(allowed === true) return;
           allowed = allowed.filter(e => e != "osx");
           allowed.push("osx");
       }else if(e.action == "allow" && e.os.name == "linux"){
           if(allowed === true) return;
           allowed = allowed.filter(e => e != "linux");
           allowed.push("linux");
       }else if(e.action == "disallow" && !e.os) disallowed = true;
       else if(e.action == "disallow" && e.os.name == "windows"){
           if(disallowed === true) return;
           disallowed = disallowed.filter(e => e != "windows");
           disallowed.push("windows");
       }else if(e.action == "disallow" && e.os.name == "osx"){
           if(disallowed === true) return;
           disallowed = disallowed.filter(e => e != "osx");
           disallowed.push("osx");
       }else if(e.action == "disallow" && e.os.name == "linux"){
           if(disallowed === true) return;
           disallowed = disallowed.filter(e => e != "linux");
           disallowed.push("linux");
       }
    });
    let result = undefined;
    if(allowed !== true && allowed.includes("windows")) result = true;
    else if(allowed === true && !disallowed.includes("windows")) result = true;
    else if(disallowed !== true && disallowed.includes("windows")) result = false;
    else if(disallowed === true && !allowed.includes("windows")) result = false;
    return result;
}
async function downloadVersionOnclick(id, percentage){
    return updateVersion(id, percentage);
}
async function updateVersion(id, percentage){
    if(updating.includes(id)){
        return showError("Версия уже скачивается или обновляется");
    }
    percentage.setStart();
    let versions = await getVersions();
    if(!versions){
        percentage.setError();
        return showError("Произошла ошибка во время получения версий");
    }
    if(!versions.versions){
        percentage.setError();
        return showError("Прозиошла ошибка во время получения версий");
    }
    let version = versions.versions.filter(e => e.id == id);
    if(!version[0]) {
        percentage.setError();
        return showError("Прозиошла ошибка во время получения версий");
    }
    version = version[0];
    updating.push(id);
    downloadVersion(version.url, percentage).then(e => {
        percentage.setSuccess();
        showInstalledVersions()
        updating = updating.filter(e => e != id);
    }).catch(e => {
       percentage.setError();
       updating = updating.filter(e => e != id);
    });
}

function deleteVersion(id){
    if(updating.includes(id)){
        return showError("Нельзя удалить версию, которая скачивается или обновляется");
    }
    makeDirRecursive(config.directory+"/versions");
    let versions = fs.readdirSync(config.directory+"/versions", {withFileTypes: true});
    if(!versions[0]) return showInstalledVersions();
    versions = versions.filter(e => e.isDirectory());
    if(!versions[0]) return showInstalledVersions();
    let version = versions.filter(e => e.name == id);
    if(!version[0]) return showInstalledVersions();
    version = version[0];
    try{
        fs.rmSync(config.directory+"/versions/"+id, {recursive: true});
    }catch(e){}
    showInstalledVersions();
}