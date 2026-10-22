import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui';

export default function NotFound() {
  return (
    <div>
      <h1 className="workspace-title mb-6">الصفحة غير موجودة</h1>
      <EmptyState
        icon={<Compass size={24} />}
        title="هذه الصفحة غير موجودة"
        description="ربما حُذفت الصفحة أو كان الرابط غير صحيح."
        action={
          <Link to="/" className="btn btn-primary">
            العودة إلى الرئيسية
          </Link>
        }
      />
    </div>
  );
}
