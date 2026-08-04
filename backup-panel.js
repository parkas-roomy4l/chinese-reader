/* ---------- backup / restore ---------- */
(function(){
  const $=s=>document.querySelector(s);
  const note=$('#bkNote'), stats=$('#bkStats');
  if(!note) return;
  const DEFAULT_NOTE='Your stars and known words live in this browser only. Back them up to move to another device.';

  function refresh(){
    if(stats) stats.innerHTML=
      `<b>${YZYG.starCount()}</b> starred &nbsp;·&nbsp; <b>${YZYG.knownCount()}</b> known &nbsp;·&nbsp; <b>${YZYG.seenCount()}</b> read`;
  }
  refresh();
  YZYG.onChange(refresh);

  let noteTimer=null;
  function say(msg,ms=4000){
    clearTimeout(noteTimer);
    note.textContent=msg;
    noteTimer=setTimeout(()=>{ note.textContent=DEFAULT_NOTE; },ms);
  }

  $('#bkDownload').addEventListener('click',()=>{
    const data=YZYG.exportData();
    const blob=new Blob([JSON.stringify(data,null,1)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const d=new Date().toISOString().slice(0,10);
    a.href=url; a.download=`yizi-progress-${d}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    say('Saved. Keep the file somewhere safe — you can restore it on any device.');
  });

  $('#bkCode').addEventListener('click',async ()=>{
    const code=YZYG.exportCode();
    try{
      await navigator.clipboard.writeText(code);
      say('Transfer code copied. Paste it into Restore on your other device.');
    }catch(e){
      window.prompt('Copy your transfer code:', code);
    }
  });

  $('#bkRestore').addEventListener('click',()=>{
    const code=window.prompt(
      'Paste a transfer code to restore your progress.\n\n' +
      'Leave this empty and press OK to pick a backup file instead.');
    if(code===null) return;
    if(!code.trim()){ $('#bkFile').click(); return; }
    try{
      const r=YZYG.importCode(code);
      say(`Restored — ${r.stars} starred, ${r.known} known, ${r.seen} read.`,6000);
      setTimeout(()=>location.reload(),1200);
    }catch(e){
      say('That code could not be read. Check it was copied in full.',6000);
    }
  });

  $('#bkFile').addEventListener('change',e=>{
    const f=e.target.files&&e.target.files[0];
    if(!f) return;
    const fr=new FileReader();
    fr.onload=()=>{
      try{
        const r=YZYG.importData(JSON.parse(fr.result));
        say(`Restored — ${r.stars} starred, ${r.known} known, ${r.seen} read.`,6000);
        setTimeout(()=>location.reload(),1200);
      }catch(err){
        say('That file could not be read as a backup.',6000);
      }
    };
    fr.onerror=()=>say('Could not read that file.',6000);
    fr.readAsText(f);
    e.target.value='';
  });
})();
