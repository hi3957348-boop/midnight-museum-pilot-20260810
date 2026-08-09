const CLUE_HUNTS=[
  {id:'west',kicker:'SEARCH 1 · MIXED CLUES',title:'서쪽 전시실 수색',instruction:'서로 다른 시점의 기록이 섞여 있어요. 아직 사건 순서를 정하지 마세요.',piece:'FILE A',clues:[
    {id:'mist',label:'GLASS',text:'At 11:49 P.M., mist appeared outside the glass.',skin:'slate'},
    {id:'case',label:'CASE',text:'At 11:42 P.M., the ice-core case reached 3°C.',skin:'blue'},
    {id:'air-state',label:'AIR',text:'Warm, humid air rushed in from the rainy courtyard.',skin:'violet'}
  ]},
  {id:'center',kicker:'SEARCH 2 · MIXED CLUES',title:'중앙 전시실 수색',instruction:'앞서 찾은 문장과 이어질 수도, 전혀 다른 시점의 기록일 수도 있어요.',piece:'FILE B',clues:[
    {id:'door-time',label:'DOOR',text:'At 11:47 P.M., the west service door opened.',skin:'blue'},
    {id:'drops',label:'DROP',text:'Small drops slid down toward the floor.',skin:'violet'},
    {id:'hall',label:'HALL',text:'The museum hall remained at 21°C.',skin:'slate'}
  ]},
  {id:'east',kicker:'SEARCH 3 · MIXED CLUES',title:'동쪽 전시실 수색',instruction:'마지막 단서 세 개까지 모은 뒤, 아홉 문장을 다시 읽어 사건을 연결하세요.',piece:'FILE C',clues:[
    {id:'duration',label:'DOOR',text:'The service door stayed open for forty seconds.',skin:'slate'},
    {id:'sensor',label:'ALARM',text:'A drop reached the floor moisture sensor. At 11:51, the alarm rang.',skin:'violet'},
    {id:'rain',label:'WEATHER',text:'Rain fell in the courtyard, so the outside air was humid.',skin:'blue'}
  ]}
];

const DEDUCTION_ROWS=[
  {id:'cold',label:'COLD SURFACE',summary:'11:42 · 얼음 코어 유리관은 3°C로 홀보다 차가웠다.',fields:[
    {key:'when',label:'WHEN',prompt:'언제?',unlockAfter:1,options:[['','시각 선택'],['11:42','11:42 P.M.'],['11:47','11:47 P.M.'],['11:49','11:49 P.M.']]},
    {key:'what',label:'WHAT',prompt:'무엇이?',unlockAfter:1,options:[['','대상 선택'],['case','Ice-core case'],['hall','Museum hall'],['door','Service door']]},
    {key:'detail',label:'DETAIL',prompt:'어떤 상태?',unlockAfter:1,options:[['','상태 선택'],['3c','3°C — colder than the hall'],['21c','21°C — same as the hall'],['open','Open for 40 seconds']]}
  ],answer:{when:'11:42',what:'case',detail:'3c'}},
  {id:'air',label:'AIR ENTERS',summary:'11:47 · 문이 열려 따뜻하고 습한 공기가 들어왔다.',fields:[
    {key:'when',label:'WHEN',prompt:'언제?',unlockAfter:2,options:[['','시각 선택'],['11:42','11:42 P.M.'],['11:47','11:47 P.M.'],['11:51','11:51 P.M.']]},
    {key:'what',label:'WHAT',prompt:'무엇이?',unlockAfter:2,options:[['','대상 선택'],['case','Ice-core case'],['door','West service door'],['sensor','Floor sensor']]},
    {key:'detail',label:'DETAIL',prompt:'무슨 일이?',unlockAfter:1,options:[['','상태 선택'],['dry','Dry air went out'],['humid','Warm, humid air came in'],['cold','Cold air stayed inside']]}
  ],answer:{when:'11:47',what:'door',detail:'humid'}},
  {id:'drop',label:'DROP & ALARM',summary:'11:49–11:51 · 바깥 물방울이 바닥 수분 감지 센서에 닿았다.',fields:[
    {key:'when',label:'WHEN',prompt:'언제?',unlockAfter:3,options:[['','시각 선택'],['11:42 only','11:42 only'],['11:47 only','11:47 only'],['11:49-11:51','11:49 → 11:51']]},
    {key:'what',label:'WHERE',prompt:'어디에서?',unlockAfter:1,options:[['','장소 선택'],['inside','Inside glass → ceiling'],['outside','Outside glass → floor sensor'],['door','Service door → hall']]},
    {key:'detail',label:'RESULT',prompt:'어떤 결과?',unlockAfter:3,options:[['','결과 선택'],['alarm','A drop reached the moisture sensor'],['heat','The glass became warm'],['wind','The door closed again']]}
  ],answer:{when:'11:49-11:51',what:'outside',detail:'alarm'}}
];

const HUNT_POSITIONS=[[[19,29],[51,18],[81,57]],[[74,20],[28,62],[53,77]],[[15,48],[64,35],[83,70]]];

const EVENTS=[
  {id:'alarm',time:'11:51 P.M.',text:'A water drop reached the floor moisture sensor, and the alarm rang.'},
  {id:'guard',time:'11:50 P.M.',text:'The guard checked the meteorite room on the east side.'},
  {id:'door',time:'11:47 P.M.',text:'The service door opened, and warm, humid air entered.'},
  {id:'cold',time:'11:42 P.M.',text:'The ice-core glass case cooled to 3°C.'},
  {id:'mist',time:'11:49 P.M.',text:'Condensation formed on the outside of the cold glass.'}
];

const READING_LEVELS={
  easy:[
    ['definition','Condensation happens when warm, wet air touches something cold.'],
    ['setting','In the museum, the ice-core case was very cold.'],
    ['air','Then the service door opened, and warm, wet air came inside.'],
    ['change','Water vapor in the air touched the cold glass and cooled down.'],
    ['movement','It changed into small drops of water on the outside of the glass.'],
    ['alarm','One drop ran down to the floor moisture sensor, so the alarm rang.'],
    ['source','The glass did not make the water; the water was already in the air as vapor.']
  ],
  challenge:[
    ['definition','Condensation happens when warm, humid air touches a cold surface.'],
    ['setting','At the museum, the ice-core case was much colder than the surrounding hall.'],
    ['air','When the service door opened, warm, humid air entered and touched the cold glass.'],
    ['change','The water vapor in the air cooled and changed into small drops of liquid water.'],
    ['movement','These drops formed on the outside of the glass and moved toward the floor.'],
    ['alarm','One drop eventually reached the floor moisture sensor and caused the alarm to ring.'],
    ['source','The glass did not create the water; the water came from vapor that was already in the air.']
  ]
};

const state={nickname:'',firstTheory:'',searchRound:0,viewedFile:0,foundClues:new Set(),discoveryOrder:[],completedHunts:new Set(),deductions:{},confidence:{},deductionAttempts:0,deductionSolved:false,searchTimer:null,surface:'cold',air:'humid',labProven:false,applied:false,selectedPiece:null,timelineSolved:false,causeSolved:false,originalDraft:'',finalDraft:'',readingLevel:'easy',infoMain:false,infoSentence:false,infoCompare:false,comparison:'',soundOn:true,audio:null};
const views=['startView','briefingView','recordsView','labView','timelineView','reportView','knowledgeView','solvedView'];
let currentView='startView';

function syncCoachLessonNav(id){
  document.querySelectorAll('[data-coach-view]').forEach(button=>{
    const active=button.dataset.coachView===id;
    button.classList.toggle('active',active);
    if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
}
function showView(id){currentView=id;views.forEach(viewId=>document.getElementById(viewId).hidden=viewId!==id);syncCoachLessonNav(id);window.scrollTo({top:0,behavior:'smooth'});publishMirrorSoon()}
function openFreeView(id){
  if(id==='recordsView'&&!document.getElementById('hiddenClueLayer').children.length)startSearchRound(state.searchRound);
  if(id==='timelineView'&&!document.getElementById('eventPieces').children.length)renderEventPieces();
  if(id==='reportView')document.getElementById('reportComposer').hidden=false;
  if(id==='knowledgeView'){renderInformationParagraph();updateReadingProgress()}
  showView(id);playSound('select');
}
function playSound(type){if(!state.soundOn)return;try{state.audio=state.audio||new(window.AudioContext||window.webkitAudioContext)();const o=state.audio.createOscillator();const g=state.audio.createGain();const notes={select:[440,.045],reveal:[620,.09],success:[784,.18],retry:[180,.12]};const n=notes[type]||notes.select;o.type=type==='retry'?'square':'sine';o.frequency.setValueAtTime(n[0],state.audio.currentTime);if(type==='success')o.frequency.exponentialRampToValueAtTime(1046,state.audio.currentTime+n[1]);g.gain.setValueAtTime(.045,state.audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,state.audio.currentTime+n[1]);o.connect(g);g.connect(state.audio.destination);o.start();o.stop(state.audio.currentTime+n[1])}catch(error){}}
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1900)}

const liveRuntime=window.ONCUVATE||{};
const isCoachRole=liveRuntime.role==='coach';
const liveRoom=liveRuntime.room||'';
const liveChild=String(liveRuntime.child||'').replace(/[^a-zA-Z0-9_-]/g,'')||'child';
let liveMirrorStarted=false;
let mirrorPublishTimer;
let lastCoachEditId='';
const coachPendingEdits={};

function mirrorEscape(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
function selectedText(selector){const element=document.querySelector(selector);return element?element.textContent.trim().replace(/\s+/g,' '):''}
function eventText(id){return EVENTS.find(item=>item.id===id)?.text||id||''}
function deductionMirror(){return DEDUCTION_ROWS.map(row=>({
  label:row.label,
  fields:row.fields.map(field=>{const select=document.querySelector(`[data-deduction-field="${row.id}:${field.key}"]`);return{label:field.label,value:select?.selectedOptions?.[0]?.textContent.trim()||''}}),
  confidence:state.confidence[row.id]||'?'
}))}
function buildMirrorSnapshot(){
  const timeline=[0,1,2,3].map(index=>document.querySelector(`.time-slot[data-slot="${index}"] .timeline-piece`)?.dataset.event||'');
  const report=document.getElementById('reportInput')?.value||'';
  return{
    child:liveRuntime.child||liveChild,
    badge:state.nickname||document.getElementById('detectiveBadge')?.value||'',
    view:currentView,
    updatedAt:Date.now(),
    caseAnswer:selectedText('[data-case-read].correct,[data-case-read].wrong'),
    firstTheory:selectedText('[data-first-theory].selected'),
    clues:{found:state.foundClues.size,total:9,files:state.completedHunts.size},
    deductionSolved:state.deductionSolved,
    deduction:deductionMirror(),
    experiment:{surface:state.surface==='cold'?'차가운 병 · 3°C':'실온 병 · 21°C',air:state.air==='humid'?'따뜻하고 습한 공기':'건조한 공기',proven:state.labProven,applied:state.applied},
    timeline:{order:timeline.map(eventText),other:eventText(document.querySelector('.other-slot .timeline-piece')?.dataset.event||''),solved:state.timelineSolved},
    cause:selectedText('[data-cause].correct,[data-cause].wrong'),
    writing:{draft:report,original:state.originalDraft,final:state.finalDraft,tutor:document.getElementById('tutorFeedback')?.textContent.trim()||''},
    reading:{level:state.readingLevel==='easy'?'편하게 읽기':'도전해서 읽기',mainIdea:state.infoMain,evidence:state.infoSentence,comparison:state.comparison||''}
  }
}
function liveBridgeReady(){return window._firebaseReady===true&&typeof window.pth==='function'&&typeof window._set==='function'&&typeof window._onValue==='function'}
function publishMirror(){
  if(isCoachRole||!liveRoom||!liveMirrorStarted||!liveBridgeReady())return;
  try{Promise.resolve(window._set(window.pth('prog/'+liveChild),buildMirrorSnapshot())).catch(()=>{})}catch(error){}
}
function publishMirrorSoon(delay=90){if(isCoachRole||!liveRoom)return;clearTimeout(mirrorPublishTimer);mirrorPublishTimer=setTimeout(publishMirror,delay)}
function mirrorLine(label,value){return `<div class="mirror-line"><span>${mirrorEscape(label)}</span><strong>${mirrorEscape(value||'—')}</strong></div>`}
function renderCoachParticipants(records){
  const data=records&&typeof records==='object'?records:{};
  const participants=Object.entries(data).filter(([,value])=>value&&typeof value==='object').sort(([,a],[,b])=>(b.updatedAt||0)-(a.updatedAt||0));
  const grid=document.getElementById('coachParticipantGrid');
  const empty=document.getElementById('coachMirrorEmpty');
  empty.hidden=participants.length>0;
  grid.innerHTML=participants.map(([key,item])=>{
    const deductions=(item.deduction||[]).map(row=>`<li><b>${mirrorEscape(row.label)}</b><span>${(row.fields||[]).map(field=>`${mirrorEscape(field.label)}: ${mirrorEscape(field.value||'—')}`).join(' · ')} · 확신 ${mirrorEscape(row.confidence||'?')}</span></li>`).join('');
    const timeline=[...(item.timeline?.order||[]),item.timeline?.other?`다른 기록: ${item.timeline.other}`:''].filter(Boolean).join(' → ');
    const updated=item.updatedAt?new Date(item.updatedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
    return `<article class="coach-participant-card">
      <header><div><small>STUDENT ${mirrorEscape(item.child||key)}</small><h2>${mirrorEscape(item.badge||'탐정 배지 선택 전')} 탐정</h2></div><time>${mirrorEscape(updated)} 갱신</time></header>
      <div class="mirror-summary">${mirrorLine('현재 화면',VIEW_LABELS[item.view]||item.view||'시작')}${mirrorLine('사건파일 선택',item.caseAnswer)}${mirrorLine('첫 추리',item.firstTheory)}${mirrorLine('찾은 단서',`${item.clues?.found||0} / ${item.clues?.total||9}`)}</div>
      <section><h3>디덕션 시트</h3><ul class="mirror-deduction">${deductions||'<li><span>아직 선택한 내용이 없습니다.</span></li>'}</ul></section>
      <section class="mirror-two"><div><h3>실험 조건</h3>${mirrorLine('음료수병',item.experiment?.surface)}${mirrorLine('주변 공기',item.experiment?.air)}</div><div><h3>사건 순서</h3><p>${mirrorEscape(timeline||'아직 배치하지 않았습니다.')}</p></div></section>
      <section><h3>최종 원인 선택</h3><p>${mirrorEscape(item.cause||'아직 선택하지 않았습니다.')}</p></section>
      <section class="mirror-writing editable"><div><h3>작성 중인 사건 보고</h3><span>${(item.writing?.draft||'').length}자 · 코치 수정 가능</span></div><textarea data-coach-draft="${mirrorEscape(key)}">${mirrorEscape(coachPendingEdits[key]?.draft??item.writing?.draft??'')}</textarea><label class="coach-instruction-field">학생에게 보낼 안내<input data-coach-message="${mirrorEscape(key)}" value="${mirrorEscape(coachPendingEdits[key]?.message||'')}" placeholder="예: because 다음에 원인을 써 보세요."></label><div class="coach-edit-actions"><span data-coach-edit-status="${mirrorEscape(key)}">수정한 내용은 전송 버튼을 누를 때 학생 화면에 반영됩니다.</span><button type="button" data-send-coach-edit="${mirrorEscape(key)}">수정 내용과 안내 보내기</button></div></section>
      <section class="mirror-two"><div><h3>튜터 안내</h3><p>${mirrorEscape(item.writing?.tutor||'—')}</p></div><div><h3>정보글 활동</h3><p>${mirrorEscape(item.reading?.level||'—')} · 중심 내용 ${item.reading?.mainIdea?'완료':'진행 전'} · 근거 ${item.reading?.evidence?'완료':'진행 전'}</p></div></section>
    </article>`
  }).join('');
  document.getElementById('coachLiveStatus').textContent=participants.length?`학생 ${participants.length}명 · 실시간 연결`:'연결됨 · 응답 대기';
}
const VIEW_LABELS={startView:'입장',briefingView:'사건 파일',recordsView:'단서 탐색',labView:'결로 실험',timelineView:'사건 순서',reportView:'사건 보고',knowledgeView:'정보글 읽기',solvedView:'완료'};
function applyLiveRole(){
  if(!isCoachRole)return;
  state.soundOn=false;
  document.body.classList.add('coach-mode');
  views.forEach(id=>document.getElementById(id).hidden=true);
  document.getElementById('coachLessonBar').hidden=false;
  document.getElementById('coachMirrorView').hidden=false;
  document.getElementById('soundButton').hidden=true;
  document.getElementById('resetButton').hidden=true;
  const badge=document.getElementById('playerBadge');badge.hidden=false;badge.textContent='COACH · LIVE MIRROR';
  openFreeView('briefingView');
}
function startLiveMirror(){
  applyLiveRole();
  if(!liveRoom){if(isCoachRole)document.getElementById('coachLiveStatus').textContent='수업방 연결 없음';return}
  let attempts=0;
  const connect=()=>{
    if(liveMirrorStarted)return true;
    if(!liveBridgeReady())return false;
    liveMirrorStarted=true;
    if(isCoachRole){
      window._onValue(window.pth('prog'),snapshot=>{const value=typeof snapshot?.val==='function'?snapshot.val():snapshot;renderCoachParticipants(value||{})});
      document.getElementById('coachLiveStatus').textContent='연결됨 · 응답 대기';
    }else{
      try{const disconnect=window._onDisconnect?.(window.pth('prog/'+liveChild));disconnect?.remove?.()}catch(error){}
      window._onValue(window.pth('nav/mirrorEdits/'+liveChild),snapshot=>{
        const edit=typeof snapshot?.val==='function'?snapshot.val():snapshot;
        if(!edit||!edit.id||String(edit.id)===lastCoachEditId)return;
        lastCoachEditId=String(edit.id);
        let beforeDraft='';
        if(typeof edit.reportDraft==='string'){
          const input=document.getElementById('reportInput');beforeDraft=input.value;input.value=edit.reportDraft;state.finalDraft='';updateReportState();
        }
        const message=String(edit.message||'').trim();
        const panel=document.getElementById('coachMessage');panel.hidden=!message;
        document.getElementById('coachMessageText').textContent=message;
        window.dispatchEvent(new CustomEvent('oncuvate:coach-edit-applied',{detail:{editId:String(edit.id),reportChanged:typeof edit.reportDraft==='string',beforeDraft,afterDraft:typeof edit.reportDraft==='string'?edit.reportDraft:beforeDraft,message}}));
        if(message)toast('코치가 새로운 안내를 보냈어요.');
        publishMirrorSoon(20)
      });
      publishMirror();
    }
    return true
  };
  if(connect())return;
  const timer=setInterval(()=>{attempts+=1;if(connect()||attempts>80){clearInterval(timer);if(isCoachRole&&!liveMirrorStarted)document.getElementById('coachLiveStatus').textContent='실시간 연결 지연'}} ,250)
}

document.addEventListener('input',()=>publishMirrorSoon(140));
document.addEventListener('change',()=>publishMirrorSoon(60));
document.addEventListener('click',()=>publishMirrorSoon(80));
document.addEventListener('pointerup',()=>publishMirrorSoon(110));
document.getElementById('coachParticipantGrid').addEventListener('input',event=>{
  const draft=event.target.closest('[data-coach-draft]');
  const message=event.target.closest('[data-coach-message]');
  const key=draft?.dataset.coachDraft||message?.dataset.coachMessage;
  if(!key)return;
  coachPendingEdits[key]=coachPendingEdits[key]||{};
  if(draft)coachPendingEdits[key].draft=draft.value;
  if(message)coachPendingEdits[key].message=message.value;
});
document.getElementById('coachParticipantGrid').addEventListener('click',event=>{
  const button=event.target.closest('[data-send-coach-edit]');
  if(!button||!isCoachRole||!liveMirrorStarted||!liveBridgeReady())return;
  const key=button.dataset.sendCoachEdit;
  const editor=button.closest('.mirror-writing');
  const draft=editor?.querySelector('[data-coach-draft]')?.value||'';
  const message=editor?.querySelector('[data-coach-message]')?.value||'';
  const status=editor?.querySelector('[data-coach-edit-status]');
  button.disabled=true;
  const edit={id:String(Date.now()),reportDraft:draft,message:message.trim(),updatedAt:Date.now()};
  try{Promise.resolve(window._set(window.pth('nav/mirrorEdits/'+key),edit)).then(()=>{coachPendingEdits[key]={draft,message:''};const messageInput=editor?.querySelector('[data-coach-message]');if(messageInput)messageInput.value='';if(status)status.textContent='학생 화면으로 전송했습니다.';button.disabled=false}).catch(()=>{if(status)status.textContent='전송하지 못했습니다. 연결을 확인해 주세요.';button.disabled=false})}catch(error){if(status)status.textContent='전송하지 못했습니다. 연결을 확인해 주세요.';button.disabled=false}
});

document.getElementById('startButton').addEventListener('click',()=>{const select=document.getElementById('detectiveBadge');const name=select.value;if(!name){document.getElementById('nicknameError').textContent='탐정 배지를 하나 골라 주세요.';select.focus();return}state.nickname=name;document.getElementById('nicknameError').textContent='';document.querySelectorAll('[data-player]').forEach(el=>el.textContent=name);const badge=document.getElementById('playerBadge');badge.hidden=false;badge.textContent=name+' 탐정';showView('briefingView');playSound('success')});
document.getElementById('soundButton').addEventListener('click',event=>{state.soundOn=!state.soundOn;event.currentTarget.setAttribute('aria-pressed',String(state.soundOn));event.currentTarget.lastChild.textContent=state.soundOn?'효과음 ON':'효과음 OFF';if(state.soundOn)playSound('select')});
document.getElementById('resetButton').addEventListener('click',()=>location.reload());
document.querySelectorAll('[data-open-view]').forEach(button=>button.addEventListener('click',()=>openFreeView(button.dataset.openView)));
document.querySelectorAll('[data-coach-view]').forEach(button=>button.addEventListener('click',()=>openFreeView(button.dataset.coachView)));
document.querySelectorAll('[data-case-read]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-case-read]').forEach(el=>el.classList.remove('correct','wrong'));const correct=button.dataset.caseRead==='correct';button.classList.add(correct?'correct':'wrong');document.getElementById('caseReadFeedback').textContent=correct?'Exactly. The access-card record supports suspicion, but it does not prove what caused the alarm.':'Look again for the record that connects the guard to the minutes before the alarm.';playSound(correct?'success':'retry')}));
document.querySelectorAll('[data-first-theory]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-first-theory]').forEach(el=>el.classList.remove('selected'));button.classList.add('selected');state.firstTheory=button.dataset.firstTheory;document.getElementById('firstTheoryFeedback').textContent='First theory saved. Keep it, revise it, or reject it when new evidence appears.';playSound('select')}));
document.getElementById('briefingContinue').addEventListener('click',()=>openFreeView('recordsView'));

function shuffled(items){return [...items].sort(()=>Math.random()-.5)}
function allClues(){return CLUE_HUNTS.flatMap(hunt=>hunt.clues)}
function currentHuntFound(){return CLUE_HUNTS[state.searchRound].clues.filter(clue=>state.foundClues.has(clue.id))}
function optionMarkup(options){return options.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}

function renderPuzzleProgress(){
  const host=document.getElementById('puzzleProgress');
  host.classList.toggle('assembled',state.deductionSolved);
  host.innerHTML=CLUE_HUNTS.map((hunt,index)=>{
    const available=index<=state.searchRound;
    return `<button type="button" data-view-file="${index}" class="puzzle-piece ${state.completedHunts.has(index)?'earned':''} ${state.searchRound===index&&!state.completedHunts.has(index)?'current':''} ${state.viewedFile===index?'reviewing':''}" ${available?'':'disabled'} aria-pressed="${state.viewedFile===index}"><i>${state.completedHunts.has(index)?'✓':index+1}</i><span>${hunt.piece}</span></button>`;
  }).join('');
  host.querySelectorAll('[data-view-file]').forEach(button=>button.addEventListener('click',()=>{
    state.viewedFile=Number(button.dataset.viewFile);renderPuzzleProgress();renderClueSlots();playSound('select');
  }));
}

function renderClueSlots(){
  const host=document.getElementById('clueSlots');
  const hunt=CLUE_HUNTS[state.viewedFile];
  const foundInFile=state.discoveryOrder.filter(id=>hunt.clues.some(clue=>clue.id===id));
  const cards=Array.from({length:3},(_,index)=>{
    const id=foundInFile[index];
    if(!id)return `<article class="clue-card locked"><small>${hunt.piece} · SLOT ${index+1}</small><p>아직 찾지 못한 단서</p></article>`;
    const clue=hunt.clues.find(item=>item.id===id);
    const globalIndex=state.discoveryOrder.indexOf(id)+1;
    return `<article class="clue-card found"><small>FOUND ${String(globalIndex).padStart(2,'0')} · ${clue.label}</small><p>${clue.text}</p></article>`;
  }).join('');
  host.innerHTML=`<div class="clue-file-head"><div><small>OPEN FILE</small><strong>${hunt.piece}</strong></div><span>${foundInFile.length} / 3 단서</span></div>${cards}`;
  const found=currentHuntFound();
  document.getElementById('roundFoundCount').textContent=found.length;
  const check=document.getElementById('checkDeduction');
  if(state.foundClues.size===9&&state.completedHunts.size===3&&!state.deductionSolved){check.disabled=false;check.textContent='통합 디덕션 시트 확인'}
  else{check.disabled=found.length<3||state.completedHunts.has(state.searchRound);check.textContent=found.length<3?`현재 구역 단서 ${3-found.length}개 더 찾기`:'현재 수색 구역 확보'}
}

function rowRecorded(row){
  const values=state.deductions[row.id]||{};
  return row.fields.every(field=>values[field.key])&&state.confidence[row.id]==='✓';
}

function updateRoundGate(){
  const next=document.getElementById('nextRoundButton');
  if(next.hidden||state.completedHunts.size===0||state.completedHunts.size>=3||state.deductionSolved)return;
  next.disabled=false;
  next.textContent='다음 단서 3개 찾기';
}

function updateDeductionProgress(){
  const count=DEDUCTION_ROWS.filter(rowRecorded).length;
  document.getElementById('deductionProgress').textContent=`${count} / 3줄 기록`;
}

function renderDeductionRows(){
  const host=document.getElementById('deductionRows');
  const files=state.completedHunts.size;
  host.closest('.deduction-sheet').classList.toggle('waiting',files===0);
  document.getElementById('deductionTitle').textContent=state.deductionSolved?'추리 기록 완성':`FILE ${files}/3`;
  host.innerHTML=DEDUCTION_ROWS.map((row,index)=>{
    const values=state.deductions[row.id]||{};
    const confidence=state.confidence[row.id]||'?';
    const fields=files>0?row.fields.map(field=>`<label class="deduction-cell"><span>${field.label}</span><select aria-label="${row.label} ${field.label}" data-row="${row.id}" data-deduction-field="${field.key}" ${state.deductionSolved?'disabled':''}>${optionMarkup(field.options)}</select></label>`).join(''):'<span class="deduction-locked-cell">—</span><span class="deduction-locked-cell">—</span><span class="deduction-locked-cell">—</span>';
    const rowReady=files===3&&row.fields.every(field=>values[field.key]);
    return `<article class="deduction-row ${files===0?'locked':''} ${rowRecorded(row)?'recorded':''} ${state.deductionSolved?'complete':''}"><header><b aria-hidden="true">${index+1}</b><span>${row.label}</span></header>${fields}<button class="confidence-button" type="button" data-confidence="${row.id}" aria-label="${row.label} 확신 ${confidence}" ${!rowReady||state.deductionSolved?'disabled':''}>${confidence}</button></article>`;
  }).join('');
  host.querySelectorAll('[data-deduction-field]').forEach(select=>{
    const rowId=select.dataset.row;
    select.value=(state.deductions[rowId]||{})[select.dataset.deductionField]||'';
    select.addEventListener('change',()=>{
      state.deductions[rowId]=state.deductions[rowId]||{};
      state.deductions[rowId][select.dataset.deductionField]=select.value;
      document.getElementById('deductionFeedback').className='deduction-feedback';
      document.getElementById('deductionFeedback').textContent='';
      renderDeductionRows();
      playSound('select');
    });
  });
  host.querySelectorAll('[data-confidence]').forEach(button=>button.addEventListener('click',()=>{
    const levels=['?','○','✓'];
    const rowId=button.dataset.confidence;
    state.confidence[rowId]=levels[(levels.indexOf(state.confidence[rowId]||'?')+1)%levels.length];
    document.getElementById('deductionFeedback').className='deduction-feedback';
    document.getElementById('deductionFeedback').textContent='';
    renderDeductionRows();
    playSound('select');
  }));
  updateDeductionProgress();
  updateRoundGate();
}

function revealClue(clueId,button){
  if(state.foundClues.has(clueId))return;
  const assisted=button.classList.contains('assist');
  state.foundClues.add(clueId);
  state.discoveryOrder.push(clueId);
  button.classList.add('found');
  button.disabled=true;
  button.setAttribute('aria-label','찾은 단서');
  renderClueSlots();
  renderDeductionRows();
  const remaining=3-currentHuntFound().length;
  document.getElementById('searchStatus').textContent=remaining?`찾았다! 이 구역에 단서 ${remaining}개가 더 숨어 있어요.`:`이 구역의 단서 세 개 발견! 전체 ${state.foundClues.size}/9개를 모았어요.`;
  clearTimeout(state.searchTimer);
  if(remaining)scheduleSearchAssist();
  window.dispatchEvent(new CustomEvent('oncuvate:clue-found',{detail:{clueId,round:state.searchRound+1,assisted}}));
  playSound('reveal');
  toast(remaining?'숨은 단서 발견!':`증거 파일 ${state.searchRound+1}/3 확보 가능!`);
}

function scheduleSearchAssist(){
  clearTimeout(state.searchTimer);
  state.searchTimer=setTimeout(()=>{
    const remaining=[...document.querySelectorAll('.hidden-clue:not(.found)')];
    if(!remaining.length)return;
    remaining[0].classList.add('assist');
    window.dispatchEvent(new CustomEvent('oncuvate:hint-shown',{detail:{kind:'search-assist',round:state.searchRound+1}}));
    document.getElementById('searchStatus').textContent='아직 못 찾았나요? 지도에서 희미하게 반짝이는 모서리를 살펴보세요.';
  },12000);
}

function startSearchRound(index){
  state.searchRound=index;
  state.viewedFile=index;
  const hunt=CLUE_HUNTS[index];
  document.getElementById('roundKicker').textContent=hunt.kicker;
  document.getElementById('roundTitle').textContent=hunt.title;
  document.getElementById('roundInstruction').textContent=hunt.instruction;
  document.getElementById('deductionFeedback').className='deduction-feedback';
  document.getElementById('deductionFeedback').textContent='';
  document.getElementById('nextRoundButton').hidden=true;
  document.getElementById('nextRoundButton').disabled=true;
  const layer=document.getElementById('hiddenClueLayer');
  layer.innerHTML='';
  const positions=shuffled(HUNT_POSITIONS[index]);
  shuffled(hunt.clues).forEach((clue,indexInRound)=>{
    const button=document.createElement('button');
    button.type='button';
    button.className=`hidden-clue skin-${clue.skin}`;
    button.style.left=`${positions[indexInRound][0]}%`;
    button.style.top=`${positions[indexInRound][1]}%`;
    button.style.setProperty('--delay',`${indexInRound*-.8}s`);
    button.setAttribute('aria-label',`숨은 단서 ${indexInRound+1}`);
    button.innerHTML='<i aria-hidden="true"><span></span><span></span><span></span></i>';
    button.addEventListener('click',()=>revealClue(clue.id,button));
    layer.appendChild(button);
  });
  document.getElementById('searchStatus').textContent='어느 시점의 기록인지는 열어 보기 전까지 알 수 없어요.';
  renderPuzzleProgress();
  renderClueSlots();
  renderDeductionRows();
  scheduleSearchAssist();
}

document.getElementById('checkDeduction').addEventListener('click',()=>{
  const feedback=document.getElementById('deductionFeedback');
  if(!state.completedHunts.has(state.searchRound)){
    if(currentHuntFound().length<3)return;
    state.completedHunts.add(state.searchRound);
    clearTimeout(state.searchTimer);
    renderPuzzleProgress();renderClueSlots();renderDeductionRows();
    if(state.searchRound<CLUE_HUNTS.length-1){
      feedback.className='deduction-feedback';feedback.textContent=`증거 파일 ${state.searchRound+1}/3 확보. 세 단서로 판단할 수 있는 칸만 스스로 골라 채워 보세요.`;
      const next=document.getElementById('nextRoundButton');next.hidden=false;next.disabled=false;next.textContent='다음 단서 3개 찾기';
      document.getElementById('checkDeduction').disabled=true;
      updateRoundGate();
    }else{
      feedback.className='deduction-feedback success';feedback.textContent='아홉 단서가 모두 모였어요. 이제 발견 순서가 아니라 내용의 연결을 찾아보세요.';
      document.getElementById('checkDeduction').disabled=false;document.getElementById('checkDeduction').textContent='통합 디덕션 시트 확인';
    }
    playSound('success');toast(`증거 파일 ${state.completedHunts.size}/3 확보!`);return;
  }
  if(state.foundClues.size<9||state.deductionSolved)return;
  const missing=DEDUCTION_ROWS.some(row=>!rowRecorded(row));
  if(missing){
    const emptyFields=[...document.querySelectorAll('[data-deduction-field]')].filter(select=>!select.value);
    const pendingConfidence=[...document.querySelectorAll('[data-confidence]')].filter(button=>button.textContent.trim()!=='✓');
    const message=emptyFields.length?'비어 있는 칸을 먼저 선택해 주세요.':'각 줄 오른쪽의 확신 표시를 눌러 ✓로 바꿔 주세요.';
    feedback.className='deduction-feedback retry';feedback.textContent=message;
    emptyFields.forEach(select=>select.classList.add('needs-attention'));
    pendingConfidence.forEach(button=>button.classList.add('needs-attention'));
    toast(message);playSound('retry');return
  }
  state.deductionAttempts+=1;
  const wrongRows=DEDUCTION_ROWS.filter(row=>!Object.entries(row.answer).every(([key,value])=>(state.deductions[row.id]||{})[key]===value));
  if(wrongRows.length){feedback.className='deduction-feedback retry';feedback.textContent='이야기의 앞뒤가 아직 맞지 않아요. 검토 렌즈: WHEN을 시간순으로 비교하고, WHAT이 같은 대상을 가리키는지 본 뒤, DETAIL이 자연스럽게 이어지는지 확인하세요. 선택값은 그대로 두고 필요한 칸만 수정할 수 있어요.';toast('연결이 아직 맞지 않아요. 시트를 다시 확인해 보세요.');playSound('retry');return}
  state.deductionSolved=true;
  feedback.className='deduction-feedback success';feedback.textContent='통합 디덕션 완성! 흩어진 기록이 하나의 사건으로 연결됐어요.';
  document.getElementById('checkDeduction').disabled=true;document.getElementById('checkDeduction').textContent='사건 퍼즐 완성';
  const next=document.getElementById('nextRoundButton');next.hidden=false;next.disabled=false;next.textContent='지식 실험실로';
  renderPuzzleProgress();renderDeductionRows();playSound('success');toast('하나의 사건 퍼즐 완성!');
});

document.getElementById('nextRoundButton').addEventListener('click',()=>{
  if(state.deductionSolved){showView('labView');playSound('success');return}
  if(!state.completedHunts.has(state.searchRound))return;
  if(state.searchRound<CLUE_HUNTS.length-1){startSearchRound(state.searchRound+1);document.getElementById('museumMap').scrollIntoView({behavior:'smooth',block:'center'})}
});

function resetBottlePhoto(){const image=document.getElementById('bottleExperimentImage');image.src='assets/condensation-bottle-dry.png';image.alt='표면에 물방울이 없는 음료수병';document.getElementById('bottleStateLabel').textContent='Ready to test';document.getElementById('glassLab').classList.remove('condensing')}
function updateBottleReadout(){document.getElementById('bottleTempReadout').textContent=state.surface==='cold'?'COLD BOTTLE · 3°C':'ROOM-TEMP BOTTLE · 21°C';document.getElementById('bottleAirReadout').textContent=state.air==='humid'?'WARM, HUMID AIR':'DRY AIR'}
document.querySelectorAll('.condition-btn').forEach(button=>button.addEventListener('click',()=>{const condition=button.dataset.condition;document.querySelectorAll(`.condition-btn[data-condition="${condition}"]`).forEach(el=>el.classList.remove('selected'));button.classList.add('selected');state[condition]=button.dataset.value;resetBottlePhoto();updateBottleReadout();document.getElementById('experimentFeedback').className='experiment-feedback';document.getElementById('experimentFeedback').textContent='You changed a condition. Observe the bottle again.';playSound('select')}));
document.getElementById('runExperiment').addEventListener('click',()=>{const success=state.surface==='cold'&&state.air==='humid';const lab=document.getElementById('glassLab');const image=document.getElementById('bottleExperimentImage');const stateLabel=document.getElementById('bottleStateLabel');const feedback=document.getElementById('experimentFeedback');lab.classList.toggle('condensing',success);if(success){image.src='assets/condensation-bottle-wet.png';image.alt='차가운 표면에 많은 물방울이 맺힌 음료수병';stateLabel.textContent='Water droplets formed';state.labProven=true;feedback.className='experiment-feedback success';feedback.textContent='Water droplets found! Water vapor in the warm, humid air touched the cold bottle, cooled, and changed into liquid droplets.';document.getElementById('applicationCheck').hidden=false;playSound('success');toast('SCIENCE KEY FOUND · CONDENSATION')}else{image.src='assets/condensation-bottle-dry.png';image.alt='표면에 물방울이 없는 음료수병';stateLabel.textContent='No visible change';feedback.className='experiment-feedback';feedback.textContent=state.surface==='room'?'The bottle was not cold enough for visible droplets to form.':'The dry air did not contain enough water vapor to form visible droplets.';playSound('select')}});
document.querySelectorAll('[data-apply]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-apply]').forEach(el=>el.classList.remove('correct','wrong'));if(button.dataset.apply==='correct'){button.classList.add('correct');state.applied=true;document.getElementById('applyFeedback').textContent='Correct. You can use this science idea to rebuild the museum case.';document.getElementById('labContinue').disabled=false;document.getElementById('labContinue').textContent='Science key secured · Rebuild the timeline';playSound('success')}else{button.classList.add('wrong');document.getElementById('applyFeedback').textContent='For water vapor to cool, the surface must be colder than the air.';playSound('retry')}}));
document.getElementById('labContinue').addEventListener('click',()=>{if(!state.applied)return;renderEventPieces();showView('timelineView');playSound('success')});

function pieceMarkup(event){return `<div class="timeline-piece" data-event="${event.id}" role="button" tabindex="0" aria-pressed="false" aria-label="${event.text}"><span>${event.text}</span></div>`}
function renderEventPieces(){const dock=document.getElementById('eventPieces');dock.innerHTML=EVENTS.map(pieceMarkup).join('');bindPieces();state.selectedPiece=null;state.timelineSolved=false;document.getElementById('timelineFeedback').className='timeline-feedback';document.getElementById('timelineFeedback').textContent='사건의 원인과 결과가 자연스럽게 이어지도록 놓아 보세요.';document.getElementById('checkTimeline').hidden=false;document.getElementById('timelineContinue').hidden=true;document.querySelectorAll('.slot-drop').forEach(slot=>slot.innerHTML='')}
function selectPiece(piece){
  document.querySelectorAll('.timeline-piece.selected').forEach(el=>{el.classList.remove('selected');el.setAttribute('aria-pressed','false')});
  if(piece.closest('.slot-drop')){document.getElementById('eventPieces').appendChild(piece);state.selectedPiece=null;piece.setAttribute('aria-pressed','false');toast('사건 조각을 보관함으로 돌렸어요.');playSound('select');return}
  if(state.selectedPiece===piece){state.selectedPiece=null;return}
  state.selectedPiece=piece;piece.classList.add('selected');piece.setAttribute('aria-pressed','true');toast('사건 조각을 선택했어요. 놓을 순서 칸을 누르세요.');
}
function placePiece(piece,slot){const drop=slot.querySelector('.slot-drop');const previous=drop.querySelector('.timeline-piece');if(previous&&previous!==piece)document.getElementById('eventPieces').appendChild(previous);drop.appendChild(piece);piece.classList.remove('selected');piece.setAttribute('aria-pressed','false');state.selectedPiece=null;slot.classList.add('target');setTimeout(()=>slot.classList.remove('target'),300);playSound('select')}
function bindPieces(){document.querySelectorAll('.timeline-piece').forEach(piece=>{let suppressClick=false;piece.addEventListener('click',()=>{if(!suppressClick)selectPiece(piece)});piece.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectPiece(piece)}});piece.addEventListener('pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;const start={x:event.clientX,y:event.clientY};let moved=false;let ghost=null;piece.setPointerCapture?.(event.pointerId);const move=moveEvent=>{if(!moved&&Math.hypot(moveEvent.clientX-start.x,moveEvent.clientY-start.y)<7)return;if(!moved){moved=true;ghost=piece.cloneNode(true);ghost.style.position='fixed';ghost.style.zIndex='500';ghost.style.width=Math.min(270,piece.getBoundingClientRect().width)+'px';ghost.style.pointerEvents='none';ghost.style.opacity='.94';ghost.style.transform='rotate(-2deg)';document.body.appendChild(ghost);piece.classList.add('drag-source')}ghost.style.left=moveEvent.clientX+12+'px';ghost.style.top=moveEvent.clientY+12+'px';moveEvent.preventDefault()};const finish=endEvent=>{piece.removeEventListener('pointermove',move);piece.removeEventListener('pointerup',finish);piece.removeEventListener('pointercancel',finish);ghost?.remove();piece.classList.remove('drag-source');if(moved){suppressClick=true;setTimeout(()=>{suppressClick=false},0);const slot=document.elementFromPoint(endEvent.clientX,endEvent.clientY)?.closest('[data-slot]');if(slot)placePiece(piece,slot)}};piece.addEventListener('pointermove',move);piece.addEventListener('pointerup',finish);piece.addEventListener('pointercancel',finish)})})}
document.querySelectorAll('[data-slot]').forEach(slot=>{slot.addEventListener('click',event=>{if(event.target.closest('.timeline-piece'))return;if(state.selectedPiece)placePiece(state.selectedPiece,slot)});slot.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&state.selectedPiece){event.preventDefault();placePiece(state.selectedPiece,slot)}})});
document.getElementById('resetTimeline').addEventListener('click',()=>{renderEventPieces();playSound('select')});
document.getElementById('checkTimeline').addEventListener('click',()=>{const expected=['cold','door','mist','alarm'];const actual=[0,1,2,3].map(index=>document.querySelector(`.time-slot[data-slot="${index}"] .timeline-piece`)?.dataset.event);const other=document.querySelector('.other-slot .timeline-piece')?.dataset.event;const missing=[...actual,other].filter(value=>!value).length;const feedback=document.getElementById('timelineFeedback');if(missing){feedback.className='timeline-feedback retry';feedback.textContent='아직 놓지 않은 사건 조각이 있어요. 네 순서 칸과 다른 기록 칸을 모두 채워 주세요.';playSound('retry');return}const correct=expected.every((id,index)=>actual[index]===id)&&other==='guard';if(!correct){feedback.className='timeline-feedback retry';feedback.textContent='원인과 결과의 연결을 다시 확인하세요. 경보를 직접 일으키지 않은 기록은 하나뿐이에요.';playSound('retry');document.querySelectorAll('.time-slot,.other-slot').forEach(el=>{el.classList.add('target');setTimeout(()=>el.classList.remove('target'),430)});return}state.timelineSolved=true;feedback.className='timeline-feedback success';feedback.textContent='사건 복구 성공! 차가운 유리 → 습한 공기 → 결로 → 센서 경보의 원인 사슬이 완성됐어요.';document.getElementById('checkTimeline').hidden=true;document.getElementById('timelineContinue').hidden=false;playSound('success')});
document.getElementById('timelineContinue').addEventListener('click',()=>{if(!state.timelineSolved)return;showView('reportView');playSound('success')});

document.querySelectorAll('[data-cause]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-cause]').forEach(el=>el.classList.remove('correct','wrong'));const feedback=document.getElementById('causeFeedback');if(button.dataset.cause!=='correct'){button.classList.add('wrong');feedback.textContent=button.textContent.includes('스스로')?'유리는 물을 만들지 않아요. 공기 중 수증기가 어디서 식었는지 떠올려 보세요.':'출입 기록에는 유리관이 열렸다는 증거가 없어요. 물방울과 센서의 관계를 살펴보세요.';playSound('retry');return}button.classList.add('correct');state.causeSolved=true;feedback.textContent='정확해요. 이제 기록과 과학 지식을 연결해 사건을 자기 말로 보고하세요.';document.getElementById('reportComposer').hidden=false;document.getElementById('reportComposer').scrollIntoView({behavior:'smooth',block:'start'});playSound('success')}));
document.querySelectorAll('[data-frame]').forEach(button=>button.addEventListener('click',()=>{const input=document.getElementById('reportInput');const frame=button.dataset.frame;const spacer=input.value&& !input.value.endsWith('\n')?'\n':'';input.value+=spacer+frame;input.focus();input.setSelectionRange(input.value.length,input.value.length);updateReportState();playSound('select')}));
function reportSignals(text){const lower=text.toLowerCase();return{cold:/3\s*°|3\s*c|cold|차가운|3도/.test(lower),air:/warm|humid|moist|습한|따뜻/.test(lower),science:/condens|water drop|결로|물방울|수증기/.test(lower),result:/sensor|alarm|센서|경보/.test(lower),reason:/because|therefore|so |그래서|때문/.test(lower)}}
function updateReportState(){const input=document.getElementById('reportInput');const text=input.value.trim();document.getElementById('reportCount').textContent=input.value.length;const signals=reportSignals(text);const core=[signals.cold,signals.air,signals.science,signals.result].filter(Boolean).length;document.getElementById('submitReport').disabled=text.length<70||core<3}
document.getElementById('reportInput').addEventListener('input',updateReportState);
document.getElementById('tutorButton').addEventListener('click',()=>{const text=document.getElementById('reportInput').value.trim();const feedback=document.getElementById('tutorFeedback');if(!text){feedback.textContent='먼저 사건의 시작을 한 문장으로 적어 보세요. “At first, I thought...”로 시작해도 좋아요.';return}if(!state.originalDraft)state.originalDraft=text;const s=reportSignals(text);const missing=[];if(!s.cold)missing.push('유리관이 차가웠다는 기록');if(!s.air)missing.push('따뜻하고 습한 공기가 들어온 사실');if(!s.science)missing.push('condensation의 뜻');if(!s.result)missing.push('물방울과 센서 경보의 연결');if(!s.reason)missing.push('because 또는 therefore 같은 원인 연결어');if(missing.length){feedback.textContent='좋은 시작이에요. 다음 내용을 더 확인해 보세요: '+missing.slice(0,2).join(', ')+'.';playSound('select')}else{feedback.textContent='증거, 과학 지식, 결과가 모두 연결됐어요. 같은 말이 반복되는지 한 번 읽고 최종 문장을 제출하세요.';playSound('success')}updateReportState()});
document.getElementById('submitReport').addEventListener('click',()=>{const text=document.getElementById('reportInput').value.trim();if(document.getElementById('submitReport').disabled||!text)return;if(!state.originalDraft)state.originalDraft=text;state.finalDraft=text;state.infoMain=false;state.infoSentence=false;state.infoCompare=false;state.comparison='';document.getElementById('myReportCompare').textContent=text;document.querySelectorAll('[data-main-idea],[data-compare]').forEach(el=>el.classList.remove('correct','wrong','selected'));document.getElementById('mainIdeaFeedback').textContent='';document.getElementById('sourceSentenceFeedback').textContent='유리가 물을 만들었는지 설명하는 문장을 찾아보세요.';document.getElementById('compareFeedback').textContent='';renderInformationParagraph();updateReadingProgress();showView('knowledgeView');playSound('success')});
function renderInformationParagraph(){const sentences=READING_LEVELS[state.readingLevel];document.getElementById('informationParagraph').innerHTML=sentences.map(([key,text])=>`<button class="info-sentence" data-info-sentence="${key}" type="button">${text}</button>`).join(' ');document.querySelectorAll('[data-reading-level]').forEach(button=>button.classList.toggle('selected',button.dataset.readingLevel===state.readingLevel))}
function updateReadingProgress(){const count=[state.infoMain,state.infoSentence,state.infoCompare].filter(Boolean).length;document.getElementById('readingProgress').textContent='완료한 읽기 활동 '+count+' / 3';const button=document.getElementById('saveKnowledge');button.disabled=count<3;button.textContent=count<3?'읽기 활동을 모두 완료해 주세요':'지식 파일에 저장하기'}
document.querySelectorAll('[data-reading-level]').forEach(button=>button.addEventListener('click',()=>{state.readingLevel=button.dataset.readingLevel;state.infoSentence=false;renderInformationParagraph();document.getElementById('sourceSentenceFeedback').textContent='수준을 바꿨어요. 문단을 다시 읽고 물의 출처를 설명하는 문장을 찾아보세요.';updateReadingProgress();playSound('select')}));
document.querySelectorAll('[data-main-idea]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-main-idea]').forEach(el=>el.classList.remove('correct','wrong'));if(button.dataset.mainIdea==='correct'){button.classList.add('correct');state.infoMain=true;document.getElementById('mainIdeaFeedback').textContent='맞아요. 문단 전체가 결로와 경보의 원인 사슬을 설명해요.';playSound('success')}else{button.classList.add('wrong');document.getElementById('mainIdeaFeedback').textContent='첫 문장과 마지막 두 문장을 연결해 다시 생각해 보세요.';playSound('retry')}updateReadingProgress()}));
function chooseInfoSentence(sentence){document.querySelectorAll('.info-sentence').forEach(el=>el.classList.remove('correct','wrong','selected'));if(sentence.dataset.infoSentence==='source'){sentence.classList.add('correct');state.infoSentence=true;document.getElementById('sourceSentenceFeedback').textContent='찾았어요. 물은 유리가 아니라 공기 속 수증기에서 왔어요.';playSound('success')}else{sentence.classList.add('wrong');document.getElementById('sourceSentenceFeedback').textContent='이 문장도 중요한 정보예요. 하지만 물이 원래 어디에 있었는지 말하는 문장을 찾아보세요.';playSound('retry')}updateReadingProgress()}
document.getElementById('informationParagraph').addEventListener('click',event=>{const sentence=event.target.closest('.info-sentence');if(sentence)chooseInfoSentence(sentence)});
document.getElementById('informationParagraph').addEventListener('keydown',event=>{const sentence=event.target.closest('.info-sentence');if(sentence&&(event.key==='Enter'||event.key===' ')){event.preventDefault();chooseInfoSentence(sentence)}});
document.querySelectorAll('[data-compare]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-compare]').forEach(el=>el.classList.remove('selected'));button.classList.add('selected');state.infoCompare=true;state.comparison=button.dataset.compare;document.getElementById('compareFeedback').textContent='좋아요. 이 정보를 기억하면 다음 설명은 더 정확하고 풍부해져요.';playSound('success');updateReadingProgress()}));
document.getElementById('saveKnowledge').addEventListener('click',()=>{if(!state.infoMain||!state.infoSentence||!state.infoCompare)return;document.getElementById('finalReport').textContent=state.finalDraft;try{localStorage.setItem('oncuvate_midnight_museum_last_report',JSON.stringify({nickname:state.nickname,original:state.originalDraft,revised:state.finalDraft,readingLevel:state.readingLevel,knowledgeComparison:state.comparison,completedAt:new Date().toISOString()}))}catch(error){}showView('solvedView');playSound('success')});
document.getElementById('playAgain').addEventListener('click',()=>location.reload());

renderPuzzleProgress();
renderInformationParagraph();
startLiveMirror();
