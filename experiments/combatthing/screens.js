
var activeScreen;

class Screen extends EngineObject {
  constructor(){
    super()
  }
  
  update(){
    this.pos = vec2(cameraPos)
  }
}

/**
 * 
 * @param {String} id 
 * @returns {HTMLElement}
 */
function loadTemplate(id){
  return document.getElementById(id).content.cloneNode(true).firstElementChild
}

let pausingScreens = 0;

class UpgradeScreen extends Screen {
  /**
   * 
   * @param {Combattant} user 
   * @param {*} level 
   */
  constructor(user,level){
    super()
    paused = ++pausingScreens;
    let screen = loadTemplate("upgrade-screen-template");
    console.log(screen)
    screen.querySelector("#level").innerText = `${Math.floor(level)-1} => ${Math.floor(level)}`
    screenholder.appendChild(screen)

    let potentialUpgrades = upgrades.filter(u=>{
      if(u.moveOnly){
        return !(
          (u.slotMeleeMove??user.actions.melee) == user.actions.melee &&
          (u.slotRangeMove??user.actions.range) == user.actions.range
        )
      }
      if(u.singleUse) return user.upgrades[u.name] == undefined;
      return true
    })

    this.upgrades = [];
    for(let l=0;l<3;l++){
      let i = randInt(potentialUpgrades.length);
      this.upgrades.push(...potentialUpgrades.splice(i,1))
    }

    this.upgrades.forEach(upg => {
      let upgrade = loadTemplate("upgrade-template");
      upgrade.querySelector("#name").innerText = upg.name;
      upgrade.querySelector("#description").innerText = upg.description;
      upgrade.style.setProperty("--color",upg.color)
      upgrade.onclick = () => {
        upg.apply(user)
        screen.remove()
        this.destroy()
        paused = --pausingScreens;
      }
      screen.querySelector("#options").appendChild(upgrade)
    });
  }

  render(){

  }
}