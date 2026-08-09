(function(){
  'use strict';

  const CONFIG=window.ONCUVATE_ACTIVITY_CONFIG||{};
  const RUNTIME=window.ONCUVATE||{};
  const LESSON_ID='jelly-detective-midnight-museum-science';
  const LESSON_VERSION='pilot-1';
  const STORAGE_KEY='oncuvate.pilot.midnight-museum.activity.v1';
  const OUTBOX_KEY='oncuvate.pilot.midnight-museum.outbox.v1';
  const ENDPOINT='https://api.web3forms.com/submit';
  const MAX_EVENTS=260;
  const MAX_REVISIONS=24;
  const isCoach=RUNTIME.role==='coach';
  let saveTimer=0;
  let submitTimer=0;
  let flushBusy=false;
  let viewEnteredAt=Date.now();
  let lastObservedReport='';
  let reportObserveTimer=0;

  function uid(){return 'mm-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}
  function safeCode(value){return String(value||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,32)}
  function freshRecord(){
    const now=new Date().toISOString();
    return{
      schema:'oncuvate.pilot-activity.v1',lessonId:LESSON_ID,lessonVersion:LESSON_VERSION,
      sessionId:uid(),sessionStartedAt:now,updatedAt:now,completedAt:null,completed:false,
      identity:{childCode:safeCode(RUNTIME.child),badge:''},
      context:{room:safeCode(RUNTIME.room),session:RUNTIME.session||'',classroomCode:String(CONFIG.classroomCode||'MM-SCI-PILOT')},
      progress:{view:'startView',foundClues:0,totalClues:9,completedFiles:0},
      answers:{},correctness:{},
      tracking:{events:[],firstResponseMs:{},attemptCounts:{},hintUsage:{},pageDurationsMs:{}},
      writing:{originalDraft:'',latestDraft:'',finalDraft:'',revisionHistory:[],tutorRequests:[],coachEdits:[]},
      submission:{dirty:false,lastSignature:'',lastSubmittedAt:null,lastTrigger:null}
    }
  }
  function loadRecord(){
    try{
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(saved&&saved.schema==='oncuvate.pilot-activity.v1'&&!saved.completed){
        const base=freshRecord();
        return{...base,...saved,identity:{...base.identity,...saved.identity},context:{...base.context,...saved.context},progress:{...base.progress,...saved.progress},answers:{...saved.answers},correctness:{...saved.correctness},tracking:{...base.tracking,...saved.tracking,events:[...(saved.tracking?.events||[])],firstResponseMs:{...saved.tracking?.firstResponseMs},attemptCounts:{...saved.tracking?.attemptCounts},hintUsage:{...saved.tracking?.hintUsage},pageDurationsMs:{...saved.tracking?.pageDurationsMs}},writing:{...base.writing,...saved.writing,revisionHistory:[...(saved.writing?.revisionHistory||[])],tutorRequests:[...(saved.writing?.tutorRequests||[])],coachEdits:[...(saved.writing?.coachEdits||[])]},submission:{...base.submission,...saved.submission}};
      }
    }catch(error){}
    return freshRecord()
  }
  let record=loadRecord();

  function getOutbox(){try{const value=JSON.parse(localStorage.getItem(OUTBOX_KEY)||'[]');return Array.isArray(value)?value:[]}catch(error){return[]}}
  function setOutbox(items){try{localStorage.setItem(OUTBOX_KEY,JSON.stringify(items.slice(-8)))}catch(error){}}
  function persistNow(){
    record.updatedAt=new Date().toISOString();
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(record))}catch(error){}
    updateSyncStatus();
  }
  function persistSoon(){clearTimeout(saveTimer);saveTimer=setTimeout(persistNow,240)}
  function addEvent(type,data={}){
    record.tracking.events.push({type,at:new Date().toISOString(),view:currentView(),...data});
    record.tracking.events=record.tracking.events.slice(-MAX_EVENTS);
    record.submission.dirty=true;
    persistSoon();
  }
  function currentView(){return document.querySelector('.view:not([hidden])')?.id||record.progress.view||'startView'}
  function recordViewChange(){
    const next=currentView();
    const previous=record.progress.view||next;
    if(next===previous)return;
    const elapsed=Math.max(0,Date.now()-viewEnteredAt);
    record.tracking.pageDurationsMs[previous]=(record.tracking.pageDurationsMs[previous]||0)+elapsed;
    record.progress.view=next;
    viewEnteredAt=Date.now();
    addEvent('page_view',{from:previous,to:next});
  }
  function accrueCurrentView(){
    const view=record.progress.view||currentView();
    const elapsed=Math.max(0,Date.now()-viewEnteredAt);
    record.tracking.pageDurationsMs[view]=(record.tracking.pageDurationsMs[view]||0)+elapsed;
    viewEnteredAt=Date.now();
  }
  function promptKey(element){
    if(!element)return'';
    if(element.dataset.deductionField)return`deduction:${element.dataset.row||'row'}:${element.dataset.deductionField}`;
    const datasetKeys=['caseRead','firstTheory','confidence','condition','apply','cause','readingLevel','mainIdea','infoSentence','compare','openView','slot','event'];
    for(const key of datasetKeys)if(element.dataset[key]!=null)return`${key}:${element.dataset[key]}`;
    return element.id||element.name||element.classList?.[0]||element.tagName?.toLowerCase()||'';
  }
  function recordFirstResponse(key){
    if(!key||record.tracking.firstResponseMs[key]!=null)return;
    record.tracking.firstResponseMs[key]=Math.max(0,Date.now()-viewEnteredAt);
  }
  function attempt(key){
    if(!key)return 0;
    const value=(record.tracking.attemptCounts[key]||0)+1;
    record.tracking.attemptCounts[key]=value;
    return value;
  }
  function correctnessOf(element){
    if(element.classList?.contains('correct'))return true;
    if(element.classList?.contains('wrong'))return false;
    for(const key of ['caseRead','apply','cause','mainIdea']){
      if(element.dataset?.[key]==='correct')return true;
      if(element.dataset?.[key]==='wrong')return false;
    }
    if(element.dataset?.infoSentence)return element.dataset.infoSentence==='source';
    return null;
  }
  function publicSnapshot(){
    try{return typeof window.buildMirrorSnapshot==='function'?window.buildMirrorSnapshot():{}}
    catch(error){return{}}
  }
  function refreshSummary(){
    const snapshot=publicSnapshot();
    const badge=document.getElementById('detectiveBadge')?.value||snapshot.badge||'';
    record.identity.badge=String(badge).slice(0,40);
    if(!record.identity.childCode&&RUNTIME.child)record.identity.childCode=safeCode(RUNTIME.child);
    record.progress={view:currentView(),foundClues:Number(snapshot.clues?.found||0),totalClues:Number(snapshot.clues?.total||9),completedFiles:Number(snapshot.clues?.files||0)};
    record.answers={caseAnswer:snapshot.caseAnswer||'',firstTheory:snapshot.firstTheory||'',deductionSolved:Boolean(snapshot.deductionSolved),deduction:snapshot.deduction||[],experiment:snapshot.experiment||{},timeline:snapshot.timeline||{},cause:snapshot.cause||'',reading:snapshot.reading||{}};
    const draft=document.getElementById('reportInput')?.value||snapshot.writing?.draft||'';
    record.writing.latestDraft=draft;
    if(snapshot.writing?.original&&!record.writing.originalDraft)record.writing.originalDraft=snapshot.writing.original;
    if(snapshot.writing?.final)record.writing.finalDraft=snapshot.writing.final;
    persistSoon();
    return snapshot;
  }
  function observeReportRevision(source='observed'){
    const value=document.getElementById('reportInput')?.value||'';
    if(value===lastObservedReport)return;
    const before=lastObservedReport;
    lastObservedReport=value;
    record.writing.latestDraft=value;
    record.writing.revisionHistory.push({at:new Date().toISOString(),source,beforeLength:before.length,afterLength:value.length,text:value});
    record.writing.revisionHistory=record.writing.revisionHistory.slice(-MAX_REVISIONS);
    addEvent('writing_revision',{source,beforeLength:before.length,afterLength:value.length});
  }
  function averageFirstResponse(){
    const values=Object.values(record.tracking.firstResponseMs).filter(Number.isFinite);
    return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null;
  }
  function buildPayload(trigger){
    recordViewChange();accrueCurrentView();refreshSummary();
    const participant=record.identity.childCode||record.identity.badge||record.sessionId.slice(-6).toUpperCase();
    return{
      ...record,trigger,createdAt:new Date().toISOString(),participantCode:participant,
      responseTiming:{firstResponses:record.tracking.firstResponseMs,averageFirstResponseMs:averageFirstResponse(),pageDurationsMs:record.tracking.pageDurationsMs},
      hintUsage:record.tracking.hintUsage,
      aiAssistance:{provider:'local_scaffold',requestCount:record.writing.tutorRequests.length,requests:record.writing.tutorRequests,originalDraft:record.writing.originalDraft,latestDraft:record.writing.latestDraft,finalDraft:record.writing.finalDraft,revisions:record.writing.revisionHistory}
    }
  }
  function signature(payload){return JSON.stringify({progress:payload.progress,answers:payload.answers,attempts:payload.tracking.attemptCounts,hints:payload.hintUsage,writing:payload.writing,completed:payload.completed})}
  function web3Body(item){
    const p=item.payload;
    return{
      access_key:String(CONFIG.web3formsAccessKey||'').trim(),
      subject:`[Oncuvate Pilot] Midnight Museum · ${p.participantCode} · ${p.trigger}`,
      from_name:'Oncuvate Pilot Activity Auto-Save',lesson_id:LESSON_ID,lesson_version:LESSON_VERSION,
      classroom_code:p.context.classroomCode,participant_code:p.participantCode,session_id:p.sessionId,
      trigger:p.trigger,completed:String(p.completed),response_timing_json:JSON.stringify(p.responseTiming),
      correctness_json:JSON.stringify(p.correctness),hint_usage_json:JSON.stringify(p.hintUsage),
      ai_assistance_json:JSON.stringify(p.aiAssistance),answers_json:JSON.stringify(p.answers),
      activity_record_json:JSON.stringify(p),botcheck:''
    }
  }
  function enqueue(trigger,force=false){
    if(isCoach||!CONFIG.submissionEnabled)return;
    const payload=buildPayload(trigger);
    const nextSignature=signature(payload);
    if(!force&&nextSignature===record.submission.lastSignature)return;
    let outbox=getOutbox();
    if(!payload.completed)outbox=outbox.filter(item=>item.payload?.sessionId!==payload.sessionId||item.payload?.completed);
    outbox.push({payload,signature:nextSignature});setOutbox(outbox);
    record.submission.lastSignature=nextSignature;record.submission.lastTrigger=trigger;record.submission.dirty=false;
    persistNow();flushOutbox();
  }
  function scheduleSubmission(trigger,force=false,delay=850){clearTimeout(submitTimer);submitTimer=setTimeout(()=>enqueue(trigger,force),delay)}
  async function flushOutbox(){
    const key=String(CONFIG.web3formsAccessKey||'').trim();
    if(flushBusy||isCoach||!CONFIG.submissionEnabled||!key||!navigator.onLine)return updateSyncStatus();
    const outbox=getOutbox();if(!outbox.length)return updateSyncStatus();
    flushBusy=true;updateSyncStatus('sending','자동 저장 중');
    const remaining=[];
    for(let index=0;index<outbox.length;index+=1){
      const item=outbox[index];
      try{
        const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(web3Body(item)),keepalive:true});
        const result=await response.json().catch(()=>({}));
        if(!response.ok||result.success===false)throw new Error(result.message||'submission failed');
        record.submission.lastSubmittedAt=new Date().toISOString();
      }catch(error){remaining.push(...outbox.slice(index));break}
    }
    setOutbox(remaining);flushBusy=false;persistNow();
    updateSyncStatus(remaining.length?'error':'sent',remaining.length?'전송 재시도 대기':'자동 저장됨');
  }
  function ensureSyncStatus(){
    if(document.getElementById('pilotSyncState'))return;
    const badge=document.createElement('span');badge.id='pilotSyncState';badge.className='pilot-sync';badge.setAttribute('aria-live','polite');
    document.querySelector('.topbar')?.appendChild(badge);
  }
  function updateSyncStatus(kind='',text=''){
    ensureSyncStatus();const element=document.getElementById('pilotSyncState');if(!element)return;
    if(isCoach){element.hidden=true;return}
    element.hidden=false;element.className='pilot-sync'+(kind?' '+kind:'');
    if(text)element.textContent=text;
    else if(!CONFIG.submissionEnabled||!String(CONFIG.web3formsAccessKey||'').trim())element.textContent='기기 저장';
    else if(getOutbox().length)element.textContent=navigator.onLine?'전송 대기':'오프라인 저장';
    else element.textContent=record.submission.lastSubmittedAt?'자동 저장됨':'자동 저장 준비';
  }
  function classifyInteraction(element){
    if(element.id==='recordHint')return'hint';
    if(element.id==='tutorButton')return'tutor';
    if(['checkDeduction','runExperiment','checkTimeline','submitReport','saveKnowledge'].includes(element.id))return'milestone';
    if(element.matches?.('[data-case-read],[data-first-theory],[data-apply],[data-cause],[data-main-idea],[data-info-sentence],[data-compare],[data-reading-level],[data-confidence],.record-question button,.hidden-clue,.timeline-piece'))return'answer';
    return'ui';
  }
  function milestoneCorrectness(element){
    if(element.id==='checkDeduction')return !document.getElementById('deductionFeedback')?.classList.contains('retry');
    if(element.id==='runExperiment')return document.getElementById('experimentFeedback')?.classList.contains('success')||false;
    if(element.id==='checkTimeline')return document.getElementById('timelineFeedback')?.classList.contains('success')||false;
    if(element.id==='submitReport')return currentView()==='knowledgeView';
    if(element.id==='saveKnowledge')return currentView()==='solvedView';
    return null;
  }
  document.addEventListener('click',event=>{
    if(isCoach)return;
    const element=event.target.closest('button,.hidden-clue,.timeline-piece');if(!element)return;
    const kind=classifyInteraction(element);const key=promptKey(element);
    if(['answer','milestone','hint','tutor'].includes(kind))recordFirstResponse(key);
    const attempts=kind==='ui'?0:attempt(key);
    setTimeout(()=>{
      const directCorrect=correctnessOf(element);
      const correct=directCorrect===null&&kind==='milestone'?milestoneCorrectness(element):directCorrect;
      addEvent(kind,{target:key,value:element.value||element.dataset?.value||element.textContent?.trim().replace(/\s+/g,' ').slice(0,180)||'',correct,attempts});
      if(correct!==null)record.correctness[key]={correct,attempts,lastAt:new Date().toISOString()};
      if(kind==='hint')record.tracking.hintUsage[key]=(record.tracking.hintUsage[key]||0)+1;
      if(kind==='tutor'){
        const draft=document.getElementById('reportInput')?.value||'';
        if(!record.writing.originalDraft&&draft.trim())record.writing.originalDraft=draft;
        record.writing.tutorRequests.push({at:new Date().toISOString(),provider:'local_scaffold',draft,feedback:document.getElementById('tutorFeedback')?.textContent.trim()||''});
        record.writing.tutorRequests=record.writing.tutorRequests.slice(-20);
      }
      const summary=refreshSummary();recordViewChange();
      const solvedMilestone=(element.id==='checkDeduction'&&Boolean(summary.deductionSolved))
        ||(element.dataset?.apply==='correct'&&element.classList.contains('correct'))
        ||(element.id==='checkTimeline'&&!document.getElementById('timelineContinue')?.hidden)
        ||element.id==='submitReport';
      if(solvedMilestone)scheduleSubmission('milestone-'+(element.id||key));
      if(element.id==='saveKnowledge'){
        record.completed=true;record.completedAt=new Date().toISOString();record.writing.finalDraft=document.getElementById('reportInput')?.value||record.writing.latestDraft;
        scheduleSubmission('lesson-completed',true,120);
      }
      if(element.id==='playAgain'){enqueue('restarted',true);record=freshRecord();persistNow()}
    },0);
  });
  document.addEventListener('change',event=>{
    if(isCoach)return;
    const element=event.target;const key=promptKey(element);if(!key)return;
    recordFirstResponse(key);const attempts=attempt(key);
    setTimeout(()=>{addEvent('answer_change',{target:key,value:String(element.value||'').slice(0,180),attempts});refreshSummary()},0);
  });
  document.getElementById('reportInput')?.addEventListener('input',()=>{
    clearTimeout(reportObserveTimer);reportObserveTimer=setTimeout(()=>observeReportRevision('student_typing'),900);
  });
  const observer=new MutationObserver(()=>recordViewChange());
  document.querySelectorAll('.view').forEach(view=>observer.observe(view,{attributes:true,attributeFilter:['hidden']}));
  window.addEventListener('online',flushOutbox);
  window.addEventListener('oncuvate:hint-shown',event=>{
    if(isCoach)return;
    const kind=String(event.detail?.kind||'automatic');
    record.tracking.hintUsage[kind]=(record.tracking.hintUsage[kind]||0)+1;
    addEvent('hint_shown',{kind,round:Number(event.detail?.round||0)});
  });
  window.addEventListener('oncuvate:clue-found',event=>{
    if(isCoach)return;
    const assisted=Boolean(event.detail?.assisted);
    if(assisted)record.tracking.hintUsage['search-assist-used']=(record.tracking.hintUsage['search-assist-used']||0)+1;
    addEvent('clue_found',{clueId:String(event.detail?.clueId||''),round:Number(event.detail?.round||0),assisted});
  });
  window.addEventListener('oncuvate:coach-edit-applied',event=>{
    if(isCoach)return;
    const detail=event.detail||{};
    record.writing.coachEdits.push({at:new Date().toISOString(),editId:String(detail.editId||''),reportChanged:Boolean(detail.reportChanged),beforeDraft:String(detail.beforeDraft||''),afterDraft:String(detail.afterDraft||''),message:String(detail.message||'')});
    record.writing.coachEdits=record.writing.coachEdits.slice(-20);
    if(detail.reportChanged){if(!record.writing.originalDraft&&String(detail.beforeDraft||'').trim())record.writing.originalDraft=String(detail.beforeDraft);lastObservedReport=String(detail.afterDraft||'');record.writing.latestDraft=lastObservedReport}
    addEvent('coach_assistance',{reportChanged:Boolean(detail.reportChanged),messageProvided:Boolean(detail.message)});
  });
  window.addEventListener('pagehide',()=>{if(!isCoach){recordViewChange();refreshSummary();enqueue(record.completed?'pagehide-completed':'pagehide',true)}});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&!isCoach){recordViewChange();persistNow()}});

  lastObservedReport=document.getElementById('reportInput')?.value||'';
  record.progress.view=currentView();viewEnteredAt=Date.now();
  addEvent('session_ready',{standalonePilot:!RUNTIME.room});
  ensureSyncStatus();updateSyncStatus();flushOutbox();
  const recoveryMinutes=Math.max(2,Number(CONFIG.recoverySubmitMinutes)||4);
  setInterval(()=>{recordViewChange();refreshSummary();if(record.submission.dirty)scheduleSubmission('recovery-autosave')},recoveryMinutes*60*1000);
  setInterval(()=>{const value=document.getElementById('reportInput')?.value||'';if(value!==lastObservedReport)observeReportRevision('observed_change')},1800);
})();
