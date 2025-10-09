tileSizeDefault = vec2(8)
cameraScale = 64



let player;
let origin = vec2(512,512)
function gameInit(){
  player = new Player(origin)
  new Miner(origin.offset(-10.5,-0.5)).itemId = "iron_ore"
  new StopperPipe(origin.offset(-8.5,-0.5))
  new Miner(origin.offset(-10.5,-3.5)).itemId = "copper_ore"
  new StopperPipe(origin.offset(-8.5,-3.5))
  new Furance(origin.offset(0.5,4))
  new Destroyer(origin.offset(-10.5+20,-3.5),PI)
}

function gameUpdate(){
  cameraPos = player.pos;
}

function gameUpdatePost(){

}

function gameRender(){
  drawRect(cameraPos, vec2(100), new Color().setHex("#6772a9"))
}

function gameRenderPost(){
  researchRender()
}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost,["./tiles.png","./items.png","./logistics.png","./entities.png","./ui.png"]);