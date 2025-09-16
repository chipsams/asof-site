import van from "../lib/van-1.5.2.debug.js"
import { displayMachine, machineInventory } from "./machines.js"

function displayCore(core){
    return div({
            class:()=>"core "+core.r.val,
            style:()=>`--p:${core.t.val/core.maxT.val}`,
            onmousedown:(e)=>{
                storeResource(core.r.val,core.amt.val,core.mainElt)
                core.r.val="";
                core.amt.val=0;
                core.t.val=0;
                e.stopPropagation()
            }
        },
        ()=>(core.t.val/core.maxT.val*9).toFixed(0),
    )
}

/** @returns {Core} */
export function createCore(machine){
    let core = {
        t:state(0),
        maxT:van.derive(()=>machine.stats.speed.val),
        r:state(""),
        amt:state(0)
    }
    let elt = displayCore(core)
    core.mainElt = elt
    core.refElt = ()=>displayco(core)
    core.elt = ()=>{
        elt.remove()
        return elt
    }
    return core
}

const {tags,state} = van
const {
  input,h2,div,textarea,span,button,br,
  ul,ol,li,a,p: paragraph,details,summary,
} = tags

import { templates } from "./machine_data.js"

const sample = t=>t[Math.floor(Math.random()*t.length)]

/** @typedef {import("./machines.js").Machine} Machine */

/**
 * 
 * @param {Machine} machine 
 * @returns 
 */
export function serializeMachine(machine){
    console.log(machine)
    let flatData = {
        slug:machine.template.slug,
        quality:machine.quality.val,
        stats:Object.fromEntries(Object.entries(machine.bias).map(([k,v])=>[k,v.val])),
        processing: machine.processing?.map?.(c=>({
                r:c.r.val,
                amt:c.amt.val,
                t:c.t.val
        })??undefined)
    }
    return flatData
}

function deRef(o){
    return Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v.val]))
}

/**
 * 
 * @param {ReturnType<serializeMachine>} data 
 */
export function deserializeMachine(data){
    let template = templates[data.slug]
    let machine = generateMachine(template,data.quality,data)
    if(data.processing){
        data.processing.forEach((core,i)=>{
            console.log(deRef(machine.processing[i]),"<-",core)
            setTimeout(()=>{
                machine.processing[i].r.val = core.r
                machine.processing[i].amt.val = core.amt
                machine.processing[i].t.val = core.t
                console.log("outputting:",machine.processing[i])
                console.log(deRef(machine.processing[i]),"<-",core)
            },0)
        })
    }
    return machine
}

export function generateMachine(template,quality,existingData){
    //console.log(template)
    
    let machine = {}

    machine.quality = state(quality)

    let bias = {}
    let total = 0
    for(let stat in template.stats){
        let value = Math.random()
        bias[stat] = state(value)
        total += value
    }

    let effectiveStats = {}
    //console.log(existingData?.stats)
    for(let stat in template.stats){
        bias[stat].val /= total
        //console.log(existingData?.stats?.[stat],bias[stat].val,stat)
        if(existingData?.stats?.[stat]) bias[stat].val = existingData.stats[stat]
        effectiveStats[stat] = van.derive(()=>template.stats[stat].formula(machine.quality.val,bias[stat].val))
    }
    //console.log(bias)
    
    let orderedStats = Object.entries(bias).sort(([_1,v1],[_2,v2])=>v2.val-v1.val)
    orderedStats = orderedStats.map(([key])=>template.stats[key])
    

    machine.template = template
    machine.materialCosts = [
        [orderedStats[0].material,Math.ceil(machine.quality.val**1.2*5)],
        [orderedStats[1].material,Math.ceil(machine.quality.val**1.1*5)]
    ]
    let [c1,c2] = machine.materialCosts;
    if(c1[0] == c2[0]){
        c1[1] += c2[1]
        delete machine.materialCosts[1];
    }

    machine.bias = bias
    machine.stats = effectiveStats
    if(template.stats.interval) machine.t = state(0)
    if(template.stats.core_count) machine.processing = new Array(machine.stats.core_count.val).fill().map(()=>createCore(machine))
    machine.onResourceGain = template.onResourceGain
    machine.onResourceRefine = template.onResourceRefine
    machine.onIntervalFinish = template.onIntervalFinish
    machine.onProcessingFinish = template.onProcessingFinish
    machine.id = template.nameGen(orderedStats,machine)
    machine.desc = template.descGen(machine)
    return machine
}

let templateSorts = Object.values(templates)

/** @type {State<Machine?>[]} */
export const machineChoices = [
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
        machineChoices.map((o,i)=>()=>div(
            displayMachine(o.val,i,machineChoices),
            div({class:"trade-purchaser"},
                button({onclick:()=>{
                    if(o.val.materialCosts.some(v=>p.resources[v[0]].val<v[1])) return;
                    o.val.materialCosts.forEach(v=>p.resources[v[0]].val-=v[1])
                    for(let v of machineInventory) if(v.val == null){v.val = o.val; break}
                    machineChoices.forEach(o=>o.val = generateMachine(sample(templateSorts),Math.random()*2+2))
                }},"choose"),
                div({class:"trade-costs"},o.val.materialCosts.map(v=>displayCost(v)))
            )
        ))
    )
}