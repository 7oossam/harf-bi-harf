/* dictionary: load, normalize, look up. See CLAUDE.md for how the data file is built. */
export const norm = w => w.replace(/[ً-ْـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/[ؤئ]/g,'ء');
export const IDX=new Map(); export const DISP=[], ROOTS=[]; export let SORTED=[];
export async function loadDict(url='dict.bin'){
  const res=await fetch(url);
  if(!res.ok) throw new Error('dictionary fetch failed: '+res.status);
  const stream=res.body.pipeThrough(new DecompressionStream('gzip'));
  const txt=await new Response(stream).text();
  for(const line of txt.split('\n')){
    const sp=line.indexOf(' '); const orig=sp<0?line:line.slice(0,sp); const r=sp<0?null:norm(line.slice(sp+1));
    const n=norm(orig); if(IDX.has(n)) continue;
    IDX.set(n,DISP.length); DISP.push(orig); ROOTS.push(r);
  }
  SORTED=[...IDX.keys()];
  for(let i=1;i<SORTED.length;i++){ if(SORTED[i-1]>SORTED[i]){ SORTED.sort(); break; } }
  buildRootIndex();
}

/* ================= ROOTS AS PLAYABLE OBJECTS =================
   The card game is built on trilateral roots, so a root is no longer a scoring lookup —
   it is the thing the player assembles. Three indexes come out of ROOTS[]:
     ROOTSET   — every root the lexicon knows, for "are these three letters a root?"
     RPREFIX   — every prefix of every root, for "can these letters still become one?"
     RCOUNT    — how many word forms each root produces, which is how productive it is */
export const ROOTSET=new Set(), RPREFIX=new Set(), RCOUNT=new Map();
function buildRootIndex(){
  for(const r of ROOTS){
    if(!r||r.length!==3) continue;              // trilateral only: that is the game's unit
    RCOUNT.set(r,(RCOUNT.get(r)||0)+1);
  }
  for(const r of RCOUNT.keys()){
    ROOTSET.add(r);
    for(let i=1;i<=r.length;i++) RPREFIX.add(r.slice(0,i));
  }
}
export const isRoot=s=>ROOTSET.has(s);
/* can this partial sequence of radicals still reach a real root? */
export const rootAlive=s=>!s||RPREFIX.has(s);
/* Roots worth building a run around: productive ones, and no ء/ة which do not behave as
   radicals in the patterns the game builds. Sorted by how many forms they yield. */
export function fertileRoots(min=25){
  const out=[];
  for(const [r,c] of RCOUNT) if(c>=min && !/[ءة]/.test(r) && new Set(r).size===3) out.push([r,c]);
  out.sort((a,b)=>b[1]-a[1]);
  return out.map(x=>x[0]);
}
export function lb(s){let lo=0,hi=SORTED.length;while(lo<hi){const m=(lo+hi)>>1;if(SORTED[m]<s)lo=m+1;else hi=m;}return lo;}
export const isAlive=s=>{ if(!s) return true; const k=lb(s); return k<SORTED.length && SORTED[k].startsWith(s); };
export const isWord=s=>s.length>=2 && IDX.has(s);
export const hasAl=s=>s.startsWith('ال') && s.length>=4 && IDX.has(s.slice(2));
export const displayOf=s=>IDX.has(s)?DISP[IDX.get(s)]:s;
export const rootOf=s=>{ if(IDX.has(s)){const r=ROOTS[IDX.get(s)]; if(r) return r;} return hasAl(s)?ROOTS[IDX.get(s.slice(2))]:null; };
export const spaced=r=>[...r].join('·');
