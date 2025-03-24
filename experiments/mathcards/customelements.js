
class TargetElement extends HTMLElement {
  constructor(){
    super()
  }
  connectedCallback(){
    if(this.innerText.trim() == ""){
      let a,b,opr;
      while(true){
        a = Math.floor(Math.random()*9)+1
        b = Math.floor(Math.random()*9)+1
        opr = "+-*%"[Math.floor(Math.random()*4)]

        if(opr == "-" && b>a) continue;
        break;
      }

      this.innerText = eval(a+opr+b);
    }
  }
}
customElements.define("game-target",TargetElement)

class CardStackElement extends HTMLElement {

  dropTile;

  constructor() {
    // Always call super first in constructor
    super();
  }

  async applyClasses(removed){
    console.log(removed);

    let anim = removed ? bounceUp : bounceDown;
    console.log("applying classes!")

    await sleep(1);
    let card = this.querySelector("game-card");
    while(card){
      card.classList.remove("digit","operator","syntax-error","even","odd");
      card = card.querySelector("game-card");
    }
    card = this.querySelector("game-card");
    let cards = [];
    while(card){cards.push(card);card=card.firstElementChild}
    let isOperator = false;
    if(removed) {cards.reverse(); isOperator = cards.length%2 == 0;}

    while(cards.length > 0){
      let card = cards.shift();
      console.log(card);
      await sleep(70);
      card.animate(anim,{duration:200,easing:"steps(2)"});
      if(isOperator){
        if(card.firstElementChild){
          card.classList.add("operator")
        }else{
          card.classList.add("syntax-error")
        }
      }else{
        card.classList.add("digit");
      }
      isOperator = !isOperator;
    }
  }

  connectedCallback() {

    if(this.getAttribute("prefill")){
      let card = this;
      for(let l = this.getAttribute("prefill"); l>0; l--){
        card.insertAdjacentHTML("afterbegin","<game-card>");
        card = card.firstElementChild;
      }
    }
    
    if(!this.dropTile){
      this.dropTile = document.createElement("div");
      this.dropTile.classList.add("drop-tile")
      this.dropTile.innerHTML = "+";
  
      setTimeout(()=>this.appendChild(this.dropTile),1);
  
      this.dropTile.addEventListener("drop",ev=>{
        ev.preventDefault();
        let id = ev.dataTransfer.getData("text");
        let dropCard = document.getElementById(id);
        
        let card = this;
        let nextCard;
        while(nextCard = card.querySelector("game-card")) card = nextCard;
  
        
        if(card == this || dropCard.canStackOn(card)){
          dropCard.dispatchEvent(new CustomEvent("stackModified",{
            bubbles: true,
            detail: { cardRemoved: true }
          }));
          audPlace.play();
          card.insertBefore(dropCard,card.firstChild)
          dropCard.dispatchEvent(new CustomEvent("stackModified",{
            bubbles: true,
            detail: { cardAdded: true }
          }));
        }

      })

      this.addEventListener("stackModified",ev=>{
        this.applyClasses(ev.detail.cardAdded);
      })

      this.dropTile.addEventListener("dragover",ev=>{
        ev.preventDefault();
      })
    }
  }

  disconnectedCallback() {
    console.log("Custom element removed from page.");
  }

  adoptedCallback() {
    console.log("Custom element moved to new page.");
  }

  attributeChangedCallback(name, oldValue, newValue) {
  }
}
customElements.define("card-stack", CardStackElement);

class CalculationCardStackElement extends CardStackElement {
  calculateButton;

  constructor(){
    super()
  }

  connectedCallback(){
    super.connectedCallback();

    if(!this.calculateButton){
      this.calculateButton = document.createElement("button")
      this.calculateButton.classList.add("calculate-button")
      this.calculateButton.innerHTML = "=";
      this.calculateButton.addEventListener("click",ev=>{
        let cards = [];
        let card = this.querySelector("game-card");
        while(card){
          cards.push(card);
          card = card.firstElementChild;
        }

        processExpression(cards,this.calculateButton);
      });
      setTimeout(()=>this.appendChild(this.calculateButton),1);
    }
  }
}
customElements.define("calculation-card-stack", CalculationCardStackElement);

class GameCardElement extends HTMLElement {
  static observedAttributes = ["num","opr"];

  constructor() {
    // Always call super first in constructor
    super();
    this.symbolDisplay;
  }

  canStackOn(card){
    let lowerNum = this.getAttribute("num");
    let upperNum = card.getAttribute("num");
    if(lowerNum == upperNum - 1) return true;
    if(lowerNum - 1 == upperNum) return true;
    if(this.getAttribute("opr") == card.getAttribute("opr")) return true;
    return false;
  }

  canGrab(){
    let card = this;
    while(card.firstElementChild){
      console.log(card,card.firstElementChild)
      if(!card.canStackOn(card.firstElementChild)) return false;
      card = card.firstElementChild;
    }
    return true;
  }

  connectedCallback() {
    if(!this.getAttribute("num")) this.setAttribute("num",Math.floor(Math.random()*9)+1)
    if(!this.getAttribute("opr")) this.setAttribute("opr","+-*%"[Math.floor(Math.random()*4)])

    this.id = "card-"+crypto.randomUUID();

    this.addEventListener("dragend",ev=>{
      this.removeAttribute("dragging")
    })

    this.addEventListener("dragstart",ev=>{
      audPickup.play();
      
      if(!this.canGrab()) return ev.preventDefault();

      this.setAttribute("dragging",true);
      ev.dataTransfer.setData("text",this.id);
      ev.stopPropagation();
    })

    this.setAttribute("draggable",true);
  }

  disconnectedCallback() {
  }

  adoptedCallback() {
  }

  attributeChangedCallback(name, oldValue, newValue) {
  }
}
customElements.define("game-card", GameCardElement);

class NumberDisplayElement extends HTMLElement {
  #_value;

  constructor(){
    super()
    this._value = 0;
  }
  set value(value){
    if(this._value > value) this.animate(bounceDown,{duration:250,easing:"steps(3)"})
    if(this._value < value) this.animate(bounceUp,{duration:250,easing:"steps(3)"})
    this._value = value;
    this.innerText = value;
  }
  get value(){
    return this._value;
  }

  connectedCallback(){
    this.innerText = this._value;
  }
  

}
customElements.define("number-view",NumberDisplayElement)