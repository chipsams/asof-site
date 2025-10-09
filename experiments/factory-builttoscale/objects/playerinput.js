
class Hotbar {
  constructor(items){
    this.items = items
  }

  draw(){
    
  }
}

let DrillHotbar = new Hotbar([

])

class Player extends EngineObject {
  constructor(pos){
    super(pos,vec2(0.8))
    this.damping = 0.8
    this.collideTiles = true

    this.tool;
    this.targetMachine;
    this.breakTimer;
  }

  update(){
    super.update()
    let dir = vec2()
    if(keyIsDown(37)) {dir.x -= 1; this.mirror = true}
    if(keyIsDown(39)) {dir.x += 1; this.mirror = false}
    if(keyIsDown(38)) dir.y += 1
    if(keyIsDown(40)) dir.y -= 1
    if(dir.lengthSquared()>0.1){
      this.velocity = this.velocity.add(dir.normalize(0.1))
    }
    this.toolUpdate()
  }

  toolUpdate(){
    machines.forEach((fn,i)=>{
      if(keyWasPressed(49+i)){
        this.tool?.destroy?.();
        this.tool = fn();
      }
    })

    if(mouseIsDown(0)){
      if(!this.tool){
        let hole = holeConnectionGrid.getAll(mousePos)[0]
        if(hole && this.lastHole !== hole){
          if(!this.handContent){
            let item = hole.parent.extract(hole)
            console.log("extract",item)
            if(item) this.handContent = item
          }else{
            let success = hole.parent.dropIn(hole,this.handContent)
            console.log("insert",success)
            if(success) this.handContent = undefined;
          }
          this.lastHole = hole
        }
      }
    }else{
      this.lastHole = undefined
    }

    if(mouseIsDown(2)){
      if(mouseWasPressed(2) && this.tool){
        this.tool?.destroy?.();
        this.tool = undefined;
        this.dismissedTool = true;
      }
      if(!this.dismissedTool){
        let spoutConnection = spoutConnectionGrid.intersecting(mousePos,vec2(1))[0]
        let machines = MachineGrid.intersecting(mousePos)
        if(spoutConnection?.spout){
          if(this.targetMachine == spoutConnection.spout){
            debugLine(this.targetMachine.pos,this.targetMachine.pos.add(mousePos.subtract(this.targetMachine.pos).normalize().scale(this.breakTimer/10)))
            this.breakTimer++;
            if(this.breakTimer>=10){
              spoutConnection.spout.destroy()
              spoutConnection.spout = undefined
              this.targetMachine = undefined
            }
          }else{
            this.breakTimer = 0
            this.targetMachine = spoutConnection.spout
          }
        }else if(machines[0]){
          if(machines[0] == this.targetMachine){
            let miningTime = this.targetMachine.miningTime;
            player.velocity = player.velocity.scale(0.1)
            this.breakTimer++;
            debugLine(this.targetMachine.pos,this.targetMachine.pos.add(mousePos.subtract(this.targetMachine.pos).normalize().scale(this.breakTimer/miningTime)))
            if(this.breakTimer>=miningTime){
              machines[0].destroy()
              this.targetMachine = undefined
            }
          }else{
            this.targetMachine = machines[0]
            this.breakTimer = 0
          }
        }else{
          this.breakTimer = 0
        }
      }
    }else{
      this.dismissedTool = false;
      this.targetMachine = undefined;
    }
  }

  render(){
    let baseTile = tile(vec2(0,0),undefined,3)
    if(this.velocity.lengthSquared()>0.1){
      this.walkTime += 0.16
      let yOffset = Math.abs(Math.sin(this.walkTime))/4
      drawTile(this.pos.add(vec2(0,yOffset)),undefined,baseTile.offset(vec2(0,yOffset>0.125?16:0)),undefined,undefined,this.mirror)
    }else{
      this.walkTime = 0
      drawTile(this.pos,undefined,baseTile,undefined,undefined,this.mirror)
    }
    let baseHandTile = tile(vec2(8,0),undefined,3)
    let handTile = baseHandTile
    if(this.tool) handTile = baseHandTile.offset(vec2(16,0))
    if(this.targetMachine) handTile = baseHandTile.offset(vec2(24,0))
    let handPos = mousePos.subtract(this.pos).scale(0.25).clampLength(1)
    drawTile(this.pos.add(handPos).add(vec2(handPos.x<0?-0.25:0.25,0.25)),undefined,handTile,undefined,undefined,handPos.x<0)
  }
}

function updateUi(){

}