import { loadDict, norm, IDX, DISP, ROOTS, SORTED, isAlive, isWord, hasAl, displayOf, rootOf, spaced } from './dict';
import { VAL, LETTERS, FAM, famOf, LENB, TARGETS, BOSS_ROUNDS, DROPS, BURNS, LINE_MAX, LINE_CAPS, ZAWAID, ROOT_AT, BAG_CAP, NB_SLOTS, STARTERS, PATTERNS, patOf, RELICS, ROWMODS, BOSSES, ENCH, PATHS, pathLvl } from './data';

/* ================= STATE ================= */
let S=null, uid=1;
const rnd=n=>Math.floor(Math.random()*n);
const pick=a=>a[rnd(a.length)];
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const has=id=>S.relics.includes(id);
const nLines=()=>has('fourth')?4:3;
const bagCap=()=>has('nasikh')?13:BAG_CAP;
const nbSlots=()=>has('inkwell')?4:NB_SLOTS;
const lineMax=i=>LINE_CAPS[i]??LINE_MAX;
/* الرسوخ: every seal inks the radicals of its root. Ink enough and the letter takes root —
   it gets a second entry in the draw pile, so it falls about twice as often. Spelling a root
   makes that root easier to spell again, and the bag quietly becomes a specialist. */
const inkOf=ch=>S.ink?.[ch]||0;
const isRooted=ch=>inkOf(ch)>=ROOT_AT;
const rootedLetters=()=>[...new Set(S.bag.map(t=>t.ch))].filter(isRooted);
const drawPile=()=>shuffle([...S.bag.map(t=>t.id),...S.bag.filter(t=>isRooted(t.ch)).map(t=>t.id)]);
const nbOf=root=>root?S.notebook.find(n=>n.root===root):null;
const nbLetters=()=>{const s=new Set(); S.notebook.forEach(n=>[...n.root].forEach(c=>s.add(c))); return s;};

/* ================= PATHS (BUILDS) ================= */
const pathLevelOf=id=>pathLvl(PATHS.find(p=>p.id===id).progress(S,has));
const pathStats=()=>PATHS.map(p=>({id:p.id,n:p.n,c:p.c,d:p.d,lvl:pathLevelOf(p.id)}));
const leadingPath=()=>{let best=null,bl=0; for(const p of PATHS){const lv=pathLevelOf(p.id); if(lv>bl){bl=lv;best=p.id;}} return best;};
function pathFeedback(id){
  if(!id) return;
  const p=PATHS.find(x=>x.id===id), lv=pathLevelOf(id);
  if(lv>0) setTimeout(()=>toast(`<b style="color:${p.c}">${p.n}</b> الآن م${lv}`),550);
}

function newRun(starter){
  const st=STARTERS.find(x=>x.id===starter);
  S={phase:'intro',round:1,gold:4,bag:[...st.letters].map(ch=>({id:uid++,ch,ench:null})),relics:[],
     rowMods:[null,null,null,null],notebook:[{root:st.root,lvl:1,xp:0}],patLv:{},permMult:0,seenRoots:{},seenPatterns:{},ink:{},
     burnsMax:BURNS,dropsMax:DROPS,stats:{words:0,best:null,total:0,maxChain:0},mute:S?S.mute:false,starter:st.n};
  startRound();
}
function startRound(){
  const r=S.round;
  Object.assign(S,{target:TARGETS[r-1],score:0,drops:S.dropsMax,burns:S.burnsMax,
    lines:[[],[],[],[]],junk:[false,false,false,false],lock:[0,0,0,0],fixed:[0,0,0,0],chain:0,sealedSinceDrop:true,
    rootCounts:{},roundRoots:{},lastEnd:null,dotUses:3,dropCount:0,log:[],top:[],
    draw:drawPile(),boss:null,wazn:pick(PATTERNS.filter(p=>p.id!=='thulathi')).id,phase:'intro',shop:null,picker:null,nbOffer:null});
  if(BOSS_ROUNDS.includes(r)){
    const pool=r===3?['blind','termite','dry']:r===6?['rhyme','weight','rush']:Object.keys(BOSSES);
    S.boss={id:pick(pool)};
    if(S.boss.id==='weight') for(let i=0;i<nLines();i++){ S.lines[i]=[{id:null,ch:pick([...'ثظغضذخص']),ench:null,heavy:true}]; }
  }
  S.cur=drawTile(); S.next=drawTile();
}
function drawTile(){
  if(S.top.length) return S.top.shift();
  for(let g=0;g<100;g++){
    if(!S.draw.length) S.draw=drawPile();
    if(!S.draw.length) break;
    const id=S.draw.pop(); const t=S.bag.find(b=>b.id===id);
    if(t) return {...t};
  }
  return {id:null,ch:'ا',ench:null};
}
const lineStr=i=>S.lines[i].map(t=>t.ch).join('');
function placed(i,tile,atStart){
  const L=S.lines[i];
  const put=ch=>atStart?[{...tile,ch},...L]:[...L,{...tile,ch}];
  if(tile.ench==='ink'){
    const fam=famOf(tile.ch)||[tile.ch]; let best=fam[0],bs=-1;
    for(const c of fam){const s=put(c).map(t=>t.ch).join(''); const sc=isWord(s)?2:isAlive(s)?1:0; if(sc>bs){bs=sc;best=c;}}
    return put(best);
  }
  return put(tile.ch);
}
function stateOf(i,tile,atStart){
  if(S.junk[i]) return 'junk';
  if(S.lock[i]>0) return 'locked';
  if(S.lines[i].length>=lineMax(i)) return 'full';
  const s=placed(i,tile,atStart).map(t=>t.ch).join('');
  return isWord(s)?'word':isAlive(s)?'alive':'dead';
}
function hintFor(i,tile,atStart){
  if(!tile) return null;
  const st=stateOf(i,tile,atStart);
  if(st!=='dead') return st;
  if(S.rowMods[i]==='fort') return 'bounce';
  if(has('parasite') && parasiteTarget(i,tile)!=null) return 'jump';
  return has('pen')?'junk':'dead';
}
function parasiteTarget(i,tile){
  const n=nLines();
  for(let k=1;k<n;k++){const j=(i+k)%n; const st=stateOf(j,tile,false); if(st==='word'||st==='alive') return j;}
  return null;
}
const waznOf=id=>PATTERNS.find(p=>p.id===id);
/* Which still-undrawn letter would finish this row on the round's commissioned wazn.
   Recall becomes perception: the board remembers the pattern so the player doesn't. */
function waznHint(i){
  if(!S.wazn||S.junk[i]||S.lock[i]>0||!S.lines[i].length||S.lines[i].length>=lineMax(i)) return null;
  const s=lineStr(i), seen=new Set();
  for(const id of S.draw){
    const t=S.bag.find(b=>b.id===id);
    if(!t||seen.has(t.ch)) continue;
    seen.add(t.ch);
    const w=s+t.ch, p=isWord(w)?patOf(w):null;
    if(p&&p.id===S.wazn) return t.ch;
  }
  return null;
}

/* ================= SCORING ================= */
function scoreWord(tiles,s,row){
  const len=s.length, tags=[]; let chips=0, x=1;
  for(const t of tiles){ let v=VAL[t.ch]||1; if(t.ench==='gold') v*=3; chips+=v; }
  chips+=LENB[Math.min(len,8)];
  let mult=1+Math.max(0,len-3);
  const p=patOf(s);
  if(p){ const lv=S.patLv[p.id]||1, com=p.id===S.wazn, k=(has('wazzan')?2:1)*(com?2:1);
    chips+=Math.round(p.c*(1+.5*(lv-1)))*k; mult+=(p.m+lv-1)*k; tags.push('وزن '+p.n+(lv>1?' م'+lv:''));
    if(com) tags.push('طلب الجولة ×٢'); }
  if(hasAl(s)){ mult+=1; tags.push('ال +١'); }
  const root=rootOf(s), nb=nbOf(root);
  if(nb){ chips+=5*nb.lvl; mult+=nb.lvl; tags.push('دفتر '+spaced(root)+' م'+nb.lvl); }
  let add=S.permMult;
  if(has('reader')){ const seen=Object.keys(S.seenRoots).length+(root&&!S.seenRoots[root]?1:0); add+=.25*seen; }
  if(add>0){ mult+=add; tags.push('دائم +'+fmt(add)); }
  if(root){const prev=S.rootCounts[root]||0; if(prev>0){x*=(1+prev); tags.push('رنين ×'+(1+prev));}}
  const bagFlavor=tiles.some(t=>t.ench)||S.bag.length<=7, pctx={nb,p,chain:S.chain,bagFlavor};
  for(const path of PATHS){
    const lv=pathLvl(path.progress(S,has));
    if(lv>0&&path.match(pctx)){ const b=.15*lv; x*=1+b; tags.push('مسار '+path.n+' م'+lv+' +'+Math.round(b*100)+'٪'); }
  }
  if(S.chain>0){const m=1+.5*S.chain; x*=m; tags.push('سلسلة ×'+fmt(m));}
  const glass=tiles.filter(t=>t.ench==='glass').length; if(glass){x*=2**glass; tags.push('زجاج ×'+(2**glass));}
  const mod=S.rowMods[row];
  if(mod==='double'){x*=2;tags.push('سطر مضاعف ×٢');}
  if(mod==='short'&&len<=3){x*=3;tags.push('قِصار ×٣');}
  if(mod==='long'&&len>=5){x*=3;tags.push('طِوال ×٣');}
  if(has('orphan')&&S.bag.length<=7){x*=3;tags.push('يتيم ×٣');}
  if(S.boss&&S.boss.id==='rhyme'&&S.lastEnd&&s[0]!==S.lastEnd){x*=.5;tags.push('بلا قافية ×½');}
  return {chips,mult:mult*x,score:Math.round(chips*mult*x),tags,root,pat:p?p.id:null};
}
const fmt=n=>(+(+n).toFixed(2)).toString();

/* ================= ACTIONS ================= */
let fx={line:null,kind:null};
function drop(i,atStart){
  if(S.phase!=='play'||i>=nLines()) return;
  if(S.lock[i]>0){ toast('هذا السطر جافّ الآن'); return; }
  if(!S.junk[i]&&S.lines[i].length>=lineMax(i)){ toast('هذا السطر ممتلئ، اختمه أولًا'); return; }
  const tile=S.cur; audio('drop');
  if(!S.sealedSinceDrop) S.chain=has('ember')?Math.max(0,S.chain-1):0;
  S.sealedSinceDrop=false;
  if(S.junk[i]){ if(S.lines[i].length<lineMax(i)) S.lines[i]=[...S.lines[i],tile]; }
  else {
    const st=stateOf(i,tile,atStart);
    if(st==='word'||st==='alive'){ S.lines[i]=placed(i,tile,atStart); fx={line:i,kind:'drop'}; }
    else if(S.rowMods[i]==='fort'){ fx={line:i,kind:'crack'}; floatAt(i,{bad:true,text:'ارتدّ الحرف'}); }
    else if(has('parasite') && parasiteTarget(i,tile)!=null){ const j=parasiteTarget(i,tile); S.lines[j]=placed(j,tile,false); fx={line:j,kind:'drop'}; floatAt(j,{bad:true,text:'قفز الطفيلي'}); }
    else if(has('pen')){ S.lines[i]=[...S.lines[i],tile]; S.junk[i]=true; fx={line:i,kind:'crack'}; audio('crack'); }
    else crack(i);
  }
  S.drops--; S.dropCount++;
  for(let k=0;k<4;k++) if(S.lock[k]>0) S.lock[k]--;
  if(S.boss&&S.boss.id==='termite'&&S.dropCount%4===0) termite();
  advance(tile);
  if(S.drops<=0) endOfDrops(); else render();
}
function termite(){
  let best=-1,bl=0; for(let k=0;k<nLines();k++){ if(!S.junk[k]&&S.lines[k].length>bl){bl=S.lines[k].length;best=k;} }
  if(best<0) return;
  const eaten=S.lines[best][0].ch; S.lines[best]=S.lines[best].slice(1);
  toast(`<b>الأرَضة</b> أكلت «${eaten}»`);
  if(!isAlive(lineStr(best))) crack(best);
}
function crack(i){
  const scrap=S.lines[i].reduce((a,t)=>a+(VAL[t.ch]||1),0);
  S.score+=scrap;
  S.lines[i]=[]; S.chain=0; fx={line:i,kind:'crack'}; audio('crack');
  const tail=scrap?`، نشارة +${scrap}`:'';
  if(has('mill')){ S.permMult+=.5; floatAt(i,{bad:true,text:'انكسر، الرحى +٠٫٥'+tail}); }
  else floatAt(i,{bad:true,text:'انكسر السطر'+tail});
}
function advance(prev){
  if(prev&&prev.ench==='echo') S.cur={...prev,id:null,ench:null};
  else { S.cur=S.next; S.next=drawTile(); }
  resetTimer();
}
function burn(){ if(S.phase!=='play'||S.burns<=0) return; S.burns--; audio('burn'); advance(null); render(); }
function cycleDot(){
  if(S.phase!=='play'||!has('dot')||S.dotUses<=0) return;
  const f=famOf(S.cur.ch); if(!f||S.cur.ench==='ink') return;
  S.cur={...S.cur,ch:f[(f.indexOf(S.cur.ch)+1)%f.length]}; S.dotUses--; audio('drop'); render();
}
function twinSwap(){ if(S.phase!=='play'||!has('twin')||has('fourth')) return; [S.cur,S.next]=[S.next,S.cur]; audio('drop'); render(); }
function seal(i,auto){
  if(S.phase!=='play') return;
  const tiles=S.lines[i]; if(!tiles.length) return;
  const s=tiles.map(t=>t.ch).join('');
  if(S.junk[i]){
    const sc=3*s.length; S.score+=sc; S.lines[i]=[]; S.junk[i]=false; fx={line:i,kind:'sealed'};
    floatAt(i,{score:sc,eq:'حشو: ٣ × '+s.length,tags:[]}); audio('seal',0);
    return afterSeal(auto);
  }
  if(!isWord(s)) return;
  const r=scoreWord(tiles,s,i);
  S.score+=r.score; S.stats.words++; S.stats.total+=r.score;
  if(!S.stats.best||r.score>S.stats.best.score) S.stats.best={w:displayOf(s),score:r.score};
  if(r.root){
    S.rootCounts[r.root]=(S.rootCounts[r.root]||0)+1; S.roundRoots[r.root]=(S.roundRoots[r.root]||0)+1; S.seenRoots[r.root]=1;
    for(const ch of new Set([...r.root])){
      const was=isRooted(ch); S.ink[ch]=inkOf(ch)+1;
      if(!was&&isRooted(ch)&&S.bag.some(t=>t.ch===ch))
        setTimeout(()=>toast(`رسخ <b>${ch}</b> في كيسك — صار يسقط أكثر`),900);
    }
    const nb=nbOf(r.root);
    if(nb){ nb.xp+=has('inkwell')?2:1; if(nb.xp>=3){nb.xp-=3; nb.lvl++; setTimeout(()=>toast(`ارتقى الجذر <b>${spaced(nb.root)}</b> إلى المستوى ${nb.lvl}`),700);} }
  }
  if(has('collector')&&r.pat&&!S.seenPatterns[r.pat]){ S.seenPatterns[r.pat]=1; S.permMult+=.5; setTimeout(()=>toast('جامع الأوزان: أول كلمة على وزن جديد · +٠٫٥ مضاعف دائم'),650); }
  S.chain++; S.stats.maxChain=Math.max(S.stats.maxChain||0,S.chain); S.sealedSinceDrop=true; S.lastEnd=s[s.length-1];
  if(S.rowMods[i]==='gold') S.gold+=2;
  tiles.filter(t=>t.ench==='glass'&&t.id).forEach(t=>{S.bag=S.bag.filter(b=>b.id!==t.id);});
  if(has('ring')) S.top=[...tiles.filter(t=>!t.heavy).map(t=>({...t})),...S.top];
  if(has('nasikh')&&S.bag.length<bagCap()){ const best=tiles.filter(t=>!t.heavy).reduce((a,b)=>(VAL[b.ch]||0)>(VAL[a.ch]||0)?b:a); S.bag.push({id:uid++,ch:best.ch,ench:null}); }
  if(has('eater')&&s.length>=5&&S.bag.length>4){ const cand=tiles.filter(t=>t.id&&S.bag.some(b=>b.id===t.id)); if(cand.length){const v=pick(cand); S.bag=S.bag.filter(b=>b.id!==v.id); S.permMult+=1; setTimeout(()=>toast(`التهم آكل الحروف «${v.ch}» · +١ مضاعف دائم`),500);} }
  S.lines[i]=[]; fx={line:i,kind:'sealed'};
  if(S.rowMods[i]==='echo') S.lines[i]=[{id:null,ch:s[s.length-1],ench:null}];
  if(S.boss&&S.boss.id==='dry') S.lock[i]=2;
  S.log.unshift({w:displayOf(s),sc:r.score}); S.log=S.log.slice(0,6);
  floatAt(i,{score:r.score,eq:r.chips+' × '+fmt(r.mult),tags:r.tags});
  audio('seal',S.chain); try{navigator.vibrate&&navigator.vibrate(18)}catch(e){}
  if(has('thread')) for(let k=0;k<nLines();k++){ if(k!==i&&!S.junk[k]&&S.lines[k].length>=2&&isWord(lineStr(k))){ seal(k,true); if(S.phase!=='play') return; } }
  afterSeal(auto);
}
function afterSeal(auto){ if(!auto) render(); }
function endOfDrops(){
  S.phase='ending'; render();
  const n=nLines(); let k=0;
  const step=()=>{
    if(S.phase!=='ending') return;
    while(k<n&&!(S.lines[k].length>=2&&!S.junk[k]&&isWord(lineStr(k)))) k++;
    if(k<n){ S.phase='play'; seal(k,true); if(S.phase==='play') S.phase='ending'; render(); k++; setTimeout(step,450); return; }
    if(S.score>=S.target){S.phase='won'; render(); setTimeout(winRound,700);} else { S.phase='over'; audio('lose'); render(); }
  };
  setTimeout(step,350);
}
function winRound(){
  const boss=!!S.boss;
  const base=4+(boss?3:0), over=Math.max(0,Math.min(8,Math.floor((S.score/S.target-1)*8))), interest=Math.min(5,Math.floor(S.gold/5));
  S.earn={base,over,interest,total:base+over+interest};
  S.gold+=S.earn.total; audio('win');
  if(S.round>=TARGETS.length){ S.phase='victory'; render(); return; }
  const cands=Object.entries(S.roundRoots).filter(([r])=>!nbOf(r)).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([r,c])=>({root:r,count:c}));
  S.nbOffer=cands.length?cands:null; S.nbReplace=null;
  S.phase='roundwon'; render();
}
function writeRoot(root){
  if(S.notebook.length<nbSlots()){ S.notebook.push({root,lvl:1,xp:0}); S.nbOffer=null; audio('seal',2); pathFeedback('root'); openShop(); }
  else { S.nbReplace=root; render(); }
}
function replaceRoot(idx){ S.notebook[idx]={root:S.nbReplace,lvl:1,xp:0}; S.nbReplace=null; S.nbOffer=null; audio('seal',2); pathFeedback('root'); openShop(); }

/* ================= SHOP ================= */
function openShop(){ S.phase='shop'; S.shop={offers:genOffers(),reroll:2,removed:false,lead:leadingPath()}; render(); }
function genOffers(){
  const lead=leadingPath();
  const pool=Object.keys(RELICS).filter(r=>!S.relics.includes(r));
  const matched=pool.filter(r=>RELICS[r].path===lead), other=pool.filter(r=>RELICS[r].path!==lead);
  shuffle(matched); shuffle(other);
  const relicPool=lead?[...matched,...other]:shuffle(pool);
  const o=relicPool.slice(0,2).map(r=>({k:'relic',id:r,cost:6,path:RELICS[r].path}));
  o.push({k:'letters',cost:3,opts:letterOpts()});
  const rid=pick(Object.keys(ROWMODS));
  o.push({k:'row',id:rid,cost:4,path:ROWMODS[rid].path});
  const wantNb=lead==='root'||(lead!=='pattern'&&Math.random()<.5&&S.notebook.length);
  if(wantNb&&S.notebook.length){ o.push({k:'nbup',root:pick(S.notebook).root,cost:3,path:'root'}); }
  else o.push({k:'patup',id:pick(PATTERNS.filter(p=>p.id!=='thulathi')).id,cost:3,path:'pattern'});
  o.push({k:'ench',id:pick(Object.keys(ENCH)),cost:4,path:'bag'});
  return o;
}
function letterOpts(){
  const nbL=[...nbLetters()]; const pool=shuffle([...LETTERS]);
  const out=new Set(); if(nbL.length) out.add(pick(nbL));
  for(const c of pool){ if(out.size>=3) break; out.add(c); }
  return [...out];
}
function buy(idx){
  const o=S.shop.offers[idx]; if(!o||o.sold||S.gold<o.cost) return;
  if(o.k==='relic'){ if(S.relics.length>=5){toast('معك ٥ طلاسم، وهذا الحد');return;} S.relics.push(o.id); pay(o); pathFeedback(o.path); }
  else if(o.k==='nbup'){ const nb=nbOf(o.root); if(nb) nb.lvl++; pay(o); pathFeedback('root'); }
  else if(o.k==='patup'){ S.patLv[o.id]=(S.patLv[o.id]||1)+1; pay(o); pathFeedback('pattern'); }
  else if(o.k==='ench') S.picker={mode:'ench',ench:o.id,idx};
  else if(o.k==='letters') S.picker={mode:'letters',idx};
  else if(o.k==='row') S.picker={mode:'row',mod:o.id,idx};
  audio('drop'); render();
}
function pay(o){S.gold-=o.cost;o.sold=true;}
function pickTile(id){
  const p=S.picker; const o=p.idx!=null?S.shop.offers[p.idx]:null;
  const t=S.bag.find(b=>b.id===id); if(!t) return;
  if(p.mode==='ench'){ if(p.ench==='ink'&&!famOf(t.ch)){toast('الحبر يحتاج حرفًا له عائلة نقاط');return;} t.ench=p.ench; pay(o); pathFeedback('bag'); }
  else if(p.mode==='remove'){ if(S.bag.length<=4){toast('لا يقل الكيس عن ٤ حروف');return;} S.bag=S.bag.filter(b=>b.id!==id); S.gold-=2; S.shop.removed=true; }
  else if(p.mode==='replace'){ t.ch=p.ch; t.ench=null; pay(o); }
  S.picker=null; audio('seal',1); render();
}
function pickLetter(ch){
  const o=S.shop.offers[S.picker.idx];
  if(S.bag.length>=bagCap()){ S.picker={mode:'replace',ch,idx:S.picker.idx}; render(); return; }
  S.bag.push({id:uid++,ch,ench:null}); pay(o); S.picker=null; audio('seal',1); render();
}
function pickRow(r){ const o=S.shop.offers[S.picker.idx]; S.rowMods[r]=S.picker.mod; pay(o); S.picker=null; audio('seal',1); pathFeedback(o.path); render(); }
function reroll(){ if(S.gold<S.shop.reroll) return; S.gold-=S.shop.reroll; S.shop.reroll++; S.shop.offers=genOffers(); render(); }
function nextRound(){ S.round++; startRound(); render(); }

/* timer */
let timerId=null,timerEnd=0; const TLIM=5000;
function resetTimer(){ clearInterval(timerId); timerId=null;
  if(S&&S.phase==='play'&&S.boss&&S.boss.id==='rush'){ timerEnd=Date.now()+TLIM; timerId=setInterval(tick,100);} }
function tick(){
  if(S.phase!=='play'){clearInterval(timerId);return;}
  const left=timerEnd-Date.now(); const el=document.querySelector('.timer i'); if(el) el.style.width=Math.max(0,left/TLIM*100)+'%';
  if(left<=0){ S.drops--; audio('crack'); toast('احترق الحرف'); advance(null); if(S.drops<=0) endOfDrops(); else render(); }
}

/* ================= RENDER ================= */
const app=document.getElementById('app'), ovl=document.getElementById('ovl');
function tileHTML(t,cls=''){
  if(!t) return `<div class="tile ${cls} hidden">؟</div>`;
  const nbd=S&&S.notebook&&nbLetters().has(t.ch)?'<span class="nbdot"></span>':'';
  const rk=S&&S.ink&&isRooted(t.ch)?' rooted':'', zd=ZAWAID.has(t.ch)?' zaid':'';
  return `<div class="tile ${cls}${rk}${zd} ${t.ench?'e-'+t.ench:''}">${t.ch}<span class="val">${VAL[t.ch]||1}</span>${nbd}</div>`;
}
const HINTLAB={word:'تكتمل هنا',alive:'تبقى حيّة',dead:'ستنكسر',full:'ممتلئ',junk:'حشو',locked:'جافّ',bounce:'سيرتد',jump:'سيقفز'};
function render(){
  if(!S) return;
  if(!S.bag){ app.innerHTML=''; renderOverlay(); return; }
  const n=nLines();
  const hideNext=has('fourth')||(S.boss&&S.boss.id==='blind');
  const pct=Math.min(100,S.score/S.target*100);
  const chainM=1+.5*S.chain;
  const lead=leadingPath(), leadP=lead?PATHS.find(p=>p.id===lead):null;
  let h=`<div class="head">
    <span class="rnd">جولة <b>${S.round}</b> من <b>${TARGETS.length}</b>${S.boss?` <span class="boss">${BOSSES[S.boss.id].n}</span>`:''}</span>
    <span class="tally"><b class="now">${S.score}</b><span class="track"><i style="width:${pct}%"></i></span><span class="goal">${S.target}</span></span>
    <span class="purse">${S.drops} إسقاطة &nbsp; <b>${S.gold}</b> دينار</span>
  </div>
  <div class="commission">طلب هذه الجولة <b>${waznOf(S.wazn).n}</b><span>يدفع ضعفين</span></div>
  <div class="lines">`;
  for(let i=0;i<n;i++){
    const L=S.lines[i], s=L.map(t=>t.ch).join(''), junk=S.junk[i];
    const hint=S.phase==='play'?hintFor(i,S.cur,false):null;
    const ok=!junk&&isWord(s);
    const fxc=fx.line===i?(fx.kind==='crack'?'cracked':fx.kind==='sealed'?'sealed':''):'';
    let rootl='';
    if(ok){ const r=rootOf(s), p=patOf(s), nb=nbOf(r), c=r?S.rootCounts[r]||0:0;
      const bits=[]; if(r) bits.push(`<span class="${nb?'nbk':''}">${spaced(r)}${nb?' من الدفتر':''}</span>`); if(c) bits.push(`رنين <b>×${c+1}</b>`); if(p) bits.push('وزن '+p.n);
      rootl=bits.length?`<div class="rootlab">${bits.map(b=>`<span>${b}</span>`).join('')}</div>`:''; }
    let sealBtn='';
    if(ok&&s.length>=2){const p=scoreWord(L,s,i); sealBtn=`<button class="seal" data-seal="${i}">ختم<small>+${p.score}</small></button>`;}
    else if(junk&&L.length) sealBtn=`<button class="seal junkseal" data-seal="${i}">امسح<small>+${3*s.length}</small></button>`;
    const mod=S.rowMods[i];
    const startHint=has('muarrib')&&S.phase==='play'&&!junk&&S.lock[i]<=0?stateOf(i,S.cur,true):null;
    const wh=S.phase==='play'?waznHint(i):null;
    h+=`<div class="line ${hint?'h-'+hint:''} ${junk?'junk':''} ${S.lock[i]>0?'locked':''} ${fxc}" data-line="${i}" tabindex="0" role="button" aria-label="السطر ${i+1}">
      ${startHint?`<div class="startzone" data-start="${i}"></div>`:''}
      <div class="tags"><span style="display:flex;gap:6px"><span class="hintlab">${HINTLAB[hint]||''}</span>${startHint?`<span class="hintlab zs z-${startHint}">الأول: ${HINTLAB[startHint]||''}</span>`:''}${wh?`<span class="waznhint">+${wh} ← ${waznOf(S.wazn).n}</span>`:''}</span><span style="display:flex;gap:6px">${mod?`<span class="modlab" data-mod="${mod}">${ROWMODS[mod].n}</span>`:''}<span class="cap">${L.length}/${lineMax(i)}</span></span></div>
      <div class="lm"><div class="word ${ok?'ok':''} ${junk?'junk':''}">${s?(ok?displayOf(s):s):'<span class="ph">· · ·</span>'}</div>
      ${rootl}
      ${L.some(t=>t.ench)?`<div class="chips">${L.filter(t=>t.ench).map(t=>`<span class="chip e-${t.ench}">${t.ch}</span>`).join('')}</div>`:''}</div>
      ${sealBtn}</div>`;
  }
  const pileN=S.draw.length+S.top.length;
  h+=`</div>
  <div class="hand">
    <button class="burn" data-act="burn" ${S.burns<=0||S.phase!=='play'?'disabled':''}>احرق<small>${S.burns} متبقية</small></button>
    <div class="cur">${tileHTML(S.cur,'big')}
      <div class="enchlab">${S.cur&&S.cur.ench?ENCH[S.cur.ench].n:`<span class="pile">في الكومة ${pileN} من ${S.bag.length}</span>`}</div>
      ${S.boss&&S.boss.id==='rush'?'<div class="timer"><i style="width:100%"></i></div>':''}
      ${has('dot')&&famOf(S.cur.ch)&&S.cur.ench!=='ink'?`<button class="dotbtn" data-act="dot" ${S.dotUses<=0?'disabled':''}>انقل النقطة (${S.dotUses})</button>`:''}</div>
    <button class="nextwrap" data-act="twin" ${has('twin')&&!hideNext?'':'tabindex="-1"'}>${has('twin')&&!hideNext?'التالي · بدّل':'التالي'}${hideNext?tileHTML(null,'small'):tileHTML(S.next,'small')}</button>
  </div>
  <div class="foot">
    ${S.notebook.map(e=>`<span class="nb">${spaced(e.root)}<small>م${e.lvl}</small></span>`).join('')}
    ${rootedLetters().length?`<span class="rooted"><span class="lab">راسخ</span>${rootedLetters().map(c=>`<b>${c}</b>`).join('')}</span>`:''}
    ${leadP?`<button class="pathchip lead" data-path="${leadP.id}" style="--pc:${leadP.c}">مسار ${leadP.n}<b>م${pathLevelOf(lead)}</b></button>`:''}
    ${S.relics.map(r=>`<button class="relic" data-relic="${r}">${RELICS[r].n}</button>`).join('')}
    ${S.chain>0?`<span class="chain ${S.chain>=2?'hot':''}">سلسلة ${S.chain} ×${fmt(chainM)}</span>`:''}
    ${S.boss&&S.boss.id==='rhyme'&&S.lastEnd?`<span class="bossnote">ابدأ بـ«${S.lastEnd}»</span>`:''}
    <button class="linkbtn" data-act="book">الأوزان والكيس</button>
  </div>`;
  app.innerHTML=h; fx={line:null,kind:null};
  renderOverlay();
}
/* Answers "why this letter?" from what the language and the run already know:
   a زائدة widens which أوزان you can reach, a radical deepens the roots you keep spelling. */
function letterTag(ch){
  if(ZAWAID.has(ch)) return 'زائدة — تبني الأوزان';
  if(isRooted(ch)) return 'راسخ — يسقط أكثر';
  const k=inkOf(ch);
  return k?`جذر — رسوخه ${k}/${ROOT_AT}`:'جذر — يحمل المعنى';
}
function bagGrid(clickable){
  const tiles=[...S.bag].sort((a,b)=>a.ch.localeCompare(b.ch,'ar'));
  return `<div class="baggrid">${tiles.map(t=>clickable?`<button data-pick="${t.id}">${tileHTML(t)}</button>`:tileHTML(t)).join('')}</div>`;
}
function renderOverlay(){
  let o='';
  const P=S.phase;
  if(P==='title'){
    let best=0; try{best=+localStorage.getItem('harf-best')||0}catch(e){}
    o=`<div class="card"><h1>حرف بحرف</h1>
      <p class="sub">كيسك عشرة حروف فقط. تسقط عليك واحدًا تلو الآخر، وأنت تختار السطر.</p>
      <ul class="rules">
        <li><span class="ic">ب</span><span><b>اضغط سطرًا</b> لتضع فيه الحرف. لونه يخبرك: <b style="color:var(--glaze)">فيروزي</b> يبقى حيًا، <b style="color:var(--saffron)">ذهبي</b> يكمل كلمة، <b style="color:var(--crack)">أحمر</b> ينكسر.</span></li>
        <li><span class="ic g">خ</span><span>عندما تكتمل كلمة يظهر <b>الختم</b>. اختم الآن، أو غامر بحرف آخر لكلمة أطول.</span></li>
        <li><span class="ic t">ج</span><span><b>الجذر × الوزن</b>: جذور دفترك تكبر كلما ختمت كلماتها، والأوزان (فاعل، مفعول، تفعيل…) لها مكافأتها.</span></li>
        <li><span class="ic v">ك</span><span><b>الكيس هو بناؤك</b>: كل حرف فيه يسقط عليك في كل جولة. أضف حروف جذورك واحذف ما لا يخدمها.</span></li>
      </ul>
      <button class="btn" data-act="starters">ابدأ الرحلة</button>
      ${best?`<p class="sub">أفضل رحلة: ${best} نقطة</p>`:''}</div>`;
  } else if(P==='starters'){
    o=`<div class="card"><h2>اختر كيسك الأول</h2><div class="choice">${STARTERS.map(s=>`<button data-starter="${s.id}"><b>${s.n}</b><span class="letters">${[...s.letters].join(' ')}</span><span>يبدأ دفترك بجذر ${spaced(s.root)}. ${s.d}</span></button>`).join('')}</div></div>`;
  } else if(P==='intro'){
    const lid=leadingPath(), lp=lid?PATHS.find(x=>x.id===lid):null;
    o=`<div class="card"><h2>الجولة ${S.round}</h2>
      <div class="kv"><div><span>الهدف</span><b>${S.target}</b></div><div><span>الإسقاطات</span><b>${S.dropsMax}</b></div><div><span>الحرق</span><b>${S.burnsMax}</b></div><div><span>حروف الكيس</span><b>${S.bag.length}</b></div></div>
      <div class="pathnote" style="--pc:var(--seal)">طلب هذه الجولة: <b>${waznOf(S.wazn).n}</b> — كلماته تدفع ضعفين</div>
      ${lp?`<div class="pathnote" style="--pc:${lp.c}">مسارك الآن: <b>${lp.n}</b> م${pathLevelOf(lid)}</div>`:''}
      ${S.boss?`<div class="bosscard"><b>الزعيم: ${BOSSES[S.boss.id].n}</b><p>${BOSSES[S.boss.id].d}</p></div>`:''}
      <button class="btn" data-act="go">ابدأ</button></div>`;
  } else if(P==='roundwon'){
    const e=S.earn;
    let nbPart='';
    if(S.nbOffer&&S.nbReplace){
      nbPart=`<h3>الدفتر ممتلئ. أي جذر تمحو لتكتب ${spaced(S.nbReplace)}؟</h3><div class="choice">${S.notebook.map((x,k)=>`<button data-replace="${k}"><b>${spaced(x.root)}</b><span>المستوى ${x.lvl}</span></button>`).join('')}</div>`;
    } else if(S.nbOffer){
      nbPart=`<h3>اكتب جذرًا في دفترك</h3><p class="sub">جذور الدفتر تضيف نقاطًا ومضاعفًا لكل كلماتها، وترتقي كل ٣ أختام.</p>
        <div class="choice">${S.nbOffer.map(c=>`<button data-write="${c.root}"><b>${spaced(c.root)}</b><span>ختمت منه ${c.count} ${c.count>1?'كلمات':'كلمة'} هذه الجولة</span></button>`).join('')}</div>`;
    }
    o=`<div class="card"><h2>عبرت الجولة ${S.round}</h2>
      <div class="kv"><div><span>مكافأة الجولة</span><b>+${e.base}</b></div><div><span>تجاوز الهدف</span><b>+${e.over}</b></div><div><span>فائدة (١ لكل ٥)</span><b>+${e.interest}</b></div><div><span>في جيبك</span><b>${S.gold}</b></div></div>
      ${nbPart}
      <button class="btn ${S.nbOffer?'ghost':''}" data-act="shop">${S.nbOffer?'تخطَّ، إلى السوق':'إلى السوق'}</button></div>`;
  } else if(P==='shop'){
    const sh=S.shop, p=S.picker;
    if(p&&p.mode==='letters'){
      const o2=sh.offers[p.idx];
      o=`<div class="card"><h2>اختر حرفًا لكيسك</h2><p class="sub">${S.bag.length>=bagCap()?'الكيس ممتلئ: ستختار بعدها حرفًا يُستبدل.':'في كيسك '+S.bag.length+' من '+bagCap()+'.'} النقطة الفيروزية = من حروف جذور دفترك.</p>
        <div class="letterpick">${o2.opts.map(c=>`<button data-letter="${c}">${tileHTML({ch:c,ench:null},'big')}<small class="lettertag">${letterTag(c)}</small></button>`).join('')}</div><button class="btn ghost" data-act="cancelpick">رجوع</button></div>`;
    } else if(p&&p.mode==='row'){
      o=`<div class="card"><h2>انقش «${ROWMODS[p.mod].n}» على سطر</h2><p class="sub">${ROWMODS[p.mod].d} يحل محل أي نقش سابق.</p>
        <div class="rowpick">${Array.from({length:nLines()},(_,r)=>`<button data-row="${r}">السطر ${r+1}${S.rowMods[r]?' · الآن: '+ROWMODS[S.rowMods[r]].n:' · بلا نقش'}</button>`).join('')}</div>
        <button class="btn ghost" data-act="cancelpick">رجوع</button></div>`;
    } else if(p){
      const title=p.mode==='ench'?`اختر حرفًا يصير ${ENCH[p.ench].n}`:p.mode==='replace'?`أي حرف يُستبدل بـ«${p.ch}»؟`:'اختر حرفًا تحذفه من الكيس';
      o=`<div class="card"><h2>${title}</h2>${p.mode==='ench'?`<p class="sub">${ENCH[p.ench].d}</p>`:''}${bagGrid(true)}<button class="btn ghost" data-act="cancelpick">رجوع</button></div>`;
    } else {
      o=`<div class="card"><h2>السوق</h2><p class="goldline">${S.gold} دينار</p>
        <div class="shopgrid">${sh.offers.map((x,i)=>offerHTML(x,i)).join('')}</div>
        <div class="shoprow">
          <button class="btn ghost" data-act="remove" ${S.gold<2||sh.removed?'disabled':''}>احذف حرفًا · ٢</button>
          <button class="btn ghost" data-act="reroll" ${S.gold<sh.reroll?'disabled':''}>عروض جديدة · ${sh.reroll}</button>
          <button class="btn ghost" data-act="book">الكيس والأوزان</button>
        </div>
        <button class="btn" data-act="next">الجولة ${S.round+1}</button></div>`;
    }
  } else if(P==='book'){
    const lead=leadingPath();
    o=`<div class="card"><h2>كيسك · ${S.bag.length} من ${bagCap()}</h2>${bagGrid(false)}
      <h3>الدفتر</h3><div class="kv">${S.notebook.map(x=>`<div><span>${spaced(x.root)}</span><b>م${x.lvl} · +${5*x.lvl} نقاط +${x.lvl} مضاعف</b></div>`).join('')}</div>
      <h3>الأوزان</h3><div class="pat">${PATTERNS.map(p=>{const lv=S.patLv[p.id]||1; return `<div><b>${p.n}</b>م${lv} · +${Math.round(p.c*(1+.5*(lv-1)))} نقاط +${p.m+lv-1} مضاعف</div>`;}).join('')}</div>
      <h3>كيسك حرفًا حرفًا</h3><div class="pat">${[...new Set(S.bag.map(t=>t.ch))].sort((a,b)=>inkOf(b)-inkOf(a)).map(c=>`<div><b>${c}</b>${letterTag(c)}</div>`).join('')}</div>
      <h3>المسارات</h3><div class="pathsgrid">${pathStats().map(p=>`<div style="--pc:${p.c}" class="${p.id===lead?'lead':''}"><b>${p.n}${p.lvl>0?' · م'+p.lvl+' · +'+Math.round(p.lvl*15)+'٪':''}</b><small>${p.d}</small></div>`).join('')}</div>
      ${S.permMult?`<p class="sub">مضاعف دائم: +${fmt(S.permMult)}</p>`:''}
      ${S.rowMods.slice(0,nLines()).some(Boolean)?`<h3>نقوش السطور</h3><div class="kv">${S.rowMods.slice(0,nLines()).map((m,r)=>`<div><span>السطر ${r+1}</span><b>${m?ROWMODS[m].n:'—'}</b></div>`).join('')}</div>`:''}
      <button class="btn ghost" data-act="closebook">رجوع</button></div>`;
  } else if(P==='over'||P==='victory'){
    saveBest();
    const v=P==='victory';
    const lid=leadingPath(), lp=lid?PATHS.find(x=>x.id===lid):null;
    o=`<div class="card"><h2>${v?'اكتملت الرحلة':'جفّ الحبر'}</h2>
      <p class="sub">${v?'عبرت الجولات الثماني كلها.':`وصلت إلى الجولة ${S.round}، ونقاطك ${S.score} من ${S.target}.`}</p>
      <div class="kv"><div><span>كلمات مختومة</span><b>${S.stats.words}</b></div><div><span>مجموع النقاط</span><b>${S.stats.total}</b></div>${S.stats.best?`<div><span>أغلى كلمة</span><b>${S.stats.best.w} · ${S.stats.best.score}</b></div>`:''}
      ${lp?`<div><span>مسارك</span><b style="color:${lp.c}">${lp.n} · م${pathLevelOf(lid)}</b></div>`:''}
      <div><span>الدفتر</span><b>${S.notebook.map(x=>spaced(x.root)+' م'+x.lvl).join('، ')}</b></div>
      <div><span>الطلاسم</span><b>${S.relics.map(r=>RELICS[r].n).join('، ')||'—'}</b></div></div>
      <button class="btn" data-act="restart">رحلة جديدة</button></div>`;
  }
  ovl.innerHTML=o?`<div class="ov">${o}</div>`:'';
}
function offerHTML(x,i){
  let kind,nm,ds,cls='';
  if(x.k==='relic'){kind='طلسم';nm=RELICS[x.id].n;ds=RELICS[x.id].d;cls='k-relic';}
  else if(x.k==='ench'){kind='نقش حرف';nm='حرف '+ENCH[x.id].n;ds=ENCH[x.id].d+' تختار الحرف من كيسك.';}
  else if(x.k==='letters'){kind='حروف';nm='حرف جديد';ds='واحد من: '+x.opts.join('، ')+(S.bag.length>=bagCap()?' (يستبدل حرفًا)':'');}
  else if(x.k==='row'){kind='نقش سطر';nm='سطر '+ROWMODS[x.id].n;ds=ROWMODS[x.id].d;cls='k-row';}
  else if(x.k==='nbup'){kind='حبر';nm='ارفع جذر '+spaced(x.root);ds='+١ مستوى لهذا الجذر في دفترك.';cls='k-up';}
  else {const p=PATTERNS.find(q=>q.id===x.id);kind='ميزان';nm='ارفع وزن '+p.n;ds=`+١ مستوى: نقاط ومضاعف أعلى لكل كلمة على وزن ${p.n}.`;cls='k-up';}
  const path=x.path?PATHS.find(p=>p.id===x.path):null;
  const serves=path&&S.shop&&x.path===S.shop.lead;
  const pathTag=path?`<span class="pathtag" style="--pc:${path.c}">${path.n}${serves?' ✓ يخدم مسارك':''}</span>`:'';
  return `<button class="offer ${cls} ${serves?'serves':''} ${x.sold?'sold':''}" data-buy="${i}" ${S.gold<x.cost?'disabled':''}>
    <span class="kind">${kind}</span><span class="nm">${nm}</span><span class="ds">${ds}</span>${pathTag}<span class="pr">${x.sold?'بيع':x.cost+' دينار'}</span></button>`;
}
function saveBest(){ try{const b=+localStorage.getItem('harf-best')||0; if(S.stats.total>b) localStorage.setItem('harf-best',S.stats.total);}catch(e){} }

function floatAt(i,d){
  const el=document.querySelector(`.line[data-line="${i}"]`);
  const r=el?el.getBoundingClientRect():{left:innerWidth/2,width:0,top:innerHeight/2};
  const f=document.createElement('div'); f.className='float'+(d.bad?' bad':'');
  f.style.left=(r.left+r.width/2)+'px'; f.style.top=(r.top-6)+'px';
  f.innerHTML=d.bad?`<div class="sc">${d.text}</div>`:`<div class="sc">+${d.score}</div><div class="eq">${d.eq}</div><div class="tg">${d.tags.map(t=>`<span>${t}</span>`).join('')}</div>`;
  document.body.appendChild(f); setTimeout(()=>f.remove(),1700);
}
let toastT=null;
function toast(html){ document.querySelectorAll('.toast').forEach(t=>t.remove()); const t=document.createElement('div'); t.className='toast'; t.innerHTML=html; document.body.appendChild(t); clearTimeout(toastT); toastT=setTimeout(()=>t.remove(),2600); }

let AC=null;
function audio(kind,lvl=0){
  if(!S||S.mute) return;
  try{
    AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain(); o.connect(g); g.connect(AC.destination);
    const P={drop:[520,.05,'triangle',.08],burn:[180,.12,'sawtooth',.05],crack:[110,.25,'square',.06],seal:[660*Math.pow(1.12,Math.min(lvl,8)),.28,'sine',.12],win:[880,.5,'sine',.12],lose:[140,.6,'triangle',.1]}[kind];
    o.type=P[2]; o.frequency.setValueAtTime(P[0],t);
    if(kind==='seal'||kind==='win') o.frequency.exponentialRampToValueAtTime(P[0]*1.5,t+P[1]);
    if(kind==='crack'||kind==='lose') o.frequency.exponentialRampToValueAtTime(P[0]*.5,t+P[1]);
    g.gain.setValueAtTime(P[3],t); g.gain.exponentialRampToValueAtTime(.0001,t+P[1]); o.start(t); o.stop(t+P[1]+.02);
  }catch(e){}
}

let prevPhase='play';
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-seal],[data-act],[data-buy],[data-pick],[data-letter],[data-relic],[data-mod],[data-start],[data-line],[data-starter],[data-write],[data-replace],[data-row],[data-path]');
  if(!b||!S) return;
  const D=b.dataset;
  if(D.seal!=null) return seal(+D.seal);
  if(D.buy!=null) return buy(+D.buy);
  if(D.pick!=null) return pickTile(+D.pick);
  if(D.letter!=null) return pickLetter(D.letter);
  if(D.row!=null) return pickRow(+D.row);
  if(D.starter) { newRun(D.starter); return render(); }
  if(D.write) return writeRoot(D.write);
  if(D.replace!=null) return replaceRoot(+D.replace);
  if(D.relic){ const r=RELICS[D.relic]; return toast(`<b>${r.n}</b> — ${r.d}`); }
  if(D.mod){ const m=ROWMODS[D.mod]; return toast(`<b>سطر ${m.n}</b> — ${m.d}`); }
  if(D.path){ const p=PATHS.find(x=>x.id===D.path), lv=pathLevelOf(D.path); return toast(`<b style="color:${p.c}">${p.n}</b>${lv>0?' · م'+lv:''} — ${p.d}`); }
  if(D.start!=null) return drop(+D.start,true);
  if(D.line!=null) return drop(+D.line,false);
  const a=D.act;
  if(a==='starters'){ S.phase='starters'; render(); }
  else if(a==='go'){ S.phase='play'; resetTimer(); render(); }
  else if(a==='burn') burn();
  else if(a==='dot') cycleDot();
  else if(a==='twin') twinSwap();
  else if(a==='shop') openShop();
  else if(a==='next') nextRound();
  else if(a==='reroll') reroll();
  else if(a==='remove'){ S.picker={mode:'remove',idx:null}; render(); }
  else if(a==='cancelpick'){ S.picker=null; render(); }
  else if(a==='book'){ if(S.phase==='ending'||S.phase==='won') return; prevPhase=S.phase; S.phase='book'; clearInterval(timerId); render(); }
  else if(a==='closebook'){ S.phase=prevPhase; if(S.phase==='play') resetTimer(); render(); }
  else if(a==='restart'){ S.phase='title'; render(); }
});
document.addEventListener('keydown',e=>{
  if(!S||S.phase!=='play') return;
  const l=e.target.closest&&e.target.closest('.line');
  if(l&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); drop(+l.dataset.line,false); return; }
  const n={'1':0,'2':1,'3':2,'4':3}[e.key]; if(n!=null){drop(n,e.shiftKey);return;}
  if(e.key==='x'||e.key==='Backspace') burn();
});
let sy=null;
document.addEventListener('touchstart',e=>{ sy=e.target.closest('.cur')?e.touches[0].clientY:null; },{passive:true});
document.addEventListener('touchend',e=>{ if(sy!=null&&e.changedTouches[0].clientY-sy>50) burn(); sy=null; });

function start(data){
  const saved=data&&data.state;
  if(saved&&saved.phase&&saved.bag){ S=saved; uid=Math.max(uid,...S.bag.map(t=>t.id||0))+1; if(S.phase==='ending'||S.phase==='won') S.phase='play'; }
  else { S={phase:'title',mute:false}; }
  render(); renderOverlay(); resetTimer();
}
loadDict().then(()=>{
  if(window.claude?.hot?.snapshot) window.claude.hot.snapshot(()=>({state:S}));
  window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
}).catch(err=>{ ovl.innerHTML=`<div class="ov"><div class="card"><h2>تعذّر تحميل القاموس</h2><p class="sub">يحتاج المتصفح إلى دعم DecompressionStream (سفاري ١٦٫٤ فأحدث، كروم ٨٠ فأحدث).</p></div></div>`; console.error(err); });
