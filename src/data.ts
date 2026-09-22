import { hasAl } from './dict';

/* ================= LETTERS & RULES ================= */
export const VAL={ا:1,ل:1,م:1,ن:1,ر:1,و:1,ي:1,ت:1,ب:1,ع:1,ه:1,ة:1,س:1,د:2,ك:2,ف:2,ق:2,ح:2,ج:2,ش:2,ص:3,خ:3,ز:3,ط:3,ء:3,ض:4,غ:4,ث:4,ذ:4,ظ:5};
export const LETTERS=Object.keys(VAL);
export const FAM=[['ب','ت','ث','ن','ي'],['ج','ح','خ'],['د','ذ'],['ر','ز'],['س','ش'],['ص','ض'],['ط','ظ'],['ع','غ'],['ف','ق'],['ه','ة']];
export const famOf=ch=>FAM.find(f=>f.includes(ch));
export const LENB=[0,0,2,10,20,35,55,80,110];
/* Rescaled for the seal budget. The old ladder was written for 20 drops and unlimited
   seals; with five seals on a pile that shrinks as you spell, a round yields a fraction of
   what it used to. Measured with tools/bot.mjs, not guessed.
   The shape matters as much as the numbers: rounds 1-3 sit well under what a careless run
   scores, because that is before any build exists and a roguelike that kills you on round
   one has no run to speak of. The ladder bites from round 4, once the shop has had three
   passes to give you something to compound. */
export const TARGETS=[100,150,210,300,420,560,720,900];
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

/* The round is a Scrabble rack, not a faucet. Your ten letters fall twice each and never
   refill, and sealing a word STRIKES its letters from what is left to fall — so a long word
   scores more and shortens your own round. Five seals is the other wall: "can I make a word"
   stops being the question and "is this word worth one of my five" starts being it.
   (Scrabble's leave + Balatro's hand budget. Nothing here is free any more.) */
export const COPIES=3, SEALS=5;

/* ================= WHO YOU ARE — الكُتّاب =================
   A character is the one choice you make before you know anything, so each is a *rule*,
   not a stat line: a sentence that changes how every later decision is judged. The bag is
   tuned so the character's rule has something to bite on (the grammarian's bag is eight of
   the ten حروف الزيادة, so أوزان are actually reachable). */
export const CHARS=[
  {id:'warraq',n:'الوَرّاق',letters:'المكتبونير',root:'كتب',seals:5,gold:4,
   d:'أول ختم في كل جولة لا ينفق ختمًا.',
   w:'الناسخ الصبور: يكتب كثيرًا ويخطئ قليلًا. ابدأ به.'},
  {id:'nahwi',n:'النَّحْوي',letters:'التسمونيفع',root:'فعل',seals:4,gold:4,
   d:'وزن الجولة يدفع ×٣ بدل ×٢ — ولك أربعة أختام لا خمسة.',
   w:'كيسه ثمانية من حروف الزيادة (سألتمونيها)، فالأوزان في متناوله وحدها.'},
  {id:'badawi',n:'البَدَوي',letters:'الرحمبدو',root:'رحم',seals:5,gold:4,
   d:'كيسك لا يتجاوز ثمانية حروف، وكل كلمة ×١٫٥.',
   w:'ثمانية حروف لا عشرة: كومة أقصر، لكن كل ما فيها تعرفه.'},
  {id:'sarraf',n:'الصَّرّاف',letters:'الصرفدنهمب',root:'صرف',seals:4,gold:12,
   d:'تشتري ختمًا إضافيًا بخمسة دنانير، في أي وقت داخل الجولة.',
   w:'يبدأ بمال أكثر وأختام أقل: عنده الأختام سلعة تُشترى لا حصّة تُعطى.'},
  {id:'mujami',n:'المُعْجَمي',letters:'الجمعكتبور',root:'جمع',seals:5,gold:4,nb:2,
   d:'الدفتر خمس خانات، والجذور ترتقي بضعف السرعة، وتبدأ بجذرين.',
   w:'رحلته طويلة النفس: الدفتر يثقل ببطء ثم يدفع دفعة واحدة.'},
];
/* kept as an alias so older saves/links that name a starter still resolve */
export const STARTERS=CHARS;

/* ================= أوزان ================= */
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

/* ================= الحُروز — RELICS =================
   Rewritten from nothing. The old set was seventeen scoring modifiers, which is why no
   two runs felt different: a multiplier does not change what you *do*, only what the
   number says afterwards. These are grouped by which part of the loop they rewrite, and
   the best of them (قلب، مشدد، جذر أعمى، شاذّ) change what the board will accept as a
   word — the one lever a word game has that a card game does not.

   `hook` says where in the loop it fires, so the wiring stays findable:
     pile  — what falls        hand — the tile in your hand      row — where it may land
     word  — what counts       seal — what sealing costs/pays    score — the number
   Two old relics were promoted out of the pool rather than rewritten: المُعَرِّب (build
   toward the start of the word) is base Arabic and is now always on, and النقطة is a
   tool you spend, not a passive you might never be offered. */
export const RELICS={
  /* --- pile: what falls --- */
  minkhal:{n:'المِنْخَل',hook:'pile',path:'bag',d:'ترى الحرفين القادمين بدل حرف واحد.'},
  khabiya:{n:'الخابية',hook:'pile',path:'bag',d:'كومة الجولة أربع نسخ من كل حرف بدل ثلاث — جولة أطول.'},
  ghirbal:{n:'الغِربال',hook:'pile',d:'+٢ حرقة في كل جولة.'},
  ramad:{n:'الرَّماد',hook:'pile',d:'كل حرف تحرقه يضيف قيمته ×٣ إلى نقاط ختمك التالي.'},
  qura:{n:'القُرْعة',hook:'pile',path:'bag',d:'تبدأ كل جولة وأغلى حروف كيسك في يدك.'},

  /* --- hand: the tile you are holding --- */
  tawam:{n:'التَّوْأم',hook:'hand',d:'بدّل الحرف الحالي بالتالي، متى شئت.'},
  madd:{n:'المَدّ',hook:'hand',d:'حرف العلّة (ا و ي) يمكن إسقاطه مكان أيّ من إخوته الثلاثة.'},

  /* --- row: where it may land --- */
  tufayli:{n:'الطُّفَيْلي',hook:'row',d:'الحرف الذي كان سيكسر سطرًا يقفز إلى أول سطر يقبله.'},
  rabi:{n:'السطر الرابع',hook:'row',d:'سطر رابع تحت الثلاثة — لكنك لا ترى الحرف التالي.'},
  qalam:{n:'القلم المكسور',hook:'row',path:'chain',d:'السطور لا تنكسر: السطر الميت يصير حشوًا تمسحه مقابل ٣ نقاط لكل حرف.'},
  rihab:{n:'الرِّحاب',hook:'row',d:'+٢ في سقف كل سطر.'},

  /* --- word: what the board accepts (the interesting ones) --- */
  qalb:{n:'القَلْب',hook:'word',d:'السطر يُقبل أيضًا إذا كان مقلوبه كلمة. اقرأه من الجهة الأخرى.'},
  shadd:{n:'المُشَدِّد',hook:'word',d:'الحرفان المتماثلان المتجاوران يُحسبان أربع مرات في النقاط.'},
  ablind:{n:'الجَذْر الأعمى',hook:'word',path:'root',d:'كل كلمة تُحسب كأن جذرها في دفترك بمستوى ١.'},
  shadh:{n:'الشّاذّ',hook:'word',d:'كلمة من حرفين تُقبل، وتُحسب كأنها من أربعة.'},
  taarif:{n:'أل التعريف',hook:'word',d:'كل كلمة تُحسب كأن فيها «ال»: +١ مضاعف، وطولها +١.'},

  /* --- seal: what it costs and what it pays --- */
  miqass:{n:'المِقَصّ',hook:'seal',d:'الختم يشطب نصف حروف الكلمة من الكومة فقط.'},
  khayt:{n:'خيط الحبر',hook:'seal',path:'chain',d:'ختم كلمة يختم تلقائيًا كل سطر آخر فيه كلمة مكتملة.'},
  midad:{n:'المِداد',hook:'seal',path:'pattern',d:'إن جاءت كلمتك على وزن الجولة، رُدَّ إليك الختم.'},
  raha:{n:'حجر الرحى',hook:'seal',path:'chain',d:'كل سطر تخسره — كسرًا أو حشوًا — يمنحك +٠٫٥ مضاعف دائم.'},
  misann:{n:'المِسَنّ',hook:'seal',d:'كل ختم يردّ شحنة واحدة إلى كل أداة تملكها.'},

  /* --- score & the two Arabic axes --- */
  mihbara:{n:'المِحْبَرة',hook:'score',path:'root',d:'خانة زائدة في الدفتر، وجذور الدفتر تكسب الخبرة مضاعفة.'},
  jami:{n:'جامع الأوزان',hook:'score',path:'pattern',d:'أول كلمة تختمها على كل وزن مختلف: +٠٫٥ مضاعف دائم.'},
  ishtiqaq:{n:'الاشتقاق',hook:'score',path:'root',d:'كلمة من جذر ختمته في هذه الجولة: ×٢ فوق الرنين.'},
  wazzan:{n:'الوزّان',hook:'score',path:'pattern',d:'مكافأة الوزن تُحسب مرتين.'},
  yatim:{n:'اليتيم',hook:'score',path:'bag',d:'إذا كان في كيسك سبعة حروف أو أقل: كل كلمة ×٣.'},
  nasikh:{n:'الناسخ',hook:'score',path:'bag',d:'بعد كل ختم تُنسخ أغلى حروف الكلمة إلى كيسك (يتسع حتى ١٣).'},
};

/* ================= الأدوات — TOOLS =================
   The category the game was missing. A relic fires on its own; a tool fires when *you*
   spend a charge, and charges reset each round. This is the only place the player can
   answer a bad letter with anything but "which row hurts least" — Sid Meier's decision
   needs an option, and burning was the only one.
   `use` names the verb game.ts implements; `ch` is charges per round. */
export const TOOLS={
  naqta:{n:'النُّقْطة',use:'fam',ch:3,d:'حوّل الحرف داخل عائلة نقطه: ب ← ت ← ث ← ن ← ي…'},
  hamza:{n:'الهَمْزة',use:'hamza',ch:2,d:'حوّل الحرف الحالي إلى «ء». الهمزة تسدّ كل مقاعدها.'},
  madda:{n:'المَدّة',use:'vowel',ch:3,d:'حوّل الحرف الحالي إلى ا أو و أو ي.'},
  mibrat:{n:'المِبْراة',use:'shave',ch:2,d:'احذف آخر حرف من أي سطر.'},
  mirat:{n:'المِرْآة',use:'flip',ch:1,d:'اقلب ترتيب حروف سطر كاملًا.'},
  isfinja:{n:'الإسْفِنْجة',use:'wipe',ch:1,d:'امسح سطرًا كاملًا: لا كسر، ولا ختم يُنفق.'},
  raml:{n:'الرَّمْل',use:'redraw',ch:2,d:'أعد الحرف الحالي إلى الكومة واسحب غيره.'},
  kaff:{n:'الكَفّ',use:'hold',ch:2,d:'احتفظ بالحرف الحالي جانبًا، وأنزله متى شئت.'},
};

/* ================= السطور — ROW INSCRIPTIONS =================
   A row is not just a ceiling. Inscribing one makes "which row?" a question about the
   word you intend, not the word you have. */
export const ROWMODS={
  double:{n:'المُضاعِف',d:'كل كلمة تُختم في هذا السطر ×٢.'},
  short:{n:'القِصار',d:'الكلمات من ثلاثة أحرف أو أقل هنا ×٤.'},
  long:{n:'الطِّوال',d:'الكلمات من خمسة أحرف فأكثر هنا ×٣.'},
  gold:{n:'الذَّهَب',path:'bag',d:'+٣ دنانير عن كل ختم في هذا السطر.'},
  fort:{n:'الحِصن',path:'chain',d:'هذا السطر لا ينكسر: الحرف الذي يقتله يرتدّ ويضيع وحده.'},
  echo:{n:'الصَّدى',path:'chain',d:'بعد الختم يحتفظ السطر بآخر حرف من الكلمة ليبدأ به.'},
  mizan:{n:'المِيزان',path:'pattern',d:'وزن الجولة يدفع هنا ×٣ بدل ×٢.'},
  manbat:{n:'المَنْبَت',path:'root',d:'كلمة من جذر في دفترك تُختم هنا ×٣.'},
};

/* ================= الوسوم — LETTER MARKS =================
   A mark rides one letter for the rest of the run, so it is a bag decision, not a round
   decision: مِرْساة and طَليق both argue with the new letter economy rather than ignoring it. */
export const ENCH={
  gold:{n:'ذهبي',d:'نقاط هذا الحرف ×٣.'},
  glass:{n:'زجاجي',d:'الكلمة ×٢، ثم ينكسر ويخرج من كيسك.'},
  ink:{n:'حِبْر',d:'يتحول تلقائيًا إلى أنسب حرف من عائلته (ب ت ث ن ي…).'},
  echo:{n:'صَدى',d:'عند إسقاطه تأتيك نسخة منه فورًا.'},
  free:{n:'طَليق',d:'لا يُشطب من كومة الجولة عند الختم — يسقط مرة أخرى.'},
  anchor:{n:'مِرْساة',d:'السطر الذي فيه هذا الحرف لا ينكسر.'},
  seed:{n:'بَذْرة',d:'إن كان حرفًا أصليًا (لا زائدة): كلمته ×٢.'},
  heavy:{n:'مُثْقَل',d:'يُحسب حرفين في طول الكلمة، فيبلغ بها الأوزان الطويلة.'},
};

/* ================= المُؤتلِفات — COMBOS =================
   Hades names its duo boons, and that is most of why its builds feel like builds: a
   synergy nobody can see is not a synergy, it is a coincidence. Each entry is a pair (or
   trio) that is worth more than its parts, named so the player can aim at it.

   Ids are namespaced because a combo crosses categories — that crossing is the point:
   `char:` `relic:` `tool:` `row:` `mark:`. The shop reads this table to bias its offers
   toward whatever you are one piece away from, so a build you start is a build you can
   finish instead of one the shuffle has to hand you. */
export const COMBOS=[
  {n:'الحرف المشدَّد', parts:['relic:shadd','mark:echo'],
   d:'الصدى يعيدك بنسخة من الحرف، فتضعه بجوار نفسه، والمُشدِّد يحسب المتجاورَين أربع مرات.'},
  {n:'نقطة على نقطة', parts:['relic:shadd','tool:naqta'],
   d:'تنقل النقطة حتى يطابق الحرفُ جارَه، فتصنع الشدّة بيدك بدل أن تنتظرها.'},
  {n:'الطاحونة', parts:['relic:qalam','relic:raha'],
   d:'السطر لا ينكسر بل يصير حشوًا، والرحى تدفع عن كل خراب: الخسارة صارت محرّكًا.'},
  {n:'الميزان المذهَّب', parts:['char:nahwi','row:mizan'],
   d:'وزن الجولة ×٣ عند النحوي و×٣ في سطر الميزان — والوزّان يضاعفهما.'},
  {n:'مِداد لا ينفد', parts:['relic:midad','row:mizan'],
   d:'الوزن يدفع ×٣ ويردّ الختم: على هذا السطر تختم بلا أن تُنقص حصّتك.'},
  {n:'الكيس الأعزل', parts:['char:badawi','relic:yatim'],
   d:'ثمانية حروف ثم سبعة: ×١٫٥ للبدوي و×٣ لليتيم على كل كلمة.'},
  {n:'الجذر الراسخ', parts:['relic:ishtiqaq','mark:free'],
   d:'الحرف الطليق لا يُشطب من الكومة فيعود إليك، فتكرّر الجذر نفسه والاشتقاق يضاعفه.'},
  {n:'الدفتر العميق', parts:['char:mujami','relic:mihbara'],
   d:'ست خانات في الدفتر، والخبرة مضاعفة مرتين: جذورك ترتقي أسرع مما تُنسى.'},
  {n:'المَنْبَت', parts:['relic:ablind','row:manbat'],
   d:'الجذر الأعمى يجعل كل جذر كأنه في دفترك، وسطر المنبت يضاعف ما في الدفتر ×٣.'},
  {n:'صَرْف العملة', parts:['char:sarraf','row:gold'],
   d:'كل ختم في سطر الذهب يموّل أكثر من نصف ختم جديد: الأختام تصير دخلًا.'},
  {n:'المدّ الطويل', parts:['mark:heavy','row:long'],
   d:'المُثقَل يُحسب حرفين، فيبلغ بكلمتك سقف الطِوال وأنت تملك حروفًا أقل.'},
  {n:'المرآتان', parts:['relic:qalb','tool:mirat'],
   d:'القلب يقبل المقلوب، والمرآة تقلب السطر فتختار أي الوجهين يُحتسب.'},
  {n:'السِّنان', parts:['relic:misann','tool:isfinja'],
   d:'الإسفنجة شحنة واحدة في الجولة، والمِسَنّ يردّها مع كل ختم: امسح ما شئت.'},
  {n:'الرماد الحارق', parts:['relic:ramad','relic:ghirbal'],
   d:'خمس حرقات في الجولة، وكل محروق يُضاف إلى الختم التالي: الحرق صار ادّخارًا.'},
  {n:'الخابية المقصوصة', parts:['relic:khabiya','relic:miqass'],
   d:'كومة أطول بنسخة، وختم يشطب نصف ما يشطب: الجولة تطول مرتين.'},
  {n:'القُرعة المحفوظة', parts:['relic:qura','tool:kaff'],
   d:'تبدأ الجولة بأغلى حروفك، والكفّ يحفظه حتى يجيء السطر الذي يستحقه.'},
];
/* which ids a run currently owns, in the namespaced form COMBOS uses */
export const ownedIds=S=>{
  const o=['char:'+S.charId];
  for(const r of S.relics) o.push('relic:'+r);
  for(const t of Object.keys(S.tools||{})) o.push('tool:'+t);
  for(const m of S.rowMods) if(m) o.push('row:'+m);
  for(const t of S.bag) if(t.ench) o.push('mark:'+t.ench);
  return new Set(o);
};

export const BOSSES={
  blind:{n:'الكاتب الأعمى',d:'لا ترى الحرف التالي.'},
  termite:{n:'الأرَضة',d:'كل ٤ إسقاطات تأكل أول حرف من أطول سطر. إن صار السطر بلا كلمة ممكنة ينكسر.'},
  dry:{n:'الحبر الجاف',d:'السطر الذي تختم فيه يجف ولا يقبل حروفًا لإسقاطتين.'},
  rhyme:{n:'القافية',d:'كل كلمة يجب أن تبدأ بآخر حرف من الكلمة السابقة، وإلا فنصف النقاط.'},
  weight:{n:'الثِّقل',d:'كل سطر يبدأ الجولة وفيه حرف غريب لا يمكن إزالته إلا بالختم.'},
  rush:{n:'المستعجل',d:'٥ ثوانٍ لكل حرف، وإلا احترق وضاعت إسقاطته.'},
};

/* ================= PATHS (BUILDS) =================
   Four recognizable strategies, each measured from what the player already owns
   (no separate pick-a-build screen). Each gives a *multiplicative* bonus on the
   words that match it, stacking with resonance/chain/row-mods rather than just
   adding into the flat mult — this is what makes committing to one feel worth it. */
export const PATHS=[
  {id:'root',n:'الجذر',c:'var(--glaze)',
    d:'كل مستوى في دفترك يرفع هذا المسار. كلمات من جذور الدفتر تكسب مضاعفًا يكبر معه.',
    progress:(S,has)=>S.notebook.reduce((a,x)=>a+x.lvl,0)+(has('mihbara')?3:0),
    match:ctx=>!!ctx.nb},
  {id:'pattern',n:'الوزن',c:'var(--saffron)',
    d:'كل رفع وزن تشتريه يرفع هذا المسار. أي كلمة على وزن معروف تكسب مضاعفًا يكبر معه.',
    progress:(S,has)=>(Object.values(S.patLv) as number[]).reduce((a,l)=>a+Math.max(0,l-1),0)+(has('wazzan')?3:0)+(has('jami')?3:0),
    match:ctx=>!!ctx.p},
  {id:'chain',n:'السلسلة',c:'var(--crack)',
    d:'أعلى سلسلة بلغتها هذه الرحلة ترفع هذا المسار. كلمة تختمها وأنت في سلسلة تكسب مضاعفًا يكبر معه.',
    progress:(S,has)=>(S.stats.maxChain||0)+(has('qalam')?3:0)+(has('khayt')?3:0)+(has('raha')?2:0),
    match:ctx=>ctx.chain>=2},
  {id:'bag',n:'الكيس',c:'var(--violet)',
    d:'حروف منقوشة وكيس صغير يرفعان هذا المسار. كلمة فيها حرف منقوش، أو كيس ٧ حروف فأقل، تكسب مضاعفًا يكبر معه.',
    progress:(S,has)=>S.bag.filter(t=>t.ench).length*2+(S.bag.length<=7?4:0)+(has('nasikh')?2:0)+(has('yatim')?3:0)+(has('khabiya')?2:0)+(has('qura')?2:0),
    match:ctx=>ctx.bagFlavor},
];
export const pathLvl=p=>Math.min(5,Math.floor(p/3));
