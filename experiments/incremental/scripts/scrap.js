import { p } from "./script.js";
import van from "./lib/van-1.5.2.debug.js"
import { gatherResource } from "./machines/machines.js";
import * as howl from "./lib/howler.js"

var sounds = new Howl({
  src: "https://file.garden/Y-Og9h1-sFQYcqA1/"+"sfx/hit-noises.ogg",
  sprite: {
    h1: [0, 1000],
    h2: [1000, 1000],
    h3: [2000, 1000],
    h4: [3000, 1000],
    h5: [4000, 1000],
  }
})


const {tags,state} = van
const {
  input,h2,div,textarea,span,button,br,
  ul,ol,li,a,p: paragraph,details,summary,
} = tags

let tileKinds = ["metal","silicon","concrete","none"]

export const scrapData = {}
scrapData.depth = state(0)
scrapData.scrapGrid = new Array(64).fill().map(_=>{
	let v = {
		res: state("none"),
		hp: state(0),
    baseHP: 1
	}
	v.elt = div({
			class:()=>`resource ${v.res.val??"none"}`,
			onmouseenter:async (e)=>{
				if(holding){
					let interval = setInterval(()=>{scrapHit(v)},100)
					e.target.addEventListener("mouseleave",e=>{clearInterval(interval)})
				}
			},
			onmousedown:async (e)=>{
				scrapHit(v)
				let interval;
				let timeout = setTimeout(()=>{
					interval = setInterval(()=>{scrapHit(v)},100)
					holding = true
				},1000)
				e.target.addEventListener("mouseleave",e=>{clearInterval(interval)})
				document.addEventListener("mouseup",e=>{
					clearTimeout(timeout)
					clearInterval(interval)
					holding = false
				},{once:true})
			}
		},
		span(v.res),div({class:"hp"},v.hp)
	)
	return v
})

export function scrapHit(v,dmg=1,crit=0.1,intercept){
	
  let critCheck = Math.random()
	let isCrit = critCheck<crit

  

  let offX = Math.round(Math.random()*10-5)
  let offY = Math.round(Math.random()*10-5)
	
	v.elt.animate({
    "z-index":1,
    scale:isCrit?[1.5,0.8,1.1,0.9]:[1.1,0.9],
    translate:[`${offX}px ${offY}px`,"0px 0px"]
  },isCrit?300:100)
	if(v.res.val == "none") return;
	
	let effDmg = dmg * (isCrit?4:1)
	v.hp.val -= effDmg

  let data = {isCrit,critCheck,offX,offY}

	if(v.hp.val<=0){
		if(intercept){
			intercept(v.res.val,1,v.elt,data)
		}else{
			gatherResource(v.res.val,1,v.elt)
		}
		v.hp.val = 0;
		v.res.val = "none";
	}else{
		if(intercept) intercept("none",0,v.elt,data)
  }

  let soundId = "h"+Math.floor(Math.random()*5+1)
  let id = sounds.play(soundId)
  let remainingHpFraction = v.hp.val/v.baseHP
  let dealtHpFraction = effDmg/v.baseHP 
  sounds.rate((1+3*remainingHpFraction)/(1+dealtHpFraction*4),id)

  if(isCrit){
    for(let l=1;l<=2;l++)setTimeout(()=>{
      let id = sounds.play(soundId)
      let remainingHpFraction = v.hp.val/v.baseHP
      let dealtHpFraction = effDmg/v.baseHP 
      sounds.rate((1+3*remainingHpFraction)/(1+dealtHpFraction*4)/(1+l/3),id)
      sounds.volume(1-l*0.25,id)
    },l*1500)
  }
}

const sleep = t=>new Promise(r=>setTimeout(r,t))
let holding = false

export async function fillScrapGrid(depth,flip){
	
	scrapData.scrapGrid.forEach(async (tile,i)=>{
		await sleep((flip?i%8:7-i%8)*50+Math.random()*100)

		tile.res.val = tileKinds[Math.floor(Math.random()*tileKinds.length)]
		tile.hp.val = tile.res.val == "none"?0:Math.round(2+Math.random()*Math.ceil(depth/2)+depth)
    tile.baseHP = tile.hp.val
	})
}

export function changeDepth(d) {
	if(scrapData.depth.val<=0 && d<0) return;
	scrapData.depth.val += d
	fillScrapGrid(scrapData.depth.val,d<0)
	
}

export function scrapGridElement(){
	return div(
		div({class:"grid-scrap"},
			scrapData.scrapGrid.map(v=>v.elt),
		),
		div({class:"depth-controls"},
			button({onclick:()=>changeDepth(-1),disabled:()=>scrapData.depth.val==0},"<"),
			scrapData.depth,
			button({onclick:()=>changeDepth(+1)},">"),
		)
	)
}