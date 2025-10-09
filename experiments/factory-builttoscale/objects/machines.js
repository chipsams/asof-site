
let corePipesConnections = {}
for(let l=0;l<4;l++){
  let sidePos = l>1?l-1:l-2
  corePipesConnections["a"+l] = [vec2(sidePos,-2),0.5*PI,uiIcons.input]
  corePipesConnections["b"+l] = [vec2(-2,sidePos),1.0*PI,uiIcons.input]
  corePipesConnections["c"+l] = [vec2(sidePos, 2),1.5*PI,uiIcons.input]
  corePipesConnections["d"+l] = [vec2( 2,sidePos),2.0*PI,uiIcons.input]
}

class Core extends Machine {
  static size = vec2(5)

  static pipeConnections = corePipesConnections
  static unrotatable = true

  constructor(pos){
    super(pos,0)

    this.tileInfo = tile(vec2(208,176),vec2(5*8))
  }

  recieveFrom(port,item,simulate = false){
    return true;
  }
}

class Producer extends Machine {
  static pipeConnections = {
    output: [vec2(0,0),0,uiIcons.output]
  }
  static size = vec2(1)

  constructor(pos,angle){
    super(pos,angle)
    this.tileInfo = tile(vec2(128,32),vec2(24,24))
    this.itemId = "circuit";
  }

  recieveFrom(port,item,simulate = false){
    return false;
  }

  update(){
    super.update();
    let [connectedMachine,port] = this.pipeConnections.output.getMachine();
    if(connectedMachine){
      let success = connectedMachine.recieveFrom(port,new Item(this.itemId))
      if(success){
      }
    }
  }

  render(){
    super.render();
    drawTile(this.pos,undefined,items[this.itemId].sprite)
  }
}

class Miner extends Machine {
  static pipeConnections = {
    output: [vec2(1,0),0,uiIcons.output]
  }
  static size = vec2(3)

  constructor(pos,angle){
    super(pos,angle)
    this.tileInfo = tile(vec2(128,32),vec2(24,24))
    this.creationTimer = 0;
    let potentialItems = ["iron_ore","copper_ore"]
    this.itemId = potentialItems[randInt(0,potentialItems.length)];
  }

  recieveFrom(port,item,simulate = false){
    return false;
  }

  update(){
    super.update();
    this.creationTimer++;
    if(this.creationTimer>=60){
      let [connectedMachine,port] = this.pipeConnections.output.getMachine();
      if(connectedMachine){
        let success = connectedMachine.recieveFrom(port,new Item(this.itemId))
        if(success){
          this.creationTimer-=60;
        }
      }
    }
  }

  render(){
    super.render();
    drawTile(this.pos,undefined,items[this.itemId].sprite)
  }
}

function findRecipe(table,machineInputs){
  if(machineInputs.some(i=>{
    return i && !i.content
  })) return;
  recipeloop: for(let recipe of table){
    //console.log("checking",recipe,machineInputs)
    let {inputs} = recipe
    for(let l=0;l<inputs.length;l++){
      //console.log("ingredient",l,inputs[l], machineInputs[l]?.content?.id)
      if(inputs[l] !== machineInputs[l].content?.id) continue recipeloop;
    }
    //console.log("found!",recipe)
    return recipe;
  }
}

class Destroyer extends Machine {
  static pipeConnections = {
    input: [vec2(1,0),0,uiIcons.input]
  }
  static size = vec2(3)

  constructor(pos,angle){
    super(pos,angle)
    this.tileInfo = tile(vec2(128,32),vec2(24,24))
    //this.pipeConnections.input = new PipeConnection(this,"input",vec2(1,0),0)
  }

  recieveFrom(port,item,simulate = false){
    return true;
  }

  update(){
    super.update();
  }
}

class BigDestroyer extends Machine {
  static pipeConnections = {
    a: [vec2(0,-1),PI,uiIcons.input],
    b: [vec2(0,0),PI,uiIcons.input],
    c: [vec2(0,1),PI,uiIcons.input]
  }
  static size = vec2(1,3)

  constructor(pos,angle){
    super(pos,angle)
    this.tileInfo = tile(vec2(128,16),vec2(8,24),2)
  }

  recieveFrom(port,item,simulate = false){
    return true;
  }

  update(){
    super.update();
  }
}

class Crafter extends Machine {
  constructor(pos,angle){
    super(pos,angle)
    this.craftingInputs = [];
    this.craftingOutputs = [];
    this.craftTime = 0;
    this.recipeTable;
    this.recipeDone;
    this.renderOrder = 5
  }

  

  update(){
    super.update();
    if(this.inventoryChanged){
      this.inventoryChanged = false

      if(this.recipeDone){
        if(this.craftingOutputs.every(o=>!o.content)){
          this.recipeDone = false
          this.recipe = undefined
        }
      }

      let recipe = findRecipe(this.recipeTable,this.craftingInputs)
      if(recipe !== this.recipe){
        // both starts AND cancels recipes!
        this.recipe = recipe;
        this.craftTime = recipe?.craftTime ?? 0;
      }

    }
    if(this.recipe){
      if(this.craftTime--<=0 && !this.recipeDone){
        if(this.recipe.outputs.every((item,i)=>{
          return this.craftingOutputs[i].insertOther(new Item(item),true)
        })){
          this.craftingInputs.forEach(input=>{
            input.extract(undefined)
          })
          this.recipe.outputs.forEach((item,i)=>{
            this.craftingOutputs[i].insertOther(new Item(item))
          })
          this.recipeDone = true;
        }
      }
    }
  }

  progress(){
    if(!this.recipe) return 0
    return clamp(1-this.craftTime/this.recipe.craftTime,0,1)
  }

  render(){
    super.render();
    let size = resolveRotatedSize(this.size.rotate(-this.angle)).scale(0.5)
    let posA = vec2(-size.x,-0.1-size.y)
    let posB = vec2(lerp(this.progress(),-size.x,size.x),-0.1-size.y)
    drawLine(this.pos.add(posA),this.pos.add(posB))
  }

  recieveFrom(port,item,simulate = false){
    if(port.manager){
      let success = port.manager.recieveFrom(port,item,simulate)
      if(success && !simulate) this.inventoryChanged = true
      return success
    }
    console.error("unimplemented")
  }
  dropIn(hole,item,simulate = false){
    if(hole.manager){
      let success = hole.manager.dropIn(hole,item,simulate)
      if(success && !simulate) this.inventoryChanged = true
      return success
    }
    console.error("unimplemented")
  }
  extract(hole,simulate = false){
    if(hole.manager){
      let success = hole.manager.extract(hole,simulate)
      if(success && !simulate) this.inventoryChanged = true
      return success
    }
    console.error("unimplemented")
  }
}

class Furance extends Crafter {
  static holeConnections = {
    fuel: [vec2(-1,-0.5),uiIcons.input],
    smelt: [vec2(0,0.5),uiIcons.bidirectional]
  }
  static size = vec2(3,2)

  constructor(pos,angle){
    super(pos,angle)
    this.recipeTable = recipes.smelting
    this.tileInfo = tile(vec2(88,32),vec2(24,16))
    this.smeltingSlot = new AccessHatch(this.holeConnections.smelt)
    this.craftingInputs.push(this.smeltingSlot)
    this.craftingOutputs.push(new AccessHatch(this.holeConnections.fuel))
  }

  render(){
    super.render()
    this.craftingInputs.forEach(o=>o.draw())
    this.craftingOutputs.forEach(o=>o.draw())
  }
}

class FuranceP_P extends Crafter {
  static pipeConnections = {
    input: [vec2(-0.5,0.5),PI,uiIcons.input],
    output: [vec2(0.5,0.5),0,uiIcons.output]
  }
  static size = vec2(2)

  constructor(pos,angle){
    super(pos,angle)
    this.recipeTable = recipes.smelting
    this.tileInfo = tile(vec2(88,56),vec2(16))
    this.craftingInputs.push(this.jointInput = new PipeJoint([this.pipeConnections.input]))
    this.craftingOutputs.push(this.jointOutput = new PipeJoint([this.pipeConnections.output]))
  }

  update(){
    super.update();
    this.jointOutput.update();
  }

  render(){
    super.render()
  }
}

class CrafterP_P extends Crafter {
  static pipeConnections = {
    input: [vec2(-0.5,0),PI*0.5,uiIcons.input],
    output: [vec2( 0.5,0),PI*0.5,uiIcons.output]
  }
  static size = vec2(2,1)

  constructor(pos,angle){
    super(pos,angle)

    this.recipeTable = recipes.crafting[1]
    this.tileInfo = tile(vec2(32,32),vec2(16,8))

    this.craftingInputs.push(this.jointInput = new PipeJoint([this.pipeConnections.input]))
    this.craftingOutputs.push(this.jointOutput = new PipeJoint([this.pipeConnections.output]))
  }

  update(){
    super.update();
    this.jointOutput.update();
  }

  render(){
    super.render();
  }
}

class CrafterHH_P extends Crafter {
  static pipeConnections = {
    x: [vec2(1,0),PI*0.5,uiIcons.prefered_bidirectional],
    y: [vec2(1,0),PI*1.5,uiIcons.bidirectional]
  }

  static holeConnections = {
    a: [vec2(-1,0),uiIcons.input],
    b: [vec2(0,0),uiIcons.input]
  }
  static size = vec2(3,1)

  constructor(pos,angle){
    super(pos,angle)

    this.recipeTable = recipes.crafting[2]
    this.tileInfo = tile(vec2(0,56),vec2(24,8))
    this.inlayPipe = new PipeJoint([this.pipeConnections.x,this.pipeConnections.y])

    this.craftingInputs = [
      new AccessHatch(this.holeConnections.a),
      new AccessHatch(this.holeConnections.b)
    ]

    this.craftingOutputs = [this.inlayPipe]
  }

  update(){
    super.update();
    this.inlayPipe.update();
  }

  render(){
    super.render();
    this.craftingInputs.forEach(o=>o.draw())
  }
}

class Wall extends Machine {
  static size = vec2(2)

  constructor(pos){
    super(pos)
    this.wall = true
  }

  render(){
    let baseTile = tile(vec2(0,224))
    for(let l=0;l<=3;l++){
      let angle = -PI/2*l
      let tilePos = this.pos.add(vec2(0.5).rotate(angle))
      let spriteOffset = 0;
      [
        vec2(-1,1),
        vec2(0,1),
        vec2(1,1),
        vec2(1,0),
        vec2(1,-1),
      ].forEach((offset,i)=>{
        let checkPos = tilePos.add(offset.rotate(angle))
        if(MachineGrid.intersecting(checkPos)[0]?.wall){
          spriteOffset += 2**i
        }
      })
      drawTile(tilePos,undefined,baseTile.offset(vec2(spriteOffset*8,l*8)))
    }
  }
}

class Wall3x3 extends Machine {
  static size = vec2(3)
  
  constructor(pos){
    super(pos)
    this.wall = true
  }

  render(){
    drawTile(this.pos,undefined,tile(vec2(248,224)))
    let baseTile = tile(vec2(0,224))
    for(let l=0;l<=3;l++){
      let angle = -PI/2*l
      let tilePos = this.pos.add(vec2(1).rotate(angle))
      let spriteOffset = 0;
      [
        vec2(-1,1),
        vec2(0,1),
        vec2(1,1),
        vec2(1,0),
        vec2(1,-1),
      ].forEach((offset,i)=>{
        let checkPos = tilePos.add(offset.rotate(angle))
        if(MachineGrid.intersecting(checkPos)[0]?.wall){
          spriteOffset += 2**i
        }
      })
      drawTile(tilePos,undefined,baseTile.offset(vec2(spriteOffset*8,l*8)))
    }
    for(let l=0;l<=3;l++){
      let angle = -PI/2*l
      let tilePos = this.pos.add(vec2(1,0).rotate(angle))
      let spriteOffset = 3;
      [
        vec2(1,1),
        vec2(1,0),
        vec2(1,-1),
      ].forEach((offset,i)=>{
        let checkPos = tilePos.add(offset.rotate(angle))
        if(MachineGrid.intersecting(checkPos)[0]?.wall){
          spriteOffset += 2**(i+2)
        }
      })
      drawTile(tilePos,undefined,baseTile.offset(vec2(spriteOffset*8,l*8)))
    }
  }
}

class Pumpjack extends Machine {
  static size = vec2(4,2)

  static unrotatable = true
  
  static spoutConnections = {
    output: [vec2(-1.5,0.5)]
  }

  constructor(pos,angle){
    super(pos,angle)
    this.tileInfo = tile(vec2(160,32),vec2(32,16))
  }

  update(){
    super.update();
    
    if(this.spoutConnections.output.spout && frame%60==0){
      this.spoutConnections.output.spout.spray(new Liquid("oil",500))
    }
  }
}

class LiquidCollector extends Machine {
  static size = vec2(3)

  static liquidConnections = {
    a: [vec2(-0.5,1),vec2(2,1),vec2(0,-0.5)],
    b: [vec2(0,-0.5),vec2(3,2)]
  }

  static spoutConnections = {
    output: [vec2(1,1)]
  }

  constructor(pos,angle){
    super(pos,angle)
    this.tileInfo = tile(vec2(96,80),vec2(24),2)
    this.pool = new LiquidPool([this.liquidConnections.a,this.liquidConnections.b])

    this.outputTimer = 0
  }

  update(){
    super.update();
    this.outputTimer += Math.max(this.pool.tank.capacity/4,this.pool.tank.filled);
    if(this.outputTimer >= this.pool.tank.capacity*16){
      this.outputTimer -= this.pool.tank.capacity*16

      if(this.spoutConnections.output.spout){
        let liquids = this.pool.tank.drain(Math.max(50,Math.floor(this.pool.tank.filled*0.15)))
        for(let liquid of liquids){
          this.spoutConnections.output.spout.spray(liquid)
        }
      }
    }
  }
  
  dripOn(connection,liquid,simulate = false){
    if(connection.manager) return connection.manager.dripOn(connection,liquid,simulate)
    super.dripOn(connection,liquid,simulate)
  }

  render(){
    super.render()
    drawTile(this.pos,vec2(3),tile(vec2(120,80),vec2(24),2),this.pool.tank.getColor(),this.angle)
    for(let l=0;l<this.pool.tank.liquids.length;l++){
      let liquid = this.pool.tank.liquids[l]
    }
  }
}