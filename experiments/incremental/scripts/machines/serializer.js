import { deserializeMachine, machineChoices, serializeMachine } from "./machine_creation.js";
import { machineGrid, machineInventory } from "./machines.js";

/**
 * @argument {State<Machine?>[]} l 
 * @returns {ReturnType<serializeMachine>[]} */
function serializeMachineList(l){
    return l.map(v=>v.val?serializeMachine(v.val):null)
}


function deserializeMachineList(dstList,l){
    for(let i in dstList){
        dstList[i].val = l[i]?deserializeMachine(l[i]):null
    }
}

export function serializeMachineLayerData(){
    let serializedData = {
        inventory: serializeMachineList(machineInventory),
        grid: serializeMachineList(machineGrid),
        choices: {
            choices: serializeMachineList(machineChoices)
        }
    }
    console.log(JSON.stringify(serializedData,(k,v)=>typeof v == "number"?v.toFixed(4):v))
    return serializedData;
}
setTimeout(serializeMachineLayerData,0)

/**
 * 
 * @param {ReturnType<serializeMachineLayerData} data 
 */
export function deserializeMachineLayerData(data){
    deserializeMachineList(machineInventory,data.inventory)
    deserializeMachineList(machineGrid,data.grid)
    deserializeMachineList(machineChoices,data.choices.choices)
}

window.serializeMachineLayerData = serializeMachineLayerData
window.deserializeMachineLayerData = deserializeMachineLayerData