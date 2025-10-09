
var recipes = {
  smelting: [],
  crafting: [
    undefined,
    [],
    []
  ]
}

function addSmelting(input,output,craftTime = 60){
  recipes.smelting.push({inputs:[input],outputs:[output],craftTime})
}

function addCrafting(inputs,output,byproduct,craftTime = 360){
  recipes.crafting[inputs.length].push({inputs,outputs:[output],byproduct,craftTime})
}

addSmelting("copper_ore","copper_plate")
addSmelting("iron_ore","iron_ingot")

addCrafting(["copper_ore"],"copper_plate","metal_scrap",10)
addCrafting(["copper_plate"],"copper_wire","metal_scrap")
addCrafting(["iron_ingot"],"iron_gear","metal_scrap")

addCrafting(["iron_ingot","copper_wire"],"circuit","copper_wire")
addCrafting(["iron_ore","copper_ore"],"circuit","copper_wire")

