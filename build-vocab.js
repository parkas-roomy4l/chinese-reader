/* Builds the canonical word list: exactly 1,000 teachable words (+ names).
   Level tags collapse to four bands: HSK 1, HSK 2, HSK 3, essential.
   Run: node build-vocab.js  ->  vocab-1000.json */
const fs=require('fs');
const D=__dirname;

function readObj(file){
  const src=fs.readFileSync(D+'/'+file,'utf8');
  return eval('('+src.replace(/^\/\*[\s\S]*?\*\/\s*/,'').replace(/^const \w+=/,'').replace(/;\s*$/,'')+')');
}

const V=JSON.parse(fs.readFileSync(D+'/vocab-508.json','utf8'));
for(const f of ['vocab-hsk3.js','vocab-story.js','vocab-names.js','vocab-reader.js','vocab-final.js']){
  const obj=readObj(f);
  for(const [k,val] of Object.entries(obj)) if(!V[k]) V[k]=val;   // never overwrite
}

/* collapse the working tags into four learner-facing bands + names */
const REMAP={'bonus':'bonus','HSK 1':'HSK 1','HSK 2':'HSK 2','HSK 3':'HSK 3',
             'HSK 3+':'essential','story':'essential','reader':'essential',
             'essential':'essential','name':'name'};
for(const k of Object.keys(V)) V[k].l=REMAP[V[k].l]||'essential';

const counts={};
Object.values(V).forEach(v=>counts[v.l]=(counts[v.l]||0)+1);
const teachable=Object.values(V).filter(v=>v.l!=='name').length;

console.log('level counts:', counts);
console.log('teachable words (excluding names):', teachable);
console.log('names:', counts['name']||0);
if(teachable!==1000) console.log('⚠ NOT 1000 — off by', teachable-1000);
else console.log('✓ exactly 1,000 words');

fs.writeFileSync(D+'/vocab-1000.json', JSON.stringify(V));
fs.writeFileSync(D+'/vocab-1000.pretty.json', JSON.stringify(V,null,1));
