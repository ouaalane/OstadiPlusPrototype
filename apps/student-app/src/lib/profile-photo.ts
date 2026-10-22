import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

type Picker = typeof import('expo-image-picker');
type Manipulator = typeof import('expo-image-manipulator');

// Guard older native binaries before evaluating the packages' native imports.
const available = Platform.OS === 'web' || Boolean(
  requireOptionalNativeModule('ExponentImagePicker') &&
  requireOptionalNativeModule('ExpoImageManipulator'),
);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const picker: Picker | null = available ? require('expo-image-picker') : null;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const manipulator: Manipulator | null = available ? require('expo-image-manipulator') : null;

export async function pickProfilePhoto(): Promise<string | null> {
  if (!picker || !manipulator) throw new Error('PROFILE_PHOTO_BUILD_REQUIRED');
  // The system photo picker does not need broad library or camera permission.
  const result = await picker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsEditing: Platform.OS !== 'web',
    aspect: [1, 1], quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const side = Math.floor(Math.min(asset.width, asset.height));
  if (side <= 0) throw new Error('PROFILE_PHOTO_INVALID_IMAGE');
  const context = manipulator.ImageManipulator.manipulate(asset.uri);
  try {
    context.crop({ originX: Math.floor((asset.width - side) / 2), originY: Math.floor((asset.height - side) / 2), width: side, height: side });
    context.resize({ width: Math.min(512, side), height: Math.min(512, side) });
    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({ base64: true, format: manipulator.SaveFormat.JPEG, compress: 0.75 });
      if (!saved.base64) throw new Error('PROFILE_PHOTO_SAVE_FAILED');
      // Store a bounded thumbnail, not the picker's temporary cache URI. It
      // survives cache cleanup/restarts and stays attached to this student.
      return `data:image/jpeg;base64,${saved.base64}`;
    } finally { image.release(); }
  } finally { context.release(); }
}
