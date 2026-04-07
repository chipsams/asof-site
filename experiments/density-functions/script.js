let depth = 0
let toks = []

const simpleWrap = (fn,extraprops,...argNames)=>{
    return {_fn:fn,_mn:(ctx,...args)=>{
        if(typeof extraprops == "string") extraprops = {type:extraprops}
        let dat = Object.assign({},extraprops)
        for(let l=0;l<args.length;l++){
            dat[argNames[l]] = args[l]
        }
        return dat
    }}
}

let constants = {
    x: {type:"moredfs:x"},
    y: {type:"moredfs:y"},
    z: {type:"moredfs:z"}
}

let methods = {
    perlin:simpleWrap((_,x,y,sX,sY)=>noise.perlin2(x/sX,y/sY),
        "noise","x","z","scale_x","scale_z"),
    distance:simpleWrap((_,a,b)=>Math.sqrt(a.map((v,i)=>v-b[i]).reduce((a,b)=>a+b*b,0)),
        {type:"moredfs:distance",distance_metric:{type:"euclidian"}},"points1","points2"),
    clamp:(_,v,u,l)=>Math.max(Math.min(v,u),l),
    clamp01:(_,v)=>Math.max(Math.min(v,1),0),
    clamp11:(_,v)=>Math.max(Math.min(v,1),-1),
    floor:simpleWrap((_,v)=>Math.floor(v),"moredfs:floor","argument"),
    ceil:simpleWrap((_,v)=>Math.ceil(v),"moredfs:ceil","argument"),
    round:simpleWrap((_,v)=>Math.round(v),"moredfs:round","argument"),
    sin:simpleWrap((_,v)=>Math.sin(v),"moredfs:sin","argument"),
    cos:simpleWrap((_,v)=>Math.cos(v),"moredfs:cos","argument"),
    abs:simpleWrap((_,v)=>Math.abs(v),"minecraft:abs","argument"),
    ceil:(_,v)=>Math.ceil(v),
    sign:(_,v)=>Math.sign(v),
    lerp:(_,a,b,t)=>(1-t)*a+b*t,
}

function binaryFormat(type,p1="argument1",p2="argument2"){
    return (_,a,b)=>({type:type,[p1]:a,[p2]:b})
}

const simple = (ctx,a,b)=>({type:ctx.obj.type,"paramter1":a,"paramter2":b})

let binaryOperators = {
    "<": {_mn:()=>({"not":"implemented :("}),_fn:(_,a,b)=>a>b?1:0,prec:0},
    ">": {_mn:()=>({"not":"implemented :("}),_fn:(_,a,b)=>a<b?1:0,prec:0},
    "*": {_mn:binaryFormat("minecraft:mul"),_fn:(_,a,b)=>a*b,prec:1},
    "/": {_mn:binaryFormat("moredfs:div","numerator","denominator"),_fn:(_,a,b)=>a/b,prec:1},
    "%": {_mn:binaryFormat("moredfs:mod","numerator","denominator"),_fn:(_,a,b)=>(a%b+b)%b,prec:1},
    "+": {_mn:binaryFormat("minecraft:add"),_fn:(_,a,b)=>a+b,prec:2},
    "-": {_mn:binaryFormat("moredfs:subtract"),_fn:(_,a,b)=>a-b,prec:2},
}

function debugify(...args){
    //return;
    console.log("=|".repeat(depth),...args)
    console.log("=|".repeat(depth),toks.join(" "))
}

function expectAndShift(toks,symbol){
    if(toks.shift() !== symbol) throw new Error(`expected ${symbol}!`)
}

function parseValList(toks){
    depth++
    let values = [parseExpr(toks)]
    while(toks.at(0)==","){
        debugify("comma")
        expectAndShift(toks,",")
        values.push(parseExpr(toks))
    }
    depth--
    return values
}

/** @param {string[]} toks */
function parseVal(toks){

    let data = {};
    
    if(toks.at(0) == "("){
        debugify("parsing bracketed")
        expectAndShift(toks,"(")
        data = parseExpr(toks)
        if(toks.shift()!==")") throw new Error("unclosed (!! (bracketed expression)")
        debugify("done parsing bracketed")
        return data;
    }

    if(toks.at(0) == "["){
        debugify("parsing array")
        expectAndShift(toks,"[")
        data = parseValList(toks)
        if(toks.shift()!=="]") throw new Error("unclosed [!! (array)")
        debugify("done parsing array")
        return data;
    }
    
    if(/^([0-9])+(.([0-9])+)?$/.test(toks.at(0)??"")){
        return parseFloat(toks.shift())
    }

    if(/^[a-z][a-z_0-9]*(?::[a-z_0-9]+)?$/.test(toks.at(0)??"")){
        let tok = toks.shift()
        if(toks.at(0)=="("){
            debugify("parsing function",tok)
            expectAndShift(toks,"(")
            let args = parseValList(toks)
            if(toks.shift()!==")") throw new Error("unclosed )!! (function parameters)")
                debugify("done parsing function",tok)
            if(typeof methods[tok] == "function") throw new Error("used old function "+tok)
            return {type:"function:"+tok,args:args,_fn:methods[tok]._fn,_mn:methods[tok]._mn}
        }else{
            return {type:"constant:"+tok,_autogen:"yes",_fn:(ctx)=>ctx[tok],_mn:()=>{
                console.log(tok,constants[tok])
                return constants[tok]
            }}
        }
    }

    throw new Error("expected a value!")
}

function parseMonad(toks){
    if(toks.at(0)=="-"){
        toks.shift()
        return {
            type:"moredfs:negate",
            args:[parseMonad(toks)],
            _fn:(_,v)=>Array.isArray(v)?v.map(v=>-v):-v,
            _mn:(_,a)=>({type:"moredfs:negate",argument:a})}
    }
    return parseVal(toks)
}

/** @param {string[]} toks */
function parseExpr(toks,prec = 2){
    let value = prec>0?parseExpr(toks,prec-1):parseMonad(toks)
    while(binaryOperators[toks.at(0)]?.prec == prec){
        let op = toks.shift()
        debugify("parsing op",op)
        let value2 = prec>0?parseExpr(toks,prec-1):parseMonad(toks)
        value = {type:"operator:"+op,args:[value,value2],_fn:binaryOperators[op]._fn,_mn:binaryOperators[op]._mn}
    }
    return value
}

function evaluate(ctx,parsed){
    if(parsed == undefined) return undefined;
    if(typeof parsed == "number") return parsed;
    if(Array.isArray(parsed)) return parsed.map(v=>evaluate(ctx,v));
    if(parsed._fn){
        let args = parsed.args?.map?.(v=>evaluate(ctx,v)) ?? []
        let out = parsed._fn(ctx,...args)
        if(ctx.logging)console.log(parsed.type,args,"->",out)
        return out
    }
}

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

function draw(fn){
    let img = new ImageData(128,128)
    for(let z=0;z<128;z++){
        for(let x=0;x<128;x++){
            let v = fn(x,z)
            img.data[z*4*128+x*4] = Math.max(0,v*255);
            img.data[z*4*128+x*4+1] = Math.max(0,-v*255);
            img.data[z*4*128+x*4+2] = 255;
            img.data[z*4*128+x*4+3] = 255;
        }
    }
    /** @type {HTMLCanvasElement} */
    let canvas = document.getElementById("canvas");
    let ctx = canvas.getContext("2d");
    ctx.putImageData(img,0,0)
}

function rerun(code){
    toks = [...code.matchAll(/[\(\)\[\],\<\>\+\-\*\%\/]|([0-9]+(\.[0-9]+)?)|[a-z][a-z_0-9]*(?::[a-z_0-9]+)?/g)].map(([v])=>v)
    let parsed;

    try{
        parsed = parseExpr(toks)
        console.log(parsed)
    
        let out = document.getElementById("output")
        out.value = JSON.stringify(toOutput(parsed),null,2)
            .replaceAll(/\[\s*\d+(\s*,\s*\d+)*\s*\]/g,(v)=>v.replaceAll(/\s/g,""))
            .replaceAll(/\{\s*"type"\s*:\s*"(\w+(?::\w+)?)"\s*(})?/g,'{"type":"$1"$2')
        draw((x,z)=>evaluate({x,z,y:64},parsed))
    }catch(e){
        let out = document.getElementById("output")
        out.value = e
        draw(()=>Math.random()*2-1)
        return;
    }
}

let codeArea = document.getElementById("code")

codeArea.addEventListener("input",e=>{
    rerun(codeArea.value)
})
rerun(codeArea.value)