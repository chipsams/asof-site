let depth = 0
let toks = []

const makeUUID = ()=>crypto.randomUUID()

const simpleWrap = (fn,extraprops,...argNames)=>{
    let attr = {}
    if(typeof extraprops == "string") extraprops = {type:extraprops}
    if(extraprops._delayedEval) attr.delayedEval = delete extraprops._delayedEval

    return {_fn:fn,type:extraprops.type,_mn:(ctx,...args)=>{
        let dat = Object.assign({},extraprops)
        for(let l=0;l<argNames.length;l++){
            dat[argNames[l]+((args[l]===undefined)?"_":"")] = args[l]??"NOT PROVIDED"
        }
        return dat
    },attr}
}
const manyParam = (fn,extraprops,arg1,arg2)=>{
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

let cache = {}

let methods = {
    cache2d:simpleWrap((self,ctx,a)=>{
        cache[self.id]??=[]
        cache[self.id][ctx.x+","+ctx.z]??=a()
        return cache[self.id][ctx.x+","+ctx.z]
    },{_delayedEval:true,type:"minecraft:cache_2d"},"argument"),
    ygrad:simpleWrap((self,ctx,fI,tI,fO,tO)=>Math.min(Math.max((ctx.y-fI)/(tI-fI),0),1)*(tO-fO)+fO,
        "minecraft:y_clamped_gradient","from_y","to_y","from_value","to_value"),
    perlin:simpleWrap((self,_,x,y,sX,sY)=>noise.perlin2(x/sX,y/sY),
        "noise","x","z","scale_x","scale_z"),
    distance:simpleWrap((self,_,a,b)=>Math.sqrt(a.map((v,i)=>v-(b?b[i]:0)).reduce((a,b)=>a+b*b,0)),
        {type:"moredfs:distance",distance_metric:{type:"euclidean"}},"point1","point2"),
    clamp:simpleWrap((self,_,v,l,u)=>Math.max(Math.min(v,u),l),"moredfs:clamp","argument","min","max"),
    clamp01:simpleWrap((self,_,v)=>Math.max(Math.min(v,1),0),{type:"moredfs:clamp",min:0,max:1},"argument"),
    clamp11:simpleWrap((self,_,v)=>Math.max(Math.min(v,1),-1),{type:"moredfs:clamp",min:-1,max:1},"argument"),
    floor:simpleWrap((self,_,v)=>Math.floor(v),"moredfs:floor","argument"),
    ceil:simpleWrap((self,_,v)=>Math.ceil(v),"moredfs:ceil","argument"),
    round:simpleWrap((self,_,v)=>Math.round(v),"moredfs:round","argument"),
    sin:simpleWrap((self,_,v)=>Math.sin(v),"moredfs:sin","argument"),
    cos:simpleWrap((self,_,v)=>Math.cos(v),"moredfs:cos","argument"),
    abs:simpleWrap((self,_,v)=>Math.abs(v),"minecraft:abs","argument"),
    sign:simpleWrap((self,_,v)=>Math.sign(v),"moredfs:signum","argument")
}

function binaryFormat(type,p1="argument1",p2="argument2"){
    return (_,a,b)=>({type:type,[p1]:a,[p2]:b})
}

const simple = (ctx,a,b)=>({type:ctx.obj.type,"paramter1":a,"paramter2":b})

let binaryOperators = {
    "^": {_mn:binaryFormat("moredfs:power","base","exponent"),_fn:(self,_,a,b)=>a**b,prec:0},
    "*": {_mn:binaryFormat("minecraft:mul"),_fn:(self,_,a,b)=>a*b,prec:1},
    "/": {_mn:binaryFormat("moredfs:div","numerator","denominator"),_fn:(self,_,a,b)=>a/b,prec:1},
    "%": {_mn:binaryFormat("moredfs:mod","numerator","denominator"),_fn:(self,_,a,b)=>(a%b+b)%b,prec:1},
    "+": {_mn:binaryFormat("minecraft:add"),_fn:(self,_,a,b)=>a+b,prec:2},
    "-": {_mn:binaryFormat("moredfs:subtract"),_fn:(self,_,a,b)=>a-b,prec:2},
}

function debugify(...args){
    //console.log("=|".repeat(depth),...args)
    //console.log("=|".repeat(depth),toks.join(" "))
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
            return {type:"function:"+tok,args:args,_fn:methods[tok]._fn,_mn:methods[tok]._mn,id:makeUUID(),attr:methods[tok].attr}
        }else{
            return {type:"constant:"+tok,_autogen:"yes",_fn:(self,ctx)=>ctx[tok],_mn:()=>{
                return constants[tok]
            },id:makeUUID()}
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
            _fn:(self,_,v)=>Array.isArray(v)?v.map(v=>-v):-v,
            _mn:(_,a)=>({type:"moredfs:negate",argument:a}),
            id:makeUUID()
        };
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
        value = {type:"operator:"+op,args:[value,value2],_fn:binaryOperators[op]._fn,_mn:binaryOperators[op]._mn,id:makeUUID()}
    }
    return value
}

const numberRegex = /([0-9]+(\.[0-9]+)?)/
const symbolRegex = /[\(\)\[\],\<\>\+\-\*\%\/\^]/
const identifierRegex = /[a-z][a-z_0-9]*(?::[a-z_0-9]+)?/
let codeRegex = new RegExp([
    numberRegex.source,
    symbolRegex.source,
    identifierRegex.source
].join("|"),"g")

function parseCode(code){
    cache = {}
    let toks = [...code.matchAll(codeRegex)].map(([v])=>v)
    return parseExpr(toks)
}

function evaluate(ctx,parsed){
    if(parsed == undefined) return undefined;
    if(typeof parsed == "number") return parsed;
    if(Array.isArray(parsed)) return parsed.map(v=>evaluate(ctx,v));
    if(parsed._fn){
        let args = parsed.attr?.delayedEval
            ?parsed.args?.map?.(v=>()=>evaluate(ctx,v)) ?? []
            :parsed.args?.map?.(v=>evaluate(ctx,v)) ?? []
        let out = parsed._fn(parsed,ctx,...args)
        if(ctx.logging)console.log(parsed.type,args,"->",out)
        return out
    }
}