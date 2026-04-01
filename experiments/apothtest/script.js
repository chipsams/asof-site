

// density, clarity, light, value, natural, red, green, blue
const VEC_SIZE = 8
class ItemVector {
    constructor(...args){
        if(args.length == 0){
            this.values = new Array(VEC_SIZE).fill(0)
        }else{
            if(args.length != VEC_SIZE) throw new Error(`invalid vector size ${args.length}`)
            this.values = args
        }
    }
    length(){
        return Math.sqrt(this.values.map(v=>v*v).reduce((a,b)=>a+b))
    }
    normalized(){
        let l = this.length()
        return new ItemVector(...this.values.map(v=>v/l)).nanCheck()
    }
    nanCheck(){
        
        if(this.values.some(v=>Number.isNaN(v))) throw new Error("nan!")
        return this
    }
    dot(v){
        return this.values.map((ax,i)=>ax*v.values[i]).reduce((a,b)=>a+b)
    }
    sum(...vectors){
        let v = new ItemVector(...this.values)
        //console.log(v.values)
        for(let i in this.values) v.values[i]+=this.values[i]
        //console.log(v.values)
        for(let addV of vectors){
            addV.nanCheck()
            for(let i in addV.values) v.values[i]+=addV.values[i]
            //console.log(v.values)
        }
        return v.nanCheck()
    }
    toString(){
        return "["+this.values.map(v=>v.toFixed(2)).join(",")+"]"
    }
}

function parsergb(color){
    
    return [
        parseInt(color.slice(1,3),16)/255,
        parseInt(color.slice(3,5),16)/255,
        parseInt(color.slice(5,7),16)/255
    ]
}

let colors = {
    black: "#000000",
    white: "#ffffff",
    red: "#ff0000",
    orange: "#ff8800",
    yellow: "#ffff00",
    green: "#00ff00",
    blue: "#0000ff",
    cyan: "#00ffff",
    magenta: "#ff00ff"
}

let items = []
let itemMap = {}
class Item {
    constructor(name,density,clarity,light,value,natural,color){
        this.name = name
        this.color = color
        this.vec = new ItemVector(density,clarity,light,value,natural,...parsergb(color).map(v=>v*2-1))
        items.push(this)
        itemMap[name] = this
    }

    buildingBlocks(){
        return {
            base: this,
            organized: new Item(this.name+"_organized",
                ...this.vec.sum(new ItemVector(0,-0.1,0.1,0,-0.5,0,0,0)).values.slice(0,5),this.color),
            keystone: new Item(this.name+"_keystone",
                ...this.vec.sum(new ItemVector(0,0.1,0.1,0,-0.6,0,0,0)).values.slice(0,5),this.color)
        }
    }

    /**
     * 
     * @param {HTMLElement} e 
     */
    fillElement(e,shortened){
        e.style.backgroundColor = this.color;
        e.style.color = `hsl(from ${this.color} 0deg 0% calc(calc(calc(l) * -1000) + 500) )`;
        if(shortened){
            let length = 10
            let splitText = this.name.split("_")
            let pieceLength = Math.ceil(length/splitText.length)
            let st = ""
            for(let i in splitText){
                st += splitText[i][0].toUpperCase()
                st += splitText[i].slice(1,1+Math.ceil((length-st.length)/(splitText.length-i)))
            }
            e.innerText = st
        }else{
            e.innerText = this.name;
        }
        e.setAttribute("item",this.name)
        e.setAttribute("title",this.name)
    }
}

for(let [name,color] of Object.entries(colors)){
    new Item(`${name}_cloth`,0.3,0.7,0.7,0.3,0.7,color);
}
for(let [name,color] of Object.entries(colors)){
    new Item(`${name}_concrete`,0.7,0.9,0.5,0.1,-0.5,color);
}

//const ITM_stone = new Item("stone",0.9,-0.2,0.2,0.1,0.4,"#767676").buildingBlocks()
const ITM_cobblestone = new Item("cobblestone", 0.8,0.0,0.3,-0.3,0.3,"#767676").buildingBlocks()
const ITM_mossstone =   new Item("moss_stone",  0.8,-0.2,0.2,0.1,0.7,"#51694a").buildingBlocks()
const ITM_planks =      new Item("planks",      0.3,-0.4,0.3,0.2,0.6,"#e1c596").buildingBlocks()
const ITM_dirt =        new Item("dirt",        0.3,0.1,0.4,-1.0,0.6,"#615136").buildingBlocks()
const ITM_glass =       new Item("glass",       0.3,1.0,0.8,0.3,0.0,"#a7c6ce").buildingBlocks()
const ITM_gold =        new Item("gold",        1.0,0.1,0.9,0.9,0.2,"#fff30a").buildingBlocks()
const ITM_steel =       new Item("steel",       2.0,-0.3,-0.2,0.6,-1.0,"#4c4c69").buildingBlocks()
const ITM_metal =       new Item("metal",       1.5,-0.2,0.1,0.4,-0.3,"#5f4d43").buildingBlocks()
const ITM_cupric =      new Item("cupric",      0.7,-0.1,0.2,0.3,-0.3,"#b28e40").buildingBlocks()
const ITM_diamond =     new Item("diamond",     0.9,0.8,1.0,1.0,0.2,"#00d9ff")
const ITM_overgrowth =  new Item("overgrowth",  0.8,0.1,-0.1,0.2,0.8,"#46ac65")
const ITM_flower =      new Item("flower",      0.3,0.7,0.8,0.2,0.9,"#e21e1e")
const ITM_pickaxe =     new Item("pickaxe",     1.1,0.3,0.2,0.8,-0.5,"#4c3c69")
const ITM_trowel =      new Item("trowel",      0.5,0.2,0.5,0.6,-0.4,"#624f87")
const ITM_bucket =      new Item("bucket",      0.8,0.4,0.3,0.7,-0.6,"#3e2c60")

const ITM_cart = new Item("cart",0.7,0.7,0.2,0.4,-0.3,"#5f4d43")
const ITM_rail = new Item("rail",0.1,0.7,0.2,0.4,-0.3,"#e1c596")
const ITM_rail_powered = new Item("power_rail",0.2,0.9,0.5,0.8,-0.3,"#fff30a")

/**
 * 
 * @param  {...Item} input 
 * @returns {Item[]}
 */
function craft(...input){
    let vector = new ItemVector().sum(...input.map(v=>v.vec))
    vector = vector.normalized()
    console.log("output vector",vector)
    let rankedItems = []
    for(let item of items){
        let score = vector.dot(item.vec.normalized())
        console.log(item.name,score)
        rankedItems.push([score,item])
    }
    return rankedItems.sort(([a,_1],[b,_2])=>a-b)
    //console.log(input.map(v=>v.name).join(" + "),"=",rankedItems.map(v=>v[0].toFixed(4)+" "+v[1].name).slice(-5))
}

let list = document.getElementById("item-list")

for(let item of items){
    let elt = document.createElement("button")
    elt.draggable = true
    elt.addEventListener("dragstart",(ev)=>{
        ev.dataTransfer.setData("text/plain",item.name)
    })
    elt.addEventListener("click",ev=>{
        if(ev.shiftKey){
            let elt = inputs.filter(e=>e.innerHTML=="")[0]
            if(elt) item.fillElement(elt,true)
            updateCrafts()
        }
    })
    item.fillElement(elt)
    list.append(elt)
}

let inputs = [...document.querySelectorAll("#inputs > div")]
let outputs = [...document.querySelectorAll("#outputs > div")]

const generateHash = (string) => {
  let hash = 0;
  for (const char of string) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0; // Constrain to 32bit integer
  }
  return hash;
}

function updateCrafts(){
    console.log("recrafting")
    let items = inputs.map(v=>itemMap[v.getAttribute("item")]).filter(t=>t)
    if(new Set(items).size<2){
        console.log("not enough distinct inputs",items)
        
        for(let output of outputs){
            output.innerHTML = ""
            output.style = ""
        }
        return;
    }
    let newItem = craft(...items)//.filter(i=>items.indexOf(i[1])===-1)
    console.log(items)
    let hash = generateHash(items.map(i=>i.name).sort((a,b)=>a.localeCompare(b)).join("_"))
    console.log(hash)
    
    console.log(newItem);
    for(let [i,elt] of Object.entries(outputs)){
        elt.style = "";
        newItem.at(-1-i)[1].fillElement(elt,true);
    elt.innerHTML += "<br>"+newItem.at(-1-i)[0].toFixed(4)
    }

    let range = outputs.length
    outputs[((hash%range)+range)%range].style.outline = "4px solid yellow"
}

function clearSlots(){
    for(let input of inputs){
        input.innerHTML = ""
        input.removeAttribute("item")
        input.removeAttribute("title")
        input.style = ""
    }
    updateCrafts()
}
document.getElementById("clearSlots").onclick = clearSlots

for(let input of inputs){
    input.addEventListener("dragover", (event) => {
        event.preventDefault();
    })
    input.addEventListener("drop", (event) => {
        event.preventDefault();
        const data = event.dataTransfer.getData("text/plain");
        itemMap[data].fillElement(input,true);
        updateCrafts();
    });
}