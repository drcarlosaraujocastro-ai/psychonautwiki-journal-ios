'use strict';

/* Final navigation bootstrap. Loaded after the legacy Journal scripts so the
 * Clinical workspace cannot be overwritten by the original 5-tab router. */
(function(){
  const clinicalIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18"/><path d="M7 7h10v10H7z"/></svg>';
  const baseTabIcon=typeof tabIcon==='function'?tabIcon:null;
  window.tabIcon=function(name){
    if(name==='clinical')return clinicalIcon;
    return baseTabIcon?baseTabIcon(name):'<svg viewBox="0 0 24 24" aria-hidden="true"></svg>';
  };

  window.tabs=function(){
    const items=[['journal','Journal'],['substances','Substances'],['clinical','Clinical'],['safer','Safer'],['settings','Settings']];
    const el=document.querySelector('#tabbar');
    if(!el)return;
    el.innerHTML=items.map(([id,label])=>`<button class="tab ${currentTab===id?'active':''}" data-tab="${id}">${window.tabIcon(id)}<span>${label}</span></button>`).join('');
  };

  window.renderTab=function(tab){
    currentTab=tab;
    location.hash=tab;
    navStack=[];
    window.tabs();
    if(tab==='journal')renderJournal();
    else if(tab==='substances')renderSearch();
    else if(tab==='clinical'&&typeof renderClinicalHub==='function')renderClinicalHub();
    else if(tab==='safer')renderSafer();
    else if(tab==='stats')renderStats();
    else renderSettings();
  };

  // Capture clicks in case an older handleClick/router was restored from cache.
  document.addEventListener('click',function(e){
    const t=e.target.closest('[data-tab="clinical"]');
    if(!t)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    window.renderTab('clinical');
  },true);

  // Ensure the visible bar is corrected after startup / BFCache restoration.
  const refresh=()=>{try{window.tabs();if(location.hash.replace('#','')==='clinical')window.renderTab('clinical')}catch(err){console.warn('clinical nav bootstrap',err)}};
  window.addEventListener('load',()=>setTimeout(refresh,0));
  window.addEventListener('pageshow',()=>setTimeout(refresh,0));
  setTimeout(refresh,0);
})();
