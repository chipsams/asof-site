import van from "../lib/van-1.5.2.debug.js"
import { deserializeMachine, generateMachine, machineChoices, serializeMachine } from "./machine_creation.js"
import { templates } from "./machine_data.js"
import { displayPacket } from "../script.js"
import { deserializeMachineLayerData, serializeMachineLayerData } from "./serializer.js"

const {tags,state} = van
const {
  input,h2,div,textarea,span,button,br,
  ul,ol,li,a,p: paragraph,details,summary,
} = tags


/**
 * 
 * @typedef {{t:State<number>,maxT:State<number>,r:State<string>,amt:State<number>}} Core
 * 
 * @typedef {{
 *  materialCosts: [string,number][]
 *  id: string,
 *  desc: string[],
 *  processing: Core[],
 *  rate: State<number>,
 *  rateMult: State<number>,
 *  prod: State<number>,
 *  onResourceGain: ((m: Machine, r: string)=>boolean)?,
 *  onProcessingFinish: ((m: Machine, c: Core)=>void)?
 * }} Machine
 */

/** @type {State<Machine?>[]} */
export const machineGrid = new Array(16).fill().map(()=>state(null))

const sleep = t=>new Promise(r=>setTimeout(r,t))

const inventorySize = 8*3
/** @type {State<Machine?>[]} */
export const machineInventory = new Array(inventorySize).fill().map((_,i)=>state(null))


let machineSounds = {}
for(let machine in templates){
  if (machine.processingSound){
  }
}


function tickMachines(){
  let coreCountSound = {};

	for(let l=0;l<machineGrid.length;l++){
		let m = machineGrid[l].val
		if(!m) continue;
		if(m.t){
			m.t.val += 0.1
			if(m.t.val>=m.stats.interval.val){
				m.onIntervalFinish(m)
			}
		}
    if(m.template.processingSound) coreCountSound[m.template.processingSound]??={s:m.template.processingSound,c:0}
		if(m.processing) m.processing.forEach(core => {
			if(core.r.val == "") return;
      coreCountSound[m.template.processingSound].c += 1
			core.t.val+=0.1
			if(core.t.val>=core.maxT.val){
				m.onProcessingFinish(m,core)
			}
		});
	}

  for(let [_,data] of Object.entries(coreCountSound)){
    data.s.volume(data.c==0?0:Math.sqrt(data.c))
    data.s.rate(1+data.c/4)
  }
}
setInterval(tickMachines,100)

export function gatherResource(r,amt,elt){
	//console.log("gathering",r,amt,elt)
	for(let l=0;l<machineGrid.length;l++){
		let m = machineGrid[l].val
		if(m?.onResourceGain){
			if(m.onResourceGain(m,r,amt,elt)) return
		}
	}
	refineResource(r,amt,elt)
}
export function refineResource(r,amt,elt){
	//console.log("refining",r,amt,elt)
	for(let l=0;l<machineGrid.length;l++){
		let m = machineGrid[l].val
		if(m?.onResourceRefine){
			if(m.onResourceRefine(m,r,amt,elt)) return
		}
	}
	storeResource(r,amt,elt)
}
export function storeResource(r,amt,elt){
	//console.log("storing",r,amt,elt)
	displayPacket(r,amt,elt,document.getElementById(`store-${r}`))
	p.resources[r].val += amt
}

/** @type {State<{i:number,arr:Array<State<Machine?>>}?>} */

var grabbedLocation = state(null)
function grabbedMachine(){
	let data = grabbedLocation.val
	if(!data) return;
	return data.arr[data.i].val
}

function swap(a,b){
	[a.val,b.val] = [b.val,a.val]
}

function machineDrop(v,i,elt){
	if(grabbedLocation.val == null) return;

	let data = grabbedLocation.val
	swap(v,data.arr[data.i])

	grabbedLocation.val = null
}

function machineGrab(arr,i,elt){
	if(arr[i].val == null) return;
	grabbedLocation.val = {arr,i}
	document.addEventListener("mouseup",e=>{
		grabbedLocation.val = null
	},{once:true})
}

export function displayMachine(m,i,arr){
   return m==null?span("machine was null???"):div(
    {class:"machine-inner",
      title:()=>`Machine with quality: ${m.quality.val.toFixed(2)}\n` + 
      `${Object.entries(m.bias).map(([k,v])=>`${k}: ${Math.floor(v.val*100)}%`).join("\n")}`
    },(
		grabbedLocation.val &&
		grabbedLocation.val.i==i && 
		grabbedLocation.val.arr==arr
	)?"***":m.id,
	br,
	ul({class:"desc"},m.desc.map(v=>li(v))),
	m.template.stats.interval && div({class:"interval-timer"},
		()=>(m.t.val/m.stats.interval.val*99).toFixed(0),
		()=>div({
			class:"interval-indicator",
			style:()=>`right:${(m.t.val/m.stats.interval.val*100).toFixed(2)}%`
		},()=>(m.t.val/m.stats.interval.val*99).toFixed(0))
	),
	m.processing && div({class:"processing-cores"},
		m.processing.map(core=>core.elt)
	))
}

export function machineGridElement(){
	return div({class:"grid-machine"},
		machineGrid.map((v,i)=>div(
			{
				class: "machine",
				onmouseup:(e)=>machineDrop(v,i,e.target),
				onmousedown: (e)=>machineGrab(machineGrid,i,e.target)
			},
			()=>v.val?displayMachine(v.val,i,machineGrid):span()
		)),
	)
}

const mouse = {x:state(0),y:state(0)}
document.addEventListener("mousemove",(e)=>{[mouse.x.val,mouse.y.val] = [e.x,e.y]})

export function machineInventoryElement(){
	return div({class:"inventory-machine"},
		machineInventory.map((v,i)=>button({
			onmouseup:(e)=>machineDrop(v,i,e.target),
			onmousedown: (e)=>machineGrab(machineInventory,i,e.target)
		},()=>(
			grabbedLocation.val &&
			grabbedLocation.val.i==i && 
			grabbedLocation.val.arr==machineInventory
		)?"***":(v.val?.id??"_"))),
		()=>grabbedLocation.val?div({
			class: "mouse",
			style:()=>`
				left:${mouse.x.val+10}px;
				top:${mouse.y.val+10}px;
		`},grabbedMachine().id,grabbedMachine().desc.map(v=>div(v))):div(),
	)
}