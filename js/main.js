const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
const minimap=document.getElementById('minimap');
const mctx=minimap.getContext('2d');

const menu=document.getElementById('menu');
const game=document.getElementById('game');
const gameover=document.getElementById('gameover');
const playBtn=document.getElementById('playBtn');
const retryBtn=document.getElementById('retryBtn');
const menuBtn=document.getElementById('menuBtn');
const quitBtn=document.getElementById('quitBtn');
const nameInput=document.getElementById('playerName');
const colorPicker=document.getElementById('colorPicker');

const hudName=document.getElementById('hudName');
const territoryEl=document.getElementById('territory');
const killsEl=document.getElementById('kills');
const coinsEl=document.getElementById('coins');
const menuCoins=document.getElementById('menuCoins');
const bestScoreEl=document.getElementById('bestScore');
const bestKillsEl=document.getElementById('bestKills');
const finalScoreEl=document.getElementById('finalScore');
const finalKillsEl=document.getElementById('finalKills');
const earnedCoinsEl=document.getElementById('earnedCoins');
const leaderboardList=document.getElementById('leaderboardList');
const playerDot=document.getElementById('playerDot');
const dangerText=document.getElementById('dangerText');
const toastEl=document.getElementById('toast');

const TAU=Math.PI*2;
const WORLD_RADIUS=1320;
const CELL=24;
const GRID=Math.ceil(WORLD_RADIUS*2/CELL);
const GRID_HALF=GRID/2;
const COLORS=['#ffd84d','#56a8ff','#ff637b','#67dc9a','#b878ff','#ff914d','#47d9d1','#f472d0'];
const BOT_NAMES=['Nova','Byte','Mika','Zen','Kiro','Lumi','Rex','Pico','Nox','Vega','Milo','Flux','Astra','Jinx'];
const WORLD={radius:WORLD_RADIUS};

let W=innerWidth,H=innerHeight,dpr=1;
let running=false,last=0;
let camera={x:0,y:0,zoom:1};
let keys={};
let pointerActive=false;
let selectedColor=localStorage.getItem('ptpColor')||COLORS[0];

let totalCoins=Number(localStorage.getItem('ptpCoins')||0);
let bestScore=Number(localStorage.getItem('ptpBest')||0);
let bestKills=Number(localStorage.getItem('ptpBestKills')||0);
let currentEarned=0;
let kills=0;
let score=0;
let toastTimer=0;

let ownerGrid;
let players=[];
let player;
let coins=[];
let particles=[];

const audio={ctx:null};
function blip(freq=440,duration=.06,type='sine',gain=.035){
  try{
    audio.ctx ||= new (window.AudioContext||window.webkitAudioContext)();
    const o=audio.ctx.createOscillator(),g=audio.ctx.createGain();
    o.type=type;o.frequency.value=freq;g.gain.value=gain;
    o.connect(g);g.connect(audio.ctx.destination);
    o.start();g.gain.exponentialRampToValueAtTime(.001,audio.ctx.currentTime+duration);
    o.stop(audio.ctx.currentTime+duration);
  }catch{}
}

function resize(){
  dpr=Math.min(devicePixelRatio||1,2);
  W=innerWidth;H=innerHeight;
  canvas.width=Math.floor(W*dpr);canvas.height=Math.floor(H*dpr);
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize',resize);resize();

function show(screen){
  [menu,game,gameover].forEach(s=>s.classList.remove('active'));
  screen.classList.add('active');
}

function initColorPicker(){
  colorPicker.innerHTML='';
  COLORS.forEach(color=>{
    const b=document.createElement('button');
    b.className='color-choice'+(color===selectedColor?' active':'');
    b.style.background=color;
    b.onclick=()=>{
      selectedColor=color;
      localStorage.setItem('ptpColor',color);
      initColorPicker();
    };
    colorPicker.appendChild(b);
  });
}
initColorPicker();

function makeGrid(){
  ownerGrid=new Int16Array(GRID*GRID);
  ownerGrid.fill(-1);
}

function gridIndex(gx,gy){
  if(gx<0||gy<0||gx>=GRID||gy>=GRID)return -1;
  return gy*GRID+gx;
}
function worldToGrid(x,y){
  return {
    gx:Math.floor((x+WORLD_RADIUS)/CELL),
    gy:Math.floor((y+WORLD_RADIUS)/CELL)
  };
}
function gridToWorld(gx,gy){
  return {
    x:(gx+.5)*CELL-WORLD_RADIUS,
    y:(gy+.5)*CELL-WORLD_RADIUS
  };
}
function inCircleCell(gx,gy){
  const p=gridToWorld(gx,gy);
  return p.x*p.x+p.y*p.y <= (WORLD_RADIUS-CELL*.6)**2;
}
function getOwnerAt(x,y){
  const {gx,gy}=worldToGrid(x,y);
  const i=gridIndex(gx,gy);
  return i<0?-99:ownerGrid[i];
}

function createEntity(id,name,color,x,y,isBot=false){
  const a=Math.random()*TAU;
  return {
    id,name,color,x,y,
    r:14,
    dirX:Math.cos(a),dirY:Math.sin(a),
    angle:a,
    speed:isBot?150+Math.random()*18:184,
    isBot,
    alive:true,
    outside:false,
    trail:[],
    trailCells:new Set(),
    territoryCount:0,
    botTimer:0,
    targetAngle:a,
    excursionTarget:1.2+Math.random()*1.4,
    respawn:0,
    invuln:isBot?1.1:0
  };
}

function paintStartArea(entity,radius=100){
  const c=worldToGrid(entity.x,entity.y);
  const cr=Math.ceil(radius/CELL);
  for(let gy=c.gy-cr;gy<=c.gy+cr;gy++){
    for(let gx=c.gx-cr;gx<=c.gx+cr;gx++){
      if(!inCircleCell(gx,gy))continue;
      const p=gridToWorld(gx,gy);
      if(Math.hypot(p.x-entity.x,p.y-entity.y)<=radius){
        const i=gridIndex(gx,gy);
        ownerGrid[i]=entity.id;
      }
    }
  }
}

function recountTerritory(){
  for(const e of players)e.territoryCount=0;
  for(let i=0;i<ownerGrid.length;i++){
    const id=ownerGrid[i];
    if(id>=0&&players[id])players[id].territoryCount++;
  }
}

function chooseBotSpawn(index){
  const angle=(index/(9))*TAU+Math.random()*.3;
  const r=560+Math.random()*560;
  return {x:Math.cos(angle)*r,y:Math.sin(angle)*r};
}

function resetGame(){
  makeGrid();players=[];particles=[];coins=[];kills=0;score=0;currentEarned=0;

  const pname=(nameInput.value.trim()||'Player').slice(0,16);
  player=createEntity(0,pname,selectedColor,0,0,false);
  player.dirX=1;player.dirY=0;player.angle=0;
  players.push(player);
  paintStartArea(player,118);

  const botColors=COLORS.filter(c=>c!==selectedColor);
  for(let i=1;i<=8;i++){
    const pos=chooseBotSpawn(i);
    const bot=createEntity(i,BOT_NAMES[(i-1)%BOT_NAMES.length],botColors[(i-1)%botColors.length],pos.x,pos.y,true);
    players.push(bot);
    paintStartArea(bot,90+Math.random()*25);
  }

  recountTerritory();

  coins=Array.from({length:125},()=>spawnCoin());
  camera.x=player.x;camera.y=player.y;camera.zoom=1;
  hudName.textContent=player.name;playerDot.style.background=player.color;
  running=true;last=performance.now();
  dangerText.classList.remove('show');
  updateHud();
}

function spawnCoin(){
  let x,y;
  do{
    const a=Math.random()*TAU;
    const r=Math.sqrt(Math.random())*(WORLD_RADIUS-60);
    x=Math.cos(a)*r;y=Math.sin(a)*r;
  }while(getOwnerAt(x,y)<-1);
  return {x,y,r:6,spin:Math.random()*TAU};
}

function start(){
  resetGame();show(game);blip(520,.08,'square',.02);
  requestAnimationFrame(loop);
}

function loop(now){
  if(!running)return;
  const dt=Math.min((now-last)/1000,.033);
  last=now;
  update(dt);draw();
  requestAnimationFrame(loop);
}

function update(dt){
  if(player.alive)updatePlayerInput();
  for(const e of players){
    if(!e.alive){
      if(e.isBot){
        e.respawn-=dt;
        if(e.respawn<=0)respawnBot(e);
      }
      continue;
    }
    if(e.invuln>0)e.invuln-=dt;
    if(e.isBot)updateBotAI(e,dt);
    moveEntity(e,dt);
  }

  resolveTrailCollisions();
  updateCoins(dt);
  updateParticles(dt);

  const targetZoom=player.outside?.92:1;
  camera.zoom+=(targetZoom-camera.zoom)*Math.min(1,dt*2.5);
  camera.x+=(player.x-camera.x)*Math.min(1,dt*5.4);
  camera.y+=(player.y-camera.y)*Math.min(1,dt*5.4);

  if(toastTimer>0){
    toastTimer-=dt;
    if(toastTimer<=0)toastEl.classList.remove('show');
  }

  updateHud();
}

function updatePlayerInput(){
  let x=0,y=0;
  if(keys.arrowleft||keys.a||keys.q)x-=1;
  if(keys.arrowright||keys.d)x+=1;
  if(keys.arrowup||keys.w||keys.z)y-=1;
  if(keys.arrowdown||keys.s)y+=1;
  if(x||y)setDirection(player,x,y);
}

function setDirection(e,x,y){
  const l=Math.hypot(x,y)||1;
  const nx=x/l,ny=y/l;
  if(e.trail.length>3 && nx*e.dirX+ny*e.dirY<-.72)return;
  e.dirX=nx;e.dirY=ny;e.angle=Math.atan2(ny,nx);
}

function updateBotAI(bot,dt){
  bot.botTimer-=dt;
  const own=getOwnerAt(bot.x,bot.y)===bot.id;

  if(bot.botTimer<=0){
    bot.botTimer=.45+Math.random()*.9;

    const edgeDist=WORLD_RADIUS-Math.hypot(bot.x,bot.y);
    if(edgeDist<130){
      bot.targetAngle=Math.atan2(-bot.y,-bot.x)+(Math.random()-.5)*.5;
    }else if(bot.outside && bot.trail.length>bot.excursionTarget*17){
      const home=findNearestOwnedCell(bot);
      bot.targetAngle=Math.atan2(home.y-bot.y,home.x-bot.x)+(Math.random()-.5)*.28;
    }else if(own && Math.random()<.7){
      bot.targetAngle=bot.angle+(Math.random()-.5)*1.5;
      bot.excursionTarget=1.2+Math.random()*2.3;
    }else{
      const playerTrailTarget=findTrailTarget(bot);
      if(playerTrailTarget && Math.random()<.55){
        bot.targetAngle=Math.atan2(playerTrailTarget.y-bot.y,playerTrailTarget.x-bot.x);
      }else{
        bot.targetAngle+= (Math.random()-.5)*1.05;
      }
    }
  }

  let delta=normalizeAngle(bot.targetAngle-bot.angle);
  delta=Math.max(-1.65*dt,Math.min(1.65*dt,delta));
  bot.angle+=delta;
  bot.dirX=Math.cos(bot.angle);bot.dirY=Math.sin(bot.angle);
}

function findNearestOwnedCell(bot){
  const c=worldToGrid(bot.x,bot.y);
  let best={x:0,y:0},bd=Infinity;
  for(let rr=1;rr<18;rr+=3){
    for(let y=c.gy-rr;y<=c.gy+rr;y++){
      for(let x=c.gx-rr;x<=c.gx+rr;x++){
        const i=gridIndex(x,y);
        if(i>=0&&ownerGrid[i]===bot.id){
          const p=gridToWorld(x,y),d=(p.x-bot.x)**2+(p.y-bot.y)**2;
          if(d<bd){bd=d;best=p}
        }
      }
    }
    if(bd<Infinity)break;
  }
  return best;
}

function findTrailTarget(bot){
  let best=null,bd=260*260;
  for(const e of players){
    if(!e.alive||e.id===bot.id||e.trail.length<3)continue;
    for(let i=0;i<e.trail.length;i+=4){
      const p=e.trail[i],d=(p.x-bot.x)**2+(p.y-bot.y)**2;
      if(d<bd){bd=d;best=p}
    }
  }
  return best;
}

function normalizeAngle(a){
  while(a>Math.PI)a-=TAU;
  while(a<-Math.PI)a+=TAU;
  return a;
}

function moveEntity(e,dt){
  e.x+=e.dirX*e.speed*dt;
  e.y+=e.dirY*e.speed*dt;

  const d=Math.hypot(e.x,e.y);
  if(d>WORLD_RADIUS-e.r-10){
    const nx=e.x/d,ny=e.y/d;
    e.x=nx*(WORLD_RADIUS-e.r-10);
    e.y=ny*(WORLD_RADIUS-e.r-10);
    if(e.isBot){
      e.angle=Math.atan2(-e.y,-e.x)+(Math.random()-.5)*.45;
      e.dirX=Math.cos(e.angle);e.dirY=Math.sin(e.angle);
    }
  }

  const own=getOwnerAt(e.x,e.y)===e.id;
  if(!own){
    if(!e.outside){
      e.outside=true;
      e.trail=[];e.trailCells.clear();
    }
    appendTrail(e);
  }else if(e.outside){
    if(e.trail.length>=3)claimLoop(e);
    e.outside=false;
    e.trail=[];e.trailCells.clear();
  }

  if(e===player)dangerText.classList.toggle('show',e.outside&&e.trail.length>18);
}

function appendTrail(e){
  const {gx,gy}=worldToGrid(e.x,e.y);
  const key=gx+','+gy;
  if(e.trailCells.has(key))return;
  const p=gridToWorld(gx,gy);
  e.trail.push({x:p.x,y:p.y,gx,gy});
  e.trailCells.add(key);

  if(e.trail.length>5){
    for(let i=0;i<e.trail.length-4;i++){
      const t=e.trail[i];
      if(Math.hypot(e.x-t.x,e.y-t.y)<CELL*.72){
        killEntity(e,null);
        return;
      }
    }
  }
}

function claimLoop(e){
  const before=e.territoryCount;
  if(e.trail.length<3)return;

  const polygon=e.trail.map(t=>({x:t.x,y:t.y}));

  // On ferme uniquement la boucle dessinée par la trace.
  // Le territoire n'est plus agrandi comme un grand cercle.
  const xs=polygon.map(p=>p.x);
  const ys=polygon.map(p=>p.y);
  const minGX=Math.max(0,worldToGrid(Math.min(...xs)-CELL,0).gx);
  const maxGX=Math.min(GRID-1,worldToGrid(Math.max(...xs)+CELL,0).gx);
  const minGY=Math.max(0,worldToGrid(0,Math.min(...ys)-CELL).gy);
  const maxGY=Math.min(GRID-1,worldToGrid(0,Math.max(...ys)+CELL).gy);

  for(const t of e.trail){
    const i=gridIndex(t.gx,t.gy);
    if(i>=0&&inCircleCell(t.gx,t.gy))ownerGrid[i]=e.id;
  }

  for(let gy=minGY;gy<=maxGY;gy++){
    for(let gx=minGX;gx<=maxGX;gx++){
      if(!inCircleCell(gx,gy))continue;
      const p=gridToWorld(gx,gy);
      if(pointInPolygon(p.x,p.y,polygon)){
        ownerGrid[gridIndex(gx,gy)]=e.id;
      }
    }
  }

  recountTerritory();

  const gained=Math.max(0,e.territoryCount-before);
  if(gained>0){
    burst(e.x,e.y,e.color,22);
    if(e===player){
      const pct=gained/countPlayableCells()*100;
      if(pct>.05)toast('+'+pct.toFixed(1)+'% territoire');
      blip(670,.08,'triangle',.035);
    }
  }
}

function pointInPolygon(x,y,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i].x,yi=poly[i].y;
    const xj=poly[j].x,yj=poly[j].y;
    const intersect=((yi>y)!=(yj>y)) &&
      (x < (xj-xi)*(y-yi)/((yj-yi)||0.000001)+xi);
    if(intersect)inside=!inside;
  }
  return inside;
}

let playableCellsCache=0;
function countPlayableCells(){
  if(playableCellsCache)return playableCellsCache;
  let n=0;
  for(let gy=0;gy<GRID;gy++)for(let gx=0;gx<GRID;gx++)if(inCircleCell(gx,gy))n++;
  playableCellsCache=n;
  return n;
}

function floodFillClaim(ownerId){
  const outside=new Uint8Array(ownerGrid.length);
  const qx=new Int16Array(ownerGrid.length);
  const qy=new Int16Array(ownerGrid.length);
  let head=0,tail=0;

  function push(gx,gy){
    const i=gridIndex(gx,gy);
    if(i<0||outside[i]||!inCircleCell(gx,gy)||ownerGrid[i]===ownerId)return;
    outside[i]=1;qx[tail]=gx;qy[tail]=gy;tail++;
  }

  for(let x=0;x<GRID;x++){push(x,0);push(x,GRID-1)}
  for(let y=1;y<GRID-1;y++){push(0,y);push(GRID-1,y)}

  while(head<tail){
    const x=qx[head],y=qy[head];head++;
    push(x+1,y);push(x-1,y);push(x,y+1);push(x,y-1);
  }

  for(let gy=0;gy<GRID;gy++){
    for(let gx=0;gx<GRID;gx++){
      const i=gridIndex(gx,gy);
      if(inCircleCell(gx,gy)&&!outside[i])ownerGrid[i]=ownerId;
    }
  }
}

function resolveTrailCollisions(){
  for(const attacker of players){
    if(!attacker.alive||attacker.invuln>0)continue;

    for(const victim of players){
      if(!victim.alive||victim.id===attacker.id||victim.trail.length<1)continue;
      for(let i=0;i<victim.trail.length;i++){
        const t=victim.trail[i];
        if(Math.hypot(attacker.x-t.x,attacker.y-t.y)<attacker.r+CELL*.38){
          killEntity(victim,attacker);
          break;
        }
      }
    }
  }

  for(let i=0;i<players.length;i++){
    const a=players[i];
    if(!a.alive||a.invuln>0)continue;
    for(let j=i+1;j<players.length;j++){
      const b=players[j];
      if(!b.alive||b.invuln>0)continue;
      if(Math.hypot(a.x-b.x,a.y-b.y)<a.r+b.r-4){
        if(a.outside&&!b.outside)killEntity(a,b);
        else if(b.outside&&!a.outside)killEntity(b,a);
        else{
          killEntity(a,b);
          if(b.alive)killEntity(b,a);
        }
      }
    }
  }
}

function killEntity(victim,killer){
  if(!victim.alive)return;
  victim.alive=false;
  burst(victim.x,victim.y,victim.color,42);
  if(killer&&killer.alive){
    if(killer===player){
      kills++;
      currentEarned+=3;
      toast('Élimination +3 🪙');
      blip(250,.12,'square',.035);
    }
  }

  if(victim===player){
    endGame();
  }else{
    clearTerritory(victim.id);
    victim.trail=[];victim.trailCells.clear();
    victim.respawn=1.3+Math.random()*1.8;
    recountTerritory();
  }
}

function clearTerritory(id){
  for(let i=0;i<ownerGrid.length;i++)if(ownerGrid[i]===id)ownerGrid[i]=-1;
}

function respawnBot(bot){
  const a=Math.random()*TAU,r=450+Math.random()*700;
  bot.x=Math.cos(a)*r;bot.y=Math.sin(a)*r;
  bot.angle=Math.random()*TAU;bot.dirX=Math.cos(bot.angle);bot.dirY=Math.sin(bot.angle);
  bot.alive=true;bot.outside=false;bot.trail=[];bot.trailCells.clear();bot.invuln=1.2;
  paintStartArea(bot,85+Math.random()*22);
  recountTerritory();
}

function updateCoins(dt){
  for(const c of coins)c.spin+=dt*4;
  for(let i=coins.length-1;i>=0;i--){
    const c=coins[i];
    if(player.alive&&Math.hypot(player.x-c.x,player.y-c.y)<player.r+10){
      coins.splice(i,1);currentEarned++;
      burst(c.x,c.y,'#ffca35',8);
      blip(900,.04,'sine',.018);
    }
  }
  while(coins.length<125)coins.push(spawnCoin());
}

function burst(x,y,color,count){
  for(let i=0;i<count;i++){
    const a=Math.random()*TAU,s=40+Math.random()*190;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25+Math.random()*.55,max:.8,color,size:2+Math.random()*5});
  }
}
function updateParticles(dt){
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;p.life-=dt}
  particles=particles.filter(p=>p.life>0);
}

function toast(text){
  toastEl.textContent=text;toastEl.classList.add('show');toastTimer=1.4;
}

function endGame(){
  if(!running)return;
  running=false;
  const earned=currentEarned+Math.floor(score*.7);
  totalCoins+=earned;
  bestScore=Math.max(bestScore,score);
  bestKills=Math.max(bestKills,kills);
  localStorage.setItem('ptpCoins',totalCoins);
  localStorage.setItem('ptpBest',bestScore.toFixed(2));
  localStorage.setItem('ptpBestKills',bestKills);
  finalScoreEl.textContent=score.toFixed(1)+'%';
  finalKillsEl.textContent=kills;
  earnedCoinsEl.textContent=earned;
  updateMenuStats();
  setTimeout(()=>show(gameover),180);
}

function updateMenuStats(){
  menuCoins.textContent=totalCoins;
  bestScoreEl.textContent=bestScore.toFixed(1)+'%';
  bestKillsEl.textContent=bestKills;
}
updateMenuStats();

function updateHud(){
  recountTerritory();
  score=player.territoryCount/countPlayableCells()*100;
  territoryEl.textContent=score.toFixed(1)+'%';
  killsEl.textContent=kills;
  coinsEl.textContent=totalCoins+currentEarned;

  const ranks=players.filter(e=>e.alive).map(e=>({
    id:e.id,name:e.name,score:e.territoryCount/countPlayableCells()*100
  })).sort((a,b)=>b.score-a.score);

  leaderboardList.innerHTML=ranks.map(r=>'<li class="'+(r.id===0?'me':'')+'">'+escapeHtml(r.name)+' <b>'+r.score.toFixed(1)+'%</b></li>').join('');
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

function screen(x,y){
  return {x:(x-camera.x)*camera.zoom+W/2,y:(y-camera.y)*camera.zoom+H/2};
}

function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#171d28';ctx.fillRect(0,0,W,H);

  const center=screen(0,0);
  ctx.save();
  ctx.beginPath();ctx.arc(center.x,center.y,WORLD_RADIUS*camera.zoom,0,TAU);ctx.clip();

  ctx.fillStyle='#dbe4e8';
  ctx.fillRect(center.x-WORLD_RADIUS*camera.zoom,center.y-WORLD_RADIUS*camera.zoom,WORLD_RADIUS*2*camera.zoom,WORLD_RADIUS*2*camera.zoom);

  drawGridLines();
  drawOwnedCells();
  drawCoins();
  drawTrails();
  drawEntities();
  drawParticles();
  ctx.restore();

  ctx.beginPath();ctx.arc(center.x,center.y,WORLD_RADIUS*camera.zoom,0,TAU);
  ctx.strokeStyle='#ffffff66';ctx.lineWidth=8;ctx.stroke();

  drawMinimap();

  const vg=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.22,W/2,H/2,Math.max(W,H)*.72);
  vg.addColorStop(0,'#0000');vg.addColorStop(1,'#0006');
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
}

function drawGridLines(){
  const step=72;
  ctx.strokeStyle='#7d8f9920';ctx.lineWidth=1;
  for(let x=-WORLD_RADIUS;x<=WORLD_RADIUS;x+=step){
    const a=screen(x,-WORLD_RADIUS),b=screen(x,WORLD_RADIUS);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  for(let y=-WORLD_RADIUS;y<=WORLD_RADIUS;y+=step){
    const a=screen(-WORLD_RADIUS,y),b=screen(WORLD_RADIUS,y);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
}

function drawOwnedCells(){
  const s=CELL*camera.zoom+1;
  for(let gy=0;gy<GRID;gy++){
    for(let gx=0;gx<GRID;gx++){
      const i=gridIndex(gx,gy),owner=ownerGrid[i];
      if(owner<0||!players[owner])continue;
      const p=gridToWorld(gx,gy),sp=screen(p.x-CELL/2,p.y-CELL/2);
      if(sp.x+s<0||sp.y+s<0||sp.x>W||sp.y>H)continue;
      ctx.fillStyle=players[owner].color;
      ctx.globalAlpha=.72;
      ctx.fillRect(sp.x,sp.y,s,s);
    }
  }
  ctx.globalAlpha=1;
}

function drawTrails(){
  for(const e of players){
    if(!e.alive||e.trail.length<1)continue;
    ctx.beginPath();
    let p=screen(e.trail[0].x,e.trail[0].y);ctx.moveTo(p.x,p.y);
    for(let i=1;i<e.trail.length;i++){
      p=screen(e.trail[i].x,e.trail[i].y);ctx.lineTo(p.x,p.y);
    }
    p=screen(e.x,e.y);ctx.lineTo(p.x,p.y);
    ctx.strokeStyle=e.color;
    ctx.lineWidth=CELL*.72*camera.zoom;
    ctx.lineCap='butt';ctx.lineJoin='round';
    ctx.globalAlpha=.9;ctx.stroke();ctx.globalAlpha=1;
  }
}

function drawCoins(){
  for(const c of coins){
    const p=screen(c.x,c.y);
    if(p.x<-20||p.y<-20||p.x>W+20||p.y>H+20)continue;
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(.7+.3*Math.abs(Math.cos(c.spin)),1);
    ctx.beginPath();ctx.arc(0,0,7*camera.zoom,0,TAU);
    ctx.fillStyle='#ffc628';ctx.fill();
    ctx.strokeStyle='#fff0a8';ctx.lineWidth=2;ctx.stroke();
    ctx.restore();
  }
}

function drawEntities(){
  for(const e of players){
    if(!e.alive)continue;
    const p=screen(e.x,e.y),r=e.r*camera.zoom;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(e.angle);
    if(e.invuln>0&&Math.floor(e.invuln*12)%2===0)ctx.globalAlpha=.4;
    ctx.shadowColor='#0006';ctx.shadowBlur=9;
    ctx.fillStyle=e.color;
    const rr=5*camera.zoom;
    roundRect(ctx,-r,-r,r*2,r*2,rr);ctx.fill();
    ctx.fillStyle='#fff';
    ctx.shadowBlur=0;
    ctx.fillRect(r*.15,-r*.45,r*.34,r*.34);
    ctx.fillRect(r*.15,r*.11,r*.34,r*.34);
    ctx.restore();

    if(camera.zoom>.72){
      ctx.font='700 '+Math.max(10,11*camera.zoom)+'px Arial';
      ctx.textAlign='center';ctx.fillStyle='#26313b';
      ctx.fillText(e.name,p.x,p.y-r-7);
    }
  }
}

function roundRect(c,x,y,w,h,r){
  c.beginPath();c.roundRect(x,y,w,h,r);
}

function drawParticles(){
  for(const p of particles){
    const s=screen(p.x,p.y);
    ctx.globalAlpha=Math.max(0,p.life/p.max);
    ctx.fillStyle=p.color;ctx.fillRect(s.x,s.y,p.size,p.size);
  }
  ctx.globalAlpha=1;
}

function drawMinimap(){
  const mw=minimap.width,mh=minimap.height,cx=mw/2,cy=mh/2;
  mctx.clearRect(0,0,mw,mh);
  mctx.save();mctx.beginPath();mctx.arc(cx,cy,mw*.48,0,TAU);mctx.clip();
  mctx.fillStyle='#dbe4e8';mctx.fillRect(0,0,mw,mh);

  const scale=(mw*.46)/WORLD_RADIUS;
  const skip=3;
  for(let gy=0;gy<GRID;gy+=skip){
    for(let gx=0;gx<GRID;gx+=skip){
      const own=ownerGrid[gridIndex(gx,gy)];
      if(own<0||!players[own])continue;
      const p=gridToWorld(gx,gy);
      mctx.fillStyle=players[own].color;mctx.globalAlpha=.8;
      mctx.fillRect(cx+p.x*scale,cy+p.y*scale,CELL*scale*skip+1,CELL*scale*skip+1);
    }
  }
  mctx.globalAlpha=1;
  for(const e of players){
    if(!e.alive)continue;
    mctx.beginPath();mctx.arc(cx+e.x*scale,cy+e.y*scale,e===player?4:2.5,0,TAU);
    mctx.fillStyle=e.color;mctx.fill();
  }
  mctx.restore();
}

addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();keys[k]=true;
  if(['arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();
});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

canvas.addEventListener('pointerdown',e=>{
  pointerActive=true;
  canvas.setPointerCapture?.(e.pointerId);
  steerTo(e);
});
canvas.addEventListener('pointermove',e=>{if(pointerActive)steerTo(e)});
canvas.addEventListener('pointerup',()=>pointerActive=false);
canvas.addEventListener('pointercancel',()=>pointerActive=false);

function steerTo(e){
  const dx=e.clientX-W/2,dy=e.clientY-H/2;
  if(Math.hypot(dx,dy)<20)return;
  setDirection(player,dx,dy);
}

playBtn.onclick=start;
retryBtn.onclick=start;
menuBtn.onclick=()=>show(menu);
quitBtn.onclick=()=>{running=false;show(menu)};

document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&running)last=performance.now();
});
