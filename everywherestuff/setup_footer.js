// takes a value and generates a value that has very little to do with it but is different for each input.
function scrungle(value){
	value = value.toString()
	let hash = 0;
	for(let l=0;l<=value.length*3;l++){
		hash = (hash<<5)-hash+value.charCodeAt(l%value.length)
		hash |= 0
	}
	return (hash+2**31)/2**32
}

let prngSamples = 0
function prng(upper,lower){
	prngSamples++;
	let t = new Date()
	// a new answer every minute, but no faster than that!!
	let time = prngSamples + t.getMinutes()*100 + t.getHours()*10000 + t.getDay()*100000
	time += t.getMilliseconds()
	let rand = scrungle(time)

	return Math.floor(rand * (upper-lower) + lower)
}

function choose(...options){
	let index = prng(0,options.length)
	return options[index]
}

function elem(type,...contents){
	let e = document.createElement(type)
	while(typeof contents[0] == "object" && !contents[0].tagName)
		for(let [k,v] of Object.entries(contents.shift()))
			k.startsWith("on")?e.addEventListener(k.replace(/^on/,""),v):e.setAttribute(k,v)
	e.append(...contents)
	return e
}
const a = (...p)=>elem("a",{href:""},...p)
const btn = (...p)=>elem("button",...p)


let stats = [
	[5,()=>["founded: ",choose("under a rock","in tide pool","in aquarium")]],
	[3,()=>["click ",a({onclick:e=>{e.preventDefault();e.target.parentElement.innerText="🐚"}},"here")," to gain 1 seashell!! ",elem("br")]],
	[6,()=>[`moisture measurement: ${choose(3,3,4,4,4,4,"5!!")}/5`]],
	[5,()=>[`moisture measurement: ${choose(3,3,4,4,4,4,"5!!")}/5`]],
	[1,()=>{
		let asofs = 0, auto = 0, txt = elem("span",0), d = t=>txt.innerHTML = Math.floor(t);
		setInterval(()=>d(asofs+=auto/10), 100)
		return [txt," asofs ",
			btn({onclick:()=>d(++asofs)},"+1")," ",
			btn({onclick:()=>asofs>=10?(auto++,d(asofs-=10)):0},"10 > 1a/sof")
		]
	}],
	[3,	()=>[elem("img",{width:32,height:32,src:"/misc-images/img/asof-twirl.gif"})]],
	[3, ()=>["hi :D"]],
	[4, ()=>["random vowels: ",...new Array(8).fill().map(v=>choose(..."aeiou"))]],
	[4, ()=>["breaking news: ",choose(..."🦑🐙🌊🦀🐟🐠")]],
]

console.log(stats.toString())
document.querySelector("footer").innerHTML = ""
let choices = [...stats];

let links = {
	[choose("home","surface","root","entrance")]: "/",
	[choose("bio","facts","asof","me","what")]: "/about/",
	[choose("media","likes","pearls","awesomes","other's")]: "/recommendations/"
}

document.querySelector("footer").append(elem("div","where? ",elem("select",{oninput:(e)=>{
	window.location.href = links[e.target.value]
}},elem("option","select"),...Object.entries(links).map(([title,url])=>elem("option",title)))))

for(let l=0;l<3;l++){
	let tot = choices.reduce((a,stat)=>a+stat[0],0);
	let v = prng(0,tot)
	//console.log(v)
	for(let i=0; i<choices.length; i++){
		if(v<=choices[i][0]){
			let choice = choices.splice(i,1)[0]
			console.log(l,choice[1])
			document.querySelector("footer").appendChild(elem("div",...choice[1]()))
			break
		}else{
			v-=choices[i][0]
		}
	}
}