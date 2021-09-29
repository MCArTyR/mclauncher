function addAccountL(){
    let login = document.getElementById("email-input").value.replace(/ /g, "");
    let password = document.getElementById("password-input").value;
    if(selectedAccountType === 2){
        if(login == "") return showError("Укажите Ник");
        let uuid = genUUID();
        if(editingAccount){
            uuid = editingAccount;
            editingAccount = null;
            profiles.profiles = profiles.profiles.filter(e => e.uuid != uuid);
        }
        profiles.profiles.push({
            type: 2,
            username: login,
            uuid: uuid
        })
        openAccountsPage();
    }else if(selectedAccountType === 0){
        if(login == "") return showError("Укажите E-mail");
        if(password.replace(/ /g, "") == "") return showError("Укажите пароль");
        authenticateAccountR(login, password).then(e => {
            openAccountsPage();
        }).catch(e => {
            if(!!e.errorParsed && e.errorParsed === 0) return showError("На введённом аккаунте нет лицензии!");
            if(e.error){
                let error;
                let e2 = false;
                try{
                    error = JSON.parse(e.error);
                }catch(e){
                    e2 = true;
                    showError("Произошла ошибка во время авторизации");
                }
                if(e2) return;
                if(error.errorMessage && error.errorMessage == "Invalid credentials. Invalid username or password."){
                    showError("Неверный логин или пароль");
                }else showError("Произошла ошибка во время авторизации");
            }
        })
    }
    document.getElementById("email-input").value = "";
    document.getElementById("password-input").value = "";
}
function validateAccount(accessToken){
    return new Promise((res, rej) => {
       request(minecraftAuthenticationUrl+"/validate", {
           method: "POST",
           headers: {
               "content-type": "application/json"
           },
           body: JSON.stringify({
               clientToken: config.clientToken,
               accessToken
           })
       }).then(res).catch(rej);
    });
}
async function authenticateAccountR(login, password){
    let error = false;
    let result = await authenticateAccount(login, password).catch(e => error = e);
    if(error) throw error;
    if(result.error) throw error;
    if(editingAccount){
        profiles.profiles = profiles.profiles.filter(e => e.uuid != editingAccount);
        editingAccount = null;
    }
    profiles.profiles.push({
        email: result.login,
        username: result.username,
        uuid: result.uuid,
        accessToken: result.accessToken,
        type: 0
    });
    saveProfiles();
}
async function refreshAccountR(accessToken){
    let error = false;
    let result = await refreshAccount(accessToken).catch(e => error = e);
    if(error) throw error;
    if(result.error) throw error;
    let account = profiles.profiles.filter(e => e.accessToken != accessToken);
    if(!account[0]) throw new Error("Произошла ошибка во время обновления аккаунта");
    account = account[0];
    account.accessToken = result.accessToken;
    account.username = result.username;
    account.uuid = result.uuid;
    account.type = 0;
    profiles.profiles = profiles.profiles.filter(e => e.accessToken != accessToken);
    profiles.profiles.push(account);
    saveProfiles();
}
function refreshAccount(accessToken){
    return new Promise((res, rej) => {
        request(minecraftAuthenticationUrl+"/refresh", {
           method: "POST",
           headers: {
               "Content-Type": "application/json"
           },
            body: JSON.stringify({
                clientToken: config.clientToken,
                accessToken
            })
        }).then(result => {
            result = JSON.parse(result);
            res({username: result.selectedProfile.name, uuid: result.selectedProfile.id, accessToken: result.accessToken})
        }).catch(rej)
    });
}
function authenticateAccount(login, password){
    return new Promise((res, rej) => {
       request(minecraftAuthenticationUrl+"/authenticate", {
           method: "POST",
           headers: {
               "Content-Type": "application/json"
           },
           body: JSON.stringify({
               agent: {
                   name: "Minecraft",
                   version: 1
               },
               clientToken: config.clientToken,
               username: login,
               password: password
           })
       }).then(result => {
           result = JSON.parse(result);
           if(!result.selectedProfile) return res({errorParsed: 0});
           res({login: login, username: result.selectedProfile.name, uuid: result.selectedProfile.id, accessToken: result.accessToken});
       }).catch(rej);
    });
}
function editAccount(uuid){
    let user = profiles.profiles.filter(e => e.uuid == uuid);
    if(!user[0]) return showError("Произошла ошибка во время попытки редактировать аккаунт");
    user = user[0];
    editingAccount = uuid;
    let emailValue = user.username;
    if(user.type == 0) emailValue = user.email;
    document.getElementById("email-input").value = emailValue;
    setAccountType(user.type);
    document.getElementById("account-add-button").innerText = "Сохранить";
    openPage("add-account");
}
function deleteAccount(uuid){
    profiles.profiles = profiles.profiles.filter(e => e.uuid !== uuid);
    saveProfiles();
    showAccountsList();
}