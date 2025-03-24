

let influxMeter = document.getElementById("influx-meter");
let influxMeterInner = influxMeter.firstElementChild;
let influxProgress = 0;
let targets = document.getElementById("target-list");

let bufferCountDisplay = document.getElementById("buffer-count");
let bufferOutput = document.getElementById("buffer-output");
let bufferCount = 0;

let score = document.getElementById("score-display");
let influxLevel = document.getElementById("influx-level-display");
influxLevel.value = 0;
let cardsPerInflux = document.getElementById("cards-per-influx-display");
cardsPerInflux.value = 3;
let completedTargets = document.getElementById("completed-targets-display");
let extractedCards = document.getElementById("extracted-cards-display");
let msPerInfluxTick = document.getElementById("ms-per-influx-tick-display");


function checkForCardRefill(){
  if(bufferCount > 0){
    if(!bufferOutput.querySelector("game-card")){
      extractedCards.value++;
      audClunk.play();
      bufferOutput.innerHTML="<game-card>"
      bufferOutput.animate(bounceDown,{duration:250,easing:"steps(3)"})
      bufferCount -= 1;    
      bufferCountDisplay.innerText = bufferCount.toString().padStart(2,"_");
      bufferCountDisplay.animate(bounceDown,{duration:250,easing:"steps(3)"});
    }
  } else if (bufferOutput.innerText !== "x") {
    audPlace.play();
    bufferOutput.innerText = "x";
    bufferOutput.animate(bounceDown,{duration:250,easing:"steps(3)"});
  }
}

bufferOutput.addEventListener("stackModified",ev=>sleep(250).then(()=>checkForCardRefill()))

async function addToBuffer(cards){
  while(cards>0){
    audPickup.play();
    bufferCount += 1;
    bufferCountDisplay.animate(bounceUp,{duration:250,easing:"steps(3)"})
    bufferCountDisplay.innerText = bufferCount.toString().padStart(2,"_");
    cards -= 1;
    await sleep(500/Math.min(1+cards/5,3))
  }

  await sleep(250);
  
  checkForCardRefill();
}

addToBuffer(20)

let addingCard;

async function damageBuffer(progress,small){
  
  influxProgress += progress;
  if(addingCard) return false;

  if(influxProgress < 0) influxProgress = 0;
  influxMeterInner.style.right = `${100-Math.min(influxProgress,1)*100}%`
  let magnitude = small ? 2 : 5
  if(progress<0) magnitude = -magnitude;
  influxMeter.animate({
    transform:[
      `translate(${magnitude*2}px, 0px)`,
      `translate(${-magnitude*2}px, 0px)`,
      `translate(${magnitude*2}px, 0px)`,
      `translate(${-magnitude}px, 0px)`
    ]
  },{duration:150,easing:"steps(4)"})

  if (influxProgress >= 1){
    addingCard = true;
    beginGivingCard:if(1){
      for(let l=0;l<7;l++){
        influxMeterInner.style.backgroundColor = l%2==0?"white":"red";
        await sleep(300);
        if(influxProgress<1){
          influxMeterInner.style.backgroundColor = "grey";
          console.assert("card canceled!")
          break beginGivingCard;
        }
      }

      influxMeterInner.style.backgroundColor = "white";
      audOverflow.play();
      addToBuffer(cardsPerInflux.value);
      
    }
    await sleep(300);
    
    for(let l=100;l>1;influxProgress<1?(l-=1):(l/=2)){
      influxMeterInner.style.right = `${100-l}%`
      await sleep(100);
    }
    influxMeterInner.style.backgroundColor = "red";
    influxProgress = 0;
    influxMeterInner.style.right = "100%"
    addingCard = false;
  }
}

influxMeter.addEventListener("click",ev=>{
  audOverflow.play();
  damageBuffer(0.25);
})


let damageInterval;

function levelUp(){
  influxLevel.value++;
  clearInterval(damageInterval)
  msPerInfluxTick.value = Math.floor(5000/(1+Math.sqrt(influxLevel.value-1)/3))
  damageInterval = setInterval(()=>{
    damageBuffer(0.05,true)
  },msPerInfluxTick.value)
  cardsPerInflux.value = Math.min(6,3+Math.floor(influxLevel.value/3))
}
levelUp();


async function processExpression(cards,button){
  
  if(cards.length == 0){
    audClunk.play();
    return;
  };
  if(cards.length%2 == 0) {
    audOverflow.play();
    damageBuffer(0.025);
    return;
  }

  audClunk.play();

  button.disabled = true;
  
  let isOperator = true;
  let str = cards.map(card=>{
    isOperator = !isOperator;
    return card.getAttribute(isOperator?"opr":"num");
  }).join(" ")
  console.log(str);
  let output = eval(str);

  for(let l=0;l<3;l++){
    await sleep(influxProgress>=1 ? 70 : 250);
    button.innerText = output;
    button.style.fontSize = "3em";
    await sleep(influxProgress>=1 ? 70 : 250);
    button.innerText = "=";
    button.style.fontSize = "5em";    
  }
  
  let found = false;
  for(let target of targets.children){
    audPickup.play();
    target.animate({
      transform: ["translate(0px,-10px)","translate(0px,5px)","translate(0px,0px)"]
    },{duration:300,easing:"steps(3)"})
    await sleep(200)
    if(!found && target.innerText == output){
      score.value+=15;
      completedTargets.value++;
      if(completedTargets.value%5 == 0){
        levelUp();
      }
      audCorrect.play();
      target.remove();
      targets.insertAdjacentHTML("beforeend","<game-target>");
      found = true;
      (async()=>{
        damageBuffer(-1,false);
        
        for(let card of cards.reverse()){
          card.animate(bounceDown,{duration:250,easing:"steps(3)"});
          await sleep(250);
          card.remove();
        }
        await sleep(250);
        
        button.disabled = undefined;


        
        damageBuffer(-1,false);
      })();

    }
  }
  if(!found){
    audOverflow.play();
    damageBuffer(0.05);
  }
  
  button.disabled = undefined;
}
