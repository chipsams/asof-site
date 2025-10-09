class PipeJoint {
  /**
   * 
   * @param {PipeConnection[]} connections 
   * @param {HoleConnection} hole 
   */
  constructor(connections,hole){
    this.owner = connections[0].parent;
    this.ports = connections;
    this.ports.forEach(port=>port.manager = this)
    if(hole){
      this.hole = hole;
      this.hole.manager = this;
    }
    this.lastPort;

    /**
     * @type {Boolean} determines if this tile holds a single item in place, rather than instantly letting an item through.
     */
    this.stopper;

    /** @type {Item} */
    this.content = undefined;
    this.lastContent = undefined;
    this.enterTime = 0;
    this.framespertile = 8;

    this.moveDirection = 0;
  }
  
  update(){
    if(this.enterTime>0){
      this.enterTime-=1;
    }else{
      if(!this.stopper && this.content){
        let ports = Object.assign([],this.ports)
        ports = ports.filter(port=>port!==this.lastPort)
        for(let targetPort of ports){
          let [machine,port] = targetPort.getMachine()
          if(machine){
            let success = machine.recieveFrom(port,this.content)
            if(success){
              this.owner.inventoryChanged = true;
              this.content = undefined;
              break;
            }
          }
        }
      }
    }
  }

  //attempt to make this pipe segment eject it's item, if it's still for whatever reason
  nudge(fromPort = undefined, simulate = false){
    let ports = Object.assign([],this.ports)
    let portExists = ports.indexOf(this.lastPort) !== -1;
    ports = ports.filter(port=>port!==this.lastPort)
    if(portExists && this.lastPort) ports.push(this.lastPort)
    ports = ports.filter(port=>port!==fromPort)
    for(let [machine,externalPort] of ports.map(port=>port.getMachine())){
      if(machine){
        let success = machine.recieveFrom(externalPort,this.content,simulate);
        if(success){
          if(!simulate){
            this.owner.inventoryChanged = true;
            this.prevContent = this.content;
            this.content = undefined;
          }
          return true;
        }
      }
    }
    return false;
  }

  insertOther(item,simulate = false){
    return this.recieveFrom(undefined,item,simulate)
  }
  
  recieveFrom(fromPort,item,simulate = false){
    if(this.stopper && this.content) this.nudge(fromPort,simulate)
    if(this.content) return false;

    if(!simulate){
      this.owner.inventoryChanged = true;
      this.content = item;
      this.lastPort = fromPort;
      this.moveDirection = fromPort?.angle ?? 0;
      this.enterTime = this.framespertile;
    }
    return true;

  }

  dropIn(hole,item,simulate = false){
    let success = this.recieveFrom(hole,item,simulate);
    if(success){
      if(!simulate) this.enterTime = 0;
      return true;
    }
    return false;
  }

  extract(hole,simulate = false){
    if(!this.content) return;
    let item = this.content;
    if(!simulate){
      this.owner.inventoryChanged = true;
      this.content = undefined;
      this.prevContent = undefined;
    }
    return item;
  }
}

class AccessHatch {
  constructor(hole){
    this.hole = hole
    this.owner = hole.parent
    hole.manager = this
  }
  recieveFrom(){
    console.error("unimplemented")
  }

  insertOther(item,simulate = false){
    console.log("inserting",item,simulate)
    return this.dropIn(undefined,item,simulate)
  }
  
  dropIn(hole,item,simulate = false){
    if(this.content) return false;
    if(!simulate) this.content = item;
    return true;
  }
  extract(hole,simulate = false){
    if(this.content){
      let content = this.content
      if(!simulate) this.content = undefined;
      return content;
    }
  }

  render(){}

  draw(){
    if(this.content) this.content.drawTiny(this.hole.pos)
  }
}

class BasePipe extends Machine {
  static size = vec2(1)

  constructor(pos,angle){
    super(pos,angle)
    this.miningTime = 5
    this.tileInfo = tile(vec2(0,8),undefined,2)
  }

  update(){
    super.update();
  }

  render(){
    this.drawSpriteSelf(
      this.tileInfo.offset(vec2(this.content?8:0,0))
    )
    //debugText(this.enterTime,this.pos)
  }

  recieveFrom(port,item,simulate = false){
    if(port.manager) return port.manager.recieveFrom(port,item,simulate)
    console.error("unimplemented")
  }
  dropIn(hole,item,simulate = false){
    if(hole.manager) return hole.manager.dropIn(hole,item,simulate)
    console.error("unimplemented")
  }
  extract(hole,simulate = false){
    if(hole.manager) return hole.manager.extract(hole,simulate)
    console.error("unimplemented")
  }
}

class BigPipe extends BasePipe {
  static size = vec2(4,3)

  static pipeConnections = {
    a0: [vec2(1.5,-1),0,uiIcons.bidirectional],
    a1: [vec2(1.5,0),0,uiIcons.bidirectional],
    a2: [vec2(1.5,1),0,uiIcons.bidirectional],
    b0: [vec2(-1.5,-1),PI,uiIcons.bidirectional],
    b1: [vec2(-1.5,0),PI,uiIcons.bidirectional],
    b2: [vec2(-1.5,1),PI,uiIcons.bidirectional],
  }

  constructor(pos,angle){
    super(pos,angle)
    /** @type {PipeJoint[]} */
    this.joints = []
    for(let l=0;l<3;l++){
      this.joints[l] = new PipeJoint([this.pipeConnections["a"+l],this.pipeConnections["b"+l]])
      this.joints[l].framespertile = 6
    }
    this.tileInfo = tile(vec2(136,16),vec2(32,24),2)
  }

  update(){
    super.update();
    this.joints.forEach(j=>j.update())
  }

  render(){
    super.render()
    this.joints.forEach((joint,i)=>{
      if(joint.content && joint.enterTime <= 5){
        drawTile(
          this.pos
          .add(vec2(0,i-1).rotate(-this.angle))
          .add(vec2(Math.floor(lerp(joint.enterTime/joint.framespertile,-2,2.99))*(5/8),0).rotate(-joint.moveDirection)),
          undefined,
          tile(vec2(160,8),vec2(8),2))
      }
    })
  }
}

class BigPipeSeperator extends BasePipe {
  static size = vec2(2,5)

  static pipeConnections = {
    a0: [vec2(0.5,-2),0,uiIcons.bidirectional],
    a1: [vec2(0.5,0),0,uiIcons.bidirectional],
    a2: [vec2(0.5,2),0,uiIcons.bidirectional],
    b0: [vec2(-0.5,-1),PI,uiIcons.bidirectional],
    b1: [vec2(-0.5,0),PI,uiIcons.bidirectional],
    b2: [vec2(-0.5,1),PI,uiIcons.bidirectional],
  }

  constructor(pos,angle){
    super(pos,angle)
    this.tileInfo = tile(vec2(192,8),vec2(16,40),2)
  }

  update(){
    super.update();
  }

  render(){
    super.render()
  }

  getMatched(port){
    switch(port.name){
      case "a0": return this.pipeConnections.b0.getMachine()
      case "a1": return this.pipeConnections.b1.getMachine()
      case "a2": return this.pipeConnections.b2.getMachine()
      case "b0": return this.pipeConnections.a0.getMachine()
      case "b1": return this.pipeConnections.a1.getMachine()
      case "b2": return this.pipeConnections.a2.getMachine()
    }
  }

  /**
   * 
   * @param {PipeConnection} port 
   * @param {*} item 
   * @param {*} simulate 
   */
  recieveFrom(port,item,simulate = false){
    let [machine,externalPort] = this.getMatched(port)
    if(!machine) return false;
    return machine.recieveFrom(externalPort,item,simulate)
  }
}

class BigCorner extends BasePipe {
  static size = vec2(3,6)

  static pipeConnections = {
    a0: [vec2(-1,-1.5),PI,uiIcons.input],
    a1: [vec2(-1,-0.5),PI,uiIcons.input],
    a2: [vec2(-1,0.5),PI,uiIcons.input],
    b0: [vec2(-1,-2.5),PI/2,uiIcons.output],
    b1: [vec2(-0,-2.5),PI/2,uiIcons.output],
    b2: [vec2(1,-2.5),PI/2,uiIcons.output],
  }
  
  constructor(pos,angle){
    super(pos,angle)
    this.tileInfo = tile(vec2(168,0),vec2(24,48),2)

    this.cacheSize = 4

    this.pumpPosition = 0

    /** @type {"ready"|"pumping"|"recovering"} */
    this.pumpState = "ready"

    /** @type {PipeJoint[]} */
    this.inJoints = []
    /** @type {PipeJoint[]} */
    this.outJoints = []
    for(let l=0;l<3;l++){
      this.inJoints[l] = new PipeJoint([this.pipeConnections["a"+l]])
      this.inJoints[l].cache = []
      this.outJoints[l] = new PipeJoint([this.pipeConnections["b"+l]])
      this.outJoints[l].cache = []
      this.outJoints[l].enterTime = 1
    }
  }

  update(){
    super.update();
    for(let l=0;l<3;l++){
      this.outJoints[l].update();
      if(this.inJoints[l].content && this.inJoints[l].cache.length < this.cacheSize){
        this.inJoints[l].cache.push(this.inJoints[l].content)
        this.inJoints[l].content = undefined
      }
      if(this.outJoints[l].cache.length > 0 && !this.outJoints[l].content){
        this.outJoints[l].content = this.outJoints[l].cache.pop()
      }
    }

    
    if(this.pumpState == "recovering"){
        if(this.pumpPosition>0){
          this.pumpPosition--;
        }else{
          this.pumpState = "ready"
        }
    }else if(this.pumpState == "pumping"){
      this.pumpPosition+=4;
      if(this.pumpPosition >= 32){
        for(let l=0;l<3;l++){
          this.outJoints[l].cache = this.inJoints[l].cache
          this.inJoints[l].cache = []
        }
        this.pumpState = "recovering"
      }
    }else{
      if(
        this.outJoints.every(j=>j.cache.length == 0) &&
        this.inJoints.every(j=>j.cache.length == this.cacheSize)
      ){
        this.pumpState = "pumping"
      }
    }

  }

  render(){
    super.render();
    drawTile(this.pos.add(vec2(0,2.5-this.pumpPosition/32).rotate(-this.angle)),vec2(3,1),tile(vec2(144,0),vec2(24,8),2),undefined,this.angle) 
  }
}

class BigCornerCCW extends BigCorner {
  static pipeConnections = {
    a0: [vec2(-1,-0.5),PI,uiIcons.input],
    a1: [vec2(-1,0.5),PI,uiIcons.input],
    a2: [vec2(-1,1.5),PI,uiIcons.input],
    b0: [vec2(-1,2.5),-PI/2,uiIcons.output],
    b1: [vec2(-0,2.5),-PI/2,uiIcons.output],
    b2: [vec2(1,2.5),-PI/2,uiIcons.output],
  }

  render(){
    drawTile(this.pos,this.size,this.tileInfo,undefined,this.angle+PI,true)
    drawTile(this.pos.add(vec2(0,-2.5+this.pumpPosition/32).rotate(-this.angle)),vec2(3,1),tile(vec2(144,0),vec2(24,8),2),undefined,this.angle) 
  }
}

class Pipe extends BasePipe {
  static pipeConnections = {
    a: [vec2(0),0,uiIcons.bidirectional],
    b: [vec2(0),PI,uiIcons.bidirectional],
  }

  constructor(pos,angle){
    super(pos,angle)
    this.joint = new PipeJoint([this.pipeConnections.a,this.pipeConnections.b])
  }
  update(){
    super.update();
    this.joint.update();
  }

  render(){
    this.drawSpriteSelf(
      this.tileInfo.offset(vec2(this.joint.content?8:0,0))
    )
    //debugText(this.enterTime,this.pos)
  }
}

class Corner extends BasePipe {
  static pipeConnections = {
    a: [vec2(0,-0.5),PI/2,uiIcons.bidirectional],
    b: [vec2(0,-0.5),PI,uiIcons.bidirectional],
  }
  static size = vec2(1,2)

  constructor(pos,angle){
    super(pos,angle)
    this.tileInfo = tile(vec2(0,40),vec2(8,16),2)

    this.joint = new PipeJoint([this.pipeConnections.a,this.pipeConnections.b])
    this.joint.framespertile = 24
  }

  update(){
    super.update();
    this.joint.update();
  }

  render(){
    this.drawSpriteSelf(
      this.tileInfo.offset(vec2(this.joint.content?8:0,0))
    )
  }
}

class StopperPipe extends BasePipe {
  static pipeConnections = {
    a: [vec2(0),0,uiIcons.prefered_bidirectional],
    b: [vec2(0),PI,uiIcons.bidirectional],
  }

  static holeConnections = {
    h: [vec2(0,0),uiIcons.bidirectional]
  }

  constructor(pos,angle){
    super(pos,angle)
    this.tileInfo = tile(vec2(0,24),undefined,2)
    this.joint = new PipeJoint([this.pipeConnections.a,this.pipeConnections.b],this.holeConnections.h)
    this.joint.stopper = true;
    this.prevContent;
    this.framespertile = 12;
  }
  
  update(){
    super.update();
    this.joint.update();
  }

  render(){
    this.drawSpriteSelf(tile(vec2(0,24),undefined,2))
    let manager = this.joint
    if(manager.content && manager.enterTime <= manager.framespertile/2){
      manager.content.drawTiny(this.pos.subtract(vec2(-manager.enterTime/manager.framespertile,0).rotate(-manager.moveDirection)))
    }
    if(manager.prevContent && manager.enterTime > manager.framespertile/2){
      manager.prevContent.drawTiny(this.pos.subtract(vec2(1-manager.enterTime/manager.framespertile,0).rotate(-manager.moveDirection)))
    }
  }
}

//mostly for testing, doesn't match my current design goals really..
class Merger extends Machine {
  static pipeConnections = {
    a: [vec2(-0.5,0.5),PI*1.5,uiIcons.input],
    b: [vec2(-0.5,-0.5),PI*0.5,uiIcons.input],
    o: [vec2(0.5,-0.5),0,uiIcons.output]
  }
  static size = vec2(2,2)

  constructor(pos,angle){
    super(pos,angle)
    this.tileInfo = tile(vec2(72,8),vec2(16,16),2)
  }

  recieveFrom(port,item,simulate = false){
    if(port.name == "o") return false;
    let [machine,toPort] = this.pipeConnections.o.getMachine()
    if(machine){
      return machine.recieveFrom(toPort,item,simulate)
    }
    return false
  }
}

