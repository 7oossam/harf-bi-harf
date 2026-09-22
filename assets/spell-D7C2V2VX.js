import{l as E,R as m,n as L,D as I,i as w,c as R,s as $,d as b,r as j}from"./dict-1hrGjRXc.js";const c={كسر:{n:"كَسْر",d:"ضرر مباشر",kind:"dmg"},حرق:{n:"حَرْق",d:"لهب يأكل العدو كل دور",kind:"burn"},شفي:{n:"شِفاء",d:"يرد إليك العافية",kind:"heal"},حمي:{n:"حِماية",d:"درع يصد الضربة القادمة",kind:"shield"},سرق:{n:"سَرِقة",d:"تأخذ من عمره وتضيفه لعمرك",kind:"drain"},جمع:{n:"جَمْع",d:"تجمع حروفًا جديدة إلى يدك",kind:"draw"}},v=Object.keys(c),P=[{id:"mafuul",n:"مفعول",x:2,d:"اسم المفعول — يقع على عدوك كاملًا",test:n=>n.length===5&&n[0]==="م"&&n[3]==="و"},{id:"istifaal",n:"استفعال",x:3,d:"الاستفعال — طلبٌ عظيم، أقوى ما يكون",test:n=>n.length===7&&n.startsWith("است")},{id:"tafiil",n:"تفعيل",x:2,d:"التفعيل — تُضاعف أثر الجذر",test:n=>n.length===5&&n[0]==="ت"&&n[3]==="ي"},{id:"faail",n:"فاعِل",x:1.5,d:"اسم الفاعل — أنت من يفعل",test:n=>n.length===4&&n[1]==="ا"}],p=n=>P.find(s=>s.test(n))||null,r=[..."كسرحرقشفيحميسرقجمعكسرحرقشفيحميسرقجمعاالمتنوي"],x=10;let t=null;const f=n=>Math.floor(Math.random()*n),u={};function A(n,s){const e={};for(const i of s)e[i]=(e[i]||0)+1;for(const i of n){if(!e[i])return!1;e[i]--}return!0}const B=(n,s)=>{let e=0;for(const i of n)i===s[e]&&e++;return e===s.length},g=n=>(u[n]||[]).filter(s=>A(s,t.hand)).sort((s,e)=>(p(e)?e.length*p(e).x:e.length)-(p(s)?s.length*p(s).x:s.length))[0]||null,D=()=>v.filter(n=>g(n));function k(){t={hp:40,maxHp:40,shield:0,foe:{n:"العِفريت",hp:70,maxHp:70,burn:0,intent:0},hand:Array.from({length:x},()=>r[f(r.length)]),word:[],turn:1,log:[],over:null},M()}const M=()=>{t.foe.intent=6+f(6)},H=()=>t.word.map(n=>t.hand[n]).join("");function O(){const n=H();if(n.length<2||!w(n))return null;const s=j(n),e=p(n),i=s&&c[s]?c[s]:null,o=n.length*2,a=Math.round(o*(e?e.x:1));return{s:n,root:s,shape:e,spell:i,power:a}}function T(){const n=O();if(!n||t.over)return;const s=t.foe;let e=`<b>${b(n.s)}</b> `;if(n.spell)switch(e+=`— ${n.spell.n}`,n.shape&&(e+=` على وزن ${n.shape.n}`),n.spell.kind){case"dmg":s.hp-=n.power,e+=` · ${n.power} ضررًا`;break;case"burn":s.burn+=Math.ceil(n.power/3),e+=` · لهب ${Math.ceil(n.power/3)}`;break;case"heal":t.hp=Math.min(t.maxHp,t.hp+n.power),e+=` · ${n.power} عافية`;break;case"shield":t.shield+=n.power,e+=` · درع ${n.power}`;break;case"drain":{const o=Math.ceil(n.power/2);s.hp-=o,t.hp=Math.min(t.maxHp,t.hp+o),e+=` · ${o} سرقة`;break}case"draw":{const o=Math.ceil(n.power/4);for(let a=0;a<o;a++)t.hand.push(r[f(r.length)]);e+=` · ${o} حروف`;break}}else s.hp-=n.power,e+=`— ضربة عادية · ${n.power} ضررًا`;t.log.unshift(e),t.log=t.log.slice(0,5);const i=[...t.word].sort((o,a)=>a-o);for(const o of i)t.hand.splice(o,1);for(t.word=[];t.hand.length<x;)t.hand.push(r[f(r.length)]);W()}function W(){const n=t.foe;if(n.burn>0&&(n.hp-=n.burn,t.log.unshift(`اللهب يأكل <b>${n.burn}</b>`),n.burn--),n.hp<=0)return t.over="win",l();const s=Math.max(0,n.intent-t.shield);if(t.shield=Math.max(0,t.shield-n.intent),t.hp-=s,t.log.unshift(`<b>${n.n}</b> يضرب ${s}${s<n.intent?" (صدّ الدرع الباقي)":""}`),t.log=t.log.slice(0,5),t.hp<=0)return t.over="lose",l();t.turn++,M(),l()}const C=document.getElementById("app");function l(){const n=O(),s=H(),e=s.length>=2&&R(s),i=D(),o=t.foe;C.innerHTML=`
  <div class="foe">
    <div class="foename">${o.n}<span>${o.hp} / ${o.maxHp}</span></div>
    <div class="hpbar"><i style="width:${Math.max(0,o.hp/o.maxHp*100)}%"></i></div>
    <div class="intent">ينوي أن يضربك بـ <b>${o.intent}</b>${o.burn?` · محترق ${o.burn}`:""}</div>
  </div>

  <div class="spells">${v.map(a=>{const d=i.includes(a),h=d?g(a):null;return`<button class="spell ${d?"ok":""}" data-info="${a}">
      <b>${$(a)}</b><span>${c[a].n}</span>
      <small>${h?b(h):c[a].d}</small></button>`}).join("")}</div>

  <div class="castbox">
    <div class="cast ${n?"good":e?"live":s?"dead":""}">${s?n?b(s):s:'<span class="ph">اختر حروفًا</span>'}</div>
    <div class="readout">${n?`${n.spell?`<b>${n.spell.n}</b> من جذر ${$(n.root)}`:`جذر ${n.root?$(n.root):"—"} · لا تعويذة فيه`}
         ${n.shape?`<span class="shape">وزن ${n.shape.n} ×${n.shape.x}</span>`:""}
         <span class="pw">قوة ${n.power}</span>`:e?"كلمة لم تكتمل بعد":s?"ليست كلمة":"الجذر يقرر الأثر، والوزن يقرر كيف يقع"}</div>
    <div class="acts">
      <button class="btn" data-act="cast" ${n?"":"disabled"}>اقرأ التعويذة</button>
      <button class="btn ghost" data-act="clear" ${s?"":"disabled"}>امسح</button>
    </div>
  </div>

  <div class="hand">${t.hand.map((a,d)=>`<button class="tile ${t.word.includes(d)?"used":""}" data-tile="${d}">${a}</button>`).join("")}</div>

  <div class="me">
    <span>عافيتك <b>${Math.max(0,t.hp)}</b> / ${t.maxHp}</span>
    ${t.shield?`<span class="sh">درع ${t.shield}</span>`:""}
    <span class="turn">الدور ${t.turn}</span>
  </div>
  <div class="log">${t.log.map(a=>`<div>${a}</div>`).join("")}</div>
  ${t.over?`<div class="ov"><div class="card">
      <h2>${t.over==="win"?"انكسرت الرقية":"سقطت"}</h2>
      <p>${t.over==="win"?"هزمت العفريت بالكلام وحده.":"العفريت أقوى هذه المرة."}</p>
      <button class="btn" data-act="again">من جديد</button></div></div>`:""}`}document.addEventListener("click",n=>{const s=n.target.closest("[data-tile],[data-act],[data-info]");if(!s||!t)return;const e=s.dataset;if(e.tile!=null){const i=+e.tile;return t.word.includes(i)?t.word=t.word.filter(o=>o!==i):t.word.push(i),l()}if(e.info){const i=g(e.info);if(!i)return;const o=[...t.hand],a=[];for(const d of i){const h=o.findIndex((S,y)=>S===d&&!a.includes(y));h>=0&&a.push(h)}return t.word=a,l()}if(e.act==="cast")return T();if(e.act==="clear")return t.word=[],l();if(e.act==="again")return k(),l()});E("../dict.bin").then(()=>{for(let n=0;n<m.length;n++){const s=m[n];if(s&&c[s]){const e=L(I[n]);e.length>=3&&e.length<=8&&B(e,s)&&(u[s]=u[s]||[]).push(e)}}for(const n of v)w(n)&&(u[n]=u[n]||[]).unshift(n);document.getElementById("boot").remove(),k(),l()}).catch(n=>{document.getElementById("boot").textContent="تعذّر تحميل القاموس",console.error(n)});
