'use strict';

/* Final navigation bootstrap. Loaded after the legacy Journal scripts so the
 * Clinical and Workout workspaces cannot be overwritten by the original router. */
(function(){
  const clinicalIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18"/><path d="M7 7h10v10H7z"/></svg>';
  const workoutIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/></svg>';
  const baseTabIcon=typeof tabIcon==='function'?tabIcon:null;
  window.tabIcon=function(name){if(name==='clinical')return clinicalIcon;if(name==='workout')return workoutIcon;return baseTabIcon?baseTabIcon(name):'<svg viewBox="0 0 24 24" aria-hidden="true"></svg>'};
  window.tabs=function(){const items=[['journal','Journal'],['substances','Substances'],['clinical','Clinical'],['workout','Treino'],['safer','Safer'],['settings','Settings']],el=document.querySelector('#tabbar');if(!el)return;el.innerHTML=items.map(([id,label])=>`<button class="tab ${currentTab===id?'active':''}" data-tab="${id}">${window.tabIcon(id)}<span>${label}</span></button>`).join('')};
  window.renderTab=function(tab){currentTab=tab;location.hash=tab;navStack=[];window.tabs();if(tab==='journal')renderJournal();else if(tab==='substances')renderSearch();else if(tab==='clinical'&&typeof renderClinicalHub==='function')renderClinicalHub();else if(tab==='workout'&&typeof renderWorkoutHub==='function')renderWorkoutHub();else if(tab==='safer')renderSafer();else if(tab==='stats')renderStats();else renderSettings()};
  document.addEventListener('click',function(e){const t=e.target.closest('[data-tab="clinical"],[data-tab="workout"]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();window.renderTab(t.dataset.tab)},true);
  const refresh=()=>{try{window.tabs();const h=location.hash.replace('#','');if(h==='clinical'||h==='workout')window.renderTab(h)}catch(err){console.warn('workspace nav bootstrap',err)}};
  const st=document.createElement('style');st.textContent='#tabbar{grid-template-columns:repeat(6,1fr)!important}.tab{font-size:9px!important}.tab svg{width:22px!important;height:22px!important}';document.head.appendChild(st);
  window.addEventListener('load',()=>setTimeout(refresh,0));window.addEventListener('pageshow',()=>setTimeout(refresh,0));setTimeout(refresh,0);
})();
