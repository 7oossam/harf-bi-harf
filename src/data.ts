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
   The shape matters as much as the numbers: rounds 1-2 sit well under what a careless run
   scores, because that is before any build exists and a roguelike that kills you on round
   one has no run to speak of. The ladder bites from round 4, once the shop has had three
   passes to give you something to compound. */
/* Boss rounds (3, 6, 8) dip BELOW the trend on purpose. Measured: the median round-2 score
   is ~296 and the median round-3 score ~166 — a boss roughly halves your output. Charging a
   higher target on top of that is charging twice for the same difficulty, and it killed six
   of eight runs at round 3 exactly. The boss IS the round's difficulty; the number steps back. */
export const TARGETS=[100,150,175,300,420,470,720,760];
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

/* ================= THE TWO CARD KINDS =================
   The game is built on the trilateral root. A row holds at most THREE أصول (radical cards) —
   that is the root — and any number of زوائد (affix cards) hung around them. This is not a
   scoring bonus laid over a word game; it is الجذر × الوزن as the literal rule.

   An affix card knows its seat, because in Arabic position IS meaning: the same ا makes
   كاتب in seat 1 and كتاب in seat 2. Seats are counted against the three radicals:
     0 — before the root (بادئة)      1 — after the first radical (بعد الفاء)
     2 — after the second (بعد العين)  3 — after the root (لاحقة)
   The word is assembled seat by seat: A0 + R0 + A1 + R1 + A2 + R2 + A3.
     كتب                      → كَتَب
     كتب + ا@1                → كاتب
     كتب + ال@0 + ا@1 + ون@3  → الكاتبون
     كتب + م@0 + و@2          → مكتوب
   Measured against the real lexicon: 74% of single-affix attachments land on a real word,
   29% of two-affix stacks do. So one زيادة is nearly safe and stacking is a genuine gamble —
   which is exactly where the push-your-luck lives. */
export const AFFIX={
  /* بوادئ */
  al :{t:'ال', s:0, v:2, m:1, n:'أل التعريف', d:'المعرفة: كتاب ← الكتاب'},
  mim:{t:'م',  s:0, v:2, m:1, n:'ميم', d:'اسم المكان والفاعل: كتب ← مكتب'},
  taa:{t:'ت',  s:0, v:2, m:1, n:'تاء', d:'التفعّل: علم ← تعلم'},
  yaa:{t:'ي',  s:0, v:1, m:1, n:'ياء المضارعة', d:'الفعل المضارع: كتب ← يكتب'},
  nun:{t:'ن',  s:0, v:1, m:1, n:'نون المضارعة', d:'نحن نفعل: كتب ← نكتب'},
  ist:{t:'است',s:0, v:5, m:3, n:'است', d:'الاستفعال، وزن طويل ثقيل: علم ← استعلم'},
  mst:{t:'مست',s:0, v:6, m:4, n:'مست', d:'المستفعِل: عمل ← مستعمل'},
  /* بعد الفاء */
  a1 :{t:'ا',  s:1, v:3, m:2, n:'ألف فاعِل', d:'اسم الفاعل: كتب ← كاتب'},
  /* بعد العين */
  a2 :{t:'ا',  s:2, v:3, m:2, n:'ألف فِعال', d:'المصدر: كتب ← كتاب'},
  y2 :{t:'ي',  s:2, v:3, m:2, n:'ياء فعيل', d:'الصفة المشبهة: علم ← عليم'},
  w2 :{t:'و',  s:2, v:3, m:2, n:'واو فعول', d:'المصدر والمفعول: علم ← علوم'},
  /* لواحق */
  ta :{t:'ة',  s:3, v:1, m:1, n:'تاء مربوطة', d:'التأنيث: كاتب ← كاتبة'},
  un :{t:'ون', s:3, v:3, m:2, n:'واو ونون', d:'جمع المذكر السالم: كاتب ← كاتبون'},
  in_:{t:'ين', s:3, v:3, m:2, n:'ياء ونون', d:'جمع المذكر نصبًا وجرًّا: كاتبين'},
  at :{t:'ات', s:3, v:3, m:2, n:'ألف وتاء', d:'جمع المؤنث السالم: كاتبات'},
  an :{t:'ان', s:3, v:3, m:2, n:'ألف ونون', d:'المثنّى: كاتبان'},
  ya3:{t:'ي',  s:3, v:2, m:1, n:'ياء النسبة', d:'النسبة: عرب ← عربي'},
  ha :{t:'ها', s:3, v:2, m:1, n:'ضمير الغائبة', d:'كتب ← كتبها'},
};
export const AFFIX_IDS=Object.keys(AFFIX);
export const SEATS=['بادئة','بعد الفاء','بعد العين','لاحقة'];

/* ================= WHO YOU ARE — الكُتّاب =================
   A character is four roots and a rule. The four roots are the whole point: you can SEE the
   bag, you are not fishing in an alphabet. Twelve radical cards, and the أصول you know by
   heart within one round.

   A run OPENS WITH NO زوائد. Round one is bare roots — three cards, a real word, a small sure
   score — and every زيادة after that is bought. That IS the progression: the word gets longer
   because you made it longer. An earlier draft handed out three affix cards at start (a
   band-aid for the single mixed pile thinning the أصول), which erased round one: a two-affix
   word scored 1817 against a target of 100. Splitting the piles removed the reason for the
   band-aid, so it is gone. الشاعر keeps one, because "زوائد fall twice as often" needs
   something to fall. */
export const CHARS=[
  {id:'warraq',n:'الوَرّاق',roots:['كتب','درس','نسخ','جمع'],aff:[],seals:5,gold:4,
   d:'أول ختم في كل جولة لا ينفق ختمًا.',
   w:'جذور الكتابة، ومعه «ال» و«ة» من البداية. ابدأ به.'},
  {id:'hakim',n:'الحكيم',roots:['علم','حكم','فهم','عقل'],aff:[],seals:5,gold:4,
   d:'كل كلمة من خمسة أحرف فأكثر ×٢.',
   w:'جذور المعرفة، وأخصبها علم (٧٣٤ صيغة). يكافئ الكلمة الطويلة.'},
  {id:'tajir',n:'التاجر',roots:['ربح','حسب','دفع','عمل'],aff:[],seals:4,gold:10,
   d:'كل بطاقة زيادة في كلمتك المختومة تمنحك دينارًا.',
   w:'أختام أقل ومال أكثر: عنده الزوائد دخل لا زينة.'},
  {id:'rahhal',n:'الرحّالة',roots:['سفر','وصل','طرق','بعد'],aff:[],seals:5,gold:4,
   d:'تحمل خمسة جذور لا أربعة.',
   w:'كيس أوسع وجذور أكثر: احتمالات أكثر وتركيز أقل.'},
  {id:'shair',n:'الشاعر',roots:['شعر','قول','سمع','ذكر'],aff:['a1'],seals:5,gold:4,
   d:'كل شراء زيادة يعطيك بطاقتين إضافيتين.',
   w:'ذخيرته من الزوائد أوفر، فيصرفها على كلمات أطول.'},
];
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
   Retuned for the card game. `hook` says where in the loop it fires:
     pile — what falls    root — the three أصول    affix — the زوائد
     row  — the row rule  seal — cost and payoff   score — the number
   The affix hooks are the new centre of gravity: زوائد are what the player collects, so
   they are what the relics should bend. */
export const RELICS={
  /* --- pile --- */
  khabiya:{n:'الخابية',hook:'pile',path:'bag',d:'نسخة إضافية من كل بطاقة في كومة الجولة.'},
  qura:{n:'القُرْعة',hook:'pile',path:'bag',d:'تبدأ كل جولة وأغلى بطاقاتك في يدك.'},
  minkhal:{n:'المِنْخَل',hook:'pile',path:'bag',d:'ترى البطاقتين القادمتين بدل واحدة.'},
  ghirbal:{n:'الغِربال',hook:'pile',d:'+٢ حرقة في كل جولة.'},
  ramad:{n:'الرَّماد',hook:'pile',d:'كل بطاقة تحرقها تضيف قيمتها ×٣ إلى ختمك التالي.'},

  /* --- affixes: the heart of the new game --- */
  zaida:{n:'الزائدة',hook:'affix',path:'pattern',d:'كل شراء زيادة يعطيك بطاقتين إضافيتين.'},
  mushtaqq:{n:'المُشتَقّ',hook:'affix',path:'pattern',d:'كل زيادة في كلمتك +١ مضاعف إضافي.'},
  mulhaq:{n:'المُلحَق',hook:'affix',path:'pattern',d:'تضع الزيادة في أي خانة شئت، لا في خانتها وحدها.'},
  sarfi:{n:'الصَّرْفي',hook:'affix',path:'pattern',d:'كلمة فيها ثلاث زيادات فأكثر: ×٣.'},
  tadeef:{n:'التَّضعيف',hook:'affix',d:'أول زيادة في كل كلمة تختمها لا تُستهلَك — تعود إلى كيسك.'},

  /* --- the root itself --- */
  qalb:{n:'القَلْب',hook:'root',path:'root',d:'ترتيب الأصول لا يهمّ: أي ترتيب يكوّن جذرًا حقيقيًا يُقبل.'},
  ibdal:{n:'الإبدال',hook:'root',d:'تحوّل الأصل في يدك إلى أخيه في عائلة النقط: ب ← ت ← ث ← ن ← ي.'},
  khamis:{n:'الجذر الخامس',hook:'root',path:'root',d:'جذر إضافي في كيسك، تختاره من المتجر.'},
  mihbara:{n:'المِحْبَرة',hook:'root',path:'root',d:'خانة زائدة في الدفتر، وجذوره تكسب الخبرة مضاعفة.'},
  ishtiqaq:{n:'الاشتقاق',hook:'root',path:'root',d:'كلمة من جذر ختمته في هذه الجولة: ×٢.'},
  ablind:{n:'الجَذْر الأعمى',hook:'root',path:'root',d:'كل جذر يُحسب كأنه في دفترك بمستوى ١.'},

  /* --- the row --- */
  rihab:{n:'الرِّحاب',hook:'row',d:'السطر يقبل أربعة أصول لا ثلاثة: الجذور الرباعية في متناولك.'},
  rabi:{n:'السطر الرابع',hook:'row',d:'سطر رابع تحت الثلاثة — لكنك لا ترى البطاقة التالية.'},
  qalam:{n:'القلم المكسور',hook:'row',path:'chain',d:'السطور لا تنكسر: السطر الميت يصير حشوًا تمسحه مقابل ٣ نقاط لكل بطاقة.'},
  tufayli:{n:'الطُّفَيْلي',hook:'row',d:'البطاقة التي كانت ستكسر سطرًا تقفز إلى أول سطر يقبلها.'},

  /* --- seal --- */
  miqass:{n:'المِقَصّ',hook:'seal',d:'الختم يشطب نصف بطاقات الكلمة من الكومة فقط.'},
  midad:{n:'المِداد',hook:'seal',path:'pattern',d:'إن جاءت كلمتك على وزن الجولة، رُدَّ إليك الختم.'},
  khayt:{n:'خيط الحبر',hook:'seal',path:'chain',d:'ختم كلمة يختم تلقائيًا كل سطر آخر فيه كلمة مكتملة.'},
  raha:{n:'حجر الرحى',hook:'seal',path:'chain',d:'كل سطر تخسره — كسرًا أو حشوًا — يمنحك +٠٫٥ مضاعف دائم.'},
  misann:{n:'المِسَنّ',hook:'seal',d:'كل ختم يردّ شحنة واحدة إلى كل أداة تملكها.'},

  /* --- score --- */
  wazzan:{n:'الوزّان',hook:'score',path:'pattern',d:'مكافأة الوزن تُحسب مرتين.'},
  jami:{n:'جامع الأوزان',hook:'score',path:'pattern',d:'أول كلمة على كل وزن مختلف: +٠٫٥ مضاعف دائم.'},
  yatim:{n:'اليتيم',hook:'score',path:'bag',d:'إذا كان في كيسك ثلاثة جذور أو أقل: كل كلمة ×٣.'},
};

/* ================= الأدوات — TOOLS ================= */
export const TOOLS={
  naqta:{n:'النُّقْطة',use:'fam',ch:3,d:'حوّل الأصل في يدك داخل عائلة نقطه: ب ← ت ← ث ← ن ← ي…'},
  mirat:{n:'المِرْآة',use:'flip',ch:2,d:'اقلب ترتيب الأصول في سطر — لعلّ المقلوب جذر.'},
  mibrat:{n:'المِبْراة',use:'shave',ch:2,d:'انزع آخر بطاقة وُضعت في سطر.'},
  mifakk:{n:'المِفَكّ',use:'unhook',ch:2,d:'انزع زيادة من سطر وأعدها إلى كومتك.'},
  isfinja:{n:'الإسْفِنْجة',use:'wipe',ch:1,d:'امسح سطرًا كاملًا: لا كسر، ولا ختم يُنفق.'},
  raml:{n:'الرَّمْل',use:'redraw',ch:2,d:'أعد البطاقة التي في يدك إلى الكومة واسحب غيرها.'},
  kaff:{n:'الكَفّ',use:'hold',ch:2,d:'احتفظ بالبطاقة جانبًا، وأنزلها متى شئت.'},
  madda:{n:'المَدّة',use:'vowel',ch:3,d:'حوّل الأصل في يدك إلى ا أو و أو ي.'},
};

/* ================= السطور — ROW INSCRIPTIONS ================= */
export const ROWMODS={
  double:{n:'المُضاعِف',d:'كل كلمة تُختم في هذا السطر ×٢.'},
  mizan:{n:'المِيزان',path:'pattern',d:'وزن الجولة يدفع هنا ×٣ بدل ×٢.'},
  manbat:{n:'المَنْبَت',path:'root',d:'كلمة من جذر في دفترك تُختم هنا ×٣.'},
  ziyada:{n:'الزِّيادة',path:'pattern',d:'كل بطاقة زيادة في هذا السطر +٢ مضاعف.'},
  usul:{n:'الأُصول',path:'root',d:'بطاقات الأصول هنا تُحسب بضعف قيمتها.'},
  tawil:{n:'الطِّوال',d:'الكلمة من ستة أحرف فأكثر هنا ×٣.'},
  gold:{n:'الذَّهَب',path:'bag',d:'+٣ دنانير عن كل ختم في هذا السطر.'},
  fort:{n:'الحِصن',path:'chain',d:'هذا السطر لا ينكسر: البطاقة التي تقتله ترتدّ وتضيع وحدها.'},
};

/* ================= الوسوم — CARD MARKS ================= */
export const ENCH={
  gold:{n:'ذهبي',d:'قيمة هذه البطاقة ×٣.'},
  free:{n:'طَليق',d:'لا تُستهلَك ولا تُشطب أبدًا: بطاقة لا تنفد.'},
  echo:{n:'صَدى',d:'عند إسقاطها تأتيك نسخة منها فورًا.'},
  anchor:{n:'مِرْساة',d:'السطر الذي فيه هذه البطاقة لا ينكسر.'},
  glass:{n:'زجاجي',d:'الكلمة ×٢، ثم تنكسر البطاقة وتخرج من كيسك.'},
  seed:{n:'بَذْرة',d:'إن كانت أصلًا: قيمتها ×٢ ومضاعف كلمتها +١.'},
};

/* ================= المُؤتلِفات — COMBOS ================= */
export const COMBOS=[
  {n:'الوزن الكامل', parts:['relic:mushtaqq','relic:sarfi'],
   d:'كل زيادة +١ مضاعف، وثلاث زوائد ×٣: كلما أطلت الكلمة تضاعف العائد مرتين.'},
  {n:'خزانة الزوائد', parts:['char:shair','relic:zaida'],
   d:'الشاعر يضاعف سقوط الزوائد والزائدة تضاعفه ثانية: كومة زوائد لا تكاد تنقطع.'},
  {n:'المِلحاق', parts:['relic:mulhaq','relic:sarfi'],
   d:'تضع الزيادة في أي خانة، فتبلغ الثلاث زوائد على أي جذر شئت.'},
  {n:'الطاحونة', parts:['relic:qalam','relic:raha'],
   d:'السطر لا ينكسر بل يصير حشوًا، والرحى تدفع عن كل خراب: الخسارة صارت محرّكًا.'},
  {n:'المرآتان', parts:['relic:qalb','tool:mirat'],
   d:'القلب يقبل أي ترتيب يكوّن جذرًا، والمرآة تقلب السطر لتبلغه.'},
  {n:'الميزان المذهَّب', parts:['row:mizan','relic:wazzan'],
   d:'وزن الجولة ×٣ في السطر و×٢ بالوزّان: الطلب الواحد يدفع ستة أضعاف.'},
  {n:'مِداد لا ينفد', parts:['relic:midad','row:mizan'],
   d:'الوزن يدفع ×٣ ويردّ الختم: على هذا السطر تختم بلا أن تُنقص حصّتك.'},
  {n:'الجذر الراسخ', parts:['relic:ishtiqaq','mark:free'],
   d:'البطاقة الطليقة لا تُشطب فتعود إليك، فتكرّر الجذر نفسه والاشتقاق يضاعفه.'},
  {n:'المَنْبَت', parts:['relic:ablind','row:manbat'],
   d:'كل جذر صار في دفترك، وسطر المنبت يضاعف ما في الدفتر ×٣.'},
  {n:'الكيس الأعزل', parts:['relic:yatim','relic:khamis'],
   d:'مفارقة مقصودة: الجذر الخامس يكسر شرط اليتيم — لا تشترِ الاثنين.', anti:true},
  {n:'صَرْف العملة', parts:['char:tajir','row:gold'],
   d:'كل زيادة دينار وكل ختم ثلاثة: التاجر يشتري أختامه من كلماته.'},
  {n:'الدفتر العميق', parts:['relic:mihbara','row:manbat'],
   d:'خانة زائدة وخبرة مضاعفة، وسطر يضاعف ما في الدفتر ×٣.'},
  {n:'السِّنان', parts:['relic:misann','tool:isfinja'],
   d:'الإسفنجة شحنة واحدة، والمِسَنّ يردّها مع كل ختم: امسح ما شئت.'},
  {n:'الرماد الحارق', parts:['relic:ramad','relic:ghirbal'],
   d:'خمس حرقات، وكل محروق يُضاف إلى الختم التالي: الحرق صار ادّخارًا.'},
  {n:'القُرعة المحفوظة', parts:['relic:qura','tool:kaff'],
   d:'تبدأ الجولة بأغلى بطاقاتك، والكفّ يحفظها حتى يجيء السطر الذي يستحقها.'},
  {n:'الرباعي', parts:['relic:rihab','relic:qalb'],
   d:'أربعة أصول في السطر وأي ترتيب يُقبل: الجذور الرباعية كلها مفتوحة.'},
];
export const ownedIds=S=>{
  const o=['char:'+S.charId];
  for(const r of S.relics) o.push('relic:'+r);
  for(const t of Object.keys(S.tools||{})) o.push('tool:'+t);
  for(const m of S.rowMods) if(m) o.push('row:'+m);
  for(const c of S.bag) if(c.ench) o.push('mark:'+c.ench);
  return new Set(o);
};

export const BOSSES={
  blind:{n:'الكاتب الأعمى',d:'لا ترى البطاقة التالية.'},
  termite:{n:'الأرَضة',d:'كل ٦ إسقاطات تأكل أول بطاقة من أطول سطر.'},
  dry:{n:'الحبر الجاف',d:'السطر الذي تختم فيه يجف ولا يقبل بطاقات لإسقاطة.'},
  rhyme:{n:'القافية',d:'كل كلمة يجب أن تبدأ بآخر حرف من الكلمة السابقة، وإلا فنصف النقاط.'},
  barren:{n:'القحط',d:'بطاقات الزيادة لا تسقط في هذه الجولة: الجذور وحدها.'},
  rush:{n:'المستعجل',d:'٥ ثوانٍ لكل بطاقة، وإلا احترقت وضاعت إسقاطتها.'},
};

/* ================= PATHS (BUILDS) =================
   Four strategies, each measured live from what the run already owns. Retuned for the card
   game: الوزن now counts زوائد because affixes ARE the wazn, and الكيس counts roots rather
   than loose letters because the bag is roots now. */
export const PATHS=[
  {id:'root',n:'الجذر',c:'var(--glaze)',
    d:'مستويات دفترك ترفع هذا المسار. كلمة من جذر في الدفتر تكسب مضاعفًا يكبر معه.',
    progress:(S,has)=>S.notebook.reduce((a,x)=>a+x.lvl,0)+(has('mihbara')?3:0)+(has('ablind')?3:0)+(has('ishtiqaq')?2:0),
    match:ctx=>!!ctx.nb},
  {id:'pattern',n:'الوزن',c:'var(--saffron)',
    d:'الزوائد التي تجمعها ترفع هذا المسار. كل كلمة فيها زيادة تكسب مضاعفًا يكبر معه.',
    progress:(S,has)=>S.bag.filter(c=>c.k==='a').length+(has('mushtaqq')?3:0)+(has('sarfi')?3:0)+(has('zaida')?2:0)+(has('mulhaq')?2:0),
    match:ctx=>ctx.naff>0},
  {id:'chain',n:'السلسلة',c:'var(--crack)',
    d:'أعلى سلسلة بلغتها ترفع هذا المسار. كلمة تختمها وأنت في سلسلة تكسب مضاعفًا يكبر معه.',
    progress:(S,has)=>(S.stats.maxChain||0)+(has('qalam')?3:0)+(has('khayt')?3:0)+(has('raha')?2:0),
    match:ctx=>ctx.chain>=2},
  {id:'bag',n:'الكيس',c:'var(--violet)',
    d:'البطاقات المنقوشة وقلّة الجذور ترفعان هذا المسار.',
    progress:(S,has)=>S.bag.filter(c=>c.ench).length*2+(S.roots.length<=3?4:0)+(has('yatim')?3:0)+(has('khabiya')?2:0)+(has('qura')?2:0),
    match:ctx=>ctx.bagFlavor},
];
export const pathLvl=p=>Math.min(5,Math.floor(p/3));
