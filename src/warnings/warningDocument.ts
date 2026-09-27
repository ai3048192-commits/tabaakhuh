import {
  COMPANY,
  CONSEQUENCES,
  GENERAL_POLICIES,
  LEVEL_CLOSING,
  LEVEL_LABELS,
  ROLE_POLICIES,
  ROLE_TITLES,
  type WarnableRole,
  type WarningLevel,
} from './policies'

export interface WarningInput {
  recipient: {
    id: number
    first_name: string
    last_name: string
    phone: string
    email: string
    role: WarnableRole
  }
  level: WarningLevel
  violation: string
  /** Free-text specifics; optional unless the violation is "other". */
  details: string
  issuedAt: Date
  /** The signed-in admin issuing it. */
  issuerName: string
  /** Absolute URL: the letter is written into a blank window with no base URL of its own. */
  logoUrl: string
}

export interface WarningDocument {
  /** Doubles as the file name the browser proposes on "Save as PDF". */
  title: string
  reference: string
  html: string
}

const CAIRO = 'Africa/Cairo'

/**
 * Names, phone numbers and free text all reach this letter from the API or the
 * form, and the letter is written into a same-origin window. Escape everything.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function cairoParts(d: Date): { ymd: string; hm: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return { ymd: `${get('year')}-${get('month')}-${get('day')}`, hm: `${get('hour')}${get('minute')}` }
}

function arabicDate(d: Date): string {
  return new Intl.DateTimeFormat('ar-EG', { timeZone: CAIRO, dateStyle: 'long' }).format(d)
}

/** Characters that no OS accepts in a file name. */
function fileSafe(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function fullName(r: { first_name: string; last_name: string }): string {
  return `${r.first_name} ${r.last_name}`.trim()
}

export function buildWarningDocument(input: WarningInput): WarningDocument {
  const { recipient: r, level } = input
  const name = fullName(r) || `#${r.id}`
  const { ymd, hm } = cairoParts(input.issuedAt)
  const reference = `TBK-W-${r.id}-${ymd.replace(/-/g, '')}-${hm}`
  const levelLabel = LEVEL_LABELS[level]
  const title = fileSafe(`${levelLabel} - ${name} - ${ymd}`)

  const e = escapeHtml
  const list = (items: string[]) => items.map((t) => `<li>${e(t)}</li>`).join('')
  const details = input.details.trim()

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${e(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" />
<style>
  @page { size: A4; margin: 14mm 16mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
    color: #1f1a17; background: #efe9dd; font-size: 13.5px; line-height: 1.75;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .toolbar {
    position: sticky; top: 0; z-index: 1; display: flex; gap: 12px; align-items: center;
    justify-content: center; padding: 12px; background: #7a0d0d; color: #fff; font-weight: 700;
  }
  .toolbar button {
    font: inherit; font-weight: 900; cursor: pointer; border: 0; border-radius: 10px;
    padding: 8px 18px; background: #fff; color: #7a0d0d;
  }
  .sheet { width: 210mm; min-height: 297mm; margin: 16px auto; padding: 14mm 16mm; background: #fff;
    box-shadow: 0 10px 30px rgba(0,0,0,.12); }
  header { display: flex; align-items: center; justify-content: space-between; gap: 16px;
    border-bottom: 3px solid #7a0d0d; padding-bottom: 10px; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand img { width: 46px; height: 46px; object-fit: contain; }
  .brand b { display: block; font-size: 22px; font-weight: 900; color: #7a0d0d; line-height: 1.2; }
  .brand span { font-size: 11px; color: #6b625a; }
  .meta { text-align: left; font-size: 11.5px; color: #4a423c; }
  .meta div { direction: rtl; }
  .ref { direction: ltr; unicode-bidi: embed; font-weight: 700; }
  h1 { margin: 18px 0 4px; text-align: center; font-size: 24px; font-weight: 900; color: #7a0d0d; }
  .level { display: block; margin: 0 auto 14px; width: fit-content; padding: 3px 16px; border-radius: 999px;
    border: 1.5px solid #7a0d0d; color: #7a0d0d; font-weight: 900; font-size: 13px; }
  .level.final { background: #7a0d0d; color: #fff; }
  table.to { width: 100%; border-collapse: collapse; margin: 8px 0 14px; font-size: 12.5px; }
  table.to th, table.to td { border: 1px solid #e3d9c6; padding: 5px 9px; text-align: right; }
  table.to th { background: #faf5ea; width: 22%; font-weight: 800; color: #5a4f45; }
  .ltr { direction: ltr; unicode-bidi: embed; }
  p { margin: 0 0 8px; }
  .violation { border-right: 4px solid #b3261e; background: #fdf3f2; padding: 8px 12px; margin: 8px 0 12px; }
  .violation b { color: #b3261e; }
  h2 { font-size: 14.5px; font-weight: 900; color: #7a0d0d; margin: 14px 0 4px; }
  ol { margin: 0; padding-right: 20px; }
  ol li { margin-bottom: 2px; }
  section { break-inside: avoid; }
  .ack { margin-top: 16px; border: 1px dashed #b9ab93; border-radius: 10px; padding: 10px 14px; }
  .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 12px; }
  .sign div { font-size: 12.5px; }
  .line { display: block; border-bottom: 1px solid #6b625a; height: 22px; margin-bottom: 4px; }
  footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #e3d9c6; text-align: center;
    font-size: 10.5px; color: #6b625a; }
  @media print {
    body { background: #fff; }
    .toolbar { display: none; }
    .sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
  }
</style>
</head>
<body>
<div class="toolbar">
  <span>لحفظ الإنذار كملف PDF اختر «حفظ بتنسيق PDF» من نافذة الطباعة</span>
  <button type="button" id="print-warning">طباعة / حفظ PDF</button>
</div>
<main class="sheet">
  <header>
    <div class="brand">
      <img src="${e(input.logoUrl)}" alt="" />
      <div><b>${e(COMPANY.name)}</b><span>${e(COMPANY.tagline)}</span></div>
    </div>
    <div class="meta">
      <div>رقم المرجع: <span class="ref">${e(reference)}</span></div>
      <div>التاريخ: ${e(arabicDate(input.issuedAt))}</div>
    </div>
  </header>

  <h1>إنذار رسمي</h1>
  <span class="level${level === 'final' ? ' final' : ''}">${e(levelLabel)}</span>

  <table class="to">
    <tr><th>إلى السيد/ة</th><td><b>${e(name)}</b></td></tr>
    <tr><th>الصفة</th><td>${e(ROLE_TITLES[r.role])}</td></tr>
    <tr><th>رقم الحساب</th><td class="ltr">#${e(String(r.id))}</td></tr>
    <tr><th>التليفون</th><td class="ltr">${e(r.phone || '—')}</td></tr>
    <tr><th>البريد الإلكتروني</th><td class="ltr">${e(r.email || '—')}</td></tr>
  </table>

  <p>تحية طيبة وبعد،</p>
  <p>نحيط سيادتكم علمًا بأن إدارة منصة ${e(COMPANY.name)} قد رصدت مخالفة منسوبة إلى حسابكم على المنصة، وبيانها كالتالي:</p>
  <div class="violation">
    <div><b>نوع المخالفة:</b> ${e(input.violation)}</div>
    ${details ? `<div><b>التفاصيل:</b> ${e(details)}</div>` : ''}
  </div>
  <p>ويُعد ذلك إخلالًا بسياسات المنصة وشروط التعاقد المُلزمة لجميع الشركاء. وعليه، نوجّه إليكم هذا <b>${e(levelLabel)}</b>، ونطالبكم بتصحيح الوضع فورًا والالتزام التام بالسياسات الموضحة أدناه.</p>
  <p>${e(LEVEL_CLOSING[level])}</p>

  <section>
    <h2>أولًا: السياسات العامة للمنصة</h2>
    <ol>${list(GENERAL_POLICIES)}</ol>
  </section>
  <section>
    <h2>ثانيًا: سياسات خاصة ${r.role === 'cook' ? 'بالطباخات' : 'بالسائقين'}</h2>
    <ol>${list(ROLE_POLICIES[r.role])}</ol>
  </section>
  <section>
    <h2>ثالثًا: الإجراءات المترتبة على تكرار المخالفة</h2>
    <ol>${list(CONSEQUENCES)}</ol>
  </section>

  <section class="ack">
    <p><b>إقرار بالاستلام:</b> أقر أنا الموقع أدناه باستلامي هذا الإنذار واطلاعي على ما ورد فيه وعلى سياسات المنصة، وأتعهد بالالتزام بها.</p>
    <div class="sign">
      <div>
        <b>الشريك: ${e(name)}</b>
        <div>التوقيع:</div><span class="line"></span>
        <div>التاريخ:</div><span class="line"></span>
      </div>
      <div>
        <b>عن إدارة ${e(COMPANY.name)}${input.issuerName ? `: ${e(input.issuerName)}` : ''}</b>
        <div>التوقيع:</div><span class="line"></span>
        <div>الختم:</div><span class="line"></span>
      </div>
    </div>
  </section>

  <footer>
    ${e(COMPANY.name)} — للتواصل: <span class="ltr">${e(COMPANY.phone)}</span> · <span class="ltr">${e(COMPANY.email)}</span><br />
    هذا المستند صادر من لوحة تحكم ${e(COMPANY.name)} ويُعد سجلًا رسميًا للإنذار.
  </footer>
</main>
</body>
</html>`

  return { title, reference, html }
}
