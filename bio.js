var _S = {};
try { _S = JSON.parse(localStorage.getItem('bbv2') || '{}'); } catch(e) {}
var S = { xp: _S.xp||0, stars: _S.stars||{}, ach: _S.ach||[], sound: _S.sound!==undefined ? _S.sound : true };
function save() { try{ localStorage.setItem('bbv2', JSON.stringify(S)); }catch(e){} }

var XP_LEVELS = [0,100,250,450,700,1000,1400,1900,2500,3200];
function getLevel(xp) { var l=1; for(var i=0;i<XP_LEVELS.length;i++) if(xp>=XP_LEVELS[i]) l=i+1; return Math.min(l,10); }
function xpPct(xp) { var l=getLevel(xp)-1; var lo=XP_LEVELS[Math.min(l,XP_LEVELS.length-1)]; var hi=XP_LEVELS[Math.min(l+1,XP_LEVELS.length-1)]; if(hi===lo) return 100; return Math.round(((xp-lo)/(hi-lo))*100); }
var COMP = { A:'T', T:'A', G:'C', C:'G' };

var LEVELS = [
  { id:'c1', topic:'cell', name:'Cell Builder', desc:'Place basic organelles', emoji:'🦠', xp:40, hearts:3, fact:'Every cell has a nucleus — the control centre.' },
  { id:'d1', topic:'dna', name:'DNA Decoder', desc:'Complete the DNA strand', emoji:'🧬', xp:40, hearts:3, fact:'DNA bases pair A-T and G-C.' },
  { id:'e1', topic:'eco', name:'Ecosystem', desc:'Build a balanced food web', emoji:'🌿', xp:45, hearts:3, fact:'Decomposers recycle nutrients back into the soil.' },
  { id:'b1', topic:'body', name:'Body Assembly', desc:'Place the main organs', emoji:'🫀', xp:40, hearts:3, fact:'The heart pumps blood around the body.' }
];
var ACHIEVEMENTS = [
  { id:'first', emoji:'🥇', name:'First blood', desc:'Complete your first level' },
  { id:'perfect', emoji:'💎', name:'Perfect run', desc:'Zero mistakes' },
  { id:'streak5', emoji:'🔥', name:'On fire', desc:'5x combo' },
  { id:'master', emoji:'🏆', name:'Biology master', desc:'Complete all levels' }
];

var soundOn = S.sound;
var actx = null;
function getActx() { if(!actx) try{ actx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} return actx; }
function playTone(freq, dur, type, vol, when=0) {
  if(!soundOn) return;
  try{
    var ctx = getActx();
    if(!ctx) return;
    var now = ctx.currentTime + when;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol||0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now+dur);
    osc.start(now);
    osc.stop(now+dur);
  }catch(e){}
}
function sndClick() { playTone(880, 0.07, 'sine', 0.08); }
function sndOk() { playTone(523.25, 0.1, 'sine', 0.12); playTone(659.25, 0.12, 'sine', 0.12, 0.08); }
function sndBad() { playTone(200, 0.25, 'sawtooth', 0.1); }
function sndWin() { [523.25, 659.25, 783.99, 1046.50].forEach((f,i)=>playTone(f,0.2,'sine',0.12,i*0.12)); }
function toggleSound() {
  soundOn = !soundOn; S.sound = soundOn; save();
  document.getElementById('sound-btn').innerHTML = soundOn ? '<i class="fas fa-volume-up"></i> Sound On' : '<i class="fas fa-volume-mute"></i> Sound Off';
}

var curLevelIdx = -1, hearts = 3, streak = 0, bestStreak = 0, mistakes = 0, correctCount = 0, totalCount = 0, timerInt = null;

function go(id) {
  document.querySelectorAll('.scr').forEach(el=>el.classList.remove('on'));
  document.getElementById(id).classList.add('on');
  if(id==='s-map') renderMap();
  if(id==='s-home') renderHome();
  if(id==='s-achievements') renderAchievements();
}
function renderHome() { var lv=getLevel(S.xp); document.getElementById('home-xp-info').innerHTML = `<span class="pill pill-green">Level ${lv}</span> <span>${S.xp} XP total</span>`; }
function renderMap() {
  var lv=getLevel(S.xp); document.getElementById('map-xp').innerHTML = `${S.xp} XP`; document.getElementById('map-level').innerHTML = `Level ${lv}`; document.getElementById('map-xpbar').style.width = xpPct(S.xp)+'%';
  var list=document.getElementById('level-list'); list.innerHTML='';
  LEVELS.forEach((l,idx)=>{
    var stars=S.stars[l.id]||0;
    var d=document.createElement('div');
    d.className = stars>0 ? 'lvl-card-done' : 'lvl-card';
    d.onclick = ()=>startLevel(idx);
    var starsStr = stars ? '⭐'.repeat(stars)+'☆'.repeat(3-stars) : '☆☆☆';
    d.innerHTML = `<div><span style="font-size:24px">${l.emoji}</span><span class="pill pill-green">Basic</span></div><div><strong>${l.name}</strong></div><p>${l.desc}</p><div>${starsStr}</div>`;
    list.appendChild(d);
  });
}
function startLevel(idx) {
  curLevelIdx=idx; var lv=LEVELS[idx]; hearts=lv.hearts; streak=0; bestStreak=0; mistakes=0; correctCount=0; totalCount=0;
  document.getElementById('g-level-name').innerHTML = lv.name;
  var heartsHtml = ''; for(var i=0;i<hearts;i++) heartsHtml+='<i class="fas fa-heart"></i>'; for(var i=hearts;i<3;i++) heartsHtml+='<i class="fas fa-heart-broken"></i>';
  document.getElementById('g-hearts').innerHTML = heartsHtml;
  document.getElementById('g-streak').style.display='none';
  document.getElementById('g-xpbar').style.width = xpPct(S.xp)+'%';
  document.getElementById('g-scenario').style.display='none';
  document.getElementById('g-feedback').style.display='none';
  clearInterval(timerInt); document.getElementById('g-timer').style.display='none';
  if(lv.topic==='cell') buildCell();
  else if(lv.topic==='dna') buildDNA();
  else if(lv.topic==='eco') buildEco();
  else if(lv.topic==='body') buildBody();
  go('s-game');
}
function loseHeart() {
  hearts = Math.max(0, hearts-1);
  var heartsHtml = ''; for(var i=0;i<hearts;i++) heartsHtml+='<i class="fas fa-heart"></i>'; for(var i=hearts;i<3;i++) heartsHtml+='<i class="fas fa-heart-broken"></i>';
  document.getElementById('g-hearts').innerHTML = heartsHtml;
  mistakes++; streak=0; updateStreak(); sndBad();
  if(hearts<=0){ finishLevel(false); }
}
function gainStreak() { streak++; if(streak>bestStreak) bestStreak=streak; updateStreak(); }
function updateStreak() { var el=document.getElementById('g-streak'); if(streak>=2){ el.style.display=''; el.innerHTML=`<i class="fas fa-fire"></i> x${streak}`; } else el.style.display='none'; }
function floatScore(txt) { var layer=document.getElementById('float-layer'); var d=document.createElement('div'); d.className='float-score'; d.textContent=txt; d.style.left=Math.random()*120+20+'px'; layer.appendChild(d); setTimeout(()=>d.remove(),800); }
function showFB(t,m) { var el=document.getElementById('g-feedback'); el.className=`fb fb-${t}`; el.innerHTML=m; el.style.display='block'; }
function hideFB() { document.getElementById('g-feedback').style.display='none'; }
function finishLevel(passed) {
  var lv=LEVELS[curLevelIdx];
  var acc=totalCount>0?correctCount/totalCount:0;
  var mult=acc>=1?1.5:acc>=0.8?1.2:acc>=0.5?1:0.6;
  var streakBonus=Math.min(bestStreak*3,20);
  var xpEarned=passed?Math.round(lv.xp*mult+streakBonus):Math.round(lv.xp*0.2);
  S.xp+=xpEarned;
  var stars=passed?(acc>=0.95&&mistakes===0?3:acc>=0.7?2:1):0;
  if(stars>(S.stars[lv.id]||0)) S.stars[lv.id]=stars;
  var newAch=[];
  function tryA(id){ if(S.ach.indexOf(id)===-1){ S.ach.push(id); var a=ACHIEVEMENTS.find(x=>x.id===id); if(a) newAch.push(a); } }
  if(Object.keys(S.stars).length>=1) tryA('first');
  if(acc===1&&mistakes===0) tryA('perfect');
  if(bestStreak>=5) tryA('streak5');
  if(getLevel(S.xp)>=5) tryA('lvl5');
  if(LEVELS.every(l=>S.stars[l.id]>0)) tryA('master');
  save();
  var rank=acc>=0.95?'<span class="rank-s">Rank S</span>':acc>=0.8?'<span class="rank-a">Rank A</span>':acc>=0.6?'<span class="rank-b">Rank B</span>':'<span class="rank-c">Rank C</span>';
  document.getElementById('r-emoji').innerHTML = stars===3?'🏆':stars===2?'🎉':'👍';
  document.getElementById('r-title').innerHTML = stars>=2?'Great!':'Completed';
  document.getElementById('r-subtitle').innerHTML = lv.name;
  document.getElementById('r-stars').innerHTML = stars?'⭐'.repeat(stars)+'☆'.repeat(3-stars):'☆☆☆';
  document.getElementById('r-rank').innerHTML = rank;
  document.getElementById('r-acc').innerHTML = Math.round(acc*100)+'%';
  document.getElementById('r-xp').innerHTML = `+${xpEarned} XP`;
  document.getElementById('r-streak').innerHTML = `x${bestStreak}`;
  document.getElementById('r-mistakes').innerHTML = mistakes;
  document.getElementById('r-fact').innerHTML = `<i class="fas fa-flask"></i> Fact: ${lv.fact}`;
  var achDiv=document.getElementById('r-ach'); achDiv.innerHTML='';
  newAch.forEach(a=>{ achDiv.innerHTML+=`<div class="ach-earned" style="margin:4px 0">${a.emoji} ${a.name}</div>`; });
  var nextBtn=document.getElementById('r-next'); nextBtn.style.display=(curLevelIdx+1<LEVELS.length)?'':'none';
  if(passed) sndWin();
  go('s-result');
}
function retryLevel(){ startLevel(curLevelIdx); }
function nextLevel(){ if(curLevelIdx+1<LEVELS.length) startLevel(curLevelIdx+1); }
function renderAchievements() {
  var list=document.getElementById('ach-list'); list.innerHTML='';
  ACHIEVEMENTS.forEach(a=>{
    var earned=S.ach.indexOf(a.id)!==-1;
    var d=document.createElement('div'); d.className=earned?'ach-earned':'ach-card';
    d.innerHTML=`<div style="font-size:28px">${earned?a.emoji:'🔒'}</div><div><strong>${a.name}</strong></div><p>${a.desc}</p>`;
    list.appendChild(d);
  });
}

// ===== CELL GAME =====
var CDATA = {
  nucleus: { emoji: '<i class="fas fa-circle"></i>', name: 'Nucleus', pos: { left: '148px', top: '88px' } },
  mito: { emoji: '<i class="fas fa-bolt"></i>', name: 'Mitochondria', pos: { left: '68px', top: '52px' } },
  er: {
    emoji: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2c7a4d" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="display:block; margin:auto">
              <path d="M3 6 L7 10 L11 6 L15 10 L19 6 L21 8" />
              <path d="M3 12 L7 16 L11 12 L15 16 L19 12 L21 14" />
              <path d="M3 18 L7 22 L11 18 L15 22 L19 18 L21 20" />
              <path d="M2 4 L22 4" stroke-dasharray="2 2"/>
              <path d="M2 20 L22 20" stroke-dasharray="2 2"/>
            </svg>`,
    name: 'Endoplasmic Reticulum',
    pos: { left: '242px', top: '62px' }
  },
  golgi: { emoji: '<i class="fas fa-box"></i>', name: 'Golgi', pos: { left: '256px', top: '148px' } },
  ribo: { emoji: '<i class="fas fa-circle-dot"></i>', name: 'Ribosome', pos: { left: '98px', top: '162px' } }
};
var cellPlaced={}, cellSel=null;
function buildCell() {
  cellPlaced={}; cellSel=null; var keys=Object.keys(CDATA); totalCount=keys.length;
  var html=`<div style="position:relative;width:100%;height:265px;background:#fafcff;border-radius:24px;border:1px solid #dce5ef;margin-bottom:10px"><svg width="100%" height="265" viewBox="0 0 400 265"><ellipse cx="200" cy="132" rx="178" ry="118" fill="none" stroke="#7F77DD" stroke-width="2" stroke-dasharray="8 4"/><text x="200" y="20" text-anchor="middle" fill="#4a627a">Animal Cell</text></svg>`;
  keys.forEach(k=>{ var d=CDATA[k]; html+=`<div class="slot" id="cslot-${k}" style="left:${d.pos.left};top:${d.pos.top}" onclick="cSlotClick('${k}')">?</div>`; });
  html+=`</div><p><i class="fas fa-mouse-pointer"></i> Click a slot, then pick an organelle:</p><div>`;
  var shuffled=keys.slice().sort(()=>Math.random()-0.5);
  shuffled.forEach(k=>{ html+=`<span class="part" id="cpart-${k}" onclick="cPartClick('${k}')">${CDATA[k].emoji} ${CDATA[k].name}</span>`; });
  html+=`</div><div style="margin-top:10px"><button class="btn" onclick="buildCell()"><i class="fas fa-redo-alt"></i> Reset</button></div>`;
  document.getElementById('g-content').innerHTML=html;
}
function cSlotClick(k) { if(cellPlaced[k]) return; document.querySelectorAll('[id^="cslot-"]').forEach(s=>s.className='slot'); cellSel=k; document.getElementById(`cslot-${k}`).className='slot-sel'; showFB('info',`Slot: Pick an organelle.`); sndClick(); }
function cPartClick(k) {
  if(!cellSel){ showFB('err','Select a slot first!'); return; }
  if(hearts<=0) return;
  var partEl=document.getElementById(`cpart-${k}`); if(partEl.classList.contains('part-used')) return;
  var isCorrect = (cellSel===k);
  if(isCorrect){
    if(cellPlaced[cellSel]) return;
    cellPlaced[cellSel]=k;
    var slotDiv=document.getElementById(`cslot-${cellSel}`); slotDiv.innerHTML=CDATA[k].emoji; slotDiv.className='slot-ok';
    partEl.classList.add('part-used');
    cellSel=null; hideFB(); sndOk(); gainStreak(); floatScore('+10');
    var allFilled=Object.keys(CDATA).every(key=>cellPlaced[key]===key);
    if(allFilled){ correctCount=Object.keys(CDATA).length; finishLevel(true); }
  } else {
    loseHeart(); if(hearts<=0) return;
    if(cellPlaced[cellSel]){ var old=cellPlaced[cellSel]; document.getElementById(`cpart-${old}`).classList.remove('part-used'); delete cellPlaced[cellSel]; }
    var slotDiv=document.getElementById(`cslot-${cellSel}`); slotDiv.innerHTML='?'; slotDiv.className='slot';
    showFB('err','Wrong organelle!'); cellSel=null;
  }
}

// ===== DNA GAME =====
var dnaTemplate=[], dnaUser=[], dnaSel=null;
function buildDNA() { dnaTemplate=['A','T','G','C','G','T']; dnaUser=new Array(6).fill(null); dnaSel=null; totalCount=6; renderDNA(); }
function renderDNA() {
  var html=`<div style="display:flex;gap:10px;margin-bottom:10px">${['A','T','G','C'].map(b=>`<span class="base-btn b${b}" onclick="dnaPickBase('${b}')">${b}</span>`).join('')}</div><div>`;
  dnaTemplate.forEach((base,i)=>{ var ub=dnaUser[i]; var selStyle=(dnaSel===i)?'outline:2px solid #2c7a4d;':''; html+=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span class="base-btn b${base}">${base}</span><i class="fas fa-arrow-right"></i><span class="base-btn ${ub?'b'+ub:'bE'}" style="${selStyle} cursor:pointer" onclick="dnaClickSlot(${i})">${ub||'?'}</span></div>`; });
  html+=`</div><div style="margin-top:10px"><button class="btn" onclick="buildDNA()"><i class="fas fa-redo-alt"></i> Reset</button></div>`;
  document.getElementById('g-content').innerHTML=html;
}
function dnaClickSlot(i){ dnaSel=i; sndClick(); renderDNA(); showFB('info',`Slot ${i+1} selected. Pick a base.`); }
function dnaPickBase(b){
  if(dnaSel===null){ showFB('err','Select a slot first!'); return; }
  if(hearts<=0) return;
  var correctBase=COMP[dnaTemplate[dnaSel]];
  if(b===correctBase){
    dnaUser[dnaSel]=b; dnaSel=null; hideFB(); sndOk(); gainStreak(); floatScore('+8'); renderDNA();
    if(dnaUser.every(v=>v!==null)){ correctCount=dnaUser.length; finishLevel(true); }
  } else {
    loseHeart(); if(hearts<=0) return;
    if(dnaUser[dnaSel]!==null) dnaUser[dnaSel]=null;
    var tempSel = dnaSel;
    dnaSel=null; showFB('err',`Wrong! ${dnaTemplate[tempSel]} pairs with ${correctBase}`); renderDNA();
  }
}

// ===== ECO GAME (4x5 grid, with decomposers, Check button) =====
var ecoGrid = [], ecoTool = 'plant', ecoRows = 5, ecoCols = 4;
var ecoEmoji = { plant:'🌱', herb:'🐇', carn:'🦊', deco:'🍄', empty:'⬚' };

function buildEco() {
  ecoGrid = Array(ecoRows).fill().map(() => Array(ecoCols).fill('empty'));
  ecoTool = 'plant';
  totalCount = 0; // we don't use totalCount for eco, we check on button click
  renderEco();
}

function renderEco() {
  var tools = [
    {k:'plant', e:'🌱', label:'Plant'},
    {k:'herb', e:'🐇', label:'Herbivore'},
    {k:'carn', e:'🦊', label:'Carnivore'},
    {k:'deco', e:'🍄', label:'Decomposer'},
    {k:'empty', e:'⬚', label:'Remove'}
  ];
  var html = `<div style="margin-bottom:12px"><strong><i class="fas fa-seedling"></i> Build a Balanced Food Web</strong><br>
    <span style="font-size:12px">🌱 Plants → 🐇 Herbivores → 🦊 Carnivores &nbsp;&nbsp; 🍄 Decomposers break down all.</span>
  </div>`;
  html += `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px">`;
  tools.forEach(t => {
    html += `<span class="${ecoTool===t.k?'eco-tool-sel':'eco-tool'}" onclick="setEcoTool('${t.k}')">${t.e} ${t.label}</span>`;
  });
  html += `</div>`;
  // Grid: 5 rows, 4 columns
  html += `<div style="display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-bottom:12px">`;
  for (var r=0; r<ecoRows; r++) {
    for (var c=0; c<ecoCols; c++) {
      var val = ecoGrid[r][c];
      var display = ecoEmoji[val] || '⬚';
      var cls = val==='empty' ? 'eco-cell' : `eco-cell eco-${val}`;
      html += `<div class="${cls}" style="height:52px; display:flex; align-items:center; justify-content:center; font-size:24px; cursor:pointer" onclick="ecoClick(${r},${c})">${display}</div>`;
    }
  }
  html += `</div>`;
  // Show current counts
  var plants = ecoGrid.flat().filter(v=>v==='plant').length;
  var herbs = ecoGrid.flat().filter(v=>v==='herb').length;
  var carns = ecoGrid.flat().filter(v=>v==='carn').length;
  var decos = ecoGrid.flat().filter(v=>v==='deco').length;
  html += `<div style="display:flex; gap:12px; justify-content:center; margin-bottom:12px; flex-wrap:wrap">
    <span class="pill pill-green">🌱 Plants: ${plants}</span>
    <span class="pill pill-blue">🐇 Herbivores: ${herbs}</span>
    <span class="pill pill-amber">🦊 Carnivores: ${carns}</span>
    <span class="pill pill-gray">🍄 Decomposers: ${decos}</span>
  </div>`;
  html += `<div style="display:flex; gap:8px; justify-content:center">
    <button class="btn" onclick="buildEco()"><i class="fas fa-redo-alt"></i> Reset Grid</button>
    <button class="btn btn-go" onclick="checkEcoBalance()"><i class="fas fa-check"></i> Check Food Web</button>
  </div>`;
  document.getElementById('g-content').innerHTML = html;
}

function setEcoTool(t) { ecoTool = t; sndClick(); renderEco(); }
function ecoClick(r,c) {
  if (hearts <= 0) return;
  ecoGrid[r][c] = ecoTool;
  sndClick();
  renderEco();
}

function checkEcoBalance() {
  var plants = ecoGrid.flat().filter(v=>v==='plant').length;
  var herbs = ecoGrid.flat().filter(v=>v==='herb').length;
  var carns = ecoGrid.flat().filter(v=>v==='carn').length;
  var decos = ecoGrid.flat().filter(v=>v==='deco').length;
  
  // Balance conditions: plants must be > herbs, herbs > carn, at least one decomposer, and all groups present.
  var balanced = (plants > 0 && herbs > 0 && carns > 0 && decos > 0 && plants > herbs && herbs > carns);
  
  if (balanced) {
    correctCount = 1;
    finishLevel(true);
  } else {
    loseHeart();
    if (hearts > 0) {
      var msg = "";
      if (plants === 0) msg = "Add some plants (🌱)!";
      else if (herbs === 0) msg = "Add herbivores (🐇)!";
      else if (carns === 0) msg = "Add carnivores (🦊)!";
      else if (decos === 0) msg = "Add decomposers (🍄)!";
      else if (plants <= herbs) msg = "Plants must be more numerous than herbivores!";
      else if (herbs <= carns) msg = "Herbivores must outnumber carnivores!";
      else msg = "Keep plants > herbivores > carnivores, and include decomposers.";
      showFB('err', msg);
    }
  }
}

// ===== BODY GAME =====
var bodyZones = {
  head:   { label:'Head',   emoji:'🧠', correct:'Brain',   x:90, y:30 },
  chest:  { label:'Chest',  emoji:'❤️', correct:'Heart',   x:90, y:110 },
  belly:  { label:'Belly',  emoji:'🍽️', correct:'Stomach', x:90, y:180 },
  pelvis: { label:'Pelvis', emoji:'💧', correct:'Bladder', x:90, y:240 }
};
var bodyPlaced = {}, bodySelectedZone = null;

function buildBody() {
  bodyPlaced = {}; bodySelectedZone = null; totalCount = Object.keys(bodyZones).length;
  var organs = ['Brain','Heart','Stomach','Bladder'];
  var shuffled = organs.slice().sort(()=>Math.random()-0.5);
  var html = `<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
    <svg viewBox="0 0 180 360" style="flex:0 0 160px;height:320px;background:#fafcff;border-radius:24px;padding:10px">`;
  for (var z in bodyZones) {
    var zInfo = bodyZones[z];
    html += `
      <ellipse cx="${zInfo.x}" cy="${zInfo.y}" rx="36" ry="30" fill="rgba(44,122,77,0.1)" stroke="#2c7a4d" stroke-width="1.5" id="zone-${z}" onclick="selectZone('${z}')" style="cursor:pointer"/>
      <text x="${zInfo.x}" y="${zInfo.y+44}" text-anchor="middle" font-size="11" fill="#4a627a" style="pointer-events:none">${zInfo.label}</text>
      <text id="bl-${z}" x="${zInfo.x}" y="${zInfo.y+8}" text-anchor="middle" font-size="22" style="pointer-events:none"></text>`;
  }
  html += `</svg><div style="flex:1"><p id="body-hint" style="margin-bottom:10px"><i class="fas fa-hand-pointer"></i> Tap a zone, then an organ</p><div>`;
  shuffled.forEach(o => {
    html += `<span class="organ-chip" id="ochip-${o.replace(/\s/g,'-')}" onclick="placeOrgan('${o}')">${o}</span>`;
  });
  html += `</div></div></div><div style="margin-top:10px"><button class="btn" onclick="buildBody()"><i class="fas fa-redo-alt"></i> Reset</button></div>`;
  document.getElementById('g-content').innerHTML = html;
}
function selectZone(z) {
  if (hearts <= 0) return;
  bodySelectedZone = z;
  sndClick();
  document.getElementById('body-hint').innerHTML = `<i class="fas fa-hand-pointer"></i> Placing in ${bodyZones[z].label}. Tap an organ.`;
}
function placeOrgan(o) {
  if (hearts <= 0) return;
  if (!bodySelectedZone) { showFB('err','Tap a body zone first!'); return; }
  var zone = bodySelectedZone;
  var isCorrect = (o === bodyZones[zone].correct);
  if (isCorrect) {
    if (bodyPlaced[zone]) return;
    bodyPlaced[zone] = o;
    document.getElementById(`bl-${zone}`).innerHTML = bodyZones[zone].emoji;
    document.getElementById(`ochip-${o.replace(/\s/g,'-')}`).classList.add('organ-chip-used');
    sndOk(); gainStreak(); floatScore('+12');
    var allFilled = true;
    for (var z in bodyZones) if (!bodyPlaced[z] || bodyPlaced[z] !== bodyZones[z].correct) { allFilled = false; break; }
    if (allFilled) { correctCount = Object.keys(bodyZones).length; finishLevel(true); return; }
  } else {
    loseHeart(); if (hearts <= 0) return;
    if (bodyPlaced[zone]) {
      var old = bodyPlaced[zone];
      document.getElementById(`ochip-${old.replace(/\s/g,'-')}`).classList.remove('organ-chip-used');
      delete bodyPlaced[zone];
      document.getElementById(`bl-${zone}`).innerHTML = '';
    }
    showFB('err', `Wrong! ${bodyZones[zone].label} needs ${bodyZones[zone].correct}.`);
  }
  bodySelectedZone = null;
  document.getElementById('body-hint').innerHTML = `<i class="fas fa-hand-pointer"></i> Tap a zone, then an organ`;
}

renderHome();
