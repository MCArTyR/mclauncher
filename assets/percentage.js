class Percentage {
    constructor(element, icon) {
        this.element = element;
        this.icon = icon;
        this.percent = 0;
        this.assetsPercent = 0;
        this.filesPercent = 0;
        this.downloadedFiles = 0;
        this.downloadedAssets = 0;
        this.files = null;
        this.assets = null;
        this.started = false;
    }
    setElement(element){
        this.element = element;
        if(this.started) this.updatePercent();
    }
    setStart(){
        this.started = true;
        this.percent = 0;
        this.assetsPercent = 0;
        this.filesPercent = 0;
        this.files = null;
        this.assets = null;
        this.downloadedAssets = 0;
        this.downloadedFiles = 0;
        this.element.classList.add("spinner-animation");
    }
    setSuccess(){
        this.started = false;
        this.element.style.background = `linear-gradient(to left, var(--bruh-color), var(--bruh-color), #19B44C 0%)`;
        this.element.classList.remove("spinner-animation");
    }
    updatePercent(){
        this.element.classList.remove("spinner-animation");
        let number = this.percent;
        number += Math.floor(this.filesPercent * 0.4);
        number += Math.floor(this.assetsPercent * 0.5);
        if(this.percent === 10 && this.filesPercent === 100 && this.assetsPercent === 100) return this.setSuccess();
        let percent = 200 - number * 2;
        this.element.style.background = `linear-gradient(to left, var(--bruh-color), var(--bruh-color), #19B44C ${percent}%)`;
    }
    setError(){
        this.started = false;
        this.element.style.background = "#872c2c";
        this.icon.src = "./assets/reverse.svg";
        this.element.classList.remove("spinner-animation");
    }
    setFiles(number){
        this.files = number;
    }
    setAssets(number){
        this.assets = number;
    }
    downloadedJson(){
        this.percent = 1;
        this.updatePercent();
    }
    downloadedClient(){
        this.percent = 10;
        this.updatePercent();
    }
    assetDownloaded(number = 1){
        this.downloadedAssets += number;
        if(this.assets === null) return;
        if(this.downloadedAssets > this.assets) return;
        let newPercent = this.downloadedAssets / this.assets * 100;
        if(newPercent < 100) newPercent = Math.floor(newPercent);
        this.assetsPercent = newPercent;
        this.updatePercent();
    }
    fileDownloaded(){
        this.downloadedFiles++;
        if(this.files === null) return;
        if(this.downloadedFiles > this.downloadedFiles) return;
        let newPercent = this.downloadedFiles / this.files * 100;
        if(newPercent < 100) newPercent = Math.floor(newPercent);
        this.filesPercent = newPercent;
        this.updatePercent();
    }
}

class JavaProgressBar {
    constructor() {
        this.files = undefined;
        this.downloadedFiles = 0;
        this.element = document.getElementById("java-progressbar");
        this.percents = document.getElementById("java-progressbar-right");
    }
    show(){
        this.percents.innerText = "0%";
        this.element.style.height = "60px";
        this.element.style.marginBottom = "15px";
        setTimeout(() => {
            this.element.style.opacity = "1";
        }, 400);
    }
    hide(){
        this.element.style.opacity = "0";
        setTimeout(() => {
            this.element.style.height = "0px";
            this.element.style.marginBottom = "0px";
            this.percents.innerText = "0%";
        }, 400);
    }
    updatePercent(){
        if(!this.files) return this.percents.innerText = "0%";
        let percent = Math.floor(this.downloadedFiles / this.files * 100);
        if(this.downloadedFiles == this.files) percent = 100;
        this.percents.innerText = percent+"%";
    }
    fileDownloaded(number = 1){
        this.downloadedFiles += number;
        if(this.downloadedFiles > this.files) this.downloadedFiles = this.files;
        this.updatePercent();
    }
}