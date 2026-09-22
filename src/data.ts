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
  /* ===== الكاسرات — the run-changers =====
     A relic that adds +2 of something is a number, not a direction. These each REWRITE a rule
     of the loop, so owning one makes the run play differently rather than score higher. Every
     one of them should make a player say "wait, now I can…" — that is the bar. */

  tasrif:{n:'التَّصريف',hook:'seal',path:'root',rare:1,
    d:'الختم لا يمسح الأصول: تُنفق الزوائد ويبقى الجذر في سطره. صرِّف الجذر الواحد مرة بعد مرة.'},
  irtijal:{n:'الارتجال',hook:'word',rare:1,
    d:'لا يلزم أن تكون الكلمة في المعجم: أي تركيب على جذر حقيقي يُقبل — بنصف النقاط.'},
  qalib:{n:'القالَب',hook:'word',path:'pattern',rare:1,
    d:'لا تختم إلا على وزن الجولة — لكنه يدفع ×٥.'},
  miraj:{n:'المِعراج',hook:'score',path:'root',rare:1,
    d:'كل ختم متتالٍ على الجذر نفسه يضاعف ما قبله: ×٢ ثم ×٤ ثم ×٨…'},
  kashf:{n:'الكَشْف',hook:'affix',path:'pattern',rare:1,
    d:'ترى ذخيرة زوائدك كلها وتختار منها البطاقة التي تريد، لا التي تأتيك.'},
  samt:{n:'الصَّمت',hook:'affix',rare:1,
    d:'لا تسقط عليك زيادة أبدًا — والجذر العاري ×٦.'},
  naht:{n:'النَّحت',hook:'affix',rare:1,
    d:'زوائدك لا تُحتسب أبدًا — استعملها ما شئت في الجولة — لكن كل ختم يكلّفك ديناريْن.'},
  shajara:{n:'الشَّجرة',hook:'root',path:'root',rare:1,
    d:'كل جذر جديد تختمه يدخل كيسك بأصوله الثلاثة.'},

  /* ===== rule benders — smaller, but still a rule and not a number ===== */
  mulhaq:{n:'المُلحَق',hook:'affix',path:'pattern',d:'تضع الزيادة في أي مقعد شئت، لا في مقعدها وحده.'},
  qalb:{n:'القَلْب',hook:'root',path:'root',d:'ترتيب الأصول لا يهمّ: أي ترتيب يكوّن جذرًا حقيقيًّا يُقبل.'},
  ibdal:{n:'الإبدال',hook:'root',d:'تحوّل الأصل في يدك إلى أخيه في عائلة النقط: ب ← ت ← ث ← ن ← ي.'},
  ablind:{n:'الجَذْر الأعمى',hook:'root',path:'root',d:'كل جذر يُحسب كأنه في دفترك بمستوى ١.'},
  rihab:{n:'الرِّحاب',hook:'row',d:'السطر يقبل أربعة أصول: الجذور الرباعية تُفتح لك.'},
  rabi:{n:'السطر الرابع',hook:'row',d:'سطر رابع تحت الثلاثة — لكنك لا ترى البطاقة التالية.'},
  qalam:{n:'القلم المكسور',hook:'row',path:'chain',d:'السطور لا تنكسر: الميت يصير حشوًا تمسحه مقابل ٣ نقاط للبطاقة.'},
  tufayli:{n:'الطُّفَيْلي',hook:'row',d:'البطاقة التي كانت ستكسر سطرًا تقفز إلى أول سطر يقبلها.'},
  khayt:{n:'خيط الحبر',hook:'seal',path:'chain',d:'ختم كلمة يختم كل سطر آخر فيه كلمة تامّة.'},
  midad:{n:'المِداد',hook:'seal',path:'pattern',d:'إن جاءت كلمتك على وزن الجولة، رُدَّ إليك الختم.'},
  tadeef:{n:'التَّضعيف',hook:'affix',d:'أول زيادة في كل كلمة لا تُحتسب: تعود إلى كومة الجولة فورًا.'},
  nussakh:{n:'النُّسّاخ',hook:'affix',path:'pattern',d:'نسخة إضافية من كل زيادة تملكها، في كل جولة.'},
  misann:{n:'المِسَنّ',hook:'seal',d:'كل ختم يردّ شحنة واحدة إلى كل أداة تملكها.'},

  /* ===== the last five were pure numbers (+0.5 mult, ×3, ×2) and Hussam called it twice.
     Replaced, each with a rule. الإدغام is the one I like most: the base game hangs ONE زيادة
     per seat, and this relic hands back exactly what he asked for at the very start — "the row
     takes any number of زوائد" — as something you earn rather than something it always was. */
  idgham:{n:'الإدغام',hook:'affix',path:'pattern',
    d:'كل مقعد يقبل زيادتين لا واحدة: ثمانية مقاعد حول الجذر بدل أربعة.'},
  waqf:{n:'الوَقْف',hook:'row',path:'root',
    d:'عند انتهاء الجولة يبقى أطول سطر كما هو إلى الجولة التالية.'},
  muswadda:{n:'المُسْوَدّة',hook:'row',path:'chain',
    d:'السطر الذي ينكسر لا تضيع أصوله: تعود إلى كومة الجولة.'},
  jinas:{n:'الجِناس',hook:'seal',path:'root',
    d:'الكلمة الثانية على الجذر نفسه في الجولة تُختم بلا أن تُنفق ختمًا.'},
  qafiya:{n:'القافية',hook:'seal',path:'chain',
    d:'كلمة تبدأ بآخر حرف من سابقتها: ×٣، ولا تُنفق ختمًا.'},
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
  /* A row inscription used to say "×2 here", which is a number wearing a row's clothes. These
     make the row a DIFFERENT PLACE: somewhere the seal is free, somewhere the root survives,
     somewhere your زوائد come back. Then "which row?" is a question about what you intend. */
  rahim:{n:'الرَّحِم',path:'root',d:'الختم هنا يُبقي الجذر في مكانه: صرِّفه مرة بعد مرة.'},
  mamal:{n:'المَعْمَل',d:'أول ختم في هذا السطر كل جولة لا يُنفق ختمًا.'},
  khizana:{n:'الخِزانة',path:'pattern',d:'الزوائد المستعملة هنا تعود إلى كومة الجولة: لا تُحتسب.'},
  minwal:{n:'المِنوال',path:'pattern',d:'كل كلمة تُختم هنا تُحسب كأنها على وزن الجولة.'},
  mizan:{n:'المِيزان',path:'pattern',d:'وزن الجولة يدفع هنا ×٣ بدل ×٢.'},
  mashtal:{n:'المَشْتَل',path:'root',d:'الختم هنا يضيف جذر الكلمة إلى دفترك وكيسك.'},
  gold:{n:'الذَّهَب',path:'bag',d:'+٣ دنانير عن كل ختم في هذا السطر.'},
  fort:{n:'الحِصن',path:'chain',d:'هذا السطر لا ينكسر: البطاقة التي تقتله ترتدّ وتضيع وحدها.'},
};

/* ================= الوسوم — CARD MARKS ================= */
export const ENCH={
  /* A mark rides one card for the whole run, so it should change what that card IS. */
  watad:{n:'الوَتَد',d:'لا تُحتسب أبدًا: تعود إلى كومة الجولة بعد كل ختم.'},
  tawam:{n:'التَّوأم',d:'تُحسب بطاقتين: تملأ مقعدين، أو أصلين من الجذر.'},
  gold:{n:'ذهبي',d:'قيمة هذه البطاقة ×٣.'},
  anchor:{n:'مِرْساة',d:'السطر الذي فيه هذه البطاقة لا ينكسر.'},
  shahid:{n:'الشَّاهِد',d:'إن كانت زيادة: تُقبل في أي مقعد شئت، لا في مقعدها.'},
  glass:{n:'زجاجي',d:'الكلمة ×٢، ثم تنكسر البطاقة وتخرج من كيسك نهائيًّا.'},
};

/* ================= المُؤتلِفات — COMBOS ================= */
export const COMBOS=[
  {n:'المِصْنَع', parts:['row:rahim','relic:miraj'],
   d:'سطر الرَّحِم يُبقي الجذر، والمِعراج يضاعف كل ختم عليه: ذلك السطر وحده يصير مصنعًا.'},
  {n:'القالَب المِعْيار', parts:['relic:qalib','row:mizan'],
   d:'لا تختم إلا على وزن الجولة، وهو يدفع ×٥ و×٣ معًا — كل كلمة ضربة واحدة كبيرة.'},
  {n:'النَّحت الدائم', parts:['relic:naht','row:gold'],
   d:'الزوائد لا تُستهلَك وكل ختم يكلّف ديناريْن — وسطر الذهب يدفعهما ويزيد.'},
  {n:'الكَشْف المُلحَق', parts:['relic:kashf','relic:mulhaq'],
   d:'تختار الزيادة التي تريد وتضعها في المقعد الذي تريد: الوزن صار قرارًا لا قرعة.'},
  {n:'الصَّمت الراسخ', parts:['relic:samt','row:rahim'],
   d:'لا زوائد أصلًا والجذر العاري ×٦، وسطر الرَّحِم يُبقيه: تختمه مرة بعد مرة.'},
  {n:'الشَّجرة الراسخة', parts:['relic:shajara','relic:ablind'],
   d:'كل جذر جديد يدخل كيسك، وكلّها تُحسب كأنها في دفترك.'},
  {n:'الارتجال الحُرّ', parts:['relic:irtijal','relic:qalb'],
   d:'أي ترتيب يكوّن جذرًا، وأي تركيب عليه يُقبل: لم يبق للمعجم سلطان.'},
  {n:'المُسوَدّة الدائمة', parts:['relic:muswadda','relic:qalam'],
   d:'السطور لا تنكسر بل تصير حشوًا، وأصول ما ينكسر تعود: لا شيء يضيع منك.'},
  {n:'المرآتان', parts:['relic:qalb','tool:mirat'],
   d:'القلب يقبل أي ترتيب يكوّن جذرًا، والمرآة تقلب السطر لتبلغه.'},
  {n:'مِداد لا ينفد', parts:['relic:midad','row:mizan'],
   d:'الوزن يدفع ×٣ ويردّ الختم: على هذا السطر تختم بلا أن تُنقص حصّتك.'},
  {n:'الجذر الراسخ', parts:['relic:jinas','mark:watad'],
   d:'الوَتَد لا يُحتسب فيعود إليك كل ختم، والجِناس يجعل تكرار الجذر مجّانيًّا.'},
  {n:'المَشْتَل', parts:['relic:shajara','row:mashtal'],
   d:'كل جذر تختمه يدخل كيسك، وسطر المَشْتَل يضيفه إلى دفترك: الكيس يزرع نفسه.'},
  {n:'صَرْف العملة', parts:['char:tajir','row:gold'],
   d:'كل زيادة دينار وكل ختم ثلاثة: التاجر يشتري ذخيرته من كلماته.'},
  {n:'السِّنان', parts:['relic:misann','tool:isfinja'],
   d:'الإسفنجة شحنة واحدة، والمِسَنّ يردّها مع كل ختم: امسح ما شئت.'},
  {n:'الرباعي', parts:['relic:rihab','relic:qalb'],
   d:'أربعة أصول في السطر وأي ترتيب يُقبل: الجذور الرباعية كلها مفتوحة.'},
  {n:'الوزن الكامل', parts:['relic:idgham','relic:kashf'],
   d:'ثمانية مقاعد، وأنت تختار أي زيادة تملأ بها أيّها: الوزن صار نحتًا لا قرعة.'},
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
    progress:(S,has)=>S.notebook.reduce((a,x)=>a+x.lvl,0)+(has('ablind')?3:0)+(has('jinas')?2:0)+(has('shajara')?2:0),
    match:ctx=>!!ctx.nb},
  {id:'pattern',n:'الوزن',c:'var(--saffron)',
    d:'الزوائد التي تجمعها ترفع هذا المسار. كل كلمة فيها زيادة تكسب مضاعفًا يكبر معه.',
    progress:(S,has)=>S.bag.filter(c=>c.k==='a').length+(has('idgham')?3:0)+(has('kashf')?3:0)+(has('mulhaq')?2:0)+(has('nussakh')?2:0),
    match:ctx=>ctx.naff>0},
  {id:'chain',n:'السلسلة',c:'var(--crack)',
    d:'أعلى سلسلة بلغتها ترفع هذا المسار. كلمة تختمها وأنت في سلسلة تكسب مضاعفًا يكبر معه.',
    progress:(S,has)=>(S.stats.maxChain||0)+(has('qalam')?3:0)+(has('khayt')?3:0)+(has('qafiya')?2:0)+(has('muswadda')?2:0),
    match:ctx=>ctx.chain>=2},
  {id:'bag',n:'الكيس',c:'var(--violet)',
    d:'البطاقات المنقوشة وقلّة الجذور ترفعان هذا المسار.',
    progress:(S,has)=>S.bag.filter(c=>c.ench).length*2+(S.roots.length<=3?4:0)+(has('shajara')?3:0)+(has('waqf')?2:0),
    match:ctx=>ctx.bagFlavor},
];
export const pathLvl=p=>Math.min(5,Math.floor(p/3));
