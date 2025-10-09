
class Tool extends EngineObject {
  constructor(){
    super()
    this.renderOrder = 1000
  }
}

class CreationTool extends Tool {
  /**
   * 
   * @param {*} size 
   * @param {*} partConstructor 
   * @param {*} partChanger 
   */
  constructor(constructors){
    super()

    this.constructors = constructors

    this.index = 0

    this.targetAngle = 0
    
    this.load(this.constructors[0])
  }

  load(constructor){
    if(!Array.isArray(constructor)) constructor = [constructor]
    this.partConstructor = constructor[0]
    this.configure = constructor[1]
    this.size = this.partConstructor.size
    this.handContent = undefined;
    this.lastHole;
    if(this.partConstructor.unrotatable) this.targetAngle = 0;
  }

  update(){
    super.update()
    if(keyIsDown(16)){
      this.index += mouseWheel
      this.index = mod(this.index,this.constructors.length)
      this.load(this.constructors[this.index])
    }else{
      if(!this.partConstructor.unrotatable)this.targetAngle += mouseWheel*Math.PI/2
    }

    let offset = this.size.rotate(-this.targetAngle)
    offset = resolveRotatedSize(offset).scale(0.5)
    this.pos = mousePos.add(offset).add(vec2(0.5)).floor().subtract(offset)
    if(mouseIsDown(0)){
      if(MachineGrid.intersecting(this.pos,this.size,this.targetAngle).length == 0){
        let part = new this.partConstructor(this.pos,this.targetAngle)
        this.configure?.(part)
      }
    }
    this.angle = lerp(0.4,this.angle,this.targetAngle)
  }

  render(){

    let color = new Color();

    if(MachineGrid.intersecting(this.pos,this.size,this.targetAngle).length > 0){
      color.setHex("#ff0000")
    }

    this.partConstructor.drawPreview(this.pos,this.angle,color)
  }
}

class SpoutTool extends Tool {
  constructor(spoutConstructor){
    super()
    this.spoutConstructor = spoutConstructor
  }

  update(){
    let spoutConnection = spoutConnectionGrid.intersecting(mousePos,vec2(1))[0]
    if(spoutConnection && !spoutConnection.spout){
      new this.spoutConstructor(spoutConnection)
    }
  }
  
  render(){

  }
}

let machines = [
  ()=>new CreationTool([Pipe,StopperPipe,Corner]),
  ()=>new CreationTool([
    Merger,
    [Arm,arm=>{
      arm.addHand(vec2(2,0))
      arm.tasks = [
        ["grab",true],
        ["cw"],
        ["cw"],
        ["release",true],
        ["ccw"],
        ["ccw"],
      ]
    }],
    [Arm,arm=>{
      arm.addHand(vec2(2,0))
      arm.tasks = [
        ["grab",true],
        ["cw"],
        ["release",true],
        ["ccw"],
      ]
    }],
  ]),
  ()=>new CreationTool([
    FuranceP_P,
    Furance,
    CrafterP_P,
    CrafterHH_P,
  ]),
  ()=>new CreationTool([
    LiquidCollector,Pumpjack
  ]),
  ()=>new SpoutTool(Spout),
  ()=>new CreationTool([BigPipe,BigCorner,BigCornerCCW,BigPipeSeperator]),
  ()=>new CreationTool([Producer,BigDestroyer,Miner,Destroyer]),
  ()=>new CreationTool([
    Wall,
    Wall3x3,
    Core,
  ]),
]

