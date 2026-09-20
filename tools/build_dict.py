import json,re,gzip,base64,sqlite3
from nltk.stem.isri import ISRIStemmer
isri=ISRIStemmer()
def norm(w):
    w=re.sub('[ً-ْـ]','',w)
    return re.sub('[أإآٱ]','ا',w).replace('ى','ي').replace('ؤ','ء').replace('ئ','ء')
lx=json.load(open('lex.json')); vf=json.load(open('vf.json'))
CORE={}; NOUNS=set()
for w,r in lx['lem'].items():
    n=norm(w); CORE.setdefault(n,norm(r) if r else None); NOUNS.add(n)
# verbs in lem table too (mixed) — fine
for w in lx['stops']: CORE.setdefault(norm(w),None)
for w,r in vf.items():
    if len(norm(w))>=3: CORE.setdefault(norm(w),norm(r) if r else None)
for w in 'يا خذ ثق زد قف كن دع كل قل عد'.split(): CORE.setdefault(w,None)
for w in open('rescue.txt',encoding='utf8').read().split():
    n=norm(w); r=norm(isri.stem(w)); CORE.setdefault(n, r if len(r)==3 else None)
    if n not in lx['lem']: lx['lem'][w]=r if len(r)==3 else ''
SHORTN=set('يد فم دم اب اخ ام حق جد عم خد حب سر ضد ظن حظ خط صف كف مخ حد رد عد من ما لا'.split())
PRO=sorted('و ف ب ل ك س وب ول وك فب فل فك وس فس ال وال فال بال كال لل ولل فلل'.split(),key=len,reverse=True)
ENC=sorted('ه ها هم هما هن ك كم كما كن ي ني نا'.split(),key=len,reverse=True)
NSUF=sorted('ون ين ات ان تان تين ة ي ية'.split(),key=len,reverse=True)
def derive(w):
    if w in CORE: return (True,CORE[w])
    cands=[w]
    for p in PRO:
        if w.startswith(p) and len(w)-len(p)>=2:
            x=w[len(p):]
            if p[-1] in 'بلك' or p.endswith('ال') or p=='لل':
                if x not in NOUNS: continue
            if len(x)<3 and x not in SHORTN: continue
            if p[-1]=='س' and x[0] not in 'يتنا': continue
            cands.append(x)
    for x in cands:
        if x in CORE: return (True,CORE[x])
        for e in ENC+NSUF:
            if x.endswith(e) and len(x)-len(e)>=2:
                y=x[:-len(e)]
                if y in CORE and (len(y)>=3 or y in SHORTN): return (True,CORE[y])
                # taa marbuta becomes ت before enclitic
                if y.endswith('ت') and (y[:-1]+'ة') in CORE: return (True,CORE[y[:-1]+'ة'])
    return (False,None)
bad='نيك|منيوك|كس|كسك|زب|زبي|طيز|عاهر|عاهرة|عاهرا|عاهرات|قحب|قحبة|شرموط|شرموطة|شراميط|لوطي|خول|متناك|منيوكة|زانية|داعر|داعرة|عرص|معرص|مومس'
badre=re.compile(r'^(و|ف|ب|ل|ال|وال|بال|فال|لل|يا)?('+bad+r')(ك|ه|ها|ي|نا|كم|هم|ات|ين|ون|ة)?$')
def ok_bad(w): return badre.match(w) or any(s in w for s in ('عاهر','قحب','شرموط','منيوك'))
freq=[l.split()[0] for l in open('good_400000.txt',encoding='utf8')]
out={}  # norm -> (display, root)
stat={'A':0,'C':0,'rej':0}
rej=[]
for w in freq:
    n=norm(w)
    if n in out or not(2<=len(n)<=8) or ok_bad(n): continue
    good,r=derive(n)
    if good: stat['A']+=1
    elif len(n)>=5: 
        stat['C']+=1
        s=norm(isri.stem(w)); i=0
        for ch in n:
            if i<3 and len(s)==3 and ch==s[i]: i+=1
        r=s if i==3 else None
    else: stat['rej']+=1; rej.append(w); continue
    out[n]=(w,r)
# add lexicon lemmas & short verb forms & ال+noun
extra=0
for w,r in list(lx['lem'].items()):
    n=norm(w)
    if 2<=len(n)<=8 and n not in out and not ok_bad(n): out[n]=(w,norm(r) if r else None); extra+=1
    a='ال'+n
    if len(a)<=8 and not n.startswith('ال') and a not in out and not ok_bad(a): out[a]=('ال'+w,norm(r) if r else None); extra+=1
for w in lx['stops']:
    n=norm(w)
    if 2<=len(n)<=8 and n not in out: out[n]=(w,None); extra+=1
for w,r in vf.items():
    n=norm(w)
    if 2<=len(n)<=6 and n not in out: out[n]=(w,norm(r) if r else None); extra+=1
print(stat,extra,len(out))
print('rejected sample:',' '.join(rej[:150]))
lines=[out[n][0]+(' '+out[n][1] if out[n][1] and len(out[n][1])==3 else '') for n in sorted(out)]
txt='\n'.join(lines); gz=gzip.compress(txt.encode(),9)
open('dict2.b64','w').write(base64.b64encode(gz).decode())
print(len(gz), sum(1 for l in lines if ' ' in l))
json.dump(sorted(out),open('dictnorm.json','w'),ensure_ascii=False)
