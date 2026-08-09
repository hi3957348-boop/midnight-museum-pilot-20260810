(function(){
  'use strict';
  const params=new URLSearchParams(location.search);
  const role=params.get('pilotRole')==='coach'?'coach':'child';
  const room=/^\d{5}$/.test(params.get('room')||'')?params.get('room'):'';
  const child=String(params.get('child')||'').replace(/[^A-Z0-9_-]/gi,'').slice(0,12)||'P001';
  if(!room){location.replace('pilot-entry.html');return}

  window.ONCUVATE={role,room,child,session:'pilot',folder:'midnight-museum-pilot'};
  window._firebaseReady=false;
  import('./pilot-firebase-core.js').then(api=>api.connectBridge(room)).catch(()=>{document.documentElement.dataset.pilotRelay='offline'});
})();
