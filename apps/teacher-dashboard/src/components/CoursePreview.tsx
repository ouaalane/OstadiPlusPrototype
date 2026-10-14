import { Clock3, EyeOff, FileText, Film, Layers, Users } from 'lucide-react';
import {
  activeStudentCount,
  courseDurationSec,
  countLessons,
  formatDuration,
  formatSize,
} from '@ostadiplus/shared';
import { CourseCover, Pill } from '@/components/ui';
import type { DemoState } from '@ostadiplus/shared';

/**
 * What a student sees, rendered inside the dashboard's "معاينة" tab.
 * Keeps the teacher honest: this is the exact card the phone app opens.
 */
export function CoursePreview({
  state,
  courseId,
}: {
  state: DemoState;
  courseId: string;
}) {
  const course = state.courses.find((c) => c.id === courseId);
  if (!course) return null;

  const lessons = countLessons(course);
  const minutes = Math.round(courseDurationSec(course) / 60);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card overflow-hidden p-0">
        <CourseCover cover={course.cover} subject={course.subject} className="h-40">
          <div className="mt-auto">
            <Pill tone={course.status === 'published' ? 'success' : 'warning'} dot>
              {course.status === 'published' ? 'منشورة' : 'مسودة'}
            </Pill>
            <h2 className="mt-2 text-2xl leading-snug text-white">{course.title}</h2>
            <p className="mt-1 text-sm text-white/85">{course.level}</p>
          </div>
        </CourseCover>

        <div className="p-5">
          <p className="text-sm leading-relaxed text-body">{course.summary}</p>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-y border-line py-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Layers size={14} />
              <span className="num">{course.chapters.length}</span> فصل
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Film size={14} />
              <span className="num">{lessons}</span> درس
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} />
              <span className="num">{minutes}</span> دقيقة
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users size={14} />
              <span className="num">{activeStudentCount(state, course.id)}</span> تلميذ
            </span>
          </div>

          {course.chapters.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              لم تُضف فصول بعد — أضف فصلاً ثم دروسه لتظهر هنا.
            </p>
          ) : (
            <ol className="mt-4 space-y-4">
              {course.chapters.map((chapter, ci) => (
                <li key={chapter.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-soft text-[11px] font-bold text-brand-dark">
                      <span className="num">{ci + 1}</span>
                    </span>
                    <h3 className="text-sm font-bold text-ink">{chapter.title}</h3>
                    <span className="text-xs text-faint">
                      <span className="num">{chapter.lessons.length}</span> دروس
                    </span>
                  </div>

                  {chapter.lessons.length === 0 ? (
                    <p className="ps-8 text-xs text-faint">لا دروس في هذا الفصل بعد.</p>
                  ) : (
                    <ul className="space-y-2">
                      {chapter.lessons.map((item, li) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5"
                        >
                          <span className="num w-5 text-center text-xs text-faint">
                            {li + 1}
                          </span>
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                            style={{
                              background:
                                item.kind === 'video'
                                  ? 'var(--color-brand-soft)'
                                  : 'var(--color-danger-soft)',
                              color:
                                item.kind === 'video'
                                  ? 'var(--color-brand-dark)'
                                  : 'var(--color-danger)',
                            }}
                          >
                            {item.kind === 'video' ? (
                              <Film size={15} />
                            ) : (
                              <FileText size={15} />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-semibold text-ink">
                              {item.title}
                            </span>
                            <span className="text-xs text-muted">
                              {item.kind === 'video'
                                ? formatDuration(item.durationSec)
                                : `${item.pages} صفحات`}
                              {' · '}
                              {formatSize(item.sizeMb)}
                            </span>
                          </span>
                          {item.published ? (
                            <Pill tone="success">منشور</Pill>
                          ) : (
                            <Pill tone="neutral">
                              <EyeOff size={12} />
                              مخفي
                            </Pill>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-faint">
        هذه هي الصفحة التي يراها التلميذ في تطبيق OstadiPlus.
      </p>
    </div>
  );
}
