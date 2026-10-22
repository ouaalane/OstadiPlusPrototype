# تقرير حماية الشاشة — oustadi plus

تاريخ المراجعة: 22 أكتوبر 2026. التطبيق: Expo SDK 57، و`expo-screen-capture` المثبّت: 57.0.4.

## النتيجة وحدودها

تم تنفيذ حماية على مستوى التطبيق كله، وليست مقتصرة على مشغّل الفيديو. الهدف منع ظهور محتوى التطبيق في مسارات التقاط الشاشة العادية التي يحترم فيها النظام حماية النوافذ، وإيقاف الفيديو عند اكتشاف تسجيل/مشاركة الشاشة على iOS.

**لا يمكن ضمان منع كل أنواع التسجيل.** التطبيق لا يستطيع إيقاف كاميرا هاتف آخر، تسجيل الصوت بميكروفون خارجي، أو نظام معدّل/root/jailbreak يتجاوز الحماية. ولا يستطيع تعطيل مسجّل النظام أو منع تصوير التطبيقات الأخرى. قد يستمر ملف التسجيل مع صورة سوداء بدلاً من محتوى التطبيق.

حماية iOS من screenshot هنا تعتمد على تنفيذ Expo عبر secure text entry، وليست مكافئاً رسمياً عاماً ومضموناً لـ `FLAG_SECURE`. يجب التحقق منها على أجهزة وإصدارات iOS المستهدفة. لا توجد نتيجة اختبار فعلية على هاتف في هذه البيئة.

## البحث ومقارنة التقنيات

| التقنية | ما توفره | القرار |
| --- | --- | --- |
| Android `WindowManager.LayoutParams.FLAG_SECURE` | حماية نافذة التطبيق من screenshots ومسارات التسجيل/المشاركة التي تحترم السطح الآمن، ومن العرض على شاشة غير آمنة | مطبّق قبل إنشاء واجهة React، ويعاد تأكيده عند العودة للتطبيق |
| Android `allowAudioPlaybackCapture=false` | رفض التقاط صوت التطبيق عبر Audio Playback Capture | مطبّق في manifest بواسطة config plugin |
| Android `AudioManager.setAllowedCapturePolicy(ALLOW_CAPTURE_BY_NONE)` | سياسة صوت إضافية على مستوى التطبيق، بما فيها التقاط النظام وفق عقد Android | مطبّق على Android 10+، مع التحقق من السياسة بعد تعيينها |
| Expo iOS `preventScreenCapture` | secure canvas للـ screenshot، وغطاء أسود عند `UIScreen.isCaptured` | مطبّق، مع إعادة المحاولة إن لم تكن نافذة iOS جاهزة |
| iOS capture-state observation | معرفة أن الشاشة يجري تسجيلها أو عكسها؛ ليس اكتشاف screenshot قبل حدوثه | وحدة Swift أصلية تغطي التسجيل الموجود قبل فتح التطبيق والتغيرات أثناءه |
| Expo iOS app-switcher protection | إخفاء/تمويه المحتوى عند مغادرة التطبيق، Control Center والمقاطعات | مفعّل بأقصى شدة، مع غطاء React معتم إضافي |
| screenshot callbacks | إشعار بعد محاولة/حدوث screenshot، حسب المنصة؛ ليست بحد ذاتها منعاً | بقيت لإعادة تحريك watermark؛ لا نطلب صلاحية معرض الصور لأجلها على Android القديم |
| watermark | ردع وربط تسريب بكود تتبع عند وجود السيرفر | بقيت كما هي؛ لا تعوّض منع الالتقاط |
| Widevine / FairPlay DRM | فيديو مشفّر وتراخيص تشغيل ومسار فك تشفير محمي وفق الجهاز | غير مطبّق هنا: يتطلب تغليف الوسائط وخادم تراخيص؛ ليس حماية عامة لـ PDF/الكويز |

### Android: هل تعمل الحماية في الـ kernel؟

لا نعدّل kernel ولا نحتاج root. وحدة Kotlin تضبط `FLAG_SECURE` على نافذة الـ Activity. يمر الطلب إلى Window Manager ونظام تركيب/عرض الأسطح. توضح شفرة AOSP أن السطح الآمن يستبعد من نسخ محتواه عبر مسارات الالتقاط العادية. هذا **تنفيذ داخل التطبيق يعتمد على إنفاذ نظام التشغيل**، وليس مجرد مستطيل React يغطي الشاشة، وليس patch للنواة.

يضيف config plugin العلم قبل `super.onCreate` لكي يكون موجوداً قبل تركيب React. تعيد الوحدة الأصلية ضبطه قبل فتح المحتوى وعند العودة من الخلفية. مصدر React Native المثبّت يورّث `FLAG_SECURE` إلى نافذة `Modal` عندما يكون مضبوطاً على الـ Activity.

حماية الصورة لا تعني تلقائياً حماية الصوت؛ لذلك أضفنا سياسة الصوت في manifest وعبر `AudioManager`. وفق AOSP، تطبق السياسة الأكثر تقييداً بين مستوى التطبيق ومستوى المسار الصوتي. هذا لا يمنع ميكروفوناً يلتقط صوت السماعة من الخارج.

### iOS: ماذا يحدث فعلياً؟

تنفيذ Expo SDK 57 الذي تمت مراجعته:

1. ينشئ `UITextField` بخاصية `isSecureTextEntry=true`.
2. يعيد وضع طبقة النافذة داخل طبقة canvas الخاصة بالحقل الآمن، للاستفادة من إخفاء النظام لمحتواه أثناء الالتقاط.
3. يراقب `UIScreen.capturedDidChangeNotification` و`isCaptured`، ويضع غطاء أسود أثناء التسجيل/العرض المعكوس.

استخدام secure text entry لحماية **نافذة كاملة** يعتمد على تفاصيل بنية طبقات UIKit التي لا تضمن Apple ثباتها لهذا الاستخدام العام. نجاح استدعاء Expo يؤكد تركيب آليته، وليس شهادة بأن كل مسار التقاط في كل نسخة iOS أصبح مستحيلاً. يلزم فحص التحديثات واختبار الأجهزة؛ وكذلك لا يمكن ضمان قبول App Review أو توافق الإصدارات المستقبلية بمجرد هذا التنفيذ.

أضفنا وحدة Swift تراقب حالة الشاشات المتصلة أيضاً. يصل الحدث إلى React ليغطي التطبيق ويوقف المشغّل. عند انتهاء التسجيل يزال الغطاء، لكن الفيديو **لا يستأنف تلقائياً** إذا كان يعمل قبل التسجيل. إشعارات screenshot تأتي بعد وقوعه؛ لا ندّعي أنها تستطيع حذف الصورة أو استرجاعها.

المسار هنا UIKit/Core Animation وآليات العرض الأصلية وحدث من النظام، **وليس تغيير kernel أو سيطرة على أدوات التسجيل الأخرى**. مراقبة `UIScreen` مستخدمة أيضاً داخل Expo الحالي؛ بعض واجهاتها أصبحت deprecated في iOS الأحدث، ولذلك يجب مراجعة بدائل scene capture عند ترقية SDK، دون افتراض عقد أحدث لم نختبره.

## ما تغير في التطبيق

- `CaptureProtectionBoundary` في الجذر يغطي جميع الصفحات: الفيديو وPDF والكويز والملف الشخصي وغيرها.
- لا يركّب محتوى التطبيق قبل تأكيد تفعيل الحماية الأصلية. إذا فشل التفعيل أو غابت الوحدة، يبقى المحتوى محجوباً مع رسالة وإمكانية إعادة المحاولة.
- لا يوجد استثناء للمحاكي، ولا تعطيل للحماية عند الخروج من الفيديو أو التنقل بين الصفحات.
- يعاد التحقق عند الرجوع للمقدمة؛ النتائج القديمة لطلبات غير مكتملة لا تفتح المحتوى بعد دخول الخلفية.
- عند اكتشاف التسجيل على iOS، يحجب المحتوى وتوقف قراءة الفيديو، وتمنع اللمسات/الوصول إلى عناصر المحتوى خلف الغطاء.
- حماية app switcher في iOS أصلية، وتضاف إليها طبقة معتمة عند تغير حالة التطبيق.
- لا نطلب صلاحيات إضافية لمعرض الصور لتفعيل المنع. المراقبة المساعدة للـ screenshots تستخدم iOS وAndroid 14+ فقط.
- تبقى الواجهة العادية والتنقل ومحتوى الدروس كما هي بعد نجاح التفعيل.

نافذة منتقي الصور أو واجهة نظام خارج التطبيق ليست نافذة محتوى التطبيق؛ لا ندّعي التحكم في تصوير واجهات النظام الأخرى. كذلك الفيديوهات الحالية ملفات MP4 متاحة للتطبيق، وبعضها مضمن في الحزمة: منع تصوير الشاشة **لا يشفّر الملفات ولا يمنع استخراجها من الحزمة**. حماية التوزيع للإنتاج تحتاج مصادقة وخادماً ووسائط مشفرة/DRM، ولا يزيل ذلك احتمال التصوير بكاميرا أخرى.

## مواضع التنفيذ

- [حد الحماية في جذر التطبيق](../apps/student-app/src/components/CaptureProtectionBoundary.tsx) و[ربطه بـ App](../apps/student-app/App.tsx).
- [منطق الحالة والسباقات](../apps/student-app/src/lib/capture-protection-controller.ts) و[الجسر الأصلي](../apps/student-app/src/lib/capture-protection.ts).
- [وحدات Kotlin وSwift وإعداد ربطها](../apps/student-app/modules/capture-protection).
- [إعداد Android قبل تشغيل React](../apps/student-app/plugins/withCaptureProtection.js).
- [المشغّل وإيقاف القراءة عند الحجب](../apps/student-app/src/components/LessonPlayer.tsx)، وإزالة الحماية القديمة المحدودة بصفحة الفيديو من [VideoScreen](../apps/student-app/src/screens/VideoScreen.tsx).
- إعدادات البناء في `app.json` و`package.json` و`eas.json` داخل `apps/student-app`.
- [اختبارات الحماية](../apps/student-app/scripts/test-capture-protection.cjs).

## البناء والتجربة

**يجب بناء نسخة native جديدة.** تحديث JavaScript أو إعادة تحميل Expo Go لا يضيف وحدة Swift/Kotlin أو إعداد manifest. النسخة القديمة وExpo Go سيعرضان شاشة تطلب النسخة الأصلية الجديدة، بدلاً من إظهار محتوى بلا حماية.

من جذر المستودع:

```sh
git pull
cd apps/student-app
npm ci
```

Android محلياً، مع Android SDK مثبت:

```sh
npx expo prebuild --platform android --no-install
npx expo run:android
```

نشغّل prebuild صراحة حتى لو كان مجلد Android موجوداً سابقاً، لتطبيق إعدادات العلم والصوت الجديدة. لم نستخدم `--clean` حتى لا نحذف مجلدات native محلية.

iOS محلياً يحتاج macOS وXcode:

```sh
npx expo prebuild --platform ios
npx expo run:ios --device
```

أو بناء سحابي من داخل `apps/student-app` باستعمال ملف `eas.json` المضاف:

```sh
npx eas-cli@latest build --profile preview --platform android
npx eas-cli@latest build --profile preview --platform ios
```

بناء Android التجريبي ينتج APK. يتطلب EAS حساباً وإعداد المشروع؛ توزيع iOS على جهاز يحتاج توقيع Apple وتسجيل الأجهزة المناسب. لم يتم تشغيل بناء سحابي مدفوع أو إنشاء بيانات توقيع ضمن هذه المهمة.

## التحقق المنجز مقابل ما يحتاج هاتفاً

تم التحقق آلياً من منطق الانتظار حتى تأكيد الحماية، غياب الوحدة، فشل التفعيل وإعادة المحاولة، التسجيل الموجود عند البداية، تغير الحالة، السباق بين الأحداث والطلبات، الخلفية/العودة، تنظيف المستمعين، وإدخال `FLAG_SECURE` قبل React دون تكراره. تحققت أدوات Expo أيضاً من تسجيل الوحدتين في Android/iOS ومن قيمة manifest الخاصة بالصوت.

النتائج في هذه البيئة: نجحت **15 حالة لحماية الشاشة** و**17 حالة للمشغّل والدوران**. نجح اختبار الفيديوهات الـ32 في المتصفح بعد التغييرات، وتم توليد حزم JavaScript لكل من Android وiOS. نجح typecheck وlint دون أخطاء، مع 44 تحذيراً موجوداً في المشروع.

الأوامر القابلة لإعادة التشغيل:

```sh
node --test apps/student-app/scripts/test-capture-protection.cjs
node --test apps/student-app/scripts/test-player-controls.cjs apps/student-app/scripts/test-video-rotation.cjs
node scripts/check-video-watermarks.mjs
cd apps/student-app
npx tsc --noEmit
npm run lint
```

اختبار watermark يشغل الفيديوهات فعلياً في المتصفح ويتصل بـ API وسجل SQLite؛ **لا يثبت إنفاذ Android/iOS لمنع الالتقاط**. المتصفح لا يوفر هذه الحماية ولا يتم حجب معاينة الويب بادعاء حمايتها.

لا تتوفر هنا أجهزة Android/iOS أو Android SDK/Xcode لبناء وتشغيل Kotlin/Swift وفحص الناتج الأصلي. توليد حزم JavaScript والتحقق من autolinking ليسا بناء APK/IPA ولا اختبار screenshot حقيقياً. **القبول على الجهاز لم ينجز بعد.**

### قائمة قبول ضرورية على الأجهزة

| التجربة | النتيجة المطلوبة | الحالة هنا |
| --- | --- | --- |
| Android: power/volume، gestures، لقطة الشاشة أثناء الفيديو وPDF والكويز وModal | رفض الالتقاط أو إخفاء محتوى النافذة | لم تختبر على جهاز |
| Android: مسجّل النظام ومسجّل MediaProjection، قبل فتح التطبيق وبعده، portrait/landscape | محتوى التطبيق غير قابل للقراءة في التسجيل | لم تختبر على جهاز |
| Android 10+: تسجيل internal audio مع درس مسموع | صوت التطبيق غير موجود في المسار الرقمي الملتقط | لم تختبر على جهاز |
| iOS: screenshot بالأزرار وAssistiveTouch وBack Tap، فيديو وPDF وModal | إخفاء المحتوى المحمي؛ سجل أي استثناء حسب الجهاز/الإصدار | لم تختبر على جهاز |
| iOS: تسجيل Control Center يبدأ قبل التطبيق وأثناء الدرس | حجب المحتوى وتوقف الفيديو، وعدم استئنافه تلقائياً | لم تختبر على جهاز |
| iOS: QuickTime عبر USB وAirPlay/مشاركة الشاشة | رصد capture state وحجب المحتوى حيث يبلّغ النظام عنه | لم تختبر على جهاز |
| المنصتان: app switcher، مكالمة، خلفية ثم عودة وروتيشن | لا تظهر معاينة الدرس؛ لا تنفك الحماية بعد الرجوع | لم تختبر على جهاز |
| فشل الوحدة الأصلية أو نسخة قديمة | شاشة خطأ محجوبة، دون فتح الدروس | منطق الحالة اختبر آلياً |

اختبر Release APK/IPA على هواتف فعلية من الإصدارات والشركات المستهدفة. نتيجة محاكي، وخاصة عرض الفيديو الأسود بسبب سطح آمن، لا تكفي للحكم على الهاتف.

## المصادر التي تمت مراجعتها

مصادر ويب أولية متاحة تم جلبها، إلى جانب شفرة الحزم المثبّتة:

1. [توثيق Expo ScreenCapture، فرع SDK 57](https://github.com/expo/expo/blob/sdk-57/docs/pages/versions/unversioned/sdk/screen-capture.mdx): المنع مقابل callback ومتطلبات صلاحيات Android.
2. [Expo Swift ScreenCaptureModule](https://github.com/expo/expo/blob/sdk-57/packages/expo-screen-capture/ios/ScreenCaptureModule.swift): حجب التسجيل، أخطاء تركيب النافذة، وapp-switcher privacy.
3. [Expo SecureWindowCanvas](https://github.com/expo/expo/blob/sdk-57/packages/expo-screen-capture/ios/SecureWindowCanvas.swift): تنفيذ secure text entry الفعلي.
4. [Expo Kotlin ScreenCaptureModule](https://github.com/expo/expo/blob/sdk-57/packages/expo-screen-capture/android/src/main/java/expo/modules/screencapture/ScreenCaptureModule.kt): استدعاء `window.addFlags(FLAG_SECURE)` مقابل كشف screenshot.
5. [AOSP WindowManager](https://github.com/aosp-mirror/platform_frameworks_base/blob/main/core/java/android/view/WindowManager.java): عقد `FLAG_SECURE`.
6. [AOSP SurfaceControl](https://github.com/aosp-mirror/platform_frameworks_base/blob/main/core/java/android/view/SurfaceControl.java): معنى secure surface، وحدوده مقارنة بـ protected buffers.
7. [AOSP AudioManager](https://github.com/aosp-mirror/platform_frameworks_base/blob/main/media/java/android/media/AudioManager.java) و[AudioAttributes](https://github.com/aosp-mirror/platform_frameworks_base/blob/main/media/java/android/media/AudioAttributes.java): سياسات التقاط الصوت وتطبيق الأكثر تقييداً.
8. مصدر React Native المثبّت: `ReactAndroid/src/main/java/com/facebook/react/views/modal/ReactModalHostView.kt`، لتوريث secure flag إلى Modal.

مراجع Apple وAndroid العامة لمراجعة الأجهزة والسياسات:

- [Apple UIScreen.isCaptured](https://developer.apple.com/documentation/uikit/uiscreen/iscaptured)
- [Apple capturedDidChangeNotification](https://developer.apple.com/documentation/uikit/uiscreen/captureddidchangenotification)
- [Apple FairPlay Streaming](https://developer.apple.com/streaming/fps/)
- [Android: secure sensitive activities](https://developer.android.com/security/fraud-prevention/activities)

تعذّر جلب صفحات Apple وAndroid الحية من هذه البيئة بسبب HTTP 403. لذلك لم ننسب إليها نصوصاً قرأناها مباشرة؛ اعتمد التحقيق التنفيذي على مصادر Expo وAOSP الأولية المتاحة أعلاه، مع تمييز حدود الاستنتاج عن ضمانات النظام.
