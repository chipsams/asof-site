import { deserializeMachineLayerData, serializeMachineLayerData } from "./machines/serializer.js";
import { p } from "./script.js";
import van from "./lib/van-1.5.2.debug.js"
const { state } = van


export function generateSave(){
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
export function loadSave(save){
	console.log("loading",save)
	deserializeMachineLayerData(save.machines ?? {})
	for(let r in p.resources){
		p.resources[r].val = save.resources?.[r] ?? 0;
	}
}

export function saveToBrowser(){
	  saveTimer.val = 0
	  //console.log("generating save")
	  let save = generateSave()
	  //console.log("saving")
	  localStorage.setItem("save",JSON.stringify(save))
	  //console.log("saved")

}

export const saveTimer = state(0)
setInterval(()=>{
	saveTimer.val++;
	if(saveTimer.val>=5){
	  saveToBrowser()
	}
},1000)

document.addEventListener("DOMContentLoaded",e=>{
  let save = localStorage.getItem("save")
  if(save) try {
	  save = JSON.parse(save)
	  loadSave(save)
  } catch(e){
	  console.error(e)
	  loadSave({}``)
  }
})