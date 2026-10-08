/* =========================================================
   shared.js — الدوال المشتركة بين جميع صفحات التطبيق
   ========================================================= */

/* ============ الثوابت العامة ============ */
const APP_SALT = "CollectAppSalt2026Secured_v1";
const ADMIN_DEFAULT_PASSWORD = "1711@Myapp";
const ADMIN_RESET_PASSWORD = "1711";

const DEFAULT_USERS = [
  { name:"مايكل",       password:"michael@2026", role:"member" },
  { name:"هيثم",        password:"haitham@2026", role:"member" },
  { name:"موسى",        password:"mousa@2026",   role:"member" },
  { name:"أيمن",        password:"ayman@2026",   role:"member" },
  { name:"عبد الحفيظ",  password:"hafiz@2026",   role:"member" },
  { name:"محمد",        password:"mohamed@2026", role:"member" }
];

/* ============ الاختصارات ============ */
const $  = id => document.getElementById(id);
const $$ = sel => document.querySelector(sel);
const $$$ = sel => document.querySelectorAll(sel);

/* ============ دوال التنسيق ============ */
const f = n => Number(n).toLocaleString('en-US');
const p2 = n => String(n).padStart(2,'0');
const esc = s => String(s).replace(/[&<>"]/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
}[c]));

/* ============ مصفوفات ============ */
const uniq = a => [...new Set(a)].sort((x,y)=>x-y);
const sum  = (a,i) => a.reduce((x,d)=>x+d[i],0);
const sumP = a => a.reduce((x,p)=>x+p.v,0);

/* ============ المفتاح الموحد ============ */
const key = (s,b,m,a) => [s,b,m,a].join('-');

/* ============ التواريخ ============ */
const monthKey = (d=new Date()) => d.getFullYear()+'-'+p2(d.getMonth()+1);

const monthLabel = k => {
  const [y,m] = k.split('-');
  try{
    return new Date(+y,+m-1,1).toLocaleDateString('ar-EG-u-nu-latn',
      {month:'long',year:'numeric'});
  }catch(e){return k;}
};

const dayKey = t => {
  const d = new Date(t);
  return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
};

const dayLabel = t => {
  const d = new Date(t);
  let w = '';
  try{ w = d.toLocaleDateString('ar-EG',{weekday:'long'}); }catch(e){}
  return w + ' ' + d.toLocaleDateString('en-GB');
};

/* ============ localStorage ============ */
const ls = (k,d) => {
  try{
    const v = JSON.parse(localStorage.getItem(k));
    return v == null ? d : v;
  }catch(e){ return d; }
};
const lsSet = (k,v) => {
  try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){}
};
const lsRemove = k => {
  try{ localStorage.removeItem(k); }catch(e){}
};

/* ============ IndexedDB ============ */
let _db = null;

const openDb = () => new Promise((res,rej)=>{
  const r = indexedDB.open('collect_db', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('kv');
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});

const kvGet = async k => {
  _db = _db || await openDb();
  return new Promise((res,rej)=>{
    const q = _db.transaction('kv').objectStore('kv').get(k);
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
};

const kvSet = async (k,v) => {
  _db = _db || await openDb();
  return new Promise((res,rej)=>{
    const t = _db.transaction('kv','readwrite');
    t.objectStore('kv').put(v,k);
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
};

const kvDel = async k => {
  _db = _db || await openDb();
  return new Promise((res,rej)=>{
    const t = _db.transaction('kv','readwrite');
    t.objectStore('kv').delete(k);
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
};

/* ============ التشفير (AES-256 عبر PBKDF2) ============ */
function deriveKey(password, salt){
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 10000
  }).toString();
}

function encryptData(obj, password){
  const key = deriveKey(password, APP_SALT);
  const json = JSON.stringify(obj);
  const enc = CryptoJS.AES.encrypt(json, key).toString();
  return {
    v: 1,
    salt: APP_SALT,
    data: enc,
    meta: {
      count: obj.data ? obj.data.length : 0,
      owner: obj.owner || "",
      type: obj.type || "data",
      ts: Date.now()
    }
  };
}

function decryptData(encObj, password){
  try{
    const key = deriveKey(password, encObj.salt || APP_SALT);
    const dec = CryptoJS.AES.decrypt(encObj.data, key)
                 .toString(CryptoJS.enc.Utf8);
    if(!dec) return null;
    return JSON.parse(dec);
  }catch(e){ return null; }
}

/* ============ إدارة المستخدمين ============ */
let USERS = ls('collect_users', null);
if(!USERS || !Array.isArray(USERS) || !USERS.length){
  USERS = DEFAULT_USERS.slice();
  lsSet('collect_users', USERS);
}

let ADMIN_PW = ls('collect_admin_pw', ADMIN_DEFAULT_PASSWORD);
if(!ADMIN_PW) ADMIN_PW = ADMIN_DEFAULT_PASSWORD;

const saveUsers = () => lsSet('collect_users', USERS);
const saveAdminPw = () => lsSet('collect_admin_pw', ADMIN_PW);

const sortUsers = () => {
  USERS.sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  saveUsers();
};

/* ============ الجلسة ============ */
let currentUser = null;

function setSession(user){
  currentUser = user;
  sessionStorage.setItem('collect_session', JSON.stringify(user));
}

function getSession(){
  try{
    const s = sessionStorage.getItem('collect_session');
    return s ? JSON.parse(s) : null;
  }catch(e){ return null; }
}

function clearSession(){
  currentUser = null;
  sessionStorage.removeItem('collect_session');
  sessionStorage.removeItem('collect_member_pw');
}

/* ============ إدارة الأرشفة ============ */
async function rollover(){
  const now = monthKey();
  const cm = localStorage.getItem('collect_month');
  if(!cm){
    localStorage.setItem('collect_month', now);
    return;
  }
  if(cm === now) return;

  // إنشاء أرشفة للشهر الماضي
  const entry = {
    m: cm,
    ts: Date.now(),
    raw: typeof DATA !== 'undefined' ? DATA : [],
    paid: typeof paid !== 'undefined' ? paid.slice() : []
  };

  let k = 'arc:' + (currentUser ? currentUser.name : 'admin') + ':' + cm;
  try{
    if(await kvGet(k)) k += '-' + Date.now();
    await kvSet(k, entry);
  }catch(e){ return; }

  // تحديث الفهرس
  const idx = ls('collect_arcidx', []);
  idx.unshift({
    k,
    m: cm,
    total: entry.paid.reduce((a,p)=>a+p.v,0),
    n: entry.paid.length,
    rows: entry.raw.length
  });
  lsSet('collect_arcidx', idx);

  // إزالة العملاء المسددين
  if(typeof DATA !== 'undefined' && typeof paid !== 'undefined'){
    const ps = new Set(paid.map(p=>key(p.s,p.b,p.m,p.a)));
    DATA = DATA.filter(d => !ps.has(key(d[0],d[1],d[2],d[3])));
    paid = [];
    lsSet('collect_v1', paid);
    if(typeof saveData === 'function') await saveData();
  }

  localStorage.setItem('collect_month', now);
  lsSet('collect_note',
    `تمت أرشفة شهر ${monthLabel(cm)} تلقائيًا.`);
}

/* ============ الإشعارات ============ */
function showNote(msg){
  const note = $('note');
  const noteT = $('noteT');
  if(!note || !noteT) return;
  noteT.textContent = msg;
  note.classList.remove('hidden');
}

/* ============ تحميل مكتبات PDF و XLSX عند الحاجة ============ */
function loadPdfJs(){
  if(window.pdfjsLib) return Promise.resolve();
  return new Promise((res,rej)=>{
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      try{
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }catch(e){}
      res();
    };
    s.onerror = () => rej(new Error('تعذر تحميل مكتبة PDF'));
    document.head.appendChild(s);
  });
}

function loadXlsx(){
  if(window.XLSX) return Promise.resolve();
  return new Promise((res,rej)=>{
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => res();
    s.onerror = () => rej(new Error('تعذر تحميل مكتبة Excel'));
    document.head.appendChild(s);
  });
}

/* ============ تحويل الأرقام العربية ============ */
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toEnDigits = s => String(s).replace(/[٠-٩]/g, d => AR_DIGITS.indexOf(d));
const toNum = v => {
  if(v == null || v === '') return 0;
  const str = toEnDigits(v).replace(/[^\d.-]/g,'');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
};

/* ============ تحليل شهر الإصدار ============ */
const parseIssueMonth = raw => {
  if(raw == null) return '';
  let s = toEnDigits(String(raw)).trim();
  if(!s) return '';

  // حالة 6 أرقام: 202610
  const digitsOnly = s.replace(/\D/g,'');
  if(digitsOnly.length === 6){
    const y = digitsOnly.slice(0,4);
    const m = digitsOnly.slice(4,6);
    const mi = parseInt(m,10);
    if(mi >= 1 && mi <= 12) return `${y}-${p2(mi)}`;
  }

  // حالة 2026-10 أو 2026/10
  let m1 = s.match(/^(\d{4})[-\/.](\d{1,2})/);
  if(m1){
    const mi = parseInt(m1[2],10);
    if(mi >= 1 && mi <= 12) return `${m1[1]}-${p2(mi)}`;
  }

  return '';
};

/* ============ كشف الأعمدة في Excel ============ */
function detectColumns(headerRow){
  if(!headerRow || !headerRow.length) return null;
  const norm = s => String(s || '')
    .replace(/[\u200c-\u200f\u202a-\u202e\u2066-\u2069]/g,'')
    .trim();
  const H = headerRow.map(norm);

  const find = (...patterns) => {
    for(let i=0;i<H.length;i++){
      if(!H[i]) continue;
      for(const p of patterns){
        if(H[i].includes(p)) return i;
      }
    }
    return -1;
  };

  const cols = {
    sec:   find('قطاع'),
    issue: find('شهر الاصدار','شهر الإصدار','تاريخ الاصدار','تاريخ الإصدار','اصدار','إصدار'),
    val:   find('القيمة','قيمة','المبلغ','مبلغ'),
    cnt:   find('العدد','عدد','الفواتير','فواتير'),
    name:  find('اسم العميل','الاسم','اسم'),
    blk:   find('بلوك'),
    bld:   find('عمارة','عقار','مبنى','بناء'),
    apt:   find('شقة','وحدة')
  };

  const known = Object.values(cols).filter(v=>v>=0).length;
  if(known < 4) return null;
  return cols;
}

/* ============ قراءة Excel ============ */
async function readExcel(file){
  await loadXlsx();
  const data = new Uint8Array(await file.arrayBuffer());
  const wb = XLSX.read(data, {type:'array'});
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});

  let cols = null, startIdx = 0;
  if(rows[0]){
    cols = detectColumns(rows[0]);
    if(cols) startIdx = 1;
  }
  if(!cols){
    cols = {sec:0, issue:1, val:2, cnt:3, name:4, blk:5, bld:6, apt:7};
  }

  const out = [];
  let issueMonth = '';
  const getCell = (r,i) => i>=0 && i<r.length ? r[i] : '';

  for(let i=startIdx;i<rows.length;i++){
    const r = rows[i];
    if(!r || !r.length) continue;
    if(r.every(c=>c==null||c==='')) continue;

    const sec     = toNum(getCell(r, cols.sec));
    const issueRaw= getCell(r, cols.issue);
    const val     = toNum(getCell(r, cols.val));
    const cnt     = toNum(getCell(r, cols.cnt));
    const nm      = String(getCell(r, cols.name) ?? '').trim();
    const blk     = toNum(getCell(r, cols.blk));
    const bld     = toNum(getCell(r, cols.bld));
    const apt     = toNum(getCell(r, cols.apt));

    if(!issueMonth && issueRaw !== '' && issueRaw != null){
      issueMonth = parseIssueMonth(issueRaw);
    }

    if(!sec || !blk || !bld || !apt || !nm || !val) continue;
    out.push([sec, blk, bld, apt, nm, cnt, val]);
  }

  return { rows: out, issueMonth };
}

/* ============ قراءة PDF ============ */
const isN = s => /^[٠-٩0-9]+$/.test(s);
const PF  = /[\uFB50-\uFDFF\uFE70-\uFEFF]/;

const fixArabic = s => {
  if(!PF.test(s)) return s;
  const normalized = s.normalize('NFKC');
  return normalized.split(/\s+/).filter(Boolean).reverse().join(' ');
};

const LAYOUTS = {
  A: {
    val:[100,170], cnt:[170,200],
    sec:[350,370], blk:[370,392], bld:[393,415], apt:[415,435],
    nm:[455,590]
  },
  B: {
    val:[40,90], cnt:[90,108],
    sec:[380,398], blk:[398,416], bld:[417,435], apt:[435,453],
    nm:[468,590]
  }
};

async function readPdf(file){
  await loadPdfJs();
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(await file.arrayBuffer())
  }).promise;

  const out = [];
  for(let n=1;n<=pdf.numPages;n++){
    const pg = await pdf.getPage(n);
    const H  = pg.view[3] - pg.view[1];
    const tc = await pg.getTextContent();
    const it = [];

    tc.items.forEach(i=>{
      const s = (i.str||'').trim();
      if(s) it.push({ s, x:i.transform[4], y:H-i.transform[5] });
    });

    const lay = it.some(i=>fixArabic(i.s)==='العداد')
      ? LAYOUTS.B
      : LAYOUTS.A;

    const anc = it
      .filter(i => i.x > 585 && (isN(i.s) || i.s === '***'))
      .sort((a,b)=>a.y-b.y);

    for(const a of anc){
      const r = it.filter(i=>Math.abs(i.y-a.y)<4);
      const c = {};
      for(const k in lay){
        c[k] = r
          .filter(i=>i.x>=lay[k][0] && i.x<lay[k][1])
          .sort((p,q)=>p.x-q.x);
      }
      if(!Object.values(c).every(v=>v.length)) continue;
      if(!['val','cnt','sec','blk','bld','apt']
          .every(k=>isN(c[k][0].s))) continue;

      const nm = c.nm
        .sort((p,q)=>q.x-p.x)
        .map(i=>fixArabic(i.s))
        .join(' ')
        .replace(/\s+/g,' ')
        .trim();

      out.push([
        toNum(c.sec[0].s), toNum(c.blk[0].s),
        toNum(c.bld[0].s), toNum(c.apt[0].s),
        nm,
        toNum(c.cnt[0].s), toNum(c.val[0].s)
      ]);
    }
  }
  return { rows: out, issueMonth: '' };
}

/* ============ قراءة أي ملف ============ */
async function readFile(file){
  const lower = file.name.toLowerCase();
  if(lower.endsWith('.pdf')){
    return await readPdf(file);
  } else if(lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls')){
    return await readExcel(file);
  }
  throw new Error('نوع الملف غير مدعوم: ' + file.name);
}

/* ============ عرض البيانات الميدانية ============ */
async function loadUserData(userName){
  const data = await kvGet('data_' + userName);
  return Array.isArray(data) ? data : [];
}

async function saveUserData(userName, data){
  await kvSet('data_' + userName, data);
}

/* ============ إدارة الأزرار الديناميكية ============ */
const DYN_BTNS_KEY = 'collect_dyn_buttons';

function loadDynButtons(){
  return ls(DYN_BTNS_KEY, []);
}

function saveDynButtons(btns){
  lsSet(DYN_BTNS_KEY, btns);
}

function renderDynButtons(container, userName){
  const btns = loadDynButtons();
  if(!btns.length){
    container.innerHTML = '';
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');
  container.innerHTML = btns.map((b,i)=>`
    <button class="dynBtn" data-dyn="${i}" data-file="${esc(b.file)}">
      ${esc(b.name)}
    </button>
  `).join('');

  container.onclick = e => {
    const b = e.target.closest('.dynBtn');
    if(!b) return;
    const idx = +b.dataset.dyn;
    const btn = btns[idx];
    if(btn){
      openIframePage(btn.file, btn.name);
    }
  };
}

function openIframePage(file, title){
  const view = document.getElementById('dynIframeView');
  const frame = document.getElementById('dynIframe');
  const titleEl = document.getElementById('dynIframeTitle');
  if(!view || !frame) return;
  titleEl.textContent = title || 'صفحة';
  frame.src = '/' + file + '?t=' + Date.now();
  view.classList.remove('hidden');
}

function closeIframePage(){
  const view = document.getElementById('dynIframeView');
  if(view) view.classList.add('hidden');
}

/* ============ تنزيل ملف JSON ============ */
function downloadJson(obj, filename){
  const blob = new Blob(
    [JSON.stringify(obj, null, 2)],
    {type:'application/json'}
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

/* ============ تصدير الدوال للاستخدام العام ============ */
window.App = {
  // ثوابت
  APP_SALT, ADMIN_DEFAULT_PASSWORD, ADMIN_RESET_PASSWORD,
  DEFAULT_USERS,

  // اختصارات
  $, $$, $$$,

  // تنسيق
  f, p2, esc, uniq, sum, sumP, key,

  // تواريخ
  monthKey, monthLabel, dayKey, dayLabel,

  // تخزين
  ls, lsSet, lsRemove,

  // IndexedDB
  openDb, kvGet, kvSet, kvDel,

  // تشفير
  deriveKey, encryptData, decryptData,

  // مستخدمين
  get USERS(){ return USERS; },
  set USERS(v){ USERS = v; },
  saveUsers, sortUsers, saveAdminPw,
  get ADMIN_PW(){ return ADMIN_PW; },
  set ADMIN_PW(v){ ADMIN_PW = v; },

  // جلسة
  get currentUser(){ return currentUser; },
  set currentUser(v){ currentUser = v; },
  setSession, getSession, clearSession,

  // أرشفة
  rollover,

  // إشعارات
  showNote,

  // مكتبات
  loadPdfJs, loadXlsx,

  // أرقام
  AR_DIGITS, toEnDigits, toNum, parseIssueMonth,

  // Excel / PDF
  detectColumns, readExcel, readPdf, readFile,

  // بيانات المستخدم
  loadUserData, saveUserData,

  // أزرار ديناميكية
  loadDynButtons, saveDynButtons, renderDynButtons,
  openIframePage, closeIframePage,

  // تنزيل
  downloadJson
};

/* ============ إشعار التحميل ============ */
console.log('✅ shared.js تم تحميله بنجاح');