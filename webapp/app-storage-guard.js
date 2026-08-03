'use strict';

/* iOS browser vs Home Screen web apps can have separate storage containers.
 * This module makes that visible and provides rescue/export/recovery paths.
 */
(function(){
  const RECOVERY_KEY='recovery-latest';
  function counts(s=state){const exps=s?.experiences||[];return {experiences:exps.length,ingestions:exps.reduce((n,e)=>n+(e.ingestions||[]).length,0),custom:(s?.customSubstances||[]).length}}
  async function writeRecoverySnapshot(reason='manual'){
    const db=await openDB();const snapshot={savedAt:Date.now(),reason,state:structuredClone?structuredClone(state):JSON.parse(JSON.stringify(state))};
    return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(snapshot,RECOVERY_KEY);tx.oncomplete=()=>resolve(snapshot);tx.onerror=()=>reject(tx.error)});
  }
  async function readRecoverySnapshot(){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get(RECOVERY_KEY);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}
  async function restoreRecoverySnapshot(){const snap=await readRecoverySnapshot();if(!snap?.state){toast('No recovery snapshot available');return}const c=counts(snap.state);if(!confirm(`Restore recovery snapshot with ${c.experiences} experience(s) and ${c.ingestions} ingestion(s)? Current state will be replaced.`))return;state=migrateState(snap.state);await saveState();toast('Recovery snapshot restored');renderTab('journal')}
  function storageGuardHTML(){
    const c=counts(),standalone=typeof isStandalone==='function'&&isStandalone();
    const mode=standalone?'Home Screen app':'Safari / browser';
    const warning=(!standalone&&typeof isIOS==='function'&&isIOS())?`<div class="section-caption">iPhone storage warning</div><div class="card alert-card uncertain"><strong>Browser and Home Screen app can use separate storage</strong><div class="safer-text" style="margin-top:8px">If records are missing in Safari, do not delete the Home Screen Journal. Open the Home Screen app first, export the Journal there, then import that file here.</div></div>`:'';
    return `${warning}<div class="section-caption">Storage diagnostics</div><div class="card"><div class="kv"><span>Current container</span><b>${mode}</b></div><div class="kv"><span>Experiences in this container</span><b>${c.experiences}</b></div><div class="kv"><span>Ingestions in this container</span><b>${c.ingestions}</b></div><div class="kv"><span>Database</span><b>pwj-web-db / state / main</b></div><button class="linkrow" data-storage-action="rescue-export">Export rescue backup now</button><button class="linkrow" data-storage-action="save-recovery">Save internal recovery snapshot</button><button class="linkrow" data-storage-action="restore-recovery">Restore latest recovery snapshot</button></div><div class="section-footer">Before every JSON import the app now saves an internal pre-import recovery snapshot automatically.</div>`;
  }
  function inject(){const screen=document.querySelector('#screen');if(!screen||document.querySelector('#storage-guard-block'))return;const block=document.createElement('div');block.id='storage-guard-block';block.innerHTML=storageGuardHTML();const first=screen.querySelector('.section-caption');if(first)screen.insertBefore(block,first);else screen.prepend(block)}
  if(typeof window.renderSettings==='function'){const base=window.renderSettings;window.renderSettings=function(){base();inject()}}
  document.addEventListener('click',async e=>{
    const t=e.target.closest('[data-storage-action]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();
    try{if(t.dataset.storageAction==='rescue-export'){await exportJournal();toast('Rescue backup prepared')}else if(t.dataset.storageAction==='save-recovery'){const s=await writeRecoverySnapshot('manual');const c=counts(s.state);toast(`Recovery saved · ${c.experiences} experiences`)}else if(t.dataset.storageAction==='restore-recovery'){await restoreRecoverySnapshot()}}catch(err){console.error(err);toast('Storage recovery action failed')}
  },true);
  document.addEventListener('change',async e=>{if(e.target?.id!=='import-file'||!e.target.files?.[0])return;try{await writeRecoverySnapshot('pre-import');toast('Pre-import recovery snapshot saved')}catch(err){console.error('pre-import recovery failed',err)}},true);
  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-action="reset"]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();const c=counts();const typed=prompt(`This will erase ${c.experiences} experience(s) and ${c.ingestions} ingestion(s) from THIS storage container. Type DELETE to continue.`);if(typed!=='DELETE'){toast('Deletion cancelled');return}(async()=>{try{await writeRecoverySnapshot('pre-delete')}catch(err){}state=defaultState();await saveState();applyTheme();renderSettings();toast('Local journal erased · recovery snapshot kept')})()
  },true);
  window.StorageGuard={writeRecoverySnapshot,readRecoverySnapshot,restoreRecoverySnapshot};
})();
