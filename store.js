/* ============================================================
   一字一世界 — shared progress store
   One source of truth for starred words and known words across
   every page. Inlined into each page by the build step.
   ============================================================ */
const YZYG = (function(){
  const STAR_KEY='yzyg-stars-v1';
  const KNOWN_KEY='yzyg-known-v1';
  const MISSED_KEY='yzyg-missed-v1';
  const SEEN_KEY='yzyg-seen-v1';

  /* legacy keys from before the stores were unified */
  const LEGACY_STARS=['manmandu-review-v1','yzyg-int-review-v1'];
  const LEGACY_SEEN=['yzyg-int-collected-v1'];

  function readSet(key){
    try{ const raw=localStorage.getItem(key); return raw?new Set(JSON.parse(raw)):new Set(); }
    catch(e){ return new Set(); }
  }
  function writeSet(key,set){
    try{ localStorage.setItem(key, JSON.stringify([...set])); }catch(e){}
  }

  let stars=readSet(STAR_KEY);
  let known=readSet(KNOWN_KEY);
  let missed=readSet(MISSED_KEY);
  let seen=readSet(SEEN_KEY);

  /* one-time migration: fold the old per-page lists into the unified ones */
  (function migrate(){
    let changed=false;
    LEGACY_STARS.forEach(k=>{
      const old=readSet(k);
      if(old.size){ old.forEach(w=>stars.add(w)); changed=true; try{ localStorage.removeItem(k); }catch(e){} }
    });
    LEGACY_SEEN.forEach(k=>{
      const old=readSet(k);
      if(old.size){ old.forEach(w=>seen.add(w)); try{ localStorage.removeItem(k); }catch(e){} }
    });
    if(changed) writeSet(STAR_KEY,stars);
    writeSet(SEEN_KEY,seen);
  })();

  /* listeners so open panels can refresh when something changes */
  const listeners=new Set();
  function notify(){ listeners.forEach(fn=>{ try{ fn(); }catch(e){} }); }

  /* keep multiple open tabs in sync */
  window.addEventListener('storage',e=>{
    if(e.key===STAR_KEY){ stars=readSet(STAR_KEY); notify(); }
    if(e.key===KNOWN_KEY){ known=readSet(KNOWN_KEY); notify(); }
    if(e.key===MISSED_KEY){ missed=readSet(MISSED_KEY); notify(); }
    if(e.key===SEEN_KEY){ seen=readSet(SEEN_KEY); notify(); }
  });

  return {
    /* ---- starred ---- */
    isStarred: w=>stars.has(w),
    stars: ()=>stars,
    starCount: ()=>stars.size,
    toggleStar(w){
      if(stars.has(w)) stars.delete(w); else stars.add(w);
      writeSet(STAR_KEY,stars); notify();
      return stars.has(w);
    },
    setStar(w,on){
      if(on) stars.add(w); else stars.delete(w);
      writeSet(STAR_KEY,stars); notify();
    },

    /* ---- known ---- */
    isKnown: w=>known.has(w),
    known: ()=>known,
    knownCount: ()=>known.size,
    markKnown(w){ if(!known.has(w)){ known.add(w); writeSet(KNOWN_KEY,known); notify(); } },
    unmarkKnown(w){ if(known.has(w)){ known.delete(w); writeSet(KNOWN_KEY,known); notify(); } },
    toggleKnown(w){ known.has(w)?known.delete(w):known.add(w); writeSet(KNOWN_KEY,known); notify(); return known.has(w); },

    /* ---- missed (most recent attempt, in the game or flashcards, was wrong) ---- */
    isMissed: w=>missed.has(w),
    missed: ()=>missed,
    missedCount: ()=>missed.size,
    markMissed(w){ if(!missed.has(w)){ missed.add(w); writeSet(MISSED_KEY,missed); notify(); } },
    unmarkMissed(w){ if(missed.has(w)){ missed.delete(w); writeSet(MISSED_KEY,missed); notify(); } },

    /* ---- seen (words encountered while reading) ---- */
    isSeen: w=>seen.has(w),
    seen: ()=>seen,
    seenCount: ()=>seen.size,
    markSeen(words){
      let added=false;
      (Array.isArray(words)?words:[words]).forEach(w=>{ if(w && !seen.has(w)){ seen.add(w); added=true; } });
      if(added){ writeSet(SEEN_KEY,seen); notify(); }
      return added;
    },
    flushSeen(){ writeSet(SEEN_KEY,seen); },

    onChange(fn){ listeners.add(fn); return ()=>listeners.delete(fn); },

    /* ---- backup / restore ----
       Exports everything as one JSON payload. Also available as a compact
       base64 code so progress can move between devices by copy-paste. */
    exportData(){
      return {
        v:1,
        app:'yzyg',
        exported:new Date().toISOString(),
        stars:[...stars],
        known:[...known],
        missed:[...missed],
        seen:[...seen],
        progress:{
          reader: (()=>{ try{ return JSON.parse(localStorage.getItem('manmandu-progress-v1')||'null'); }catch(e){ return null; } })(),
          novel:  (()=>{ try{ return JSON.parse(localStorage.getItem('yzyg-int-progress-v1')||'null'); }catch(e){ return null; } })()
        },
        best: parseInt(localStorage.getItem('yzyg-best')||'0',10)||0
      };
    },
    exportCode(){
      /* base64 of the UTF-8 JSON — safe to paste anywhere */
      const json=JSON.stringify(this.exportData());
      const bytes=new TextEncoder().encode(json);
      let bin=''; bytes.forEach(b=>bin+=String.fromCharCode(b));
      return btoa(bin);
    },
    importData(obj,{merge=true}={}){
      if(!obj || obj.app!=='yzyg') throw new Error('This does not look like a 一字一世界 backup.');
      if(!merge){ stars=new Set(); known=new Set(); missed=new Set(); seen=new Set(); }
      (obj.stars||[]).forEach(w=>stars.add(w));
      (obj.known||[]).forEach(w=>known.add(w));
      (obj.missed||[]).forEach(w=>missed.add(w));
      (obj.seen ||[]).forEach(w=>seen.add(w));
      writeSet(STAR_KEY,stars); writeSet(KNOWN_KEY,known); writeSet(MISSED_KEY,missed); writeSet(SEEN_KEY,seen);
      try{
        if(obj.progress&&obj.progress.reader) localStorage.setItem('manmandu-progress-v1',JSON.stringify(obj.progress.reader));
        if(obj.progress&&obj.progress.novel)  localStorage.setItem('yzyg-int-progress-v1',JSON.stringify(obj.progress.novel));
        if(obj.best) localStorage.setItem('yzyg-best',String(Math.max(obj.best, parseInt(localStorage.getItem('yzyg-best')||'0',10)||0)));
      }catch(e){}
      notify();
      return {stars:stars.size, known:known.size, missed:missed.size, seen:seen.size};
    },
    importCode(code,opts){
      const bin=atob(String(code).trim());
      const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
      const json=new TextDecoder().decode(bytes);
      return this.importData(JSON.parse(json),opts);
    },
    clearAll(){
      stars=new Set(); known=new Set(); missed=new Set(); seen=new Set();
      try{
        [STAR_KEY,KNOWN_KEY,MISSED_KEY,SEEN_KEY,'manmandu-progress-v1','yzyg-int-progress-v1'].forEach(k=>localStorage.removeItem(k));
      }catch(e){}
      notify();
    }
  };
})();
