const remote = require("@electron/remote");
const uuid = require("uuid").v4;
const fs = require("fs");
const config = require("./assets/config.json");
const request = require("request-promise");
const https = require('https');
const yauzl = require("yauzl");
const childProcess = require("child_process");
const assetsUrl = "https://resources.download.minecraft.net/";
const librariesMinecraftUrl = "https://libraries.minecraft.net/";
const minecraftAuthenticationUrl = "https://authserver.mojang.com/";
const javaDownloadUrl = "https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json";
const launcherName = "java-minecraft-launcher";
const launcherVersion = "1.6.84-j";
const accountTypes = ["mojang", undefined, "legacy"];
const release1710 = "2014-05-14T17:29:23+00:00";
let gameProcess = null;
let profiles;
try{
    profiles = require(config.directory+"/MCLauncherProfiles.json");
}catch(e) {
    profiles = {selectedProfile: null, profiles: []};
    fs.writeFile(config.directory + "/MCLauncherProfiles.json", JSON.stringify(profiles), (err) => {
    });
}
const canvas = document.getElementById("skin");
const ctx = canvas.getContext("2d");
let selectedAccountType = 0;
let updating = [];
let ids = [];
let pages = ["main", "settings", "versions", "accounts", "add-account"];
let toggles = {1: false, 2: false}
let totalram = Math.round(require("os").totalmem() / 1024 / 1024);
let minram = 0;
if(totalram < 1024) minram = 512;
if(totalram <= 2048) minram = 1024;
else minram = 1024;
let ram = {min: minram, max: totalram};
let installedVersions = getInstalledVersions();
let editingAccount = null;
showVersions();
showAccounts();
updateSkin();
if(config && config.theme == "light"){
    document.body.classList.add("light-theme");
}
function changeTheme(){
    if(config.theme == "light"){
        config.theme = "dark";
        document.body.classList.remove("light-theme");
    }else{
        config.theme = "light";
        document.body.classList.add("light-theme");
    }
    saveSettings();
}
function openSettingsPage(){
    if(config.java.recommended){
        document.getElementById("java-save-button").innerText = "Выбрать";
    }else{
        document.getElementById("java-save-button").innerText = "Сброс";
    }
    openPage("settings");
}
function javaSaveButton(){
    if(config.java.recommended){
        let result = remote.dialog.showOpenDialogSync(remote.getCurrentWindow(), {
            properties: ['openDirectory']
        });
        if(!result) return;
        let path = result;
        if(!fs.existsSync(result+"/javaw.exe")) return showError("По указанному пути не найден javaw.exe");
        document.getElementById("java-input").value = result[0] || result;
        document.getElementById("java-save-button").innerText = "Сброс";
        config.java.recommended = false;
        config.java.path = result[0] || result;
    }else{
        document.getElementById("java-save-button").innerText = "Выбрать";
        document.getElementById("java-input").value = "Рекомендовано";
        config.java.recommended = true;
        config.java.path = "";
    }
}
function showError(text){
    let element = createErrorElement(text);
    document.getElementById("errors-container-second").appendChild(element);
    element.style.display = "block";
    setTimeout(() => {
        element.style.height = "90px";
        element.style.marginBottom = "15px";
    }, 400);
    setTimeout(() => {
        element.style.minHeight = "90px";
        element.style.opacity = "1";
    }, 400 * 2);
    setTimeout(() => hideError(element), 3000 + 400 * 2);
    return null;
}
function hideError(element){
    element.style.opacity = "0";
    setTimeout(() => {
        element.style.height = "0px";
        element.style.marginBottom = "0px";
        element.style.minHeight = "0px";
    }, 400);
    setTimeout(() => {
        element.remove();
    }, 400);
}
function saveVersions(){
    openPage("main");
}
function play(){
    if(gameProcess) return showError("Игра уже запущена");
    if(!config.selectedVersion) return showError("Выберите версию");
    if(!profiles.selectedProfile) return showError("Выберите аккаунт");
    let cmd = getRunCommand();
    if(typeof cmd != "string" && cmd[0] === 2){
        let percentage = new JavaProgressBar();
        document.getElementById("play-button").setAttribute("disabled", "true");
        downloadJava(cmd[1], percentage).catch(e => {
            showError("Произошла ошибка во время установки Java");
            document.getElementById("play-button").removeAttribute("disabled");
            percentage.hide();
        }).then(() => {
            document.getElementById("play-button").removeAttribute("disabled");
            percentage.hide();
        });
        return;
    }
    if(!cmd) return showError("Произошла ошибка во время запуска игры");
    gameProcess = childProcess.spawn(cmd, {shell: true});
    remote.getCurrentWindow().hide();
    gameProcess.once('close', (code) => {
        let errorText = "Произошёл вылет игры."
        if(!config.java.recommended) errorText += " Возможно ошибка в настройках Java?";
        if(code !== 0) showError(errorText);
        remote.getCurrentWindow().show();
        gameProcess = null;
    });
}
async function updateSkin(){
    let error = null;
    let user = profiles.selectedProfile;
    if(!user) drawSkin(0);
    let skin = await getJson("https://sessionserver.mojang.com/session/minecraft/profile/"+user).catch(e => error = e);
    if(error) return drawSkin(0);
    if(!skin) return drawSkin(0);
    let textures = skin.properties;
    if(!textures) return drawSkin(0);
    textures = skin.properties.filter(e => e.name == "textures");
    if(!textures[0]) return drawSkin(0);
    let decoded = Buffer.from(textures[0].value, "base64").toString();
    let json;
    try{
        json = JSON.parse(decoded);
    }catch(e){error = e}
    if(error) return drawSkin(0);
    if(!json.textures || !json.textures.SKIN) return drawSkin(0);
    drawSkin(json.textures.SKIN.url);
}
function drawSkin(skin){
    if(skin === 0) skin = "./assets/steve.png";
    let img = new Image();
    img.src = skin;
    img.onload = function(){
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 8, 8, 8, 8, 0, 0, 45, 45); // offsetX offsetY width height x y newWidth newHeight
    }
}
let types = ["mojang", "microsoft", "simple"];
function setAccountType(number){
    types.forEach(e => document.getElementById("radio-"+e).classList.remove("radio-active"));
    document.getElementById("radio-"+types[number]).classList.add("radio-active");
    selectedAccountType = number;
    if(number === 2){
        togglePasswordContainer(false);
        document.getElementById("email-title").innerText = "Ник";
    }else{
        togglePasswordContainer(true);
        document.getElementById("email-title").innerText = "E-mail";
    }
}
function saveAccounts(){
    openPage("main");
}
function addAccountPage(){
    editingAccount = null;
    document.getElementById("email-input").value = "";
    document.getElementById("password-input").value = "";
    document.getElementById("account-add-button").innerText = "Добавить";
    openPage("add-account");
}
function togglePasswordContainer(toggle){
    let toggleElement = document.getElementById("password-container");
    if(!toggle){
        toggleElement.style.opacity = "0";
        setTimeout(() => {
            toggleElement.style.maxHeight = "0px"
        }, 400);
    }else{
        toggleElement.style.maxHeight = "110px";
        setTimeout(() => {
            toggleElement.style.opacity = "1";
        }, 400);
    }
}
function showAccountsList(){
    let container = document.getElementById("accounts-container");
    container.innerHTML = "";
    profiles.profiles.forEach(profile => {
        container.appendChild(createDoubledAccount(profile.username, profile.uuid))
    })
}
function openAccountsPage(){
    showAccountsList();
    showAccounts();
    openPage("accounts");
}
function openVersionsPage(){
    changeVersionsPage(0);
    openPage('versions');
}
async function showDownloadVersions(){
    let versionsContainer = document.getElementById("versions-container");
    versionsContainer.innerHTML = "";
    let versions = await getVersions();
    if(!versions) return;
    if(!versions.versions) return;
    versions = versions.versions;
    let downloads = versions.filter(e => updating.includes(e.id));
    if(!config.versions.alpha) versions = versions.filter(e => e.type != "old_alpha");
    if(!config.versions.beta) versions = versions.filter(e => e.type != "old_beta");
    if(!config.versions.snapshots) versions = versions.filter(e => e.type != "snapshot");
    if(!config.versions.releasesBefore1710){
        versions = versions.filter(e => !(e.type == "release" && new Date(e.releaseTime) <= new Date(release1710)));
    }
    versions = versions.filter(e => {
        //Downloads
        if(downloads.filter(e2 => e2.id ==e.id)[0]) return false;
        //Installed
       let filtered = getInstalledVersions();
       if(!filtered) return true;
       filtered = filtered.filter(e2 => e2.id == e.id);
       if(filtered[0]) return false;
       return true;
    });
    downloads.forEach(version => {
        let name = parseName(version);
        let el = createOneIconVersion(name, version.id);
        versionsContainer.appendChild(el);
    });
    versions.forEach(version => {
        let name = parseName(version);
        let el = createOneIconVersion(name, version.id);
        versionsContainer.appendChild(el);
    });
}
function showInstalledVersions(){
    installedVersions = getInstalledVersions();
    let versionsContainer = document.getElementById("versions-container");
    versionsContainer.innerHTML = "";
    installedVersions.forEach(version => {
        let name = parseName(version);
        let el = createDoubledVersion(name, version.id);
        versionsContainer.appendChild(el);
    })
    showVersions();
}
function getPercentage(id){
    let filtered = ids.filter(e => e.id == id);
    if(filtered[0]) return filtered[0].percentage;
    return undefined;
}
function changeVersionsPage(num){
    if(num === 0){
        document.getElementById("versions-installed").classList.add("versions-active");
        document.getElementById("versions-download").classList.remove("versions-active");
        showInstalledVersions();
    }else if(num === 1){
        document.getElementById("versions-download").classList.add("versions-active");
        document.getElementById("versions-installed").classList.remove("versions-active");
        showDownloadVersions();
    }
}
function selectAccount(uuid){
    let account = profiles.profiles.filter(e => e.uuid == uuid);
    if(!account[0]) return;
    account = account[0];
    profiles.selectedProfile = uuid;
    updateSkin();
    saveProfiles();
    document.getElementById("account-name").innerText = account.username;
    toggleSelector(1, false);
}
function selectVersion(versionName){
    let version = installedVersions.filter(e => e.versionName == versionName);
    if(!version[0]) return;
    version = version[0];
    config.selectedVersion = version.versionName;
    saveSettings();
    document.getElementById("version-name").innerText = parseName(version);
    toggleSelector(2, false);
}

function parseName(version){
    let versionName = null;
    if(version.id.match(/[0-9]+\.[0-9]+((\.[0-9])?)+/g) && version.type == "release"){
        versionName = "Версия "+version.id;
    }
    if(version.type == "old_alpha") versionName = "Альфа "+version.id;
    if(version.type == "old_beta") versionName = "Бета "+version.id;
    if(version.type == "snapshot") versionName = "Снапшот "+version.id;
    if(versionName === null) versionName = version.id;
    return versionName;
}

function showVersions(){
    document.getElementById("ser").innerHTML = "";
    installedVersions.sort((a,b) => new Date(b.releaseTime) - new Date(a.releaseTime)).forEach(version => {
        let versionName = parseName(version);
       let option = document.createElement("div");
       option.classList.add("selector-option");
       let text = document.createElement("div");
       text.classList.add("selector-option-text");
       text.innerText = versionName;
       let border = document.createElement("div");
       border.classList.add("border");
       option.appendChild(text);
       option.appendChild(border);
       option.onclick = function(){selectVersion(version.versionName)};
       document.getElementById("ser").appendChild(option);
    });
    if(config.selectedVersion){
        let version = installedVersions.filter(e => e.versionName == config.selectedVersion);
        if(!version[0]) return document.getElementById("version-name").innerText = "Выберите версию";
        version = version[0];
        let versionName = parseName(version);
        document.getElementById("version-name").innerText = versionName;
    }else document.getElementById("version-name").innerText = "Выберите версию";
}
function showAccounts(){
    document.getElementById("sel").innerHTML = "";
    profiles.profiles.forEach(profile => {
        let option = document.createElement("div");
        option.classList.add("selector-option");
        let text = document.createElement("div");
        text.classList.add("selector-option-text");
        text.innerText = profile.username;
        let border = document.createElement("div");
        border.classList.add("border");
        option.appendChild(text);
        option.appendChild(border);
        option.onclick = function(){selectAccount(profile.uuid)};
        document.getElementById("sel").appendChild(option);
    });
    if(profiles.selectedProfile){
        let account = profiles.profiles.filter(e => e.uuid == profiles.selectedProfile);
        if(!account[0]) return document.getElementById("version-name").innerText = "Выберите аккаунт";
        account = account[0];
        document.getElementById("account-name").innerText = account.username;
    }else document.getElementById("account-name").innerText = "Выберите аккаунт";
}
function getInstalledVersions(){
    if(!config.directory) return;
    let preVer = fs.readdirSync(config.directory+"/versions", {withFileTypes: true});
    preVer = preVer.filter(e => e.isDirectory());
    let realVer = [];
    preVer.forEach(v => {
        let files = fs.readdirSync(config.directory+"/versions/"+v.name, {withFileTypes: true});
        files = files.filter(e => !e.isDirectory());
        let json = files.filter(e => e.name == v.name+".json");
        if(!json[0]) return;
        json = json[0]
        let jar = files.filter(e => e.name == v.name+".jar");
        if(!jar[0]) return;
            let file = fs.readFileSync(config.directory+"/versions/"+v.name+"/"+json.name, {encoding: "utf8"});
            if(!file) return;
            try{
                file = JSON.parse(file);
            }catch(e){
                file = undefined;
            }
            if(!file) return;
            file.versionName = v.name;
            realVer.push(file);
    })
    return realVer;
}

function selectMinecraftDir(){
    let result = remote.dialog.showOpenDialogSync(remote.getCurrentWindow(), {
        properties: ['openDirectory']
    });
    if(!result) return;
    document.getElementById("directory-input").value = result[0] || result;
    config.directory = result[0] || result;
}

function saveSettings(){
    config.java.ram = parseInt(document.getElementById("memory-slider").value) + ram.min;
    fs.writeFile("./assets/config.json", JSON.stringify(config), (err => {
        if(err) console.log(err);
    }))
    makeDir(config.directory+"\\versions");
    makeDir(config.directory+"\\libraries");
    makeDir(config.directory+"\\assets");
    makeDir(config.directory+"\\mclauncherData");
    installedVersions = getInstalledVersions(config.directory);
    showVersions();
    openPage("main");
}
//Set settings
//Directory
document.getElementById("directory-input").value = config.directory;
if(config.java.recommended) document.getElementById("java-input").value = "Рекомендовано";
else document.getElementById("java-input").value = config.java.path;
//Checkboxes
Object.keys(config.versions).forEach(name => {
    checkbox(name, config.versions[name]);
})
//Set slider params
let slider = document.getElementById("memory-slider");
slider.max = ram.max - ram.min;
slider.value = config.java.ram - ram.min;
document.getElementById("number-one").innerText = ram.min;
document.getElementById("number-two").value = config.java.ram;
document.getElementById("number-three").innerText = ram.max;

function sliderUpdate(){
    let value = slider.value;
    document.getElementById("number-two").value = ram.min + parseInt(slider.value);
}
function sliderNumberUpdate(){
    let value = document.getElementById("number-two").value;
    value = parseInt(value);
    if(isNaN(value)) return;
    if(value > ram.max) value = ram.max;
    document.getElementById("number-two").value = value;
    slider.value = value - ram.min;
}


function checkbox(param, value = null){
    if(value !== null){
        if(value === true){
            document.getElementById(param).classList.add("checkbox-active");
        }else{
            document.getElementById(param).classList.remove("checkbox-active");
        }
    }else{
        config.versions[param] = !config.versions[param];
        if(config.versions[param] === true){
            document.getElementById(param).classList.add("checkbox-active");
        }else{
            document.getElementById(param).classList.remove("checkbox-active");
        }
    }
}
// Change color true/false
function cht(id){
    document.getElementById(id).classList.add("input-inner-hover");
}
function chf(id){
    document.getElementById(id).classList.remove("input-inner-hover");
}
// Input "label"
for(let inputInner of document.getElementsByClassName("input-inner")){
    inputInner.addEventListener("click", (event) => {
       inputInner.childNodes[0].focus();
    });
}
for(let inputInner of document.getElementsByClassName("add-input")){
    inputInner.addEventListener("click", (event) => {
        inputInner.childNodes[0].focus();
    });
}
//To close selectors
document.addEventListener('click', event => {
   if(toggles[1] === true && event.target.id !== "sel" && event.target.id !== "arl"
        &&  event.target.id !== "pal" && (!event.target.parentNode || event.target.parentNode.id !== "sel")){
       toggleSelector(1, false);
   }else if(toggles[2] == true && event.target.id !== "ser"  && event.target.id !== "arr"
        &&  event.target.id !== "par" && (!event.target.parentNode || event.target.parentNode.id !== "ser")){
       toggleSelector(2, false);
   }
});

function openPage(name){
    pages.forEach(page => {
        document.getElementById(page+"-page").classList.remove("active-page");
    });
    document.getElementById(name+"-page").classList.add("active-page");
}

function toggleSelector(selector, toggle = undefined){
    let el;
    let ar;
    if(selector === 1){
        el = document.getElementById("sel");
        ar = document.getElementById("arl");
    }else if(selector === 2){
        el = document.getElementById("ser");
        ar = document.getElementById("arr");
    }
    if(toggle === true) toggles[selector] = false;
    else if(toggle === false) toggles[selector] = true;
    if(toggles[selector]){
        toggles[selector] = false;
        el.style.opacity = "0";
        setTimeout(() => {
            if(toggles[selector] !== false) return;
            el.style.opacity = "0";
            el.style.display = "none";
        }, 400);
        ar.style.transform = "rotate(0deg)";
    }else{
        toggles[selector] = true;
        el.style.display = "block";
        setTimeout(() => {
            if(toggles[selector] !== true) return;
            el.style.display = "block";
            el.style.opacity = "1";
            ar.style.transform = "rotate(180deg)";
        }, 10);
    }
}

function nav(number){
    if(number === 0){
        remote.getCurrentWindow().minimize();
    }else if(number === 1){
        remote.getCurrentWindow().close();
    }
}
function makeDir(path){
    if(!fs.existsSync(path)) fs.mkdirSync(path);
}
function makeDirRecursive(path){
    if(!fs.existsSync(path)) fs.mkdirSync(path, {recursive: true});
    return;
}
function saveProfiles(){
    if(!config.directory) return;
    fs.writeFile(config.directory+"/MCLauncherProfiles.json", JSON.stringify(profiles), (err) => {

    });
}
function genUUID(){
    return uuid().replace(/-/g, "");
}
function getJson(url){
    return new Promise((res, rej) => {
        request(url, {json: true}).then(result => {
            res(result)
        }).catch(e => rej(e));
    });
}