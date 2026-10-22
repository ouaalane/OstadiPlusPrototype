# Dashboard languages

The header language selector supports Arabic, English and French. Arabic is the default. Its preference is saved in `ostadiplus.dashboard.locale`, independently of the shared demo state and the mobile app. Arabic uses RTL; English and French use LTR.

`useI18n()` subscribes components to language changes. `t(source, values)` translates Arabic source messages using `messages.json`; numbered placeholders (`{0}`, `{1}`) keep names and values separate. Keep the same placeholders in each translation. Include `lang` in memo dependencies when the memo produces translated labels.

Translate interface labels and generated messages only. Keep course titles, lesson bodies, student names, answers and other user content in their original language. Select options must keep their existing data values even when their labels are translated. Use bidi isolation or `dir="auto"` for mixed-language content. Do not remount editors or reset their state when changing languages.

The catalog also recognises generated validation/activity messages so existing stored messages can be displayed in the selected language. Unknown messages remain unchanged.

Run `npm run dashboard:test` for existing dashboard journeys and language-switching checks.
