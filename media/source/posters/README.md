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
