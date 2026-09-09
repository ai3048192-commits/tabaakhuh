# متطلبات الباك اند — داشبورد الأدمن (العقد الكامل)

هذا هو العقد الدقيق الذي يتوقّعه الفرونت اند. تنفيذ القسم (أ) كما هو = الشاشات الـ8 المبنيّة تشتغل بالكامل.

- **Base URL:** `https://<host>/api/v1`
- **الغلاف الموحّد (كل الردود):**
  - نجاح: `{ "success": true, "data": <T>, "message": "OK", "errors": null }`
  - فشل: `{ "success": false, "data": null, "message": "<السبب>", "errors": { "<field>": ["<نص>"] } | null }`
- **الترويسات:** `Authorization: Bearer <token>` · `Accept: application/json` · `Content-Type: application/json` (فقط مع طلب له body)
- **الأكواد:** `200` · `201` (فقط `POST /admin/cities`) · `401` (`Unauthenticated.`) · `403` (مسجّل غير أدمن) · `404` · `422` (تحقّق/قاعدة عمل — `message` يحمل السبب) · `429` (throttle، login فقط) · `500` (`Something went wrong. Please try again.`)
- **الحماية:** كل `/admin/*` تحتاج `auth:sanctum` + `role:admin`. `/auth/me` و`/auth/logout` تحتاجان `auth:sanctum` فقط. `/auth/login` عام.
- الفرونت اند يقرأ فقط `data` / `success` / `message` / `errors` من الغلاف.

---

# ✅ حالة التنفيذ (2026-09-08)

**كل الـ endpoints المطلوبة اتنفّذت** (الأقسام أ + ب + ج + إصلاح D4 المنطقة الزمنية).
الفرونت اند اتحدّث ليطابق الأشكال النهائية:

- `GET /admin/delivery/drivers` بقى يرجّع `{ available_count, busy_count, items[] }` (مش مصفوفة) — اتظبط في `src/delivery/deliveryApi.ts` + `useDelivery` + بطاقتا الداشبورد.
- `GET /admin/delivery/active` بيحمل `commission` (= `delivery_fee`) و`total` و`assigned_at`/`picked_up_at` — الفرونت يعرضهم لو موجودين.
- `GET /admin/reports/orders-daily` و`GET /admin/cooks/recent` — مربوطين في `src/overview/homeApi.ts`.
- D4: فلتر `GET /admin/orders` بقى بتوقيت Africa/Cairo — مطابق لافتراض الفرونت، مفيش تغيير مطلوب.
- الـ 3 POST للإجراءات السريعة (`/admin/cooks`, `/admin/users`, `/admin/notifications`) — مربوطة، `422` للتكرار يتعرض على الحقول.

### الأشكال اللي الفرونت اند بيقرأها بالظبط (للتأكيد إن الـ Resources مطابقة)

**`GET /admin/delivery/active`** — مصفوفة، كل عنصر:
`order_id`, `order_number`, `status`, `cook_name`, `customer_area|null`, `driver_id|null`,
`driver_name|null`, `placed_at` (ISO)، واختياري: `total`, `commission`, `assigned_at`, `picked_up_at`.
لو الـ Resource بيسمّي المفتاح `id` بدل `order_id` → لازم تعديل سطر واحد في الفرونت — بلّغني.

**`GET /admin/delivery/drivers`** — `{ available_count:int, busy_count:int, items:[ { id, name, phone, is_available:bool, active_deliveries:int } ] }`.

**`GET /admin/reports/orders-daily`** — مصفوفة `[ { date:"YYYY-MM-DD", count:int } ]` (الأقدم أولًا، zero-filled).

**`GET /admin/cooks/recent`** — مصفوفة `[ { id, store_name, area|null, city_id|null, joined_at:ISO } ]`
(الأحدث أولًا). لو مفتاح التاريخ اسمه `approved_at` بدل `joined_at` → تعديل سطر واحد.

---

# القسم (أ) — 21 endpoint مطلوبة (موثّقة في `admin-dashboard-api.md`)

## Phase 1 — المصادقة

### 1. `POST /auth/login` — عام، throttled (`login` + `login-ip`)
**Request body:** `{ "identifier": string, "password": string }` — `identifier` إيميل أو تليفون؛ كلاهما مطلوب.
**200 `data`:**
```json
{ "user": { "id": 1, "first_name": "Site", "last_name": "Admin", "email": "admin@x.com",
  "phone": "+2010...", "role": "admin", "status": "active",
  "email_verified": true, "avatar_url": null },
  "token": "12|xxxxxxxx" }
```
- الفرونت اند يرفض الدخول ما لم يكن `data.user.role === "admin"`.
**أخطاء:** `422` حقول ناقصة · `401` أو `422` بيانات دخول غلط · `429` تجاوز المحاولات.

### 2. `GET /auth/me` — `auth:sanctum`
لا body / لا query. **200 `data`:** `{ "user": <AccountProfile كما في 1> }`

### 3. `POST /auth/logout` — `auth:sanctum`
**Request body (اختياري):** `{ "device_token": string }`
**200 `data`:** `null` · `message`: `"Logged out successfully."`
- الفرونت اند يتجاهل أي خطأ هنا (best-effort).

---

## Phase 2 — مراجعة الطهاة (`/admin`)

### 4. `GET /admin/cooks/pending`
لا query. **200 `data`:** مصفوفة من:
```json
{
  "cook_profile": {
    "id": 12, "store_name": "مطبخ أم أحمد", "bio": "...",
    "avatar_url": "https://…|null",
    "national_id_front_url": "https://…|null", "national_id_back_url": "https://…|null",
    "banner_url": "https://…|null",
    "city_id": 3, "area": "المعادي", "address_text": "شارع 9",
    "lat": 29.96, "lng": 31.25, "delivery_radius_km": 5,
    "is_open": false,
    "approval_status": "pending",         // pending | approved | rejected
    "rejection_reason": null,
    "rating_avg": 0, "rating_count": 0
  },
  "contract": {                            // أو null لو لم يوقّع
    "template_version": "v1",
    "signed_file_url": "https://…/contract-12.pdf",
    "signed_at": "2026-09-01T12:30:00+00:00"
  }
}
```

### 5. `POST /admin/cooks/{id}/approve`
`{id}` = `cook_profile.id`. لا body. **200 `data`:** الـ `cook_profile` بعد التحديث مع `approval_status: "approved"` · `message`: `"Application approved."`
**أخطاء:** `404` · `422` الطلب ليس `pending`.

### 6. `POST /admin/cooks/{id}/reject`
**Request body:** `{ "reason": string }` — required, min 1, max 1000.
**200 `data`:** `cook_profile` مع `approval_status: "rejected"` و`rejection_reason` مملوء · `message`: `"Application rejected."`
**أخطاء:** `422` `reason` مفقود · `404` · `422` ليس `pending`.

---

## Phase 3 — مراجعة السائقين (`/admin`)

### 7. `GET /admin/drivers/pending`
لا query. **200 `data`:** مصفوفة من:
```json
{
  "id": 7, "vehicle_type": "motorcycle", "vehicle_model": "Halawa",
  "vehicle_year": 2020, "vehicle_color": "أحمر",
  "vehicle_plate_no": "1234", "vehicle_plate_letters": "ن م ص",
  "national_id_front_url": "https://…|null", "national_id_back_url": "https://…|null",
  "license_url": "https://…|null",
  "city_id": 3,
  "birth_date": "1995-04-10",              // YYYY-MM-DD
  "is_available": false,
  "submitted_at": "2026-09-02T09:00:00+00:00",
  "approval_status": "pending",            // pending | approved | rejected
  "rejection_reason": null,
  "rating_avg": 0, "rating_count": 0
}
```

### 8. `POST /admin/drivers/{id}/approve`
لا body. **200 `data`:** عنصر السائق مع `approval_status: "approved"` · `message`: `"Application approved."` · **أخطاء:** `404` · `422` ليس `pending`.

### 9. `POST /admin/drivers/{id}/reject`
**Request body:** `{ "reason": string }` — required, min 1, max 1000.
**200 `data`:** عنصر السائق مع `approval_status: "rejected"` و`rejection_reason` مملوء · `message`: `"Application rejected."`

---

## Phase 4 — طلبات السحب (`/admin`) — الفرونت اند **جاهز ومربوط**

**دورة الحياة:** `pending → approved → paid` · `pending → rejected` · `rejected`/`paid` نهائيتان.

### 10. `GET /admin/withdrawals`
**Query:**
| param | القيمة | ملاحظات |
|---|---|---|
| `status` | `pending` \| `approved` \| `rejected` \| `paid` | اختياري؛ **يُحذف تمامًا** = الكل |
| `page` | int ≥ 1 | اختياري، افتراضي `1`، **يُرسَل دائمًا** |

**200 `data`:**
```json
{
  "items": [
    { "id": 45, "amount": 500.0, "payment_details": "InstaPay: 01000000000",
      "status": "pending",                 // pending | approved | rejected | paid
      "requested_at": "2026-09-03T08:00:00+00:00",
      "processed_at": null }                // ISO أو null طالما pending
  ],
  "page": 1, "per_page": 20, "total": 3
}
```
- `per_page` ثابت **20** ويُرجَع في الجسم.
- `items: []` لفلتر بلا نتائج **أو** لصفحة بعد الأخيرة؛ `page` المُرجَع = الصفحة المطلوبة.
- ترتيب `items` من الباك اند (الفرونت لا يُعيد الترتيب).
**أخطاء:** `422` قيمة `status` غير صالحة.

### 11. `POST /admin/withdrawals/{id}/approve` — **بلا body**
**200 `data`:** عنصر السحب مع `status: "approved"` و`processed_at` مملوء · `message`: `"Withdrawal request approved."`
**أخطاء:** `404` · `422` الحالة الحالية لا تسمح بالانتقال (**نص `message` يُعرض للأدمن حرفيًا**).

### 12. `POST /admin/withdrawals/{id}/reject` — **بلا body** (لا سبب)
**200 `data`:** `status: "rejected"` و`processed_at` مملوء · `message`: `"Withdrawal request rejected."` · **أخطاء:** `404` · `422`.

### 13. `POST /admin/withdrawals/{id}/mark-paid` — **بلا body**
**200 `data`:** `status: "paid"` · `message`: `"Withdrawal request marked paid."`
**أخطاء:** `404` · `422` الطلب ليس `approved` (**نص `message` يُعرض حرفيًا**).

---

## Phase 5 — إدارة المدن (`/admin`)

### 14. `GET /admin/cities`
لا query. **200 `data`:** مصفوفة **غير مرقّمة** (مفعّلة وغير مفعّلة):
```json
[ { "id": 1, "name_ar": "القاهرة", "name_en": "Cairo", "is_active": true },
  { "id": 2, "name_ar": "الجيزة",  "name_en": "Giza",  "is_active": false } ]
```

### 15. `POST /admin/cities`
**Request body:** `{ "name_ar": string, "name_en": string }` — كلاهما required، 1–255.
**201 `data`:** المدينة الجديدة (`is_active: true`) · `message`: `"City created."`
**أخطاء:** `422` اسم مكرّر أو حقول ناقصة.

### 16. `PUT /admin/cities/{id}`
**Request body:** `{ "name_ar"?: string, "name_en"?: string }` — كل واحد 1–255؛ **واحد على الأقل مطلوب**.
**200 `data`:** المدينة بعد التحديث · `message`: `"City updated."`
**أخطاء:** `404` · `422` اسم مكرّر أو لا حقل مُرسَل.

### 17. `PATCH /admin/cities/{id}/status`
**Request body:** `{ "is_active": boolean }` — required.
**200 `data`:** المدينة بعد التحديث · `message`: `"City status updated."`
**أخطاء:** `404` · `422` قيمة ليست boolean.

---

## Phase 6 — إعدادات المنصة (`/admin`)

### 18. `GET /admin/settings`
لا query. **200 `data`:** `{ "delivery_fee": 25.0 }`

### 19. `PUT /admin/settings`
**Request body:** `{ "delivery_fee": number }` — رقمي، `min: 0` (الفرونت يبعت JS number دائمًا).
**200 `data`:** `{ "delivery_fee": 30.0 }` · `message`: `"Delivery fee updated."`
**أخطاء:** `422` قيمة سالبة/غير رقمية (`errors` بمفتاح `delivery_fee`).

---

## Phase 7 — مراقبة الطلبات (`/admin`) — الفرونت اند **جاهز ومربوط**

### 20. `GET /admin/orders`
**Query:**
| param | القيمة | ملاحظات |
|---|---|---|
| `status` | أحد قيم `OrderStatus` الـ12 | اختياري؛ يُحذف = الكل |
| `city_id` | int | اختياري؛ **مدينة الطاهي**. مدينة معطّلة لكن موجودة **تُقبل**؛ غير موجودة → `422` |
| `placed_from` | `Y-m-d` | اختياري؛ **بداية اليوم** بتوقيت مصر |
| `placed_to` | `Y-m-d` | اختياري؛ **تُضبط تلقائيًا على `23:59:59`** بتوقيت مصر |
| `page` | int ≥ 1 | اختياري، افتراضي `1`، يُرسَل دائمًا |

**⚠️ المنطقة الزمنية (لازم قرار):** الفرونت اند يفترض أن `placed_from`/`placed_to` وحدود اليوم تُقيَّم بتوقيت **Africa/Cairo**، ويحسب نافذته الافتراضية «آخر 30 يومًا» ويعرض كل التواريخ بنفس التوقيت. لو الباك اند بـ UTC ستزيح النتائج 2–3 ساعات.

**`OrderStatus` (12):** `pending` · `accepted` · `preparing` · `ready_for_pickup` · `assigned_to_driver` · `picked_up` · `on_the_way` · `delivered` · `completed` · `cancelled` · `pending_review` · `quoted`

**200 `data`:**
```json
{
  "items": [
    {
      "id": 901, "order_number": "ORD-2026-000901",
      "customer_id": 55, "cook_id": 12,
      "cook_name": "مطبخ أم أحمد", "cook_avatar_url": "https://…|null",
      "type": "regular",                   // regular | custom
      "status": "completed",               // OrderStatus
      "delivery_address_id": 88,
      "requested_delivery_date": "2026-09-05",   // Y-m-d
      "delivery_time_slot": "13:00-15:00",
      "subtotal": 180.0, "delivery_fee": 25.0, "total": 205.0,
      "customer_note": "بدون شطة",          // أو null
      "cancel_reason": null,               // string لو status === "cancelled"
      "items": [
        { "id": 1, "dish_id": 300, "item_name": "كشري",
          "unit_price": 45.0, "quantity": 4, "line_total": 180.0 }
      ],
      "custom_details": null,              // كائن فقط لو type === "custom" (تحت)
      "quote": null,                       // ← دائمًا null في هذه الاستجابة
      "status_history": []                 // ← دائمًا [] في هذه الاستجابة
    }
  ],
  "page": 1, "per_page": 20, "total": 42
}
```
`custom_details` (فقط لـ `type: "custom"`؛ أي حقل قد يكون `null`):
```json
{ "occasion_type": "زفاف", "guest_count": 120,
  "requested_dishes_text": "أرز وخروف وحلويات",
  "budget_min": 5000.0, "budget_max": 8000.0,
  "requested_delivery_date_time": "2026-10-01T18:00:00+02:00" }
```
- `per_page` ثابت **20**. `items: []` لبلا نتائج / صفحة بعد الأخيرة.
- **`quote` لازم `null` و`status_history` لازم `[]`** في هذه الواجهة (الفرونت يتجاهلهما).

**أخطاء (`422` مع `errors` بمفتاح الحقل):**
- `status` غير صالح → `errors.status`
- `city_id` غير موجود → `errors.city_id`
- تاريخ غير قابل للتحليل → `errors.placed_from` / `errors.placed_to`
- `placed_from` أحدث من `placed_to` → `422` (الفرونت يمنعها محليًا أيضًا)

---

## Phase 8 — إحصائيات الصفحة الرئيسية (`/admin`)

### 21. `GET /admin/reports/overview`
لا query. محسوبة لحظيًا بلا cache. لا `404`/`422`.
**200 `data`:**
```json
{
  "users_by_role": { "customer": 1240, "cook": 85, "driver": 60, "admin": 3 },
  "orders_by_status": {
    "pending": 12, "accepted": 5, "preparing": 8, "ready_for_pickup": 2,
    "assigned_to_driver": 3, "picked_up": 1, "on_the_way": 4, "delivered": 6,
    "completed": 980, "cancelled": 47, "pending_review": 2, "quoted": 1
  },
  "total_sales_revenue": 154300.0
}
```
- `users_by_role` و`orders_by_status` قد تكون جزئية؛ الفرونت اند يتحمّل مفاتيح ناقصة أو زائدة.
- `total_sales_revenue` = مجموع `total` لطلبات `completed` فقط.

---

# القسم (ب) — شاشات بلا عقد API نهائي (الـ UI جاهز، بانتظار تثبيت العقد)

الشاشات دي **الـ UI بتاعها اتبنى بالكامل** (folders تحت `src/users/`, `src/complaints/`, `src/reports/`, `src/delivery/`). **اتنفّذت باك اند:** `users`, `delivery`, `reports` (العقد النهائي في `admin-dashboard-api.md`). **باقي provisional:** `complaints` فقط — ملف `src/complaints/complaintsApi.ts` فيه `⚠️ PROVISIONAL`؛ أول ما الباك اند يثبّت العقد يتعدّل مسار واحد فيه. كل الشاشات تعرض حالات loading/empty/error بشكل سليم حتى قبل وجود الـ endpoints.

### إدارة المستخدمين — `/users`
```
GET    /admin/users?role=&status=&q=&page=      → { items, page, per_page, total }
GET    /admin/users/{id}
POST   /admin/users                              → 201
PUT    /admin/users/{id}
PATCH  /admin/users/{id}/status                  { status }
```
عنصر المستخدم المتوقّع: `{ id, first_name, last_name, email, phone, role, status, created_at }`.

### التقارير المالية — `/reports` — ✅ **اتنفّذت** (2026-09-08)
```
GET /admin/reports/financial?from=&to=&group_by=day|month&city_id=
    → { totals: { revenue, commission, payouts, orders },
        series:    [{ period, revenue, commission, payouts }],
        breakdown: [{ label, revenue, orders }] }
```
العقد النهائي والمقاييس موثّقة في `admin-dashboard-api.md` Phase 8.2. باختصار: `revenue`/`orders` من الطلبات المكتملة، `commission` = نسبةً من الإيراد (`settings.commission_percent`)، `payouts` = طلبات السحب المدفوعة خلال الفترة. `from`/`to` اختياريان (افتراضي آخر 30 يوماً، توقيت `Africa/Cairo`). أخطاء الفلاتر ترجع `422` والسبب في `message`.

### الشكاوى والاقتراحات — `/complaints`
```
GET    /admin/complaints?type=&status=&page=     → { items, page, per_page, total }
GET    /admin/complaints/{id}                     → التفاصيل + المحادثة
POST   /admin/complaints/{id}/reply              { body }
PATCH  /admin/complaints/{id}/status             { status: "open" | "resolved" }
```
عنصر متوقّع: `{ id, type: "complaint"|"suggestion", subject, body, customer_id, order_id?, status, created_at }`.

### إدارة الدليفري — `/delivery`
عرض لحظي للتوصيلات النشطة والسائقين على الشيفت + إسناد سائق. يحتاج **مواصفة عمليات** وربما WebSocket/SSE. مثال REST مبدئي:
```
GET   /admin/delivery/active                      → توصيلات جارية
GET   /admin/delivery/drivers?available=          → سائقون + حالتهم
POST  /admin/delivery/orders/{id}/assign          { driver_id }
```

---

# ملخّص سريع لكل الـ endpoints

| # | Method & Path | Body | ملاحظة |
|---|---|---|---|
| 1 | `POST /auth/login` | `{identifier,password}` | عام، throttled |
| 2 | `GET /auth/me` | — | |
| 3 | `POST /auth/logout` | `{device_token?}` | |
| 4 | `GET /admin/cooks/pending` | — | |
| 5 | `POST /admin/cooks/{id}/approve` | — | |
| 6 | `POST /admin/cooks/{id}/reject` | `{reason}` | |
| 7 | `GET /admin/drivers/pending` | — | |
| 8 | `POST /admin/drivers/{id}/approve` | — | |
| 9 | `POST /admin/drivers/{id}/reject` | `{reason}` | |
| 10 | `GET /admin/withdrawals?status=&page=` | — | مُرقّم 20 |
| 11 | `POST /admin/withdrawals/{id}/approve` | **—** | |
| 12 | `POST /admin/withdrawals/{id}/reject` | **—** | بلا سبب |
| 13 | `POST /admin/withdrawals/{id}/mark-paid` | **—** | |
| 14 | `GET /admin/cities` | — | غير مُرقّم |
| 15 | `POST /admin/cities` | `{name_ar,name_en}` | 201 |
| 16 | `PUT /admin/cities/{id}` | `{name_ar?,name_en?}` | ≥1 |
| 17 | `PATCH /admin/cities/{id}/status` | `{is_active}` | |
| 18 | `GET /admin/settings` | — | |
| 19 | `PUT /admin/settings` | `{delivery_fee}` | |
| 20 | `GET /admin/orders?status=&city_id=&placed_from=&placed_to=&page=` | — | مُرقّم 20 · توقيت مصر |
| 21 | `GET /admin/reports/overview` | — | لحظي |

## أهم 3 قرارات لازمة قبل التنفيذ

1. **توقيت `placed_from`/`placed_to` في `GET /admin/orders`** → Africa/Cairo (المفترض) أم UTC؟
2. **`per_page` ثابت 20** في `withdrawals` و`orders` ويُرجَع في جسم الاستجابة — تأكيد.
3. **إجراءات `withdrawals` بلا body** ونص `422` يُعرض للأدمن حرفيًا — تأكيد.

---

# القسم (ج) — لوحة التحكم الرئيسية `/dashboard` (التصميم الغنيّ المُستعاد)

الشاشة رجعت لشكلها الأصلي: 6 بطاقات مؤشرات + رسم بياني للطلبات اليومية + إجراءات سريعة +
جدول عمليات التوصيل الحالية + قائمة «طلبات بانتظار التحضير» + قائمة «أحدث الطهاة المنضمّين».
كل قسم يعرض حالته الخاصة؛ الأقسام اللي endpoint‑ها لسه مش جاهز تعرض
«بانتظار endpoint من الباك اند» بدل ما تكسر الصفحة.

## ما تستهلكه الشاشة

| القسم | المصدر | الحالة |
|-------|--------|--------|
| بطاقة «إجمالي المستخدمين» | `GET /admin/reports/overview` → مجموع `users_by_role` | ✅ موجود (#21) |
| بطاقة «إجمالي الطهاة» | `overview.users_by_role.cook` | ✅ موجود |
| بطاقة «إجمالي الطلبات» | مجموع `overview.orders_by_status` | ✅ موجود |
| بطاقة «إجمالي الإيرادات» | `overview.total_sales_revenue` | ✅ موجود |
| بطاقة «دليفري متاح الآن» / «مشغول» | `GET /admin/delivery/drivers` → عدّ `is_available` | ⚠️ مبدئي (§ب) |
| الرسم البياني «الطلبات اليومية (٧ أيام)» | **`GET /admin/reports/orders-daily?days=7`** | ❌ **جديد** |
| جدول «عمليات التوصيل الحالية» | `GET /admin/delivery/active` + حقلَي `total` و`commission` | ⚠️ مبدئي (§ب) + حقلان جديدان |
| «طلبات بانتظار التحضير» | `GET /admin/orders?status=preparing&page=1` (أول 5) | ✅ موجود (#20) |
| «أحدث الطهاة المنضمّين» | **`GET /admin/cooks/recent?limit=5`** | ❌ **جديد** |
| «عرض الكل» في كل قسم | روابط داخلية → `/delivery` · `/orders?status=preparing` · `/cooks` | ✅ فرونت فقط |
| أزرار الإجراءات السريعة | تفتح modals محليًا (`إضافة طباخة` / `إشعار عام` / `مستخدم جديد`) | ⚠️ انظر تحت |

## 1) endpoint جديد مطلوب — `GET /admin/reports/orders-daily`

**Query:** `days` (int، افتراضي `7`).
**200 `data`:** مصفوفة نقطة لكل يوم، من الأقدم للأحدث، **بتوقيت Africa/Cairo**:
```json
[
  { "date": "2026-09-01", "count": 65 },
  { "date": "2026-09-02", "count": 59 }
]
```
- `count` = عدد الطلبات المُنشأة في ذلك اليوم (كل الحالات). أيام بلا طلبات تُرجَع بـ `count: 0`.
- بديل مقبول: ضمّ المصفوفة داخل `GET /admin/reports/overview` كمفتاح `orders_daily` — الفرونت هيقرأه من نفس النداء.

## 2) endpoint جديد مطلوب — `GET /admin/cooks/recent`

**Query:** `limit` (int، افتراضي `5`).
**200 `data`:** الطهاة الأحدث انضمامًا (المعتمَدون)، من الأحدث للأقدم:
```json
[
  { "id": 1, "store_name": "زينب المصراوي", "area": "المعادي", "city_id": 3,
    "joined_at": "2026-10-01T10:00:00+00:00" }
]
```
- `joined_at` = تاريخ اعتماد الطاهي (أو `created_at` لو مفيش تمييز).
- بديل: `GET /admin/users?role=cook&sort=created_desc&limit=5` لو اتبنى endpoint المستخدمين في §ب.

## 3) تعديل — `GET /admin/delivery/active` (من §ب): إضافة حقلين

الجدول في الداشبورد يعرض عمود «السعر» وعمود «العمولة». أضِف لكل عنصر:
```json
{ "...": "...", "total": 150.0, "commission": 15.0 }
```
- `total` = إجمالي الطلب (ج.م). `commission` = عمولة السائق لهذه التوصيلة (ج.م).
- لو غير متاحين الآن، الفرونت يعرض `—` في الخليتين — لا يكسر الجدول.

## 4) ✅ أزرار «الإجراءات السريعة» — **اتبنت وربطت بالباك اند** (2026-09-08)

الـ 3 modals أُعيد بناؤها نماذج حقيقية (حقول controlled + تحقّق يطابق قواعد الـ FormRequest
+ ربط + معالجة 422/شبكة + banner نجاح/خطأ + a11y). المسارات المستهلَكة:

| Modal | `POST` | جسم الطلب (snake_case، مطابق للسيرفر) |
|---|---|---|
| إضافة طباخة | `/api/v1/admin/cooks` | `first_name, last_name, email, phone, password, store_name, city_id?, area?` |
| إشعار عام | `/api/v1/admin/notifications` | `title, body, audience` (`audience` ∈ `all\|customers\|cooks\|drivers`) |
| مستخدم جديد | `/api/v1/admin/users` | `first_name, last_name, email, phone, password, role` (`role` ∈ `customer\|cook\|driver\|admin`) |

- `phone` يتحقّق محليًا بنفس ريجيكس السيرفر `/^\+?[1-9]\d{7,14}$/` — يعني الأرقام لازم بالصيغة
  الدولية (`+20...`)؛ الرقم اللي يبدأ بـ `0` يُرفض قبل الإرسال (مطابقة للسيرفر).
- `password` min 8 محليًا. `city_id`/`area` يُرسَلان فقط لو مملوءين.
- عند `422`: خريطة `errors` تُعرض على الحقول. عند `0`/`5xx`: banner «تعذّر الحفظ» والـ modal يفضل مفتوح.
- عند النجاح: banner أخضر + إغلاق تلقائي.

## ملخّص القسم (ج)

| # | Method & Path | جديد/تعديل | يغذّي |
|---|---|---|---|
| ج‑1 | `GET /admin/reports/orders-daily?days=7` | **جديد** | الرسم البياني |
| ج‑2 | `GET /admin/cooks/recent?limit=5` | **جديد** | قائمة أحدث الطهاة |
| ج‑3 | `GET /admin/delivery/active` + `total` + `commission` | **تعديل** (§ب) | جدول التوصيلات |
| ج‑4 | `GET /admin/delivery/drivers` | §ب كما هو | بطاقتا الدليفري |
| ج‑5 | `POST /admin/cooks` · `POST /admin/notifications` · `POST /admin/users` | **جديد** (اختياري) | الإجراءات السريعة |

---

# القسم (د) — شاشة «إعدادات النظام» `/settings` (توسيع مطلوب)

الشاشة اتعملت رِتش (4 بطاقات: مالية · مدن · بيانات المتجر · إشعارات + نطاق توصيل).
**المُفعَّل الآن:** رسوم التوصيل (`PUT /admin/settings` الحالي) + عرض المدن (`GET /admin/cities`، والإدارة من `/cities`).
باقي البطاقات **واجهة جاهزة معطّلة** عليها شارة «بانتظار الباك اند» لحد ما `GET/PUT /admin/settings` يتوسّع.

## المطلوب: توسيع `GET/PUT /admin/settings` من `{ delivery_fee }` لكائن إعدادات عام

**`GET /admin/settings` → 200 `data`:**
```jsonc
{
  "delivery_fee": 25.0,                 // موجود

  // مالية إضافية
  "commission_percent": 15.0,           // نسبة عمولة المنصة %
  "min_order_total": 50.0,              // الحد الأدنى لقيمة الطلب (ج.م)
  "first_order_discount_enabled": true,
  "cashback_enabled": false,

  // بيانات المتجر
  "store_name": "طباخة",
  "support_email": "support@tabakha.app",
  "support_phone": "+201000000000",
  "logo_url": "https://…|null",
  "icon_url": "https://…|null",

  // إشعارات + توصيل
  "notif_push_enabled": true,
  "notif_new_orders_enabled": true,
  "notif_sms_cooks_enabled": true,
  "notif_order_status_enabled": true,
  "default_delivery_radius_km": 10
}
```

**`PUT /admin/settings`** — يقبل **partial** (أي مجموعة جزئية من المفاتيح أعلاه)، يدمجها، ويرجّع الكائن الكامل المُحدَّث + `message`. تحقّق كل حقل:
| المفتاح | القاعدة |
|---|---|
| `delivery_fee`, `min_order_total` | `numeric min:0` |
| `commission_percent` | `numeric between:0,100` |
| `*_enabled` | `boolean` |
| `default_delivery_radius_km` | `integer min:1` |
| `store_name` | `string max:255` |
| `support_email` | `email max:255` |
| `support_phone` | `regex:/^\+?[1-9]\d{7,14}$/` |
| `logo_url` / `icon_url` | رفع منفصل (multipart) أو URL — قرار الباك اند |
- خطأ → `422` مع `errors` مفتاحه اسم الحقل (زي `PUT /admin/settings` الحالي مع `delivery_fee`).
- الفرونت يبعت المفاتيح المتغيّرة فقط.

## ملخّص القسم (د)

| البطاقة | الحقول | الحالة |
|---|---|---|
| مالية | `delivery_fee` | ✅ يشتغل |
| مالية إضافية | `commission_percent`, `min_order_total`, `first_order_discount_enabled`, `cashback_enabled` | ⛔ محتاج التوسيع |
| المدن | عرض من `GET /admin/cities` + رابط لـ `/cities` | ✅ يشتغل (الإدارة في `/cities`) |
| بيانات المتجر | `store_name`, `support_email`, `support_phone`, `logo_url`, `icon_url` | ⛔ محتاج التوسيع |
| إشعارات + توصيل | `notif_*_enabled` (×4), `default_delivery_radius_km` | ⛔ محتاج التوسيع |
