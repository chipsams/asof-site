function setPanel(panelName){
    for(let panel of document.querySelectorAll("menu-panel")){
        panel.toggleAttribute("open",panel.getAttribute("name") == panelName)
    }
}