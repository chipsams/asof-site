import { gatherResource, refineResource, storeResource } from "./machines.js"
import { scrapGrid, scrapHit } from "../scrap.js"
import { displayPacket } from "../script.js"

const sample = t=>t[Math.floor(Math.random()*t.length)]

export const templates = {}

templates.harvester = {
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
            material:"silicon", formula: (f,q)=>1+f*q
        },
        "crit_chance":{
            char:"C",name:"Critical Chance",
            material:"concrete", formula: (f,q)=>1-(0.8^(f*10*q))
        }
    },
    nameGen:(stats,m)=>{
        return `LK${(m.stats.tools.val)}J${stats[0].char}`
    },
    descGen:(m)=>[
        `ON:INTERVAL[${m.stats.interval.val.toFixed(1)}T]`,
        `EXTRACT[${m.stats.tools.val}D]`,
        `x${m.stats.productivity.val.toFixed(1)}`
    ],
    onIntervalFinish(m){
        scrapHit(sample(scrapGrid),m.stats.tools.val,m.stats.crit_chance.val,(r,amt,elt)=>{
            gatherResource(r,amt*m.stats.productivity.val,elt)
        })
        m.t.val = 0
    }
}

// role: repeatedly crushes mined resources, each repeat provides resources
templates.crusher = {
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
    descGen:(m)=>[
        "ON:EXTRACT",
        `PROC[${m.stats.speed.val.toFixed(1)}T ${m.stats.core_count.val}C]`,
        `REPROC: ${(m.stats.repeat_chance.val*100).toFixed(0)}%`
    ],
    onResourceGain(m,r,amt,elt){
        for(let core of m.processing){
            if(core.r.val !== "") continue;
            displayPacket(r,amt,elt,core.mainElt)
            core.t.val = 0
            core.r.val = r
            core.amt.val = amt
            return true;
        }
    },
    onProcessingFinish(m,core){
        refineResource(core.r.val,core.amt.val,core.mainElt)
        core.t.val = 0
        if(Math.random()>m.stats.repeat_chance.val) core.r.val = ""
    }
}

// role: processes mined/crushed ores, applying a 5x multiplier, then productivity. base time is a full minute.
templates.processor = {
    stats:{
        "speed":{
            char:"S",name:"Process Speed In Seconds",
            material:"metal", formula: (f,q)=>3/(1+f*q)
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
    descGen:(m)=>[
        "ON:REFINE",
        `PROC[${m.stats.speed.val.toFixed(1)}T ${m.stats.core_count.val}C]`,
        `x${m.stats.productivity.val.toFixed(1)}`
    ],
    onResourceRefine(m,r,amt,elt){
        for(let core of m.processing){
            if(core.r.val !== "") continue;
            displayPacket(r,amt,elt,core.mainElt)
            core.t.val = 0
            core.r.val = r
            core.amt.val = amt
            return true;
        }
    },
    onProcessingFinish(m,core){
        storeResource(core.r.val,core.amt.val*m.stats.productivity.val,core.mainElt)
        core.t.val = 0
        core.r.val = ""
        core.amt.val = 0
    }
}

for(let slug in templates){
    templates[slug].slug = slug;
}