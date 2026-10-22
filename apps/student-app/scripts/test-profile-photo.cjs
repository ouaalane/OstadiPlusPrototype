const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/profile-photo.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
function load({ platform = 'android', available = true, result, save = { base64: 'thumbnail' }, failRender = false } = {}) {
  const calls = [], exports = {};
  const image = { saveAsync: async options => { calls.push(['save', options]); return save; }, release: () => calls.push(['releaseImage']) };
  const context = { crop: options => calls.push(['crop', options]), resize: options => calls.push(['resize', options]), renderAsync: async () => { if (failRender) throw new Error('decode failed'); return image; }, release: () => calls.push(['releaseContext']) };
  vm.runInNewContext(code, { exports, require(name) {
    if (name === 'expo') return { requireOptionalNativeModule: () => available ? {} : null };
    if (name === 'react-native') return { Platform: { OS: platform } };
    assert.ok(available || platform === 'web', 'missing native modules must never be evaluated');
    if (name === 'expo-image-picker') return { launchImageLibraryAsync: async options => { calls.push(['pick', options]); return result; } };
    if (name === 'expo-image-manipulator') return { SaveFormat: { JPEG: 'jpeg' }, ImageManipulator: { manipulate: uri => { calls.push(['manipulate', uri]); return context; } } };
    throw new Error(`Unexpected module ${name}`);
  } });
  return { pick: exports.pickProfilePhoto, calls };
}
const asset = { uri: 'file:///temporary.jpg', width: 4000, height: 3000 };
test('canceling leaves the existing image unchanged and never processes a file', async () => {
  const { pick, calls } = load({ result: { canceled: true, assets: null } });
  assert.equal(await pick(), null); assert.equal(calls.length, 1);
});
for (const platform of ['android', 'ios', 'web']) {
  test(`${platform}: single image selection yields a bounded, durable thumbnail`, async () => {
    const { pick, calls } = load({ platform, result: { canceled: false, assets: [asset] } });
    assert.equal(await pick(), 'data:image/jpeg;base64,thumbnail');
    assert.equal(calls[0][1].allowsEditing, platform !== 'web');
    assert.equal(calls[0][1].mediaTypes.join(), 'images');
    assert.equal(JSON.stringify(calls.find(c => c[0] === 'crop')[1]), JSON.stringify({ originX: 500, originY: 0, width: 3000, height: 3000 }));
    assert.equal(JSON.stringify(calls.find(c => c[0] === 'resize')[1]), JSON.stringify({ width: 512, height: 512 }));
    assert.equal(calls.find(c => c[0] === 'save')[1].base64, true);
    assert.deepEqual(calls.slice(-2).map(c => c[0]), ['releaseImage', 'releaseContext']);
  });
}
test('small images are not stretched', async () => {
  const { pick, calls } = load({ result: { canceled: false, assets: [{ ...asset, width: 120, height: 100 }] } });
  await pick(); assert.equal(calls.find(c => c[0] === 'resize')[1].width, 100);
});
test('failed encoding does not return a temporary URI and releases resources', async () => {
  const { pick, calls } = load({ result: { canceled: false, assets: [asset] }, save: {} });
  await assert.rejects(pick, /PROFILE_PHOTO_SAVE_FAILED/);
  assert.deepEqual(calls.slice(-2).map(c => c[0]), ['releaseImage', 'releaseContext']);
});
test('decode failure releases the manipulation context', async () => {
  const { pick, calls } = load({ result: { canceled: false, assets: [asset] }, failRender: true });
  await assert.rejects(pick, /decode failed/); assert.equal(calls.at(-1)[0], 'releaseContext');
});
for (const platform of ['android', 'ios']) {
  test(`${platform}: old binary does not crash on missing native modules`, async () => {
    const { pick, calls } = load({ platform, available: false });
    await assert.rejects(pick, /PROFILE_PHOTO_BUILD_REQUIRED/); assert.equal(calls.length, 0);
  });
}
