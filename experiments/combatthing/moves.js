
class Collider extends EngineObject {
  /**
   * 
   * @param {*} owner 
   * @param {Number} radius 
   * @param {(e: Combattant)=>void} onHit 
   * @param {(e: Combattant)=>void} onLeave 
   */
  constructor(owner,radius,onHit = ()=>{},onLeave = ()=>{}){
    super(owner.pos)
    this.owner = owner;
    this.statOwner = this.owner;
    while(this.statOwner.owner) this.statOwner = this.statOwner.owner;
    this.owner.addChild(this)
    this.team = owner.team
    this.baseRadius = radius
    this.radius = radius * this.statOwner.statBlock.projectileRadius;
    this.onHit = onHit
    this.onLeave = onLeave

    this.lastHit = [];
  }

  render(){
    if(debugOverlay){
      debugCircle(this.pos,this.radius)
    }
  }
  
  update(){

    this.radius = this.baseRadius * this.statOwner.statBlock.projectileRadius;

    this.pos = this.replacePos ?? this.owner.pos;
    let targets = Object.values(teams).filter(t=>t!=this.team).flatMap(t=>t.combattants);
    targets = targets.filter(t=>t.pos.distanceSquared(this.pos)<=this.radius*this.radius);
    for(let target of targets.filter(e=>this.lastHit.indexOf(e)==-1)){
      this.onHit(target)
    }
    for(let target of this.lastHit){
      if(targets.indexOf(target)==-1) this.onLeave(target)
    }
    this.lastHit = targets;
  }

  destroy(){
    this.lastHit.forEach(this.onLeave);
    super.destroy();
  }
}

class Projectile extends EngineObject {
  /**
   * 
   * @param {Combattant} owner 
   * @param {Vector2} direction 
   */
  constructor(owner,direction){
    super(owner.pos)
    this.owner = owner;
    this.velocity = direction.scale(0.25 * owner.statBlock.projectileSpeed);
    this.team = owner.team;
    this.damage = 1;
    this.hitEnemies = 0;
    this.col = new Collider(this,1,e=>{
      this.hitEnemies++;

      if(this.hitEnemies<=this.owner.statBlock.pierce){
        e.onDamage(this,this.damage * this.owner.statBlock.attackPower)
      }

      if(!this.destroyed && this.hitEnemies >= this.owner.statBlock.pierce){
        this.destroy()
      }
    })
    this.tileInfo = tile(vec2(Math.abs(this.velocity.x*2)<Math.abs(this.velocity.y)?176:160,32))
    this.mirror = this.velocity.x<0;
  }

  grantXp(xp){
    this.owner.grantXp(xp)
  }

  render(){
    drawTile(this.pos.add(randInCircle(0.1)),undefined,this.tileInfo,this.team.color,undefined,this.mirror)
  }

  update(){
    super.update();
    if(time > this.spawnTime + 10) this.destroy();
  }
}

const basicLunge = async (user,targetPos)=>{
  let direction = targetPos.subtract(user.pos);

  let col;
  user.cleanUp = ()=>{
    col?.destroy?.();
    user.overrideSprite = undefined
    user.overrideMirror = undefined
    user.behavior = undefined;
    user.attackdraw = undefined;
    user.cooldown = 0.05;
  }



  user.attackdraw = ()=>{
    if(debugOverlay){
      debugLine(user.pos,user.pos.add(direction),"#f00")
      debugLine(user.pos,user.pos.add(user.velocity.scale(5)),"#0f0")
      debugCircle(targetPos,0.1,"#f00")
    }
  }

  user.overrideSprite = tile(user.baseSprite.add(vec2(80,0)))
  user.overrideMirror = direction.x < 0
  if(await user.time(user.statBlock.windUp)) return;

  
  user.verticalVel = 5
  user.velocity = user.velocity.add(direction.normalize());
  user.overrideSprite = tile(user.baseSprite.add(vec2(96,0)))
  
  col = new Collider(user,1,e=>{
    e.onDamage(user,1 * user.statBlock.attackPower);
  })

  if(await user.time(0.2)) return;

  col.destroy();

  if(await user.con(()=>user.verticalPos>1)) return;

  user.cleanUp();
}

const TailWhipMove = async (user,targetPos)=>{
  let direction = targetPos.subtract(user.pos);

  let col;
  user.cleanUp = ()=>{
    col?.destroy?.();
    user.overrideSprite = undefined
    user.overrideMirror = undefined
    user.behavior = undefined;
    user.attackdraw = undefined;

    user.tailAttacking = undefined;
    
    user.damping = 0.8;
    user.cooldown = 0;
  }
  user.damping = 0.95
  user.tailAttacking = true;

  let angleRange = PI-user.pos.subtract(targetPos).angle();
  let angle = angleRange-PI/2;

  user.attackdraw = ()=>{
    if(user.hasTail){
      user.overrideMirror = vec2(0,0.25).rotate(angle).x>0
      user.overrideSprite = tile(user.baseSprite.add(vec2(128,0)))
    }else{
      user.overrideMirror = vec2(0,0.25).rotate(angle).x>0
    }
    drawTile(user.pos.add(vec2(0,0.25).rotate(angle).add(vec2(0,0.2))),undefined,tile(vec2(224,32)),user.team.color,PI-angle)
    if(debugOverlay){
      debugLine(user.pos,user.pos.add(direction),"#f00")
      debugLine(user.pos,user.pos.add(user.velocity.scale(5)),"#0f0")
      debugCircle(targetPos,0.1,"#f00")
    }
  }

  
  col = new Collider(user,1,e=>{
    e.onDamage(user,1 * user.statBlock.attackPower);
  })

  for(angle = angleRange-PI/2; angle<angleRange+PI/2;angle+=0.3){
    col.replacePos = user.pos.add(vec2(0,1.5).rotate(angle));
    if(await user.frame()) return;
  }


  col.destroy();

  if(await user.con(()=>user.verticalPos>1)) return;

  user.cleanUp();
}

const basicShot = async (user,targetPos)=>{
  let direction = targetPos.subtract(user.pos).normalize();

  user.cleanUp = ()=>{
    user.overrideSprite = undefined;
    user.overrideMirror = undefined;
    user.behavior = undefined;
    user.attackdraw = undefined;
    user.damping = 0.8;
    user.cooldown = 0.15;
  }


  user.attackdraw = ()=>{
    if(debugOverlay){
      debugLine(user.pos,user.pos.add(direction),"#f00")
      debugLine(user.pos,user.pos.add(user.velocity.scale(5)),"#0f0")
      debugCircle(targetPos,0.1,"#f00")
    }
  }
  
  user.verticalVel = 5
  user.overrideSprite = tile(user.baseSprite.add(vec2(Math.sign(direction.x) == Math.sign(user.velocity.x)?96:112,0)))
  user.damping = 1;
  
  new Projectile(user,direction.scale(1.5).add(user.velocity.scale(2)));
  user.velocity = user.velocity.add(direction.normalize().scale(-0.125));
  user.overrideMirror = direction.x<0;

  if(await user.con(()=>user.verticalPos>1)) return;
  if(await user.time(0.1)) return;
  user.cleanUp();
}

class BeamProjectile extends Projectile {
  constructor(owner,direction){
    super(owner,direction)
    this.damage = 0.25
  }
}

const beamShot = async (user,targetPos)=>{
  let direction = targetPos.subtract(user.pos).normalize();

  user.cleanUp = ()=>{
    user.overrideSprite = undefined;
    user.overrideMirror = undefined;
    user.behavior = undefined;
    user.attackdraw = undefined;
  }


  user.attackdraw = ()=>{
    if(debugOverlay){
      debugLine(user.pos,user.pos.add(direction),"#f00")
      debugLine(user.pos,user.pos.add(user.velocity.scale(5)),"#0f0")
      debugCircle(targetPos,0.1,"#f00")
    }
  }
  
  user.overrideSprite = tile(user.baseSprite.add(vec2(Math.sign(direction.x) == Math.sign(user.velocity.x)?96:112,0)))
  
  new BeamProjectile(user,direction.scale(1.5).add(user.velocity.scale(2)));
  user.overrideMirror = direction.x<0;
  if(await user.frame()) return;
  
  user.cleanUp();
}

const ShotgunMove = async (user,targetPos)=>{
  let direction = targetPos.subtract(user.pos).normalize();

  user.cleanUp = ()=>{
    user.overrideSprite = undefined;
    user.overrideMirror = undefined;
    user.behavior = undefined;
    user.attackdraw = undefined;
    user.cooldown = 0.5;

  }


  user.attackdraw = ()=>{
    if(debugOverlay){
      debugLine(user.pos,user.pos.add(direction),"#f00")
      debugLine(user.pos,user.pos.add(user.velocity.scale(5)),"#0f0")
      debugCircle(targetPos,0.1,"#f00")
    }
  }
  
  user.verticalVel = 5
  user.overrideSprite = tile(user.baseSprite.add(vec2(Math.sign(direction.x) == Math.sign(user.velocity.x)?96:112,0)))
  user.flip = (user.velocity.x * -direction.x) > 0

  user.velocity = user.velocity.add(direction.normalize().scale(-4.5));
  for(let l=0;l<15;l++){
    user.overrideMirror = user.velocity.x > 0
    new Projectile(user,direction.scale(rand(2.4,2.6)).rotate(rand(-0.25,0.25)));
    if(await user.time(0.005)) return;
  }
  

  if(await user.con(()=>user.verticalPos>=0)) return;


  user.cleanUp();
}