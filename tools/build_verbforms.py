import sqlite3,re,json,time
from libqutrub import classverb
c=sqlite3.connect('/usr/local/lib/python3.11/dist-packages/arramooz/data/arabicdictionary.sqlite')
H={'فتحة':'َ','ضمة':'ُ','كسرة':'ِ'}
cl=lambda w:re.sub('[ً-ْ]','',w or '')
vf={};t=time.time();bad=0
EXTRA=[('كَانَ','ضمة',0,'كون'),('وَثِقَ','كسرة',1,'وثق'),('صَارَ','كسرة',0,'صير'),('ظَلَّ','فتحة',0,'ظلل'),('بَاتَ','كسرة',0,'بيت'),('زَالَ','فتحة',0,'زول'),('عَاشَ','كسرة',0,'عيش'),('طَالَ','ضمة',0,'طول'),('صَرَخَ','ضمة',0,'صرخ'),('نَمَا','ضمة',0,'نمو'),('خَطَا','ضمة',0,'خطو'),('غَدَا','ضمة',0,'غدو'),('عَشِقَ','فتحة',1,'عشق'),('نَبَحَ','فتحة',0,'نبح'),('قَبَعَ','فتحة',0,'قبع'),('هَطَلَ','كسرة',0,'هطل'),('بَزَغَ','ضمة',0,'بزغ'),('سَطَا','ضمة',0,'سطو'),('فَارَ','ضمة',0,'فور'),('خَلَا','ضمة',0,'خلو'),('نَبَضَ','كسرة',0,'نبض'),('مَاتَ','ضمة',0,'موت')]
for voc,ft,tr,root in EXTRA+c.execute('select vocalized,future_type,transitive,root from verbs').fetchall():
    try:
        v=classverb.VerbClass(voc,bool(tr),H.get(ft,ft or 'َ')); v.conjugate_all_tenses()
        for tense,prons in v.conj_display.tab_conjug.items():
            common = tense in ('الماضي المعلوم','المضارع المعلوم','المضارع المنصوب')
            for p,f in prons.items():
                if f:
                    w=cl(f)
                    if not (2<=len(w)<=8): continue
                    if len(w)<=3 and (not common or p not in ('أنا','أنت','أنتِ','هو','هي','نحن')): continue
                    if len(w)==4 and tense in ('الأمر','الأمر المؤكد','المضارع المجزوم','المضارع المجهول المجزوم'): continue
                    if w not in vf: vf[w]=cl(root)
    except Exception as e: bad+=1
print(len(vf),bad,time.time()-t)
json.dump(vf,open('vf.json','w'),ensure_ascii=False)
