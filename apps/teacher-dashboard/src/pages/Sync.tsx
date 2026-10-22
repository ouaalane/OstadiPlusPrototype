import { useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  CircleHelp,
  Computer,
  Link2,
  LoaderCircle,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { useStore } from '@/store/DemoStore';
import {
  demoEndpoint,
  saveDemoEndpoint,
  publishDemo,
  pullDemo,
} from '@/lib/demo-sync';
export default function Sync() {
  const { state, dispatch, notify } = useStore();
  const [endpoint, setEndpoint] = useState(demoEndpoint);
  const [busy, setBusy] = useState<'publish' | 'pull' | null>(null);
  const [last, setLast] = useState('');
  const [error, setError] = useState('');
  async function run(direction: 'publish' | 'pull') {
    setBusy(direction);
    setError('');
    try {
      saveDemoEndpoint(endpoint);
      const data =
        direction === 'publish' ? await publishDemo(state) : await pullDemo();
      dispatch({ type: 'replace', state: { ...data, lang: state.lang } });
      setLast(new Date().toLocaleTimeString('ar-MA'));
      notify(
        direction === 'publish'
          ? 'تم نشر التحديثات لتطبيق التلميذ'
          : 'تم جلب أسئلة التلاميذ وتقدّمهم',
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'تعذّرت المزامنة. حاول مجدداً.',
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <div className="mb-8">
        <p className="section-kicker">من مساحتك إلى تطبيق التلميذ</p>
        <h1 className="workspace-title">النشر والمزامنة</h1>
        <p className="workspace-subtitle">
          خلي الدروس والتفعيل والأجوبة محدّثة، واستقبل أسئلة التلاميذ ونتائجهم.
        </p>
      </div>
      <div className="workspace-panel mb-6 flex flex-wrap items-center justify-between gap-5 px-6 py-5">
        <div className="flex items-center gap-4">
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Computer size={22} strokeWidth={1.4} />
          </span>
          <div>
            <p className="text-xs font-bold">مساحة الأستاذ</p>
            <p className="mt-1 text-[10px] text-muted">
              {state.courses.length} دورات · {state.students.length} تلاميذ
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-3 text-line-strong sm:flex">
          <span className="h-px w-12 bg-line" />
          <RefreshCw size={18} />
          <span className="h-px w-12 bg-line" />
        </div>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs font-bold">تطبيق التلميذ</p>
            <p className="mt-1 text-[10px] text-muted">
              دروس، أسئلة، تقدّم ونتائج
            </p>
          </div>
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent/35 text-brand">
            <Smartphone size={22} strokeWidth={1.4} />
          </span>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="workspace-panel p-6">
          <span className="mb-5 flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <ArrowUpFromLine size={20} />
          </span>
          <h2 className="text-base font-bold">انشر ما حضّرته</h2>
          <p className="mt-3 text-xs leading-8 text-muted">
            الدروس، الصور المصغّرة، الكويز، تفعيل الاشتراكات وردودك على الأسئلة
            كيمشيو لخادم المركز.
          </p>
          <ul className="my-5 space-y-2 text-[10px] text-muted">
            {[
              'الدروس المنشورة ومعلومات الدورة',
              'إعدادات التفعيل والاشتراك',
              'أجوبة الأستاذ على الأسئلة',
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-brand" />
                {t}
              </li>
            ))}
          </ul>
          <button
            className="btn btn-primary w-full"
            disabled={!!busy}
            onClick={() => void run('publish')}
          >
            {busy === 'publish' ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : (
              <ArrowUpFromLine size={15} />
            )}
            نشر التحديثات للتطبيق
          </button>
        </section>
        <section className="workspace-panel p-6">
          <span className="mb-5 flex size-10 items-center justify-center rounded-xl bg-accent/35 text-brand">
            <ArrowDownToLine size={20} />
          </span>
          <h2 className="text-base font-bold">استقبل آخر المستجدات</h2>
          <p className="mt-3 text-xs leading-8 text-muted">
            اجلب الأسئلة، التقدّم ومحاولات الاختبار اللي زامنها التلميذ من
            تطبيقه، وتابعها من مساحتك.
          </p>
          <ul className="my-5 space-y-2 text-[10px] text-muted">
            {[
              'حسابات وطلبات التلاميذ الجديدة',
              'الأسئلة وتقدّم مشاهدة الدروس',
              'الاختبارات المكتملة ونتائجها',
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-brand" />
                {t}
              </li>
            ))}
          </ul>
          <button
            className="btn btn-outline w-full"
            disabled={!!busy}
            onClick={() => void run('pull')}
          >
            {busy === 'pull' ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : (
              <ArrowDownToLine size={15} />
            )}
            جلب تحديثات التلاميذ
          </button>
        </section>
      </div>
      {error ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-brand/20 bg-accent/25 p-5"
        >
          <p className="text-xs leading-7">{error}</p>
          <p className="mt-2 text-[10px] text-muted">
            تحقق من الرابط، ومن تشغيل خادم العرض بالأمر npm run demo.
          </p>
        </div>
      ) : null}
      {last ? (
        <p
          role="status"
          className="mt-5 flex items-center gap-2 text-[11px] text-brand"
        >
          <CheckCircle2 size={15} />
          آخر مزامنة: {last} · في هذه الجلسة
        </p>
      ) : null}
      <section className="workspace-panel mt-6">
        <header className="panel-heading">
          <h2 className="flex items-center gap-2">
            <Link2 size={16} className="text-brand" />
            رابط المركز
          </h2>
          <span className="text-[9px] text-muted">إعداد الربط</span>
        </header>
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <label className="label" htmlFor="demo-url">
              رابط خادم العرض التجريبي
            </label>
            <input
              id="demo-url"
              className="input"
              dir="ltr"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="http://192.168.1.10:8787"
              disabled={!!busy}
            />
            <p className="mt-3 text-[10px] leading-7 text-muted">
              استعمل نفس الرابط في تطبيق التلميذ. على الهاتف، دخل عنوان IP ديال
              الحاسوب، وخليهم في نفس الشبكة.
            </p>
          </div>
          <ol className="space-y-3 text-[10px] leading-7 text-muted">
            <li className="flex gap-3">
              <span className="num text-brand">01</span>احفظ المحتوى، ثم اضغط
              «نشر التحديثات للتطبيق».
            </li>
            <li className="flex gap-3">
              <span className="num text-brand">02</span>التلميذ يفتح «مزامنة
              المركز» في ملفه الشخصي.
            </li>
            <li className="flex gap-3">
              <span className="num text-brand">03</span>اجلب مستجداته، جاوب، ثم
              انشر الأجوبة.
            </li>
          </ol>
        </div>
        <div className="flex items-start gap-2 border-t border-line bg-surface-alt/30 px-6 py-4 text-[10px] leading-7 text-muted">
          <CircleHelp size={14} className="mt-1 shrink-0" />
          نسخة تجريبية محلية بالمزامنة اليدوية. الملفات والبيانات محفوظة على
          حاسوب الخادم؛ الربط ماشي خدمة cloud ديال الإنتاج.
        </div>
      </section>
    </>
  );
}
