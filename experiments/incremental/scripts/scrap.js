import { p } from "./script.js";
import van from "./lib/van-1.5.2.debug.js"
import { gatherResource } from "./machines/machines.js";

const {tags,state} = van
const {
  input,h2,div,textarea,span,button,br,
  ul,ol,li,a,p: paragraph,details,summary,
} = tags

let tileKinds = ["metal","silicon","concrete","none"]
export const scrapGrid = new Array(64).fill().map(_=>{
    let v = {
        res: state("none"),
        hp: state(0)
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
    
    let isCrit = Math.random()<crit
    
    v.elt.animate({scale:isCrit?[1.5,0.8,1.1,0.9]:[1.1,0.9]},isCrit?300:100)
    if(v.res.val == "none") return;
    
    let effDmg = dmg * (isCrit?4:1)
    v.hp.val -= effDmg
    if(v.hp.val<=0){
        if(intercept){
            intercept(v.res.val,1,v.elt)
        }else{
            gatherResource(v.res.val,1,v.elt)
        }
        v.hp.val = 0;
        v.res.val = "none";
    }
}

const sleep = t=>new Promise(r=>setTimeout(r,t))
let holding = false

export async function resetScrapGrid(){
    let delay = 300
    for(let tile of scrapGrid){
        await sleep(delay)
        delay *= 0.95
        tile.res.val = tileKinds[Math.floor(Math.random()*tileKinds.length)]
        tile.hp.val = tile.res.val == "none"?0:Math.round(Math.random()*6+7)
    }
}

export function scrapGridElement(){
    return div(
        div({class:"grid-scrap"},
            scrapGrid.map(v=>v.elt),
        ),
        button({onclick:resetScrapGrid},"reset")
    )
}