const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
const menu=document.getElementById('menu');
const game=document.getElementById('game');
const gameover=document.getElementById('gameover');
const playBtn=document.getElementById('playBtn');
const retryBtn=document.getElementById('retryBtn');
const menuBtn=document.getElementById('menuBtn');
const quitBtn=document.getElementById('quitBtn');
const nameInput=document.getElementById('playerName');
const hudName=document.getElementById('hudName');
const territoryEl=document.getElementById('territory');
const coinsEl=document.getElementById('coins');
const menuCoins=document.getElementById('menuCoins');
const bestScoreEl=document.getElementById('bestScore');
const finalScoreEl=document.getElementById('finalScore');
const earnedCoinsEl=document.getElementById('earnedCoins');
const leaderboardList=document.getElementById('leaderboardList');

const TAU=Math.PI*2;
const world={radius:980};
let W=innerWidth,H=innerHeight,dpr=1;
let running=false,last=0,camera={x:0,y:0};
let totalCoins=Number(localStorage.getItem('ptpCoins')||0);
let bestScore=Number(localStorage.getItem('ptpBest')||0);
let currentEarned=0;
let keys={};
let coins=[];
let bots=[];
let trail=[];
let owned=[];
let score=0;

const player={x:0,y:0,r:13,speed:235,color:'#ffd84d',angle:0,dx:1,dy:0,name:'Player',homeR:100,outside:false};

function show(screen){
  [menu,game,gameover].forEach(s=>s.classList.remove('active'));
  screen.classList.add('active');
}

function resize(){
  dpr=Math.min(devicePixelRatio||1,2);
  W=innerWidth;H=innerHeight;
  canvas.width=Math.floor(W*dpr);canvas.height=Math.floor(H*dpr);
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize',resize);resize();

function resetGame(){
  player.x=0;player.y=0;player.dx=1;player.dy=0;player.angle=0;
  player.name=(nameInput.value.trim()||'Player').slice(0,16);
  hudName.textContent=player.name;
  trail=[];owned=[];score=0;currentEarned=0;
  coins=Array.from({length:90},()=>spawnPoint(80));
  bots=[
    makeBot('Nova','#58a6ff',260,-160),
    makeBot('Byte','#ff6b6b',-300,180),
    makeBot('Mika','#b26bff',180,330),
    makeBot('Zen','#54d98c',-240,-300)
  ];
  running=true;last=performance.now();
  updateHud();
}

function makeBot(name,color,x,y){
  return {name,color,x,y,r:12,angle:Math.random()*TAU,speed:100+Math.random()*35,score:4+Math.random()*8};
}
function spawnPoint(pad=0){
  const a=Math.random()*TAU;
  const r=Math.sqrt(Math.random())*(world.radius-pad);
  return {x:Math.cos(a)*r,y:Math.sin(a)*r,r:5};
}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function insideHome(x,y){return Math.hypot(x,y)<=player.homeR}

function start(){
  resetGame();
  show(game);
  requestAnimationFrame(loop);
}
function endGame(){
  if(!running)return;
  running=false;
  const earned=currentEarned+Math.floor(score/2);
  totalCoins+=earned;
  bestScore=Math.max(bestScore,score);
  localStorage.setItem('ptpCoins',totalCoins);
  localStorage.setItem('ptpBest',bestScore.toFixed(1));
  finalScoreEl.textContent=score.toFixed(1)+'%';
  earnedCoinsEl.textContent=earned;
  updateMenuStats();
  show(gameover);
}
function updateMenuStats(){
  menuCoins.textContent=totalCoins;
  bestScoreEl.textContent=bestScore.toFixed(1)+'%';
}
updateMenuStats();

function loop(now){
  if(!running)return;
  const dt=Math.min((now-last)/1000,.033);last=now;
  update(dt);draw();
  requestAnimationFrame(loop);
}

function update(dt){
  let x=0,y=0;
  if(keys.ArrowLeft||keys.a||keys.q)x-=1;
  if(keys.ArrowRight||keys.d)x+=1;
  if(keys.ArrowUp||keys.w||keys.z)y-=1;
  if(keys.ArrowDown||keys.s)y+=1;
  if(x||y){
    const l=Math.hypot(x,y);
    player.dx=x/l;player.dy=y/l;player.angle=Math.atan2(player.dy,player.dx);
  }
  player.x+=player.dx*player.speed*dt;
  player.y+=player.dy*player.speed*dt;

  const edge=Math.hypot(player.x,player.y);
  if(edge>world.radius-player.r){
    const nx=player.x/edge,ny=player.y/edge;
    player.x=nx*(world.radius-player.r);
    player.y=ny*(world.radius-player.r);
  }

  const nowInside=insideHome(player.x,player.y);
  if(!nowInside){
    player.outside=true;
    const lastPoint=trail[trail.length-1];
    if(!lastPoint||Math.hypot(player.x-lastPoint.x,player.y-lastPoint.y)>9){
      trail.push({x:player.x,y:player.y});
      if(trail.length>10){
        for(let i=0;i<trail.length-8;i++){
          if(Math.hypot(player.x-trail[i].x,player.y-trail[i].y)<player.r*1.2){
            endGame();return;
          }
        }
      }
    }
  }else if(player.outside&&trail.length>2){
    claimTrail();
    trail=[];
    player.outside=false;
  }

  coins=coins.filter(c=>{
    if(dist(player,c)<player.r+9){
      currentEarned++;
      return false;
    }
    return true;
  });
  while(coins.length<90)coins.push(spawnPoint(80));

  for(const b of bots){
    b.angle+=(Math.random()-.5)*1.5*dt;
    b.x+=Math.cos(b.angle)*b.speed*dt;
    b.y+=Math.sin(b.angle)*b.speed*dt;
    const br=Math.hypot(b.x,b.y);
    if(br>world.radius-30){
      b.angle=Math.atan2(-b.y,-b.x)+(Math.random()-.5);
    }
    if(dist(player,b)<player.r+b.r+2){endGame();return;}
  }

  camera.x+=(player.x-camera.x)*Math.min(1,dt*5);
  camera.y+=(player.y-camera.y)*Math.min(1,dt*5);
  updateHud();
}

function claimTrail(){
  let maxR=player.homeR;
  for(const p of trail)maxR=Math.max(maxR,Math.hypot(p.x,p.y));
  const gain=Math.max(8,Math.min(85,(maxR-player.homeR)*.28));
  player.homeR=Math.min(560,player.homeR+gain);
  score=Math.min(99.9,(player.homeR*player.homeR)/(world.radius*world.radius)*100);
  owned.push(trail.slice());
}

function updateHud(){
  territoryEl.textContent=score.toFixed(1)+'%';
  coinsEl.textContent=totalCoins+currentEarned;
  const ranks=[
    {name:player.name,score},
    ...bots.map(b=>({name:b.name,score:b.score}))
  ].sort((a,b)=>b.score-a.score);
  leaderboardList.innerHTML=ranks.map(r=>'<li>'+escapeHtml(r.name)+' <b>'+r.score.toFixed(1)+'%</b></li>').join('');
}
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

function screen(x,y){return {x:x-camera.x+W/2,y:y-camera.y+H/2}}

function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#182233';ctx.fillRect(0,0,W,H);

  ctx.save();
  const center=screen(0,0);
  ctx.beginPath();ctx.arc(center.x,center.y,world.radius,0,TAU);ctx.clip();

  ctx.fillStyle='#d9e6ec';ctx.fillRect(center.x-world.radius,center.y-world.radius,world.radius*2,world.radius*2);

  drawGrid(center);
  drawTerritory();
  drawCoins();
  drawBots();
  drawTrail();
  drawPlayer();

  ctx.restore();

  ctx.beginPath();ctx.arc(center.x,center.y,world.radius,0,TAU);
  ctx.strokeStyle='#ffffff55';ctx.lineWidth=8;ctx.stroke();

  const vignette=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.15,W/2,H/2,Math.max(W,H)*.7);
  vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#0007');
  ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
}

function drawGrid(center){
  const size=60;
  ctx.strokeStyle='#8ca1ad22';ctx.lineWidth=1;
  const minX=-world.radius,maxX=world.radius;
  for(let x=Math.floor(minX/size)*size;x<=maxX;x+=size){
    const a=screen(x,-world.radius),b=screen(x,world.radius);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  for(let y=Math.floor(minX/size)*size;y<=maxX;y+=size){
    const a=screen(-world.radius,y),b=screen(world.radius,y);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
}

function drawTerritory(){
  const c=screen(0,0);
  ctx.beginPath();ctx.arc(c.x,c.y,player.homeR,0,TAU);
  ctx.fillStyle='#f2c94caa';ctx.fill();

  ctx.globalAlpha=.2;
  for(const poly of owned){
    if(poly.length<3)continue;
    ctx.beginPath();
    let p=screen(poly[0].x,poly[0].y);ctx.moveTo(p.x,p.y);
    for(let i=1;i<poly.length;i++){p=screen(poly[i].x,poly[i].y);ctx.lineTo(p.x,p.y)}
    ctx.closePath();ctx.fillStyle=player.color;ctx.fill();
  }
  ctx.globalAlpha=1;
}

function drawTrail(){
  if(trail.length<2)return;
  ctx.beginPath();
  let p=screen(trail[0].x,trail[0].y);ctx.moveTo(p.x,p.y);
  for(let i=1;i<trail.length;i++){p=screen(trail[i].x,trail[i].y);ctx.lineTo(p.x,p.y)}
  ctx.strokeStyle=player.color;ctx.lineWidth=10;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
}

function drawCoins(){
  for(const c of coins){
    const p=screen(c.x,c.y);
    if(p.x<-20||p.y<-20||p.x>W+20||p.y>H+20)continue;
    ctx.beginPath();ctx.arc(p.x,p.y,6,0,TAU);
    ctx.fillStyle='#ffb703';ctx.fill();
    ctx.strokeStyle='#fff3b0';ctx.lineWidth=2;ctx.stroke();
  }
}

function drawBots(){
  for(const b of bots){
    const p=screen(b.x,b.y);
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(b.angle);
    ctx.fillStyle=b.color;ctx.fillRect(-12,-12,24,24);
    ctx.fillStyle='#fff';ctx.fillRect(5,-5,5,5);
    ctx.restore();
    ctx.font='11px Arial';ctx.textAlign='center';ctx.fillStyle='#253142';ctx.fillText(b.name,p.x,p.y-18);
  }
}

function drawPlayer(){
  const p=screen(player.x,player.y);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(player.angle);
  ctx.shadowColor='#0006';ctx.shadowBlur=10;
  ctx.fillStyle=player.color;ctx.fillRect(-14,-14,28,28);
  ctx.fillStyle='#fff';ctx.fillRect(5,-6,6,6);
  ctx.restore();
  ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillStyle='#1c2734';ctx.fillText(player.name,p.x,p.y-20);
}

addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;keys[e.key]=true});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;keys[e.key]=false});

canvas.addEventListener('pointerdown',e=>steerTo(e));
canvas.addEventListener('pointermove',e=>{if(e.buttons)steerTo(e)});
function steerTo(e){
  const dx=e.clientX-W/2,dy=e.clientY-H/2;
  const l=Math.hypot(dx,dy)||1;
  player.dx=dx/l;player.dy=dy/l;player.angle=Math.atan2(player.dy,player.dx);
}

playBtn.onclick=start;
retryBtn.onclick=start;
menuBtn.onclick=()=>show(menu);
quitBtn.onclick=()=>{running=false;show(menu)};
