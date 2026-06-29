# تصميم: تجديد بصري شامل لتطبيق إدارة الأموال المنزلية (Fintech مشرق ومرح)

التاريخ: 2026-06-30
النطاق: تجديد شامل للنظام البصري (Visual System Overhaul)
الاتجاه المعتمد: Fintech مشرق ومرح — خلفية فاتحة، ألوان حيوية متدرّجة، حواف دائرية كبيرة، أيقونات ملوّنة للفئات.

## ١. الهدف والسياق

التطبيق حالياً (React 18 + TypeScript + Vite + Tailwind 3 + PWA، عربي RTL) وظيفي لكنه بسيط/قياسي:
بطاقات بيضاء بحواف `rounded-2xl`، لون أخضر (emerald) وحيد، شريط تنقّل سفلي نصّي بلا أيقونات، خطوط النظام الافتراضية، حالات فارغة باهتة.

الهدف: نظام تصميم متماسك وعصري يليق بتطبيق موبايل، مع تحسين تجربة المستخدم (UX) — دون تغيير منطق الأعمال أو طبقة البيانات (Dexie/repos).

ملاحظة مهمة من البيانات: نماذج `Account` و`Category` و`Debt` تحتوي أصلاً حقلي `icon` و`color` ([src/db/types.ts](../../../src/db/types.ts)) — سنستغلّها لعرض دوائر/أيقونات ملوّنة بدل بنائها من الصفر.

### غير داخل في النطاق (Out of scope)
- تغيير منطق الأعمال أو مخطط قاعدة البيانات أو دوال الـ repos.
- إضافة ميزات وظيفية جديدة (الاكتفاء بالتجديد البصري وتحسينات UX المرتبطة به).
- إضافة مكتبة UI خارجية ثقيلة؛ نبقى على Tailwind + مكوّنات داخلية خفيفة.

## ٢. رموز التصميم (Design Tokens)

تُعرّف كـ CSS variables في `:root` و`.dark` داخل [src/index.css](../../../src/index.css)، وتُربط في [tailwind.config.js](../../../tailwind.config.js) عبر `theme.extend.colors` بأسماء دلالية.

| الدور | فاتح | داكن |
|------|------|------|
| Brand (تدرّج) | `#7C3AED → #6366F1` | نفسه |
| brand (لون مصمت) | `#6D28D9` | `#8B5CF6` |
| income / موجب | `#10B981` | `#34D399` |
| expense / سالب | `#F43F5E` | `#FB7185` |
| transfer | `#0EA5E9` | `#38BDF8` |
| warning | `#F59E0B` | `#FBBF24` |
| bg (الخلفية) | `#F8FAFC` | `#0B1120` |
| surface (بطاقة) | `#FFFFFF` | `#111827` |
| surface-2 (طبقة ثانية) | `#F1F5F9` | `#1E293B` |
| text | `#0F172A` | `#F1F5F9` |
| text-muted | `#64748B` | `#94A3B8` |
| border | `#E2E8F0` | `#1F2937` |

أسماء Tailwind الدلالية المقترحة: `brand`, `income`, `expense`, `transfer`, `warning`, `bg`, `surface`, `surface-2`, `muted`, `line`. ألوان التصنيفات/الحسابات تبقى من البيانات (`category.color`).

التدرّجات: متغيّر `--grad-brand` للبطاقة البطل والأزرار الأساسية والـ FAB.

## ٣. الخطوط

استيراد **Cairo** من Google Fonts (أوزان 400/500/600/700/800) عبر `<link>` في [index.html](../../../index.html) أو `@import` في CSS.
- عائلة الخط الأساسية: `'Cairo', system-ui, sans-serif` على `body`.
- أرقام المال: `tabular-nums` (موجودة وتبقى) + أوزان أثقل للأرقام البطلة.

## ٤. الشكل والمسافات

- حواف: بطاقات `rounded-3xl`، عناصر داخلية `rounded-2xl`، حبوب/شرائح `rounded-full`.
- ظلال: نظام ظلال ناعم طبقي (`shadow-soft`) معرّف في الثيم؛ ظلّ أبرز للبطاقة البطل والـ FAB.
- مسافات: حشو سخي (`p-4`/`p-5`)، فواصل `space-y-4`/`space-y-5`.
- موبايل: دعم `env(safe-area-inset-bottom)` لشريط التنقّل والـ FAB؛ أهداف لمس ≥ 44px.

## ٥. المكوّنات

### مكوّنات أولية مُعاد بناؤها (في `src/components/ui/`)
- **Button** — متغيّرات: `primary` (تدرّج العلامة)، `ghost` (ناعم)، `danger`. شكل حبّة، تأثير ضغط `active:scale-95`، حالة `disabled`.
- **Field** — تسمية أوضح، تباعد أكبر، تمرير حالة الخطأ بحلقة حمراء.
- **Input/Select style** — صنف موحّد (مكوّن `Input`/`Select` أو طبقة `@layer components` باسم `.input`): حواف `rounded-xl`، خلفية `surface-2`، حلقة تركيز `ring-brand`، ارتفاع لمس مريح. يُطبّق على الحقول النصّية والقوائم في كل النماذج.
- **Modal** — backdrop ضبابي، بطاقة `rounded-3xl`، حركة ظهور.
- **Sheet** — Bottom sheet بحافة `rounded-t-3xl` + مقبض سحب + حركة انزلاق من الأسفل + backdrop blur.
- **Toast** — لون إجراء بلون العلامة، حواف أنعم.
- **EmptyState** — إيموجي/أيقونة ودودة + رسالة + (اختياري) زر إجراء.
- **Fab** — تدرّج + ظلّ بارز + `active:scale` + احترام safe-area.

### مكوّنات جديدة (في `src/components/ui/`)
- **Card** — غلاف بطاقة موحّد (`surface` + `rounded-3xl` + `shadow-soft` + حشو)، مع رأس اختياري (عنوان + أيقونة + رابط "عرض الكل").
- **IconBadge / Avatar** — دائرة ملوّنة تعرض `icon` على خلفية مشتقّة من `color` (شفافية)، بأحجام sm/md.
- **StatTile** — بطاقة إحصاء صغيرة (تسمية + قيمة ملوّنة + أيقونة اتجاه).
- **SegmentedControl** — شريط شرائح للتبديل (مثل دخل/مصروف/تحويل في نموذج العملية، وفلاتر القوائم).
- **ProgressBar** — شريط تقدّم بتعبئة متدرّجة وحواف دائرية وحركة عرض، يقبل `status` (ok/near/over) أو لون مخصّص. يوحّد BudgetBar/GoalBar/DebtBar الحالية.

### مكوّن البطل (Hero Balance Card)
عنصر الهوية في الرئيسية: بطاقة بتدرّج العلامة، لمعة زجاجية خفيفة، نص "الرصيد الكلي"، الرصيد بأرقام ضخمة لكل عملة، ومؤشّر تغيّر الشهر (▲ أخضر / ▼ وردي). يُبنى داخل [DashboardPage](../../../src/features/dashboard/DashboardPage.tsx) أو كمكوّن `BalanceCard`.

## ٦. الهيكل (AppShell) — [src/routes/AppShell.tsx](../../../src/routes/AppShell.tsx)

- **Bottom Nav:** نفس التبويبات الخمسة (الرئيسية/الحسابات/العمليات/الميزانيات/الإعدادات) لكن بأيقونة + نص، مؤشّر نشط (حبّة/توهّج بلون العلامة)، خلفية `surface` مع `backdrop-blur` وحدّ علوي ناعم، حشو `safe-area-inset-bottom`.
- **الأيقونات:** SVG داخلية inline عبر مكوّن `Icon` بسيط (مجموعة محدودة: home, wallet, list, chart/budget, settings, plus, وأيقونات الفئات) — بلا مكتبة خارجية، للحفاظ على خفّة الحزمة.
- **FAB:** يبقى زرّ إضافة عملية، بالتدرّج والظلّ الجديدين.
- **Header للصفحة:** ترويسة بسيطة (عنوان الصفحة / تحية في الرئيسية "أهلاً 👋").

## ٧. تطبيق النظام على الصفحات

كل الصفحات تستهلك المكوّنات الجديدة (Card / IconBadge / StatTile / ProgressBar / SegmentedControl / Button / Field):
- **Dashboard** — Hero Card + StatTiles لدخل/مصروف اليوم + بطاقات ملخّص الشهر/التوزيع/الميزانيات/الأهداف + قائمة العمليات الأخيرة بـ TransactionRow الجديد.
- **Accounts / AccountDetail** — بطاقات حسابات بأيقونة ولون الحساب ورصيده.
- **Transactions** — SegmentedControl للفلاتر، صفوف TransactionRow بأيقونة فئة ملوّنة.
- **Budgets / Goals / Debts** — ProgressBar الموحّد + بطاقات.
- **Recurring / Reports / Categories / Settings(Backup)** — تطبيق Card/Field/Button والثيم.

كل النماذج (Transaction/Account/Category/Budget/Goal/Debt/Payment/Contribution/Recurring) تستخدم نمط الإدخال الموحّد و`Field` و`Button` الجديدة.

## ٨. الحركات و UX

- نقر: `active:scale-95` على الأزرار والعناصر القابلة للنقر.
- شيتات/مودالات: انزلاق/تلاشٍ عبر keyframes في CSS.
- قوائم: ظهور تدريجي خفيف (اختياري، بسيط).
- احترام `prefers-reduced-motion: reduce` لتعطيل الحركات.
- حالات فارغة ودودة في كل قائمة.

## ٩. الوصولية و RTL

- الحفاظ على `dir="rtl"`؛ التأكد أن الأيقونات الاتجاهية تنعكس صحيحاً.
- حلقات تركيز واضحة (`focus-visible:ring`).
- تباين ألوان AA (نصوص/خلفيات/أزرار).
- `aria-label` للأزرار الأيقونية (موجودة وتبقى).
- وضع داكن متّسق عبر كل المكوّنات.

## ١٠. خطة المراحل (ترتيب التنفيذ)

1. **الأساس:** tokens (CSS vars) + الخط Cairo + ثيم Tailwind (ألوان دلالية، shadow-soft، keyframes) + base CSS.
2. **المكوّنات الأولية + الجديدة:** Button, Field, Input/Select, Modal, Sheet, Toast, EmptyState, Fab + Card, IconBadge/Avatar, StatTile, SegmentedControl, ProgressBar.
3. **AppShell:** nav بأيقونات + مؤشّر نشط + header + FAB + safe areas.
4. **Dashboard:** Hero BalanceCard + إعادة تنسيق كل الأقسام.
5. **بقية الصفحات والنماذج:** تطبيق النظام صفحةً صفحة.
6. **الصقل والتحقّق:** حركات، تمرير الوضع الداكن، حالات فارغة، ثم `npm run build` و`npm run test` و`npm run lint` للتأكد من عدم الكسر.

## ١١. معايير القبول

- مظهر فينتك مشرق ومرح متماسك عبر كل الصفحات (فاتح وداكن).
- شريط تنقّل سفلي بأيقونات ومؤشّر نشط، بطاقة رصيد بطل بارزة.
- خط Cairo مطبّق، حواف وظلال موحّدة، أهداف لمس مريحة، safe-area محترمة.
- لا كسر في المنطق: كل الاختبارات الحالية تنجح، البناء والـ lint نظيفان.
- احترام `prefers-reduced-motion` و RTL والوصولية AA.
