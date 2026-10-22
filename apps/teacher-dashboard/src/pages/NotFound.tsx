import { useI18n } from '@/i18n/useI18n';
import { translate as t } from '@/i18n/locale';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui';

export default function NotFound() {
  useI18n();
  return (
    <div>
      <h1 className="workspace-title mb-6">{t('الصفحة غير موجودة')}</h1>
      <EmptyState
        icon={<Compass size={24} />}
        title={t('هذه الصفحة غير موجودة')}
        description={t('ربما حُذفت الصفحة أو كان الرابط غير صحيح.')}
        action={
          <Link to="/" className="btn btn-primary">
            {t('العودة إلى الرئيسية')}
          </Link>
        }
      />
    </div>
  );
}
