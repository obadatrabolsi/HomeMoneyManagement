# العمليات المتكررة — مواصفة تصميم (المرحلة الثانية، الجزء 3)

> التاريخ: 2026-06-29
> النطاق: العمليات المتكررة فقط. يبني على الـ MVP + الميزانيات + الأهداف المدموجين في `master`.

## 1. نظرة عامة

قواعد تُولّد عمليات دخل/مصروف تلقائيًا على فترات (الراتب، الإيجار، الإنترنت، اشتراكات…). يولّد محرّك التطبيق العمليات المستحقة عند الإقلاع مع تعويض الفترات الفائتة. عربية RTL، دون اتصال، المبالغ بالسنتات.

## 2. القرارات المعتمدة

| القرار | الاختيار |
| --- | --- |
| الأنواع المدعومة | دخل ومصروف فقط (تغطّي كل أمثلة المواصفات؛ التحويلات المتكررة تحسين لاحق) |
| التكرار | `daily` / `weekly` / `monthly` / `yearly` مع `interval ≥ 1` (كل N وحدة) — يغطّي «فترة مخصصة» |
| الحدود | `startDate` إلزامي، `endDate` اختياري؛ أول توليد عند `startDate` |
| التوليد | عند إقلاع التطبيق (`bootstrap`): توليد كل المستحق حتى اليوم (catch-up) وتقديم `nextRunDate`؛ احترام `endDate` وإيقاف القاعدة بعده |
| تاريخ العملية المولّدة | تاريخ الاستحقاق الفعلي (`nextRunDate` وقت التوليد) |
| الإيقاف | `isActive` (تعطيل بدل حذف)؛ يُتاح الحذف الفعلي أيضًا |
| ترقية المخطط | Dexie v4 — جدول جديد `recurringRules` (إضافي فقط) |
| التوافق العكسي | استيراد JSON يقبل `schemaVersion` 1..4؛ الجداول الغائبة `[]` |
| الوصول | صفحة `/recurring` + رابط في صفحة الإعدادات (دون تبويب سفلي إضافي) |

## 3. نموذج البيانات

### جدول `recurringRules`
`id` · `type` (`income`|`expense`) · `amount` (سنتات) · `accountId` · `categoryId?` · `notes?` · `merchant?` · `tags` (string[]) · `frequency` (`daily`|`weekly`|`monthly`|`yearly`) · `interval` (≥1) · `startDate` (`yyyy-MM-dd`) · `endDate?` (`yyyy-MM-dd`) · `nextRunDate` (`yyyy-MM-dd`) · `lastRunDate?` · `isActive` (bool) · `createdAt` · `updatedAt`

عند الإنشاء: `nextRunDate = startDate`، `isActive = true`.

### ترقية `SCHEMA_VERSION` إلى 4
`db.version(4).stores({ ...الجداول الحالية, recurringRules: 'id, isActive, nextRunDate' })`. تبقى الإصدارات 1–3 كما هي.

## 4. المستودع `recurringRepo`

- `createRule(input): Promise<RecurringRule>` — `input = { type, amount, accountId, categoryId?, notes?, merchant?, tags?, frequency, interval, startDate, endDate? }`؛ يضبط `nextRunDate=startDate`, `isActive=true`.
- `updateRule(id, patch)` · `deleteRule(id)` · `listRules(includeInactive?): Promise<RecurringRule[]>` (مرتّبة حسب `nextRunDate`).
- `advanceDate(date, frequency, interval): string` — يقدّم تاريخًا بـ date-fns (`addDays/addWeeks/addMonths/addYears`).
- `processDueRules(today: string): Promise<number>` — لكل قاعدة نشطة: ما دام `nextRunDate <= today` و(لا `endDate` أو `nextRunDate <= endDate`)، يُنشئ عملية عبر `createTransaction` بتاريخ `nextRunDate`، يضبط `lastRunDate`، ويقدّم `nextRunDate`. عند تجاوز `endDate` تُعطّل القاعدة (`isActive=false`). يعيد عدد العمليات المُنشأة. يحفظ `nextRunDate/lastRunDate` المحدّثة.

## 5. النسخ الاحتياطي

- `exportBackup` يضيف `recurringRules` (الإصدار 4).
- `importBackup` يقبل `schemaVersion ∈ {1,2,3,4}`؛ غياب الجدول → `[]`.

## 6. الإقلاع

في `src/app/bootstrap.ts`: بعد بذر التصنيفات/الإعدادات، استدعاء `processDueRules(isoDate(new Date()))` لتوليد المستحق عند فتح التطبيق. الفشل لا يعطّل الإقلاع (يُلتقط ويُسجّل).

## 7. الواجهة

- **صفحة `/recurring`:** قائمة القواعد (الوصف=التاجر أو اسم التصنيف، المبلغ ملوّن حسب النوع، وصف التكرار مثل «كل شهر»، تاريخ التشغيل التالي، حالة نشِطة)، أزرار إضافة/تعديل/حذف وتبديل التفعيل.
- **`RecurringForm`:** مبدّل دخل/مصروف، المبلغ، الحساب، التصنيف، التكرار (قائمة) + `interval`، تاريخ البداية، تاريخ نهاية اختياري، ملاحظات/تاجر.
- **صفحة الإعدادات:** إضافة رابط «العمليات المتكررة» إلى كتلة الروابط الموجودة.

## 8. الاختبار

- **وحدة:** ترقية المخطط v4؛ `recurringRepo` (CRUD، `advanceDate` لكل تكرار، `processDueRules` مع التعويض متعدد الفترات واحترام `endDate` والإيقاف، وعدم التوليد قبل `startDate`)؛ النسخ الاحتياطي (تضمين القواعد، استيراد v1–v4).
- **مكونات:** عرض `RecurringPage` للقواعد.

## 9. معايير القبول

1. ترقية المخطط إلى v4 دون فقدان بيانات v1–v3.
2. إنشاء/تعديل/حذف/تعطيل قاعدة تكرار.
3. `processDueRules` يولّد العمليات المستحقة بدقة مع تعويض الفترات الفائتة، ويحترم `endDate`، ويقدّم `nextRunDate` بصحة لكل تكرار.
4. التوليد يحدث عند الإقلاع.
5. النسخ الاحتياطي يضمّن القواعد، والاستيراد يقبل v1–v4.
