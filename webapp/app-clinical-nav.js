'use strict';

const __clinicalInitialHash=location.hash.replace('#','');
const __baseTabIcon=tabIcon;
tabIcon=function(name){
 if(name==='clinical')return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18"/><path d="M7 7h10v10H7z"/></svg>';
 return __baseTabIcon(name);
};

tabs=function(){
 const items=[['journal','Journal'],['substances','Substances'],['clinical','Clinical'],['safer','Safer'],['settings','Settings']];
 $('#tabbar').innerHTML=items.map(([id,label])=>`<button class="tab ${currentTab===id?'active':''}" data-tab="${id}">${tabIcon(id)}<span>${label}</span></button>`).join('');
};

renderTab=function(tab){
 currentTab=tab;location.hash=tab;navStack=[];tabs();
 if(tab==='journal')renderJournal();
 else if(tab==='substances')renderSearch();
 else if(tab==='clinical')renderClinicalHub();
 else if(tab==='safer')renderSafer();
 else if(tab==='stats')renderStats();
 else renderSettings();
};

window.addEventListener('hashchange',()=>{const t=location.hash.replace('#','');if(t==='clinical'&&currentTab!=='clinical')renderTab('clinical')});
window.addEventListener('load',()=>{if(__clinicalInitialHash==='clinical')renderTab('clinical')});
