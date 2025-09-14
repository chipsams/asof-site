let gridWidth = 4
let dirs = [-gridWidth,-1,1,gridWidth]
import van from "./lib/van-1.5.2.debug.js"
import { scrapGrid, scrapHit } from "./scrap.js"

const sample = t=>t[Math.floor(Math.random()*t.length)]

/**
 * @typedef {{t:State<number>,maxT:number,d:State<string>}} Core
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

const {tags,state} = van
const {
  input,h2,div,textarea,span,button,br,
  ul,ol,li,a,p: paragraph,details,summary,
} = tags

/** @type {State<Machine?>[]} */
export const machineGrid = new Array(16).fill().map(()=>state(null))
const inventorySize = 8*3
/** @type {State<Machine?>[]} */
export const machineInventory = new Array(inventorySize).fill().map((_,i)=>state(null))

function addMachine(m){
    m = {...m}
    for(let v of machineInventory){
        if(v.val == null){v.val = m; break}
    }
}

/** @returns {Core} */
function createCore(){
    return {t:state(0),maxT:20,d:state(""),amt:state(0)}
}




function tickMachines(){
    for(let l=0;l<machineGrid.length;l++){
        let m = machineGrid[l].val
        if(!m) continue;
        if(m.t){
            m.t.val += 0.1
            if(m.t.val>=m.stats.interval.val){
                m.onIntervalFinish(m)
            }
        }
        if(m.processing) m.processing.forEach(core => {
            if(core.d.val == "") return;
            core.t.val+=0.1
            if(core.t.val>=core.maxT){
                m.onProcessingFinish(m,core)
            }
        });
    }
}
setInterval(tickMachines,100)

export function gatherResource(r,amt){
    console.log("gathering",r,amt)
    for(let l=0;l<machineGrid.length;l++){
        let m = machineGrid[l].val
        if(m?.onResourceGain){
            if(m.onResourceGain(m,r,amt)) return
        }
    }
    refineResource(r,amt)
}
export function refineResource(r,amt){
    console.log("refining",r,amt)
    for(let l=0;l<machineGrid.length;l++){
        let m = machineGrid[l].val
        if(m?.onResourceRefine){
            if(m.onResourceRefine(m,r,amt)) return
        }
    }
    storeResource(r,amt)
}
export function storeResource(r,amt){
    console.log("storing",r,amt)
    p.resources[r].val += amt
}

/** @type {State<{i:number,arr:Array<State<Machine?>>}?>} */

var grabbedLocation = van.state(null)
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

function displayMachine(m,i,arr){
   return div({class:"machine-inner"},(
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
        m.processing.map((core,i)=>div(
            {
                class:()=>"core "+core.d.val,
                style:`--p:${core.t.val/core.maxT}`,
                onmousedown:(e)=>{
                    storeResource(core.d.val,core.amt.val)
                    core.d.val="";
                    core.amt.val=0;
                    core.t.val=0;
                    e.stopPropagation()
                }
            },
            ()=>(core.t.val/core.maxT*9).toFixed(0),
        ))
    ))
}


let harvesterTemplate = {
    stats:{
        "tools":{
            char:"T",name:"Harm Capacity Of Tools",
            material: "metal", formula: (f,q)=>Math.round(5+4*f**1.5*q)
        },
        "interval":{
            char:"S",name:"Process Speed In Seconds",
            material:"silicon", formula: (f,q)=>1/(1+f*q*0.4)
        },
        "productivity":{
            char:"P",name:"Bonus Production Multiplier",
            material:"silicon", formula: (f,q)=>4*(1+f*q)
        },
        "crit_chance":{
            char:"C",name:"Critical Chance",
            material:"concrete", formula: (f,q)=>1-(0.8^(f*10*q))
        }
    },
    nameGen:(stats,m)=>{
        return `LK${(m.stats.tools.val)}J${stats[0].char}`
    },
    processing:(r,c)=>new Array(c).fill().map(createCore),
    descGen:(m)=>[
        `ON:INTERVAL[${m.stats.interval.val.toFixed(1)}T]`,
        `EXTRACT[${m.stats.tools.val}D]`,
        `x${m.stats.productivity.val.toFixed(1)}`
    ],
    onIntervalFinish(m){
        scrapHit(sample(scrapGrid),m.stats.tools.val,m.stats.crit_chance.val,(r,amt)=>{
            gatherResource(r,amt*m.stats.productivity.val)
        })
        m.t.val = 0
    }
}

// role: repeatedly crushes mined resources, each repeat provides resources
let crusherTemplate = {
    stats:{
        "speed":{
            char:"S",name:"Process Speed In Seconds",
            material:"metal", formula: (f,q)=>10/(1+f*q*0.5)
        },"core_count":{
            char:"C",name:"Parallel Core Count",
            material:"concrete", formula: (f,q)=>Math.round(1+f*q)
        },"repeat_chance":{
            char:"P",name:"Probability Of Repetition",
            material:"metal", formula: (f,q)=>1-0.9**(1+f*q)
        }
    },
    nameGen:(stats,m)=>{
        return `${(m.stats.repeat_chance.val*100).toFixed(0)}%N${stats[2].char}W`
    },
    processing:(r,c)=>new Array(c).fill().map(createCore),
    descGen:(m)=>[
        "ON:EXTRACT",
        `PROC[${m.stats.speed.val.toFixed(1)}T ${m.stats.core_count.val}C]`,
        `REPROC: ${(m.stats.repeat_chance.val*100).toFixed(0)}%`
    ],
    onResourceGain(m,r,amt){
        for(let core of m.processing){
            if(core.d.val !== "") continue;
            core.t.val = 0
            core.d.val = r
            core.amt.val = amt
            core.maxT = m.stats.speed.val
            return true;
        }
    },
    onProcessingFinish(m,core){
        refineResource(core.d.val,core.amt.val)
        core.t.val = 0
        if(Math.random()>m.stats.repeat_chance.val) core.d.val = ""
    }
}

// role: processes mined/crushed ores, applying a 5x multiplier, then productivity. base time is a full minute.
let processorTemplate = {
    stats:{
        "speed":{
            char:"S",name:"Process Speed In Seconds",
            material:"metal", formula: (f,q)=>60/(1+f*q)
        },"core_count":{
            char:"C",name:"Parallel Core Count",
            material:"concrete", formula: (f,q)=>Math.round(1+f*q)
        },"productivity":{
            char:"P",name:"Bonus Production Modifier",
            material:"silicon", formula: (f,q)=>5*(1+f*q)
        }
    },
    nameGen:(stats,m)=>{
        return `${stats[0].char}X${stats[1].char}F-${m.stats.core_count.val}`
    },
    processing:(r,c)=>new Array(c).fill().map(createCore),
    descGen:(m)=>[
        "ON:REFINE",
        `PROC[${m.stats.speed.val.toFixed(1)}T ${m.stats.core_count.val}C]`,
        `x${m.stats.productivity.val.toFixed(1)}`
    ],
    onResourceRefine(m,r){
        for(let core of m.processing){
            if(core.d.val !== "") continue;
            core.t.val = 0
            core.d.val = r
            core.maxT = m.stats.speed.val
            return true;
        }
    },
    onProcessingFinish(m,core){
        p.resources[core.d.val].val+=1*10*m.stats.productivity.val
        core.t.val = 0
        core.d.val = ""
    }
}

function generateMachine(template,quality){
    console.log(template)

    quality = state(quality)

    let bias = {}
    let total = 0
    for(let stat in template.stats){
        let value = Math.random()
        bias[stat] = state(value)
        total += value
    }

    let effectiveStats = {}
    for(let stat in template.stats){
        bias[stat].val /= total
        effectiveStats[stat] = van.derive(()=>template.stats[stat].formula(quality.val,bias[stat].val))
    }
    
    let orderedStats = Object.entries(bias).sort(([_1,v1],[_2,v2])=>v2.val-v1.val)
    orderedStats = orderedStats.map(([key])=>template.stats[key])
    let machine = {}

    machine.template = template
    machine.materialCosts = [
        [orderedStats[0].material,Math.ceil(quality.val**1.2*5)],
        [orderedStats[1].material,Math.ceil(quality.val**1.1*5)]
    ]
    let [c1,c2] = machine.materialCosts;
    if(c1[0] == c2[0]){
        c1[1] += c2[1]
        delete machine.materialCosts[1];
    }

    machine.bias = bias
    machine.stats = effectiveStats
    if(template.stats.interval) machine.t = state(0)
    if(template.stats.core_count) machine.processing = new Array(machine.stats.core_count.val).fill().map(createCore)
    machine.onResourceGain = template.onResourceGain
    machine.onResourceRefine = template.onResourceRefine
    machine.onIntervalFinish = template.onIntervalFinish
    machine.onProcessingFinish = template.onProcessingFinish
    machine.id = template.nameGen(orderedStats,machine)
    machine.desc = template.descGen(machine)
    return machine
}

let templateSorts = [harvesterTemplate,crusherTemplate,processorTemplate]

/** @type {State<Machine?>[]} */
let options = [
    van.state(generateMachine(sample(templateSorts),1)),
    van.state(generateMachine(sample(templateSorts),1)),
    van.state(generateMachine(sample(templateSorts),1))
]

function displayCost(cost){
    let [material,amount] = cost
    return div({class:()=>["cost",material,p.resources[material].val<amount && "unbuyable"].join(" ")},`${material} x${amount}`)
}

export function machinePlanElement(){
    return div({class:"machine-trading"},
        "select",
        options.map((o,i)=>()=>div(
            displayMachine(o.val,i,options),
            div({class:"trade-purchaser"},
                button({onclick:()=>{
                    if(o.val.materialCosts.some(v=>p.resources[v[0]].val<v[1])) return;
                    o.val.materialCosts.forEach(v=>p.resources[v[0]].val-=v[1])
                    for(let v of machineInventory) if(v.val == null){v.val = o.val; break}
                    options.forEach(o=>o.val = generateMachine(sample(templateSorts),Math.random()*2+2))
                }},"choose"),
                div({class:"trade-costs"},o.val.materialCosts.map(v=>displayCost(v)))
            )
        ))
    )
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
        `},()=>grabbedMachine()?.id):div()
    )
}