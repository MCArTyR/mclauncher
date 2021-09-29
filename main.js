const {app, BrowserWindow} = require('electron');
const fs = require("fs");
const path = require('path');
let incrementFlake = 0;
const standardConfig = require("./assets/standardConfig.json");
var config = undefined;
try{
  let a = require("./assets/config.json");
  config = a;
  if(config.directory){
  }
}catch(e){
  config = standardConfig;
  config.directory = process.env["APPDATA"]+"\\.minecraft";
  config.clientToken = genSnowflake();
  makeDir(config.directory);
  let ram = Math.round(require("os").totalmem() / 1024 / 1024);
  if(ram >= 4096) ram = 2048;
  else if(ram >= 2048) ram = 1024;
  config.java.ram = Math.round(ram);
  saveConfig();
}
if(config.directory){
    makeDir(config.directory+"\\versions");
    makeDir(config.directory+"\\libraries");
  makeDir(config.directory+"\\assets");
  makeDir(config.directory+"\\mclauncherData");
}
require('@electron/remote/main').initialize();
function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1066,
    height: 600,
    frame: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  require("@electron/remote/main").enable(mainWindow.webContents);
  mainWindow.loadFile('index.html')

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
function genSnowflake(){
  let first = (Date.now()-1420070400000).toString(2);
  let second = "0000100001";
  let third = ((incrementFlake++).toString(2)).padStart(12, "0");
  if(incrementFlake > 4095) incrementFlake = 0;
  return BigInt("0b"+first+second+third).toString();
}
function saveConfig(){
  fs.writeFile("./assets/config.json", JSON.stringify(config), (err) => {
    if(err) console.log(err);
  });
}
function makeDir(path){
  if(!fs.existsSync(path)) fs.mkdirSync(path);
}