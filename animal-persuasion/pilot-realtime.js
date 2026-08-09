import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getDatabase,
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  set,
  update
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

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
const app = getApps().find(item => item.name === "animal-persuasion-pilot") || initializeApp(firebaseConfig, "animal-persuasion-pilot");
const db = getDatabase(app);
let roomCode = "";

function normalizeRoom(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 5);
}

function randomRoom() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

function roomPath(suffix = "") {
  const base = `${ROOT}/${roomCode}`;
  return suffix ? `${base}/${String(suffix).replace(/^\/+/, "")}` : base;
}

function exposeBridge() {
  window.pth = suffix => ref(db, roomPath(suffix));
  window._set = (target, value) => set(target, value);
  window._onValue = (target, callback) => onValue(target, callback);
  window._remove = target => remove(target);
  window._onDisconnect = target => onDisconnect(target);
  window._firebaseReady = true;
}

async function createRoom() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = randomRoom();
    const meta = ref(db, `${ROOT}/${candidate}/meta`);
    const result = await runTransaction(meta, current => {
      if (current) return;
      return {
        lessonId: "animal-persuasion-01",
        status: "open",
        createdAt: Date.now(),
        expiresAt: Date.now() + ROOM_LIFETIME_MS,
        updatedAt: Date.now()
      };
    }, { applyLocally: false });
    if (result.committed) {
      roomCode = candidate;
      exposeBridge();
      return candidate;
    }
  }
  throw new Error("room-create-failed");
}

async function joinRoom(value, nickname) {
  const candidate = normalizeRoom(value);
  if (!/^\d{5}$/.test(candidate)) throw new Error("invalid-room");
  const meta = await get(ref(db, `${ROOT}/${candidate}/meta`));
  if (!meta.exists() || meta.val()?.status !== "open" || Number(meta.val()?.expiresAt || 0) <= Date.now()) throw new Error("room-not-found");
  roomCode = candidate;
  exposeBridge();
  await update(ref(db, `${ROOT}/${candidate}/presence/${nickname}`), {
    connected: true,
    joinedAt: Date.now(),
    updatedAt: Date.now()
  });
  onDisconnect(ref(db, `${ROOT}/${candidate}/presence/${nickname}/connected`)).set(false);
  return candidate;
}

window.OncuvatePilotRealtime = Object.freeze({ createRoom, joinRoom });
window.dispatchEvent(new CustomEvent("oncuvate:pilot-realtime-ready"));
