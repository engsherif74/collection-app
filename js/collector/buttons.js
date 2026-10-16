import {get, del} from '../core/db.js';
import {isOn, enable, disable, verify} from './lock.js';

const ok = f => /^https:\/\//.test(f) || /^[\w.-]+\.html?$/.test(f);
const url = f => /^https:/.test(f) ? f : 'pages/' + f;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// فتح صفحة في نافذة منبثقة
export function openPage(file, params) {
  const u = url(file) + (params ? '?' + params : '');
  const d = document.createElement('dialog');
  d.className = 'viewer';
  d.innerHTML = `
    <iframe src="${esc(u)}"></iframe>
    <div class="actions">
      <a class="btn ghost sm" href="${esc(u)}" target="_blank" rel="noopener">فتح في نافذة جديدة</a>
      <button class="btn sm" id="cl">إغلاق</button>
    </div>`;
  d.querySelector('#cl').onclick = () => { d.close(); d.remove(); };
  document.body.append(d);
  d.showModal();
}

// رسم القائمة
export async function renderMenu() {
  const f = await get('meta', 'file');
  const m = document.getElementById('menu');
  const on = await isOn();
  
  // الواجهات الإضافية من الأدمن
  const buttons = (f?.buttons || [])
    .filter(x => ok(x.file))
    .sort((p, q) => (p.order || 0) - (q.order || 0));
  
  // الإصدار
  const cycle = f?.cycle || '—';
  
  // بناء HTML
  let html = '';
  
  // قسم التطبيق
  html += `<div class="menu-section">التطبيق</div>`;
  html += `<button data-action="lock">
    <span class="ico-emoji">${on ? '🔓' : '🔒'}</span>
    <span class="label">${on ? 'إلغاء قفل التطبيق' : 'قفل التطبيق'}</span>
  </button>`;
  html += `<button data-action="logout">
    <span class="ico-emoji">🚪</span>
    <span class="label">تسجيل الخروج</span>
  </button>`;
  
  // فاصل
  html += `<div class="menu-divider"></div>`;
  
  // قسم الواجهات الإضافية
  html += `<div class="menu-section">الواجهات الإضافية</div>`;
  if (buttons.length) {
    html += buttons.map(x => `
      <button data-file="${esc(x.file)}">
        <span class="ico-emoji">📄</span>
        <span class="label">${esc(x.name)}</span>
      </button>
    `).join('');
  } else {
    html += `<div class="empty">لا توجد واجهات مضافة حالياً</div>`;
  }
  
  // تذييل
  html += `<div class="menu-footer">الإصدار ${esc(cycle)}</div>`;
  
  m.innerHTML = html;
  
  // ============================================================
  // ربط الأحداث
  // ============================================================
  
  // زر القفل
  m.querySelector('[data-action="lock"]').onclick = async () => {
    m.hidden = true;
    try {
      if (on) {
        await verify();
        await disable();
        alert('أُلغي قفل التطبيق.');
      } else {
        await enable();
        alert('تم تفعيل القفل. سيطلب التطبيق بصمتك أو النقش أو كلمة مرور الجهاز عند كل فتح.');
      }
    } catch (e) {
      alert(e.message || 'تعذر تنفيذ العملية');
    }
    renderMenu();
  };
  
  // زر تسجيل الخروج
  m.querySelector('[data-action="logout"]').onclick = async () => {
    m.hidden = true;
    if (!confirm('تسجيل الخروج؟ سيُطلب منك البصمة أو قفل الجهاز عند العودة.')) return;
    
    // تفعيل القفل تلقائياً إذا لم يكن مفعّلاً
    if (!on) {
      try {
        await enable();
      } catch (e) {
        alert('تعذر تفعيل القفل: ' + e.message + '\n\nيمكنك الدخول بكلمة السر من جديد.');
      }
    }
    
    // مسح auth (مع الإبقاء على البيانات)
    await del('meta', 'auth');
    
    // إعادة تحميل
    location.reload();
  };
  
  // أزرار الواجهات
  m.querySelectorAll('[data-file]').forEach(btn => {
    btn.onclick = () => {
      m.hidden = true;
      openPage(btn.dataset.file);
    };
  });
}