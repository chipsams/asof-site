

function toOutput(object){
    if(typeof object == "number") return object;
    if(Array.isArray(object)) return object.map(v=>toOutput(v));
    if(object._mn){
        return object._mn({obj:object},...object.args?.map?.(toOutput)??[])
    }
    let dat = {
        type:object.type
    }
    if(object.args){
        for(let i in object.args){
            dat["param"+i] = toOutput(object.args[i])
        }
    }
    return dat
}

function clamp(v,l,u){
    return Math.min(Math.max(v,l),u)
}

function binarySearch(fn,min,max,guess=(min+max)/2){
    let bounds = [min,max]
    for(let l=0;l<11;l++){
        let oldGuess = guess
        let key = fn(guess)>0?0:1;
        [bounds[key],guess] = [guess,guess/2+bounds[1-key]/2]
        
        if(Math.abs(oldGuess - guess)<0.25) break
    }
    return guess
}

function draw(fn){
    let img = new ImageData(128,128)
    for(let z=0;z<128;z++){
        for(let x=0;x<128;x++){
            let [r,g,b] = fn(x,z)
            img.data[z*4*128+x*4] = r;
            img.data[z*4*128+x*4+1] = g;
            img.data[z*4*128+x*4+2] = b;
            img.data[z*4*128+x*4+3] = 255;
        }
    }
    /** @type {HTMLCanvasElement} */
    let canvas = document.getElementById("canvas");
    let ctx = canvas.getContext("2d");
    ctx.putImageData(img,0,0)
}
function preCompute(fn){
    let outputs=[]
    for(let z=0;z<128;z++){
        outputs[z]=[]
        for(let x=0;x<128;x++){
            outputs[z][x]=fn(x,z)
        }
    }
    return outputs
}

let codeArea = document.getElementById("code")
function rerun(){
    let code = codeArea.value

    try{
        let parsed = parseCode(code)
    
        let out = document.getElementById("output")
        out.value = JSON.stringify(toOutput(parsed),null,2)
            .replaceAll(/\[\s*\d+(\s*,\s*\d+)*\s*\]/g,(v)=>v.replaceAll(/\s/g,""))
            .replaceAll(/\{\s*"type"\s*:\s*"(\w+(?::\w+)?)"\s*(})?/g,'{"type":"$1"$2')
        
        if(settings["topology-view"]){
            let heights = preCompute((x,z)=>binarySearch((guess)=>evaluate({x:x+settings["offset-x"],z:z+settings["offset-z"],y:guess},parsed),-64,320))
            draw((x,z)=>{
                let height = heights[z][x]
                let inWater = height<settings["y-pos"]

                let darken = (heights[z-1]?.[x]??height)+(heights[z]?.[x-1]??height)-height*2
                if(darken<0) darken = 0
                let brighten = height*2-(heights[z-1]?.[x]??height)-(heights[z]?.[x-1]??height)
                if((brighten<0) || inWater) brighten = 0

                return [clamp((height+64)/384*255,0,255),0,inWater?128:0].map(v=>v+brighten*8-darken*8)
            })
        }else{
            draw((x,z)=>{
                let v = evaluate({x:x+settings["offset-x"],z:z+settings["offset-z"],y:settings["y-pos"]},parsed)
                return [Math.max(0,v*255),Math.max(0,-v*255),255]
            })
        }
    }catch(e){
        let out = document.getElementById("output")
        out.value = e
        draw((x,z)=>{
            return [clamp(x*2+Math.random()*20,0,255),z*2,255]
        })
        return;
    }
}

let settings = {}
function settingschanged(){
    rerun()
}

let settingsTab = document.getElementById("settings")
let settingInputsMap = {}
let settingInputs = [...settingsTab.querySelectorAll("[name]")]
let settingResets = [...settingsTab.querySelectorAll("[reset]")]

function parseSetting(e){
    switch(e.getAttribute("type")){
        case "range": return parseFloat(e.value)
        case "checkbox": return e.checked
        default: return e.value
    }
}

for(let setting of settingInputs){
    let name = setting.getAttribute("name")
    settings[name] = parseSetting(setting)
    settingInputsMap[name] = setting
    setting.addEventListener("input",()=>{
        settings[name] = parseSetting(setting)
        settingschanged()
    })
    settingschanged()
}
for(let reset of settingResets){
    let name = reset.getAttribute("reset")
    reset.addEventListener("click",event=>{
        settingInputsMap[name].value = reset.getAttribute("value")
        settings[name] = parseSetting(settingInputsMap[name])
        settingschanged()

    })

}

codeArea.addEventListener("input",e=>{
    rerun()
})
rerun()