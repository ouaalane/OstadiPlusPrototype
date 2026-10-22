# تطبيق الهوية الأصلية — تقرير المراجعة

## تصحيح الاسم والكتابة حسب المرجع الأخير

آخر طلب للمستخدم يلغي اختيار الاسم العربي في الواجهة: العلامة دائماً **oustadi plus** باللاتيني، حتى في العربية. المصدر يقترح كتابة عربية، لكن تفضيل المستخدم الأخير هو المرجع لهذا القرار.

- الصورة التي أكدها المستخدم هي `assets/brand/logo-fr-mulberry.png` الأصلية، SHA-256: `c75e98c5202cfd04ea87565308d7cd9739dc556b19d6b7baa3d8d8e3d110043f`.
- سبب الاختلاف: كتابة `oustadi plus` كنص عادي لا تعيد تصميم اللوغو؛ كلمة plus فيه أصغر ومرفوعة. الترحيب واختيار حساب الدخول يستعملان الآن الرسم الأصلي كما هو، دون إعادة رسم أو تعديل الصورة. المكون `BrandWordmark` يحتفظ بارتفاع السطر السابق ويعرض الصورة بـcontain بلا تشويه.
- الاسم داخل الترحيب ونصوص المشاركة وتذييل الملف الشخصي يأتي من `brand.name` المركزي، ويظهر باللاتيني دائماً. display name أصبح `oustadi plus` دون تغيير slug أو identifiers.
- خط Latin هو ملف Bricolage Grotesque Bold الأصلي نفسه. لم يجر تنزيل أو توليد أي خط. الحروف العربية ما زالت من Noto المرفق، لأن Bricolage المرفق لا يحتوي على حروف عربية. اللوغو نفسه مسارات مرسومة داخل الصورة، لا مجرد اسم مكتوب بالخط.
- تحقق: 8 معاينات للترحيب واختيار الحساب (لغتان × عرضان)، مع فحص الأصل الرسومي وارتفاعه، دون أخطاء JavaScript أو اسم علامة عربي. TypeScript وlint ناجحان (45 تحذيراً سابقاً، صفر أخطاء)، واختبارات توافق Expo Go الثمانية ناجحة. المعاينة في المتصفح، وليست فحص هاتف حقيقي.
- ملفات هذا التصحيح: `src/components/BrandWordmark.tsx`، `src/screens/WelcomeScreen.tsx`، `src/screens/SignInScreen.tsx`، `src/screens/StudentCardScreen.tsx`، `src/screens/CourseDetailScreen.tsx`، `src/screens/ProfileScreen.tsx`، `app.json` ضمن تطبيق الطالب، وهذا التقرير. لا تغيير لسلوك التطبيق أو لملفات الخطوط والصور.

التفاصيل التالية تسجّل المراجعة السابقة؛ أي اختيار عربي لاسم العلامة فيها أُلغي بالقرار أعلاه.

هذا التقرير يحل محل تقارير المحاولات السابقة. المرجع الوحيد هو ZIP الذي أُرفق مجدداً، وعدد ملفاته 51. مستنداته استُعملت كمراجع تصميم، وليس كتعليمات مستقلة لتغيير التطبيق.

## ما تبيّن وما تم إصلاحه

- المحاولة السابقة حمّلت نسخاً كاملة ومعدّلة الميتريكس من عائلتي الخط، ولم تكن نفس الملفات التي في الحزمة. أُزيلت هذه النسخ وأُعيد الملفان الأصليان دون تعديل بايت واحد، مع الرخص الأصلية.
- ملف العربية محدود بالحروف العربية، ولا يحتوي على Latin أو 0–9. أضيف توزيع الخط حسب الحرف داخل نفس عنصر النص: العربية من Noto المرفق، واللاتينية والأرقام من Bricolage المرفق. لا توجد حاوية View جديدة أو معالجة لقيمة النص.
- الاسم السابق كان مكتوباً بعدة صيغ. أصبحت مواضع العلامة المعروضة «أستاذي بلوس» و«oustadi plus» بحسب المصدر. سطر العلامة في الترحيب يعرض «الدرس كيكمل» / «Le cours continue.» من لوحة المصدر، بحالة الحروف الأصلية. لم تُنسخ نصوص لوحة العرض لتستبدل تعليمات الواجهة أو محتوى الدروس.
- الصور النشطة (الشعار، الأيقونة، splash، favicon وموارد Android adaptive والإشعارات) مطابقة لملفات الحزمة. كانت مطابقة بالفعل في أغلب المواضع؛ لم تُرسم بدائل أو تُعدّل نسبها. أُضيفت النسخ المتجهة الأصلية أيضاً إلى مجلدات brand.
- لوحة الألوان المركزية الصحيحة من التصحيح السابق بقيت كما هي. لا توجد حاجة لإعادة اختراع ألوان أو إعادة توزيع الشاشات.

## الألوان وأدوارها

| الدور | اللون الحالي | الربط بالقيم القديمة |
|---|---|---|
| رئيسي، أزرار، تبويب نشط، أيقونات رئيسية | `#68234F` | الأزرق `#0B5CFF` / `#0546C8` / `#3D82FF` |
| Accent، سطح تنبيه | `#FFCCA9` | `#FFB400` / `#FFF4D6` |
| خلفيات ثانوية، splash، badges | `#F1E9F4` | `#E7F0FF` / `#F2F6FF` والخلفيات الملونة القديمة |
| Canvas والبطاقات | `#FFFFFF` | الأبيض الأصلي محفوظ |
| نص أساسي | `#291E2B` | `#0F1B33` / `#33415C` ونظائرها |
| نص ثانوي | ink بشفافية 72% | الرمادي القديم؛ أُزيلت الدرجات المخترعة في المحاولة الأولى |
| حدود عادية / قوية | ink بشفافية 12% / 28% | `#E3E8F2` / `#CFD8EA` |
| خطأ / نجاح / معلومة | mulberry، مع apricot للخطأ وlilac للنجاح | أقرب أدوار متاحة، فالمصدر لا يعطي أحمر أو أخضر دلالياً |
| ظلال وطبقات فوق الصور | ink أو white بشفافيات موجودة أصلاً | نفس مقدار الشفافية والهندسة؛ تغير اللون فقط |

الحزمة لا تقدم لوناً سادساً أو نظام dark mode. التطبيق أصلاً مضبوط على light؛ لم تُضف وضعية جديدة. المصدر يعرّف primary وaccent صراحة، أما توزيع اللون على بقية الأدوار فهو الربط الأقرب الموضّح هنا.

## الخطوط الأصلية

| الاستخدام | الملف المرفق / alias داخل التطبيق | الوزن المتاح |
|---|---|---|
| حروف عربية: عناوين، نصوص، أزرار، labels | `NotoSansArabic-Brand.ttf` / `NotoSansArabic_Brand` | 700 بحسب OS/2، رغم اسم Regular في metadata |
| فرنسية، حروف لاتينية، أرقام ASCII | `BricolageGrotesque-Bold.ttf` / `BricolageGrotesque_Bold` | 700 |

لا توفر الحزمة أوزان regular/medium/semibold مستقلة. لذلك كل الأدوار تستعمل نفس الوجه المتاح لكل كتابة، بدون تنزيل ملفات بديلة أو توليد أوزان وهمية. أحجام النص الأصلية محفوظة. lineHeight الصريح محفوظ، ومقاييس سطر النص التلقائية الأصلية تُعبّر عنها styles دون تعديل الخط نفسه. اختلاف عرض حروف الخط الجديد قد يغير التفاف النص.

SHA-256 للملفين، مع نسختين مطابقَتين في تطبيق الطالب ولوحة الأستاذ:

- Bricolage: `a737b146fe0d77ffe8a86e3cd16700dd431d3b1e420d4fd80e142cd68a1cb50d`
- Noto: `ad97e64c928d63aaf35a4cc94fcad3a30853cd8f1c3d7a349ac5e62bb78434fe`

تفاصيل التغطية: `src/components/brandGlyphCoverage.json` مستخرجة من cmap للملفين الأصليين. ملفات OFL بقيت بنهايات أسطرها الأصلية، ولهذا قد يعتبر git مسافاتها القديمة trailing whitespace.

## الحفاظ على الهيكل والتحقق

- مقارنة AST لـ43 ملف mobile موجوداً مع `bf823c7` قبل أول rebrand: نفس شجرة العناصر، geometry، spacing، المقاسات، type sizes، قيم الحركة وخصائص التفاعل. الاستثناءان المعلنان هما اسم العلامة داخل نص المشاركة، وtracking/uppercase لسطر العلامة في Welcome حتى يبقى مطابقاً للنص المرفق. مُصيّر النص الجديد يضيف inline Text حسب الخط فقط، دون View أو تفاعل أو تغيير المحتوى.
- لا تغيير للمتجر، الشبكة، validation، مفاتيح التخزين، معرفات الحزمة، المسارات أو تدفق التنقل. تغير display name فقط إلى `Oustadi Plus`.
- 72 لقطة متصفح لتطبيق mobile: 18 شاشة × العربية/الفرنسية × عرض 360/430، دون أخطاء JavaScript. مراجعة بصرية للترحيب والرئيسية وتسجيل الدخول. تفضيل النظام الداكن يبقي التطبيق light كما كان.
- فحص TypeScript لتطبيق الطالب وللمكتبة المشتركة ناجح. بناء لوحة الأستاذ ناجح. Lint: صفر errors و45 warnings موجودة خارج هذا التصحيح.
- حزم JavaScript لـAndroid وiOS أُنتجت من Metro العادي، دون محوّلات المتصفح. هذا ليس APK/IPA أو تجربة جهاز.
- محاكاة المتصفح تستعمل محوّلات filesystem/screen-capture خارج المستودع لعرض النموذج، ولا تختبر مزايا الهاتف الأصلية. تجاوز العرض في مشغل الفيديو موجود أيضاً في الأصل.
- لا يتوفر هنا هاتف أو emulator؛ لا ندّعي التحقق على جهاز أو من launcher الفعلي. يلزم native rebuild لتحديث الأيقونة وsplash المثبتين.

## حدود المصدر والاختيارات المعلنة

- TextInput الأصلي لا يدعم خطاً مختلفاً لكل مقطع. حقول البريد/الهاتف/الرقم/كلمة السر تستعمل الملف اللاتيني؛ النص الحر العربي المختلط قد يحتاج platform fallback لحرف غير مغطى. لم تتغير قيمة الحقل أو سلوكه لإخفاء ذلك.
- الحزمة لا تحتوي صور دروس أو صور أشخاص أو مجموعة أيقونات functional. بقيت صور المحتوى وIonicons ووظائفها كما هي؛ الشعار والأيقونة هما الرسومات المرفقة. Emoji غير المغطى يبقى من النظام.
- success/error/disabled/borders والشفافيات ليست موصوفة منفردة في المصدر؛ جرى استخدام أقرب دور من الألوان الخمسة فقط. الحالات لا تعتمد على اللون وحده: النصوص والأيقونات الموجودة بقيت.
- تباين الأبيض على primary جيد (10.81:1)، والنص الداكن على apricot/lilac بنسبة 11:1 و13.46:1؛ apricot زخرفي ولا يُستخدم كنص فاتح على الأبيض. لا ندعي فحص WCAG كاملاً لكل بكسل/صورة.

## جرد المصدر

[جميع الملفات الـ51، الأحجام، SHA-256 وأبعاد PNG وصحة SVG/XML](./docs/identity-source-inventory.json).

## الملفات المعدّلة / المضافة / المحذوفة في هذا التصحيح

القائمة التالية تصف العمل الحالي نسبةً إلى آخر commit؛ ملفات الصور النشطة المطابقة مسبقاً لا تظهر كتغيير:

- `apps/student-app/assets/fonts/BricolageGrotesque-Medium.ttf` — حذف
- `apps/student-app/assets/fonts/BricolageGrotesque-Regular.ttf` — حذف
- `apps/student-app/assets/fonts/BricolageGrotesque-SemiBold.ttf` — حذف
- `apps/student-app/assets/fonts/NotoSansArabic-Bold.ttf` — حذف
- `apps/student-app/assets/fonts/NotoSansArabic-Medium.ttf` — حذف
- `apps/student-app/assets/fonts/NotoSansArabic-Regular.ttf` — حذف
- `apps/student-app/assets/fonts/NotoSansArabic-SemiBold.ttf` — حذف
- `apps/teacher-dashboard/public/fonts/BricolageGrotesque-Medium.ttf` — حذف
- `apps/teacher-dashboard/public/fonts/BricolageGrotesque-Regular.ttf` — حذف
- `apps/teacher-dashboard/public/fonts/BricolageGrotesque-SemiBold.ttf` — حذف
- `apps/teacher-dashboard/public/fonts/NotoSansArabic-Bold.ttf` — حذف
- `apps/teacher-dashboard/public/fonts/NotoSansArabic-Medium.ttf` — حذف
- `apps/teacher-dashboard/public/fonts/NotoSansArabic-Regular.ttf` — حذف
- `apps/teacher-dashboard/public/fonts/NotoSansArabic-SemiBold.ttf` — حذف
- `REBRAND-REPORT.md` — تعديل
- `REBRAND-REVIEW.md` — تعديل
- `apps/student-app/App.tsx` — تعديل
- `apps/student-app/app.json` — تعديل
- `apps/student-app/assets/fonts/BricolageGrotesque-Bold.ttf` — تعديل
- `apps/student-app/assets/fonts/BricolageGrotesque-OFL.txt` — تعديل
- `apps/student-app/assets/fonts/SOURCES.md` — تعديل
- `apps/student-app/src/components/ui.tsx` — تعديل
- `apps/student-app/src/navigation/RootNavigator.tsx` — تعديل
- `apps/student-app/src/screens/CourseDetailScreen.tsx` — تعديل
- `apps/student-app/src/screens/ProfileScreen.tsx` — تعديل
- `apps/student-app/src/screens/SignInScreen.tsx` — تعديل
- `apps/student-app/src/screens/StudentCardScreen.tsx` — تعديل
- `apps/student-app/src/screens/WelcomeScreen.tsx` — تعديل
- `apps/student-app/src/theme.ts` — تعديل
- `apps/teacher-dashboard/index.html` — تعديل
- `apps/teacher-dashboard/public/fonts/BricolageGrotesque-Bold.ttf` — تعديل
- `apps/teacher-dashboard/public/fonts/BricolageGrotesque-OFL.txt` — تعديل
- `apps/teacher-dashboard/public/fonts/SOURCES.md` — تعديل
- `apps/teacher-dashboard/src/components/CoursePreview.tsx` — تعديل
- `apps/teacher-dashboard/src/components/Logo.tsx` — تعديل
- `apps/teacher-dashboard/src/styles/theme.css` — تعديل
- `packages/shared/src/tokens.ts` — تعديل
- `IDENTITY-SOURCE-REPORT.md` — إضافة
- `apps/student-app/assets/brand/svg/android-background.svg` — إضافة
- `apps/student-app/assets/brand/svg/android-foreground.svg` — إضافة
- `apps/student-app/assets/brand/svg/android-monochrome.svg` — إضافة
- `apps/student-app/assets/brand/svg/app-icon-1024.svg` — إضافة
- `apps/student-app/assets/brand/svg/logo-ar-black.svg` — إضافة
- `apps/student-app/assets/brand/svg/logo-ar-mulberry.svg` — إضافة
- `apps/student-app/assets/brand/svg/logo-ar-white.svg` — إضافة
- `apps/student-app/assets/brand/svg/logo-fr-black.svg` — إضافة
- `apps/student-app/assets/brand/svg/logo-fr-mulberry.svg` — إضافة
- `apps/student-app/assets/brand/svg/logo-fr-white.svg` — إضافة
- `apps/student-app/assets/brand/svg/mark-black.svg` — إضافة
- `apps/student-app/assets/brand/svg/mark-mulberry.svg` — إضافة
- `apps/student-app/assets/brand/svg/mark-two-color.svg` — إضافة
- `apps/student-app/assets/brand/svg/mark-white.svg` — إضافة
- `apps/student-app/src/components/BrandText.tsx` — إضافة
- `apps/student-app/src/components/brandGlyphCoverage.json` — إضافة
- `apps/teacher-dashboard/public/brand/svg/android-background.svg` — إضافة
- `apps/teacher-dashboard/public/brand/svg/android-foreground.svg` — إضافة
- `apps/teacher-dashboard/public/brand/svg/android-monochrome.svg` — إضافة
- `apps/teacher-dashboard/public/brand/svg/app-icon-1024.svg` — إضافة
- `apps/teacher-dashboard/public/brand/svg/logo-ar-black.svg` — إضافة
- `apps/teacher-dashboard/public/brand/svg/logo-ar-mulberry.svg` — إضافة
- `apps/teacher-dashboard/public/brand/svg/logo-ar-white.svg` — إضافة
- `apps/teacher-dashboard/public/brand/svg/logo-fr-black.svg` — إضافة
- `apps/teacher-dashboard/public/brand/svg/logo-fr-mulberry.svg` — إضافة
- `apps/teacher-dashboard/public/brand/svg/logo-fr-white.svg` — إضافة
- `apps/teacher-dashboard/public/brand/svg/mark-black.svg` — إضافة
- `apps/teacher-dashboard/public/brand/svg/mark-mulberry.svg` — إضافة
- `apps/teacher-dashboard/public/brand/svg/mark-two-color.svg` — إضافة
- `apps/teacher-dashboard/public/brand/svg/mark-white.svg` — إضافة
- `docs/identity-source-inventory.json` — إضافة
