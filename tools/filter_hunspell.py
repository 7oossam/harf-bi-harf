import time,re,sys
from spylls.hunspell import Dictionary
d=Dictionary.from_files('dic/ar')
ok=re.compile(r'^[ابتثجحخدذرزسشصضطظعغفقكلمنهويةىأإآءؤئ]{2,8}$')
words=[]
for i,l in enumerate(open('arfull.txt',encoding='utf8')):
    if i>=int(sys.argv[1]): break
    w,c=l.split()
    if ok.match(w): words.append((w,int(c)))
t=time.time(); good=[]
for w,c in words:
    try:
        if d.lookup(w): good.append((w,c))
    except Exception: pass
print(len(words),len(good),time.time()-t)
open('good_%s.txt'%sys.argv[1],'w').write('\n'.join(f'{w} {c}' for w,c in good))
