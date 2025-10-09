function lerpVec(t,a,b){
  return a.scale(1-t).add(b.scale(t))
}

function bezierVec(t,a,b,c){
  return lerpVec(
    t,
    lerpVec(t,a,b),
    lerpVec(t,b,c)
  )
}

class Drip extends EngineObject {
  constructor(startPos,height,endPos,liquid){
    super(startPos)
    this.liquid = liquid
    this.fallTime = 0
    this.startPos = startPos
    this.height = height
    this.endPos = endPos
  }

  update(){
    this.fallTime+=0.01
    this.pos = bezierVec(this.fallTime,this.startPos.offset(0,3),this.endPos.offset(0,this.height),this.endPos)
    if(this.fallTime>=1){
      let collectors = liquidConnectionGrid.intersecting(this.pos,vec2(1))
      if(collectors.length > 0){
        /** @type {LiquidConnection} */
        let collector = collectors[0]
        collector.parent.dripOn(collector,this.liquid)
      }
      this.destroy()
    }
  }

  render(){
    drawTile(this.pos.offset(0,this.fallTime),undefined,tile(vec2(48,80),undefined,2),this.liquid.getColor())
  }
}

class MixingTank {
  constructor(capacity = 200){
    /** @type {Liquid[]} */
    this.liquids = []
    this.filled = 0
    this.capacity = capacity
  }

  /**
   * 
   * @param {Liquid} liquid 
   * @param {*} simulate 
   * @returns {Liquid|undefined} if it returns undefined, that means it was able to put all the liquid in with no runoff.
   */
  fill(liquid,simulate = false){
    let fillLiquid
    for(let l=0;l<this.liquids.length;l++){
      if(this.liquids[l].id == liquid.id){
        fillLiquid = this.liquids[l]
      }
    }
    if(!fillLiquid){
      let l;
      for(let l=0;l<this.liquids.length;l++){
        if(liquids[this.liquids[l].id].density<this.liquids[liquid.id].density) break;
      }
      this.liquids.splice(l,0,fillLiquid = new Liquid(liquid.id,0))
    }
    
    if(this.filled + liquid.amount <= this.capacity){
      if(!simulate){
        this.filled+=liquid.amount;
        fillLiquid.amount+=liquid.amount
      }
      return undefined;
    }else{
      let transferAmount = Math.min(this.filled + liquid.amount,this.capacity)-this.filled
      console.log(transferAmount)
      let newLiquid = liquid.copy();
      if(!simulate){
        this.filled=this.capacity;
        fillLiquid.amount+=transferAmount;
      }
      newLiquid.amount -= transferAmount;
      return newLiquid;
    }
  }

  drain(amount){
    let liquids = [];
    while(amount > 0 && this.liquids.length > 0){
      if(this.liquids[0].amount>=amount){
        this.filled -= amount
        liquids.push(this.liquids[0].extract(amount))
        amount = 0
      }else{
        let liquid = this.liquids.shift()
        this.filled -= liquid.amount
        liquids.push(liquid)
        amount -= liquid.amount
      }
    }
    return liquids
  }

  getColor(){
    let color = new Color(0,0,0);
    this.liquids.forEach(liquid=>{
      let scaled = liquid.getColor().scale(liquid.amount/this.filled)
      color = color.add(scaled)
    })
    color.a = this.filled/this.capacity
    return color
  }
}

class LiquidPool {
  constructor(connections){
    this.owner = connections[0].parent;
    this.connections = connections;
    this.connections.forEach(connections=>connections.manager = this)

    this.tank = new MixingTank(1000);
  }

  dripOn(connection,liquid,simulate = false){
    return this.tank.fill(liquid,simulate)
  }
}

class Spout extends EngineObject {
  static sprayAreas = [
    [vec2(-4,0),vec2(3,1)]
  ]

  static tile = tile(vec2(40,80),vec2(8,24),2)

  constructor(owner){
    super()

    /** @type {SpoutConnection} */
    this.parent;
    owner.addChild(this,vec2())
    owner.spout = this
    
    this.tileInfo = this.__proto__.constructor.tile

    this.size = vec2(1)

    this.liquid = Math.random()>0.5?"oil":"water"
  }

  update(){
    super.update();
    this.renderOrder = 10000-this.pos.y;
  }

  render(){
    drawTile(this.pos.offset(0,this.tileInfo.size.y/16-0.25),this.tileInfo.size.scale(0.125),this.tileInfo)
  }

  spray(liquid){
    let [pos,area] = this.__proto__.constructor.sprayAreas[0]
    let targetPos = this.pos.offset(
      randInt(pos.x-area.x/2,pos.x+area.x/2+1),
      randInt(pos.y-area.y/2,pos.y+area.y/2+1)
    )

    new Drip(this.pos,8,targetPos,liquid)
  }
}