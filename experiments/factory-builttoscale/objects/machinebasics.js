function roundAngle(a){
  return Math.round(a*(Math.PI/2))/(Math.PI/2)
}

function resolveRotatedSize(vec){
  return vec2(Math.abs(vec.x),Math.abs(vec.y)).add(vec2(0.5)).floor()
}

class GridArray extends EngineObject {
  constructor(debugRender,color = "#fff",offset=vec2()){
    super(vec2(-100))
    this.debugcolor = color
    this.offset = offset
    /**
     * @type {GameObject[][][]}
     */
    this.data = []
    this.debugRender = debugRender
  }

  render(){
    if(this.debugRender){
      for(let [x,row] of Object.entries(this.data)){
        for(let [y,objects] of Object.entries(row)){
          x = Number(x)
          y = Number(y)
          if(objects.length>0) debugCircle(vec2(x,y).add(this.offset),objects.length/10,this.debugcolor)
        }
      }
    }
  }

  resolvePos(pos){
    return pos.floor()
  }

  /**
   * @param {Vector2} pos 
   * @returns {EngineObject[]}
   */
  getAll(pos){
    pos = this.resolvePos(pos)
    this.data[pos.x]??=[]
    this.data[pos.x][pos.y]??=[]
    return this.data[pos.x][pos.y]
  }

  /**
   * @param {Vector2} pos 
   * @param {EngineObject} object 
   * @returns {Boolean}
   */
  present(pos,object){
    return this.getAll(pos).indexOf(object) !== -1
  }
  
  /**
   * @param {Vector2} pos 
   * @param {EngineObject} object 
   */
  put(pos,object){
    pos = this.resolvePos(pos)
    let array = this.getAll(pos)
    array.push(object)
  }

  /**
   * @param {Vector2} pos 
   * @param {EngineObject} object 
   */
  remove(pos,object){
    pos = this.resolvePos(pos)
    let array = this.getAll(pos)
    array.splice(array.indexOf(object),1)
  }
}

initTileCollision(vec2(1024))
class OccupationMap extends EngineObject {
  constructor(debugRender,color = "#fff",offset = vec2()){
    super(vec2(-100))
    this.debugcolor = color
    this.offset = offset
    /**
     * @type {GameObject[][]}
     */
    this.data = []
    this.debugRender = debugRender
  }

  getTiles(pos,size,angle){
    size = resolveRotatedSize(size.rotate(-angle))

    let bottomLeft = pos.subtract(size.scale(0.5)).add(vec2(0.5)).floor()
    let positions = [];

    for(let lx=0;lx<size.x;lx++){
      for(let ly=0;ly<size.y;ly++){
        positions.push(bottomLeft.add(vec2(lx,ly)))
      }
    }
    return positions
  }

  put(object){
    for(let pos of this.getTiles(object.pos,object.size,object.angle)){
      this.data[pos.x] ??= []
      this.data[pos.x][pos.y] = object
      setTileCollisionData(pos, 1);
    }
  }
  
  clear(object){
    for(let pos of this.getTiles(object.pos,object.size,object.angle)){
      this.data[pos.x] ??= []
      if(this.data[pos.x][pos.y] !== object) console.error("huh?? object tried to delete something other than itself");
      delete this.data[pos.x][pos.y];
      setTileCollisionData(pos, 0);
    }
  }
  
  intersecting(center,size = vec2(1),angle = 0){
    let objects = [];
    for(let pos of this.getTiles(center,size,angle)){
      this.data[pos.x] ??= []
      let object = this.data[pos.x][pos.y]
      if(object && objects.indexOf(object) === -1) objects.push(object)
    }
    return objects
  }

  render(){
    if(this.debugRender){
      for(let [x,row] of Object.entries(this.data)){
        for(let [y,thing] of Object.entries(row)){
          x = Number(x)
          y = Number(y)
          debugCircle(vec2(x,y).add(this.offset),0.1,this.debugcolor)
        }
      }
    }
  }
}

// set the falses to true for some debug information!
var pipeConnectionGrid = new GridArray(false,"#f00",vec2(0.75,0.25))
var holeConnectionGrid = new GridArray(false,"#0f0",vec2(0.25,0.75))
var liquidConnectionGrid = new OccupationMap(false,"#0ff",vec2(0.25))
var spoutConnectionGrid = new OccupationMap(false,"#00f",vec2(0.25))
var MachineGrid = new OccupationMap(false,"#fff",vec2(0.5))

class MachineConnection extends EngineObject {
  constructor(owner,name,pos,angle = undefined){
    super(pos,vec2(1),tile(vec2(56,0)))
    this.name = name
    owner.addChild(this,pos,angle)

    this.lastPos = undefined;
    this.color = randColor(new Color(1,1,1),new Color(0,0,0))

    /**
     * @type {Machine}
     */
    this.parent;

    this.renderOrder = 10;
  }
}

class PipeConnection extends MachineConnection {
  /**
   * 
   * @param {Machine} owner 
   * @param {Vector2} pos 
   * @param {Number} angle
   */
  constructor(owner,name,pos,angle){
    super(owner,name,pos,angle)
    owner.pipeConnections[name] = this

    /** @type {PipeConnection} */
    this.connection = undefined;
  }
  
  reRegisterGrid(){
    if(pipeConnectionGrid.present(this.pos,this)){
      this.lastPos = this.pos;
      return;
    }

    this.disconnect();
    if(this.lastPos){
      pipeConnectionGrid.remove(this.lastPos,this)
    }

    this.lastPos = this.pos;
    pipeConnectionGrid.put(this.pos,this)
    this.attemptConnection();
  }

  connect(other) {
    this.connection = other
    other.connection = this  
  }

  disconnect(){
    let prevConnection = this.connection;
    this.connection = undefined;
    if(prevConnection) prevConnection.disconnect();
  }

  attemptConnection(){
    let offset = vec2(1,0).rotate(-this.angle)
    let checkPos = this.pos.add(offset)
    let tiles = pipeConnectionGrid.getAll(checkPos)
    tiles = tiles.filter(t=>Math.abs(distanceAngle(t.angle, this.angle+Math.PI)) < 0.001)
    if(tiles.length > 0){
      tiles[0].connect(this)
    }
  }

  /**
   * 
   * @returns {[Machine,PipeConnection]}
   */
  getMachine(){
    if(this.connection){
      return [this.connection.parent,this.connection]
    } else {
      return []
    }
  }

  destroy(){
    super.destroy();
    pipeConnectionGrid.remove(this.pos,this);
    this.connection?.disconnect?.();
  }

  update(){
    super.update();
    if(!this.lastPos){
      this.reRegisterGrid();
    }
  }
  
  render(){
    if(!this.connection){
      drawTile(this.pos.add(vec2(1,0).rotate(-this.angle)),vec2(1),tile(vec2(8,0),undefined,2),undefined,this.angle)
    }

  }
}

class HoleConnection extends MachineConnection {
  constructor(owner,name,pos){
    super(owner,name,pos,undefined)
    owner.holeConnections[name] = this
  }

  reRegisterGrid(){
    // if trying to reregister to the own position, cancel
    if(holeConnectionGrid.present(this.pos,this)){this.lastPos = this.pos; return}
    // remove it from its previous position
    if(this.lastPos){holeConnectionGrid.remove(this.lastPos,this)}
    this.lastPos = this.pos;
    //Put it at the new position
    holeConnectionGrid.put(this.pos,this)
  }

  destroy(){
    super.destroy();
    holeConnectionGrid.remove(this.pos,this);
  }

  update(){
    super.update();
    if(!this.lastPos){
      this.reRegisterGrid();
    }
  }

  render(){}
}

class SpoutConnection extends MachineConnection {
  constructor(owner,name,pos){
    super(owner,name,pos)
    owner.spoutConnections[name] = this

    /** @type {Spout} */
    this.spout;
  }

  reRegisterGrid(){
    spoutConnectionGrid.put(this)
  }

  destroy(){
    super.destroy();
    spoutConnectionGrid.clear(this);
  }

  render(){}
}

class LiquidConnection extends MachineConnection {
  constructor(owner,name,pos,size){
    super(owner,name,pos)
    owner.liquidConnections[name] = this
    this.size = size;
  }

  reRegisterGrid(){
    liquidConnectionGrid.put(this)
  }

  destroy(){
    super.destroy();
    liquidConnectionGrid.clear(this);
  }

  render(){}
}

let icon = tile(vec2(88,0),vec2(8),3)

const uiIcons = {
  input: icon.offset(vec2(0,0)),
  output: icon.offset(vec2(8,0)),
  prefered_output: icon.offset(vec2(16,0)),
  bidirectional: icon.offset(vec2(24,0)),
  prefered_bidirectional: icon.offset(vec2(32,0)),
}

class Machine extends EngineObject {
  static pipeConnections = {}
  static holeConnections = {}
  static spoutConnections = {}
  static liquidConnections = {}
  static size = vec2(2)

  constructor(pos,angle){
    super(pos)
    let machineClass = this.__proto__.constructor
    this.size = machineClass.size

    this.miningTime = 20
    if(!machineClass.unrotatable) this.angle = angle ?? 0
    /** @type {{[x: string]: PipeConnection}} */
    this.pipeConnections = {}
    for(let [port,[pos,angle]] of Object.entries(machineClass.pipeConnections)){
      let connection = new PipeConnection(this,port,pos,angle)
      connection.reRegisterGrid()
    }

    /** @type {{[x: string]: HoleConnection}} */
    this.holeConnections = {}
    for(let [port,[pos]] of Object.entries(machineClass.holeConnections)){
      let connection = new HoleConnection(this,port,pos)
      connection.reRegisterGrid()
    }

    /** @type {{[x: string]: LiquidConnection}} */
    this.spoutConnections = {}
    for(let [port,[pos]] of Object.entries(machineClass.spoutConnections)){
      let connection = new SpoutConnection(this,port,pos)
      connection.reRegisterGrid()
    }

    /** @type {{[x: string]: LiquidConnection}} */
    this.liquidConnections = {}
    for(let [port,[pos,size]] of Object.entries(machineClass.liquidConnections)){
      let connection = new LiquidConnection(this,port,pos,size)
      connection.reRegisterGrid()
    }

    MachineGrid.put(this)
  }

  static drawPreview(drawPos,drawAngle,color = new Color()){
    drawRect(drawPos,this.size,color,drawAngle)
    if(!this.unrotatable) drawRect(drawPos.add(vec2(this.size.x/2,0).rotate(-drawAngle)),vec2(0.5),color,PI/4)
    let roundedAngle = roundAngle(drawAngle)
    for(let port of Object.values(this.liquidConnections)){
      let [pos,size,offsetCopy] = port;   
      drawRect(
        drawPos
        .add(pos.rotate(-drawAngle)),
        size.subtract(vec2(0.25)),
        new Color().setHex("#3a3277"),
        drawAngle
      )
      if(offsetCopy){
        drawRect(
          drawPos
          .add((pos.add(offsetCopy)).rotate(-drawAngle)),
          size.subtract(vec2(0.25)),
          new Color().setHex("#3a3277"),
          drawAngle
        )
      }
    }
    for(let port of Object.values(this.pipeConnections)){
      let [pos,angle,icon] = port;   
      drawTile(
        drawPos
        .add(pos.rotate(-drawAngle))
        .add(vec2(1,0).rotate(-angle-drawAngle)),
        vec2(1),
        icon,
        undefined,
        angle+Math.floor(roundedAngle/PI*2+0.5)*PI/2
      )
    }
    for(let port of Object.values(this.holeConnections)){
      let [pos,icon] = port;   
      drawTile(
        drawPos
        .add(pos.rotate(-drawAngle)),
        vec2(1),
        icon.offset(vec2(0,8))
      )
    }
    for(let port of Object.values(this.spoutConnections)){
      let [pos] = port;   
      drawTile(
        drawPos
        .add(pos.rotate(-drawAngle)),
        vec2(1),
        tile(vec2(88,16),undefined,3)
      )
    }
  }

  destroy(){
    super.destroy();
    MachineGrid.clear(this);
  }

  drawSpriteSelf(tile){
    drawTile(this.pos,this.size,tile,this.color,this.angle,this.mirrror)
  }

  /**
   * @param {PipeConnection} port 
   * @param {Item} item 
   */
  recieveFrom(port,item,simulate = false){
    console.error("unimplemented!")
  }

  /**
   * @param {HoleConnection} hole 
   * @param {Item} item
   */
  dropIn(hole,item,simulate = false){
    console.error("unimplemented!")
  }

  /**
   * @param {HoleConnection} hole 
   * @returns {Item}
   */
  extract(hole,simulate = false){
    console.error("unimplemented!")
  }

  /**
   * @param {LiquidConnection} dripArea 
   * @param {Liquid} liquid 
   * @returns {boolean}
   */
  dripOn(dripArea,liquid,simulate = false){
    console.error("unimplemented!")
  }
}