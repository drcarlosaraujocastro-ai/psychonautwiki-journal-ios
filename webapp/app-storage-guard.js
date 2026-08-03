'use strict';

/* iOS browser vs Home Screen web apps can have separate storage containers.
 * This module makes that visible and provides an immediate rescue/export path.
 */
(function(){
  function counts(){
    const exps=state?.experiences||[];
    return {experiences:exps.length,ingestions:exps.reduce((n,e)=>n+(e.ingestions||[]).length,0),custom:(state?.customSubstances||[]).length};
  }
  function storageGuardHTML(){
    const c=counts(),standalone=typeof isStandalone==='function'&&isStandalone();
    const mode=standalone?'Home Screen app':'Safari / browser';
    const warning=(!standalone&&typeof isIOS==='function'&&isIOS())?`<div class="section-caption">iPhone storage warning</div><div class="card alert-card uncertain"><strong>Browser and Home Screen app can use separate storage</strong><div class="safer-text" style="margin-top:8px">If records are missing in Safari, do not delete the Home Screen Journal. Open the Home Screen app first, export the Journal there, then import that file here.</div></div>`:'';
    return `${warning}<div class="section-caption">Storage diagnostics</div><div class="card"><div class="kv"><span>Current container</span><b>${mode}</b></div><div class="kv"><span>Experiences in this container</span><b>${c.experiences}</b></div><div class="kv"><span>Ingestions in this container</span><b>${c.ingestions}</b></div><div class="kv"><span>Database</span><b>pwj-web-db / state / main</b></div><button class="linkrow" data-storage-action="rescue-export">Export rescue backup now</button></div>`;
  }
  function inject(){
    const screen=document.querySelector('#screen');
    if(!screen||document.querySelector('#storage-guard-block'))return;
    const block=document.createElement('div');block.id='storage-guard-block';block.innerHTML=storageGuardHTML();
    const first=screen.querySelector('.section-caption');
    if(first)screen.insertBefore(block,first);else screen.prepend(block);
  }
  if(typeof window.renderSettings==='function'){
    const base=window.renderSettings;
    window.renderSettings=function(){base();inject()};
  }
  document.addEventListener('click',async e=>{
    const t=e.target.closest('[data-storage-action="rescue-export"]');
    if(!t)return;
    e.preventDefault();e.stopImmediatePropagation();
    try{await exportJournal();toast('Rescue backup prepared')}catch(err){console.error(err);toast('Could not export backup')}
  },true);
  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-action="reset"]');if(!t)return;
    e.preventDefault();e.stopImmediatePropagation();
    const c=counts();
    const typed=prompt(`This will erase ${c.experiences} experience(s) and ${c.ingestions} ingestion(s) from THIS storage container. Type DELETE to continue.`);
    if(typed!=='DELETE'){toast('Deletion cancelled');return}
    (async()=>{state=defaultState();await saveState();applyTheme();renderSettings();toast('Local journal erased')})();
  },true);
})();
