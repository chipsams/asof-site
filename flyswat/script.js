let swatters = [];
let board = document.getElementById("gameboard")
let score = document.getElementById("score")
let finalscore = document.getElementById("finalscore")
let startbutton = document.getElementById("gamestart")
let completionscreen = document.getElementById("completionscreen")
let rating = document.getElementById("rating")

const sleep = t=>new Promise(r=>setTimeout(r,t))


let hitnoise = document.getElementById("hitnoise")
let winnoise = document.getElementById("winnoise")
let oopsnoise = document.getElementById("oopsnoise")
let music = document.getElementById("soundtrack")


function minigame(e){
  startbutton.disabled = true
  
  let extant = new Set()
  let spawned = 0
  let toHit = 30
  let margin = 400
  let hit = 0

  completionscreen.style="display:none";
  let finished = false;

  function checkFinish(){
    if(spawned<toHit || extant.size>0 || finished) return;
    finished = true;
    
    console.log(spawned,extant)
    startbutton.disabled = false
    finalscore.innerText = `${hit.toFixed(0).padStart(3,0)} / ${toHit.toFixed(0).padStart(3,0)} (${(hit/toHit*100).toFixed(1)}%)`
    completionscreen.style="";
    completionscreen.animate({translate:["0px -1000px","0px 0px"],opacity:[0,1]},{duration:300,easing:"ease-in"})

    
    let hitRate = hit/toHit
    if(hitRate > 0.8){
      winnoise.currentTime = 0
      winnoise.play()
    }else{
      oopsnoise.currentTime = 0
      oopsnoise.play()
    }

    rating.innerText = hitRate == 1 ? "amazing work!!" :
    hitRate > 0.8 ? "nearly all of them, maybe next time?" :
    hitRate > 0.5 ? "ooh.. oh no.. it'll take ages to find them all.." :
    hitRate > 0.3 ? "that's.. not great!!" :
    hit == 1 ? "at least you got one, i guess.." :
    "you need to use the left mouse button or perhaps tap in order to get them!!"
  }

  async function createAsof(mode){
    spawned++
    let thisAsof = Math.random()
    extant.add(thisAsof)
    let img = document.createElement("img")
    img.src = Math.random()>0.9?"./cara-spin.gif":"./asof-spin.gif"
    let wasHit = false

    let handler = e=>{
      e.preventDefault()
      if(wasHit) return;
      wasHit = true;

      hit++;
      score.innerText = `${hit.toFixed(0).padStart(3,0)} / ${toHit.toFixed(0).padStart(3,0)}`
      img.src = img.src.replace("spin","spin-defeated")
      let x = parseFloat(getComputedStyle(img).left)
      let y = parseFloat(getComputedStyle(img).top)
      hitnoise.currentTime = 0
      hitnoise.play()
      img.animate({
        left: [x,x,x].map(v=>`${v}px`),
        top: [y,y-100,y+3000].map(v=>`${v}px`),
        offset: [0,0.1,1],
        scale: [1,0.5,0.5],
        pointerEvents: "none",
        easing: ["ease-in","ease-in","ease-out"]
      },2000).finished.then(()=>{
        extant.delete(thisAsof)
        img.remove()
        checkFinish()
      })
    }

    img.addEventListener("click",handler)
    img.addEventListener("drag",handler)

    let {left,right,top,bottom} = board.getBoundingClientRect()
    console.log(left,right,top,bottom)
    let x = Math.random()*(right-left-margin*2)+margin
    let y = Math.random()*(bottom-top-margin*2)+margin
    
    board.appendChild(img)
    let angle = Math.random()*Math.PI*2
    let dx = Math.sin(angle)*1500
    let dy = Math.cos(angle)*1500
    await img.animate({
      left: [x,x,x+dx].map(v=>`${v}px`),
      top: [-400,y,y+dy].map(v=>`${v}px`),
      offset: [0,0.1,1],
      easing: ["ease-out","linear","linear"]
    },5000).finished
    img.remove()
    extant.delete(thisAsof)
    checkFinish()
  }
  
  music.currentTime = 0;
  music.play()

  let events = []
  let remainingTime = 0
  let tMax = 30
  let f = 0.8
  while(remainingTime<tMax){
    if (Math.random()<0.2 && remainingTime-tMax>=3){
      events.push({t:(remainingTime/tMax)**f*tMax*1000,c:3})
      remainingTime += 3
    }else{
      events.push({t:(remainingTime/tMax)**f*tMax*1000,c:1})
      remainingTime += 1
    }
  }

  for(let {t,c} of events){
    setTimeout(async ()=>{
      let mode = Math.random()
      for(let l=0;l<c;l++){
        createAsof(mode)
        await sleep(200)
      }
    },t)
  }
}