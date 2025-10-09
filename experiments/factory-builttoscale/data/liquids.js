
function itemSprite(x,y){
  return tile(vec2(8*x,16*y),vec2(8,8),1)
}

/** @type {{[x: string]: {sprite: TileInfo}}} */
let liquids = {
  "oil": {
    color: new Color().setHex("#000000"),
    density: 20,
  },
  "water": {
    color: new Color().setHex("#6772a9"),
    density: 50
  }
}

class Liquid {
  constructor(id,amount){
    this.id = id
    this.amount = amount
    if(!liquids[this.id]) console.error("no liquid with id",id)
  }

  copy(){
    return new Liquid(this.id,this.amount)
  }

  extract(amount,simulate = false){
    if(amount > this.amount) console.error("tried to extract more liquid than existed!")
    if(!simulate) this.amount -= amount
    return new Liquid(this.id,amount)
  }

  getColor(){
    return liquids[this.id].color;
  }
}
