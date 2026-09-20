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
}
export function lb(s){let lo=0,hi=SORTED.length;while(lo<hi){const m=(lo+hi)>>1;if(SORTED[m]<s)lo=m+1;else hi=m;}return lo;}
export const isAlive=s=>{ if(!s) return true; const k=lb(s); return k<SORTED.length && SORTED[k].startsWith(s); };
export const isWord=s=>s.length>=2 && IDX.has(s);
export const hasAl=s=>s.startsWith('ال') && s.length>=4 && IDX.has(s.slice(2));
export const displayOf=s=>IDX.has(s)?DISP[IDX.get(s)]:s;
export const rootOf=s=>{ if(IDX.has(s)){const r=ROOTS[IDX.get(s)]; if(r) return r;} return hasAl(s)?ROOTS[IDX.get(s.slice(2))]:null; };
export const spaced=r=>[...r].join('·');
