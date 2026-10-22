import { useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Smartphone,
  Server,
} from 'lucide-react';
import { PageHeader } from '@/components/ui';
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
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState('');
  const [error, setError] = useState('');
  async function run(direction: 'publish' | 'pull') {
    setBusy(true);
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
      setError(e instanceof Error ? e.message : 'تعذّرت المزامنة');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="مزامنة تطبيق التلميذ"
        description="انشر الدروس والأجوبة والتفعيل، واجلب أسئلة التلاميذ وتقدّمهم من نفس خادم العرض التجريبي."
      />
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="card p-6">
          <div className="mb-5 flex items-center gap-3">
            <Server className="text-brand" />
            <h2 className="text-lg font-bold">ربط المركز</h2>
          </div>
          <label className="field-label" htmlFor="demo-url">
            رابط خادم العرض التجريبي
          </label>
          <input
            id="demo-url"
            className="input my-3"
            dir="ltr"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="http://192.168.1.10:8787"
          />
          <p className="text-sm text-muted">
            استعمل نفس الرابط في تطبيق التلميذ. على الهاتف، استعمل عنوان IP ديال
            الحاسوب على نفس الشبكة.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => run('publish')}
            >
              <ArrowUpFromLine size={17} />
              نشر التحديثات للتطبيق
            </button>
            <button
              className="btn btn-outline"
              disabled={busy}
              onClick={() => run('pull')}
            >
              <ArrowDownToLine size={17} />
              جلب تحديثات التلاميذ
            </button>
          </div>
          {error ? (
            <p className="mt-4 text-sm text-danger" role="alert">
              {error} — شغّل خادم العرض بالأمر npm run demo.
            </p>
          ) : null}
          {last ? (
            <p
              className="mt-4 flex items-center gap-2 text-sm text-brand"
              role="status"
            >
              <CheckCircle2 size={16} />
              آخر مزامنة: {last}
            </p>
          ) : null}
        </section>
        <section className="card bg-brand-softer p-6">
          <Smartphone size={28} className="mb-4 text-brand" />
          <h2 className="text-lg font-bold">من الأستاذ للتلميذ، وبالعكس</h2>
          <ol className="mt-4 list-inside list-decimal space-y-3 text-sm text-muted">
            <li>أضف المحتوى واضبط الصورة والتوقيت والنشر.</li>
            <li>انشر التحديثات من هذه الصفحة.</li>
            <li>التلميذ يضغط «مزامنة المركز» في ملفه الشخصي.</li>
            <li>اجلب الأسئلة والنتائج، أجب، ثم انشر التحديثات.</li>
          </ol>
          <p className="mt-5 border-t border-line pt-4 text-xs text-muted">
            نسخة عرض تجريبية محلية. البيانات والملفات محفوظة على حاسوب الخادم،
            ولا يوجد تسجيل دخول مركزي للإنتاج.
          </p>
        </section>
      </div>
    </>
  );
}
