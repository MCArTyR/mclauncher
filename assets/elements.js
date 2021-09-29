function createErrorElement(text){
    let container = document.createElement("div");
    container.classList.add("error-container");;
    let title = document.createElement("div");
    title.classList.add("error-title");
    let img = document.createElement("img");
    img.src = "./assets/red_cross.svg";
    img.classList.add("error-title-img");
    let e = document.createElement("div");
    e.classList.add("error-title-text");
    e.innerText = "Ошибка";
    let content = document.createElement("div");
    content.classList.add("error-content");
    content.innerText = text;
    title.appendChild(img);
    title.appendChild(e);
    container.appendChild(title);
    container.appendChild(content);
    return container;
}
function createOneIconVersion(name, id){
    let container = document.createElement("div");
    container.classList.add("version-block");
    let left = document.createElement("div");
    left.classList.add("version-block-left");
    let text = document.createElement("div");
    text.innerText = name;
    text.classList.add("version-text");
    left.appendChild(text);
    container.appendChild(left);
    let right = document.createElement("div");
    right.classList.add("version-block-right-one");
    container.appendChild(right);

    let firstIcon = document.createElement("img");
    firstIcon.id = "icon-"+Date.now();

    let percentage = getPercentage(id);
    if(!percentage) percentage = new Percentage(container, firstIcon);
    else percentage.setElement(container);
    ids = ids.filter(e => e.id != id);
    ids.push({id, percentage});
    firstIcon.src = "./assets/download.svg";
    firstIcon.classList.add("double-icon");
    firstIcon.onclick = function(){ downloadVersionOnclick(id, percentage); }
    right.appendChild(firstIcon);
    return container;
}
function createDoubledAccount(username, id){
    let container = document.createElement("div");
    container.classList.add("account-block");
    let left = document.createElement("div");
    left.classList.add("account-block-left");
    let text = document.createElement("div");
    text.innerText = username;
    text.classList.add("account-text");
    left.appendChild(text);
    container.appendChild(left);
    let right = document.createElement("div");
    right.classList.add("account-block-right-double");
    container.appendChild(right);

    let firstIcon = document.createElement("img");
    firstIcon.id = "icon-"+Date.now();
    firstIcon.src = "./assets/pencil.svg";
    firstIcon.classList.add("double-icon");
    firstIcon.onclick = function(){ editAccount(id); }

    let secondIcon = document.createElement("img");
    secondIcon.src = "./assets/trash.svg";
    secondIcon.classList.add("double-icon");
    secondIcon.onclick = function(){ deleteAccount(id); }
    right.appendChild(firstIcon);
    right.appendChild(secondIcon);
    return container;
}
function createDoubledVersion(name, id){
    let container = document.createElement("div");
    container.classList.add("version-block");
    let left = document.createElement("div");
    left.classList.add("version-block-left");
    let text = document.createElement("div");
    text.innerText = name;
    text.classList.add("version-text");
    left.appendChild(text);
    container.appendChild(left);
    let right = document.createElement("div");
    right.classList.add("version-block-right-double");
    container.appendChild(right);

    let firstIcon = document.createElement("img");
    firstIcon.id = "icon-"+Date.now();

    let percentage = getPercentage(id);
    if(!percentage) percentage = new Percentage(container, firstIcon);
    else percentage.setElement(container);
    ids = ids.filter(e => e.id != id);
    ids.push({id, percentage});
    firstIcon.src = "./assets/reverse.svg";
    firstIcon.classList.add("double-icon");
    firstIcon.onclick = function(){ updateVersion(id, percentage); }

    let secondIcon = document.createElement("img");
    secondIcon.src = "./assets/trash.svg";
    secondIcon.classList.add("double-icon");
    secondIcon.onclick = function(){ deleteVersion(id); }
    right.appendChild(firstIcon);
    right.appendChild(secondIcon);
    return container;
}