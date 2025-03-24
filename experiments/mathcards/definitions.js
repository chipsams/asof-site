

const sleep = t=>new Promise(r=>setTimeout(r,t)); 
const bounceDown = {
  transform: ["translate(0px, 10px)","translate(0px, -5px)","translate(0px, 0px)"]
}
const bounceUp = {
  transform: ["translate(0px, -10px)","translate(0px, 5px)","translate(0px, 0px)"]
}

const sample = a=>a[Math.floor(Math.random()*a.length)]

const audClunk = new Audio('https://file.garden/Y-Og9h1-sFQYcqA1/cardgmae/audio/clunk.wav');
const audPickup = new Audio('https://file.garden/Y-Og9h1-sFQYcqA1/cardgmae/audio/pickup.wav');
const audPlace = new Audio('https://file.garden/Y-Og9h1-sFQYcqA1/cardgmae/audio/place.wav');
const audOverflow = new Audio('https://file.garden/Y-Og9h1-sFQYcqA1/cardgmae/audio/overflow.wav');
const audCorrect = new Audio('https://file.garden/Y-Og9h1-sFQYcqA1/cardgmae/audio/correct.wav');