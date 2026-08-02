'use strict';

const DB_NAME='pwj-web-db';
const DB_VERSION=2;
const STORE='state';
const STATE_KEY='main';
const COLORS={BLUE:'#007aff',PINK:'#ff2d55',GREEN:'#34c759',YELLOW:'#ffcc00',PURPLE:'#af52de',ORANGE:'#ff9500',RED:'#ff3b30',TEAL:'#5ac8fa',INDIGO:'#5856d6',MINT:'#00c7be',CYAN:'#32ade6',BROWN:'#a2845e',GRAY:'#8e8e93'};
const ROUTES=['ORAL','SUBLINGUAL','BUCCAL','INSUFFLATED','INHALED','SMOKED','VAPORIZED','RECTAL','INTRAMUSCULAR','INTRAVENOUS','SUBCUTANEOUS','TRANSDERMAL','OTHER'];
const STOMACH=['','EMPTY','LIGHT','MEDIUM','FULL'];
const RATING_OPTIONS=['-','+/-','+','++','+++','++++'];
let state,catalog=[],categories=[],navStack=[],currentTab='journal',searchText='',journalSearch='',filterCategory='all',selectedExperienceId=null,calendarCursor=new Date(),installPrompt=null;

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt',"'":'&#39;','"':'&quot;'}[c]));
const uuid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;
const nowMs=()=>Date.now();
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const toDate=x=>new Date(typeof x==='number'?x:(Date.parse(x)||Date.now()));
const fmtDate=x=>toDate(x).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
const fmtTime=x=>toDate(x).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
const titleForDate=x=>fmtDate(x);
const localDateTimeValue=(ms=Date.now())=>new Date(ms-new Date(ms).getTimezoneOffset()*60000).toISOString().slice(0,16);
const colorFor=name=>COLORS[(state.companions?.[name]||'BLUE').toUpperCase()]||COLORS.BLUE;
const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;

function tabIcon(name){
 const p={
  stats:'<path d="M5 20V10M12 20V4M19 20v-7"/><path d="M3 20h18"/>',
  journal:'<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M8 20a3 3 0 0 1 3-3h7"/>',
  substances:'<path d="M8 5a4 4 0 0 1 5.7 0l5.3 5.3a4 4 0 0 1-5.7 5.7L8 10.7A4 4 0 0 1 8 5Z"/><path d="m10.5 13.2 5.7-5.7"/>',
  safer:'<path d="M7 3h10v18H7z"/><path d="M12 7v10M9 12h6"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1V21H9.6v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H3V9.6h.1A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V3h4v.1A1.7 1.7 0 0 0 15.5 4a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.1.4.3.7.6 1 .3.3.7.4 1 .4h.1v4H21a1.7 1.7 0 0 0-1.6.6Z"/>'
 }[name]||'';
 return `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
}

function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function readState(){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get(STATE_KEY);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function saveState(){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(state,STATE_KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}

function seedCustomSubstances(){return[
 {id:uuid(),name:'Vortioxetine',units:'mg',unitPlural:'mg',description:'Multimodal serotonergic antidepressant. SERT inhibitor; 5-HT3, 5-HT7 and 5-HT1D antagonist; 5-HT1B partial agonist; 5-HT1A agonist. Oral bioavailability ~75%; Tmax 7–11 h; terminal half-life ~66 h. Primarily CYP2D6 metabolism. Dose/duration bins are custom visualization proxies.',color:'PURPLE',subcomponents:[],tolerance:{halfToleranceDays:null,zeroToleranceDays:null},categories:['antidepressant','custom'],roas:[{name:'oral',dose:{threshold:5,commonMin:10,strongMin:20,heavyMin:null,units:'mg'},duration:{onset:{min:1,max:2,units:'hours'},comeup:{min:5,max:9,units:'hours'},peak:{min:12,max:14,units:'hours'},offset:{min:9,max:12,units:'days'}}}]},
 {id:uuid(),name:'Pramipexole',units:'mg',unitPlural:'mg',description:'D2-like dopamine receptor agonist with preferential D3 affinity. Immediate-release oral formulation. Bioavailability >90%; Tmax ~2 h; terminal half-life ~8–12 h; minimal CYP metabolism; predominantly eliminated unchanged in urine. Dose bins are custom visualization categories.',color:'TEAL',subcomponents:[],tolerance:{halfToleranceDays:null,zeroToleranceDays:null},categories:['dopaminergic','custom'],roas:[{name:'oral',dose:{threshold:0.125,commonMin:0.25,strongMin:0.75,heavyMin:1.5,units:'mg'},duration:{onset:{min:30,max:60,units:'minutes'},comeup:{min:30,max:90,units:'minutes'},peak:{min:2,max:4,units:'hours'},offset:{min:6,max:10,units:'hours'}}}]}
]}
function defaultState(){return{experiences:[],companions:{Vortioxetine:'PURPLE',Pramipexole:'TEAL'},customSubstances:seedCustomSubstances(),customUnits:[],settings:{theme:'system',favoriteOnly:false,showDosageDots:true,drawRedosesIndividually:false,independentHeights:false,eyeOpen:true,installTipDismissed:false},createdAt:nowMs()}}
function migrateState(s){s=s||defaultState();s.experiences=(s.experiences||[]).map(e=>({...e,id:e.id||uuid(),ratings:e.ratings||[],timedNotes:e.timedNotes||[],ingestions:(e.ingestions||[]).map(i=>({...i,id:i.id||uuid()}))}));s.customSubstances=s.customSubstances||[];s.customUnits=s.customUnits||[];s.companions=s.companions||{};s.settings={...defaultState().settings,...(s.settings||{})};return s}

async function loadCatalog(){for(const url of ['./data/substances.json','../PsychonautWiki%20Journal/substances.json']){try{const r=await fetch(url);if(!r.ok)continue;const d=await r.json();catalog=d.substances||[];categories=d.categories||[];return}catch(e){}}catalog=[];toast('Substance database did not load; custom substances remain available.')}
function allSubstances(){const custom=(state.customSubstances||[]).map(s=>({...s,isCustom:true,commonNames:[s.name],summary:s.description||'',categories:s.categories||['custom']}));const names=new Set(custom.map(s=>s.name.toLowerCase()));return[...custom,...catalog.filter(s=>!names.has(String(s.name).toLowerCase()))]}
function findSubstance(name){return allSubstances().find(s=>String(s.name).toLowerCase()===String(name).toLowerCase())}
function normalizeRange(r){if(!r)return null;let f=1;const u=String(r.units||'hours').toLowerCase();if(u.startsWith('min'))f=1/60;else if(u.startsWith('day'))f=24;else if(u.startsWith('week'))f=168;return{min:(Number(r.min)||0)*f,max:(Number(r.max??r.min)||0)*f}}
function routeInfo(sub,route){return(sub?.roas||[]).find(r=>String(r.name).toUpperCase()===String(route||'ORAL').toUpperCase())||(sub?.roas||[])[0]}
function phaseHours(d,key){const r=normalizeRange(d?.[key]);return r?(r.min+r.max)/2:0}
function totalDurationHours(sub,route){const d=routeInfo(sub,route)?.duration||{};if(d.total){const r=normalizeRange(d.total);return(r.min+r.max)/2}return['onset','comeup','peak','offset'].reduce((a,k)=>a+phaseHours(d,k),0)}
function doseStrength(sub,route,dose){const d=routeInfo(sub,route)?.dose||{};const common=Number(d.commonMin||d.lightMin||0);if(!common||dose==null)return 1;return clamp(Number(dose)/common,.18,4)}
function doseDots(sub,route,dose){if(!state.settings.showDosageDots)return'';const d=routeInfo(sub,route)?.dose||{};let n=1;if(dose!=null){if(d.heavyMin!=null&&dose>=d.heavyMin)n=4;else if(d.strongMin!=null&&dose>=d.strongMin)n=3;else if(d.commonMin!=null&&dose>=d.commonMin)n=2;else n=1}return`<div class="dose-dots">${'●'.repeat(n)}${'○'.repeat(4-n)}</div>`}

function applyTheme(){const t=state.settings.theme||'system';document.documentElement.dataset.theme=t==='system'?'':t}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2400)}
function topbar(title,opts={}){const back=opts.back?`<button class="navbtn" data-action="back">‹ ${esc(opts.backLabel||'Back')}</button>`:'';$('#topbar').innerHTML=`<div class="navrow"><div class="navleft">${back}${opts.left||''}</div><div class="navtitle">${esc(title)}</div><div class="navright">${opts.right||''}</div></div>${opts.large?`<div class="large-title">${esc(opts.large)}</div>`:''}`}
function tabs(){const items=[['stats','Stats'],['journal','Journal'],['substances','Substances'],['safer','Safer'],['settings','Settings']];$('#tabbar').innerHTML=items.map(([id,label])=>`<button class="tab ${currentTab===id?'active':''}" data-tab="${id}">${tabIcon(id)}<span>${label}</span></button>`).join('')}
function navigate(view,data){navStack.push({view,data});renderView(view,data)}
function back(){navStack.pop();const prev=navStack.pop();if(prev)navigate(prev.view,prev.data);else renderTab(currentTab)}
function renderTab(tab){currentTab=tab;location.hash=tab;navStack=[];tabs();if(tab==='stats')renderStats();else if(tab==='journal')renderJournal();else if(tab==='substances')renderSearch();else if(tab==='safer')renderSafer();else renderSettings()}
function renderView(view,data){tabs();if(view==='substance')renderSubstance(data);else if(view==='experience')renderExperience(data);else if(view==='calendar')renderCalendar();}
