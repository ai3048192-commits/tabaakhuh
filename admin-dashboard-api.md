# Admin Dashboard API — مرجع الـ Endpoints

هذا الملف يوثّق **كل الـ endpoints** التي تستخدمها داشبورد الأدمن، مقسّمة على شكل
**Phases** حتى تُمرَّر مباشرة لأداة **Spec Kit** (`/speckit-specify` لكل Phase على حدة).

- كل Phase = feature مستقلة قابلة للتنفيذ لوحدها.
- تحت كل endpoint: الغرض، صلاحيات الوصول، شكل الـ Request، وشكل الـ Response.
- المصدر: `routes/api.php` تحت `Route::prefix('v1')` ثم
  `->middleware(['auth:sanctum', 'role:admin'])->prefix('admin')`.

---

## 0. Conventions (ثابت في كل الـ endpoints)

### Base URL

```
https://<host>/api/v1
```

### Authentication

كل endpoints الأدمن محمية بـ `auth:sanctum` + `role:admin`. لازم يُرسل التوكن في كل طلب:

```
Authorization: Bearer <token>
Accept: application/json
Content-Type: application/json
```

التوكن يُجلب من `POST /api/v1/auth/login` (Phase 1).

### Response Envelope (موحّد — نجاح أو فشل)

```jsonc
{
  "success": true,
  "data": { /* ... أو [] أو null */ },
  "message": "OK",
  "errors": null
}
```

### Error Envelope

```jsonc
{
  "success": false,
  "data": null,
  "message": "The given data was invalid.",
  "errors": { "field": ["السبب"] }   // null في غير أخطاء الـ validation
}
```

| HTTP | متى يحدث | `message` |
|------|----------|-----------|
| `401` | توكن مفقود / غير صالح | `Unauthenticated.` |
| `403` | مستخدم مسجّل لكن ليس `admin` | `You do not have permission to perform this action.` |
| `404` | مورد غير موجود | `The requested resource was not found.` |
| `422` | فشل الـ validation | `The given data was invalid.` (+ `errors`) |
| `409`/`422` | خرق قاعدة عمل (Domain exception) | رسالة الاستثناء نفسها |
| `500` | خطأ غير متوقع | `Something went wrong. Please try again.` |

### Pagination Shape (في الـ endpoints المرقّمة)

```jsonc
{
  "items": [ /* ... */ ],
  "page": 1,
  "per_page": 20,
  "total": 137
}
```

`per_page` ثابت من الـ backend (`20` للطلبات والسحوبات). التنقّل عبر `?page=N`.

---

## Phase 1 — Admin Authentication & Session

**الهدف:** تسجيل دخول الأدمن للداشبورد، جلب بيانات الحساب الحالي، وتسجيل الخروج.
هذه الـ endpoints مشتركة (ليست تحت `/admin`) لكن الداشبورد تحتاجها.

### 1.1 `POST /auth/login`

تسجيل الدخول والحصول على Bearer token.

**Access:** عام (بدون توكن). يوجد throttle: `login` + `login-ip`.

**Request**

```json
{
  "identifier": "admin@tabbakha.com",
  "password": "secret123"
}
```

| Field | Rules |
|-------|-------|
| `identifier` | required, string (إيميل أو تليفون) |
| `password` | required, string |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "first_name": "Site",
      "last_name": "Admin",
      "email": "admin@tabbakha.com",
      "phone": "+201000000000",
      "role": "admin",
      "status": "active",
      "email_verified": true,
      "avatar_url": null
    },
    "token": "12|xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  },
  "message": "Logged in successfully.",
  "errors": null
}
```

**أخطاء:** `422` بيانات ناقصة · `401`/`422` بيانات دخول غير صحيحة · `429` تجاوز عدد المحاولات.

> الداشبورد يجب أن تتحقق أن `data.user.role === "admin"` وترفض غير ذلك.

### 1.2 `GET /auth/me`

جلب بيانات الحساب الحالي (لإعادة بناء الجلسة عند فتح الداشبورد).

**Access:** `auth:sanctum`.

**Request:** لا body.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "first_name": "Site",
      "last_name": "Admin",
      "email": "admin@tabbakha.com",
      "phone": "+201000000000",
      "role": "admin",
      "status": "active",
      "email_verified": true,
      "avatar_url": null
    }
  },
  "message": "OK",
  "errors": null
}
```

### 1.3 `POST /auth/logout`

إبطال التوكن الحالي.

**Access:** `auth:sanctum`.

**Request** (اختياري)

```json
{ "device_token": "fcm-token-optional" }
```

**Response `200`**

```json
{ "success": true, "data": null, "message": "Logged out successfully.", "errors": null }
```

---

## Phase 2 — Cook Applications Review

**الهدف:** مراجعة طلبات الطهاة المعلّقة، والموافقة عليها أو رفضها مع سبب.

**Base:** `/admin` · **Access:** `auth:sanctum` + `role:admin` لكل ما يلي.

### 2.1 `GET /admin/cooks/pending`

قائمة طلبات الطهاة بحالة `pending` مع صورة العقد الموقّع إن وُجد.

**Request:** لا params.

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "cook_profile": {
        "id": 12,
        "store_name": "مطبخ أم أحمد",
        "bio": "أكل بيتي مصري",
        "avatar_url": "https://cdn/.../avatar.jpg",
        "national_id_front_url": "https://cdn/.../id-front.jpg",
        "national_id_back_url": "https://cdn/.../id-back.jpg",
        "banner_url": "https://cdn/.../banner.jpg",
        "city_id": 3,
        "area": "المعادي",
        "address_text": "شارع 9",
        "lat": 29.96,
        "lng": 31.25,
        "delivery_radius_km": 5,
        "is_open": false,
        "approval_status": "pending",
        "rejection_reason": null,
        "rating_avg": 0,
        "rating_count": 0
      },
      "contract": {
        "template_version": "v1",
        "signed_file_url": "https://cdn/.../contract-12.pdf",
        "signed_at": "2026-09-01T12:30:00+00:00"
      }
    }
  ],
  "message": "OK",
  "errors": null
}
```

> `contract` قد تكون `null` لو لم يوقّع الطاهي العقد بعد.
> `approval_status` قيمه: `pending` | `approved` | `rejected`.

### 2.2 `POST /admin/cooks/{id}/approve`

الموافقة على طلب طاهٍ. `{id}` = `cook_profile.id`.

**Request:** لا body.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": 12,
    "store_name": "مطبخ أم أحمد",
    "approval_status": "approved",
    "rejection_reason": null,
    "...": "بقية حقول cook_profile كما في 2.1"
  },
  "message": "Application approved.",
  "errors": null
}
```

**أخطاء:** `404` طلب غير موجود · `422` الطلب ليس بحالة `pending`.

### 2.3 `POST /admin/cooks/{id}/reject`

رفض طلب طاهٍ مع سبب إجباري.

**Request**

```json
{ "reason": "صور البطاقة غير واضحة" }
```

| Field | Rules |
|-------|-------|
| `reason` | required, string, min:1, max:1000 |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": 12,
    "approval_status": "rejected",
    "rejection_reason": "صور البطاقة غير واضحة",
    "...": "بقية حقول cook_profile"
  },
  "message": "Application rejected.",
  "errors": null
}
```

**أخطاء:** `422` `reason` مفقود · `404` غير موجود · `422` ليس `pending`.

---

## Phase 3 — Driver Applications Review

**الهدف:** مراجعة طلبات السائقين المعلّقة، والموافقة أو الرفض مع سبب.
يعرض روابط مستندات السائق (الأدمن أحد دورين مسموح لهما برؤيتها).

**Base:** `/admin` · **Access:** `auth:sanctum` + `role:admin`.

### 3.1 `GET /admin/drivers/pending`

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "id": 7,
      "vehicle_type": "motorcycle",
      "vehicle_plate_no": "1234",
      "national_id_front_url": "https://cdn/.../id-front.jpg",
      "national_id_back_url": "https://cdn/.../id-back.jpg",
      "license_url": "https://cdn/.../license.jpg",
      "city_id": 3,
      "vehicle_model": "Halawa",
      "vehicle_plate_letters": "ن م ص",
      "vehicle_year": 2020,
      "vehicle_color": "أحمر",
      "birth_date": "1995-04-10",
      "is_available": false,
      "approval_status": "pending",
      "submitted_at": "2026-09-02T09:00:00+00:00",
      "rejection_reason": null,
      "rating_avg": 0,
      "rating_count": 0
    }
  ],
  "message": "OK",
  "errors": null
}
```

### 3.2 `POST /admin/drivers/{id}/approve`

`{id}` = `driver_profile.id`. لا body.

**Response `200`** — نفس شكل عنصر السائق أعلاه مع `approval_status: "approved"`.
Message: `Application approved.`

**أخطاء:** `404` · `422` ليس `pending`.

### 3.3 `POST /admin/drivers/{id}/reject`

**Request**

```json
{ "reason": "الرخصة منتهية" }
```

| Field | Rules |
|-------|-------|
| `reason` | required, string, min:1, max:1000 |

**Response `200`** — عنصر السائق مع `approval_status: "rejected"` و `rejection_reason` مملوء.
Message: `Application rejected.`

---

## Phase 4 — Withdrawals Management

**الهدف:** إدارة طابور طلبات سحب الأرصدة من الطهاة والسائقين
(عرض / موافقة / رفض / تعليم كمدفوع).

**Base:** `/admin` · **Access:** `auth:sanctum` + `role:admin`.

**دورة حالة الطلب:** `pending → {approved, rejected}` · `approved → paid` · `rejected`/`paid` نهائيتان.

### 4.1 `GET /admin/withdrawals`

قائمة مرقّمة لطلبات السحب، اختيارياً بفلتر حالة.

**Query params**

| Param | النوع | ملاحظات |
|-------|------|---------|
| `status` | `pending` \| `approved` \| `rejected` \| `paid` | اختياري |
| `page` | int | افتراضي `1` |

مثال: `GET /admin/withdrawals?status=pending&page=1`

**Response `200`**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 45,
        "amount": 500.0,
        "payment_details": "InstaPay: 01000000000",
        "status": "pending",
        "requested_at": "2026-09-03T08:00:00+00:00",
        "processed_at": null
      }
    ],
    "page": 1,
    "per_page": 20,
    "total": 3
  },
  "message": "OK",
  "errors": null
}
```

**أخطاء:** `422` قيمة `status` غير صالحة.

### 4.2 `POST /admin/withdrawals/{id}/approve`

**Request:** لا body. **Response `200`**

```json
{
  "success": true,
  "data": {
    "id": 45, "amount": 500.0, "payment_details": "InstaPay: 01000000000",
    "status": "approved", "requested_at": "2026-09-03T08:00:00+00:00",
    "processed_at": "2026-09-06T10:00:00+00:00"
  },
  "message": "Withdrawal request approved.",
  "errors": null
}
```

**أخطاء:** `404` · `422` الحالة الحالية لا تسمح بالانتقال إلى `approved`.

### 4.3 `POST /admin/withdrawals/{id}/reject`

لا body. **Response `200`** — نفس الشكل مع `status: "rejected"`.
Message: `Withdrawal request rejected.`

### 4.4 `POST /admin/withdrawals/{id}/mark-paid`

يُستخدم بعد الموافقة وتحويل المبلغ فعلياً. لا body.

**Response `200`** — نفس الشكل مع `status: "paid"`.
Message: `Withdrawal request marked paid.`

**أخطاء:** `422` الطلب ليس بحالة `approved`.

---

## Phase 5 — Cities Management

**الهدف:** إدارة قائمة المدن التي تعمل بها المنصة (إضافة / تعديل الاسم / تفعيل-تعطيل).

**Base:** `/admin` · **Access:** `auth:sanctum` + `role:admin`.

### 5.1 `GET /admin/cities`

كل المدن (مفعّلة وغير مفعّلة).

**Response `200`**

```json
{
  "success": true,
  "data": [
    { "id": 1, "name_ar": "القاهرة", "name_en": "Cairo", "is_active": true },
    { "id": 2, "name_ar": "الجيزة", "name_en": "Giza", "is_active": false }
  ],
  "message": "OK",
  "errors": null
}
```

### 5.2 `POST /admin/cities`

**Request**

```json
{ "name_ar": "الإسكندرية", "name_en": "Alexandria" }
```

| Field | Rules |
|-------|-------|
| `name_ar` | required, string, min:1, max:255 |
| `name_en` | required, string, min:1, max:255 |

**Response `201`**

```json
{
  "success": true,
  "data": { "id": 3, "name_ar": "الإسكندرية", "name_en": "Alexandria", "is_active": true },
  "message": "City created.",
  "errors": null
}
```

**أخطاء:** `422` اسم مكرّر أو حقول ناقصة.

### 5.3 `PUT /admin/cities/{id}`

تعديل اسم المدينة — يُقبل تمرير أحد الاسمين أو كليهما (واحد على الأقل إجباري).

**Request**

```json
{ "name_ar": "إسكندرية" }
```

| Field | Rules |
|-------|-------|
| `name_ar` | sometimes, string, min:1, max:255 |
| `name_en` | sometimes, string, min:1, max:255 |
| — | لازم يوجد `name_ar` أو `name_en` على الأقل، وإلا `422` |

**Response `200`**

```json
{
  "success": true,
  "data": { "id": 3, "name_ar": "إسكندرية", "name_en": "Alexandria", "is_active": true },
  "message": "City updated.",
  "errors": null
}
```

### 5.4 `PATCH /admin/cities/{id}/status`

تفعيل أو تعطيل مدينة.

**Request**

```json
{ "is_active": false }
```

| Field | Rules |
|-------|-------|
| `is_active` | required, boolean |

**Response `200`**

```json
{
  "success": true,
  "data": { "id": 3, "name_ar": "إسكندرية", "name_en": "Alexandria", "is_active": false },
  "message": "City status updated.",
  "errors": null
}
```

---

## Phase 6 — Platform Settings

**الهدف:** عرض وتعديل الإعدادات العامة للمنصة. حالياً `delivery_fee` فقط.

**Base:** `/admin` · **Access:** `auth:sanctum` + `role:admin`.

### 6.1 `GET /admin/settings`

**Response `200`**

```json
{
  "success": true,
  "data": { "delivery_fee": 25.0 },
  "message": "OK",
  "errors": null
}
```

### 6.2 `PUT /admin/settings`

**Request**

```json
{ "delivery_fee": 30 }
```

| Field | Rules |
|-------|-------|
| `delivery_fee` | required, numeric, min:0 |

**Response `200`**

```json
{
  "success": true,
  "data": { "delivery_fee": 30.0 },
  "message": "Delivery fee updated.",
  "errors": null
}
```

**أخطاء:** `422` قيمة سالبة أو غير رقمية.

---

## Phase 7 — Orders Oversight

**الهدف:** شاشة مراقبة كل الطلبات على المنصة مع فلاتر (حالة / مدينة / تاريخ) وترقيم.

**Base:** `/admin` · **Access:** `auth:sanctum` + `role:admin`.

### 7.1 `GET /admin/orders`

**Query params**

| Param | النوع | ملاحظات |
|-------|------|---------|
| `status` | enum | أحد قيم `OrderStatus` (تحت الجدول) |
| `city_id` | int | مدينة الطاهي؛ مدينة معطّلة لكن موجودة تُقبل، غير الموجودة `422` |
| `placed_from` | تاريخ `Y-m-d` أو ISO | بداية الفترة |
| `placed_to` | تاريخ `Y-m-d` أو ISO | نهاية الفترة (تُضبط تلقائياً على `23:59:59`) |
| `page` | int | افتراضي `1`، `per_page = 20` |

**قيم `status`:** `pending` · `accepted` · `preparing` · `ready_for_pickup` ·
`assigned_to_driver` · `picked_up` · `on_the_way` · `delivered` · `completed` ·
`cancelled` · `pending_review` · `quoted`.

مثال: `GET /admin/orders?status=completed&city_id=3&placed_from=2026-09-01&placed_to=2026-09-06&page=1`

**Response `200`**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 901,
        "order_number": "ORD-2026-000901",
        "customer_id": 55,
        "cook_id": 12,
        "cook_name": "مطبخ أم أحمد",
        "cook_avatar_url": "https://cdn/.../avatar.jpg",
        "type": "regular",
        "status": "completed",
        "delivery_address_id": 88,
        "requested_delivery_date": "2026-09-05",
        "delivery_time_slot": "13:00-15:00",
        "subtotal": 180.0,
        "delivery_fee": 25.0,
        "total": 205.0,
        "customer_note": "بدون شطة",
        "cancel_reason": null,
        "items": [
          {
            "id": 1,
            "dish_id": 300,
            "item_name": "كشري",
            "unit_price": 45.0,
            "quantity": 4,
            "line_total": 180.0
          }
        ],
        "custom_details": null,
        "quote": null,
        "status_history": []
      }
    ],
    "page": 1,
    "per_page": 20,
    "total": 42
  },
  "message": "OK",
  "errors": null
}
```

> في نتائج القائمة يكون `quote` = `null` و `status_history` = `[]` دائماً
> (تفاصيلهما تظهر فقط في endpoint تفاصيل الطلب المشترك، خارج نطاق الداشبورد).
> للطلبات المخصّصة (`type: "custom"`) يمتلئ `custom_details` بكائن يحوي
> `occasion_type`, `guest_count`, `requested_dishes_text`, `budget_min`,
> `budget_max`, `requested_delivery_date_time`.

**أخطاء:** `422` قيمة `status` غير صالحة · `422` `city_id` غير موجودة ·
`422` تاريخ غير صالح · `422` `placed_from` أحدث من `placed_to`.

---

## Phase 8 — Dashboard Reports / Overview

**الهدف:** بطاقات الإحصائيات في الصفحة الرئيسية للداشبورد. محسوبة لحظياً بلا cache.

**Base:** `/admin` · **Access:** `auth:sanctum` + `role:admin`.

### 8.1 `GET /admin/reports/overview`

**Request:** لا params.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "users_by_role": {
      "customer": 1240,
      "cook": 85,
      "driver": 60,
      "admin": 3
    },
    "orders_by_status": {
      "pending": 12,
      "accepted": 5,
      "preparing": 8,
      "ready_for_pickup": 2,
      "assigned_to_driver": 3,
      "picked_up": 1,
      "on_the_way": 4,
      "delivered": 6,
      "completed": 980,
      "cancelled": 47,
      "pending_review": 2,
      "quoted": 1
    },
    "total_sales_revenue": 154300.0
  },
  "message": "OK",
  "errors": null
}
```

| Field | المعنى |
|-------|--------|
| `users_by_role` | عدد المستخدمين لكل دور (`customer`/`cook`/`driver`/`admin`) |
| `orders_by_status` | عدد الطلبات لكل حالة من حالات `OrderStatus` |
| `total_sales_revenue` | مجموع `total` لكل الطلبات المكتملة (`completed`) فقط |

---

### 8.2 `GET /admin/reports/financial`

**الهدف:** شاشة «التقارير المالية». محسوبة لحظياً بلا cache.

**Request (query):**

| Param | مطلوب | القيمة |
|-------|-------|--------|
| `from` | لا | `YYYY-MM-DD` — بداية الفترة (توقيت `Africa/Cairo`). الافتراضي: قبل 30 يوماً. |
| `to` | لا | `YYYY-MM-DD` — نهاية الفترة شاملةً اليوم نفسه. الافتراضي: اليوم. |
| `group_by` | لا | `day` (افتراضي) أو `month`. |
| `city_id` | لا | حصر النتائج بمدينة واحدة (عبر `cook_profiles.city_id`). |

**Response `200` — `data`:**

```json
{
  "totals": { "revenue": 154300.0, "commission": 15430.0, "payouts": 90000.0, "orders": 980 },
  "series": [
    { "period": "2026-08-10", "revenue": 5200.0, "commission": 520.0, "payouts": 3000.0 }
  ],
  "breakdown": [
    { "label": "القاهرة", "revenue": 90000.0, "orders": 540 }
  ]
}
```

| Field | المعنى |
|-------|--------|
| `totals.revenue` | مجموع `orders.total` للطلبات المكتملة (`completed`) داخل الفترة |
| `totals.orders` | عدد تلك الطلبات |
| `totals.commission` | `revenue × settings.commission_percent ÷ 100` (لا يوجد عمود عمولة تاريخي على الطلب، فتُطبَّق النسبة الحالية) |
| `totals.payouts` | مجموع `amount` لطلبات السحب المدفوعة (`paid`) التي سُوّيت (`processed_at`) داخل الفترة |
| `series[]` | نقطة لكل فترة، الأقدم أولاً، مملوءة بالأصفار. `period` = `YYYY-MM-DD` مع `day` و`YYYY-MM` مع `month` |
| `breakdown[]` | توزيع الإيراد وعدد الطلبات حسب مدينة الطاهي، تنازلياً بالإيراد. `label` = `cities.name_ar` أو `"غير محدد"` لمن بلا مدينة |

**أخطاء:** `422` — تاريخ غير صالح · `from` بعد `to` · `group_by` غير معروف · فترة أوسع من `admin.reports_max_range_days` (افتراضي 366 يوماً) · `city_id` غير موجود. السبب في `message`.

---

## ملخّص كل الـ Endpoints

| # | Phase | Method & Path | الوصف |
|---|-------|---------------|-------|
| 1 | Auth | `POST /auth/login` | دخول والحصول على token |
| 2 | Auth | `GET /auth/me` | بيانات الحساب الحالي |
| 3 | Auth | `POST /auth/logout` | إبطال التوكن |
| 4 | Cooks | `GET /admin/cooks/pending` | طلبات الطهاة المعلّقة + العقد |
| 5 | Cooks | `POST /admin/cooks/{id}/approve` | قبول طاهٍ |
| 6 | Cooks | `POST /admin/cooks/{id}/reject` | رفض طاهٍ (`reason`) |
| 7 | Drivers | `GET /admin/drivers/pending` | طلبات السائقين المعلّقة + المستندات |
| 8 | Drivers | `POST /admin/drivers/{id}/approve` | قبول سائق |
| 9 | Drivers | `POST /admin/drivers/{id}/reject` | رفض سائق (`reason`) |
| 10 | Withdrawals | `GET /admin/withdrawals` | طابور السحوبات (`status`,`page`) |
| 11 | Withdrawals | `POST /admin/withdrawals/{id}/approve` | موافقة على سحب |
| 12 | Withdrawals | `POST /admin/withdrawals/{id}/reject` | رفض سحب |
| 13 | Withdrawals | `POST /admin/withdrawals/{id}/mark-paid` | تعليم السحب كمدفوع |
| 14 | Cities | `GET /admin/cities` | كل المدن |
| 15 | Cities | `POST /admin/cities` | إضافة مدينة |
| 16 | Cities | `PUT /admin/cities/{id}` | تعديل اسم مدينة |
| 17 | Cities | `PATCH /admin/cities/{id}/status` | تفعيل/تعطيل مدينة |
| 18 | Settings | `GET /admin/settings` | عرض `delivery_fee` |
| 19 | Settings | `PUT /admin/settings` | تعديل `delivery_fee` |
| 20 | Orders | `GET /admin/orders` | كل الطلبات مع فلاتر وترقيم |
| 21 | Reports | `GET /admin/reports/overview` | إحصائيات الصفحة الرئيسية |
| 22 | Reports | `GET /admin/reports/financial` | تقرير مالي (إيراد/عمولة/مدفوعات) مع سلسلة زمنية وتوزيع حسب المدينة |

---

## كيف تستخدمها مع Spec Kit

لكل Phase شغّل:

```
/speckit-specify <لصق نص الـ Phase من هذا الملف + أي متطلبات UI إضافية>
/speckit-plan
/speckit-tasks
/speckit-implement
```

ترتيب مقترح للتنفيذ: **Phase 1 → 8 → (2،3،4 بالتوازي) → 5 → 6 → 7**
(الأولوية للدخول ثم لوحة الإحصائيات ثم طوابير المراجعة).
