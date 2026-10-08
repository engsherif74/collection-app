/* =========================================================
   admin.js — منطق لوحة الأدمن
   يعتمد على shared.js (يُحمَّل قبله في admin.html)
   ========================================================= */

let currentData = null;
let currentIssueMonth = '';
let currentSource = '';

/* ═══════════════════════════════════════════════════════════
   الدخول
   ═══════════════════════════════════════════════════════════ */

function checkAdminAuth(){
  const s = sessionStorage.getItem('collect_session');
  if(!s) return false;
  try{
    const sess = JSON.parse(s);
    return sess.role === 'admin';
  }catch(e){ return false; }
}

function doAdminLogin(){
  const pw = $('adminPw').value;
  const err = $('adminLoginErr');
  err.classList.add('hidden');

  if(pw === ADMIN_RESET_PASSWORD){
    ADMIN_PW = ADMIN_DEFAULT_PASSWORD;
    saveAdminPw();
    err.textContent = 'تم إعادة تعيين كلمة المرور للأدمن';
    err.classList.remove('hidden');
    $('adminPw').value = '';
    return;
  }

  if(pw !== ADMIN_PW){
    err.textContent = 'كلمة المرور غير صحيحة';
    err.classList.remove('hidden');
    return;
  }

  sessionStorage.setItem('collect_session', JSON.stringify({
    name: 'الأدمن',
    role: 'admin'
  }));

  showAdminPanel();
}

function showAdminPanel(){
  $('adminLoginView').classList.add('hidden');
  $('adminView').classList.remove('hidden');
  window.scrollTo(0,0);

  renderAdminUsers();
  renderScopeMembersList();
  renderScopesList();
  renderDynButtons();
  renderDynButtonsBar();
}

function doAdminLogout(){
  if(!confirm('تسجيل الخروج؟')) return;
  sessionStorage.removeItem('collect_session');
  location.href = '/index.html';
}

/* ═══════════════════════════════════════════════════════════
   إدارة الأعضاء
   ═══════════════════════════════════════════════════════════ */

function renderAdminUsers(){
  sortUsers();
  const box = $('usersListBox');
  if(!USERS.length){
    box.innerHTML = '<div class="empty">لا يوجد أعضاء بعد</div>';
  } else {
    box.innerHTML = USERS.map(u => `
      <div class="userRow">
        <div>
          <div class="name">${esc(u.name)}</div>
          <div class="pass">${esc(u.password)}</div>
        </div>
        <button class="iconBtn edit" data-edit="${esc(u.name)}" title="تعديل">✏️</button>
        <button class="iconBtn del" data-del="${esc(u.name)}" title="حذف">🗑️</button>
      </div>
    `).join('');
  }
  $('usersCount').textContent = USERS.length + ' عضو';
}

function handleUsersListClick(e){
  const ed = e.target.closest('[data-edit]');
  if(ed){
    const name = ed.dataset.edit;
    const u = USERS.find(x => x.name === name);
    if(!u) return;
    $('editName').value = u.name;
    $('editPass').value = u.password;
    $('editModal').classList.remove('hidden');
    return;
  }

  const dl = e.target.closest('[data-del]');
  if(dl){
    const name = dl.dataset.del;
    if(!confirm(`حذف العضو "${name}"؟\nملاحظة: سيتم حذف نطاقاته أيضاً.`)) return;

    USERS = USERS.filter(x => x.name !== name);
    saveUsers();

    const all = loadScopes();
    delete all[name];
    saveScopes(all);

    renderAdminUsers();
    renderScopeMembersList();
    renderScopesList();
  }
}

function confirmEditPass(){
  const name = $('editName').value;
  const pass = $('editPass').value.trim();
  if(!pass){
    alert('كلمة المرور لا يمكن أن تكون فارغة');
    return;
  }
  const u = USERS.find(x => x.name === name);
  if(!u) return;
  u.password = pass;
  saveUsers();
  $('editModal').classList.add('hidden');
  renderAdminUsers();
  alert('✅ تم تحديث كلمة المرور');
}

function showAddForm(){
  $('addForm').classList.toggle('hidden');
  $('newName').focus();
}

function cancelAddForm(){
  $('addForm').classList.add('hidden');
  $('newName').value = '';
  $('newPass').value = '';
  $('newPass2').value = '';
}

function confirmAddMember(){
  const name = $('newName').value.trim();
  const pass = $('newPass').value.trim();
  const pass2 = $('newPass2').value.trim();

  if(!name){ alert('أدخل اسم العضو'); return; }
  if(!pass){ alert('أدخل كلمة المرور'); return; }
  if(pass !== pass2){ alert('كلمتا المرور غير متطابقتين'); return; }
  if(USERS.some(u => u.name === name)){
    alert('اسم العضو موجود مسبقاً');
    return;
  }

  USERS.push({ name, password: pass, role: 'member' });
  saveUsers();

  $('newName').value = '';
  $('newPass').value = '';
  $('newPass2').value = '';
  $('addForm').classList.add('hidden');

  renderAdminUsers();
  renderScopeMembersList();
  alert('✅ تم إضافة العضو: ' + name);
}

/* ═══════════════════════════════════════════════════════════
   النطاقات
   ═══════════════════════════════════════════════════════════ */

const SCOPES_KEY = 'collect_scopes';

function loadScopes(){
  return ls(SCOPES_KEY, {});
}
function saveScopes(scopes){
  lsSet(SCOPES_KEY, scopes);
}
function getMemberScopes(memberName){
  const all = loadScopes();
  return all[memberName] || [];
}
function setMemberScopes(memberName, scopes){
  const all = loadScopes();
  all[memberName] = scopes;
  saveScopes(all);
}

function renderScopeMembersList(){
  sortUsers();
  const sel = $('scopeMemberSel');
  if(!sel) return;
  sel.innerHTML = '<option value="">اختر عضو...</option>' +
    USERS.map(u => `<option value="${esc(u.name)}">${esc(u.name)}</option>`).join('');
}

function onScopeMemberChange(){
  renderScopesList();
}

function renderScopesList(){
  const member = $('scopeMemberSel')?.value;
  const box = $('scopesListBox');
  if(!box) return;

  if(!member){
    box.innerHTML = '<div class="empty">اختر عضواً لعرض نطاقاته</div>';
    return;
  }

  const scopes = getMemberScopes(member);
  if(!scopes.length){
    box.innerHTML = '<div class="empty">لا توجد نطاقات لهذا العضو</div>';
    return;
  }

  box.innerHTML = scopes.map((sc,i) => `
    <div class="scopeItem">
      <div class="scopeInfo">
        <div class="fromTo">
          <span class="tag">من: قطاع ${p2(sc.from.s)} - بلوك ${p2(sc.from.b)} - عمارة ${p2(sc.from.m)} - شقة ${p2(sc.from.a)}</span>
        </div>
        <div class="fromTo">
          <span class="tag">إلى: قطاع ${p2(sc.to.s)} - بلوك ${p2(sc.to.b)} - عمارة ${p2(sc.to.m)} - شقة ${p2(sc.to.a)}</span>
        </div>
      </div>
      <button class="iconBtn del" data-del-scope="${i}" title="حذف">🗑️</button>
    </div>
  `).join('');

  box.querySelectorAll('[data-del-scope]').forEach(btn => {
    btn.onclick = () => {
      const i = +btn.dataset.delScope;
      if(!confirm('حذف هذا النطاق؟')) return;
      const arr = getMemberScopes(member);
      arr.splice(i,1);
      setMemberScopes(member, arr);
      renderScopesList();
    };
  });
}

function addScope(){
  const member = $('scopeMemberSel')?.value;
  if(!member){ alert('اختر العضو أولاً'); return; }

  const fromSec = +$('fromSec').value;
  const fromBlk = +$('fromBlk').value;
  const fromBld = +$('fromBld').value;
  const fromApt = +$('fromApt').value;
  const toSec   = +$('toSec').value;
  const toBlk   = +$('toBlk').value;
  const toBld   = +$('toBld').value;
  const toApt   = +$('toApt').value;

  if(!fromSec || !fromBlk || !fromBld || !fromApt){
    alert('أدخل بيانات "من" كاملة');
    return;
  }
  if(!toSec || !toBlk || !toBld || !toApt){
    alert('أدخل بيانات "إلى" كاملة');
    return;
  }

  const arr = getMemberScopes(member);
  arr.push({
    from: { s:fromSec, b:fromBlk, m:fromBld, a:fromApt },
    to:   { s:toSec,   b:toBlk,   m:toBld,   a:toApt }
  });
  setMemberScopes(member, arr);

  ['fromSec','fromBlk','fromBld','fromApt',
   'toSec','toBlk','toBld','toApt'].forEach(id => {
    const el = $(id);
    if(el) el.value = '';
  });

  renderScopesList();
  alert('✅ تم إضافة النطاق');
}

/* ═══════════════════════════════════════════════════════════
   الأزرار الديناميكية
   ═══════════════════════════════════════════════════════════ */

const DYN_BTNS_KEY = 'collect_dyn_buttons';

function loadDynButtons(){
  return ls(DYN_BTNS_KEY, []);
}
function saveDynButtons(btns){
  lsSet(DYN_BTNS_KEY, btns);
}

function renderDynButtons(){
  const box = $('dynBtnsListBox');
  if(!box) return;

  const btns = loadDynButtons();
  if(!btns.length){
    box.innerHTML = '<div class="empty">لا توجد أزرار بعد</div>';
    return;
  }

  box.innerHTML = btns.map((b,i) => `
    <div class="dynBtnItem">
      <div class="info">
        <div class="name">${esc(b.name)}</div>
        <div class="file">${esc(b.file)}</div>
      </div>
      <button class="iconBtn del" data-del-dyn="${i}" title="حذف">🗑️</button>
    </div>
  `).join('');

  box.querySelectorAll('[data-del-dyn]').forEach(btn => {
    btn.onclick = () => {
      const i = +btn.dataset.delDyn;
      if(!confirm('حذف هذا الزر؟')) return;
      const arr = loadDynButtons();
      arr.splice(i,1);
      saveDynButtons(arr);
      renderDynButtons();
      renderDynButtonsBar();
    };
  });
}

function showDynBtnForm(){
  $('dynBtnForm').classList.toggle('hidden');
  $('dynBtnName').focus();
}

function cancelDynBtnForm(){
  $('dynBtnForm').classList.add('hidden');
  $('dynBtnName').value = '';
  $('dynBtnFile').value = '';
}

function confirmAddDynBtn(){
  let name = $('dynBtnName').value.trim();
  let file = $('dynBtnFile').value.trim();

  if(!name){ alert('أدخل اسم الزر'); return; }
  if(!file){ alert('أدخل اسم الملف'); return; }
  if(!file.endsWith('.html')) file = file + '.html';

  const arr = loadDynButtons();
  arr.push({ name, file });
  saveDynButtons(arr);

  $('dynBtnName').value = '';
  $('dynBtnFile').value = '';
  $('dynBtnForm').classList.add('hidden');

  renderDynButtons();
  renderDynButtonsBar();
  alert('✅ تم إضافة الزر');
}

function renderDynButtonsBar(){
  const bar = $('dynamicBtnsBar');
  if(!bar) return;

  const btns = loadDynButtons();
  if(!btns.length){
    bar.innerHTML = '';
    bar.classList.add('hidden');
    return;
  }

  bar.classList.remove('hidden');
  bar.innerHTML = btns.map((b,i) => `
    <button class="dynBtn" data-dyn="${i}">${esc(b.name)}</button>
  `).join('');

  bar.onclick = e => {
    const b = e.target.closest('.dynBtn');
    if(!b) return;
    const i = +b.dataset.dyn;
    const btn = btns[i];
    if(btn) openIframePage(btn.file, btn.name);
  };
}

function openIframePage(file, title){
  const view = $('dynIframeView');
  const frame = $('dynIframe');
  const ttl = $('dynIframeTitle');
  if(!view || !frame) return;

  ttl.textContent = title || 'صفحة';
  frame.src = '/' + file + '?t=' + Date.now();
  view.classList.remove('hidden');
}

function closeIframePage(){
  $('dynIframeView').classList.add('hidden');
  $('dynIframe').src = '';
}

/* ═══════════════════════════════════════════════════════════
   معالجة الملفات
   ═══════════════════════════════════════════════════════════ */

async function processFiles(){
  const files = [...$('fileInput').files];
  if(!files.length){
    alert('اختر ملفاً واحداً على الأقل');
    return;
  }

  const prog = $('progBox');
  const bar = $('progBar');
  const st = $('filesStatus');
  prog.classList.remove('hidden');
  st.classList.remove('hidden');
  st.textContent = '⏳ جاري المعالجة...';
  $('logBox').textContent = '';

  let allRows = [];
  let issueMonth = '';
  const names = [];

  for(let i=0;i<files.length;i++){
    const file = files[i];
    try{
      log(`📄 قراءة: ${file.name}`);
      const res = await readFile(file);
      log(`   → ${res.rows.length} صف`);
      allRows = allRows.concat(res.rows);
      if(!issueMonth && res.issueMonth) issueMonth = res.issueMonth;
      names.push(file.name);
    }catch(err){
      log(`❌ خطأ في ${file.name}: ${err.message}`);
    }
    bar.style.width = Math.round(((i+1)/files.length) * 100) + '%';
  }

  if(!allRows.length){
    st.textContent = '❌ لا توجد بيانات صالحة';
    prog.classList.add('hidden');
    return;
  }

  const map = new Map();
  allRows.forEach(d => map.set(key(d[0],d[1],d[2],d[3]), d));
  const rows = [...map.values()];

  currentData = rows;
  currentIssueMonth = issueMonth;
  currentSource = names.join(', ');

  st.textContent = `✅ تم قراءة ${rows.length} عميل من ${files.length} ملف`;
  prog.classList.add('hidden');

  showResults();
}

function showResults(){
  $('resultsBox').classList.remove('hidden');

  const totalVal = currentData.reduce((a,d) => a+d[6], 0);
  const totalCnt = currentData.reduce((a,d) => a+d[5], 0);
  const uniqNames = new Set(currentData.map(d => d[4])).size;
  const uniqSecs = new Set(currentData.map(d => d[0])).size;
  const uniqBlks = new Set(currentData.map(d => d[0]+'-'+d[1])).size;

  $('statsBox').innerHTML = `
    <div><div class="t">عدد الصفوف</div><div class="n">${currentData.length}</div></div>
    <div><div class="t">عدد الفواتير</div><div class="n">${f(totalCnt)}</div></div>
    <div><div class="t">إجمالي القيمة</div><div class="n">${f(totalVal)}</div></div>
    <div><div class="t">عدد العملاء</div><div class="n">${f(uniqNames)}</div></div>
    <div><div class="t">عدد القطاعات</div><div class="n">${uniqSecs}</div></div>
    <div><div class="t">عدد البلوكات</div><div class="n">${uniqBlks}</div></div>
    <div><div class="t">شهر الإصدار</div><div class="n">${currentIssueMonth || '—'}</div></div>
  `;

  const tb = $('previewTable').querySelector('tbody');
  tb.innerHTML = currentData.slice(0,20).map((d,i) => `
    <tr>
      <td>${i+1}</td>
      <td>${p2(d[0])}</td>
      <td>${p2(d[1])}</td>
      <td>${p2(d[2])}</td>
      <td>${p2(d[3])}</td>
      <td>${esc(d[4])}</td>
      <td>${d[5]}</td>
      <td>${d[6]}</td>
    </tr>
  `).join('');

  if(currentData.length > 20){
    tb.innerHTML += `
      <tr><td colspan="8" style="text-align:center;color:var(--mu);padding:10px">
        ... و ${currentData.length - 20} صف إضافي
      </td></tr>
    `;
  }
}

/* ═══════════════════════════════════════════════════════════
   السجل
   ═══════════════════════════════════════════════════════════ */

function log(msg){
  const el = $('logBox');
  if(!el) return;
  const t = new Date().toLocaleTimeString('en-GB');
  el.textContent += `[${t}] ${msg}\n`;
  el.scrollTop = el.scrollHeight;
}

/* ═══════════════════════════════════════════════════════════
   التصدير
   ═══════════════════════════════════════════════════════════ */

function exportAll(){
  if(!currentData){ alert('لا توجد بيانات للتصدير'); return; }

  const output = {
    generated: new Date().toISOString(),
    issueMonth: currentIssueMonth,
    source: currentSource,
    count: currentData.length,
    totalValue: currentData.reduce((a,d) => a+d[6], 0),
    totalCount: currentData.reduce((a,d) => a+d[5], 0),
    data: currentData
  };

  downloadJson(output, 'data.json');

  const st = $('exportStatus');
  st.classList.remove('hidden');
  st.textContent = '✅ تم تنزيل data.json — ارفعه إلى GitHub';
  log('⬇️ تنزيل data.json');
}

async function exportEncryptedForMembers(){
  if(!currentData){ alert('لا توجد بيانات للتصدير'); return; }

  const st = $('exportStatus');
  st.classList.remove('hidden');
  st.textContent = '⏳ جاري إنشاء الملفات...';

  const users = USERS.slice();
  if(!users.length){ alert('لا يوجد أعضاء'); return; }

  let count = 0;
  for(const u of users){
    try{
      const scopes = getMemberScopes(u.name);

      const payload = {
        owner: u.name,
        role: 'member',
        type: 'data',
        month: currentIssueMonth || monthKey(),
        generated: new Date().toISOString(),
        count: currentData.length,
        scope: scopes,
        data: currentData
      };

      const encObj = encryptData(payload, u.password);

      await new Promise(r => setTimeout(r, 300));
      downloadJson(encObj, `data-${u.name}.enc.json`);
      count++;
      log(`✅ ${u.name}`);
    }catch(err){
      log(`❌ فشل ${u.name}: ${err.message}`);
    }
  }

  st.textContent = `✅ تم إنشاء ${count} ملف مشفَّر`;

  setTimeout(() => {
    const index = {
      generated: new Date().toISOString(),
      month: currentIssueMonth || monthKey(),
      count: currentData.length,
      members: users.map(u => ({
        name: u.name,
        file: `data-${u.name}.enc.json`,
        scopes: getMemberScopes(u.name).length
      }))
    };
    downloadJson(index, 'members-index.json');
  }, users.length * 400 + 500);
}

/* ═══════════════════════════════════════════════════════════
   فك تشفير الأرشيف
   ═══════════════════════════════════════════════════════════ */

async function decryptArchive(){
  const file = $('archiveFile').files[0];
  if(!file){ alert('اختر ملف الأرشيف'); return; }

  const st = $('archiveStatus');
  const res = $('archiveResult');
  st.classList.remove('hidden');
  st.textContent = '⏳ جاري فك التشفير...';
  res.innerHTML = '';

  try{
    const text = await file.text();
    const encObj = JSON.parse(text);

    const dec = decryptData(encObj, ADMIN_PW);
    if(!dec) throw new Error('فشل فك التشفير');

    st.textContent = '✅ تم فك التشفير بنجاح';

    let html = `<div class="archivePreview">
      <div class="memberTag">📄 ملف: ${esc(dec.member || 'غير معروف')}</div>`;

    if(dec.snapshot){
      const snap = dec.snapshot;
      const totalPaid = sumP(snap.paid || []);
      const totalData = snap.data ? snap.data.length : 0;

      html += `
        <div class="row"><span>الشهر:</span><b>${esc(snap.monthKey || '—')}</b></div>
        <div class="row"><span>تاريخ الأرشفة:</span><b>${new Date(dec.createdAt || Date.now()).toLocaleString('ar-EG')}</b></div>
        <hr style="border:none;border-top:1px dashed var(--bd);margin:8px 0">
        <div class="row"><span>عدد العملاء:</span><b>${f(totalData)}</b></div>
        <div class="row"><span>عدد عمليات السداد:</span><b>${f((snap.paid||[]).length)}</b></div>
        <div class="row"><span>إجمالي المسدَّد:</span><b>${f(totalPaid)} جنيه</b></div>
      `;

      if(snap.data && snap.data.length){
        const secTot = {};
        snap.data.forEach(d => {
          if(!secTot[d[0]]) secTot[d[0]] = { tot:0, col:0 };
          secTot[d[0]].tot += d[6];
        });
        (snap.paid || []).forEach(p => {
          if(!secTot[p.s]) secTot[p.s] = { tot:0, col:0 };
          secTot[p.s].col += p.v;
        });

        html += `<div style="margin-top:12px;font-weight:800;color:var(--pr);text-align:center">
          📊 ملخص حسب القطاع
        </div>
        <table style="margin-top:8px">
          <thead><tr>
            <th>قطاع</th><th>إجمالي المديونية</th><th>المُحصَّل</th>
            <th>المتبقي</th><th>النسبة</th>
          </tr></thead>
          <tbody>
            ${Object.keys(secTot).sort((a,b) => a-b).map(s => {
              const t = secTot[s].tot;
              const c = secTot[s].col;
              const rem = t - c;
              const pct = t > 0 ? ((c/t)*100).toFixed(1) : '0.0';
              return `<tr>
                <td>قطاع ${p2(s)}</td>
                <td style="direction:ltr">${f(t)}</td>
                <td style="direction:ltr">${f(c)}</td>
                <td style="direction:ltr">${f(rem)}</td>
                <td style="direction:ltr">${pct}%</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`;
      }
    }

    html += `</div>`;
    res.innerHTML = html;

    const dlBtn = document.createElement('button');
    dlBtn.className = 'big ok';
    dlBtn.textContent = '⬇️ تنزيل البيانات المفكوكة (JSON)';
    dlBtn.style.marginTop = '12px';
    dlBtn.onclick = () => downloadJson(dec, `decrypted-${dec.member||'archive'}.json`);
    res.appendChild(dlBtn);

  }catch(err){
    st.textContent = '❌ ' + err.message;
  }
}

/* ═══════════════════════════════════════════════════════════
   تصفير كامل
   ═══════════════════════════════════════════════════════════ */

function resetAll(){
  if(!confirm('⚠️ سيتم حذف كل شيء: الأعضاء، النطاقات، الأزرار. متابعة؟')) return;
  if(!confirm('تأكيد أخير: حذف نهائي؟')) return;

  USERS = DEFAULT_USERS.slice();
  saveUsers();
  ADMIN_PW = ADMIN_DEFAULT_PASSWORD;
  saveAdminPw();

  lsRemove('collect_scopes');
  lsRemove('collect_dyn_buttons');
  lsRemove('collect_v1');
  lsRemove('collect_arcidx');
  lsRemove('collect_issues');
  lsRemove('collect_month');
  lsRemove('collect_note');

  renderAdminUsers();
  renderScopeMembersList();
  renderScopesList();
  renderDynButtons();
  renderDynButtonsBar();

  alert('✅ تم التصفير بنجاح');
}

/* ═══════════════════════════════════════════════════════════
   ربط الأحداث عند التحميل
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // إدارة الأعضاء
  if($('usersListBox')) $('usersListBox').onclick = handleUsersListClick;
  if($('editCancelBtn')) $('editCancelBtn').onclick = () => $('editModal').classList.add('hidden');
  if($('editConfirmBtn')) $('editConfirmBtn').onclick = confirmEditPass;
  if($('showAddFormBtn')) $('showAddFormBtn').onclick = showAddForm;
  if($('cancelAddBtn')) $('cancelAddBtn').onclick = cancelAddForm;
  if($('confirmAddBtn')) $('confirmAddBtn').onclick = confirmAddMember;

  // النطاقات
  if($('scopeMemberSel')) $('scopeMemberSel').onchange = onScopeMemberChange;
  if($('addScopeBtn')) $('addScopeBtn').onclick = addScope;

  // الأزرار الديناميكية
  if($('showDynBtnForm')) $('showDynBtnForm').onclick = showDynBtnForm;
  if($('cancelDynBtn')) $('cancelDynBtn').onclick = cancelDynBtnForm;
  if($('confirmDynBtn')) $('confirmDynBtn').onclick = confirmAddDynBtn;
  if($('dynIframeClose')) $('dynIframeClose').onclick = closeIframePage;

  // رفع الملفات
  if($('processFilesBtn')) $('processFilesBtn').onclick = processFiles;

  // التصدير
  if($('exportAllBtn')) $('exportAllBtn').onclick = exportAll;
  if($('exportEncBtn')) $('exportEncBtn').onclick = exportEncryptedForMembers;

  // فك تشفير الأرشيف
  if($('decArchiveBtn')) $('decArchiveBtn').onclick = decryptArchive;

  // تصفير
  if($('resetAllBtn')) $('resetAllBtn').onclick = resetAll;

  // دخول الأدمن
  if(checkAdminAuth()){
    showAdminPanel();
  } else {
    if($('adminLoginBtn')) $('adminLoginBtn').onclick = doAdminLogin;
    if($('adminPw')){
      $('adminPw').addEventListener('keydown', e => {
        if(e.key === 'Enter') doAdminLogin();
      });
    }
    if($('adminLogoutBtn')) $('adminLogoutBtn').onclick = doAdminLogout;
  }
});

console.log('✅ admin.js تم تحميله بنجاح');