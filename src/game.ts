import { loadDict, norm, IDX, DISP, ROOTS, SORTED, isAlive, isWord, hasAl, displayOf, rootOf, spaced, isRoot, rootAlive, fertileRoots, RCOUNT } from './dict';
import { VAL, LETTERS, FAM, famOf, LENB, TARGETS, BOSS_ROUNDS, DROPS, BURNS, LINE_MAX, LINE_CAPS, ZAWAID, COPIES, SEALS, BAG_CAP, NB_SLOTS, STARTERS, CHARS, TOOLS, COMBOS, ownedIds, AFFIX, AFFIX_IDS, SEATS, PATTERNS, patOf, RELICS, ROWMODS, BOSSES, ENCH, PATHS, pathLvl } from './data';

/* ================= STATE ================= */
let S=null, uid=1;
const rnd=n=>Math.floor(Math.random()*n);
const pick=a=>a[rnd(a.length)];
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const has=id=>S.relics.includes(id);
const chr=()=>CHARS.find(c=>c.id===S.charId)||CHARS[0];
const isChar=id=>S.charId===id;
const hasTool=id=>!!S.tools[id];
const nLines=()=>has('rabi')?4:3;
const bagCap=()=>99;   // the bag is roots + affixes now; its size is not the constraint
const nbSlots=()=>5+(has('mihbara')?2:0);   // your own roots live here, so it starts at four
/* الرِّحاب raises every ceiling; the caps themselves stay the reason rows differ. */
const sealsFor=()=>chr().seals+(has('ghirbal')?0:0);
/* ================= CARDS, ROOTS, ASSEMBLY =================
   A card is either an أصل (radical, k:'r') or a زيادة (affix, k:'a'). A row holds at most
   RADMAX radicals — that is the root — and any number of affixes hung in their seats.
   The word is assembled seat by seat: A0 + R0 + A1 + R1 + A2 + R2 + A3. */
const RADMAX=()=>has('rihab')?4:3;
const isRad=c=>c&&c.k==='r';
const afOf=c=>(c&&AFFIX[c.a])||{t:'',s:0,v:0,m:0,n:'',d:''};
const cardTxt=c=>!c?'':(c.k==='r'?c.ch:afOf(c).t);
const cardVal=c=>{ if(!c) return 0; let v=c.k==='r'?(VAL[c.ch]||1):afOf(c).v;
  if(c.ench==='gold') v*=3; if(c.ench==='seed'&&c.k==='r') v*=2; return v; };
/* Where an affix may sit. المُلحَق frees it from its printed seat — that is the relic's
   whole point, so it is the one place the seat is not read off the card. */
const seatOf=(c,want)=>has('mulhaq')&&want!=null?want:afOf(c).s;
/* Which seats a row has filled. Arabic hangs ONE زيادة per seat — كاتب has one ألف after the
   فاء, not three — and a truly unlimited row turned into affix soup that still read as "alive",
   because the liveness test only ever looked at the radicals. Four seats, one each: the row
   becomes a template you watch filling, and every زيادة is a real choice of where it goes. */
const seatsUsed=L=>new Set(L.filter(c=>c.k==='a').map(c=>seatOf(c,c.seat)));
const seatFree=(L,c,want)=>!!c&&!seatsUsed(L).has(seatOf(c,want));
/* Assemble the row into a word. Affixes keep insertion order inside a seat. */
function asmLine(L,extra=null,extraSeat=null){
  const rad=L.filter(isRad), aff=L.filter(c=>c.k==='a').map(c=>({c,s:seatOf(c,c.seat)}));
  if(extra){ if(isRad(extra)) rad.push(extra); else aff.push({c:extra,s:seatOf(extra,extraSeat)}); }
  const at=k=>aff.filter(a=>a.s===k).map(a=>cardTxt(a.c)).join('');
  let w=at(0);
  for(let i=0;i<rad.length;i++){ w+=rad[i].ch; w+=at(i+1); }
  if(rad.length<3) for(let k=rad.length+1;k<=3;k++) w+=at(k);   // seats past the root still show
  return w;
}
const radStr=L=>L.filter(isRad).map(c=>c.ch).join('');
const nRad=L=>L.filter(isRad).length;
/* القَلْب: any ORDER of these radicals that spells a real root counts. */
const perms=a=>a.length<=1?[a]:a.flatMap((x,i)=>perms([...a.slice(0,i),...a.slice(i+1)]).map(p=>[x,...p]));
function rootFound(L){
  const r=radStr(L);
  if(r.length<3) return null;
  if(isRoot(r)) return r;
  if(has('qalb')) for(const p of perms([...r])){ const q=p.join(''); if(isRoot(q)) return q; }
  return null;
}
/* Can these radicals still reach a real root? With القَلْب, any arrangement may. */
function radAlive(L){
  const r=radStr(L);
  if(!r) return true;
  if(rootAlive(r)) return true;
  if(has('qalb')) for(const p of perms([...r])) if(rootAlive(p.join(''))) return true;
  return false;
}

/* The round's pile: every card COPIES times, shuffled, and it never refills. This is the rack. */
/* TWO piles, and you choose which one to draw from. This is the fix for a real flaw: with
   one shuffled pile, every زيادة you bought thinned the أصول you need to close a root, so
   buying more cards made you weaker past four seats. Split them and the thinning is gone —
   and what replaces it is better than neutral, it is a decision. Every turn you pick between
   "advance the root" and "lengthen the word", with the randomness living inside each pile. */
/* أصول are a rack — every radical card falls COPIES times and the pile refills each round,
   because the root is a permanent part of who you are. زوائد are AMMUNITION: the affix pile
   is literally the cards you own, one entry each, and sealing a word SPENDS the زيادة out of
   your bag for good. Hussam: "affix cards, once bought, are unlimited — I expect that is
   wrong", and he is right; a permanent affix is an upgrade you buy once and forget, while a
   spent one asks the seal-budget question every time: is THIS word worth my «ال»? */
const freshPiles=()=>{
  const n=COPIES;
  const barren=S.boss&&S.boss.id==='barren';
  const rad=[], aff=[];
  for(const c of S.bag){
    if(c.k==='a'){
      if(barren||has('samt')) continue;                      // القحط / الصَّمت: no زوائد fall
      aff.push(c.id);
      if(has('nussakh')) aff.push(c.id);                     // النُّسّاخ: one more use of each, each round
    }
    else for(let i=0;i<n;i++) rad.push(c.id);
  }
  return {rad:shuffle(rad),aff:shuffle(aff)};
};
const pileOf=k=>k==='a'?S.affDraw:S.radDraw;
const pileLeft=()=>S.radDraw.length+S.affDraw.length+S.top.length;
/* Sealing strikes the word's own cards out of what is still to fall — Scrabble's "leave".
   A longer word scores more and costs you more of your own round.
   التَّضعيف spares the first affix in a row, so an affix build is not self-consuming. */
/* زوائد are COPIES, not consumables. You own N copies of «ال» and that is N uses PER ROUND —
   spend them and they are back next round; buy it again and you have two. Hussam's correction,
   and it is better than what I built: permanent consumption made the shop a re-buying treadmill,
   while copies keep the only question that matters — is THIS word worth my one «ال» this round?
   Using one simply means it has left the round's pile, which `advance` already handles; so the
   work here is putting a card BACK when something says it does not count. */
function refundAffixes(tiles,row){
  if(has('naht')){ S.gold=Math.max(0,S.gold-2); return; }   // النَّحت: nothing counts, the seal costs coin
  let spared=!has('tadeef');
  for(const c of tiles){
    if(c.k!=='a'||!c.id) continue;
    const free=c.ench==='watad'||S.rowMods[row]==='khizana';
    if(free||!spared){ if(!free) spared=true; S.affDraw.push(c.id); }   // back into this round's pile
  }
  if(S.affDraw.length) shuffle(S.affDraw);
}
function spendCards(tiles){
  let gone=0;
  /* المِقَصّ pays half the leave; a طَليق letter is never struck at all. */
  let budget=has('miqass')?Math.ceil(tiles.length/2):tiles.length;
  for(const t of tiles){
    if(budget<=0) break;
    if(t.ench==='free') continue;
    budget--;
    const pile=pileOf(t.k); const k=pile.findIndex(id=>id===t.id);
    if(k>=0){ pile.splice(k,1); gone++; }
  }
  return gone;
}
const nbOf=root=>root?S.notebook.find(n=>n.root===root):null;
const nbLetters=()=>{const s=new Set(); S.notebook.forEach(n=>[...n.root].forEach(c=>s.add(c))); return s;};

/* ================= PATHS (BUILDS) ================= */
const pathLevelOf=id=>pathLvl(PATHS.find(p=>p.id===id).progress(S,has));
/* A combo is "live" when every part is owned. `comboNear` is the shop's lever: the pairs
   you are exactly one piece away from, and what that missing piece is. */
function comboState(){
  const own=ownedIds(S), live=[], near=[];
  for(const c of COMBOS){
    const missing=c.parts.filter(x=>!own.has(x));
    if(!missing.length) live.push(c);
    else if(missing.length===1) near.push({c,need:missing[0]});
  }
  return {live,near};
}
const comboWants=()=>new Set(comboState().near.map(n=>n.need));
const pathStats=()=>PATHS.map(p=>({id:p.id,n:p.n,c:p.c,d:p.d,lvl:pathLevelOf(p.id)}));
const leadingPath=()=>{let best=null,bl=0; for(const p of PATHS){const lv=pathLevelOf(p.id); if(lv>bl){bl=lv;best=p.id;}} return best;};
function pathFeedback(id){
  if(!id) return;
  const p=PATHS.find(x=>x.id===id), lv=pathLevelOf(id);
  if(lv>0) setTimeout(()=>toast(`<b style="color:${p.c}">${p.n}</b> الآن م${lv}`),550);
}

/* The bag is four roots (three radical cards each) plus whatever زوائد you have collected.
   Twelve cards you can name — that is the point: you are not fishing in an alphabet. */
const bagFromRoots=(roots,aff)=>{
  const out=[];
  for(const r of roots) for(const ch of r) out.push({id:uid++,k:'r',ch,root:r,ench:null});
  for(const a of aff) out.push({id:uid++,k:'a',a,ench:null});
  return out;
};
function newRun(starter){
  const st=CHARS.find(x=>x.id===starter)||CHARS[0];
  const roots=[...st.roots];
  S={phase:'intro',round:1,gold:st.gold,roots,bag:bagFromRoots(roots,st.aff||[]),relics:[],tools:{},
     /* All four of your roots start in the notebook. Twelve radical cards throw up plenty of
     ACCIDENTAL roots — خ+ت+م from three different roots is a real word — and that is a nice
     discovery, but if an accident paid the same as your own root the four roots would be
     decoration. The notebook is what makes them yours: chips, multiplier, and they level. */
     charId:st.id,rowMods:[null,null,null,null],notebook:roots.map(r=>({root:r,lvl:1,xp:0})),patLv:{},permMult:0,
     seenRoots:{},seenPatterns:{},burnsMax:BURNS,dropsMax:DROPS,
     stats:{words:0,best:null,total:0,maxChain:0},mute:S?S.mute:false,starter:st.n};
  if(isChar('rahhal')){ const extra=fertileRoots(60).find(r=>!roots.includes(r));
    if(extra){ roots.push(extra); S.bag=bagFromRoots(roots,st.aff||[]); S.notebook.push({root:extra,lvl:1,xp:0}); } }
  comboSeen=new Set(); comboCheck();
  startRound();
}
function startRound(){
  const r=S.round;
  Object.assign(S,{target:TARGETS[r-1],score:0,drops:S.dropsMax,burns:S.burnsMax,
    lines:[[],[],[],[]],junk:[false,false,false,false],lock:[0,0,0,0],fixed:[0,0,0,0],chain:0,sealedSinceDrop:true,
    rootCounts:{},roundRoots:{},lastEnd:null,lastRoot:null,mirajN:0,ash:0,dropCount:0,log:[],top:[],held:null,freeSeal:isChar('warraq'),mamalUsed:false,
    radDraw:[],affDraw:[],sel:'r',curR:null,curA:null,nextR:null,nextA:null,seals:sealsFor(),boss:null,wazn:'thulathi',phase:'intro',shop:null,picker:null,nbOffer:null});
  if(BOSS_ROUNDS.includes(r)){
    const pool=r===3?['blind','termite','dry']:r===6?['rhyme','barren','rush']:Object.keys(BOSSES);
    S.boss={id:pick(pool)};
  }
  S.wazn=pickWazn();                       // only ever commission something your cards can build
  const piles=freshPiles(); S.radDraw=piles.rad; S.affDraw=piles.aff;
  S.drops=pileLeft();
  S.charges={}; for(const k of Object.keys(S.tools)) S.charges[k]=TOOLS[k].ch;   // tools recharge every round
  S.burns=BURNS+(has('ghirbal')?2:0); S.burnsMax=S.burns;
  /* القُرْعة: open on your best letter instead of whatever the shuffle gave you. */
  if(has('qura')&&S.radDraw.length){
    let bi=-1,bv=-1;
    for(let k=0;k<S.radDraw.length;k++){const c=S.bag.find(b=>b.id===S.radDraw[k]); const v=c?cardVal(c):0; if(v>bv){bv=v;bi=k;}}
    if(bi>=0){ S.top.push({...S.bag.find(b=>b.id===S.radDraw[bi])}); S.radDraw.splice(bi,1); }
  }
  S.curR=drawFrom('r'); S.nextR=drawFrom('r');
  S.curA=drawFrom('a'); S.nextA=drawFrom('a');
  S.sel=S.curR?'r':'a'; syncHand();
}
function drawFrom(kind){
  if(kind==='r'&&S.top.length) return S.top.shift();
  const pile=pileOf(kind==='a'?'a':'r');
  while(pile.length){
    const id=pile.pop(); const c=S.bag.find(b=>b.id===id);
    if(c) return {...c};
  }
  return null;
}
/* The card actually in play is whichever pile you have selected. Keeping S.cur in sync means
   drop/stateOf/scoring all keep working on "the card in hand" without knowing about piles. */
function syncHand(){
  if(S.sel==='a'&&!S.curA) S.sel='r';
  if(S.sel==='r'&&!S.curR&&S.curA) S.sel='a';
  S.cur=S.sel==='a'?S.curA:S.curR;
  S.next=S.sel==='a'?S.nextA:S.nextR;
}
/* الكَشْف — the زوائد stop being a queue and become a hand. You name the زيادة you want and
   it comes to the top, which turns "which وزن can I reach" from a draw into a decision. */
function pickAffix(a){
  if(S.phase!=='play'||!has('kashf')) return;
  const k=S.affDraw.findIndex(id=>{const c=S.bag.find(b=>b.id===id); return c&&c.a===a;});
  if(k<0){ toast('لم يبق من هذه الزيادة شيء'); return; }
  const id=S.affDraw.splice(k,1)[0];
  if(S.curA) S.affDraw.push(S.curA.id);
  S.curA={...S.bag.find(b=>b.id===id)};
  S.sel='a'; syncHand(); audio('drop'); render();
}
function selectPile(k){
  if(S.phase!=='play') return;
  if(k==='a'&&!S.curA){ toast('كومة الزوائد فارغة'); return; }
  if(k==='r'&&!S.curR){ toast('كومة الأصول فارغة'); return; }
  S.sel=k; syncHand(); render();
}
const lineStr=i=>asmLine(S.lines[i]);
const wordOK=w=>isWord(w);
/* الارتجال drops the dictionary: a real ROOT with anything hung on it is accepted, and paid
   half. This is the biggest rule a relic can rewrite here — the lexicon stops being the wall. */
const sealable=L=>nRad(L)>=3&&!!rootFound(L)&&(isWord(asmLine(L))||has('irtijal'));

/* Where the incoming card would go. A radical always appends (or prepends, with the start
   zone); an affix takes its printed seat unless المُلحَق frees it. */
function placed(i,card,atStart=false){
  const L=S.lines[i];
  if(isRad(card)) return atStart?[{...card},...L]:[...L,{...card}];
  return [...L,{...card,seat:atStart?0:null}];
}

const waznOf=id=>PATTERNS.find(p=>p.id===id)||PATTERNS[0];
/* Which أوزان your زوائد can actually reach.
   Hussam, after playing: "whether I can hit the wazn depends on which زوائد I happen to own,
   so am I buying an affix for the score, or on the CHANCE it fits a required وزن?" — and a
   commission you cannot build is not a goal, it is a lottery ticket. So the round commissions
   only what your cards can make. Round one, with no زوائد, commissions ثلاثي — the bare root,
   which is exactly what you can do — and every زيادة you buy visibly widens the pool it draws
   from. That is the answer to his question: you buy the affix to OPEN the أوزان. */
function reachableWazns(){
  const bySeat=[[],[],[],[]];
  for(const a of [...new Set(S.bag.filter(c=>c.k==='a').map(c=>c.a))] as string[]) bySeat[AFFIX[a].s].push(AFFIX[a].t);
  const sample=S.roots[0]||'كتب';
  const out=new Set(['thulathi']);                       // the bare root is always buildable
  for(const p0 of [null,...bySeat[0]]) for(const p1 of [null,...bySeat[1]])
  for(const p2 of [null,...bySeat[2]]) for(const p3 of [null,...bySeat[3]]){
    const w=(p0||'')+sample[0]+(p1||'')+sample[1]+(p2||'')+sample[2]+(p3||'');
    const core=hasAl(w)?w.slice(2):w;
    for(const p of PATTERNS) if(p.test(core)) out.add(p.id);
  }
  return [...out];
}
const pickWazn=()=>{ const r=reachableWazns(), rich=r.filter(id=>id!=='thulathi'); return pick(rich.length?rich:r); };
/* Which undrawn card would finish this row on the round's commissioned wazn. Recall becomes
   perception: the board remembers the pattern so the player does not have to. */
function waznHint(i){
  if(!S.wazn||S.junk[i]||S.lock[i]>0||!S.lines[i].length) return null;
  const seen=new Set();
  for(const id of [...S.radDraw,...S.affDraw]){
    const c=S.bag.find(b=>b.id===id);
    if(!c||seen.has(c.id)) continue;
    const key=c.k==='r'?'r'+c.ch:'a'+c.a;
    if(seen.has(key)) continue;
    seen.add(key);
    if(isRad(c)&&nRad(S.lines[i])>=RADMAX()) continue;
    const L2=placed(i,c,false);
    if(nRad(L2)<3||!rootFound(L2)) continue;
    const w=asmLine(L2);
    if(isWord(w)&&patOf(w)&&patOf(w).id===S.wazn) return cardTxt(c);
  }
  return null;
}

/* الطُّفَيْلي: the card that would have killed a row hops to the first row that will take it.
   Lost with the card rewrite — tufayli still called it, so owning the relic crashed the run. */
function parasiteTarget(from,card){
  const n=nLines();
  for(let k=1;k<n;k++){
    const j=(from+k)%n;
    if(S.junk[j]||S.lock[j]>0) continue;
    const st=stateOf(j,card,false);
    if(st==='word'||st==='alive') return j;
  }
  return null;
}

/* ================= ROW STATE =================
   A row seals when it holds a full root (three أصول, four with الرِّحاب) and the assembled
   word is real. It stays alive while its radicals can still reach a root. It refuses a
   radical once the root is full — but it still takes زوائد, which is the whole shape of the
   decision: the root closes, the word does not. */
function stateOf(i,card,atStart=false){
  if(S.junk[i]) return 'junk';
  if(S.lock[i]>0) return 'locked';
  if(!card) return 'alive';
  if(isRad(card)&&nRad(S.lines[i])>=RADMAX()) return 'full';
  if(!isRad(card)&&!seatFree(S.lines[i],card,atStart?0:null)) return 'seat';
  const L2=placed(i,card,atStart);
  if(sealable(L2)) return 'word';
  if(!radAlive(L2)) return 'dead';
  return 'alive';
}
function hintFor(i,card,atStart=false){
  if(!card) return null;
  const st=stateOf(i,card,atStart);
  if(st!=='dead') return st;
  if(S.rowMods[i]==='fort') return 'bounce';
  return has('qalam')?'junk':'dead';
}

/* ================= SCORING =================
   Chips come from the cards; the multiplier comes from what you BUILT — the root you found
   and the زوائد you hung on it. That is the whole thesis: a bare root is a small sure thing,
   and every affix is a bet that lengthens the word and shortens your pile. */
function scoreWord(tiles,s,row){
  const tags=[]; let chips=0, x=1;
  const rad=tiles.filter(isRad), aff=tiles.filter(c=>c.k==='a');
  const naff=aff.length, mod=S.rowMods[row];
  for(const c of tiles){
    let v=cardVal(c);
    chips+=v;
  }
  const len=s.length;
  chips+=LENB[Math.min(len,8)];
  if(S.ash){ chips+=S.ash; tags.push('رماد +'+S.ash); }

  let mult=1+Math.max(0,len-3);
  /* every زيادة is worth its own printed multiplier — this is where a long word pays */
  if(naff){
    let am=0; for(const c of aff) am+=afOf(c).m;
    mult+=am; tags.push(`${naff} زيادة +${fmt(am)}`);
  }
  /* الصَّرْف — stacking has to JUMP, not step. Measured with a flat per-affix multiplier,
     sealing a bare root scored as well as holding out for زوائد (2/6 runs reached round 6
     either way), which means the gamble was not a gamble. The whole point of a زيادة is that
     it is a bet: it lengthens the word, spends a card, and 29% of two-affix stacks are not
     words at all. So the second affix doubles, the third triples, the fourth is a run-maker. */
  const STACK=[1,1,2,3.5,6];
  if(naff>=2){ const b=STACK[Math.min(naff,4)]; x*=b; tags.push(`صَرْف ${naff} زوائد ×${fmt(b)}`); }
  if(has('sarfi')&&naff>=3){ x*=3; tags.push('الصَّرْفي ×٣'); }

  const p=mod==='minwal'?waznOf(S.wazn):patOf(s);
  if(p){ const lv=S.patLv[p.id]||1, com=p.id===S.wazn||mod==='minwal';
    const commission=com?(mod==='mizan'?3:2):1;
    const k=(has('wazzan')?2:1)*commission;
    chips+=Math.round(p.c*(1+.5*(lv-1)))*k; mult+=(p.m+lv-1)*k; tags.push('وزن '+p.n+(lv>1?' م'+lv:''));
    if(com) tags.push('طلب الجولة ×'+commission); }
  if(hasAl(s)){ mult+=1; tags.push('ال +١'); }

  /* the root is what the three أصول actually spell, not what the lexicon guesses */
  const root=rootFound(tiles)||rootOf(s);
  let nb=nbOf(root);
  if(!nb&&has('ablind')&&root){ nb={root,lvl:1,xp:0,blind:true}; tags.push('جذر أعمى'); }
  if(nb){ chips+=5*nb.lvl; mult+=nb.lvl; if(!nb.blind) tags.push('دفتر '+spaced(root)+' م'+nb.lvl); }
  if(tiles.some(c=>c.ench==='seed'&&isRad(c))){ mult+=1; tags.push('بَذْرة +١'); }

  if(S.permMult>0){ mult+=S.permMult; tags.push('دائم +'+fmt(S.permMult)); }
  if(root){const prev=S.rootCounts[root]||0; if(prev>0){x*=(1+prev); tags.push('رنين ×'+(1+prev));}}
  if(has('ishtiqaq')&&root&&S.roundRoots[root]){ x*=2; tags.push('اشتقاق ×٢'); }
  if(has('miraj')&&root&&root===S.lastRoot){ const m=2**Math.min(6,(S.mirajN||0)+1); x*=m; tags.push('مِعراج ×'+m); }
  if(has('samt')&&!naff){ x*=6; tags.push('الصَّمت ×٦'); }
  if(has('irtijal')&&!isWord(s)){ x*=.5; tags.push('ارتجال ×½'); }
  if(has('qalib')&&p&&p.id===S.wazn){ x*=5; tags.push('القالَب ×٥'); }
  if(isChar('hakim')&&len>=5){ x*=2; tags.push('الحكيم ×٢'); }

  const bagFlavor=tiles.some(c=>c.ench)||S.roots.length<=3, pctx={nb,p,naff,chain:S.chain,bagFlavor};
  for(const path of PATHS){
    const lv=pathLvl(path.progress(S,has));
    if(lv>0&&path.match(pctx)){ const b=.15*lv; x*=1+b; tags.push('مسار '+path.n+' م'+lv+' +'+Math.round(b*100)+'٪'); }
  }
  if(S.chain>0){const m=1+.5*S.chain; x*=m; tags.push('سلسلة ×'+fmt(m));}
  const glass=tiles.filter(c=>c.ench==='glass').length; if(glass){x*=2**glass; tags.push('زجاج ×'+(2**glass));}
  if(mod==='manbat'&&nb&&!nb.blind){x*=3;tags.push('مَنْبَت ×٣');}
  if(has('yatim')&&S.roots.length<=3){x*=3;tags.push('يتيم ×٣');}
  if(S.boss&&S.boss.id==='rhyme'&&S.lastEnd&&s[0]!==S.lastEnd){x*=.5;tags.push('بلا قافية ×½');}
  return {chips,mult:mult*x,score:Math.round(chips*mult*x),tags,root,pat:p?p.id:null,naff};
}
const fmt=n=>(+(+n).toFixed(2)).toString();

/* ================= ACTIONS ================= */
let fx={line:null,kind:null};
/* Is any action still open to the player? Every row can refuse a tile — locked rows do,
   and a full row does — so a board of full/locked rows with no burns left is a dead end
   the round can never leave on its own. Rather than freeze, end the round. */
function canAct(){
  if(S.burns>0) return true;
  /* BOTH face-up cards count, not just the selected one. The player can switch piles for
     free, so an affix whose seat is taken everywhere is not a dead end — it is a reason to
     take an أصل instead. Checking only S.cur ended rounds that had perfectly legal moves
     available on the other pile: measured, whole rounds scored 0 while the run held 22 affix
     cards. This guard was written when there was one card in hand. */
  const hand=[S.curR,S.curA].filter(Boolean);
  for(let i=0;i<nLines();i++){
    if(S.junk[i]) return true;                                  // junk takes the drop, and wipes for scrap
    if(S.seals>0&&sealable(S.lines[i])) return true;
    if(S.lock[i]>0) continue;
    for(const c of hand)
      if(isRad(c)?nRad(S.lines[i])<RADMAX():seatFree(S.lines[i],c,null)) return true;
  }
  return false;
}
function drop(i,atStart){
  if(S.phase!=='play'||i>=nLines()) return;
  if(S.aim&&aimTool(i)) return;
  if(!S.cur){ endOfDrops(); return; }   // pile dry: there is nothing to place, so close the round
  if(S.lock[i]>0){ toast('هذا السطر جافّ الآن'); return; }
  const card=S.cur;
  /* The root closes; the word does not. A full root refuses another أصل but still takes زوائد —
     that asymmetry is the whole shape of the decision. */
  if(!S.junk[i]&&isRad(card)&&nRad(S.lines[i])>=RADMAX()){ toast('اكتمل جذر هذا السطر — لا يقبل إلا زيادة'); return; }
  if(!S.junk[i]&&!isRad(card)&&!seatFree(S.lines[i],card,atStart?0:null)){ toast(`مقعد «${SEATS[seatOf(card,atStart?0:null)]}» مشغول في هذا السطر`); return; }
  audio('drop');
  if(!S.sealedSinceDrop) S.chain=0;
  S.sealedSinceDrop=false;
  if(S.junk[i]){ S.lines[i]=[...S.lines[i],card]; }
  else {
    const st=stateOf(i,card,atStart);
    if(st==='word'||st==='alive'){ S.lines[i]=placed(i,card,atStart); fx={line:i,kind:'drop'}; }
    else if(S.rowMods[i]==='fort'||S.lines[i].some(t=>t.ench==='anchor')){ fx={line:i,kind:'crack'}; floatAt(i,{bad:true,text:'ارتدّت البطاقة'}); }
    else if(has('tufayli') && parasiteTarget(i,card)!=null){ const j=parasiteTarget(i,card); S.lines[j]=placed(j,card,false); fx={line:j,kind:'drop'}; floatAt(j,{bad:true,text:'قفز الطفيلي'}); }
    else if(has('qalam')){ S.lines[i]=[...S.lines[i],card]; S.junk[i]=true; fx={line:i,kind:'crack'}; audio('crack');
      floatAt(i,{bad:true,text:'صار حشوًا'+rowLost(i,0)}); }
    else crack(i);
  }
  S.drops=Math.max(0,pileLeft()+(S.curR?1:0)+(S.curA?1:0)-1); S.dropCount++;
  for(let k=0;k<4;k++) if(S.lock[k]>0) S.lock[k]--;
  if(S.boss&&S.boss.id==='termite'&&S.dropCount%6===0) termite();
  advance(card);
  if((!S.curR&&!S.curA)||S.seals<=0) endOfDrops(); else render();
}
function termite(){
  let best=-1,bl=0; for(let k=0;k<nLines();k++){ if(!S.junk[k]&&S.lines[k].length>bl){bl=S.lines[k].length;best=k;} }
  if(best<0) return;
  const eaten=S.lines[best][0].ch; S.lines[best]=S.lines[best].slice(1);
  toast(`<b>الأرَضة</b> أكلت «${eaten}»`);
  if(!isAlive(lineStr(best))) crack(best);
}
/* A row can be lost three ways now — broken, turned to حشو by القلم، or bounced off حِصن.
   الرحى pays for the loss itself, not for one particular spelling of it, otherwise owning
   القلم silently switches الرحى off and the chain path recommends a pair that cancels. */
function rowLost(i,scrap){
  if(!has('raha')) return scrap?`، نشارة +${scrap}`:'';
  S.permMult+=.5;
  return '، الرحى +٠٫٥'+(scrap?` ونشارة +${scrap}`:'');
}
function crack(i){
  const scrap=S.lines[i].reduce((a,c)=>a+cardVal(c),0);
  S.score+=scrap;
  S.lines[i]=[]; S.chain=0; fx={line:i,kind:'crack'}; audio('crack');
  floatAt(i,{bad:true,text:'انكسر السطر'+rowLost(i,scrap)});
}
function advance(prev){
  const k=prev&&prev.k==='a'?'a':'r';
  if(prev&&prev.ench==='echo'){                                  // صَدى: the same card again
    if(k==='a') S.curA={...prev,id:null,ench:null}; else S.curR={...prev,id:null,ench:null};
  } else if(k==='a'){ S.curA=S.nextA; S.nextA=drawFrom('a'); }
  else { S.curR=S.nextR; S.nextR=drawFrom('r'); }
  /* الكَفّ: whatever you set aside comes back rather than being lost with the round */
  if(!S.curR&&!S.curA&&S.held){ if(S.held.k==='a') S.curA=S.held; else S.curR=S.held; S.held=null; }
  syncHand(); resetTimer();
}
function burn(){
  if(S.phase!=='play'||S.burns<=0) return;
  S.burns--;
  /* الرَّماد — burning was pure loss, so الغِربال (+2 burns) bought you nothing to do.
     Now what you burn is banked into the next seal, and the pair is a build. */
  if(has('ramad')&&S.cur) S.ash=(S.ash||0)+(VAL[S.cur.ch]||1)*3;
  audio('burn'); advance(null); render();
}
function twinSwap(){ if(S.phase!=='play'||!has('tawam')||has('rabi')) return; [S.cur,S.next]=[S.next,S.cur]; audio('drop'); render(); }

/* ================= الأدوات — TOOLS =================
   A relic fires on its own; a tool fires when you spend a charge. Charges reset every
   round, so a tool is a budget you manage inside the round rather than a permanent edge.
   Some act on the letter in your hand, some act on a row — `needsRow` says which, and
   the row-takers arm a target picker instead of firing immediately. */
const ROW_TOOLS={shave:1,flip:1,wipe:1,unhook:1};
function useTool(id){
  if(S.phase!=='play'||!hasTool(id)) return;
  if((S.charges[id]||0)<=0){ toast('لا شحنة في '+TOOLS[id].n); return; }
  const use=TOOLS[id].use;
  if(ROW_TOOLS[use]){ S.aim=S.aim===id?null:id; render(); return; }   // pick a row next
  if(!S.cur) return;
  if(use==='fam'){
    const f=isRad(S.cur)?famOf(S.cur.ch):null;
    if(!isRad(S.cur)||!f){ toast('النقطة للأصول ذات عائلة النقط فقط'); return; }
    S.cur={...S.cur,ch:f[(f.indexOf(S.cur.ch)+1)%f.length]};
  }
  else if(use==='hamza'){ if(S.cur.ch==='ء'){ toast('هو همزة بالفعل'); return; } S.cur={...S.cur,ch:'ء'}; }
  else if(use==='vowel'){ if(!isRad(S.cur)){toast('المدّة للأصول فقط');return;} const V=['ا','و','ي']; const i=V.indexOf(S.cur.ch); S.cur={...S.cur,ch:V[(i+1)%3]}; }
  else if(use==='redraw'){
    const k=S.cur.k==='a'?'a':'r', t=drawFrom(k);
    if(!t){ toast('هذه الكومة فارغة'); return; }
    pileOf(k).unshift(S.cur.id);
    if(k==='a') S.curA=t; else S.curR=t;
    syncHand();
  }
  else if(use==='hold'){
    if(S.held){ const h=S.held; S.held=S.cur; S.cur=h; }
    else { S.held=S.cur; advance(null); }
  }
  S.charges[id]--; audio('drop'); render();
}
/* row-targeted tools resolve here, once the player names the row */
function aimTool(i){
  const id=S.aim; if(!id) return false;
  const use=TOOLS[id].use, L=S.lines[i];
  if(use==='shave'){ if(!L.length){ toast('السطر فارغ'); return true; } S.lines[i]=L.slice(0,-1); }
  else if(use==='flip'){
    const rad=L.filter(isRad); if(rad.length<2){ toast('لا أصول تُقلب'); return true; }
    const rev=[...rad].reverse(); let k=0;
    S.lines[i]=L.map(c=>isRad(c)?rev[k++]:c);
  }
  else if(use==='unhook'){
    const k=[...L].reverse().findIndex(c=>c.k==='a');
    if(k<0){ toast('لا زيادة في هذا السطر'); return true; }
    const at=L.length-1-k; const c=L[at];
    S.lines[i]=[...L.slice(0,at),...L.slice(at+1)]; pileOf('a').push(c.id);
  }
  else if(use==='wipe'){ if(!L.length){ toast('السطر فارغ'); return true; } S.lines[i]=[]; S.junk[i]=false; }
  S.charges[id]--; S.aim=null; audio('seal',0); render(); return true;
}
function seal(i,auto){
  if(S.phase!=='play') return;
  const tiles=S.lines[i]; if(!tiles.length) return;
  const s=asmLine(tiles);
  /* Wiping junk is scrap, not a word — it costs no seal. The guard used to sit above this,
     so once your five seals were gone the «امسح» button still rendered but did nothing. */
  if(S.junk[i]){
    const sc=3*tiles.length; S.score+=sc; S.lines[i]=[]; S.junk[i]=false; fx={line:i,kind:'sealed'};
    floatAt(i,{score:sc,eq:'حشو: ٣ × '+tiles.length,tags:[]}); audio('seal',0);
    return afterSeal(auto);
  }
  if(S.seals<=0){ toast('لم يبق لك ختم في هذه الجولة'); return; }
  if(!sealable(tiles)) return;
  if(has('qalib')&&patOf(s)?.id!==S.wazn){ toast(`القالَب لا يختم إلا على وزن ${waznOf(S.wazn).n}`); return; }
  const r=scoreWord(tiles,s,i);
  S.score+=r.score; S.stats.words++; S.stats.total+=r.score;
  if(!S.stats.best||r.score>S.stats.best.score) S.stats.best={w:displayOf(s),score:r.score};
  if(r.root){
    if(has('shajara')&&!S.seenRoots[r.root]&&!S.roots.includes(r.root)&&S.roots.length<8) adoptRoot(r.root);
    S.rootCounts[r.root]=(S.rootCounts[r.root]||0)+1; S.roundRoots[r.root]=(S.roundRoots[r.root]||0)+1; S.seenRoots[r.root]=1;
    const nb=nbOf(r.root);
    if(nb){ nb.xp+=has('mihbara')?2:1; if(nb.xp>=3){nb.xp-=3; nb.lvl++; setTimeout(()=>toast(`ارتقى الجذر <b>${spaced(nb.root)}</b> إلى المستوى ${nb.lvl}`),700);} }
  }
  if(has('jami')&&r.pat&&!S.seenPatterns[r.pat]){ S.seenPatterns[r.pat]=1; S.permMult+=.5; setTimeout(()=>toast('جامع الأوزان: أول كلمة على وزن جديد · +٠٫٥ مضاعف دائم'),650); }
  if(has('miraj')){ S.mirajN=(r.root&&r.root===S.lastRoot)?Math.min(6,(S.mirajN||0)+1):0; }
  S.lastRoot=r.root||null;
  S.chain++; S.stats.maxChain=Math.max(S.stats.maxChain||0,S.chain); S.sealedSinceDrop=true; S.lastEnd=s[s.length-1];
  if(S.rowMods[i]==='gold') S.gold+=3;
  if(isChar('tajir')&&r.naff){ S.gold+=r.naff; floatAt(i,{good:true,text:`التاجر +${r.naff} دينار`}); }
  tiles.filter(t=>t.ench==='glass'&&t.id).forEach(t=>{S.bag=S.bag.filter(b=>b.id!==t.id);});
  const gone=spendCards(tiles); refundAffixes(tiles,i);
  /* Three ways a seal can come back: the copyist's first one is free, المِداد refunds a
     word that answered the round's commission, and the money-changer buys more. */
  if(S.rowMods[i]==='mamal'&&!S.mamalUsed){ S.mamalUsed=true; floatAt(i,{good:true,text:'المَعْمَل: ختم مجّاني'}); }
  else if(S.freeSeal){ S.freeSeal=false; floatAt(i,{good:true,text:'ختم الوَرّاق: مجّانًا'}); }
  else if(has('midad')&&r.pat===S.wazn){ floatAt(i,{good:true,text:'المِداد: رُدَّ الختم'}); }
  else S.seals--;
  S.ash=0;
  if(has('misann')) for(const k of Object.keys(S.tools)) S.charges[k]=Math.min(TOOLS[k].ch,(S.charges[k]||0)+1);
  S.drops=pileLeft()+(S.curR?1:0)+(S.curA?1:0);
  if(gone) floatAt(i,{bad:true,text:`أُنفق ${gone} من حروف الجولة`});
  /* التَّصريف — the root stays in its row and only the زوائد are spent, so one جذر can be
     conjugated again and again: كتب ← كاتب ← مكتوب ← كتاب. The most run-changing relic in
     the pool, and the most Arabic thing the game does. */
  S.lines[i]=(has('tasrif')||S.rowMods[i]==='rahim')?tiles.filter(isRad).map(c=>({...c})):[];
  fx={line:i,kind:'sealed'};
  if(S.rowMods[i]==='echo') S.lines[i]=[{id:null,ch:s[s.length-1],ench:null}];
  if(S.boss&&S.boss.id==='dry') S.lock[i]=1;
  S.log.unshift({w:displayOf(s),sc:r.score}); S.log=S.log.slice(0,6);
  floatAt(i,{score:r.score,eq:r.chips+' × '+fmt(r.mult),tags:r.tags});
  audio('seal',S.chain); try{navigator.vibrate&&navigator.vibrate(18)}catch(e){}
  if(has('khayt')) for(let k=0;k<nLines();k++){ if(k!==i&&!S.junk[k]&&sealable(S.lines[k])){ seal(k,true); if(S.phase!=='play') return; } }
  afterSeal(auto);
}
function afterSeal(auto){
  if(S.seals<=0&&S.phase==='play'){ S.phase='ending'; setTimeout(()=>{ if(S.score>=S.target){S.phase='won'; render(); setTimeout(winRound,700);} else {S.phase='over'; audio('lose'); render();} },600); render(); return; }
  if(!auto) render();
}
function endOfDrops(){
  S.phase='ending'; render();
  const n=nLines(); let k=0;
  const step=()=>{
    if(S.phase!=='ending') return;
    while(k<n&&!(S.seals>0&&!S.junk[k]&&sealable(S.lines[k]))) k++;
    if(k<n){ S.phase='play'; seal(k,true); if(S.phase==='play') S.phase='ending'; render(); k++; setTimeout(step,450); return; }
    if(S.score>=S.target){S.phase='won'; render(); setTimeout(winRound,700);} else { S.phase='over'; audio('lose'); render(); }
  };
  setTimeout(step,350);
}
function winRound(){
  const boss=!!S.boss;
  const base=5+(boss?3:0), over=Math.max(0,Math.min(10,Math.floor((S.score/S.target-1)*9))), interest=Math.min(5,Math.floor(S.gold/5));
  S.earn={base,over,interest,total:base+over+interest};
  S.gold+=S.earn.total; audio('win');
  if(S.round>=TARGETS.length){ S.phase='victory'; render(); return; }
  const cands=(Object.entries(S.roundRoots) as [string,number][]).filter(([r])=>!nbOf(r)).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([r,c])=>({root:r,count:c}));
  S.nbOffer=cands.length?cands:null; S.nbReplace=null;
  S.phase='roundwon'; render();
}
/* A root written into the notebook must put its أصول in the bag too — Hussam, after playing,
   and he is right: a notebook root whose cards you can never draw is a bonus on a word you
   can never spell again. The notebook and the bag are one thing. */
function adoptRoot(root){
  if(S.roots.includes(root)) return;
  S.roots.push(root);
  for(const ch of root) S.bag.push({id:uid++,k:'r',ch,root,ench:null});
  setTimeout(()=>toast(`دخلت أصول <b>${spaced(root)}</b> كيسك`),520);
}
function writeRoot(root){
  if(S.notebook.length<nbSlots()){ S.notebook.push({root,lvl:1,xp:0}); adoptRoot(root); S.nbOffer=null; audio('seal',2); pathFeedback('root'); openShop(); }
  else { S.nbReplace=root; render(); }
}
function replaceRoot(idx){
  const gone=S.notebook[idx].root;
  S.notebook[idx]={root:S.nbReplace,lvl:1,xp:0};
  adoptRoot(S.nbReplace);
  /* and the replaced root leaves the bag with it, or the bag only ever grows */
  S.roots=S.roots.filter(r=>r!==gone);
  S.bag=S.bag.filter(c=>!(c.k==='r'&&c.root===gone));
  S.nbReplace=null; S.nbOffer=null; audio('seal',2); pathFeedback('root'); openShop();
}

/* ================= SHOP ================= */
function openShop(){ S.phase='shop'; S.shop={offers:genOffers(),reroll:2,removed:false,lead:leadingPath()}; render(); }
function genOffers(){
  /* The shop was eight equal text rows — a list, not a choice. Three things fix that, and
     none of them is more content: FEWER offers so each one weighs something, a RARITY tier so
     a relic can be an event rather than a line item, and a rotating middle so no two shops
     read the same. Anything that completes a combo you are one piece from is pulled to the
     front of its pool; the leading path is the weaker tiebreak behind it. */
  const lead=leadingPath();
  const wants=comboWants();
  const front=(arr,tag)=>{const w=arr.filter(x=>wants.has(tag+':'+x)), r=arr.filter(x=>!wants.has(tag+':'+x)); shuffle(w); shuffle(r); return [...w,...r];};
  const o:any[]=[];

  /* زوائد — the progression itself, so always two and always cheap */
  const apool=front(AFFIX_IDS,'affix');
  o.push({k:'affix',id:apool[0],cost:2});
  if(apool[1]) o.push({k:'affix',id:apool[1],cost:2});

  /* ONE relic, and it is the shop's event. From round 3 it can come up نادر: dearer, and it
     reads as a find rather than a line. */
  const pool=Object.keys(RELICS).filter(r=>!S.relics.includes(r));
  const matched=pool.filter(r=>RELICS[r].path===lead), other=pool.filter(r=>RELICS[r].path!==lead);
  shuffle(matched); shuffle(other);
  const rpool=front(lead?[...matched,...other]:shuffle(pool),'relic');
  /* The rare tier IS the run-changers (`rare` in RELICS), not a random price bump. From round
     2 one of them can surface: dearer, gold-framed, and it rewrites a rule rather than adding
     a number — التَّصريف leaves the root standing, الصَّمت bans زوائد and pays ×6 for bare roots,
     القالَب will only seal the round's وزن and pays ×5 for it. */
  if(rpool.length){
    const breakers=rpool.filter(r=>RELICS[r].rare), plain=rpool.filter(r=>!RELICS[r].rare);
    const wantRare=S.round>=2&&breakers.length&&Math.random()<.45;
    const id=wantRare?breakers[0]:(plain[0]||rpool[0]);
    o.push({k:'relic',id,cost:RELICS[id].rare?10:6,path:RELICS[id].path,rare:!!RELICS[id].rare});
  }

  /* two of the three run-shaping slots, rotated — the shop is never the same shop twice */
  const slot:any[]=[];
  const tpool=front(Object.keys(TOOLS).filter(t=>!S.tools[t]),'tool');
  if(tpool.length) slot.push({k:'tool',id:tpool[0],cost:5});
  const rid=front(Object.keys(ROWMODS),'row')[0];
  slot.push({k:'row',id:rid,cost:4,path:ROWMODS[rid].path});
  slot.push({k:'ench',id:front(Object.keys(ENCH),'mark')[0],cost:4,path:'bag'});
  shuffle(slot); o.push(...slot.slice(0,2));

  /* a root you can adopt — its three أصول join your bag, so it is a bag decision now */
  const rootPool=fertileRoots(60).filter(r=>!S.roots.includes(r));
  if(rootPool.length&&(S.round>=2||has('khamis'))) o.push({k:'root',id:pick(rootPool.slice(0,60)),cost:7});

  /* one cheap level-up, so there is always something affordable, and a patup only on a
     وزن you can actually build */
  const reach=reachableWazns().filter(x=>x!=='thulathi');
  if(S.notebook.length&&(lead==='root'||!reach.length||Math.random()<.5)) o.push({k:'nbup',root:pick(S.notebook).root,cost:3,path:'root'});
  else if(reach.length) o.push({k:'patup',id:pick(reach),cost:3,path:'pattern'});
  return o;
}


function buy(idx){
  const o=S.shop.offers[idx]; if(!o||o.sold||S.gold<o.cost) return;
  if(o.k==='relic'){ if(S.relics.length>=5){toast('معك ٥ طلاسم، وهذا الحد');return;} S.relics.push(o.id); pay(o); pathFeedback(o.path); }
  else if(o.k==='nbup'){ const nb=nbOf(o.root); if(nb) nb.lvl++; pay(o); pathFeedback('root'); }
  else if(o.k==='patup'){ S.patLv[o.id]=(S.patLv[o.id]||1)+1; pay(o); pathFeedback('pattern'); }
  else if(o.k==='ench') S.picker={mode:'ench',ench:o.id,idx};
  else if(o.k==='affix'){
    /* ONE copy per purchase — buying the same زيادة twice is exactly how you get two uses in
       a round, which is the whole shape of the decision. */
    S.bag.push({id:uid++,k:'a',a:o.id,ench:null});
    const n=S.bag.filter(c=>c.k==='a'&&c.a===o.id).length;
    pay(o); pathFeedback('pattern');
    toast(`<b>${AFFIX[o.id].n} «${AFFIX[o.id].t}»</b> — ${n} ${n>1?'نسخ':'نسخة'} في الجولة · ${AFFIX[o.id].d}`);
  }
  else if(o.k==='root'){ adoptRoot(o.id); if(S.notebook.length<nbSlots()) S.notebook.push({root:o.id,lvl:1,xp:0}); pay(o); pathFeedback('root'); }
  else if(o.k==='row') S.picker={mode:'row',mod:o.id,idx};
  else if(o.k==='tool'){ S.tools[o.id]=1; S.charges[o.id]=TOOLS[o.id].ch; pay(o); toast(`<b>${TOOLS[o.id].n}</b> — ${TOOLS[o.id].d}`); }
  audio('drop'); comboCheck(); render();
}
function pay(o){S.gold-=o.cost;o.sold=true;}
/* Announce a combo the moment it closes — Balatro's lesson is that the player has to be
   told WHY the number moved, or the synergy may as well not exist. */
let comboSeen=new Set();
function comboCheck(){
  for(const c of comboState().live) if(!comboSeen.has(c.n)){
    comboSeen.add(c.n);
    setTimeout(()=>toast(`<b>⁂ ${c.n}</b><br>${c.d}`),450);
  }
}
function pickTile(id){
  const p=S.picker; const o=p.idx!=null?S.shop.offers[p.idx]:null;
  const t=S.bag.find(b=>b.id===id); if(!t) return;
  if(p.mode==='ench'){ t.ench=p.ench; pay(o); pathFeedback('bag'); }
  else if(p.mode==='remove'){ if(S.bag.length<=6){toast('لا يقل كيسك عن ٦ بطاقات');return;} S.bag=S.bag.filter(b=>b.id!==id); S.gold-=2; S.shop.removed=true; }
  S.picker=null; audio('seal',1); comboCheck(); render();
}

function pickRow(r){ const o=S.shop.offers[S.picker.idx]; S.rowMods[r]=S.picker.mod; pay(o); S.picker=null; audio('seal',1); pathFeedback(o.path); comboCheck(); render(); }
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
function tileHTML(c,cls=''){
  if(!c) return `<div class="tile ${cls} hidden">؟</div>`;
  if(c.k==='a'){
    const a=afOf(c);
    return `<div class="tile card-aff ${cls} ${c.ench?'e-'+c.ench:''}" title="${a.n}">${a.t}<span class="seat">${SEATS[a.s]}</span><span class="val">${cardVal(c)}</span></div>`;
  }
  const mine=S&&S.roots&&S.roots.includes(c.root)?' own':'';
  const nbd=S&&S.notebook&&nbOf(c.root)?'<span class="nbdot"></span>':'';
  return `<div class="tile card-rad${mine} ${cls} ${c.ench?'e-'+c.ench:''}">${c.ch}<span class="val">${cardVal(c)}</span>${nbd}</div>`;
}
const HINTLAB={word:'كلمة تامّة',alive:'الجذر حيّ',dead:'لا جذر بعدها',full:'اكتمل الجذر',seat:'المقعد مشغول',junk:'حشو',locked:'جافّ',bounce:'سيرتد',jump:'سيقفز'};
function render(){
  if(!S) return;
  /* No card in hand means the pile is dry; no legal move means the board refuses what is in
     hand. Either way the round is over — guarding this on S.cur alone let a dry pile sit
     forever, because with nothing in hand the check was skipped rather than triggered. */
  if(S.phase==='play'&&((!S.curR&&!S.curA)||!canAct())){ endOfDrops(); return; }
  if(!S.bag){ app.innerHTML=''; renderOverlay(); return; }
  const n=nLines();
  const hideNext=has('rabi')||(S.boss&&S.boss.id==='blind');
  const pct=Math.min(100,S.score/S.target*100);
  const chainM=1+.5*S.chain;
  const lead=leadingPath(), leadP=lead?PATHS.find(p=>p.id===lead):null;
  let h=`<div class="head">
    <span class="rnd">جولة <b>${S.round}</b> من <b>${TARGETS.length}</b>${S.boss?` <span class="boss">${BOSSES[S.boss.id].n}</span>`:''}</span>
    <span class="tally"><b class="now">${S.score}</b><span class="track"><i style="width:${pct}%"></i></span><span class="goal">${S.target}</span></span>
    <span class="purse"><b class="seals">${S.seals}</b> ختم &nbsp; ${pileLeft()} بطاقة &nbsp; <b>${S.gold}</b> د</span>
  </div>
  <div class="commission">طلب هذه الجولة <b>${waznOf(S.wazn).n}</b><span>يدفع ضعفين</span></div>
  <div class="lines">`;
  for(let i=0;i<n;i++){
    const L=S.lines[i], s=asmLine(L), junk=S.junk[i];
    const hint=S.phase==='play'?hintFor(i,S.cur,false):null;
    const ok=!junk&&sealable(L)&&(!has('qalib')||patOf(s)?.id===S.wazn);
    const fxc=fx.line===i?(fx.kind==='crack'?'cracked':fx.kind==='sealed'?'sealed':''):'';
    let rootl='';
    if(ok){ const r=rootOf(s), p=patOf(s), nb=nbOf(r), c=r?S.rootCounts[r]||0:0;
      const bits=[]; if(r) bits.push(`<span class="${nb?'nbk':''}">${spaced(r)}${nb?' من الدفتر':''}</span>`); if(c) bits.push(`رنين <b>×${c+1}</b>`); if(p) bits.push('وزن '+p.n);
      rootl=bits.length?`<div class="rootlab">${bits.map(b=>`<span>${b}</span>`).join('')}</div>`:''; }
    let sealBtn='';
    if(ok&&S.seals>0){const p=scoreWord(L,s,i); sealBtn=`<button class="seal" data-seal="${i}">ختم<small>+${p.score}</small><small class="cost">−${L.length} بطاقة</small></button>`;}
    else if(junk&&L.length) sealBtn=`<button class="seal junkseal" data-seal="${i}">امسح<small>+${3*s.length}</small></button>`;
    const mod=S.rowMods[i];
    const endHint=S.phase==='play'&&!junk&&S.lock[i]<=0?stateOf(i,S.cur,false):null;
    const sh=S.phase==='play'&&!junk&&S.lock[i]<=0&&isRad(S.cur)?stateOf(i,S.cur,true):null;
    const startHint=sh&&sh!==endHint?sh:null;
    const wh=S.phase==='play'?waznHint(i):null;
    h+=`<div class="line ${hint?'h-'+hint:''} ${junk?'junk':''} ${S.lock[i]>0?'locked':''} ${fxc}" data-line="${i}" tabindex="0" role="button" aria-label="السطر ${i+1}">
      ${startHint?`<div class="startzone" data-start="${i}"></div>`:''}
      <div class="tags"><span style="display:flex;gap:6px"><span class="hintlab">${HINTLAB[hint]||''}</span>${startHint?`<span class="hintlab zs z-${startHint}">الأول: ${HINTLAB[startHint]||''}</span>`:''}${wh?`<span class="waznhint">+${wh} ← ${waznOf(S.wazn).n}</span>`:''}</span><span style="display:flex;gap:6px">${mod?`<span class="modlab" data-mod="${mod}">${ROWMODS[mod].n}</span>`:''}<span class="cap">${nRad(L)}/${RADMAX()} أصول${L.filter(c=>c.k==='a').length?` · ${L.filter(c=>c.k==='a').length} زيادة`:''}</span></span></div>
      <div class="lm"><div class="word ${ok?'ok':''} ${junk?'junk':''}">${(ok||junk||L.some(c=>c.k==='a'))&&s?(ok?displayOf(s):s):''}</div>
      ${rootl}
      <div class="slots">${(()=>{const rad=L.filter(isRad),used=L.filter(c=>c.k==='a');
        const at=k=>used.filter(c=>seatOf(c,c.seat)===k).map(c=>`<span class="aff">${afOf(c).t}</span>`).join('');
        let h=at(0);
        for(let k=0;k<RADMAX();k++){ const r=rad[k]; h+=`<span class="slot ${r?'has':''}">${r?r.ch:'·'}</span>`+at(k+1); }
        return h;})()}</div></div>
      ${sealBtn}</div>`;
  }
  h+=`</div>
  <div class="hand two">
    <button class="burn" data-act="burn" ${S.burns<=0||S.phase!=='play'?'disabled':''}>احرق<small>${S.burns} متبقية</small></button>
    <div class="piles">
      <button class="pilecard ${S.sel==='r'?'on':''}" data-sel="r" ${S.curR?'':'disabled'}>
        ${tileHTML(S.curR,'big')}
        <span class="plabel">أصول · ${S.radDraw.length+S.top.length}</span>
        ${hideNext?'':`<span class="pnext">${tileHTML(S.nextR,'small')}</span>`}
      </button>
      <button class="pilecard ${S.sel==='a'?'on':''}" data-sel="a" ${S.curA?'':'disabled'}>
        ${has('kashf')?'<span class="kashfmark">كَشْف</span>':''}
        ${tileHTML(S.curA,'big')}
        <span class="plabel ${S.affDraw.length<=1?'low':''}">زوائد · ${S.affDraw.length} هذه الجولة</span>
        ${hideNext?'':`<span class="pnext">${tileHTML(S.nextA,'small')}</span>`}
      </button>
    </div>
    <div class="handnote">
      ${S.cur&&S.cur.k==='a'?`<b>${afOf(S.cur).n}</b> · ${SEATS[afOf(S.cur).s]}`:S.cur?`أصل — يُكمل الجذر`:'—'}
      ${S.boss&&S.boss.id==='rush'?'<div class="timer"><i style="width:100%"></i></div>':''}
      ${S.held?`<button class="heldbtn" data-tool="kaff">في الكَفّ: ${cardTxt(S.held)}</button>`:''}
    </div>
  </div>
  ${has('kashf')&&S.affDraw.length?`<div class="kashf">${
    ([...new Set(S.affDraw.map(id=>{const c=S.bag.find(b=>b.id===id); return c&&c.a;}).filter(Boolean))] as string[])
      .map(a=>`<button class="kcard ${S.curA&&S.curA.a===a?'on':''}" data-kashf="${a}">${AFFIX[a].t}<small>${SEATS[AFFIX[a].s]}</small></button>`).join('')
  }</div>`:''}
  ${Object.keys(S.tools).length?`<div class="tools">${Object.keys(S.tools).map(t=>{
    const c=S.charges[t]||0, armed=S.aim===t;
    return `<button class="tool ${armed?'armed':''}" data-tool="${t}" ${c<=0||S.phase!=='play'?'disabled':''}>${TOOLS[t].n}<small>${c}</small></button>`;
  }).join('')}${S.aim?'<span class="aimlab">اختر السطر…</span>':''}</div>`:''}
  <div class="foot">
    ${S.roots.map(r=>{const nb=nbOf(r); return `<span class="nb ${nb?'lit':''}">${spaced(r)}${nb?`<small>م${nb.lvl}</small>`:''}</span>`;}).join('')}
    ${leadP?`<button class="pathchip lead" data-path="${leadP.id}" style="--pc:${leadP.c}">مسار ${leadP.n}<b>م${pathLevelOf(lead)}</b></button>`:''}
    ${S.relics.map(r=>`<button class="relic" data-relic="${r}">${RELICS[r].n}</button>`).join('')}
    ${comboState().live.map(c=>`<button class="combo" data-combo="${c.n}">⁂ ${c.n}</button>`).join('')}
    ${S.chain>0?`<span class="chain ${S.chain>=2?'hot':''}">سلسلة ${S.chain} ×${fmt(chainM)}</span>`:''}
    ${S.boss&&S.boss.id==='rhyme'&&S.lastEnd?`<span class="bossnote">ابدأ بـ«${S.lastEnd}»</span>`:''}
    <button class="linkbtn" data-act="book">الأوزان والكيس</button>
  </div>`;
  app.innerHTML=h; fx={line:null,kind:null};
  renderOverlay();
}
/* The bag holds two card kinds, so it cannot be sorted as one list: an affix card has no
   `.ch` at all, and sorting on it crashed the bag screen the moment you owned one — which is
   from round one. Radicals group by their root, affixes follow in seat order. */
function bagGrid(clickable){
  const rad=S.bag.filter(isRad).sort((a,b)=>
    S.roots.indexOf(a.root)-S.roots.indexOf(b.root) || (a.ch||'').localeCompare(b.ch||'','ar'));
  const aff=S.bag.filter(c=>c.k==='a').sort((a,b)=>afOf(a).s-afOf(b).s);
  const cell=c=>clickable?`<button data-pick="${c.id}">${tileHTML(c)}</button>`:tileHTML(c);
  return `<div class="baggrid">${rad.map(cell).join('')}</div>`
    +(aff.length?`<div class="baggrid affrow">${aff.map(cell).join('')}</div>`:'');
}
function renderOverlay(){
  let o='';
  const P=S.phase;
  if(P==='title'){
    let best=0; try{best=+localStorage.getItem('harf-best')||0}catch(e){}
    o=`<div class="card"><h1>حرف بحرف</h1>
      <p class="sub">أربعة جذور، تعرفها عن ظهر قلب. تسقط بطاقاتها واحدة تلو الأخرى، وأنت تختار السطر.</p>
      <ul class="rules">
        <li><span class="ic t">ج</span><span><b>ثلاثة أصول تصنع جذرًا</b>: السطر يقبل ثلاث بطاقات أصول لا أكثر — ك·ت·ب — فإذا اكتمل الجذر صار كلمة.</span></li>
        <li><span class="ic v">ز</span><span><b>والزوائد تبني الوزن عليه</b>: «ال» و«ا» و«ون» تُعلَّق على الجذر في مقاعدها، والسطر يقبل منها ما لا يُحدّ. كتب ← كاتب ← الكاتبون.</span></li>
        <li><span class="ic g">خ</span><span>عندما تتمّ الكلمة يظهر <b>الختم</b>. اختم الآن، أو علّق زيادة أخرى لكلمة أطول وأغلى — إن كانت كلمة أصلًا.</span></li>
        <li><span class="ic">ك</span><span><b>كيسك هو بناؤك</b>: من المتجر تشتري الزوائد التي تصنع أوزانك، والجذور التي تتقنها.</span></li>
      </ul>
      <button class="btn" data-act="starters">ابدأ الرحلة</button>
      ${best?`<p class="sub">أفضل رحلة: ${best} نقطة</p>`:''}</div>`;
  } else if(P==='starters'){
    o=`<div class="card wide"><h2>مَن تكون؟</h2><div class="choice chars">${CHARS.map(c=>`<button data-starter="${c.id}"><b>${c.n}</b><span class="rule">${c.d}</span><span class="roots">${c.roots.map(r=>spaced(r)).join('  ·  ')}</span><span class="why">${c.w}</span><span class="stat">${c.seals} أختام · ${c.gold} دينار${(c.aff||[]).length?' · يبدأ بـ '+c.aff.map(a=>'«'+AFFIX[a].t+'»').join(' '):''}</span></button>`).join('')}</div></div>`;
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
    if(p&&p.mode==='row'){
      o=`<div class="card"><h2>انقش «${ROWMODS[p.mod].n}» على سطر</h2><p class="sub">${ROWMODS[p.mod].d} يحل محل أي نقش سابق.</p>
        <div class="rowpick">${Array.from({length:nLines()},(_,r)=>`<button data-row="${r}">السطر ${r+1}${S.rowMods[r]?' · الآن: '+ROWMODS[S.rowMods[r]].n:' · بلا نقش'}</button>`).join('')}</div>
        <button class="btn ghost" data-act="cancelpick">رجوع</button></div>`;
    } else if(p){
      const title=p.mode==='ench'?`اختر بطاقة تصير ${ENCH[p.ench].n}`:'اختر بطاقة تحذفها من كيسك';
      o=`<div class="card"><h2>${title}</h2>${p.mode==='ench'?`<p class="sub">${ENCH[p.ench].d}</p>`:''}${bagGrid(true)}<button class="btn ghost" data-act="cancelpick">رجوع</button></div>`;
    } else {
      o=`<div class="card"><h2>السوق</h2><p class="goldline">${S.gold} دينار</p>
        <div class="shopgrid">${sh.offers.map((x,i)=>offerHTML(x,i)).join('')}</div>
        <div class="shoprow">
          <button class="btn ghost" data-act="remove" ${S.gold<2||sh.removed?'disabled':''}>احذف بطاقة · ٢</button>
          <button class="btn ghost" data-act="reroll" ${S.gold<sh.reroll?'disabled':''}>عروض جديدة · ${sh.reroll}</button>
          <button class="btn ghost" data-act="book">الكيس والأوزان</button>
        </div>
        <button class="btn" data-act="next">الجولة ${S.round+1}</button></div>`;
    }
  } else if(P==='book'){
    const lead=leadingPath();
    o=`<div class="card"><h2>كيسك · ${S.bag.length} بطاقة</h2>${bagGrid(false)}
      <h3>الدفتر</h3><div class="kv">${S.notebook.map(x=>`<div><span>${spaced(x.root)}</span><b>م${x.lvl} · +${5*x.lvl} نقاط +${x.lvl} مضاعف</b></div>`).join('')}</div>
      <h3>الأوزان</h3><div class="pat">${PATTERNS.map(p=>{const lv=S.patLv[p.id]||1; return `<div><b>${p.n}</b>م${lv} · +${Math.round(p.c*(1+.5*(lv-1)))} نقاط +${p.m+lv-1} مضاعف</div>`;}).join('')}</div>
      <h3>جذورك</h3><div class="pat">${S.roots.map(r=>`<div><b>${spaced(r)}</b>${nbOf(r)?'في دفترك · م'+nbOf(r).lvl:'ثلاث بطاقات أصول'}</div>`).join('')}</div>
      <h3>زوائدك</h3><div class="pat">${S.bag.filter(c=>c.k==='a').length?([...new Set(S.bag.filter(c=>c.k==='a').map(c=>c.a))] as string[]).map(a=>`<div><b>${AFFIX[a].t}</b>${AFFIX[a].n} · ${SEATS[AFFIX[a].s]}</div>`).join(''):'<div><b>—</b>لا زوائد بعد: اشترِ واحدة من المتجر</div>'}</div>
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
  if(x.k==='relic'){kind=x.rare?'طلسم نادر':'طلسم';nm=RELICS[x.id].n;ds=RELICS[x.id].d;cls='k-relic'+(x.rare?' rare':'');}
  else if(x.k==='ench'){kind='نقش حرف';nm='حرف '+ENCH[x.id].n;ds=ENCH[x.id].d+' تختار الحرف من كيسك.';}
  else if(x.k==='tool'){kind='أداة';nm=TOOLS[x.id].n;ds=TOOLS[x.id].d+` · ${TOOLS[x.id].ch} شحنات تتجدد كل جولة.`;}
  else if(x.k==='affix'){const a=AFFIX[x.id];kind='زيادة';nm=a.n+' «'+a.t+'»';ds=a.d+` · تُوضع ${SEATS[a.s]}.`;cls='k-aff';}
  else if(x.k==='root'){kind='جذر';nm=spaced(x.id);ds='جذر خامس في كيسك: ثلاث بطاقات أصول جديدة.';cls='k-root';}
  else if(x.k==='row'){kind='نقش سطر';nm='سطر '+ROWMODS[x.id].n;ds=ROWMODS[x.id].d;cls='k-row';}
  else if(x.k==='nbup'){kind='حبر';nm='ارفع جذر '+spaced(x.root);ds='+١ مستوى لهذا الجذر في دفترك.';cls='k-up';}
  else {const p=PATTERNS.find(q=>q.id===x.id);kind='ميزان';nm='ارفع وزن '+p.n;ds=`+١ مستوى: نقاط ومضاعف أعلى لكل كلمة على وزن ${p.n}.`;cls='k-up';}
  const path=x.path?PATHS.find(p=>p.id===x.path):null;
  const serves=path&&S.shop&&x.path===S.shop.lead;
  const pathTag=path?`<span class="pathtag" style="--pc:${path.c}">${path.n}${serves?' ✓ يخدم مسارك':''}</span>`:'';
  /* If this offer is the missing half of a combo, say so by name. A synergy the player
     cannot see is a coincidence, and coincidences do not make builds. */
  const tag={relic:'relic',tool:'tool',row:'row',ench:'mark'}[x.k];
  const fin=tag?comboState().near.find(n=>n.need===tag+':'+x.id):null;
  const comboTag=fin?`<span class="combotag">يُكمل: ${fin.c.n}</span>`:'';
  return `<button class="offer ${cls} ${serves?'serves':''} ${fin?'completes':''} ${x.sold?'sold':''}" data-buy="${i}" ${S.gold<x.cost?'disabled':''}>
    <span class="kind">${kind}</span><span class="nm">${nm}</span><span class="ds">${ds}</span>${comboTag}${pathTag}<span class="pr">${x.sold?'بيع':x.cost+' دينار'}</span></button>`;
}
function saveBest(){ try{const b=+localStorage.getItem('harf-best')||0; if(S.stats.total>b) localStorage.setItem('harf-best',S.stats.total);}catch(e){} }

function floatAt(i,d){
  const el=document.querySelector(`.line[data-line="${i}"]`);
  const r=el?el.getBoundingClientRect():{left:innerWidth/2,width:0,top:innerHeight/2};
  const f=document.createElement('div'); f.className='float'+(d.bad?' bad':'')+(d.good?' good':'');
  f.style.left=(r.left+r.width/2)+'px'; f.style.top=(r.top-6)+'px';
  /* A float is either a score (chips × mult, with its tags) or a plain line of text. Keying
     that off `bad` meant any good news without a score fell into the score branch and died
     on d.tags — so key it off whether there IS a score. */
  f.innerHTML=d.text!=null
    ? `<div class="sc">${d.text}</div>`
    : `<div class="sc">+${d.score}</div><div class="eq">${d.eq}</div><div class="tg">${(d.tags||[]).map(t=>`<span>${t}</span>`).join('')}</div>`;
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
  const b=e.target.closest('[data-seal],[data-act],[data-buy],[data-pick],[data-relic],[data-mod],[data-start],[data-line],[data-starter],[data-write],[data-replace],[data-row],[data-path],[data-tool],[data-char],[data-combo],[data-sel],[data-kashf]');
  if(!b||!S) return;
  const D=b.dataset;
  if(D.seal!=null) return seal(+D.seal);
  if(D.buy!=null) return buy(+D.buy);
  if(D.pick!=null) return pickTile(+D.pick);
  if(D.row!=null) return pickRow(+D.row);
  if(D.starter) { newRun(D.starter); return render(); }
  if(D.tooltip){ const t=TOOLS[D.tooltip]; return toast(`<b>${t.n}</b> — ${t.d}`); }
  if(D.write) return writeRoot(D.write);
  if(D.replace!=null) return replaceRoot(+D.replace);
  if(D.relic){ const r=RELICS[D.relic]; return toast(`<b>${r.n}</b> — ${r.d}`); }
  if(D.kashf) return pickAffix(D.kashf);
  if(D.sel) return selectPile(D.sel);
  if(D.tool) return useTool(D.tool);
  if(D.combo){ const c=COMBOS.find(x=>x.n===D.combo); return toast(`<b>⁂ ${c.n}</b> — ${c.d}`); }
  if(D.char){ const c=CHARS.find(x=>x.id===D.char); return toast(`<b>${c.n}</b> — ${c.d}`); }
  if(D.mod){ const m=ROWMODS[D.mod]; return toast(`<b>سطر ${m.n}</b> — ${m.d}`); }
  if(D.path){ const p=PATHS.find(x=>x.id===D.path), lv=pathLevelOf(D.path); return toast(`<b style="color:${p.c}">${p.n}</b>${lv>0?' · م'+lv:''} — ${p.d}`); }
  if(D.start!=null) return drop(+D.start,true);
  if(D.line!=null) return drop(+D.line,false);
  const a=D.act;
  if(a==='starters'){ S.phase='starters'; render(); }
  else if(a==='go'){ S.phase='play'; resetTimer(); render(); }
  else if(a==='burn') burn();
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
/* A test hook, behind ?dev=1 only. Granting a relic is otherwise a whole run of shopping,
   which made it impossible to check that a rule-changing relic actually changes its rule —
   the first attempt "verified" eight of them without granting a single one. */
if(location.search.includes('dev=1')) (window as any).__dev={
  grant:(...ids)=>{ for(const id of ids) if(RELICS[id]&&!S.relics.includes(id)) S.relics.push(id); render(); },
  give:(a,n=1)=>{ for(let i=0;i<n;i++) S.bag.push({id:uid++,k:'a',a,ench:null});
    /* rebuild the round's piles, or a card given mid-round is invisible until the next one —
       which made the first copies test read "زوائد · 0" and nearly sent me hunting a bug */
    const pl=freshPiles(); S.radDraw=pl.rad; S.affDraw=pl.aff; S.curA=drawFrom('a'); S.nextA=drawFrom('a'); syncHand(); render(); },
  row:(i,mod)=>{ S.rowMods[i]=mod; render(); },
  mark:(i,e)=>{ if(S.bag[i]) S.bag[i].ench=e; render(); },
  state:()=>S,
};
loadDict().then(()=>{
  if(window.claude?.hot?.snapshot) window.claude.hot.snapshot(()=>({state:S}));
  window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
}).catch(err=>{ ovl.innerHTML=`<div class="ov"><div class="card"><h2>تعذّر تحميل القاموس</h2><p class="sub">يحتاج المتصفح إلى دعم DecompressionStream (سفاري ١٦٫٤ فأحدث، كروم ٨٠ فأحدث).</p></div></div>`; console.error(err); });
