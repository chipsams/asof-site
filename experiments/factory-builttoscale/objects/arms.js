class Hand extends EngineObject {
  constructor(arm,pos){
    super()
    arm.addChild(this,pos)
    this.item = undefined;
    this.lastGrabPos = undefined;

    this.enableParenting = true;
    
    this.renderOrder = 20;
  }

  render(){
    let angle = this.pos.subtract(this.parent.pos).angle()
    drawTile(this.pos,vec2(2),tile(vec2(96,this.item?24:8),vec2(16),2),undefined,Math.floor(angle/PI*2-0.5)/2*PI)
    this.item?.draw?.(this.pos);
  }

  targetPos(){
    return this.parent.pos.add(this.localPos.rotate(-this.parent.targetAngle))
  }

  /**
   * 
   * @returns {HoleConnection}
   */
  getTarget(){
    return holeConnectionGrid.getAll(this.targetPos())[0];
  }
  
  grab(){
    
    if(this.item) return false;

    if(this.lastGrabPos && this.targetPos().subtract(this.lastGrabPos).lengthSquared()<0.01) return false;

    let targetHole = this.getTarget();
    if(!targetHole) return false;
    
    let item = targetHole.parent.extract(targetHole)
    if(!item) return false;

    this.item = item;

    this.lastGrabPos = this.targetPos();
    return true;
  }
  
  release(){

    if(this.lastGrabPos && this.targetPos().subtract(this.lastGrabPos).lengthSquared()<0.01) return false;

    if(!this.item) return false;
    let targetHole = this.getTarget();
    if(!targetHole) return false;
    let success = targetHole.parent.dropIn(targetHole,this.item)
    if(success){
      this.item = undefined;
      this.lastGrabPos = this.targetPos();
      return true;
    }
  }

}

class Arm extends Machine {
  static pipeConnections = {}
  
  static size = vec2(1)

  constructor(pos,angle){
    super(pos,angle)
    this.hands = []
    this.targetAngle = this.angle
    this.tasks = [];
    this.taskQueue = [];


    this.stepTime = 0;
  }
  update(){
    this.stepTime++
    if(this.stepTime>=20){
      this.stepTime-=20;
      if(this.taskQueue.length == 0){
        this.taskQueue = Object.assign([],this.tasks);
        //console.log(this.tasks)
      }
  
      if(this.taskQueue.length > 0){
        let success;
        let [action,wait] = this.taskQueue[0]
        switch(action){
          case "ccw": success = this.turn(-Math.PI/2); break;
          case "cw": success = this.turn(Math.PI/2); break;
          case "grab": success = this.grab(); break;
          case "release": success = this.release(); break;
        }
        if(success || !wait) this.taskQueue.shift();
      }
    }
    super.update()
    this.angle = lerpAngle(0.7,this.angle,this.targetAngle)
  }

  render(){
    drawTile(this.pos,undefined,tile(vec2(96,0),undefined,2))
  }

  turn(angle){
    this.targetAngle += angle;
    return true;
  }

  grab(){
    return this.hands.reduce((b,hand)=>hand.grab() || b, false)
  }
  release(){
    return this.hands.reduce((b,hand)=>hand.release() || b,false)
  }

  addHand(pos){
    this.hands.push(new Hand(this,pos))
  }
}