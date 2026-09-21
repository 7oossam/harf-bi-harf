import { hasAl } from './dict';

/* ================= LETTERS & RULES ================= */
export const VAL={ا:1,ل:1,م:1,ن:1,ر:1,و:1,ي:1,ت:1,ب:1,ع:1,ه:1,ة:1,س:1,د:2,ك:2,ف:2,ق:2,ح:2,ج:2,ش:2,ص:3,خ:3,ز:3,ط:3,ء:3,ض:4,غ:4,ث:4,ذ:4,ظ:5};
export const LETTERS=Object.keys(VAL);
export const FAM=[['ب','ت','ث','ن','ي'],['ج','ح','خ'],['د','ذ'],['ر','ز'],['س','ش'],['ص','ض'],['ط','ظ'],['ع','غ'],['ف','ق'],['ه','ة']];
export const famOf=ch=>FAM.find(f=>f.includes(ch));
export const LENB=[0,0,2,10,20,35,55,80,110];
export const TARGETS=[300,450,700,1000,1500,2200,3200,4500];
export const BOSS_ROUNDS=[3,6,8];
export const DROPS=20, BURNS=3, LINE_MAX=8, BAG_CAP=10, NB_SLOTS=3;
/* Each row has its own ceiling, so "which row?" is a real choice from the first drop:
   the short row takes quick words, the long row is where you commit to a big one. */
export const LINE_CAPS=[4,6,8,6];

/* حروف الزيادة — the ten letters Arabic uses to build a وزن onto a root (سألتمونيها,
   normalised: أ folds into ا). These are the toolkit letters; everything else carries
   meaning as a radical. The game does not invent properties for letters — the language
   already assigned them, and this is the one that decides what a letter is *for*. */
export const ZAWAID=new Set([...'سالتمونيه']);
/* Seal a root this many times and its radicals take root in your bag: they start falling
   more often, so what you spell reshapes what you draw. That feedback is the build. */
export const ROOT_AT=3;

export const STARTERS=[
  {id:'katib',n:'كيس الكاتب',letters:'المكتبونير',root:'كتب',d:'متوازن، كثير الكلمات القصيرة.'},
  {id:'hakim',n:'كيس الحكيم',letters:'الحكمتيسرب',root:'حكم',d:'حروف أثقل قليلًا، وأوزان مثل حاكم وحكيم.'},
  {id:'alim',n:'كيس العالِم',letters:'العمرسدنةي',root:'علم',d:'فيه التاء المربوطة: فعالة ومفعلة في المتناول.'},
];
export const PATTERNS=[
  {id:'faail',n:'فاعِل',test:s=>s.length===4&&s[1]==='ا',c:15,m:2},
  {id:'faiil',n:'فعيل',test:s=>s.length===4&&s[2]==='ي',c:15,m:2},
  {id:'fauul',n:'فعول',test:s=>s.length===4&&s[2]==='و',c:15,m:2},
  {id:'mafal',n:'مَفعَل',test:s=>s.length===4&&s[0]==='م',c:15,m:2},
  {id:'mafuul',n:'مفعول',test:s=>s.length===5&&s[0]==='م'&&s[3]==='و',c:25,m:3},
  {id:'tafiil',n:'تفعيل',test:s=>s.length===5&&s[0]==='ت'&&s[3]==='ي',c:25,m:3},
  {id:'fiaala',n:'فِعالة',test:s=>s.length===5&&s[2]==='ا'&&s[4]==='ة',c:25,m:3},
  {id:'mafala',n:'مَفعَلة',test:s=>s.length===5&&s[0]==='م'&&s[4]==='ة',c:25,m:3},
  {id:'iftiaal',n:'افتعال',test:s=>s.length===6&&s[0]==='ا'&&s[2]==='ت'&&s[4]==='ا',c:40,m:4},
  {id:'istifaal',n:'استفعال',test:s=>s.length===7&&s.startsWith('است')&&s[5]==='ا',c:60,m:5},
  {id:'thulathi',n:'ثلاثي',test:s=>s.length===3,c:5,m:1},
];
export const patOf=s=>{const core=hasAl(s)?s.slice(2):s; return PATTERNS.find(p=>p.test(core))||null;};

export const RELICS={
  muarrib:{n:'المُعرِّب',d:'اضغط الجزء الأيمن من السطر لتضع الحرف في أول الكلمة بدل آخرها.'},
  nasikh:{n:'الناسخ',path:'bag',d:'بعد كل ختم، تُنسخ أغلى حروف الكلمة إلى كيسك (يتسع الكيس حتى ١٣).'},
  eater:{n:'آكل الحروف',path:'bag',d:'ختم كلمة من ٥ أحرف فأكثر يلتهم أحد حروفها من كيسك نهائيًا، ويمنحك +١ مضاعف دائم.'},
  mill:{n:'حجر الرحى',d:'كل سطر ينكسر يمنحك +٠٫٥ مضاعف دائم طوال الرحلة.'},
  ring:{n:'الخاتم',path:'bag',d:'حروف الكلمة المختومة تعود إلى أعلى كومة السحب، فتسقط عليك من جديد.'},
  twin:{n:'التوأم',d:'اضغط الحرف التالي لتبادله بالحرف الحالي، في أي وقت.'},
  parasite:{n:'الطفيلي',d:'الحرف الذي كان سيكسر سطرًا يقفز إلى أول سطر آخر يقبله.'},
  reader:{n:'القارئ',d:'+٠٫٢٥ مضاعف لكل جذر مختلف ختمته في هذه الرحلة.'},
  wazzan:{n:'الوزّان',path:'pattern',d:'مكافأة الوزن تُحسب مرتين.'},
  inkwell:{n:'المحبرة',path:'root',d:'خانة رابعة في الدفتر، وجذور الدفتر تكسب الخبرة مضاعفة.'},
  orphan:{n:'اليتيم',path:'bag',d:'إذا كان في كيسك ٧ حروف أو أقل: كل كلمة ×٣.'},
  pen:{n:'القلم المكسور',path:'chain',d:'السطور لا تنكسر. السطر الميت يصير حشوًا تمسحه مقابل ٣ نقاط لكل حرف.'},
  thread:{n:'خيط الحبر',path:'chain',d:'ختم كلمة يختم تلقائيًا كل سطر آخر فيه كلمة مكتملة.'},
  fourth:{n:'السطر الرابع',d:'سطر رابع، لكنك لا ترى الحرف التالي.'},
  dot:{n:'النقطة الشاردة',d:'اضغط زر النقطة لتحوّل الحرف داخل عائلته: ب ← ت ← ث ← ن ← ي… ٣ مرات في الجولة.'},
  collector:{n:'جامع الأوزان',path:'pattern',d:'أول كلمة تختمها على كل وزن مختلف هذه الرحلة: +٠٫٥ مضاعف دائم.'},
  ember:{n:'جمر السلسلة',path:'chain',d:'سلسلتك لا تنطفئ دفعة واحدة: تنقص حرفًا واحدًا فقط كل مرة لا تختم فيها بين إسقاطتين.'},
};
export const ROWMODS={
  double:{n:'مضاعف',d:'كل كلمة تُختم في هذا السطر ×٢.'},
  gold:{n:'ذهب',path:'bag',d:'+٢ دينار عن كل ختم في هذا السطر.'},
  short:{n:'قِصار',d:'الكلمات من حرفين أو ثلاثة هنا ×٣.'},
  long:{n:'طِوال',d:'الكلمات من ٥ أحرف فأكثر هنا ×٣.'},
  echo:{n:'صدى',path:'chain',d:'بعد الختم يحتفظ السطر بآخر حرف من الكلمة ليبدأ به.'},
  fort:{n:'حِصن',path:'chain',d:'السطر لا ينكسر: الحرف الذي يقتله يرتد ويضيع وحده.'},
};
export const BOSSES={
  blind:{n:'الكاتب الأعمى',d:'لا ترى الحرف التالي.'},
  termite:{n:'الأرَضة',d:'كل ٤ إسقاطات تأكل أول حرف من أطول سطر. إن صار السطر بلا كلمة ممكنة ينكسر.'},
  dry:{n:'الحبر الجاف',d:'السطر الذي تختم فيه يجف ولا يقبل حروفًا لإسقاطتين.'},
  rhyme:{n:'القافية',d:'كل كلمة يجب أن تبدأ بآخر حرف من الكلمة السابقة، وإلا فنصف النقاط.'},
  weight:{n:'الثِّقل',d:'كل سطر يبدأ الجولة وفيه حرف غريب لا يمكن إزالته إلا بالختم.'},
  rush:{n:'المستعجل',d:'٥ ثوانٍ لكل حرف، وإلا احترق وضاعت إسقاطته.'},
};
export const ENCH={
  gold:{n:'ذهبي',d:'نقاط هذا الحرف ×٣.'},
  glass:{n:'زجاجي',d:'الكلمة ×٢، ثم ينكسر ويخرج من كيسك.'},
  ink:{n:'حبر',d:'يتحول تلقائيًا إلى أنسب حرف من عائلته (ب ت ث ن ي…).'},
  echo:{n:'صدى',d:'عند إسقاطه تأتيك نسخة منه فورًا.'},
};

/* ================= PATHS (BUILDS) =================
   Four recognizable strategies, each measured from what the player already owns
   (no separate pick-a-build screen). Each gives a *multiplicative* bonus on the
   words that match it, stacking with resonance/chain/row-mods rather than just
   adding into the flat mult — this is what makes committing to one feel worth it. */
export const PATHS=[
  {id:'root',n:'الجذر',c:'var(--glaze)',
    d:'كل مستوى في دفترك يرفع هذا المسار. كلمات من جذور الدفتر تكسب مضاعفًا يكبر معه.',
    progress:(S,has)=>S.notebook.reduce((a,x)=>a+x.lvl,0)+(has('inkwell')?3:0),
    match:ctx=>!!ctx.nb},
  {id:'pattern',n:'الوزن',c:'var(--saffron)',
    d:'كل رفع وزن تشتريه يرفع هذا المسار. أي كلمة على وزن معروف تكسب مضاعفًا يكبر معه.',
    progress:(S,has)=>(Object.values(S.patLv) as number[]).reduce((a,l)=>a+Math.max(0,l-1),0)+(has('wazzan')?3:0)+(has('collector')?3:0),
    match:ctx=>!!ctx.p},
  {id:'chain',n:'السلسلة',c:'var(--crack)',
    d:'أعلى سلسلة بلغتها هذه الرحلة ترفع هذا المسار. كلمة تختمها وأنت في سلسلة تكسب مضاعفًا يكبر معه.',
    progress:(S,has)=>(S.stats.maxChain||0)+(has('pen')?3:0)+(has('thread')?3:0)+(has('ember')?3:0),
    match:ctx=>ctx.chain>=2},
  {id:'bag',n:'الكيس',c:'var(--violet)',
    d:'حروف منقوشة وكيس صغير يرفعان هذا المسار. كلمة فيها حرف منقوش، أو كيس ٧ حروف فأقل، تكسب مضاعفًا يكبر معه.',
    progress:(S,has)=>S.bag.filter(t=>t.ench).length*2+(S.bag.length<=7?4:0)+(has('nasikh')?2:0)+(has('ring')?2:0)+(has('orphan')?3:0)+(has('eater')?2:0),
    match:ctx=>ctx.bagFlavor},
];
export const pathLvl=p=>Math.min(5,Math.floor(p/3));
