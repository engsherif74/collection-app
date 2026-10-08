/* =========================================================
   index.js — منطق واجهة العضو
   الجزء 1: الإقلاع، الدخول، تحميل البيانات
   ========================================================= */

/* ============ حالة التطبيق ============ */
let DATA = [];              // بيانات المستخدم (كل القطاعات)
let paid = ls('collect_v1', []);        // سجل السداد
let arcIdx = ls('collect_arcidx', []);  // فهرس الأرشيف
let issues = ls('collect_issues', {});  // الإصدارات
let outsidePaid = ls('collect_outside', []); // تسديدات خارج النطاق
let cur = [];               // الشقق المعروضة حالياً
let scope = [];             // نطاقات المستخدم

// ضمان الأنواع
if(!Array.isArray(paid)) paid = [];
if(!Array.isArray(arcIdx)) arcIdx = [];
if(!Array.isArray(outsidePaid)) outsidePaid = [];
if(typeof issues !== 'object' || issues === null) issues = {};

/* ============ دوال حفظ الحالة ============ */
const savePaid        = () => lsSet('collect_v1', paid);
const saveIssues      = () => lsSet('collect_issues', issues);
const saveOutsidePaid = () => lsSet('collect_outside', outsidePaid);
const paidSet         = () => new Set(paid.map(p => key(p.s,p.b,p.m,p.a)));

/* ============ حفظ بيانات المستخدم في IndexedDB ============ */
async function saveData(){
  if(!currentUser) return;
  try{
    await kvSet('data_' + currentUser.name, DATA);
  }catch(e){}
}

/* ============ تحميل بيانات المستخدم ============ */
async function loadData(){
  if(!currentUser) return;
  try{
    const d = await kvGet('data_' + currentUser.name);
    DATA = Array.isArray(d) ? d : [];
  }catch(e){
    DATA = [];
  }
  // تحميل النطاقات من بيانات المستخدم (إن كانت مدمجة)
  scope = loadScopeFromSession();
}

/* ============ استخراج النطاقات من الجلسة ============ */
function loadScopeFromSession(){
  try{
    const s = sessionStorage.getItem('collect_scope');
    if(!s) return [];
    const arr = JSON.parse(s);
    return Array.isArray(arr) ? arr : [];
  }catch(e){ return []; }
}

function saveScopeToSession(scopes){
  try{
    sessionStorage.setItem('collect_scope', JSON.stringify(scopes));
  }catch(e){}
}

/* ============ فحص هل القطاع/البلوك/العمارة/الشقة داخل النطاق ============ */
function isInScope(s,b,m,a){
  if(!scope.length) return true; // لا نطاق = كل شيء مسموح
  return scope.some(sc => {
    // النطاق: from (s1,b1,m1,a1) → to (s2,b2,m2,a2)
    const cmpFrom = comparePos(s,b,m,a, sc.from.s, sc.from.b, sc.from.m, sc.from.a);
    const cmpTo   = comparePos(s,b,m,a, sc.to.s, sc.to.b, sc.to.m, sc.to.a);
    return cmpFrom >= 0 && cmpTo <= 0;
  });
}

function comparePos(s1,b1,m1,a1, s2,b2,m2,a2){
  if(s1 !== s2) return s1 - s2;
  if(b1 !== b2) return b1 - b2;
  if(m1 !== m2) return m1 - m2;
  return a1 - a2;
}

/* ============ تسجيل الدخول ============ */
function renderLoginUsers(){
  sortUsers();
  const box = $('userList');
  if(!box) return;
  let h = `<button type="button" class="userBtn admin" data-u="__admin__">👨‍💼 الأدمن</button>`;
  USERS.forEach(u => {
    h += `<button type="button" class="userBtn" data-u="${esc(u.name)}">${esc(u.name)}</button>`;
  });
  box.innerHTML = h;
}

let selectedUser = null;

document.addEventListener('DOMContentLoaded', () => {
  const userListEl = $('userList');
  if(userListEl){
    userListEl.addEventListener('click', e => {
      const b = e.target.closest('.userBtn');
      if(!b) return;
      selectedUser = b.dataset.u;
      document.querySelectorAll('.userBtn').forEach(x =>
        x.classList.toggle('on', x === b)
      );
      $('pw').focus();
    });
  }

  const loginBtn = $('loginBtn');
  if(loginBtn){
    loginBtn.addEventListener('click', doLogin);
  }

  const pwEl = $('pw');
  if(pwEl){
    pwEl.addEventListener('keydown', e => {
      if(e.key === 'Enter') doLogin();
    });
  }
});

async function doLogin(){
  const pw = $('pw').value;
  const errBox = $('loginErr');
  errBox.classList.add('hidden');

  if(!selectedUser){
    errBox.textContent = 'اختر المستخدم أولاً';
    errBox.classList.remove('hidden');
    return;
  }
  if(!pw){
    errBox.textContent = 'أدخل كلمة المرور';
    errBox.classList.remove('hidden');
    return;
  }

  // الأدمن
  if(selectedUser === '__admin__'){
    if(pw === ADMIN_RESET_PASSWORD){
      ADMIN_PW = ADMIN_DEFAULT_PASSWORD;
      saveAdminPw();
      errBox.textContent = 'تم إعادة تعيين كلمة المرور للأدمن. سجل الدخول الآن.';
      errBox.classList.remove('hidden');
      $('pw').value = '';
      return;
    }
    if(pw !== ADMIN_PW){
      errBox.textContent = 'كلمة مرور الأدمن غير صحيحة';
      errBox.classList.remove('hidden');
      return;
    }
    // الأدمن يدخل لواجهة التحصيل أيضاً (لكن بلوحة الأدمن في admin.html)
    // هنا ننتقل إلى admin.html
    location.href = '/admin.html';
    return;
  }

  // العضو
  const u = USERS.find(x => x.name === selectedUser);
  if(!u){
    errBox.textContent = 'العضو غير موجود';
    errBox.classList.remove('hidden');
    return;
  }
  if(pw !== u.password){
    errBox.textContent = 'كلمة المرور غير صحيحة';
    errBox.classList.remove('hidden');
    return;
  }

  currentUser = { name: u.name, role: 'member' };
  setSession(currentUser);
  sessionStorage.setItem('collect_member_pw', pw);

  await showMember();
}

/* ============ عرض واجهة العضو ============ */
async function showMember(){
  $('loginView').classList.add('hidden');
  $('memberView').classList.remove('hidden');
  window.scrollTo(0,0);

  // تحميل البيانات
  await loadData();

  // تحميل الأزرار الديناميكية
  renderDynButtons($('dynamicBtnsBar'));

  // تفعيل الأحداث
  bindMemberEvents();

  // بدء العرض الرئيسي
  refresh();
}

/* ============ تسجيل الخروج ============ */
function doLogout(){
  if(!confirm('تسجيل الخروج؟')) return;
  clearSession();
  location.reload();
}

/* ============ ربط الأحداث بواجهة العضو ============ */
function bindMemberEvents(){
  // زر خروج
  const logoutBtn = $('logoutBtn');
  if(logoutBtn) logoutBtn.onclick = doLogout;

  // أزرار الأعلى
  const paperBtn = $('paperBtn');
  if(paperBtn) paperBtn.onclick = openPaperView;

  const searchBtn = $('searchBtn');
  if(searchBtn) searchBtn.onclick = openSearchView;

  const detBtn = $('detBtn');
  if(detBtn) detBtn.onclick = openDetailsView;

  const backBtn = $('backBtn');
  if(backBtn) backBtn.onclick = closeSubView;

  // اختيار القطاع/البلوك/العمارة
  const sec = $('sec');
  if(sec) sec.onchange = () => {
    $('blk').value = '';
    $('bld').value = '';
    $('msg').classList.add('hidden');
    refresh();
  };

  const blk = $('blk');
  if(blk) blk.onchange = () => {
    $('bld').value = '';
    $('msg').classList.add('hidden');
    refresh();
  };

  const bld = $('bld');
  if(bld) bld.onchange = () => {
    $('msg').classList.add('hidden');
    refresh();
  };

  // تحديد الكل
  const allBtn = $('allBtn');
  if(allBtn) allBtn.onclick = selectAll;

  // سداد المختارة
  const paySelBtn = $('paySelBtn');
  if(paySelBtn) paySelBtn.onclick = paySelected;

  // رفع ملف مشفر
  const decBtn = $('decBtn');
  if(decBtn) decBtn.onclick = decryptUploadedFiles;

  // إغلاق إشعار
  const noteX = $('noteX');
  if(noteX) noteX.onclick = () => {
    lsRemove('collect_note');
    $('note').classList.add('hidden');
  };

  // إغلاق iframe
  const dynClose = $('dynIframeClose');
  if(dynClose) dynClose.onclick = closeIframePage;

  // البحث
  const doSearchBtn = $('doSearchBtn');
  if(doSearchBtn) doSearchBtn.onclick = performSearch;

  const searchInput = $('searchInput');
  if(searchInput){
    searchInput.addEventListener('keydown', e => {
      if(e.key === 'Enter') performSearch();
    });
  }

  // الواجهة الورقية
  const paperSecSel = $('paperSecSel');
  if(paperSecSel) paperSecSel.onchange = renderPaperPage;

  const paperPerPage = $('paperPerPage');
  if(paperPerPage){
    paperPerPage.value = String(ls('collect_per_page', 15));
    paperPerPage.onchange = () => {
      lsSet('collect_per_page', +paperPerPage.value);
      renderPaperPage();
    };
  }

  // تبديل بين الأقسام في صفحة التفاصيل
  const v2 = $('v2');
  if(v2) v2.onclick = handleDetailClicks;
}

/* ============ قائمة البيانات (refresh) ============ */
function refresh(){
  const ps = paidSet();
  const rem = DATA.filter(d => !ps.has(key(d[0],d[1],d[2],d[3])));

  const s = +$('sec').value;
  const b = +$('blk').value;
  const m = +$('bld').value;

  // تعبئة قوائم القطاعات
  const secVals = uniq(rem.map(d => d[0]));
  setOpts('sec', secVals, 'قطاع', s);

  const s2 = +$('sec').value;
  const blkVals = s2
    ? uniq(rem.filter(d => d[0] === s2).map(d => d[1]))
    : [];
  setOpts('blk', blkVals, 'بلوك', b);

  const b2 = +$('blk').value;
  const bldVals = b2
    ? uniq(rem.filter(d => d[0] === s2 && d[1] === b2).map(d => d[2]))
    : [];
  setOpts('bld', bldVals, 'عمارة', m);

  renderBuilding(rem);
}

/* ============ تعبئة قائمة منسدلة ============ */
function setOpts(id, vals, label, sel){
  const el = $(id);
  if(!el) return;
  el.innerHTML = '<option value="">اختر</option>' +
    vals.map(v => `<option value="${v}">${label} ${p2(v)}</option>`).join('');
  el.disabled = !vals.length;
  el.value = vals.includes(sel) ? String(sel) : '';
}

/* ============ عرض جدول الشقق ============ */
function renderBuilding(rem){
  const s = +$('sec').value;
  const b = +$('blk').value;
  const m = +$('bld').value;

  if(!(s && b && m)){
    cur = [];
    ['res','coll'].forEach(i => $(i).classList.add('hidden'));
    return;
  }

  cur = rem
    .filter(d => d[0] === s && d[1] === b && d[2] === m)
    .sort((x,y) => x[3] - y[3]);

  if(!cur.length){
    $('rows').innerHTML =
      '<tr><td colspan="6" class="empty">لا توجد شقق متبقية في هذه العمارة</td></tr>';
    $('tc').textContent = '0';
    $('tv').textContent = '0';
    $('res').classList.remove('hidden');
    updateSelTotal();
  } else {
    $('rows').innerHTML = cur.map((d,i)=>`
      <tr>
        <td class="ck">
          <input type="checkbox" class="chk" data-i="${i}">
        </td>
        <td>${p2(d[3])}</td>
        <td class="nm">${esc(d[4])}</td>
        <td>${d[5]}</td>
        <td class="v">${f(d[6])}</td>
        <td>
          <button class="pay" data-i="${i}">سداد</button>
        </td>
      </tr>
    `).join('');

    $('tc').textContent = f(sum(cur, 5));
    $('tv').textContent = f(sum(cur, 6));
    $('res').classList.remove('hidden');

    // ربط السداد الفردي
    $('rows').querySelectorAll('.pay').forEach(btn => {
      btn.onclick = e => {
        const i = +e.target.dataset.i;
        const d = cur[i];
        if(d) paySingle(d);
      };
    });

    // ربط تحديد الشقق
    $('rows').querySelectorAll('.chk').forEach(chk => {
      chk.onchange = updateSelTotal;
    });
  }

  // عرض المحصّل من العمارة
  const L = paid.filter(p => p.s === s && p.b === b && p.m === m);
  $('coll').classList.toggle('hidden', !L.length);
  $('collRows').innerHTML =
    L.map(p => `
      <div class="line">
        <span><b style="color:var(--tx)">${esc(p.n)}</b> - شقة ${p2(p.a)}</span>
        <b>${f(p.v)}</b>
      </div>
    `).join('') +
    `<div class="line sum">
      <span>إجمالي المحصّل من العمارة</span>
      <b>${f(sumP(L))}</b>
    </div>`;

  updateSelTotal();
}

/* ============ سداد فردي ============ */
function paySingle(d){
  if(!confirm(`تأكيد سداد شقة ${p2(d[3])}\n${d[4]}\nالمبلغ: ${f(d[6])}`)) return;
  paid.push({
    s: d[0], b: d[1], m: d[2], a: d[3],
    n: d[4], c: d[5], v: d[6],
    t: Date.now(),
    outside: false
  });
  savePaid();
  $('msg').textContent = `تم سداد شقة ${p2(d[3])} - ${d[4]} - المبلغ ${f(d[6])}`;
  $('msg').classList.remove('hidden');
  refresh();
}

/* ============ تحديد الكل ============ */
function selectAll(){
  const bx = [...document.querySelectorAll('#rows input.chk')];
  const all = bx.every(x => x.checked);
  bx.forEach(x => x.checked = !all);
  updateSelTotal();
}

/* ============ تحديث مجموع المختارة ============ */
function updateSelTotal(){
  let v = 0, c = 0, n = 0;
  const bx = document.querySelectorAll('#rows input.chk');
  bx.forEach(x => {
    if(x.checked){
      const i = +x.dataset.i;
      v += cur[i][6];
      c += cur[i][5];
      n++;
    }
  });
  $('sv').textContent = f(v);
  $('ss').textContent = n
    ? `${n} شقة - عدد الفواتير ${c}`
    : 'لم يتم اختيار شقق';
  $('allBtn').textContent = (bx.length && n === bx.length)
    ? 'إلغاء التحديد'
    : 'تحديد الكل';
  $('paySelBtn').disabled = !n;
}

/* ============ سداد المختارة ============ */
function paySelected(){
  const bx = [...document.querySelectorAll('#rows input.chk')].filter(x => x.checked);
  if(!bx.length) return;
  const items = bx.map(x => cur[+x.dataset.i]).filter(Boolean);
  const tot = items.reduce((a,d) => a + d[6], 0);
  if(!confirm(
    `تأكيد سداد ${items.length} شقة بمبلغ إجمالي ${f(tot)}؟\n\n` +
    items.map(d => `شقة ${p2(d[3])} - ${d[4]}`).join('\n')
  )) return;

  const now = Date.now();
  items.forEach(d => paid.push({
    s: d[0], b: d[1], m: d[2], a: d[3],
    n: d[4], c: d[5], v: d[6],
    t: now,
    outside: false
  }));
  savePaid();
  $('msg').textContent = `تم سداد ${items.length} شقة بمبلغ إجمالي ${f(tot)}`;
  $('msg').classList.remove('hidden');
  refresh();
}







/* =========================================================
   الجزء 2: الواجهة الورقية + البحث + تفاصيل العمارة
   ========================================================= */

/* ============ فتح الواجهة الورقية ============ */
function openPaperView(){
  $('v1').classList.add('hidden');
  $('v2').classList.add('hidden');
  $('v3').classList.add('hidden');
  $('v4').classList.remove('hidden');
  $('backBtn').classList.remove('hidden');
  $('ttl').textContent = '📄 عرض كصفحات ورقية';

  // تعبئة قائمة القطاعات
  const secs = uniq(DATA.map(d => d[0]));
  const sel = $('paperSecSel');

  if(secs.length === 1){
    // قطاع واحد → يظهر تلقائياً
    sel.innerHTML = `<option value="${secs[0]}">قطاع ${p2(secs[0])}</option>`;
    sel.value = secs[0];
    sel.disabled = true;
  } else {
    sel.disabled = false;
    sel.innerHTML = '<option value="">اختر القطاع</option>' +
      secs.map(s => `<option value="${s}">قطاع ${p2(s)}</option>`).join('');
    sel.value = '';
  }

  // عدد العملاء في الصفحة
  const perPage = ls('collect_per_page', 15);
  $('paperPerPage').value = String(perPage);

  renderPaperPage();
}

/* ============ عرض الصفحة الورقية ============ */
function renderPaperPage(){
  const s = +$('paperSecSel').value;
  const perPage = +$('paperPerPage').value || 15;

  if(!s){
    $('paperView').innerHTML =
      '<div class="card"><div class="empty">اختر القطاع أولاً</div></div>';
    return;
  }

  // فلترة: العملاء غير المسددين في القطاع
  const ps = paidSet();
  const remaining = DATA
    .filter(d => d[0] === s && !ps.has(key(d[0],d[1],d[2],d[3])))
    .sort((x,y) => {
      if(x[1] !== y[1]) return x[1] - y[1];     // بلوك
      if(x[2] !== y[2]) return x[2] - y[2];     // عمارة
      return x[3] - y[3];                        // شقة
    });

  if(!remaining.length){
    $('paperView').innerHTML =
      `<div class="card">
        <div class="empty">تم سداد جميع عملاء قطاع ${p2(s)} 🎉</div>
      </div>`;
    return;
  }

  // حساب عدد الصفحات
  const totalPages = Math.ceil(remaining.length / perPage);
  const page = Math.min(
    Math.max(1, +sessionStorage.getItem('paper_page_' + s) || 1),
    totalPages
  );
  sessionStorage.setItem('paper_page_' + s, page);

  const start = (page - 1) * perPage;
  const end = Math.min(start + perPage, remaining.length);
  const pageItems = remaining.slice(start, end);

  // بناء الجدول
  let rows = pageItems.map((d, i) => {
    const realIdx = start + i;
    return `
      <tr>
        <td class="ck">
          <input type="checkbox" class="paperChk" data-i="${realIdx}">
        </td>
        <td class="nm">${esc(d[4])}</td>
        <td class="apt">${p2(d[3])}</td>
        <td class="bld">${p2(d[2])}</td>
        <td class="blk">${p2(d[1])}</td>
        <td class="sec">${p2(d[0])}</td>
        <td class="cnt">${d[5]}</td>
        <td class="val">${f(d[6])}</td>
      </tr>
    `;
  }).join('');

  const totalCnt = pageItems.reduce((a,d) => a + d[5], 0);
  const totalVal = pageItems.reduce((a,d) => a + d[6], 0);

  // معلومات القطاع
  const secAllCnt = remaining.reduce((a,d) => a + d[5], 0);
  const secAllVal = remaining.reduce((a,d) => a + d[6], 0);

  $('paperInfo').textContent =
    `صفحة ${page} من ${totalPages} — ${remaining.length} عميل متبقٍ`;

  $('paperView').innerHTML = `
    <div class="paperPage">
      <div class="paperHeader">
        <div class="pageNum">📄 صفحة ${page} / ${totalPages}</div>
        <div class="summaryTop">
          <span>عدد: <b>${remaining.length}</b></span>
          <span>قيمة: <b>${f(secAllVal)}</b></span>
        </div>
      </div>

      <table class="paperTable">
        <thead>
          <tr>
            <th style="width:34px"></th>
            <th>الاسم</th>
            <th style="width:50px">شقة</th>
            <th style="width:50px">عمارة</th>
            <th style="width:50px">بلوك</th>
            <th style="width:50px">قطاع</th>
            <th style="width:44px">العدد</th>
            <th style="width:70px">القيمة</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="paperSummary" id="paperSummary">
        <div class="item">
          <div class="lbl">إجمالي الصفحة</div>
          <div class="num">${f(totalVal)}</div>
        </div>
        <div class="item">
          <div class="lbl">عدد الفواتير</div>
          <div class="num">${f(totalCnt)}</div>
        </div>
        <div class="item">
          <div class="lbl">المختار</div>
          <div class="num" id="paperSelNum">0</div>
        </div>
        <div class="item">
          <div class="lbl">عدد المختار</div>
          <div class="num" id="paperSelCnt">0</div>
        </div>
      </div>

      <button class="big ok" id="paperPayBtn"
              style="margin-top:12px" disabled>
        ✅ تأكيد سداد المختارة
      </button>
    </div>

    <div class="paperNav">
      <button class="navBtn" id="prevPage" ${page === 1 ? 'disabled' : ''}>
        ⬅️ السابق
      </button>
      <div class="pageIndicator">صفحة ${page} / ${totalPages}</div>
      <button class="navBtn" id="nextPage" ${page === totalPages ? 'disabled' : ''}>
        التالي ➡️
      </button>
    </div>
  `;

  // ربط الأحداث
  $('prevPage').onclick = () => {
    if(page > 1){
      sessionStorage.setItem('paper_page_' + s, page - 1);
      renderPaperPage();
      window.scrollTo(0,0);
    }
  };
  $('nextPage').onclick = () => {
    if(page < totalPages){
      sessionStorage.setItem('paper_page_' + s, page + 1);
      renderPaperPage();
      window.scrollTo(0,0);
    }
  };

  // ربط صناديق الاختيار
  const pageRef = { items: pageItems, s: s };
  document.querySelectorAll('.paperChk').forEach(chk => {
    chk.onchange = () => updatePaperTotal(pageRef);
  });

  // زر سداد المختارة
  $('paperPayBtn').onclick = () => payPaperSelected(pageRef);
}

/* ============ تحديث مجموع الصفحة الورقية ============ */
function updatePaperTotal(ref){
  const bx = [...document.querySelectorAll('.paperChk')];
  let n = 0, cnt = 0, val = 0;

  bx.forEach(x => {
    if(x.checked){
      const realIdx = +x.dataset.i;
      // realIdx هو الموضع في remaining، لكن داخل الصفحة الحالية
      // نبحث داخل الصفحة الحالية عن الشقة
      const localIdx = realIdx - ((+sessionStorage.getItem('paper_page_' + ref.s) - 1) * (+$('paperPerPage').value || 15));
      const d = ref.items[localIdx];
      if(d){
        n++;
        cnt += d[5];
        val += d[6];
      }
    }
  });

  $('paperSelNum').textContent = f(val);
  $('paperSelCnt').textContent = f(cnt);
  $('paperPayBtn').disabled = !n;
}

/* ============ سداد المختارة في الصفحة الورقية ============ */
function payPaperSelected(ref){
  const perPage = +$('paperPerPage').value || 15;
  const page = +sessionStorage.getItem('paper_page_' + ref.s) || 1;
  const start = (page - 1) * perPage;

  const bx = [...document.querySelectorAll('.paperChk')].filter(x => x.checked);
  if(!bx.length) return;

  const items = bx.map(x => {
    const realIdx = +x.dataset.i;
    const localIdx = realIdx - start;
    return ref.items[localIdx];
  }).filter(Boolean);

  const tot = items.reduce((a,d) => a + d[6], 0);
  const cnt = items.reduce((a,d) => a + d[5], 0);

  if(!confirm(
    `تأكيد سداد ${items.length} شقة بمبلغ إجمالي ${f(tot)}؟\n` +
    `عدد الفواتير: ${cnt}\n\n` +
    items.map(d => `${d[4]} - شقة ${p2(d[3])}`).join('\n')
  )) return;

  const now = Date.now();
  items.forEach(d => paid.push({
    s: d[0], b: d[1], m: d[2], a: d[3],
    n: d[4], c: d[5], v: d[6],
    t: now,
    outside: false,
    page: page,
    perPage: perPage
  }));
  savePaid();

  // تسجيل آخر عملية (للتعرف على آخر عميل)
  lsSet('collect_last_payment', {
    page: page,
    count: items.length,
    total: tot,
    ts: now,
    lastClient: items[items.length - 1][4],
    lastApt: items[items.length - 1][3]
  });

  $('msg').textContent =
    `✅ تم سداد ${items.length} شقة بمبلغ ${f(tot)} (الصفحة ${page})`;
  $('msg').classList.remove('hidden');

  renderPaperPage();
}

/* ============ فتح صفحة البحث ============ */
function openSearchView(){
  $('v1').classList.add('hidden');
  $('v2').classList.add('hidden');
  $('v4').classList.add('hidden');
  $('v3').classList.remove('hidden');
  $('backBtn').classList.remove('hidden');
  $('ttl').textContent = '🔍 البحث بالاسم';
  $('searchInput').value = '';
  $('searchResults').innerHTML = '';
  $('searchInput').focus();
}

/* ============ البحث بالاسم ============ */
function performSearch(){
  const q = $('searchInput').value.trim();
  if(!q){
    $('searchResults').innerHTML =
      '<div class="empty">اكتب اسماً للبحث</div>';
    return;
  }

  const qLower = q.toLowerCase();
  const ps = paidSet();

  // ابحث في كل البيانات (غير المسددة)
  const matches = DATA.filter(d =>
    d[4].toLowerCase().includes(qLower) &&
    !ps.has(key(d[0],d[1],d[2],d[3]))
  );

  if(!matches.length){
    $('searchResults').innerHTML =
      `<div class="empty">لا توجد نتائج للبحث: ${esc(q)}</div>`;
    return;
  }

  // جمع العمارات الفريدة
  const buildings = uniq(matches.map(d => `${d[0]}-${d[1]}-${d[2]}`));

  if(buildings.length === 1){
    // عمارة واحدة → اعرض العمارة كاملة مباشرة
    const [s,b,m] = buildings[0].split('-').map(Number);
    renderSearchBuilding(s,b,m);
    return;
  }

  // عدة عمارات → اعرض قائمة
  let h = `<div class="ok">تم العثور على ${matches.length} عميل في ${buildings.length} عمارة</div>`;
  h += buildings.map(bid => {
    const [s,b,m] = bid.split('-').map(Number);
    const items = matches.filter(d => d[0]===s && d[1]===b && d[2]===m);
    const total = items.reduce((a,d) => a+d[6], 0);
    return `
      <div class="resultItem" data-bid="${bid}">
        <div class="nm">
          عمارة ${p2(m)} — بلوك ${p2(b)} — قطاع ${p2(s)}
        </div>
        <div class="loc">
          ${items.length} عميل - إجمالي:
          <b>${f(total)}</b>
        </div>
      </div>
    `;
  }).join('');

  $('searchResults').innerHTML = h;

  // ربط النقر
  document.querySelectorAll('.resultItem').forEach(el => {
    el.onclick = () => {
      const [s,b,m] = el.dataset.bid.split('-').map(Number);
      renderSearchBuilding(s,b,m);
    };
  });
}

/* ============ عرض عمارة من نتائج البحث ============ */
function renderSearchBuilding(s, b, m){
  const ps = paidSet();
  const items = DATA
    .filter(d => d[0]===s && d[1]===b && d[2]===m && !ps.has(key(d[0],d[1],d[2],d[3])))
    .sort((x,y) => x[3] - y[3]);

  if(!items.length){
    $('searchResults').innerHTML =
      '<div class="empty">تم سداد كل عملاء هذه العمارة</div>';
    return;
  }

  const totalCnt = items.reduce((a,d) => a + d[5], 0);
  const totalVal = items.reduce((a,d) => a + d[6], 0);

  let h = `
    <button class="link" id="backToSearch"
            style="margin-bottom:8px">⬅️ رجوع للبحث</button>
    <div class="searchBuilding">
      <div class="title">
        🏢 عمارة ${p2(m)} — بلوك ${p2(b)} — قطاع ${p2(s)}
      </div>
      <div class="ok" style="margin:8px 0">
        إجمالي: <b>${f(totalVal)}</b> — عدد الفواتير: <b>${totalCnt}</b>
      </div>
      <table>
        <thead>
          <tr>
            <th class="ck"></th>
            <th style="width:50px">شقة</th>
            <th>الاسم</th>
            <th style="width:50px">عدد</th>
            <th style="width:70px">قيمة</th>
            <th style="width:70px">سداد</th>
          </tr>
        </thead>
        <tbody id="searchRows">
          ${items.map((d,i)=>`
            <tr>
              <td class="ck">
                <input type="checkbox" class="sChk" data-si="${i}">
              </td>
              <td>${p2(d[3])}</td>
              <td class="nm">${esc(d[4])}</td>
              <td>${d[5]}</td>
              <td class="v">${f(d[6])}</td>
              <td>
                <button class="pay" data-si="${i}">سداد</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="sel" style="margin-top:10px">
        <div class="t">مجموع الشقق المختارة (خارج النطاق)</div>
        <div class="n" id="searchSelNum">0</div>
        <div class="s" id="searchSelCnt">0 فاتورة</div>
        <button class="btn" id="searchPayBtn" disabled>
          ✅ تأكيد سداد المختارة (خارج النطاق)
        </button>
      </div>
    </div>
  `;

  $('searchResults').innerHTML = h;

  // ربط الأزرار
  $('backToSearch').onclick = performSearch;

  document.querySelectorAll('.sChk').forEach(chk => {
    chk.onchange = () => updateSearchTotal(items);
  });

  document.querySelectorAll('.pay[data-si]').forEach(btn => {
    btn.onclick = e => {
      const i = +e.target.dataset.si;
      payOutsideSingle(items[i]);
    };
  });

  $('searchPayBtn').onclick = () => payOutsideSelected(items);
}

/* ============ تحديث مجموع البحث ============ */
function updateSearchTotal(items){
  const bx = [...document.querySelectorAll('.sChk')];
  let n = 0, cnt = 0, val = 0;
  bx.forEach(x => {
    if(x.checked){
      const i = +x.dataset.si;
      const d = items[i];
      if(d){
        n++;
        cnt += d[5];
        val += d[6];
      }
    }
  });
  $('searchSelNum').textContent = f(val);
  $('searchSelCnt').textContent = `${cnt} فاتورة`;
  $('searchPayBtn').disabled = !n;
}

/* ============ سداد فردي خارج النطاق ============ */
function payOutsideSingle(d){
  if(!d) return;
  if(!confirm(
    `سداد خارج النطاق\n` +
    `شقة ${p2(d[3])} - ${d[4]}\n` +
    `المبلغ: ${f(d[6])}`
  )) return;

  const rec = {
    s: d[0], b: d[1], m: d[2], a: d[3],
    n: d[4], c: d[5], v: d[6],
    t: Date.now(),
    outside: true
  };
  paid.push(rec);
  outsidePaid.push(rec);
  savePaid();
  saveOutsidePaid();

  $('msg').textContent =
    `✅ تم سداد ${d[4]} (خارج النطاق) — ${f(d[6])}`;
  $('msg').classList.remove('hidden');
  performSearch();
}

/* ============ سداد المختارة خارج النطاق ============ */
function payOutsideSelected(items){
  const bx = [...document.querySelectorAll('.sChk')].filter(x => x.checked);
  if(!bx.length) return;
  const sel = bx.map(x => items[+x.dataset.si]).filter(Boolean);
  const tot = sel.reduce((a,d) => a + d[6], 0);
  const cnt = sel.reduce((a,d) => a + d[5], 0);

  if(!confirm(
    `تأكيد سداد ${sel.length} شقة خارج النطاق\n` +
    `الإجمالي: ${f(tot)}\nعدد الفواتير: ${cnt}\n\n` +
    sel.map(d => `شقة ${p2(d[3])} - ${d[4]}`).join('\n')
  )) return;

  const now = Date.now();
  sel.forEach(d => {
    const rec = {
      s: d[0], b: d[1], m: d[2], a: d[3],
      n: d[4], c: d[5], v: d[6],
      t: now,
      outside: true
    };
    paid.push(rec);
    outsidePaid.push(rec);
  });
  savePaid();
  saveOutsidePaid();

  $('msg').textContent =
    `✅ تم سداد ${sel.length} شقة خارج النطاق — ${f(tot)}`;
  $('msg').classList.remove('hidden');
  performSearch();
}

/* ============ رجوع من الشاشات الفرعية ============ */
function closeSubView(){
  $('v1').classList.remove('hidden');
  $('v2').classList.add('hidden');
  $('v3').classList.add('hidden');
  $('v4').classList.add('hidden');
  $('backBtn').classList.add('hidden');
  $('ttl').textContent = 'تحصيل مديونية العملاء';
  refresh();
  window.scrollTo(0,0);
}




/* =========================================================
   الجزء 3: صفحة التفاصيل + الأرشيف + آلية التحديث الآمن
   ========================================================= */

/* ============ فتح صفحة التفاصيل ============ */
function openDetailsView(){
  $('v1').classList.add('hidden');
  $('v3').classList.add('hidden');
  $('v4').classList.add('hidden');
  $('v2').classList.remove('hidden');
  $('backBtn').classList.remove('hidden');
  $('ttl').textContent = '📊 تفاصيل التحصيل';
  renderDetails();
  window.scrollTo(0,0);
}

/* ============ الأكورديون: فتح/إغلاق ============ */
const openAcc = new Set();
const openSub = new Set();
const openBlk = new Set();

function handleDetailClicks(e){
  // زر الأكورديون
  const ac = e.target.closest('.acc');
  if(ac){
    const a = ac.dataset.a;
    if(openAcc.has(a)) openAcc.delete(a);
    else openAcc.add(a);
    $('a-' + a).classList.toggle('hidden', !openAcc.has(a));
    ac.classList.toggle('open', openAcc.has(a));
    return;
  }

  // زر الفرع (تفاصيل العملاء)
  const sb = e.target.closest('[data-sub]');
  if(sb){
    const id = sb.dataset.sub;
    const box = $('s-' + id);
    if(!box) return;
    const opened = box.classList.toggle('hidden');
    if(opened) openSub.delete(id);
    else openSub.add(id);
    if(!opened && id.startsWith('m')){
      fillMonth(id.slice(1));
    }
    return;
  }

  // صف بلوك
  const rb = e.target.closest('[data-blk]');
  if(rb){
    const id = rb.dataset.blk;
    if(openBlk.has(id)) openBlk.delete(id);
    else openBlk.add(id);
    renderBlockSection();
    return;
  }

  // زر تنزيل
  const dlBtn = e.target.closest('[data-dl]');
  if(dlBtn){
    downloadArchive(dlBtn.dataset.k, dlBtn.dataset.dl);
    return;
  }

  // زر تراجع
  const undo = e.target.closest('button[data-t]');
  if(undo){
    undoPayment(undo.dataset.t);
    return;
  }
}

/* ============ رسم صفحة التفاصيل ============ */
function renderDetails(){
  renderIssues();
  renderBlockSection();
  renderDays();
  renderOutside();
  renderArchive();
}

/* ============ 1) جدول الإصدارات ============ */
function renderIssues(){
  const secTot = {};
  DATA.forEach(d => {
    secTot[d[0]] = (secTot[d[0]] || 0) + d[6];
  });

  const secCol = {};
  paid.forEach(p => {
    secCol[p.s] = (secCol[p.s] || 0) + p.v;
  });

  const secs = uniq([
    ...Object.keys(secTot).map(Number),
    ...Object.keys(secCol).map(Number)
  ]);

  if(!secs.length){
    $('issBody').innerHTML =
      '<tr><td colspan="6" class="empty">لا توجد بيانات</td></tr>';
    ['issT_tot','issT_iss','issT_col','issT_remiss','issT_remtot']
      .forEach(id => $(id).textContent = '0');
    return;
  }

  let html = '';
  let tot = [0,0,0,0,0];

  secs.forEach(s => {
    const t = secTot[s] || 0;
    const col = secCol[s] || 0;
    const iss = Number(issues[s]) || 0;
    const remIss = iss - col;
    const remTot = t - col;

    html += `
      <tr>
        <td class="lb">قطاع ${p2(s)}</td>
        <td class="v">${f(t)}</td>
        <td>
          <input type="number" class="iss"
                 data-sec="${s}"
                 value="${iss}"
                 min="0" max="${t}" step="1">
        </td>
        <td class="v">${f(col)}</td>
        <td class="v ${remIss < 0 ? 'neg' : (remIss > 0 ? 'pos' : '')}">
          ${f(remIss)}
        </td>
        <td class="v">${f(remTot)}</td>
      </tr>
    `;
    tot[0] += t; tot[1] += iss; tot[2] += col;
    tot[3] += remIss; tot[4] += remTot;
  });

  $('issBody').innerHTML = html;
  $('issT_tot').textContent = f(tot[0]);
  $('issT_iss').textContent = f(tot[1]);
  $('issT_col').textContent = f(tot[2]);
  $('issT_remiss').textContent = f(tot[3]);
  $('issT_remtot').textContent = f(tot[4]);

  // ربط حقول الإصدار
  $('issBody').querySelectorAll('.iss').forEach(inp => {
    inp.oninput = e => {
      const s = +inp.dataset.sec;
      const t = Number(inp.max) || 0;
      let v = Number(inp.value) || 0;
      if(v < 0) v = 0;
      if(v > t){ v = t; inp.value = t; }
      issues[s] = v;
      saveIssues();
      const row = inp.closest('tr');
      const col = Number(row.children[3].textContent.replace(/,/g,'')) || 0;
      const remIss = v - col;
      const remTot = t - col;
      const c4 = row.children[4];
      const c5 = row.children[5];
      c4.textContent = f(remIss);
      c4.className = 'v ' + (remIss < 0 ? 'neg' : (remIss > 0 ? 'pos' : ''));
      c5.textContent = f(remTot);
      refreshIssTotals();
    };
  });
}

function refreshIssTotals(){
  const secTot = {};
  DATA.forEach(d => { secTot[d[0]] = (secTot[d[0]]||0) + d[6]; });
  const secCol = {};
  paid.forEach(p => { secCol[p.s] = (secCol[p.s]||0) + p.v; });

  const secs = uniq([
    ...Object.keys(secTot).map(Number),
    ...Object.keys(secCol).map(Number)
  ]);

  let t = [0,0,0,0,0];
  secs.forEach(s => {
    const tot = secTot[s] || 0;
    const col = secCol[s] || 0;
    const iss = Number(issues[s]) || 0;
    t[0] += tot; t[1] += iss; t[2] += col;
    t[3] += iss - col; t[4] += tot - col;
  });

  $('issT_tot').textContent = f(t[0]);
  $('issT_iss').textContent = f(t[1]);
  $('issT_col').textContent = f(t[2]);
  $('issT_remiss').textContent = f(t[3]);
  $('issT_remtot').textContent = f(t[4]);
}

/* ============ 2) البلوكات والعمارات ============ */
function renderBlockSection(){
  const s = +$('secSel').value;
  if(!s){
    $('secSummary').classList.add('hidden');
    $('blocksBody').innerHTML =
      '<div class="empty">اختر قطاعاً لعرض البلوكات</div>';
    return;
  }

  const secRows = DATA.filter(d => d[0] === s);
  const tot = sum(secRows, 6);
  const col = paid.filter(p => p.s === s).reduce((a,p) => a + p.v, 0);
  const iss = Number(issues[s]) || 0;

  $('secSummary').classList.remove('hidden');
  $('secSummary').innerHTML = `
    <span>قطاع ${p2(s)} — مديونية: <b>${f(tot)}</b>
    — إصدار: <b>${f(iss)}</b>
    — محصّل: <b>${f(col)}</b>
    — متبقي: <b>${f(tot - col)}</b></span>
  `;

  const blks = uniq(secRows.map(d => d[1]));
  if(!blks.length){
    $('blocksBody').innerHTML =
      '<div class="empty">لا توجد بلوكات في هذا القطاع</div>';
    return;
  }

  let h = `<table>
    <thead><tr>
      <th style="width:22%;text-align:right;padding-inline-start:14px">البلوك</th>
      <th>إجمالي المديونية</th>
      <th>المحصّل</th>
      <th>المتبقي</th>
    </tr></thead>
    <tbody>`;

  blks.forEach(b => {
    const bRows = secRows.filter(d => d[1] === b);
    const bTot = sum(bRows, 6);
    const bCol = paid
      .filter(p => p.s === s && p.b === b)
      .reduce((a,p) => a + p.v, 0);
    const bRem = bTot - bCol;
    const bid = `b-${s}-${b}`;
    const open = openBlk.has(bid);

    h += `
      <tr class="rowbtn" data-blk="${bid}">
        <td class="lb">
          <span class="arrow ${open ? 'open' : ''}">▶</span>
          بلوك ${p2(b)}
        </td>
        <td class="v">${f(bTot)}</td>
        <td class="v">${f(bCol)}</td>
        <td class="v">${f(bRem)}</td>
      </tr>
    `;

    if(open){
      const blds = uniq(bRows.map(d => d[2]));
      h += `<tr><td colspan="4" style="padding:0">
        <table class="subrow">
          <thead><tr>
            <th style="width:22%;text-align:right;padding-inline-start:14px">العمارة</th>
            <th>إجمالي المديونية</th>
            <th>المحصّل</th>
            <th>المتبقي</th>
          </tr></thead>
          <tbody>`;

      blds.forEach(m => {
        const mRows = bRows.filter(d => d[2] === m);
        const mTot = sum(mRows, 6);
        const mCol = paid
          .filter(p => p.s===s && p.b===b && p.m===m)
          .reduce((a,p) => a + p.v, 0);
        h += `
          <tr>
            <td class="lb">عمارة ${p2(m)}</td>
            <td class="v">${f(mTot)}</td>
            <td class="v">${f(mCol)}</td>
            <td class="v">${f(mTot - mCol)}</td>
          </tr>
        `;
      });

      h += `</tbody></table></td></tr>`;
    }
  });

  h += `</tbody></table>`;
  $('blocksBody').innerHTML = h;
}

/* ============ 3) السجل اليومي ============ */
function renderDays(){
  const D = {};
  paid.forEach(p => {
    const k = dayKey(p.t);
    if(!D[k]) D[k] = { t: p.t, L: [] };
    D[k].L.push(p);
  });

  const ks = Object.keys(D).sort().reverse();
  if(!ks.length){
    $('days').innerHTML = '<div class="empty">لا توجد تحصيلات بعد</div>';
    return;
  }

  $('days').innerHTML = ks.map(k => {
    const x = D[k];
    const rows = x.L
      .slice()
      .sort((a,b) => b.t - a.t)
      .map(p => payLine(p, true))
      .join('');
    return `
      <div class="dayBlock">
        <div class="dayHead">
          <span>${dayLabel(x.t)}
            <span class="cnt">(${x.L.length} شقة)</span>
          </span>
          <b>${f(sumP(x.L))}</b>
        </div>
        <div class="dayBody">${rows}</div>
      </div>
    `;
  }).join('');
}

/* ============ سطر الدفع ============ */
function payLine(p, undo){
  const tag = p.outside
    ? '<span style="color:var(--accent);font-size:11px">[خارج النطاق]</span>'
    : '';
  return `
    <div class="line">
      <span>
        <b style="color:var(--tx)">${esc(p.n)}</b> ${tag}
        <br><small>قطاع ${p2(p.s)} - بلوك ${p2(p.b)} - عمارة ${p2(p.m)} - شقة ${p2(p.a)}</small>
      </span>
      <span>
        <b>${f(p.v)}</b>
        ${undo ? `<button class="red" data-t="${p.t}">تراجع</button>` : ''}
      </span>
    </div>
  `;
}

/* ============ تراجع عن دفعة ============ */
function undoPayment(ts){
  const p = paid.find(x => String(x.t) === String(ts));
  if(!p) return;
  if(!confirm(
    `إلغاء سداد شقة ${p2(p.a)} (عمارة ${p2(p.m)})؟`
  )) return;

  paid = paid.filter(x => x !== p);
  outsidePaid = outsidePaid.filter(x => String(x.t) !== String(ts));
  savePaid();
  saveOutsidePaid();

  renderDetails();
  refresh();
}

/* ============ 4) تسديدات خارج النطاق ============ */
function renderOutside(){
  const box = $('outsideBody');
  if(!box) return;

  if(!outsidePaid.length){
    box.innerHTML = '<div class="empty">لا توجد تسديدات خارج النطاق</div>';
    return;
  }

  const inScopeTotal = paid
    .filter(p => !p.outside)
    .reduce((a,p) => a + p.v, 0);
  const outScopeTotal = outsidePaid.reduce((a,p) => a + p.v, 0);

  let h = `
    <div class="outsideSummary">
      <div class="item">
        <div class="lbl">داخل النطاق</div>
        <div class="num">${f(inScopeTotal)}</div>
      </div>
      <div class="item">
        <div class="lbl">خارج النطاق</div>
        <div class="num">${f(outScopeTotal)}</div>
      </div>
      <div class="item">
        <div class="lbl">الإجمالي</div>
        <div class="num">${f(inScopeTotal + outScopeTotal)}</div>
      </div>
    </div>
  `;

  h += outsidePaid
    .slice()
    .sort((a,b) => b.t - a.t)
    .map(p => `
      <div class="line">
        <span>
          <b style="color:var(--tx)">${esc(p.n)}</b>
          <br><small>ق ${p2(p.s)} - ب ${p2(p.b)} - ع ${p2(p.m)} - ش ${p2(p.a)}</small>
        </span>
        <b>${f(p.v)}</b>
      </div>
    `).join('');

  box.innerHTML = h;
}

/* ============ 5) الأرشيف ============ */
function renderArchive(){
  const box = $('archiveBody');
  if(!box) return;

  const cm = monthKey();
  const cmPaid = paid.filter(p => monthKey(new Date(p.t)) === cm);
  const cmTotal = sumP(cmPaid);

  let h = `
    <div class="archiveItem">
      <div class="head">
        <span>📅 ${monthLabel(cm)} (الشهر الحالي)</span>
        <b>${f(cmTotal)}</b>
      </div>
      <div style="font-size:12px;color:var(--mu)">
        عدد العمليات: ${cmPaid.length}
      </div>
    </div>
  `;

  if(!arcIdx.length){
    h += '<div class="empty">لا توجد شهور مؤرشفة بعد</div>';
    box.innerHTML = h;
    return;
  }

  h += arcIdx.map(a => `
    <div class="archiveItem">
      <div class="head">
        <span>📦 ${monthLabel(a.m)}</span>
        <b>${f(a.total)}</b>
      </div>
      <div style="font-size:12px;color:var(--mu)">
        عدد العمليات: ${a.n}
      </div>
      <div class="actions">
        <button class="mini" data-sub="m${a.k}">تفاصيل العملاء</button>
        <button class="mini" data-dl="log" data-k="${a.k}">
          تنزيل سجل التحصيل (JSON)
        </button>
      </div>
      <div class="${openSub.has('m' + a.k) ? '' : 'hidden'}"
           id="s-m${a.k}"></div>
    </div>
  `).join('');

  box.innerHTML = h;

  // إعادة فتح التفاصيل المفتوحة
  openSub.forEach(id => {
    if(id.startsWith('m')) fillMonth(id.slice(1));
  });
}

/* ============ تحميل تفاصيل شهر من الأرشيف ============ */
async function fillMonth(k){
  const box = $('s-m' + k);
  if(!box) return;
  try{
    const e = await kvGet(k);
    if(e && e.paid && e.paid.length){
      box.innerHTML = e.paid
        .slice()
        .sort((a,b) => b.t - a.t)
        .map(p => payLine(p, false))
        .join('');
    } else {
      box.innerHTML = '<div class="empty">لا توجد تحصيلات</div>';
    }
  }catch(err){
    box.innerHTML = '<div class="empty">تعذر تحميل الأرشيف</div>';
  }
}

/* ============ تنزيل ملف أرشيف ============ */
async function downloadArchive(k, type){
  try{
    const e = await kvGet(k);
    if(!e){ alert('الأرشيف غير موجود'); return; }

    if(type === 'log'){
      downloadJson(e.paid || [], `collections-${e.m}.json`);
    } else if(type === 'raw'){
      downloadJson(e.raw || [], `raw-${e.m}.json`);
    } else if(type === 'work'){
      const ps = new Set(e.paid.map(p => key(p.s,p.b,p.m,p.a)));
      const work = (e.raw || []).filter(r => !ps.has(key(r[0],r[1],r[2],r[3])));
      downloadJson(work, `work-${e.m}.json`);
    }
  }catch(err){
    alert('تعذر قراءة الأرشيف');
  }
}

/* ============ 6) استقبال ملف مشفَّر من الأدمن ============ */
async function decryptUploadedFiles(){
  const files = [...$('encFile').files];
  if(!files.length){
    alert('اختر ملفاً واحداً على الأقل');
    return;
  }

  const st = $('decStatus');
  st.classList.remove('hidden');
  st.textContent = `⏳ جاري فك تشفير ${files.length} ملف...`;

  try{
    const pw = sessionStorage.getItem('collect_member_pw');
    if(!pw) throw new Error('يجب تسجيل الدخول من جديد');

    const allNewRows = [];
    const sources = [];
    let incomingScope = null;

    for(const file of files){
      const text = await file.text();
      const encObj = JSON.parse(text);
      if(!encObj.data || !encObj.salt){
        throw new Error(`الملف "${file.name}" بصيغة غير صحيحة`);
      }
      const dec = decryptData(encObj, pw);
      if(!dec){
        throw new Error(`كلمة المرور غير صحيحة أو الملف "${file.name}" تالف`);
      }
      if(dec.owner && dec.owner !== currentUser.name){
        throw new Error(`الملف "${file.name}" مخصص للعضو "${dec.owner}" وليس لك`);
      }

      if(Array.isArray(dec.data)) allNewRows.push(...dec.data);

      // استخراج النطاقات
      if(dec.scope && Array.isArray(dec.scope) && dec.scope.length){
        incomingScope = dec.scope;
      }

      sources.push(file.name);
    }

    if(!allNewRows.length) throw new Error('لا توجد بيانات صالحة في الملفات');

    // إزالة التكرار
    const newMap = new Map();
    allNewRows.forEach(d => newMap.set(key(d[0],d[1],d[2],d[3]), d));
    const newRows = [...newMap.values()];

    // حفظ النطاقات
    if(incomingScope){
      scope = incomingScope;
      saveScopeToSession(scope);
    }

    const currentRows = Array.isArray(DATA) ? DATA : [];

    showDecryptChoice(newRows, sources, currentRows, incomingScope);
    st.textContent = '';
    st.classList.add('hidden');
  }catch(e){
    st.textContent = '❌ ' + (e.message || e);
  }
}

/* ============ نافذة اختيار استبدال/دمج ============ */
function showDecryptChoice(newRows, sources, currentRows, incomingScope){
  const old = document.getElementById('choiceModal');
  if(old) old.remove();

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'choiceModal';

  const newCount = newRows.length;
  const curCount = currentRows.length;

  const curMap = new Map(currentRows.map(d => [key(d[0],d[1],d[2],d[3]), d]));
  let added = 0, updated = 0, unchanged = 0;

  newRows.forEach(d => {
    const k = key(d[0],d[1],d[2],d[3]);
    if(!curMap.has(k)) added++;
    else {
      const o = curMap.get(k);
      if(o[4] === d[4] && o[5] === d[5] && o[6] === d[6]) unchanged++;
      else updated++;
    }
  });

  const scopeText = incomingScope && incomingScope.length
    ? `${incomingScope.length} نطاق`
    : 'كل البيانات';

  modal.innerHTML = `
    <div class="modalBox" style="max-width:480px">
      <h3>📥 تم فك تشفير ${sources.length} ملف</h3>
      <div style="font-size:12px;color:var(--mu);text-align:center;margin-bottom:12px;word-break:break-word">
        ${sources.map(esc).join('<br>')}
      </div>
      <div style="background:linear-gradient(135deg,var(--soft),var(--soft2));border-radius:12px;padding:14px;margin-bottom:14px;font-size:13px;line-height:2;border:1px solid var(--pr2)">
        <div>📊 <b>عدد العملاء الجدد:</b> <span style="direction:ltr;display:inline-block">${f(newCount)}</span></div>
        <div>📁 <b>عدد العملاء الحاليين:</b> <span style="direction:ltr;display:inline-block">${f(curCount)}</span></div>
        <hr style="border:none;border-top:1px dashed var(--bd);margin:8px 0">
        <div>➕ <b style="color:#16a34a">جديد (سيُضاف):</b> ${f(added)}</div>
        <div>🔄 <b style="color:#0284c7">مُعدَّل:</b> ${f(updated)}</div>
        <div>🟰 <b style="color:var(--mu)">مطابق:</b> ${f(unchanged)}</div>
        <hr style="border:none;border-top:1px dashed var(--bd);margin:8px 0">
        <div>🎯 <b>النطاق الوارد:</b> ${scopeText}</div>
      </div>
      <div style="font-size:13px;text-align:center;margin-bottom:14px;font-weight:700">
        اختر طريقة التحميل:
      </div>
      <div style="display:grid;gap:10px">
        <button class="big ok" id="chMerge" style="height:auto;padding:14px;line-height:1.5">
          ➕ تحديث / دمج
          <div style="font-size:11px;font-weight:600;opacity:.9;margin-top:4px">
            يحتفظ بالبيانات القديمة ويضيف الجديدة
          </div>
        </button>
        <button class="big danger" id="chReplace" style="height:auto;padding:14px;line-height:1.5">
          🔄 استبدال كل البيانات
          <div style="font-size:11px;font-weight:600;opacity:.9;margin-top:4px">
            يحذف البيانات الحالية ويضع الجديدة
          </div>
        </button>
        <button class="big" id="chCancel"
                style="height:46px;background:var(--bd-strong);color:var(--tx);box-shadow:none">
          إلغاء
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#chCancel').onclick = () => {
    modal.remove();
    $('encFile').value = '';
  };

  modal.querySelector('#chReplace').onclick = async () => {
    if(!confirm('سيتم حذف كل البيانات الحالية واستبدالها. متابعة؟')) return;
    DATA = newRows;
    await saveData();
    modal.remove();
    $('encFile').value = '';
    refresh();
    const st = $('decStatus');
    st.classList.remove('hidden');
    st.textContent = `✅ تم استبدال البيانات: ${f(DATA.length)} عميل`;
  };

  modal.querySelector('#chMerge').onclick = async () => {
    const mergedMap = new Map(currentRows.map(d => [key(d[0],d[1],d[2],d[3]), d]));
    newRows.forEach(d => mergedMap.set(key(d[0],d[1],d[2],d[3]), d));
    DATA = [...mergedMap.values()];
    await saveData();
    modal.remove();
    $('encFile').value = '';
    refresh();
    const st = $('decStatus');
    st.classList.remove('hidden');
    st.textContent =
      `✅ تم الدمج: ${f(DATA.length)} عميل (+${f(added)} جديد)`;
  };
}



/* =========================================================
   الجزء 4: الإقلاع + التحديث الآمن + الأرشفة التلقائية
   ========================================================= */

/* ============ آلية التحديث الآمن ============ */

/**
 * فكرة: عند وصول ملف جديد من الأدمن، لا يُطبَّق مباشرة.
 * يتم:
 *   1. إنشاء ملف أرشفة كامل مشفَّر بكلمة مرور الأدمن.
 *   2. يُنزَّل على جهاز العضو.
 *   3. رسالة "أرسل الملف للأدمن".
 *   4. لا يُطبَّق أي تحديث حتى يرسل.
 */

const PENDING_KEY = 'collect_pending_update';

async function checkPendingUpdate(){
  const pending = ls(PENDING_KEY, null);
  if(!pending) return;

  // إذا كان هناك تحديث معلق لم يُرسل بعد → نبّه العضو
  if(!pending.sent){
    showUpdateBanner(pending);
  }
}

function showUpdateBanner(pending){
  const banner = document.createElement('div');
  banner.className = 'warnBox';
  banner.id = 'pendingBanner';
  banner.innerHTML = `
    <b>⚠️ لديك تحديث معلق</b>
    تاريخ التحديث: ${new Date(pending.createdAt).toLocaleString('ar-EG')}
    <br>
    عدد العملاء الجدد: ${f(pending.newCount || 0)}
    <br><br>
    <button class="big gold" id="resendArchiveBtn"
            style="margin-top:6px">
      📤 إعادة إرسال الملف للأدمن
    </button>
    <button class="big danger" id="cancelUpdateBtn"
            style="margin-top:6px;font-size:13px">
      ❌ إلغاء التحديث والعمل على الملف القديم
    </button>
  `;
  document.body.insertBefore(banner, document.body.firstChild);

  $('resendArchiveBtn').onclick = () => resendArchive(pending);
  $('cancelUpdateBtn').onclick = () => cancelUpdate();
}

async function resendArchive(pending){
  alert(
    'من فضلك أرسل ملف الأرشفة الذي تم تنزيله إلى الأدمن أولاً.\n\n' +
    'سيصلك ملف جديد بعد التأكيد.'
  );
  // إعادة تنزيل الملف للاحتياط
  if(pending.archiveFile){
    downloadJson(pending.archiveFile, pending.archiveName || 'archive.json');
  }
}

function cancelUpdate(){
  if(!confirm('إلغاء التحديث والاستمرار على الملف القديم؟')) return;
  lsRemove(PENDING_KEY);
  const b = $('pendingBanner');
  if(b) b.remove();
}

/* ============ تطبيق تحديث جديد (يُستدعى بعد استقبال ملف مشفر) ============ */

/**
 * ملاحظة مهمة:
 * هذه الدالة لا تُطبَّق تلقائياً.
 * العضو يرى نافذة `showDecryptChoice` أولاً.
 * وعند موافقته → يُطبَّق فعلاً.
 */

async function applyNewUpdate(newRows, sources){
  // 1) إنشاء أرشفة قبل التطبيق
  const archive = createArchiveSnapshot();

  // 2) تحميل الأرشفة مشفَّرة بكلمة مرور الأدمن
  const encArchive = encryptData({
    type: 'archive',
    member: currentUser.name,
    month: monthKey(),
    createdAt: Date.now(),
    snapshot: archive
  }, ADMIN_DEFAULT_PASSWORD);

  const archiveName = `archive-${currentUser.name}-${monthKey()}.enc.json`;
  downloadJson(encArchive, archiveName);

  // 3) تسجيل التحديث المعلق
  lsSet(PENDING_KEY, {
    createdAt: Date.now(),
    newCount: newRows.length,
    sources: sources,
    archiveFile: encArchive,
    archiveName: archiveName,
    sent: false
  });

  // 4) عرض رسالة للعضو
  const confirmSend = confirm(
    `📤 تم تنزيل ملف الأرشفة\n\n` +
    `الملف: ${archiveName}\n\n` +
    `⚠️ من فضلك أرسل هذا الملف للأدمن قبل المتابعة.\n\n` +
    `هل أرسلته الآن؟`
  );

  if(confirmSend){
    const pending = ls(PENDING_KEY, null);
    if(pending){
      pending.sent = true;
      lsSet(PENDING_KEY, pending);
    }
  } else {
    showUpdateBanner(ls(PENDING_KEY, null));
  }
}

/* ============ إنشاء لقطة الأرشيف ============ */
function createArchiveSnapshot(){
  return {
    data: DATA,
    paid: paid,
    outsidePaid: outsidePaid,
    issues: issues,
    scope: scope,
    monthKey: monthKey()
  };
}

/* ============ الأرشفة التلقائية الشهرية (آخر دقيقة) ============ */

/**
 * الأرشفة التلقائية:
 *  - تحدث في آخر يوم من الشهر، آخر دقيقة.
 *  - تُنشئ أرشيفاً شهرياً كاملاً.
 *  - تحذف العملاء المسددين فقط.
 *  - تحتفظ بالعملاء غير المسددين.
 */

async function autoMonthArchiveCheck(){
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth();
  const year = now.getFullYear();

  // احسب آخر يوم في الشهر
  const lastDay = new Date(year, month + 1, 0).getDate();
  const isLastDay = (day === lastDay);

  // الوقت: بعد الساعة 11:58 مساءً
  const hour = now.getHours();
  const minute = now.getMinutes();
  const isLastMinutes = (hour === 23 && minute >= 58);

  if(!isLastDay || !isLastMinutes) return;

  // تحقق: هل تمت الأرشفة بالفعل هذا الشهر؟
  const archivedMonth = ls('collect_last_auto_archive', '');
  const currentMonthKey = monthKey(now);
  if(archivedMonth === currentMonthKey) return;

  try{
    await performMonthlyArchive();
    lsSet('collect_last_auto_archive', currentMonthKey);
  }catch(e){
    console.error('فشل الأرشفة التلقائية:', e);
  }
}

async function performMonthlyArchive(){
  const cm = monthKey();
  const snapshot = createArchiveSnapshot();

  // احفظ البيانات الكاملة أولاً في الأرشيف
  const arcKey = `arc:${currentUser.name}:${cm}:auto`;
  await kvSet(arcKey, snapshot);

  // حدّث فهرس الأرشيف
  const idx = ls('collect_arcidx', []);
  idx.unshift({
    k: arcKey,
    m: cm,
    total: sumP(paid),
    n: paid.length,
    rows: DATA.length,
    auto: true
  });
  lsSet('collect_arcidx', idx);

  // احذف العملاء المسددين فقط
  const ps = paidSet();
  DATA = DATA.filter(d => !ps.has(key(d[0], d[1], d[2], d[3])));

  // احتفظ بسجل السداد (لا يُحذف)
  // paid يبقى في الذاكرة، لكن يُؤرشف

  // احفظ البيانات المتبقية
  await saveData();

  // تنبيه العضو
  showNote(
    `📦 تمت الأرشفة الشهرية لشهر ${monthLabel(cm)} تلقائياً.\n` +
    `تم الاحتفاظ بالعملاء غير المسددين فقط.`
  );
}

/* ============ مراقبة الوقت ============ */
function startAutoArchiveWatcher(){
  // فحص كل دقيقة
  setInterval(autoMonthArchiveCheck, 60 * 1000);
}

/* ============ الإقلاع ============ */
async function initApp(){
  // إعداد المستخدمين
  renderLoginUsers();

  // استئناف الجلسة إن وُجدت
  const s = getSession();
  if(s){
    if(s.role === 'member'){
      currentUser = s;
      await showMember();
    } else if(s.role === 'admin'){
      // الأدمن → صفحة الأدمن
      location.href = '/admin.html';
      return;
    }
  }

  // تسجيل Service Worker
  if('serviceWorker' in navigator){
    try{
      await navigator.serviceWorker.register('/sw.js');
    }catch(e){}
  }

  // بدء الأرشفة التلقائية
  startAutoArchiveWatcher();

  // فحص أي تحديث معلق
  await checkPendingUpdate();

  // إشعار قديم (من الأرشيف التلقائي)
  const note = ls('collect_note', '');
  if(note){
    showNote(note);
  }
}

/* ============ بدء التطبيق ============ */
document.addEventListener('DOMContentLoaded', initApp);

/* ============ معالجة أخطاء ============ */
window.addEventListener('error', e => {
  console.error('خطأ غير متوقع:', e.error);
});

window.addEventListener('unhandledrejection', e => {
  console.error('وعد مرفوض:', e.reason);
});

console.log('✅ index.js تم تحميله بنجاح');







