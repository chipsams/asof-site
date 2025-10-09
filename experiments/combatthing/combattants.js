const sleep = t => new Promise(r=>setTimeout(r,t));


class Combattant extends EngineObject {
  constructor(pos,team){
    
    super(pos)
    this.team = team;
    this.team.push(this);
    this.tileInfo = undefined;
    this.baseSprite = vec2(0,16);
    this.stepT = 0;
    this.damping = 0.8;

    this.preRender = [];

    this.xp = 1;

    this.upgrades = {}

    this.fireModes = {
      melee: "repeated",
      range: "repeated"
    }

    /**
     * @type {StatBlock}
     */
    this.baseStatBlock = {
      maxHp: 3,
      moveSpeed: 0.025,
      cooldownSpeed: 0.1,
      attackPower: 1,
      projectileRadius: 0.5,
      projectileSpeed: 1,
      pierce: 1,
      weight: 1,
      windUp: 1
    }
    
    this.actions = {
      range: undefined,
      melee: basicLunge
    }

    this.verticalPos = 0;
    this.verticalVel = 0;

    this.cooldown = 0;

    this.statTweaks = [];
    this.passiveEffects = [];
    
    this.hp = this.statBlock.maxHp;
  }

  get statBlock(){
    let stats = {...this.baseStatBlock}
    this.statTweaks.forEach(tw=>stats=tw(stats,this.baseStatBlock))
    return stats
  }

  tweakStats(tweak){
    this.statTweaks.push(tweak)
  }

  removeTweak(tweak){
    this.statTweaks.splice(this.statTweaks.indexOf(tweak),1)
  }

  destroy(){
    //console.log("destroying",this.team)
    for(let [k,v] of Object.entries(this.upgrades)){
      this.team.upgrades[k]-=v;
    }
    if(Object.keys(this.upgrades).length > 0) upgradedCharacters--;
    this.team.remove(this)
    super.destroy();
  }

  grantXp(xp){
    let prevLevels = levels(this.xp);
    this.xp += xp;
    while(Math.floor(levels(this.xp)) > prevLevels){
      new UpgradeScreen(this,++prevLevels);
    }
  }

  enemyCombattants(){
    return Object.values(teams).filter(t=>t!=this.team).flatMap(t=>t.combattants);
  }

  controlLogic(){
    let others = this.enemyCombattants();
    if(others.length > 0){
      this.velocity = this.velocity.add(others[0].pos.subtract(this.pos).normalize().scale(this.statBlock.moveSpeed));
      if(this.cooldown<=0){
        if(!this.behavior){
          let distance = this.pos.distanceSquared(others[0].pos)
          if(distance < 3*3){
            if(this.actions.melee) this.doBehavior(this.actions.melee,this,others[0].pos)
          }else if(distance > 8*8 && distance < 12*12){
            if(this.actions.range) this.doBehavior(this.actions.range,this,others[0].pos)
          }
        }
      }
    }
  }

  async hurtAction(self,agressor,knockback){
    self.velocity = agressor.velocity.scale(4 * knockback)
    self.overrideSprite = tile(self.baseSprite.add(vec2(64,0)))
    self.verticalVel = 5 * knockback
    if(await self.time(0.5*knockback)) return;
    self.overrideSprite = undefined
    self.behavior = undefined
  }
  
  onDamage(agressor,damage,knockback = 1){
    this.hp -= damage;
    if(this.hp<=0){
      agressor.grantXp(this.xp);
      this.xp = 0;
      this.destroy();
    }else{
      if(knockback>0) this.doBehavior(this.hurtAction,this,agressor,knockback)
    }
  }
  
  doBehavior(method,...args){
    if(this.cleanUp) this.cleanUp();
    this.cleanUp = undefined;
    this.stepT = 0;
    this.behaviorId = Math.random();
    this.behavior = method(...args);
  }

  async con(c){
    let initialBehavior = this.behaviorId;
    while(c() && !this.destroyed && initialBehavior == this.behaviorId){
      await nextFrame;
    }
    if(initialBehavior !== this.behaviorId){
      return true;
    }
    if(this.destroyed) return true;
    return false;
  }
  
  async frame(){
    let initialBehavior = this.behaviorId;
    await nextFrame;
    if(initialBehavior !== this.behaviorId){
      return true;
    }
    if(this.destroyed) return true;
    return false;
  }

  async time(t){
    let initialBehavior = this.behaviorId;
    let startTime = time;
    while(time<startTime+t && !this.destroyed && initialBehavior == this.behaviorId){
      await nextFrame;
    }
    if(initialBehavior !== this.behaviorId){
      return true;
    }
    if(this.destroyed) return true;
    return false;
  }

  update(){

    this.passiveEffects.forEach(e=>e(this))

    if(this.cooldown>0){
      this.cooldown-= timeDelta * this.statBlock.cooldownSpeed;
    }

    this.verticalPos += this.verticalVel*timeDelta;
    this.verticalVel -= 0.4*this.statBlock.weight
    if(this.verticalPos<0) this.verticalPos,this.verticalVel=0,0;

    if(this.behavior === undefined){
      this.controlLogic();

      if(this.velocity.lengthSquared()>0.0001){
        this.stepT = (this.stepT + 0.1);
      }else{
        this.stepT = lerpAngle(0.8,this.stepT,0);
      }

      if(this.velocity.x<0) this.mirror = true;
      if(this.velocity.x>0) this.mirror = false;
    }


    super.update();
  }

  stepHeight() {
    return Math.sin(this.stepT);
  }

  sprite(){
    let walkframes = [32,16,48]
    let sprite = this.baseSprite.copy();
    let stepHeight = this.stepHeight();
    if(Math.abs(stepHeight)>0.02){
      sprite.x += walkframes[1+Math.round(stepHeight*1.5)];
    }
    return sprite;
  }

  render(){
    let stepHeight = this.stepHeight();
    drawRect(this.pos,vec2(0.8,0.2).scale(1/Math.max(1,Math.abs(stepHeight),this.verticalPos)),new Color(0,0,0.2))

    this.preRender.forEach(r=>r(this));

    this.renderOrder = -this.pos.y;
    let sprite = this.sprite();

    if(debugOverlay){
      debugCircle(this.pos,this.behavior?1:0,"#0ff")
      debugCircle(this.pos,this.hp,"#0f0")
    }
    
    drawTile(this.pos.add(vec2(0,Math.abs(stepHeight)/4+0.5+this.verticalPos)),undefined,this.overrideSprite??tile(sprite),undefined,undefined,this.overrideMirror??this.mirror);
    if(this.attackdraw) this.attackdraw();
  }
}

class FastLowHealthCombattant extends Combattant {
  constructor(pos,team){
    super(pos,team)
    this.xp = 5;
    this.baseStatBlock.moveSpeed *= 1.7;
    this.baseStatBlock.windUp = 0.25;
    this.baseStatBlock.maxHp = 1;
    this.hp = 1;
    this.baseSprite = vec2(0,48)
  }
}

class RangeCombattant extends Combattant {
  constructor(pos,team){
    super(pos,team)
    this.xp = 5;
    
    this.actions.range = basicShot;
    this.baseStatBlock.maxHp = 1;
    this.baseStatBlock.cooldownSpeed /= 10;
    this.baseStatBlock.projectileSpeed /= 4;
    this.hp = 1;
    this.baseSprite = vec2(0,32)
  }
}

class ControlledCombattant extends Combattant {
  constructor(pos,team){
    super(pos,team)
    this.baseSprite = vec2(0,32);
    this.iframes = 0;

    this.baseStatBlock.cooldownSpeed *= 10;

    this.xp = 0;

    this.hasTail = true;

    this.baseStatBlock.moveSpeed *= 1.6;
    this.baseStatBlock.windUp /= 4; //they get a little cranky if the move doesn't come out quickly.
    this.baseStatBlock.projectileRadius *= 3; //players are bad at aiming! it's only fair..

  }


  onDamage(agressor,damage,knockback = 1){
    if(this.iframes==0){
      this.iframes = Math.floor(90 * knockback);
      super.onDamage(agressor,damage,knockback);
    }
  }

  update(){
    super.update();
    if(this.iframes>0) this.iframes--;
  }

  render(){
    if(this.iframes**1.5%4<2){
      super.render();
    }
  }


  controlLogic(){
    if(!this.behavior){
      if(this.cooldown<=0){
        if(fireMode(this.fireModes.melee,0) && this.actions.melee) this.doBehavior(this.actions.melee,this,mousePos)
        if(fireMode(this.fireModes.range,2) && this.actions.range) this.doBehavior(this.actions.range,this,mousePos)
      }
    }
    let dir = vec2();
    if(keyIsDown(37)) dir = dir.add(vec2(-1, 0))
    if(keyIsDown(38)) dir = dir.add(vec2( 0, 1))
    if(keyIsDown(39)) dir = dir.add(vec2( 1, 0))
    if(keyIsDown(40)) dir = dir.add(vec2( 0,-1))
    if(dir.lengthSquared()>0){
      this.velocity = this.velocity.add(dir.normalize().scale(this.statBlock.moveSpeed))
    }
  }
}

function fireMode(mode,button){
  return mode == "repeated" ? mouseIsDown(button) : mouseWasPressed(button)
}