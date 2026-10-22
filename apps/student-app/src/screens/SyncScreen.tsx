import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { encodeDemoState } from '@ostadiplus/shared';
import {
  AppText,
  Card,
  LabeledField,
  PrimaryButton,
  TopBar,
} from '../components/ui';
import {
  demoEndpoint,
  saveDemoEndpoint,
  syncStudentDemo,
} from '../lib/demo-sync';
import { useStore } from '../store/StudentStore';
import { colors, spacing } from '../theme';
export default function SyncScreen() {
  const navigation = useNavigation();
  const { state, me, importPayload, lang } = useStore();
  const ar = lang === 'ar';
  const [url, setUrl] = useState(demoEndpoint);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function sync() {
    if (!me) return;
    setBusy(true);
    setMessage('');
    try {
      await saveDemoEndpoint(url);
      const remote = await syncStudentDemo(state, me);
      await importPayload(await encodeDemoState(remote));
      setMessage(
        ar
          ? 'تمت المزامنة: الدروس والأجوبة والتفعيل محدّثة.'
          : 'Synchronisation terminée : cours, réponses et accès à jour.',
      );
    } catch {
      setMessage(
        ar
          ? 'تعذّر الاتصال. شغّل خادم العرض وتأكد من الرابط ونفس الشبكة.'
          : 'Connexion impossible. Vérifiez le serveur, son adresse et le réseau.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <TopBar
        title={ar ? 'مزامنة المركز' : 'Synchroniser le centre'}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.content}>
          <AppText size={21} weight="bold">
            {ar ? 'دروسك، محدّثة دائماً' : 'Vos cours à jour'}
          </AppText>
          <AppText tone="muted">
            {ar
              ? 'استعمل الرابط اللي يعطيك المركز. المزامنة ترسل أسئلتك وتقدّمك وتجلب الدروس والأجوبة وتفعيل الاشتراك.'
              : 'Utilisez l’adresse fournie par votre centre. Envoyez vos questions et votre progression, puis recevez les cours, réponses et accès.'}
          </AppText>
          <LabeledField
            label={ar ? 'رابط خادم المركز' : 'Adresse du serveur du centre'}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <PrimaryButton
            label={ar ? 'مزامنة الآن' : 'Synchroniser maintenant'}
            onPress={sync}
            busy={busy}
          />
          {message ? (
            <AppText accessibilityRole="alert">{message}</AppText>
          ) : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, gap: spacing.lg },
});
