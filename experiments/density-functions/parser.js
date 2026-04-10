let depth = 0
let toks = []

class ParserError extends Error {}

const makeUUID = ()=>crypto.randomUUID()

const simpleWrap = (fn,extraprops,...argNames)=>{
    let attr = {}
    let opr
    
    if(typeof extraprops == "string") extraprops = {type:extraprops}
    return {_fn:(self,ctx,...compArgs)=>(ctx)=>fn(ctx,...compArgs.map(v=>v(ctx))),
        type:extraprops.type,_mn:(ctx,...args)=>{
        let dat = Object.assign({},extraprops)
        for(let l=0;l<argNames.length;l++){
            dat[argNames[l]+((args[l]===undefined)?"_":"")] = args[l]??"NOT PROVIDED"
        }
        return dat
    },attr}
}

const complexerWrap = (fn,extraprops,...argNames)=>{
    let attr = {}
    if(typeof extraprops == "string") extraprops = {type:extraprops}

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
        while(args.length>1)
        for(let l=0;l<args.length-1;l++){
            let [left,right] = args.splice(l,2)
            let newValue = Object.assign({},extraprops,{[arg1]:left,[arg2]:right})
            args.splice(l,0,newValue)
        }
        console.log(args)
        return args[0]
    }}
}

let constants = {
    x: {type:"moredfs:x"},
    y: {type:"moredfs:y"},
    z: {type:"moredfs:z"}
}

let methods = {
    min:manyParam((self,ctx,...compArgs)=>{
        return (ctx)=>Math.min(...compArgs.map(v=>v(ctx)))
    },"minecraft:min","argument1","argument2"),
    max:manyParam((self,ctx,...compArgs)=>{
        return (ctx)=>Math.max(...compArgs.map(v=>v(ctx)))
    },"minecraft:max","argument1","argument2"),
    cache2d:complexerWrap((self,ctx,a)=>{
        let cache = []
        return (ctx)=>{
            cache[ctx.x+","+ctx.z]??=a(Object.assign({},ctx,{y:0}))
            return cache[ctx.x+","+ctx.z]
        }
    },{type:"minecraft:cache_2d"},"argument"),
    select_range:complexerWrap((self,ctx,a,min,max,inrange,outrange)=>{
        return (ctx)=>{
            let aValue = a(ctx)
            return aValue>=min(ctx) && aValue<max(ctx) ? inrange(ctx) : outrange(ctx)
        }
    },{type:"minecraft:range_choice"},"input","min_inclusive","max_exclusive","when_in_range","when_out_of_range"),
    ygrad:simpleWrap((ctx,fI,tI,fO,tO)=>Math.min(Math.max((ctx.y-fI)/(tI-fI),0),1)*(tO-fO)+fO,
        "minecraft:y_clamped_gradient","from_y","to_y","from_value","to_value"),
    perlin:simpleWrap((ctx,type,xz_scale,y_scale)=>noise.perlin3(ctx.x/xz_scale,ctx.z/xz_scale,ctx.y/y_scale),
        {type:"minecraft:noise"},"noise","xz_scale","y_scale"),
    distance:simpleWrap((_,a,b)=>Math.sqrt(a.map((v,i)=>v-(b?b[i]:0)).reduce((a,b)=>a+b*b,0)),
        {type:"moredfs:distance",distance_metric:{type:"euclidean"}},"point1","point2"),
    clamp:simpleWrap((_,v,l,u)=>Math.max(Math.min(v,u),l),"moredfs:clamp","argument","min","max"),
    clamp01:simpleWrap((_,v)=>Math.max(Math.min(v,1),0),{type:"moredfs:clamp",min:0,max:1},"argument"),
    clamp11:simpleWrap((_,v)=>Math.max(Math.min(v,1),-1),{type:"moredfs:clamp",min:-1,max:1},"argument"),
    floor:simpleWrap((_,v)=>Math.floor(v),"moredfs:floor","argument"),
    ceil:simpleWrap((_,v)=>Math.ceil(v),"moredfs:ceil","argument"),
    round:simpleWrap((_,v)=>Math.round(v),"moredfs:round","argument"),
    sin:simpleWrap((_,v)=>Math.sin(v),"moredfs:sin","argument"),
    cos:simpleWrap((_,v)=>Math.cos(v),"moredfs:cos","argument"),
    abs:simpleWrap((_,v)=>Math.abs(v),"minecraft:abs","argument"),
    sign:simpleWrap((_,v)=>Math.sign(v),"moredfs:signum","argument")
}

function binaryFormat(type,p1="argument1",p2="argument2"){
    return (_,a,b)=>({type:type,[p1]:a,[p2]:b})
}

const simple = (ctx,a,b)=>({type:ctx.obj.type,"paramter1":a,"paramter2":b})

let binaryOperators = {
    "^": {_mn:binaryFormat("moredfs:power","base","exponent"),_fn:(_,a,b)=>a**b,prec:0},
    "*": {_mn:binaryFormat("minecraft:mul"),_fn:(_,a,b)=>a*b,prec:1},
    "/": {_mn:binaryFormat("moredfs:div","numerator","denominator"),_fn:(_,a,b)=>a/b,prec:1},
    "%": {_mn:binaryFormat("moredfs:mod","numerator","denominator"),_fn:(_,a,b)=>(a%b+b)%b,prec:1},
    "+": {_mn:binaryFormat("minecraft:add"),_fn:(_,a,b)=>a+b,prec:2},
    "-": {_mn:binaryFormat("moredfs:subtract"),_fn:(_,a,b)=>a-b,prec:2},
}

function debugify(...args){
    //console.log("=|".repeat(depth),...args)
    //console.log("=|".repeat(depth),toks.join(" "))
}

function expectAndShift(toks,symbol){
    if(toks.shift() !== symbol) throw new ParserError(`expected ${symbol}!`)
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
        if(toks.shift()!==")") throw new ParserError("unclosed (!! (bracketed expression)")
        debugify("done parsing bracketed")
        return data;
    }

    if(toks.at(0) == "["){
        debugify("parsing array")
        expectAndShift(toks,"[")
        data = parseValList(toks)
        if(toks.shift()!=="]") throw new ParserError("unclosed [!! (array)")
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
            if(toks.shift()!==")") throw new ParserError("unclosed )!! (function parameters)")
                debugify("done parsing function",tok)
            if(typeof methods[tok] == "function") throw new ParserError("used old function "+tok)
            return {type:"function:"+tok,args:args,_fn:methods[tok]._fn,_mn:methods[tok]._mn,id:makeUUID(),attr:methods[tok].attr}
        }else{
            return {type:"constant:"+tok,_autogen:"yes",_fn:(self,ctx)=>(ctx)=>ctx[tok],_mn:()=>{
                return constants[tok]
            },id:makeUUID()}
        }
    }

    if(stringRegex.test(toks.at(0))){
        return toks.shift().slice(1,-1)
    }

    throw new ParserError("expected a value!")
}

function parseMonad(toks){
    if(toks.at(0)=="-"){
        toks.shift()
        return {
            type:"moredfs:negate",
            args:[parseMonad(toks)],
            _fn:(self,_,v)=>(ctx)=>Array.isArray(v)?v.map(v=>-v(ctx)):-v(ctx),
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
        value = {type:"operator:"+op,args:[value,value2],_fn:(self,ctx,l,r)=>{
            return (ctx)=>binaryOperators[op]._fn(ctx,l(ctx),r(ctx))
        },_mn:binaryOperators[op]._mn,id:makeUUID()}
    }
    return value
}

const numberRegex = /([0-9]+(\.[0-9]+)?)/
const stringRegex = /"[^"]*"/
const symbolRegex = /[\(\)\[\],\<\>\+\-\*\%\/\^]/
const identifierRegex = /[a-z][a-z_0-9]*(?::[a-z_0-9]+)?/
let codeRegex = new RegExp([
    numberRegex.source,
    stringRegex.source,
    symbolRegex.source,
    identifierRegex.source
].join("|"),"g")

function parseCode(code){
    cache = {}
    let toks = [...code.matchAll(codeRegex)].map((r)=>r[0])
    let parsed = parseExpr(toks)
    return {parsed,fn:compile({},parsed)}
}

function compile(ctx,parsed){
    switch(typeof parsed){
        case "undefined":
        case "string":
        case "number": return ()=>parsed;
        default: break;
    }
    if(Array.isArray(parsed)){
        let fns = parsed.map(v=>compile(ctx,v));
        return (ctx)=>fns.map(fn=>fn(ctx))
    };

    if(parsed._fn){
        let fn = parsed._fn(parsed,ctx,...parsed.args?.map?.(a=>compile(ctx,a))??[])
        return fn
    }
}
