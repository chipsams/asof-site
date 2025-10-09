
function itemSprite(x,y){
  return tile(vec2(8*x,16*y),vec2(8,8),1)
}

/** @type {{[x: string]: {sprite: TileInfo}}} */
let items = {
  "copper_ore": {
    sprite: itemSprite(0,0)
  },
  "copper_plate": {
    sprite: itemSprite(1,0)
  },
  "copper_wire": {
    sprite: itemSprite(2,0)
  },
  "iron_ore": {
    sprite: itemSprite(0,1)
  },
  "iron_ingot": {
    sprite: itemSprite(1,1)
  },
  "iron_gear": {
    sprite: itemSprite(2,1)
  },
  "metal_scrap": {
    sprite: itemSprite(0,2)
  },
  "circuit": {
    sprite: itemSprite(0,3)
  },
  "piping": {
    sprite: itemSprite(1,3)
  },
}

class Item {
  constructor(id){
    this.id = id
    if(!items[this.id]) console.error("no item with id",id)
  }

  draw(pos){
    drawTile(pos,undefined,items[this.id].sprite)
  }

  drawTiny(pos){
    drawTile(pos,undefined,items[this.id].sprite.offset(vec2(0,8)))
  }
}
