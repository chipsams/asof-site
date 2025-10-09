/*
    Little JS Starter Project
    - A simple starter project for LittleJS
    - Demos all the main engine features
    - Builds to a zip file
*/

'use strict';

let player;

class Team {
  constructor(name,color){
    this.color = color;
    this.name = name;
    this.combattants = [];
    this.upgrades = {};
  }
  push(combattant){
    this.combattants.push(combattant)
  }
  remove(combattant){
    this.combattants.splice(this.combattants.indexOf(combattant),1)
  }
}

const teams = {
  "good":new Team("good",new Color().setHex("#00ff39")),
  "badd":new Team("badd",new Color().setHex("#ff00ab"))
};

let tilemap;


///////////////////////////////////////////////////////////////////////////////
function gameInit()
{
    // create tile collision and visible tile layer
   
    tilemap = new TileLayer(vec2(0,0),vec2(256,256))
    for(let l=0;l<10000;l++){
      tilemap.setData(vec2(randInt(0,255),randInt(0,255)),new TileLayerData(randInt(0,4)))
    }
    tilemap.setData(vec2(randInt(0,255),randInt(0,255)),new TileLayerData(randInt(0,2)))
    tilemap.redraw()
    // setup camera
    cameraPos = vec2(0,0);
    cameraScale = 48;

    tileSizeDefault = vec2(16,16);

    player = new ControlledCombattant(vec2(128),teams.good);

    new UpgradeScreen(player)
    

}

let enemyWave = 0;
var upgradedCharacters = 0;

let _nextFrame;
var nextFrame = new Promise(r=>_nextFrame = r)
///////////////////////////////////////////////////////////////////////////////
function gameUpdate() {
  _nextFrame();
  nextFrame = new Promise(r=>_nextFrame = r);

  cameraPos = player.pos

  if(keyWasPressed(32)){
    new UpgradeScreen(player);
  }

  const applyEnemyUpgrades = (enemy,chance)=>{
    let filteredPool = enemyUpgradePool.filter(u=>(teams.badd.upgrades[u.name]??0) == 0)
    if(filteredPool.length > 0 && upgradedCharacters<5 && Math.random()<chance){
      filteredPool[randInt(filteredPool.length)].apply(enemy)
    }
  }
  
  if(frame%240==0){
    enemyWave++;

    let basicEnemies = enemyWave + 3;
    let fastEnemies = 0;
    let rangeEnemies = 0;
    if(enemyWave>10) {
      fastEnemies = Math.floor(basicEnemies / 6)
      basicEnemies -= fastEnemies * 2
    }
    fastEnemies++;
    if(enemyWave>15) {
      rangeEnemies = Math.floor(basicEnemies / 15)
      basicEnemies -= rangeEnemies
    }
    
    const pos = () => player.pos.add(randInCircle(50,30));


    for(let l=0;l<basicEnemies;l++){
      let c = new Combattant(pos(),teams.badd)
      applyEnemyUpgrades(c,enemyWave>=0?0.05:0)
    }
    for(let l=0;l<fastEnemies;l++){
      let c = new FastLowHealthCombattant(pos(),teams.badd)
    }
    for(let l=0;l<rangeEnemies;l++){
      let c = new RangeCombattant(pos(),teams.badd)
    }
  }

  
}

///////////////////////////////////////////////////////////////////////////////
function gameUpdatePost(){
}

function levels(xp){
  return Math.max(0,Math.log2(xp))+1
}
function xpneeded(level){
  return 2**(level-1)
}
function progress(xp){
  let currentLevel = Math.floor(levels(xp))
  let floorXp = xpneeded(currentLevel)
  return (xp-floorXp)/(xpneeded(currentLevel+1)-floorXp)
}

let visualXp = 0

///////////////////////////////////////////////////////////////////////////////
function gameRender() {
  visualXp = lerp(0.5,visualXp,player.xp)

  drawText([
    `${player.hp}/${player.statBlock.maxHp}`,
    ...Object.entries(player.upgrades).map(([k,v])=>`${k}: x${v}`)
  ].join("\n"),screenToWorld(vec2(1,32)),undefined,undefined,undefined,undefined,"left")

  drawRect(
    screenToWorld(vec2(screenX/2,screenY)).subtract(vec2(0.5,1)),
    vec2(12,1)
  )
  
  drawRect(
    screenToWorld(vec2(screenX/2,screenY)).subtract(vec2(0.5,1)),
    vec2(12*progress(visualXp),1),
    new Color(1,0,0)
  )

  drawText(visualXp.toFixed(1)+"/"+xpneeded(Math.floor(levels(visualXp))+1)+"-"+(progress(visualXp)*100).toFixed(2),cameraPos.subtract(vec2(0,5)),undefined,new Color)
}

///////////////////////////////////////////////////////////////////////////////
function gameRenderPost() {
}

///////////////////////////////////////////////////////////////////////////////
// Startup LittleJS Engine
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost,["./tiles.png"]);