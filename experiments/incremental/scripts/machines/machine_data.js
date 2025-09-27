import { gatherResource, refineResource, storeResource } from "./machines.js"
import { scrapData, scrapHit } from "../scrap.js"
import { displayPacket } from "../script.js"
import * as howl from "../lib/howler.js"

import van from "../lib/van-1.5.2.debug.js"

const {tags,state} = van
const {
  input,h2,div,textarea,span,button,br,
  ul,ol,li,a,p: paragraph,details,summary,
} = tags


const sample = t=>t[Math.floor(Math.random()*t.length)]

export const templates = {}

templates.harvester = {
	stats:{
		"tools":{
			char:"T",name:"Harm Capacity Of Tools",
			material: "metal", formula: (f,q)=>Math.round(4+5*f**1.5*q)
		},
		"interval":{
			char:"S",name:"Process Speed In Seconds",
			material:"silicon", formula: (f,q)=>20/(1+q*(f**2))
		},
		"productivity":{
			char:"P",name:"Bonus Production Multiplier",
			material:"silicon", formula: (f,q)=>1+f*q
		},
		"crit_chance":{
			char:"C",name:"Critical Chance",
			material:"concrete", formula: (f,q)=>1-0.9**(1+f*q)
		}
	},
  initView:(m)=>{
    m.viewData.critSample = state(0)
    m.viewData.crit = state(false)
  },
  renderView:(m)=>{
    return div(
      div({class:"interval-timer"},
        ()=>div({
          class:"interval-indicator",
          style:()=>`right:${m.t.val/m.stats.interval.val*100}%`
        },
          ()=>m.t.val.toFixed(2),"/",
          ()=>m.stats.interval.val.toFixed(2)
        ),
        span(
          ()=>m.t.val.toFixed(2),"/",
          ()=>m.stats.interval.val.toFixed(2)
        ),
      ),
      div({class:"crit-meter",style:()=>`--crit:${m.stats.crit_chance.val*100}%`},
        div({class:()=>m.viewData.crit.val?"crit-indicator success":"crit-indicator",style:()=>`right:${m.viewData.critSample.val*100}%`})
      ),
      m.viewData.crit
    )
  },
	nameGen:(stats,m)=>{
		return `LK${(m.stats.tools.val)}J${stats[0].char}`
	},
	descGen:(m)=>[
		`ON:TIMER[${m.stats.interval.val.toFixed(1)}T]`,
		`EXTRACT[${m.stats.tools.val}D]`,
		`x${m.stats.productivity.val.toFixed(1)}`
	],
	onIntervalFinish(m){
		let targets = scrapData.scrapGrid.filter(t=>t.res.val!=="none")
		if(targets.length > 0){
			let target = sample(targets)
			scrapHit(target,m.stats.tools.val,m.stats.crit_chance.val,(r,amt,elt,{critCheck,isCrit})=>{
        m.viewData.critSample.val = critCheck
        m.viewData.crit.val = isCrit
				if(r!=="none") gatherResource(r,amt*m.stats.productivity.val,elt)
			})
		}
		m.t.val = 0
	}
}

// role: repeatedly crushes mined resources, each repeat provides resources
templates.crusher = {
	stats:{
		"speed":{
			char:"S",name:"Process Speed In Seconds",
			material:"metal", formula: (f,q)=>30/(1+f*q*0.5)
		},"core_count":{
			char:"C",name:"Parallel Core Count",
			material:"concrete", formula: (f,q)=>Math.round(1+f*q/2)
		},"repeat_chance":{
			char:"P",name:"Probability Of Repetition",
			material:"metal", formula: (f,q)=>1-0.9**(1+f*q)
		}
	},
  processingSound: new Howl({src:["https://file.garden/Y-Og9h1-sFQYcqA1/"+"sfx/crushing.ogg"],loop:true,autoplay:true,volume:0}),
	nameGen:(stats,m)=>{
		return `${(m.stats.repeat_chance.val*100).toFixed(0)}%N${stats[2].char}W`
	},
  initView:(m)=>{
    m.viewData.blinker = div("a",Math.random().toFixed(2));
  },
  renderView:(m)=>{
    const squishAnim = ()=>{
      return (1-Math.abs(Math.sin(m.processing.reduce((t,b)=>t+b.t.val,0)*4+Math.PI/2)))/5
    }

    return div({class:"crusher"},
      div({class:"flex-row"},
        div({class:"crusher-side",style:()=>`flex-grow: ${squishAnim()}`},">"),
        div({class:"processing-cores",style:"flex-grow: 1"},m.processing.map(core=>core.elt)),
        div({class:"crusher-side",style:()=>`flex-grow: ${squishAnim()}`},"<")
      )
    )
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
			material:"metal", formula: (f,q)=>90/(1+f*q)
		},"core_count":{
			char:"C",name:"Parallel Core Count",
			material:"concrete", formula: (f,q)=>Math.round(1+f*q**1.2)
		},"productivity":{
			char:"P",name:"Bonus Production Modifier",
			material:"silicon", formula: (f,q)=>5*(1+f*q)
		}
	},
  processingSound: new Howl({src:["https://file.garden/Y-Og9h1-sFQYcqA1/"+"sfx/processing.ogg"],loop:true,autoplay:true,volume:0}),
	nameGen:(stats,m)=>{
		return `${stats[0].char}X${stats[1].char}F-${m.stats.core_count.val}`
	},
  renderView:(m)=>{
    const squishAnim = ()=>{
      return (1-Math.abs(Math.sin(m.processing.reduce((t,b)=>t+b.t.val,0)*4+Math.PI/2)))/5
    }

    return div({class:"processor"},
      div({class:"processor-entries"},div({class:"processor-grid"},m.processing.map(core=>core.elt))),
      div({class:"processor-stats"},
        div(`${m.stats.speed.val.toFixed(1)}T`),
        div(`${m.stats.productivity.val.toFixed(1)}x`),
      )
    )
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