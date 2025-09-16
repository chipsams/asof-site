import { deserializeMachineLayerData, serializeMachineLayerData } from "./machines/serializer.js";
import { p } from "./script.js";

function generateSave(){
    let save = {}
    save.machines = serializeMachineLayerData()
    save.resources = {
        metal: p.resources.metal.val,
        silicon: p.resources.silicon.val,
        concrete: p.resources.concrete.val
    }
    return save
}

/**
 * 
 * @param {ReturnType<generateSave>} save 
 */
function loadSave(save){
    console.log("loading",save)
    if(save.machines) deserializeMachineLayerData(save.machines)
    if(save.resources){
        for(let r in save.resources){
            console.log(r,save.resources[r])
            p.resources[r].val = save.resources[r];
        }
    }
}

setInterval(()=>{
    //console.log("generating save")
    let save = generateSave()
    //console.log("saving")
    localStorage.setItem("save",JSON.stringify(save))
    //console.log("saved")
},1000)

let save = localStorage.getItem("save")
if(save) try {
    save = JSON.parse(save)
    loadSave(save)
} catch(e){
    console.error(e)
}