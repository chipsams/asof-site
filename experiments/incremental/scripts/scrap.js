import { p } from "./script.js";
import van from "./lib/van-1.5.2.debug.js"

const {tags,state} = van
const {
  input,h2,div,textarea,span,button,br,
  ul,ol,li,a,p: paragraph,details,summary,
} = tags

let tileKinds = ["metal","silicon","concrete","none"]
export const scrapGrid = new Array(64).fill().map(v=>({
    res: state(tileKinds[Math.floor(Math.random()*tileKinds.length)]),
    hp: state(10)
}))

function scrapHit(v,elt){
    
    let crit = Math.random()>0.5
    
    elt.animate({scale:crit?[1.5,0.8,1.1,0.9]:[1.1,0.9]},crit?300:100)
    if(v.res.val == "none") return;
    
    let dmg = crit?4:1
    p.resources[v.res.val].val += Math.min(v.hp.val,dmg)
    v.hp.val -= dmg
    if(v.hp.val<=0){ v.hp.val = 0; v.res.val = "none" }
}

export function scrapGridElement(){
    return div({class:"grid-scrap"},
        scrapGrid.map(v=>()=>div(
            {
                class:()=>`resource ${v.res.val??"none"}`,
                onclick:(e)=>scrapHit(v,e.target)
            },
            span(v.res),div({class:"hp"},v.hp)
        )),
    )
}