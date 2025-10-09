
class Research {
  constructor(data){
    this.cost = data.cost
    this.buildings = data.buildings
  }

  draw(pos){
    ninePatch(pos.subtract(vec2(3)),vec2(6),tile(vec2(0),undefined,4))
    this.buildings.forEach((building,l) => {
      building.drawPreview(pos.offset(l*3,0),0)
    });
    Object.entries(this.cost).forEach(([material,count],l)=>{
      drawTile(pos.offset(l*1),undefined,items[material].sprite)
      drawText(material,pos.offset(l*1),undefined,new Color(1,0,0))
      drawText(count,pos.offset(l*1,-1),undefined,new Color(1,0,0))
    })
  }
}

let craftingBasics = new Research({
  cost: {"iron_ore": 5, "copper_ore": 5},
  buildings: [FuranceP_P,CrafterP_P],
  unlock: (player)=>{}
})

let craftingAdvanced = new Research({
  cost: {"piping": 20},
  buildings: [CrafterHH_P],
})

function researchRender(){
  return;
  craftingBasics.draw(cameraPos)
}