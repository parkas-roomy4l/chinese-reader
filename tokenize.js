/* Greedy longest-match tokenizer + validator.
   Write story as plain Chinese prose; this splits it into vocabulary tokens
   and reports any character not covered by the vocabulary. */
const fs=require('fs');

function loadVocab(){
  // canonical list — run build-vocab.js first
  return JSON.parse(fs.readFileSync(__dirname+'/vocab-1000.json','utf8'));
}

const PUNCT=new Set(['，','。','！','？','：','；','、','…','—','「','」','『','』','（','）','《','》','·','“','”','‘','’',' ','\n']);

function tokenizeLine(line, V, maxLen=4){
  const out=[]; let i=0;
  while(i<line.length){
    const ch=line[i];
    if(PUNCT.has(ch)){ out.push(ch); i++; continue; }
    let matched=null;
    for(let L=Math.min(maxLen, line.length-i); L>=1; L--){
      const cand=line.slice(i,i+L);
      if(V[cand]){ matched=cand; break; }
    }
    if(matched){ out.push(matched); i+=matched.length; }
    else { out.push(ch); i++; }   // unknown — validator will flag it
  }
  return out;
}

function validate(tokens, V){
  const bad=[];
  tokens.forEach(t=>{
    if(PUNCT.has(t)) return;
    if(!V[t]) bad.push(t);
  });
  return bad;
}

module.exports={loadVocab, tokenizeLine, validate, PUNCT};

/* CLI: node tokenize.js story-int.txt  -> writes story-int.json, reports gaps */
if(require.main===module){
  const V=loadVocab();
  const file=process.argv[2]||'story-int.txt';
  const raw=fs.readFileSync(__dirname+'/'+file,'utf8');
  // parallel English file — one line per Chinese paragraph
  let EN=[];
  const enFile=__dirname+'/'+file.replace(/\.txt$/,'-en.txt');
  if(fs.existsSync(enFile)) EN=fs.readFileSync(enFile,'utf8').split('\n').filter(l=>l.trim());
  const out=[]; const gaps={}; let nLines=0;

  raw.split('\n').forEach(rawLine=>{
    const line=rawLine.trim();
    if(!line) return;
    if(line.startsWith('##')){                       // chapter marker: ## 汉字|pinyin|English
      const [ch,cp,en]=line.slice(2).trim().split('|').map(s=>s.trim());
      out.push({ch,cp,en});
      return;
    }
    if(line.startsWith('#')) return;                 // comment
    const toks=tokenizeLine(line,V);
    validate(toks,V).forEach(t=>gaps[t]=(gaps[t]||0)+1);
    out.push({p:toks, en:EN[nLines]||''});           // paragraph of tokens + translation
    nLines++;
  });

  fs.writeFileSync(__dirname+'/story-int.json', JSON.stringify(out));
  const gapList=Object.entries(gaps).sort((a,b)=>b[1]-a[1]);
  console.log('vocab size:', Object.keys(V).length);
  console.log('paragraphs:', nLines, '| chapters:', out.filter(x=>x.ch).length);
  if(EN.length && EN.length!==nLines){
    console.log('\n\u26a0 TRANSLATION MISALIGNMENT: ' + EN.length + ' English lines vs ' + nLines + ' paragraphs');
  } else if(EN.length){
    console.log('\u2713 ' + EN.length + ' translations aligned');
  } else {
    console.log('\u26a0 no translation file found');
  }
  if(gapList.length){
    console.log('\n⚠ UNCOVERED CHARACTERS (' + gapList.length + ' distinct):');
    console.log('  ' + gapList.map(([t,n])=>t+'×'+n).join('  '));
  } else {
    console.log('\n✓ every character covered by the vocabulary');
  }
}
