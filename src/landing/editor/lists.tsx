import type { LinkItem, StatItem, StepItem } from '../content'
import { IconPicker, ListEditor, Row, Text } from './fields'

/* ---------- shared list renderers ---------- */

export function StatsList({ title, items, onChange }: { title: string; items: StatItem[]; onChange: (v: StatItem[]) => void }) {
  return (
    <ListEditor<StatItem>
      title={title}
      items={items}
      onChange={onChange}
      addLabel="إضافة رقم"
      max={8}
      makeItem={() => ({ icon: 'star', value: '', label: '' })}
      itemTitle={(s) => [s.value, s.label].filter(Boolean).join(' — ')}
      renderItem={(s, up) => (
        <>
          <Row>
            <Text label="الرقم / القيمة" value={s.value} onChange={(v) => up({ value: v })} placeholder="+٥٠٠" />
            <Text label="الوصف" value={s.label} onChange={(v) => up({ label: v })} placeholder="طباخة موثّقة" />
          </Row>
          <IconPicker value={s.icon} onChange={(v) => up({ icon: v })} />
        </>
      )}
    />
  )
}

export function StepsList({ title, items, onChange }: { title: string; items: StepItem[]; onChange: (v: StepItem[]) => void }) {
  return (
    <ListEditor<StepItem>
      title={title}
      items={items}
      onChange={onChange}
      addLabel="إضافة خطوة"
      makeItem={() => ({ icon: 'sparkles', title: '', text: '' })}
      itemTitle={(s) => s.title}
      renderItem={(s, up) => (
        <>
          <Row>
            <Text label="العنوان" value={s.title} onChange={(v) => up({ title: v })} />
            <IconPicker value={s.icon} onChange={(v) => up({ icon: v })} />
          </Row>
          <Text label="الوصف" value={s.text} onChange={(v) => up({ text: v })} multiline rows={2} />
        </>
      )}
    />
  )
}

export function LinksList({ title, items, onChange }: { title: string; items: LinkItem[]; onChange: (v: LinkItem[]) => void }) {
  return (
    <ListEditor<LinkItem>
      title={title}
      items={items}
      onChange={onChange}
      addLabel="إضافة رابط"
      makeItem={() => ({ label: '', href: '' })}
      itemTitle={(l) => l.label}
      renderItem={(l, up) => (
        <Row>
          <Text label="النص" value={l.label} onChange={(v) => up({ label: v })} />
          <Text label="الرابط" value={l.href} onChange={(v) => up({ href: v })} ltr placeholder="#contact أو https://…" />
        </Row>
      )}
    />
  )
}

