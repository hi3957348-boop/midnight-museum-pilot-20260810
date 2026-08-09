import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getDatabase, get, onDisconnect, onValue, ref, remove, runTransaction, set } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

const firebaseConfig={apiKey:"AIzaSyAHib_-XPXfuvhsZcPlMSnqi4O46kAR0mM",authDomain:"non-1-4a6f5.firebaseapp.com",databaseURL:"https://non-1-4a6f5-default-rtdb.asia-southeast1.firebasedatabase.app",projectId:"non-1-4a6f5",storageBucket:"non-1-4a6f5.firebasestorage.app",messagingSenderId:"871721592960",appId:"1:871721592960:web:b342eab286024473845e65"};
const ROOT="midnight-museum-pilot/rooms";
const ROOM_LIFETIME_MS=3*60*60*1000;
const app=getApps().find(item=>item.name==="midnight-museum-pilot")||initializeApp(firebaseConfig,"midnight-museum-pilot");
const db=getDatabase(app);

function validRoom(value){return /^\d{5}$/.test(String(value||""))?String(value):""}
function metaRef(room){return ref(db,`${ROOT}/${room}/meta`)}

export async function createRoom(value){const room=validRoom(value);if(!room)throw new Error("invalid-room");const now=Date.now();const result=await runTransaction(metaRef(room),current=>{if(current&&Number(current.expiresAt||0)>now)return;return{lessonId:"midnight-museum-pilot",status:"open",createdAt:now,expiresAt:now+ROOM_LIFETIME_MS,updatedAt:now}},{applyLocally:false});if(!result.committed)throw new Error("room-exists");return{ok:true,room,expiresAt:now+ROOM_LIFETIME_MS}}
export async function roomExists(value){const room=validRoom(value);if(!room)return{ok:false};const snapshot=await get(metaRef(room)),meta=snapshot.val();return{ok:Boolean(meta&&meta.status==="open"&&Number(meta.expiresAt||0)>Date.now()),room,expiresAt:Number(meta?.expiresAt||0)}}
export async function connectBridge(value){const room=validRoom(value);const status=await roomExists(room);if(!status.ok)throw new Error("room-not-found");const base=`${ROOT}/${room}`;window.pth=path=>ref(db,`${base}/${String(path||"").replace(/^\/+|\/+$/g,"")}`);window._set=(target,data)=>set(target,data);window._remove=target=>remove(target);window._onDisconnect=target=>onDisconnect(target);window._onValue=(target,callback)=>onValue(target,callback);window._firebaseReady=true;window.dispatchEvent(new CustomEvent("oncuvate:pilot-realtime-ready"));return status}
