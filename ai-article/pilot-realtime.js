import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getDatabase, get, onDisconnect, onValue, ref, remove, runTransaction, set } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHib_-XPXfuvhsZcPlMSnqi4O46kAR0mM",
  authDomain: "non-1-4a6f5.firebaseapp.com",
  databaseURL: "https://non-1-4a6f5-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "non-1-4a6f5",
  storageBucket: "non-1-4a6f5.firebasestorage.app",
  messagingSenderId: "871721592960",
  appId: "1:871721592960:web:b342eab286024473845e65"
};

const ROOT = "animal-persuasion-pilot/rooms";
const ROOM_LIFETIME_MS = 3 * 60 * 60 * 1000;
const app = getApps().find(item => item.name === "ai-article-structure-pilot") || initializeApp(firebaseConfig,"ai-article-structure-pilot");
const db = getDatabase(app);
let roomCode = "";
const query = new URLSearchParams(location.search);
const liveRole = query.get("pilotRole");
const liveChild = liveRole === "child" ? String(query.get("child") || "").replace(/[^a-zA-Z0-9가-힣_-]/g,"").slice(0,12) : "";
const logicalStudentState = {ready:{},reports:{vocab:{},relay:{}}};

const normalizeRoom = value => String(value || "").replace(/\D/g,"").slice(0,5);
const randomRoom = () => String(Math.floor(10000 + Math.random() * 90000));
const roomPath = suffix => `${ROOT}/${roomCode}${suffix ? `/${String(suffix).replace(/^\/+/,"")}` : ""}`;

function setNested(root,path,value) {
  const keys = String(path || "").split("/").filter(Boolean);
  let target = root;
  keys.forEach((key,index) => {
    if (index === keys.length - 1) target[key] = value;
    else { if (!target[key] || typeof target[key] !== "object") target[key] = {}; target = target[key]; }
  });
}

function studentSnapshot() {
  return {
    child:liveChild,nickname:liveChild,page:0,issue:"AI 기사 구조",stance:"",
    updatedAt:Date.now(),fields:{pilot:"ai-article"},reasons:["",""],details:["",""],
    locks:{pageLocked:false,activityLocked:false},activityState:{aiArticle:logicalStudentState}
  };
}

function reshapeProgress(records,logicalPath) {
  const result = {};
  Object.entries(records || {}).forEach(([child,item]) => {
    const data = item?.activityState?.aiArticle || {};
    if (logicalPath === "prog/vocabReady" && data.ready?.vocab) result[child] = data.ready.vocab;
    if (logicalPath === "prog/readingReady" && data.ready?.reading) result[child] = data.ready.reading;
    if (logicalPath === "prog/relayReady" && data.ready?.relay) result[child] = data.ready.relay;
    if (logicalPath === "report/order" && data.reports?.order) result[child] = data.reports.order;
    if (logicalPath === "report/vocab") Object.entries(data.reports?.vocab || {}).forEach(([round,value]) => { (result[round] ||= {})[child] = value; });
    if (logicalPath === "report/relay") Object.entries(data.reports?.relay || {}).forEach(([game,turns]) => Object.entries(turns || {}).forEach(([turn,value]) => { (((result[game] ||= {})[turn] ||= {}))[child] = value; }));
  });
  return result;
}

function exposeBridge() {
  window.pth = suffix => String(suffix || "").replace(/^\/+|\/+$/g,"");
  window._set = (logicalPath,value) => {
    const path = String(logicalPath || "");
    if (liveRole === "child" && liveChild) {
      if (path === `prog/vocabReady/${liveChild}`) setNested(logicalStudentState,"ready/vocab",value);
      else if (path === `prog/readingReady/${liveChild}`) setNested(logicalStudentState,"ready/reading",value);
      else if (path === `prog/relayReady/${liveChild}`) setNested(logicalStudentState,"ready/relay",value);
      else if (path.startsWith("report/vocab/") && path.endsWith(`/${liveChild}`)) setNested(logicalStudentState,`reports/vocab/${path.split("/")[2]}`,value);
      else if (path === `report/order/${liveChild}`) setNested(logicalStudentState,"reports/order",value);
      else if (path.startsWith("report/relay/") && path.endsWith(`/${liveChild}`)) {
        const parts = path.split("/"); setNested(logicalStudentState,`reports/relay/${parts[2]}/${parts[3]}`,value);
      } else return set(ref(db,roomPath(path)),value);
      return set(ref(db,roomPath(`prog/${liveChild}`)),studentSnapshot());
    }
    return set(ref(db,roomPath(path)),value);
  };
  window._onValue = (logicalPath,callback) => {
    const path = String(logicalPath || "");
    if (["prog/vocabReady","prog/readingReady","prog/relayReady","report/vocab","report/order","report/relay"].includes(path)) {
      return onValue(ref(db,roomPath("prog")),snapshot => callback({val:() => reshapeProgress(snapshot.val() || {},path)}));
    }
    return onValue(ref(db,roomPath(path)),callback);
  };
  window._remove = logicalPath => remove(ref(db,roomPath(logicalPath)));
  window._onDisconnect = logicalPath => onDisconnect(ref(db,roomPath(logicalPath)));
  window._firebaseReady = true;
  window.dispatchEvent(new CustomEvent("oncuvate:pilot-realtime-ready"));
}

export async function createRoom(preferredRoom = "") {
  const preferred = normalizeRoom(preferredRoom);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = attempt === 0 && /^\d{5}$/.test(preferred) ? preferred : randomRoom();
    const now = Date.now();
    const result = await runTransaction(ref(db,`${ROOT}/${candidate}/meta`),current => {
      if (current && Number(current.expiresAt || 0) > now) return;
      return {lessonId:"animal-persuasion-01",status:"open",createdAt:now,expiresAt:now + ROOM_LIFETIME_MS,updatedAt:now};
    },{applyLocally:false});
    if (result.committed) { roomCode = candidate; exposeBridge(); return candidate; }
  }
  throw new Error("room-create-failed");
}

export async function roomExists(value) {
  const candidate = normalizeRoom(value);
  if (!/^\d{5}$/.test(candidate)) return false;
  const snapshot = await get(ref(db,`${ROOT}/${candidate}/meta`));
  const meta = snapshot.val();
  return Boolean(meta && meta.status === "open" && Number(meta.expiresAt || 0) > Date.now());
}

export async function connectRoom(value) {
  const candidate = normalizeRoom(value);
  if (!await roomExists(candidate)) throw new Error("room-not-found");
  roomCode = candidate;
  exposeBridge();
  return candidate;
}

export async function getTakenNicknames(value) {
  const candidate = normalizeRoom(value);
  if (!await roomExists(candidate)) return [];
  const snapshot = await get(ref(db,`${ROOT}/${candidate}/presence`));
  return Object.entries(snapshot.val() || {}).filter(([,item]) => item?.connected === true).map(([nickname]) => nickname);
}

export async function joinRoom(value,nickname,sessionId = "") {
  const candidate = await connectRoom(value);
  const cleanName = String(nickname || "").replace(/[^a-zA-Z0-9가-힣_-]/g,"").slice(0,12);
  if (!cleanName) throw new Error("invalid-nickname");
  const token = String(sessionId || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
  const target = ref(db,`${ROOT}/${candidate}/presence/${cleanName}`);
  const result = await runTransaction(target,current => {
    if (current?.connected === true && current?.sessionId !== token) return;
    return {connected:true,sessionId:token,joinedAt:Number(current?.joinedAt || Date.now()),updatedAt:Date.now()};
  },{applyLocally:false});
  if (!result.committed) throw new Error("nickname-taken");
  onDisconnect(ref(db,`${ROOT}/${candidate}/presence/${cleanName}/connected`)).set(false);
  return {room:candidate,nickname:cleanName,session:token};
}

window.OncuvateAiArticlePilot = Object.freeze({createRoom,roomExists,connectRoom,getTakenNicknames,joinRoom});

const params = new URLSearchParams(location.search);
const role = params.get("pilotRole");
const room = normalizeRoom(params.get("room"));
if ((role === "coach" || role === "child") && /^\d{5}$/.test(room)) {
  const ready = role === "coach"
    ? connectRoom(room)
    : joinRoom(room,params.get("child"),params.get("session"));
  ready.catch(() => { document.documentElement.dataset.pilotRelay = "offline"; });
}
