# Curated lesson posters

Drop-in poster art for lesson videos. `generate-media.mjs` looks here **before**
grabbing a frame from the generated demo video, exactly like the real AlloSchool
PDFs in `media/source/alloschool/` win over the demo document templates.

    media/source/posters/<video-key>.jpg   →   media/generated/posters/<video-key>.jpg

Files must be 1280×720 (16:9) — the size the app renders lesson thumbnails from.

## complex-*

The eleven `complex-*` posters come from the thumbnail art of the YouTube
playlist *«الأعداد العقدية»* (2ème Bac maths):

    https://www.youtube.com/playlist?list=PLWDP1k6hCnoTpvWGmzidsGsuBeu81Xi6L

The original thumbnails carry that channel's own logo and a
`www.aderdour.com` watermark in the bottom-right corner. For each poster that
corner was replaced with an OstadiPlus brand panel (the same lockup the
generated slides carry) and the channel's mascot/doodle beside it was inpainted
out, so what ships is the lesson title and the teacher's photo only.

These are third-party images: the same caveat as the AlloSchool documents
applies — using them beyond this prototype needs the rightsholder's permission.

## phys-*

The nine `phys-*` posters come from the thumbnail art of the YouTube playlist
*«2ème Bac physique–chimie»* (waves and the slow/fast transformations):

    https://www.youtube.com/playlist?list=PLZAeMV7lm1EO31VswGYQssZkuFSRgzHMI

(The first nine videos of the playlist, in order.)

The original thumbnails carry that channel's own pills — "Top physique chimie"
on the left and "Prof Fouad" on the right of the top strip. For each poster the
whole top strip was replaced with an OstadiPlus brand bar (the same lockup the
generated slides carry), so what ships is the lesson title and the teacher's
photo only.

Same rights caveat: these are third-party images, so using them beyond this
prototype needs the rightsholder's permission.

## the remaining maths lessons

The eleven posters for the rest of the maths course — `limits-intro`,
`limits-rules`, `derivative-concept`, `derivative-rules`, `curve-study`,
`vectors`, `dot-product`, `geometry-problems`, `logarithm`, `exponential`,
`exam-strategy` — come from the same channel as the `complex-*` set,
*Aderdour Mustapha* (`UCL-mC1yTDnh7zVuj7Upl7fg`), one custom thumbnail per
lesson:

| poster | video |
| --- | --- |
| `limits-intro` | `LQOjCYGOB9A` حساب النهايات — الجزء الأول |
| `limits-rules` | `g3RMLEP-_9c` حساب النهايات — الجزء الثاني |
| `derivative-concept` | `DaLR2MU8oRI` الإشتقاق في نقطة — الجزء الأول |
| `derivative-rules` | `IV9pe9CAjFo` قواعد الاشتقاق وطريقة إنشاء جدول التغيرات |
| `curve-study` | `FsfnpHe8qc0` دراسة الدوال العددية |
| `vectors` | `cSCv5Qo4wPM` الهندسة الفضائية — الجداء المتجهي |
| `dot-product` | `PoHhLChzHCc` Le produit scalaire dans l'espace |
| `geometry-problems` | `JuvoOyGyV6I` تمرين شامل — الهندسة الفضائية |
| `logarithm` | `DJXagmebrxs` الدالة اللوغاريتمية — شرح النهايات |
| `exponential` | `Ea2NPKUGovo` الدالة الأسية — تعريف و خاصيات |
| `exam-strategy` | `zn1Zj7GV620` نصائح ليلة الإمتحان الوطني |

Nine of them carry the channel's own "أضرضور مصطفى" lockup — and, for some, a
`www.aderdour.com` watermark — in the bottom-right; that corner is replaced by
an OstadiPlus brand panel, the same treatment the `complex-*` set got. The
other two (`vectors`, `geometry-problems`) are clean classroom/blackboard
photos with no channel branding, so they only carry a small OstadiPlus corner
badge. The lesson keys are used as-is, so the mapping above is what ties each
poster back to its source.

Same rights caveat again: third-party images, so anything beyond this prototype
needs the rightsholder's permission.
