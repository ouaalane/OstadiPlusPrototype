const { test }=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const {webcrypto}=require('node:crypto');const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/local-password.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
async function load(platform='web',available=true){
 const noble={};for(const name of ['pbkdf2','sha2','utils'])noble[`@noble/hashes/${name}.js`]=await import(`@noble/hashes/${name}.js`);
 // Noble rejects objects from another VM realm; normalize only the options
 // boundary while exercising its real PBKDF2 implementation and round count.
 const real=noble['@noble/hashes/pbkdf2.js'].pbkdf2Async;
 noble['@noble/hashes/pbkdf2.js']={pbkdf2Async:(hash,password,salt,options)=>real(hash,password,salt,{...options})};
 const data=new Map(),api={};
 vm.runInNewContext(code,{exports:api,crypto:webcrypto,Uint8Array,require(name){
  if(name==='@react-native-async-storage/async-storage')return {getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{data.set(k,v);}};
  if(name==='expo')return {requireOptionalNativeModule:()=>available?{}:null};
  if(name==='react-native')return {Platform:{OS:platform}};
  if(name==='expo-crypto'){assert.ok(available);return {getRandomBytesAsync:async n=>webcrypto.getRandomValues(new Uint8Array(n))};}
  if(noble[name])return noble[name];throw Error(name);
 }});return {api,data};
}
test('local passwords are salted/derived, verify correctly and never enter student payloads',async()=>{
 const {api,data}=await load();assert.equal(await api.hasLocalPassword('one'),false);
 await api.setLocalPassword('one','InitialPassword123');assert.equal(await api.hasLocalPassword('one'),true);
 assert.equal(await api.verifyLocalPassword('one','InitialPassword123'),true);assert.equal(await api.verifyLocalPassword('one','wrong'),false);
 assert.equal(await api.changeLocalPassword('one','wrong','NewPassword123'),false);
 assert.equal(await api.changeLocalPassword('one','InitialPassword123','NewPassword123'),true);
 assert.equal(await api.verifyLocalPassword('one','InitialPassword123'),false);assert.equal(await api.verifyLocalPassword('one','NewPassword123'),true);
 const record=JSON.parse([...data.values()][0]);assert.equal(record.iterations,600000);assert.equal(record.salt.length,32);assert.equal(record.digest.length,64);
 assert.ok(![...data.values()].join().includes('NewPassword123'));assert.ok([...data.keys()].every(k=>k.startsWith('ostadiplus.local-password.v1:')));
});
test('legacy/demo accounts can set their first password without inventing an old one',async()=>{
 const {api}=await load('android');assert.equal(await api.verifyLocalPassword('legacy',''),true);
 assert.equal(await api.changeLocalPassword('legacy','','DemoPassword123'),true);
 await assert.rejects(api.changeLocalPassword('legacy','DemoPassword123','short'),/PASSWORD_TOO_SHORT/);
});
test('old native binaries load safely but cannot silently save an unhashed password',async()=>{
 const {api,data}=await load('android',false);await assert.rejects(api.setLocalPassword('one','Password123'),/PASSWORD_BUILD_REQUIRED/);assert.equal(data.size,0);
});
