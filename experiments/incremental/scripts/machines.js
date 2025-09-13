let gridWidth = 4
import van from "./lib/van-1.5.2.debug.js"

const {tags,state} = van
const {
  input,h2,div,textarea,span,button,br,
  ul,ol,li,a,p: paragraph,details,summary,
} = tags

export const machineGrid = new Array(16).fill().map(()=>state({machine:"none"}))

export function tickMachines(){
    machineGrid.forEach(m=>{

    })
}

function machineClick(v,elt){

}

export function machineGridElement(){
    return div({class:"grid-machine"},
        machineGrid.map(v=>()=>div(
            {
                class: "machine",
                onclick:(e)=>machineClick(v,e.target)
            },
            span(v.val.machine)
        )),
    )
}