'use strict';

/* Clinical pharmacology overlay for the Journal PWA.
 * PW/Erowid style data remains the phenomenology/reduction-of-harm layer.
 * This module adds clinical PK/PD, patient adaptation and inference without
 * overwriting the raw PsychonautWiki-derived substance catalog.
 */

const CLINICAL_SOURCE_ORDER=['psychonautwiki','erowid','tripsit','dailymed','pubmed','drugbank'];

const CLINICAL_PROFILES={
  'Lisdexamfetamine':{
    aliases:['Vyvanse','Elvanse','Lyberdia'],class:'CNS stimulant; dextroamphetamine prodrug',
    doseBands:{unit:'mg',minimum:10,low:20,standard:30,high:50,maxTherapeutic:70},
    pk:{route:'oral',bioavailabilityNote:'prodrug absorbed GI then hydrolyzed mainly in red cells',tmaxActiveH:[3.5,4.5],halfLifeActiveH:[10,13],food:{auc:'minimal change',cmax:'minimal change',tmaxShiftH:[0.5,1.5]}},
    pd:{targets:['DAT/NET via dextroamphetamine','VMAT2 indirect monoamine release'],axes:{dopamine:0.8,norepinephrine:0.9,serotonin:0.2,arousal:0.9,rewardSalience:0.7}},
    tolerance:{acute:'variable',chronic:'possible',crossTolerance:['amphetamine','dopaminergic stimulant'],dependenceRisk:'moderate',withdrawalRisk:'moderate',sensitizationRisk:'possible'},
    sources:{primary:['PsychonautWiki'],experiential:['Erowid'],secondary:['DailyMed','PubMed','DrugBank']}
  },
  'Clonidine':{
    aliases:['Catapres','Kapvay'],class:'central alpha-2 adrenergic agonist',
    doseBands:{unit:'mg',minimum:0.025,low:0.05,standard:0.1,high:0.2,maxTherapeutic:0.3},
    pk:{route:'oral',bioavailabilityPct:[70,80],tmaxH:[1,3],halfLifeH:[12,16],renalSensitivity:true},
    pd:{targets:['alpha2A','alpha2B','alpha2C','imidazoline receptors'],axes:{norepinephrine:-0.8,sympatheticTone:-0.9,sedation:0.55,bloodPressure:-0.6}},
    tolerance:{acute:'partial sedation tolerance may develop',chronic:'physiologic adaptation possible',reboundRisk:'high if abruptly stopped after regular use',withdrawalRisk:'sympathetic rebound'},
    sources:{primary:['PsychonautWiki'],secondary:['DailyMed','PubMed','DrugBank']}
  },
  'Clonazepam':{
    aliases:['Rivotril','Klonopin'],class:'benzodiazepine; GABA-A positive allosteric modulator',
    doseBands:{unit:'mg',minimum:0.125,low:0.25,standard:0.5,high:1,maxTherapeutic:2},
    pk:{route:'oral',bioavailabilityPct:[85,95],tmaxH:[1,4],halfLifeH:[30,40]},
    pd:{targets:['GABA-A benzodiazepine site'],axes:{gabaA:0.9,sedation:0.75,anxiolysis:0.8,anticonvulsant:0.8,memoryImpairment:0.55}},
    tolerance:{acute:'can develop rapidly for sedation',chronic:'dose-effect tolerance and receptor adaptation are separable',crossTolerance:['benzodiazepines','Z-drugs partial'],dependenceRisk:'high with regular prolonged use',withdrawalRisk:'high after dependence',reboundRisk:'anxiety/insomnia/seizure risk'},
    sources:{primary:['PsychonautWiki'],experiential:['Erowid'],secondary:['DailyMed','PubMed','DrugBank']}
  },
  'Pramipexole':{
    aliases:['Pramipexol','Sifrol','Mirapex'],class:'non-ergot D2-like dopamine agonist with D3 preference',
    doseBands:{unit:'mg',minimum:0.125,low:0.25,standard:0.5,high:0.75,maxTherapeuticSingle:1.5},
    pk:{route:'oral',bioavailabilityPct:[90,100],tmaxH:[1.5,3],halfLifeH:[8,12],renalElimination:true,metabolism:'minimal'},
    pd:{targets:['D3','D2','D4'],axes:{dopamine:0.75,rewardSalience:0.65,motivation:0.7,sedation:0.35,impulseControlRisk:0.5}},
    tolerance:{acute:'not usefully represented by a simple half/zero value',chronic:'receptor/behavioral adaptation possible',dependenceRisk:'dopamine agonist withdrawal syndrome possible',withdrawalRisk:'DAWS',sensitizationRisk:'behavioral activation possible'},
    sources:{primary:['PsychonautWiki when available'],experiential:['Erowid'],secondary:['DailyMed','PubMed','DrugBank']}
  },
  'Vortioxetine':{
    aliases:['Vortioxetina','Trintellix','Brintellix'],class:'multimodal serotonergic antidepressant',
    doseBands:{unit:'mg',minimum:5,low:5,standard:10,high:20,maxTherapeutic:20},
    pk:{route:'oral',bioavailabilityPct:[70,80],tmaxH:[7,11],halfLifeH:[57,75],steadyStateDays:[10,14],food:{auc:'no clinically meaningful effect',cmax:'no clinically meaningful effect'}},
    pd:{targets:['SERT','5-HT1A agonist','5-HT1B partial agonist','5-HT3 antagonist','5-HT7 antagonist','5-HT1D antagonist'],axes:{serotonin:0.85,antidepressant:0.7,nauseaRisk:0.45,activation:0.25}},
    tolerance:{acute:'not modeled as recreational tolerance',chronic:'adaptive serotonergic effects evolve over days-weeks',dependenceRisk:'low classic abuse liability',withdrawalRisk:'discontinuation symptoms possible'},
    sources:{primary:['PsychonautWiki if/when page data exists'],secondary:['DailyMed','PubMed','DrugBank']}
  }
};

function clinicalName(name){
  const n=String(name||'').toLowerCase();
  return Object.keys(CLINICAL_PROFILES).find(k=>k.toLowerCase()===n||(CLINICAL_PROFILES[k].aliases||[]).some(a=>String(a).toLowerCase()===n));
}
function clinicalProfile(name){const k=clinicalName(name);return k?CLINICAL_PROFILES[k]:null}
function hoursSince(ms,at=Date.now()){return Math.max(0,(at-Number(ms))/3600000)}
function meanRange(r){return Array.isArray(r)?(Number(r[0])+Number(r[1]))/2:Number(r||0)}
function eliminationFraction(halfLifeH,h){const hl=meanRange(halfLifeH);return hl>0?Math.pow(.5,h/hl):0}
function currentJournalPhase(ing,at=Date.now()){
  const sub=findSubstance(ing.substanceName),d=routeInfo(sub,ing.administrationRoute)?.duration||{};
  const h=hoursSince(ing.time,at),on=phaseHours(d,'onset'),cu=phaseHours(d,'comeup'),pk=phaseHours(d,'peak'),off=phaseHours(d,'offset');
  if(h<on)return{phase:'pre-onset',progress:on?h/on:0};
  if(h<on+cu)return{phase:'come-up',progress:cu?(h-on)/cu:1};
  if(h<on+cu+pk)return{phase:'peak',progress:pk?(h-on-cu)/pk:1};
  if(h<on+cu+pk+off)return{phase:'offset',progress:off?(h-on-cu-pk)/off:1};
  return{phase:'post-effect',progress:1};
}
function clinicalExposure(ing,at=Date.now()){
  const p=clinicalProfile(ing.substanceName);if(!p)return null;
  const h=hoursSince(ing.time,at),half=p.pk.halfLifeActiveH||p.pk.halfLifeH;
  const remaining=half?eliminationFraction(half,h):null;
  return{name:clinicalName(ing.substanceName),hoursSinceDose:h,remainingFraction:remaining,profile:p};
}
function interactionAxes(ings,at=Date.now()){
  const axes={};
  for(const ing of ings){const ex=clinicalExposure(ing,at);if(!ex)continue;const weight=ex.remainingFraction==null?1:Math.max(.05,ex.remainingFraction);for(const [k,v] of Object.entries(ex.profile.pd.axes||{}))axes[k]=(axes[k]||0)+Number(v)*weight;}
  return axes;
}
function inferCurrentEffects(ings,at=Date.now()){
  const active=ings.map(i=>({ing:i,phase:currentJournalPhase(i,at),exposure:clinicalExposure(i,at)})).filter(x=>x.phase.phase!=='post-effect'||(x.exposure?.remainingFraction??0)>.05);
  const axes=interactionAxes(ings,at);
  const effects=[];
  const add=(label,score,reason)=>{if(Math.abs(score)>=.35)effects.push({label,direction:score>0?'increase':'decrease',strength:Math.min(1,Math.abs(score)),reason})};
  add('alertness/arousal',(axes.arousal||0)+(axes.norepinephrine||0)*.35-(axes.sedation||0)*.5,'combined stimulant, noradrenergic and sedative load');
  add('autonomic sympathetic tone',(axes.sympatheticTone||0)+(axes.norepinephrine||0)*.6,'net adrenergic balance');
  add('sedation/psychomotor slowing',(axes.sedation||0)+(axes.gabaA||0)*.4,'combined GABAergic/alpha-2/dopaminergic sedative load');
  add('reward salience/impulsivity',(axes.rewardSalience||0)+(axes.dopamine||0)*.25,'dopaminergic reward-circuit load');
  add('serotonergic activation',(axes.serotonin||0),'serotonergic pharmacodynamic load');
  return{at,active,axes,effects,confidence:active.length?'hypothesis':'insufficient-data'};
}
function stomachAdjustment(name,fullness){
  const p=clinicalProfile(name);if(!p)return null;const f=String(fullness||'').toUpperCase();if(!f||f==='EMPTY')return{tmaxShiftH:0,note:'No modeled stomach delay.'};
  if(clinicalName(name)==='Lisdexamfetamine')return{tmaxShiftH:f==='FULL'?1:.5,note:'Model shifts Tmax later without automatically reducing total exposure.'};
  if(clinicalName(name)==='Pramipexole')return{tmaxShiftH:f==='FULL'?1:.5,note:'Food may delay Tmax modestly without a major AUC reduction.'};
  if(clinicalName(name)==='Vortioxetine')return{tmaxShiftH:0,note:'Food is not modeled as a clinically meaningful PK modifier.'};
  return{tmaxShiftH:0,note:'No substance-specific food rule available; do not invent a delay.'};
}

window.ClinicalEngine={profiles:CLINICAL_PROFILES,sourceOrder:CLINICAL_SOURCE_ORDER,profile:clinicalProfile,currentJournalPhase,clinicalExposure,interactionAxes,inferCurrentEffects,stomachAdjustment};
