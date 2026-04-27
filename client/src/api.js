const API_BASE = '/api';
let cachedState = null;
let listeners = [];
let _token = localStorage.getItem('ic_token');
let _onUnauthorized = null;

export function onUnauthorized(fn) {
  _onUnauthorized = fn;
}

export function setToken(token) {
  _token = token;
  if (token) {
    localStorage.setItem('ic_token', token);
  } else {
    localStorage.removeItem('ic_token');
  }
}

export function getToken() {
  return _token;
}

export function subscribe(listener) {
  listeners.push(listener);
  return () => { listeners = listeners.filter(l => l !== listener); };
}

function notify() {
  listeners.forEach(l => l(cachedState));
}

function getHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (_token) h['Authorization'] = `Bearer ${_token}`;
  return h;
}

async function api(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: options.method || 'GET',
      headers: { ...getHeaders(), ...(options.headers || {}) },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    if (res.status === 401) {
      // Token expired or invalid — redirect to login
      setToken(null);
      _onUnauthorized?.();
      return null;
    }
    const data = await res.json();
    cachedState = data;
    notify();
    return data;
  } catch (err) {
    console.error('API error:', err);
    return null;
  }
}

// Initialize state
export async function fetchState() {
  return api('/state');
}

// ---- Auth ----
export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return { ok: res.ok, data: await res.json() };
}

export async function register(username, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return { ok: res.ok, data: await res.json() };
}

// ---- Game actions ----
export async function toggle() { return api('/toggle', { method: 'POST' }); }
export async function equipItem(id) { return api(`/action/equip/${id}`, { method: 'POST' }); }
export async function sellItem(id) { return api(`/action/sell/${id}`, { method: 'POST' }); }
export async function sellAll() { return api('/action/sell-all', { method: 'POST' }); }
export async function sellRarity(v) { return api(`/action/sell-rarity/${v}`, { method: 'POST' }); }
export async function sortInventory() { return api('/action/inventory-sort', { method: 'POST' }); }
export async function enhance(type) { return api(`/action/enhance/${type}`, { method: 'POST' }); }
export async function reforge(type) { return api(`/action/reforge/${type}`, { method: 'POST' }); }
export async function toggleLock(type, idx) { return api(`/action/toggle-lock/${type}/${idx}`, { method: 'POST' }); }
export async function buyStone(n) { return api(`/action/buy-stone/${n}`, { method: 'POST' }); }
export async function buyReforge(n) { return api(`/action/buy-reforge/${n}`, { method: 'POST' }); }
export async function buyEquip(type) { return api(`/action/buy-equip/${type}`, { method: 'POST' }); }
export async function upgrade(stat) { return api(`/action/upgrade/${stat}`, { method: 'POST' }); }
export async function upgradeBulk(stat, n) { return api(`/action/upgrade-bulk/${stat}/${n}`, { method: 'POST' }); }
export async function upgradeMax(stat) { return api(`/action/upgrade-max/${stat}`, { method: 'POST' }); }
export async function toggleSkill(id) { return api(`/action/toggle-skill/${id}`, { method: 'POST' }); }
export async function castSkill(id) { return api(`/action/cast-skill/${id}`, { method: 'POST' }); }
export async function setRune(skillId, runeId) { return api(`/action/set-rune/${skillId}/${runeId}`, { method: 'POST' }); }
export async function rebirth() { return api('/action/rebirth', { method: 'POST' }); }
export async function changeMap(tier) { return api(`/action/change-map/${tier}`, { method: 'POST' }); }
export async function updateSettings(s) { return api('/settings', { method: 'POST', body: s }); }
export async function enterTower(floor) { return api(`/action/tower/${floor}`, { method: 'POST' }); }
export async function leaveTower() { return api('/action/tower-leave', { method: 'POST' }); }
export async function startExplore(tierId) { return api(`/action/explore/${tierId}`, { method: 'POST' }); }
export async function claimDaily() { return api('/action/claim-daily', { method: 'POST' }); }
export async function expandBag() { return api('/action/expand-bag', { method: 'POST' }); }
export async function clearLogs() { return api('/clear-logs', { method: 'POST' }); }
export async function selectClass(classId) { return api(`/action/select-class/${classId}`, { method: 'POST' }); }
export async function upgradePassive(skillId) { return api(`/action/upgrade-passive/${skillId}`, { method: 'POST' }); }
export async function equipPassive(slot, skillId) { return api(`/action/equip-passive/${slot}/${skillId || 'null'}`, { method: 'POST' }); }
export async function claimFreeDraw() { return api('/action/free-draw', { method: 'POST' }); }
