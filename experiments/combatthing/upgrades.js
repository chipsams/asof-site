
/**
 * @type {Upgrade[]}
 */
const upgrades = [];
/**
 * @type {Upgrade[]}
 */
const enemyUpgradePool = [];

/**
 * @typedef {{
 *  maxHp: Number,
 *  moveSpeed: Number,
 *  cooldownSpeed: Number,
 *  attackPower: Number,
 *  projectileRadius: Number,
 *  projectileSpeed: Number,
 *  weight: Number,
 *  pierce: Number,
 *  windUp: Number,
 * }} StatBlock
 */

class Upgrade {
  /**
   * 
   * @param {{
   *  description; string,
   *  onGrant?: (entity)=>void,
   *  fireMode?: [String,String],
   *  slotMeleeMove?: Move,
   *  slotUtilMove?: Move,
   *  slotRangeMove?: Move,
   *  passiveEffect?: (entity: Combattant)=>void,
   *  attributeTweak?: (stats: StatBlock, baseStats: StatBlock)=>StatBlock,
   * }} properties
   */
  constructor(name,properties){
    this.name = name;

    
    this.description = properties.description;
    
    this.onGrant = properties.onGrant;
    
    this.fireMode = properties.fireMode;
    
    this.singleUse = properties.singleUse;
    /** this is for knowing if an upgrade would do literally nothing */
    this.moveOnly = properties.moveOnly;

    this.slotMeleeMove = properties.slotMeleeMove;
    this.slotUtilMove = properties.slotUtilMove;
    this.slotRangeMove = properties.slotRangeMove;

    this.passiveEffect = properties.passiveEffect;
    this.attributeTweak = properties.attributeTweak;

    this.color = hsl(Math.random(),0.7,0.5)

    upgrades.push(this);
    if(properties.enemyPool) enemyUpgradePool.push(this);
  }

  /**
   * 
   * @param {Combattant} entity 
   */
  apply(entity){
    if(Object.keys(entity.upgrades).length == 0) upgradedCharacters++;

    entity.team.upgrades[this.name]??=0;
    entity.team.upgrades[this.name]++;

    entity.upgrades[this.name]??=0;
    entity.upgrades[this.name]++;

    if(this.fireMode){
      entity.fireModes[this.fireMode[0]] = this.fireMode[1];
    }

    if(this.onGrant) this.onGrant(entity)
    if(this.slotMeleeMove) entity.actions.melee = this.slotMeleeMove
    if(this.slotRangeMove) entity.actions.range = this.slotRangeMove

    if(this.passiveEffect) entity.passiveEffects.push(this.passiveEffect)

    if(this.attributeTweak){
      entity.tweakStats(this.attributeTweak)
    }
  }
}

new Upgrade("projectile_radius",{
  description: "all attacks now have +0.25 units radius",
  attributeTweak: ({projectileRadius,...stats})=>({projectileRadius:projectileRadius+0.25,...stats})
})
new Upgrade("health_up",{
  description: "gain a single extra point of health",
  onGrant: entity=>entity.hp++,
  attributeTweak: ({maxHp,...stats})=>({maxHp:maxHp+1,...stats})
})
new Upgrade("speed_up",{
  description: "get 5% speed, at the cost of weight (0.75x)",
  attributeTweak: ({moveSpeed,weight,...stats},{moveSpeed:baseMoveSpeed})=>({moveSpeed:moveSpeed+=baseMoveSpeed*0.05,weight:weight*0.75,...stats})
})
new Upgrade("damage_up",{
  description: "gain +1 damage on every hit, but get hurt for -2hp",
  onGrant: (entity)=>{
    entity.onDamage(entity,2)
  },
  attributeTweak: ({attackPower,...stats})=>({attackPower:attackPower+=1,...stats})
})
new Upgrade("pierce_up",{
  description: "bullets can pierce one more enemy, but they loose -0.25 damage",
  attributeTweak: ({attackPower,pierce,...stats})=>({attackPower:attackPower-=0.25,pierce:pierce+1,...stats})
})
new Upgrade("weight_up",{
  description: "fall to the ground quicker (1.5x)",
  attributeTweak: ({weight,...stats})=>({weight:weight*1.5,...stats})
})

class Ooze extends EngineObject {
  constructor(pos,owner){
    super(pos)
    this.team = owner.team;
    this.renderOrder = -99999;
    this.owner = owner;
    this.color = this.team.color;
    const statMod = ({moveSpeed,...s})=>({moveSpeed:moveSpeed/2,...s})
    new Collider(this,1,e=>{
      e.inooze??=0
      if(e.inooze==0){
        e.tweakStats(statMod)
      }
      e.inooze++
    },e=>{
      if(--e.inooze == 0)
        e.removeTweak(statMod)
    })
  }

  destroy(){
    super.destroy();
  }

  update(){
    this.size = vec2((1-(time-this.spawnTime)/10)*this.owner.statBlock.projectileRadius*2,3)
    if(time-this.spawnTime > 10) this.destroy();
  }
}

new Upgrade("ooze_trail",{
  description: "produce an ooze that slows enemies!",
  singleUse: true,
  onGrant: (entity)=>{

  },
  passiveEffect: (entity)=>{
    if(frame%10==0){
      entity.latestooze = new Ooze(entity.pos,entity)
    }
    if(entity.latestooze){
      entity.latestooze.pos = entity.pos.copy()
      entity.latestooze.angle = entity.velocity.angle()
    }
  },
  enemyPool: true,
})

class SawBlade extends EngineObject {
  /**
   * 
   * @param {Combattant} owner 
   */
  constructor(owner){
    super(owner.pos)
    this.owner = owner
    this.team = owner.team;
    owner.addChild(this);
    this.sawCollider = new Collider(this,4);
    this.innerSawCollider = new Collider(this,2);
  }
  
  update(){
    this.pos = this.owner.pos;
    this.size = vec2(this.owner.statBlock.projectileRadius*8);
    this.angle = this.angle + Math.min(time-this.spawnTime,0.125);
    if(frame%10==0){
      this.sawCollider.lastHit.filter(e=>this.innerSawCollider.lastHit.indexOf(e)==-1).forEach(e=>e.onDamage(this.owner,0.125*this.owner.statBlock.attackPower,0.15))
    }
  }

  renderRing(speed,distance,density) {
    for(let a=0;a<Math.PI*2;a+=Math.PI/density*2){
      let angle = a-time*speed;
      drawTile(
        this.pos.add(vec2(this.size.x*distance,0).rotate(angle)),
        undefined,
        tile(vec2(192+Math.floor(mod(7.5-angle/Math.PI*4,2))*16,32)),
        this.team.color,
        Math.floor(0.25-angle/Math.PI*2)*Math.PI/2,
      )
    }
  }

  render(){
    this.renderRing(0.5,0.5,16)
    this.renderRing(1.5,-0.4,12)
    this.renderRing(-0.5,0.35,10)
    this.renderRing(0.9,-0.25,8)
  }
}

new Upgrade("saw_blade",{
  description: "use an orbit of weak saws to deal damage to every enemy nearby",
  singleUse: true,
  onGrant: (entity)=>{
    entity.sawblade = new SawBlade(entity)
  },
  passiveEffect: (entity)=>{
  },
  enemyPool: true,
})

//*
new Upgrade("beam_shot",{
  description: "unleash an endless barrage of weak bolts with minimal recoil",
  moveOnly: true,
  fireMode: ["range","repeated"],
  slotRangeMove: beamShot
})
new Upgrade("basic_shot",{
  description: "shoot a single bolt, giving a high recoil with low movement downtime",
  moveOnly: true,
  fireMode: ["range","repeated"],
  slotRangeMove: basicShot
})
new Upgrade("shotgun",{
  description: "swap out your ranged shot for a momentum halting high-spread blast",
  moveOnly: true,
  fireMode: ["range","single"],
  slotRangeMove: ShotgunMove
})

new Upgrade("lunge",{
  description: "lunge towards enemies, dealing damage",
  moveOnly: true,
  fireMode: ["melee","repeated"],
  slotMeleeMove: basicLunge
})
const tailwhipupgrade = new Upgrade("tailwhip",{
  description: "give up the path of lunging, and use your tail to whip enemies, gain +5% speed",
  attributeTweak: ({moveSpeed,...stats})=>({moveSpeed:moveSpeed+0.0125,...stats}),
  onGrant: (entity)=>{
    entity.preRender.push(()=>{
      if(!entity.hasTail && !entity.tailAttacking){
        drawTile(
          entity.pos.add(vec2(0,Math.abs(entity.stepHeight())/4+0.5+entity.verticalPos+wave(1,0.04)-0.02)),
          undefined,
          tile(vec2(240,32)),entity.team.color,undefined,entity.overrideMirror??entity.mirror);
      }
    })
  },
  fireMode: ["melee","repeated"],
  slotMeleeMove: TailWhipMove,
  enemyPool: true,
})
//*/