'use strict';

/* Long-half-life carry-over bridge for SmartPKPD / Live Effects v2.
 * Adds a conservative residual phase after the phenomenologic offset when
 * meaningful pharmacologic exposure can still persist. This is a model layer,
 * not measured concentration and not a claim that all residual drug equals full effect.
 */
(function(){
  if(!window.SmartPKPD?.smartPrediction)return;
  const base=window.SmartPKPD.smartPrediction.bind(window.SmartPKPD);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
  const mean=r=>Array.isArray(r)?(Number(r[0])+Number(r[1]))/2:Number(r||0);
  const rangeH=r=>{if(!r)return null;const f={minutes:1/60,hours:1,days:24,weeks:168}[r.unit||r.units||'hours']||1;const a=Number(r.min??r.max),b=Number(r.max??r.min);return Number.isFinite(a)&&Number.isFinite(b)?(a+b)/2*f:null};
  function prof(name){try{return typeof clinicalProfileEffective==='function'?clinicalProfileEffective(name):(window.ClinicalEngine?.profile?.(name)||{})}catch{return{}}}
  function halfLife(name){const p=prof(name),pk=p?.pk||{};return rangeH(pk.timeline?.halfLife)||mean(pk.halfLifeActiveH||pk.halfLifeH)||null}
  function residualCoefficient(name){const c=String(prof(name)?.class||'').toLowerCase();if(/benzodiazep|sedative|gaba/.test(c))return .38;if(/antipsychotic/.test(c))return .30;if(/antidepress/.test(c))return .22;if(/alpha-2|adrenergic agonist|sympatholytic/.test(c))return .18;if(/dopamine agonist/.test(c))return .16;if(/stimulant|amphetamine/.test(c))return .12;return .10}
  window.SmartPKPD.smartPrediction=function(ing,at=Date.now()){
    const out=base(ing,at);if(!out)return out;
    const phase=out.phase?.phase,hl=halfLife(ing?.substanceName);if(!(hl>8)||!['post-effect','unknown'].includes(phase))return out;
    let rem=null;try{rem=window.ClinicalEngine?.clinicalExposure?.(ing,at)?.remainingFraction}catch{}if(rem==null){const h=Math.max(0,(at-Number(ing.time))/3600000);rem=Math.pow(.5,h/hl)}rem=clamp(rem,0,1);
    const coef=residualCoefficient(ing.substanceName),functional=rem*coef;if(functional<.025)return out;
    const ageH=Math.max(0,(at-Number(ing.time))/3600000),progress=clamp(ageH/(hl*4),0,1);
    return{...out,weight:Math.max(Number(out.weight||0),functional),phase:{...(out.phase||{}),phase:'residual',progress,hours:ageH,residualCarryOver:true,remainingFraction:rem,carryOverCoefficient:coef}};
  };
  window.PWJ_RESIDUAL_CARRYOVER={version:'2.0',halfLife,residualCoefficient};
})();
