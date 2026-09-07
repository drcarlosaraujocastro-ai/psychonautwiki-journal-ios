'use strict';

/* Library + Knowledge Articles v6
 * Structured, editable pharmacology articles on top of the PsychonautWiki catalog.
 * Local-first: article overrides are stored in the same IndexedDB state and never
 * overwrite the bundled catalog. Imported content carries provenance/review status.
 */
(function(){
  const escx=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const key=v=>String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const STATUS={development_mock:'Conteúdo em revisão',draft:'Rascunho',under_review:'Em revisão',approved:'Aprovado',published:'Publicado',needs_review:'Precisa de revisão'};
  const EVIDENCE={strong_clinical:'Evidência clínica forte',established_pharmacology:'Farmacologia/toxicologia estabelecida',observational:'Evidência observacional',case_reports:'Relatos clínicos',mechanistic:'Extrapolação farmacológica',insufficient:'Evidência insuficiente'};
  const SECTION_FIELDS=[
    ['essential','Essencial'],['mechanism','Mecanismo'],['pharmacodynamics','Farmacodinâmica'],['pharmacokinetics','Farmacocinética'],
    ['indications','Indicações / contexto clínico'],['adverse','Efeitos adversos'],['toxicity','Toxicidade'],['dependence','Dependência / tolerância'],
    ['withdrawal','Abstinência / descontinuação'],['interactions','Interações'],['evidence','Evidência / limitações'],['body','Artigo técnico completo']
  ];
  const ALIAS={
    rivotril:'Clonazepam',klonopin:'Clonazepam',venvanse:'Lisdexamfetamine',vyvanse:'Lisdexamfetamine',lyberdia:'Lisdexamfetamine',
    trintellix:'Vortioxetine',brintellix:'Vortioxetine',vortioxetina:'Vortioxetine',sifrol:'Pramipexole',mirapex:'Pramipexole',pramipexol:'Pramipexole',
    maconha:'Cannabis',erva:'Cannabis',ket:'Ketamine',ketamine:'Ketamine'
  };

  function seedVortioxetine(){return{
    id:'seed-vortioxetine-2026',substanceName:'Vortioxetine',title:'Vortioxetina',aliases:['Vortioxetine','Vortioxetina','Trintellix','Brintellix'],
    status:'development_mock',evidenceLevel:'established_pharmacology',version:'0.1-importado',lastReviewedAt:'',nextReviewDue:'',
    summary:'Antidepressivo multimodal serotoninérgico. Inibe SERT e modula diretamente receptores 5-HT1A, 5-HT1B, 5-HT1D, 5-HT3 e 5-HT7. O perfil farmacocinético é de longa meia-vida, com Tmax tardio e importante carry-over entre doses.',
    sections:{
      essential:'Uso clínico principal: transtorno depressivo maior. A ação terapêutica longitudinal não deve ser confundida com a curva subjetiva de uma dose isolada. A fonte importada informa meia-vida terminal média de aproximadamente 66 horas, Tmax de 7–11 horas e biodisponibilidade oral absoluta de 75%.',
      mechanism:'Inibição do transportador de serotonina (SERT), agonismo 5-HT1A, agonismo parcial 5-HT1B e antagonismo 5-HT1D/5-HT3/5-HT7. A fonte importada descreve alta afinidade por SERT e afinidades receptor-específicas que devem ser mantidas junto das referências originais.',
      pharmacodynamics:'Na fonte importada: SERT Ki 1,6 nM; NET Ki 113 nM; DAT Ki >1000 nM. Receptores descritos: 5-HT3 Ki 3,7 nM; 5-HT1A Ki 15 nM; 5-HT7 Ki 19 nM; 5-HT1B Ki 33 nM; 5-HT1D Ki 54 nM. Tratar esses valores como dados de afinidade, não como magnitude clínica direta.',
      pharmacokinetics:'Tmax 7–11 h; biodisponibilidade absoluta 75%; ligação a proteínas plasmáticas ~98%; volume aparente de distribuição ~2600 L; meia-vida terminal média ~66 h. Metabolismo oxidativo extenso por CYP2D6 como via principal, com participação de CYP3A4/5, CYP2C19, CYP2C9, CYP2A6, CYP2C8 e CYP2B6, seguido de conjugação. Metabólito carboxílico principal descrito como farmacologicamente inativo. A fonte informa recuperação aproximada de 59% na urina e 26% nas fezes, predominantemente como metabólitos.',
      indications:'A fonte importada descreve indicação para transtorno depressivo maior (MDD).',
      adverse:'Náusea, diarreia e boca seca aparecem entre os eventos mais frequentemente relatados na fonte. Também são descritos riscos clinicamente relevantes de toxicidade serotoninérgica, sangramento anormal em contextos predisponentes, ativação de mania/hipomania e hiponatremia.',
      toxicity:'A fonte ressalta experiência limitada de ensaios clínicos em overdose humana e descreve casos pré-comercialização de ingestões de até 40 mg. Esse dado não deve ser interpretado como limiar de segurança.',
      dependence:'Não há, na fonte importada, um modelo detalhado de reforço/dependência. Manter separado de síndrome de descontinuação e de adaptação fisiológica a tratamento crônico.',
      withdrawal:'Não detalhado no PDF importado. Deve permanecer como lacuna editorial até revisão de fontes específicas.',
      interactions:'A fonte destaca risco de síndrome serotoninérgica com outros agentes serotoninérgicos e aumento de sangramento com fármacos que interferem na coagulação. Interações CYP2D6 são farmacocineticamente relevantes.',
      evidence:'A página importada agrega dados de DrugBank/PubChem e uma análise experiencial muito pequena de Erowid. Foram apenas 3 relatos experienciais agregados; um efeito adverso detectado foi ansiedade. Isso não permite estimar incidência clínica. Há uma inconsistência textual na fonte, que chama vortioxetina de “antipsicótico atípico” em um trecho; o artigo local mantém essa divergência como item a revisar, em vez de promovê-la como classificação aprovada.',
      body:'Este artigo local foi criado como documento estruturado e editável. Use as abas Essencial, Farmacologia, Segurança e Evidência para separar conhecimento consolidado, interpretação clínica e material ainda em revisão.'
    },
    facts:{pubchemCid:'9966051',molecularWeight:'298.4',formula:'C18H22N2S',logP:'4.2',inchiKey:'YQNWZWMKLDQSAC-UHFFFAOYSA-N'},
    sources:['Vortioxetine Stats - Substance Search — PDF fornecido pelo usuário; agrega PubChem, DrugBank e Erowid.'],
    reviewNotes:'Conteúdo importado como seed editorial. Revisar classificação textual conflitante da fonte antes de marcar como aprovado/publicado.',
    importedAt:new Date().toISOString()
  }}
  function seedPramipexole(){return{
    id:'seed-pramipexole-2026',substanceName:'Pramipexole',title:'Pramipexol',aliases:['Pramipexole','Pramipexol','Sifrol','Mirapex'],status:'development_mock',evidenceLevel:'established_pharmacology',version:'0.1',lastReviewedAt:'',nextReviewDue:'',
    summary:'Agonista dopaminérgico não ergolínico da família D2-like, com preferência relativa por D3. Perfil local preparado para integrar artigo, PK/PD avançada, perfis por dose e resposta observada.',
    sections:{essential:'Agonista dopaminérgico de administração oral; a interpretação clínica depende de dose, indicação, função renal e efeitos comportamentais.',mechanism:'Agonismo direto em receptores D2-like, com maior afinidade relativa por D3.',pharmacodynamics:'D3/D2/D4 são os principais alvos do modelo local. Separar efeito motor, motivacional/recompensa e risco de controle de impulsos.',pharmacokinetics:'O perfil clínico local usa absorção oral rápida, biodisponibilidade elevada, meia-vida de horas e eliminação predominantemente renal. Os valores exatos devem ficar vinculados às fontes revisadas do artigo.',indications:'Doença de Parkinson e síndrome das pernas inquietas em formulações/indicações apropriadas; usos psiquiátricos devem ser marcados como off-label quando aplicável.',adverse:'Náusea, hipotensão ortostática, sonolência/ataques de sono e alterações de controle de impulsos são domínios importantes para monitoramento.',toxicity:'Interpretar em contexto de exposição, co-medicações, função renal e sintomas neuropsiquiátricos.',dependence:'Pode ocorrer síndrome de retirada de agonista dopaminérgico após exposição sustentada em alguns contextos.',withdrawal:'Registrar sintomas temporalmente e evitar transformar um evento isolado em conclusão de adaptação persistente.',interactions:'Interações devem considerar sedação, hipotensão e somação comportamental/recompensa com outros agentes.',evidence:'Seed local para edição; conteúdo deve ser revisado e receber referências antes de publicação.',body:'Documento editável do Pramipexol. Complete referências, evidência, doses/formulações e revisão editorial conforme necessário.'},sources:[],reviewNotes:'Seed local; requer revisão editorial.',importedAt:new Date().toISOString()
  }}

  function ensure(){
    state.knowledgeArticles=state.knowledgeArticles&&typeof state.knowledgeArticles==='object'?state.knowledgeArticles:{};
    if(!state.knowledgeArticles[key('Vortioxetine')])state.knowledgeArticles[key('Vortioxetine')]=seedVortioxetine();
    if(!state.knowledgeArticles[key('Pramipexole')])state.knowledgeArticles[key('Pramipexole')]=seedPramipexole();
    state.librarySettings={lastCategory:'yours',...(state.librarySettings||{})};
  }
  function article(name){ensure();return state.knowledgeArticles[key(name)]||null}
  function articleCount(){ensure();return Object.keys(state.knowledgeArticles).length}
  function allAliases(s){const a=article(s.name);return [...new Set([s.name,...(s.commonNames||[]),...(a?.aliases||[]),...Object.entries(ALIAS).filter(([,v])=>key(v)===key(s.name)).map(([k])=>k)])]}
  function dice(a,b){a=key(a);b=key(b);if(!a||!b)return 0;if(a===b)return 1;if(a.length<2||b.length<2)return a===b?1:0;const m=new Map();for(let i=0;i<a.length-1;i++){const x=a.slice(i,i+2);m.set(x,(m.get(x)||0)+1)}let hit=0;for(let i=0;i<b.length-1;i++){const x=b.slice(i,i+2),n=m.get(x)||0;if(n){hit++;m.set(x,n-1)}}return 2*hit/((a.length-1)+(b.length-1))}
  function scoreSubstance(s,q){q=key(q);if(!q)return 1;let best=0;for(const a of allAliases(s)){const n=key(a);if(n===q)best=Math.max(best,100);else if(n.startsWith(q))best=Math.max(best,80-q.length/100);else if(n.includes(q))best=Math.max(best,65);else best=Math.max(best,dice(n,q)*50)}for(const c of s.categories||[])best=Math.max(best,key(c).includes(q)?35:0);return best}
  function resolveAlias(q){const a=ALIAS[key(q)];return a||null}

  const CATS=[
    ['yours','Seus','Favoritos locais, cores, artigos e substâncias personalizadas.','pink'],
    ['common','Comuns','Substâncias e medicamentos encontrados com mais frequência no uso cotidiano.','blue'],
    ['medications','Medicamentos','Psicofármacos e outros medicamentos presentes no catálogo/local.','cyan'],
    ['antidepressants','Antidepressivos','SERT, multimodais, tricíclicos, IMAO e outros antidepressivos.','purple'],
    ['stimulants','Estimulantes','Vigília, atenção, catecolaminas e simpaticomiméticos.','orange'],
    ['depressants','Depressores','Sedativos e depressores do sistema nervoso central.','slate'],
    ['benzodiazepines','Benzodiazepínicos','GABA-A, sedação, dependência física e retirada.','teal'],
    ['opioids','Opioides','Agonismo opioide, analgesia, dependência e risco respiratório.','red'],
    ['psychedelics','Psicodélicos','Substâncias serotoninérgicas com alterações perceptivas e cognitivas.','violet'],
    ['dissociatives','Dissociativos','NMDA e outros mecanismos associados à dissociação.','indigo'],
    ['empathogens','Empatógenos','Entactógenos/empatógenos e seus riscos serotoninérgicos/simpáticos.','rose'],
    ['dopaminergic','Dopaminérgicos','Agonistas e moduladores dopaminérgicos relevantes à psicofarmacologia.','mint'],
    ['custom','Personalizadas','Tudo que foi criado ou sobrescrito localmente.','gray']
  ];
  const COMMON=['Lisdexamfetamine','Clonazepam','Vortioxetine','Pramipexole','Quetiapine','Alcohol','Cannabis','Cocaine','Ketamine','MDMA','Sertraline','Fluoxetine','Methylphenidate','Tramadol'];
  function matchCat(s,id){const cs=(s.categories||[]).map(key),nm=key(s.name),txt=cs.join(' ');
    if(id==='yours')return s.isCustom||!!article(s.name)||!!state.companions?.[s.name];
    if(id==='custom')return s.isCustom||!!state.substanceOverrides?.[nm]||!!state.clinicalOverrides?.[nm];
    if(id==='common')return COMMON.some(x=>key(x)===nm)||s.isCustom;
    if(id==='medications')return /antidepress|antipsych|benzodia|stimulant|dopamin|mood|adhd|medication|prescription/.test(txt)||['clonazepam','vortioxetine','pramipexole','lisdexamfetamine','quetiapine'].includes(nm);
    const map={antidepressants:/antidepress/,stimulants:/stimulant|amphetamine|sympathomimetic/,depressants:/depressant|sedative|gaba/,benzodiazepines:/benzodiazep|benzo/,opioids:/opioid/,psychedelics:/psychedelic/,dissociatives:/dissociative/,empathogens:/empathogen|entactogen/,dopaminergic:/dopamin/};return map[id]?.test(txt)||false
  }
  function countCat(id){return allSubstances().filter(s=>matchCat(s,id)).length}
  function renderLibrary(){
    ensure();currentTab='library';location.hash='library';
    topbar('Biblioteca',{large:'Biblioteca',right:'<button class="navbtn icon" data-action="new-custom">＋</button>'});
    const q=searchText.trim(),alias=resolveAlias(q),results=q?allSubstances().map(s=>({s,score:scoreSubstance(s,q)})).filter(x=>x.score>=18).sort((a,b)=>b.score-a.score).slice(0,80).map(x=>x.s):[];
    $('#screen').innerHTML=`<div class="kb-shell"><div class="searchbox kb-search"><input id="kb-search" placeholder="Buscar substância, medicamento, marca ou alias" value="${escx(q)}" autocomplete="off">${q?'<button class="search-clear" data-kb-clear>×</button>':''}</div>${q?`<div class="section-caption">Resultados${alias?` · alias reconhecido → ${escx(alias)}`:''}</div><div class="card">${results.map(subRow).join('')||'<div class="empty">Nenhum resultado. Tente nome genérico, marca, alias ou categoria.</div>'}</div>`:`<div class="kb-grid">${CATS.map(([id,title,desc,tone])=>`<button class="kb-cat kb-${tone}" data-kb-cat="${id}"><div class="kb-cat-top"><span>${escx(title)}</span><b>${countCat(id)}</b></div><p>${escx(desc)}</p>${id==='yours'?`<div class="kb-cat-meta">Artigos ${articleCount()} · Personalizadas ${(state.customSubstances||[]).length} · Cores ${Object.keys(state.companions||{}).length}</div>`:''}</button>`).join('')}</div>`}</div>`;
    const i=$('#kb-search');if(i)i.oninput=e=>{searchText=e.target.value;renderLibrary();const n=$('#kb-search');n?.focus();n?.setSelectionRange(searchText.length,searchText.length)};
  }
  function subRow(s){const a=article(s.name),status=a?STATUS[a.status]||a.status:'';return `<button class="list-row" data-substance="${escx(s.name)}"><span class="dot" style="background:${colorFor(s.name)}">${s.isCustom?'✎':''}</span><div class="row-main"><div class="row-title strong">${escx(a?.title||s.name)}</div><div class="row-sub">${escx((s.categories||[]).slice(0,4).join(' · '))}${status?` · ${escx(status)}`:''}</div></div><span class="chev">›</span></button>`}
  function renderCategory(id){ensure();state.librarySettings.lastCategory=id;saveState().catch(()=>{});const c=CATS.find(x=>x[0]===id)||CATS[0],xs=allSubstances().filter(s=>matchCat(s,id)).sort((a,b)=>String(a.name).localeCompare(String(b.name)));topbar(c[1],{back:true,backLabel:'Biblioteca'});$('#screen').innerHTML=`<div class="kb-cat-hero kb-${c[3]}"><span>${escx(c[1])}</span><b>${xs.length}</b><p>${escx(c[2])}</p></div><div class="card">${xs.map(subRow).join('')||'<div class="empty">Nenhum item nesta categoria.</div>'}</div>`}

  function statusBadge(a){if(!a)return'';const lbl=STATUS[a.status]||a.status||'Rascunho';return `<span class="kb-status status-${escx(a.status||'draft')}">${escx(lbl)}</span>`}
  function paragraph(s){return String(s||'').trim()?String(s).split(/\n{2,}/).map(x=>`<p>${escx(x)}</p>`).join(''):''}
  function renderSubstanceKnowledge(name){
    ensure();const s=findSubstance(name);if(!s){back();return}const a=article(name),p=typeof clinicalProfileEffective==='function'?clinicalProfileEffective(name):(window.ClinicalEngine?.profile?.(name)||{}),roas=s.roas||[];
    topbar(a?.title||s.name,{back:true,backLabel:'Biblioteca',right:`<button class="navbtn" data-kb-edit="${escx(s.name)}">Editar artigo</button>`});
    const facts=a?.facts||{},pk=p?.pk||{},pd=p?.pd||{};
    $('#screen').innerHTML=`<div class="kb-article"><header class="kb-article-head"><div><div class="kb-kicker">${s.isCustom?'SUBSTÂNCIA LOCAL':'BIBLIOTECA'}</div><h1>${escx(a?.title||s.name)}</h1><div class="aliases">${escx((a?.aliases||s.commonNames||[]).filter(x=>key(x)!==key(a?.title||s.name)).slice(0,10).join(' · '))}</div></div><div>${statusBadge(a)}</div></header>
      ${a?.summary?`<div class="kb-lead">${escx(a.summary)}</div>`:s.summary||s.description?`<div class="kb-lead">${escx(s.summary||s.description)}</div>`:''}
      <div class="kb-facts">${facts.pubchemCid?`<div><span>PubChem CID</span><b>${escx(facts.pubchemCid)}</b></div>`:''}${facts.molecularWeight?`<div><span>MW</span><b>${escx(facts.molecularWeight)}</b></div>`:''}${facts.formula?`<div><span>Fórmula</span><b>${escx(facts.formula)}</b></div>`:''}${pk?.halfLifeH||pk?.halfLifeActiveH?`<div><span>Meia-vida</span><b>${escx(JSON.stringify(pk.halfLifeH||pk.halfLifeActiveH))} h</b></div>`:''}</div>
      <div class="kb-article-grid"><main>
        ${a?SECTION_FIELDS.map(([k,l])=>a.sections?.[k]?`<section class="kb-section"><h2>${escx(l)}</h2><div class="kb-prose">${paragraph(a.sections[k])}</div></section>`:'').join(''):`<section class="kb-section"><h2>Resumo</h2><div class="kb-prose">${paragraph(s.summary||s.description||'Sem artigo local ainda.')}</div></section>`}
        ${roas.length?`<section class="kb-section"><h2>Dose e duração · catálogo</h2>${roas.map(r=>`${typeof doseSection==='function'?doseSection(r):''}${typeof durationSection==='function'?durationSection(r):''}`).join('')}</section>`:''}
        ${window.ClinicalUI?.substanceHTML?.(s.name)||''}
      </main><aside>
        <div class="card kb-side"><div class="section-caption">Metadados editoriais</div><div class="kv"><span>Status</span><b>${a?escx(STATUS[a.status]||a.status):'Sem artigo local'}</b></div><div class="kv"><span>Evidência</span><b>${a?escx(EVIDENCE[a.evidenceLevel]||a.evidenceLevel||'—'):'—'}</b></div><div class="kv"><span>Versão</span><b>${escx(a?.version||'—')}</b></div><div class="kv"><span>Última revisão</span><b>${escx(a?.lastReviewedAt||'não revisado')}</b></div></div>
        <div class="card kb-side"><button class="linkrow" data-kb-edit="${escx(s.name)}">✎ Editar artigo completo</button><button class="linkrow" data-clinical-edit="${escx(s.name)}">⚗ Farmacologia avançada</button>${s.isCustom?`<button class="linkrow" data-edit-custom="${escx(s.name)}">Editar substância customizada</button>`:''}<button class="linkrow" data-kb-export="${escx(s.name)}">Exportar artigo JSON</button></div>
        ${a?.sources?.length?`<div class="card kb-side"><div class="section-caption">Fontes / proveniência</div>${a.sources.map(x=>`<div class="summary">${escx(x)}</div>`).join('')}${a.reviewNotes?`<div class="section-footer">${escx(a.reviewNotes)}</div>`:''}</div>`:''}
      </aside></div><div class="spacer"></div><button class="primary" data-action="add-ingestion" data-prefill="${escx(s.name)}">Registrar ingestão</button></div>`;
  }

  function editor(name){ensure();const s=findSubstance(name),a=article(name)||{id:uuid(),substanceName:name,title:s?.name||name,aliases:s?.commonNames||[],status:'draft',evidenceLevel:'insufficient',version:'0.1',sections:{},sources:[]};
    window.__kbEditName=name;
    modal(`${modalHeader('Editar artigo',`<button class="navbtn" data-kb-save="${escx(name)}">Salvar</button>`,'Cancelar')}<div class="kb-editor"><div class="section-caption">Identidade editorial</div><div class="card"><div class="fieldrow"><label>Título</label><input id="kb-title" value="${escx(a.title||name)}"></div><div class="fieldrow"><label>Aliases / marcas</label><input id="kb-aliases" value="${escx((a.aliases||[]).join(', '))}"></div><div class="fieldrow"><label>Status</label><select id="kb-status">${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${a.status===k?'selected':''}>${v}</option>`).join('')}</select></div><div class="fieldrow"><label>Nível de evidência</label><select id="kb-evidence">${Object.entries(EVIDENCE).map(([k,v])=>`<option value="${k}" ${a.evidenceLevel===k?'selected':''}>${v}</option>`).join('')}</select></div><div class="fieldrow"><label>Versão</label><input id="kb-version" value="${escx(a.version||'0.1')}"></div><div class="fieldrow"><label>Última revisão</label><input id="kb-reviewed" type="date" value="${escx(a.lastReviewedAt||'')}"></div><div class="fieldrow"><label>Próxima revisão</label><input id="kb-next" type="date" value="${escx(a.nextReviewDue||'')}"></div><div class="fieldrow"><label>Resumo</label><textarea id="kb-summary">${escx(a.summary||'')}</textarea></div></div>
      <div class="section-caption">Artigo estruturado</div>${SECTION_FIELDS.map(([k,l])=>`<div class="card"><div class="fieldrow"><label>${escx(l)}</label><textarea id="kb-sec-${k}" class="kb-bigtext">${escx(a.sections?.[k]||'')}</textarea></div></div>`).join('')}
      <div class="section-caption">Proveniência e revisão</div><div class="card"><div class="fieldrow"><label>Fontes — uma por linha</label><textarea id="kb-sources">${escx((a.sources||[]).join('\n'))}</textarea></div><div class="fieldrow"><label>Notas do revisor</label><textarea id="kb-reviewnotes">${escx(a.reviewNotes||'')}</textarea></div><div class="fieldrow"><label>Texto bruto importado</label><textarea id="kb-raw" class="kb-bigtext">${escx(a.rawSource||'')}</textarea></div><div class="fieldrow"><label>Importar .txt/.md/.json</label><input id="kb-file" type="file" accept=".txt,.md,.json,text/plain,application/json"></div><div class="section-footer">Arquivos importados ficam locais. PDF não é analisado automaticamente no navegador; use o texto extraído/colado ou edite as seções estruturadas.</div></div></div>`);
    const f=$('#kb-file');if(f)f.onchange=async e=>{const file=e.target.files?.[0];if(!file)return;const txt=await file.text();$('#kb-raw').value=txt;try{const j=JSON.parse(txt);if(j&&typeof j==='object'){if(j.summary)$('#kb-summary').value=j.summary;if(j.sections)for(const [k] of SECTION_FIELDS)if(j.sections[k]!=null)$(`#kb-sec-${k}`).value=j.sections[k];toast('JSON carregado no editor. Revise antes de salvar.')}}catch{toast('Texto carregado como fonte bruta.')}};
  }
  async function saveEditor(name){ensure();const old=article(name)||{},sections={};for(const [k] of SECTION_FIELDS)sections[k]=$(`#kb-sec-${k}`)?.value.trim()||'';const obj={...old,id:old.id||uuid(),substanceName:name,title:$('#kb-title')?.value.trim()||name,aliases:($('#kb-aliases')?.value||'').split(',').map(x=>x.trim()).filter(Boolean),status:$('#kb-status')?.value||'draft',evidenceLevel:$('#kb-evidence')?.value||'insufficient',version:$('#kb-version')?.value.trim()||'0.1',lastReviewedAt:$('#kb-reviewed')?.value||'',nextReviewDue:$('#kb-next')?.value||'',summary:$('#kb-summary')?.value.trim()||'',sections,sources:($('#kb-sources')?.value||'').split(/\n/).map(x=>x.trim()).filter(Boolean),reviewNotes:$('#kb-reviewnotes')?.value.trim()||'',rawSource:$('#kb-raw')?.value||'',updatedAt:new Date().toISOString()};state.knowledgeArticles[key(name)]=obj;await saveState();closeModal();toast('Artigo salvo localmente.');renderSubstanceKnowledge(name)}
  function exportArticle(name){const a=article(name);if(!a){toast('Nenhum artigo local para exportar.');return}const blob=new Blob([JSON.stringify(a,null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),x=document.createElement('a');x.href=u;x.download=`artigo-${key(name).replace(/\s+/g,'-')}.json`;x.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}

  const baseSearch=window.renderSearch,baseSubstance=window.renderSubstance;
  window.renderLibrary=renderLibrary;
  window.renderSearch=renderLibrary;
  window.renderSubstance=renderSubstanceKnowledge;

  document.addEventListener('click',e=>{
    const c=e.target.closest?.('[data-kb-cat],[data-kb-clear],[data-kb-edit],[data-kb-save],[data-kb-export]');if(!c)return;
    if(c.dataset.kbCat){e.preventDefault();e.stopImmediatePropagation();renderCategory(c.dataset.kbCat);return}
    if(c.hasAttribute('data-kb-clear')){e.preventDefault();e.stopImmediatePropagation();searchText='';renderLibrary();return}
    if(c.dataset.kbEdit){e.preventDefault();e.stopImmediatePropagation();editor(c.dataset.kbEdit);return}
    if(c.dataset.kbSave){e.preventDefault();e.stopImmediatePropagation();saveEditor(c.dataset.kbSave);return}
    if(c.dataset.kbExport){e.preventDefault();e.stopImmediatePropagation();exportArticle(c.dataset.kbExport);return}
  },true);

  const st=document.createElement('style');st.textContent=`
    .kb-shell,.kb-article{max-width:1500px;margin:0 auto}.kb-search{margin-bottom:18px}.kb-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.kb-cat{border:0;border-radius:22px;padding:22px;text-align:left;color:white;min-height:156px;position:relative;overflow:hidden}.kb-cat:after{content:'';position:absolute;width:170px;height:170px;border:2px solid rgba(255,255,255,.12);border-radius:38%;right:-42px;top:-28px;transform:rotate(24deg)}.kb-cat-top{display:flex;justify-content:space-between;align-items:center;gap:16px;font-size:22px;font-weight:800}.kb-cat-top b{font-size:13px;opacity:.85}.kb-cat p{max-width:78%;font-size:13px;line-height:1.45;opacity:.9}.kb-cat-meta{font-size:11px;opacity:.8}.kb-pink{background:linear-gradient(135deg,#d92f6f,#ef7fac)}.kb-blue{background:linear-gradient(135deg,#4256cc,#8fa3ff)}.kb-cyan{background:linear-gradient(135deg,#007b9d,#36c3d9)}.kb-purple{background:linear-gradient(135deg,#6e36b8,#b157dd)}.kb-orange{background:linear-gradient(135deg,#e77d16,#ffb75c)}.kb-slate{background:linear-gradient(135deg,#424650,#6c7280)}.kb-teal{background:linear-gradient(135deg,#167d7b,#5cc9bd)}.kb-red{background:linear-gradient(135deg,#a82835,#ed5b5b)}.kb-violet{background:linear-gradient(135deg,#7030a9,#bd57de)}.kb-indigo{background:linear-gradient(135deg,#353b90,#7078dd)}.kb-rose{background:linear-gradient(135deg,#c62d5e,#ff6689)}.kb-mint{background:linear-gradient(135deg,#168d72,#5bd2a8)}.kb-gray{background:linear-gradient(135deg,#555b65,#8a9099)}
    .kb-cat-hero{color:white;border-radius:22px;padding:22px;margin-bottom:16px}.kb-cat-hero span{font-size:28px;font-weight:800}.kb-cat-hero b{float:right;font-size:18px}.kb-cat-hero p{max-width:680px;opacity:.9}.kb-article-head{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin:8px 0 14px}.kb-article-head h1{font-size:42px;margin:3px 0}.kb-kicker{font-size:11px;letter-spacing:.14em;color:var(--secondary)}.kb-status{display:inline-block;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:800;background:var(--card);border:1px solid var(--separator)}.status-published,.status-approved{color:#30d158}.status-development_mock,.status-needs_review{color:#ff9f0a}.kb-lead{font-size:19px;line-height:1.55;background:var(--card);border-radius:18px;padding:18px;margin:12px 0}.kb-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:12px 0}.kb-facts>div{background:var(--card);border-radius:14px;padding:12px}.kb-facts span{display:block;color:var(--secondary);font-size:10px}.kb-facts b{display:block;margin-top:4px}.kb-article-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(260px,.45fr);gap:18px;align-items:start}.kb-section{background:var(--card);border-radius:18px;padding:18px 20px;margin-bottom:12px}.kb-section h2{margin:0 0 10px;font-size:18px}.kb-prose p{line-height:1.62;margin:0 0 12px;color:var(--text)}.kb-side{margin-bottom:12px}.kb-editor{padding-bottom:30px}.kb-bigtext{min-height:180px!important}
    @media(max-width:860px){.kb-grid{grid-template-columns:1fr}.kb-article-grid{grid-template-columns:1fr}.kb-facts{grid-template-columns:repeat(2,1fr)}.kb-article-head h1{font-size:34px}.kb-cat{min-height:142px}}
    @media(min-width:1200px){.kb-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
  `;document.head.appendChild(st);
  ensure();
  window.LibraryKnowledge={version:'6.0',renderLibrary,renderCategory,renderSubstance:renderSubstanceKnowledge,article,editor,resolveAlias,scoreSubstance};
})();