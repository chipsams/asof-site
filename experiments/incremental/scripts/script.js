import { scrapData, scrapGridElement } from "./scrap.js"
import van from "./lib/van-1.5.2.debug.js"
import { machineGrid, machineGridElement, machineInventory, machineInventoryElement } from "./machines/machines.js"
import { machineChoices, machinePlanElement } from "./machines/machine_creation.js"
import { generateSave, loadSave, saveTimer, saveToBrowser } from "./saving.js"

const {tags,state} = van
const {
	input,h2,div,textarea,span,button,br,
	ul,ol,li,a,p: paragraph,details,summary,
} = tags

// scrap structures
// create new structures, with benefits for each object placed into the structure
// (e.g. scrap multipliers, automation, boosting adjacent objects)

export const p = {
	scrap: scrapData,
	machines: {
		machineGrid,
		machineChoices,
		machineInventory
	},
	resources: {
		metal: state(0),
		silicon: state(0),
		concrete: state(0)
	}
}

/**
 * 
 * @param {string} r 
 * @param {number} amt 
 * @param {HTMLElement} fElt 
 * @param {HTMLElement} tElt 
 */
export function displayPacket(r,amt,fElt,tElt){
	//console.log(fElt,tElt)
	let packet = div({
		class: [r,"packet"].join(" ")
	},amt.toFixed(1))
	document.body.appendChild(packet)
	let fRect = fElt.getBoundingClientRect()
	let tRect = tElt.getBoundingClientRect()
	let [fx,tx,fy,ty] = [
		(fRect.left+fRect.right)/2,
		(tRect.left+tRect.right)/2,
		(fRect.top+fRect.bottom)/2,
		(tRect.top+tRect.bottom)/2
	]
	packet.animate({
		left:[fx+"px",tx+"px"],
		top:[fy+"px",ty+"px"]
	},{duration:200,easing:"ease-out"}).onfinish=()=>packet.remove()
}


window.p = p

function tickingDisplay(v){
	let temp = state(v.val)
	setInterval(() => {
		let dir = Math.sign(v.val-temp.val)
		temp.val += dir * Math.min(Math.abs(v.val-temp.val),1+Math.abs(v.val-temp.val)*0.46)
	}, 100);
	return span(()=>temp.val.toFixed(1))
}


van.add(document.body,div({class:"main"},
	div({class:"element-row"},
		scrapGridElement(),
		div(
				machineGridElement(),
				machineInventoryElement(),
		)
	),
	div({class:"element-row"},
		div(Object.entries(p.resources).map(([res,v])=>div({id:`store-${res}`,class:`ticker ${res}`},res,":",tickingDisplay(v)))),
		machinePlanElement(),
	),
	div({class:"bottom-row"},
		button({onclick:()=>{saveToBrowser()}},"save game ",()=>`(${saveTimer.val}s since last)`),
		button({onclick:()=>{loadSave({})}},"reset save"),
		button({onclick:()=>alert(JSON.stringify(generateSave()))},"export save"),
		button({onclick:()=>{
			let save = prompt("input a valid save")
			try {
				loadSave(JSON.parse(save))
			}catch(e){
				console.error(e)
			}
		}},"import save")
	)
))