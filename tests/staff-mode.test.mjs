// Unit tests for src/lib/staff-mode.ts — run with `npm test` (node --test, no dependencies).
// A sales rep's page sends nothing to any tracker; a customer's page is untouched.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {
  ADMIN_SESSION_MS,
  ADMIN_STORE_KEY,
  STAFF_DEVICE_KEY,
  STAFF_DEVICE_MS,
  STAFF_PAGE_JS,
  dropStaffEvents,
  enterStaffMode,
  isStaffDevice,
  isStaffPage,
  isStaffSession,
  silenceTrackers,
  staffModeScript,
  watchStaffMode,
} from '../src/lib/staff-mode.ts';

const NOW = Date.parse('2026-10-21T09:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const persisted = (state) => JSON.stringify({ state, version: 0 });
const GA4 = ['G-1', 'G-2'];
const GTAG = 'https://www.googletagmanager.com/gtag/js?id=AW-1';

const SESSIONS = [
  ['nothing stored', null],
  ['empty string', ''],
  ['not JSON', '{oops'],
  ['JSON null', 'null'],
  ['no state', JSON.stringify({ version: 0 })],
  ['signed out', persisted({ isAdmin: false, adminName: '', adminToken: null, loginTimestamp: null })],
  ['signed in an hour ago', persisted({ isAdmin: true, adminName: 'רוני', adminToken: 't', loginTimestamp: NOW - HOUR })],
  ['signed in with no timestamp', persisted({ isAdmin: true, adminName: 'רוני', adminToken: 't', loginTimestamp: null })],
  ['signed in long ago', persisted({ isAdmin: true, adminToken: 't', loginTimestamp: NOW - 30 * DAY })],
  ['isAdmin as a string', persisted({ isAdmin: 'true', loginTimestamp: NOW })],
];

const DEVICES = [
  ['no mark', null],
  ['empty mark', ''],
  ['garbage mark', 'yesterday'],
  ['marked an hour ago', String(NOW - HOUR)],
  ['marked just inside the window', String(NOW - STAFF_DEVICE_MS + 1000)],
  ['marked just outside the window', String(NOW - STAFF_DEVICE_MS - 1000)],
];

/** Run the <head> script the way a browser would, against stored values (or a throwing storage). */
function runHeadScript(stored = {}, { throwing = false } = {}) {
  const head = [];
  const storage = { ...stored };
  const context = {
    Date: class extends Date { static now() { return NOW; } },
    JSON,
    localStorage: {
      getItem(key) {
        if (throwing) throw new Error('SecurityError');
        return key in storage ? storage[key] : null;
      },
      setItem(key, value) {
        if (throwing) throw new Error('SecurityError');
        storage[key] = String(value);
      },
    },
    document: {
      createElement: (tag) => ({ tag }),
      head: { appendChild: (el) => head.push(el) },
    },
  };
  context.window = context;
  vm.runInNewContext(staffModeScript({ analyticsIds: [...GA4, ''], preloadScripts: [GTAG, ''] }), context);
  return { state: context.__staffMode, head, storage, isStaffPage: vm.runInNewContext(STAFF_PAGE_JS, context) };
}

const stores = (session, device) => ({
  ...(session === null ? {} : { [ADMIN_STORE_KEY]: session }),
  ...(device === null ? {} : { [STAFF_DEVICE_KEY]: device }),
});

test('the admin store and the gate agree on where the sign-in is kept and how long it lasts', () => {
  assert.equal(typeof ADMIN_STORE_KEY, 'string');
  assert.ok(ADMIN_STORE_KEY.length > 0);
  assert.ok(ADMIN_SESSION_MS === null || ADMIN_SESSION_MS > 0);
  assert.notEqual(STAFF_DEVICE_KEY, ADMIN_STORE_KEY);
  assert.ok(STAFF_DEVICE_MS > 0);
});

test('isStaffSession: only a signed-in rep whose session the store would keep', () => {
  const expected = {
    'signed in an hour ago': true,
    'signed in with no timestamp': true,
    // An expired sign-in is signed out by the store as it loads; where sessions never expire it is still a rep.
    'signed in long ago': ADMIN_SESSION_MS === null,
  };
  for (const [name, stored] of SESSIONS) {
    assert.equal(isStaffSession(stored, NOW), expected[name] ?? false, name);
  }
});

test('isStaffDevice: a rep was signed in on this browser within STAFF_DEVICE_MS', () => {
  const expected = { 'marked an hour ago': true, 'marked just inside the window': true };
  for (const [name, mark] of DEVICES) {
    assert.equal(isStaffDevice(mark, NOW), expected[name] ?? false, name);
  }
});

test('the <head> script gives the same answer as isStaffSession || isStaffDevice, for every combination', () => {
  for (const [sessionName, session] of SESSIONS) {
    for (const [deviceName, device] of DEVICES) {
      const name = `${sessionName} / ${deviceName}`;
      const { state, isStaffPage: flag } = runHeadScript(stores(session, device));
      assert.equal(state.staff, isStaffSession(session, NOW) || isStaffDevice(device, NOW), name);
      assert.equal(flag, state.staff, `${name}: STAFF_PAGE_JS`);
    }
  }
});

test('a signed-in page marks the device; a page that is not signed in leaves the mark alone', () => {
  const signedIn = runHeadScript(stores(persisted({ isAdmin: true, loginTimestamp: NOW - HOUR }), null));
  assert.equal(signedIn.storage[STAFF_DEVICE_KEY], String(NOW));

  const lapsed = runHeadScript(stores(persisted({ isAdmin: false }), String(NOW - DAY)));
  assert.equal(lapsed.state.staff, true, 'signed out a day ago: still a rep\'s browser');
  assert.equal(lapsed.storage[STAFF_DEVICE_KEY], String(NOW - DAY), 'not renewed without a sign-in');

  const customer = runHeadScript({});
  assert.equal(customer.storage[STAFF_DEVICE_KEY], undefined, 'a customer\'s browser is never marked');
});

test('a customer\'s page gets the preload the server used to print; a rep\'s page gets nothing', () => {
  const customer = runHeadScript({});
  assert.equal(customer.state.staff, false);
  assert.deepEqual(customer.head, [{ tag: 'link', rel: 'preload', as: 'script', href: GTAG }]);
  assert.deepEqual([...customer.state.analyticsIds], GA4, 'empty ids are dropped');

  const rep = runHeadScript(stores(persisted({ isAdmin: true, loginTimestamp: NOW - HOUR }), null));
  assert.equal(rep.state.staff, true);
  assert.deepEqual(rep.head, [], 'no request to the vendor at all, not even a preload');
});

test('storage that throws reads as a customer, and the script itself never throws', () => {
  const { state, head } = runHeadScript({}, { throwing: true });
  assert.equal(state.staff, false);
  assert.equal(head.length, 1);
});

test('the gate is plain ES5 a browser parses before any bundle', () => {
  const script = staffModeScript({ analyticsIds: GA4, preloadScripts: [GTAG] });
  assert.doesNotThrow(() => new vm.Script(script));
  assert.ok(!/=>|\blet\b|\bconst\b|`/.test(script), 'no arrow functions, let/const or template literals');
});

// --- the runtime half, against a stand-in window --------------------------------------------

let fakeWindow;
let stored;
let reloads;
let fbqCalls;

beforeEach(() => {
  reloads = 0;
  fbqCalls = [];
  stored = {};
  const listeners = {};
  fakeWindow = {
    __staffMode: { staff: false, analyticsIds: [...GA4] },
    fbq: (...args) => fbqCalls.push(args),
    location: { reload: () => { reloads += 1; } },
    addEventListener: (type, fn) => { (listeners[type] ||= new Set()).add(fn); },
    removeEventListener: (type, fn) => listeners[type]?.delete(fn),
    dispatch: (type, event) => listeners[type]?.forEach((fn) => fn(event)),
  };
  globalThis.window = fakeWindow;
  globalThis.localStorage = {
    getItem: (key) => (key in stored ? stored[key] : null),
    setItem: (key, value) => { stored[key] = String(value); },
  };
});

test('a customer\'s page passes every event through unchanged', () => {
  const event = { type: 'pageview', url: 'https://shop/x' };
  assert.equal(isStaffPage(), false);
  assert.equal(dropStaffEvents(event), event);
});

test('silenceTrackers: GA4 disabled by id, Meta consent revoked, Vercel events dropped', () => {
  silenceTrackers();
  assert.equal(isStaffPage(), true);
  assert.equal(fakeWindow['ga-disable-G-1'], true);
  assert.equal(fakeWindow['ga-disable-G-2'], true);
  assert.deepEqual(fbqCalls, [['consent', 'revoke']]);
  assert.equal(dropStaffEvents({ type: 'event', name: 'purchase' }), null);
});

test('silenceTrackers survives a page where nothing loaded (no Pixel, no head script)', () => {
  delete fakeWindow.fbq;
  delete fakeWindow.__staffMode;
  assert.doesNotThrow(() => silenceTrackers());
  assert.equal(isStaffPage(), true);
});

test('enterStaffMode: a customer\'s page that just signed in is marked, silenced and reloaded once', () => {
  stored[ADMIN_STORE_KEY] = persisted({ isAdmin: true, loginTimestamp: Date.now() });
  enterStaffMode();
  assert.equal(isStaffPage(), true);
  assert.equal(reloads, 1);
  assert.ok(isStaffDevice(stored[STAFF_DEVICE_KEY]), 'the device is marked');
  enterStaffMode();
  assert.equal(reloads, 1, 'an already silenced page is not reloaded again');
});

test('enterStaffMode: a rep\'s page signing in again (an expired token) is not reloaded', () => {
  fakeWindow.__staffMode.staff = true;
  stored[ADMIN_STORE_KEY] = persisted({ isAdmin: true, loginTimestamp: Date.now() });
  enterStaffMode();
  assert.equal(reloads, 0);
  assert.ok(isStaffDevice(stored[STAFF_DEVICE_KEY]), 'the mark is renewed');
});

test('enterStaffMode: where the sign-in could not be stored, no reload (it would sign the rep out)', () => {
  enterStaffMode();
  assert.equal(isStaffPage(), true, 'still silenced');
  assert.equal(reloads, 0);
});

test('watchStaffMode: a sign-in in another tab silences this one, without reloading it', () => {
  const stop = watchStaffMode();
  fakeWindow.dispatch('storage', { key: 'cart-storage', newValue: persisted({ isAdmin: true }) });
  assert.equal(isStaffPage(), false, 'another key is ignored');
  fakeWindow.dispatch('storage', { key: ADMIN_STORE_KEY, newValue: persisted({ isAdmin: false }) });
  assert.equal(isStaffPage(), false, 'a sign-out is ignored');
  fakeWindow.dispatch('storage', { key: ADMIN_STORE_KEY, newValue: persisted({ isAdmin: true, loginTimestamp: Date.now() }) });
  assert.equal(isStaffPage(), true);
  assert.equal(reloads, 0);
  stop();
});

test('watchStaffMode: a rep\'s page opening in another tab (the device mark) silences this one too', () => {
  const stop = watchStaffMode();
  fakeWindow.dispatch('storage', { key: STAFF_DEVICE_KEY, newValue: String(Date.now()) });
  assert.equal(isStaffPage(), true);
  stop();
});
