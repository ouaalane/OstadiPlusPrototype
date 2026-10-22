const { test } = require('node:test');const assert = require('node:assert/strict');
const fs = require('node:fs');const path = require('node:path');const vm = require('node:vm');const ts = require('typescript');
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/profile-details.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const api={};vm.runInNewContext(code,{exports:api});
const student={id:'one',fullName:'Original Name',monogram:'ON',email:'one@example.com',phone:'0612345678',studentCode:'UST-ABCDE',profilePhoto:'data:original',joinedAt:'original',level:'BAC',studentType:'moutamadris'};
const details={fullName:'  New Name  ',email:'ONE@example.com ',phone:'+212 612345678',level:'Université',studentType:'moutamadris',age:18};
test('editing details keeps identity, QR, photo and registration date unchanged',()=>{
 const result=api.applyProfileDetails(student,{...details,id:'other',studentCode:'bad',profilePhoto:'bad'});
 assert.equal(result.id,student.id);assert.equal(result.studentCode,student.studentCode);assert.equal(result.profilePhoto,student.profilePhoto);assert.equal(result.joinedAt,student.joinedAt);
 assert.equal(result.fullName,'New Name');assert.equal(result.monogram,'NN');assert.equal(result.age,18);assert.equal(student.fullName,'Original Name');
});
test('own email is accepted; another account email is rejected regardless of case',()=>{
 assert.equal(Object.keys(api.profileErrors(details,[student],student.id)).length,0);
 assert.equal(api.profileErrors({...details,email:'Other@EXAMPLE.COM'},[student,{...student,id:'two',email:'other@example.com'}],student.id).email,'duplicate');
});
test('invalid age, name, email, level and phone are rejected',()=>{
 const errors=api.profileErrors({...details,age:121,fullName:' ',email:'invalid',level:'',phone:'abc'},[],student.id);
 assert.equal(Object.keys(errors).length,5);
 for(const age of [0,-5,18.5,NaN])assert.equal(api.profileErrors({...details,age},[],student.id).age,'age');
});
test('optional age can be cleared and Arabic age/phone digits are supported',()=>{
 assert.equal(api.applyProfileDetails({...student,age:18},{...details,age:undefined}).age,undefined);
 assert.equal(api.latinDigits('١٨'), '18');assert.equal(api.latinDigits('۱۸'), '18');
 assert.equal(api.profileErrors({...details,phone:'٠٦١٢٣٤٥٦٧٨'},[],student.id).phone,undefined);
 assert.equal(api.applyProfileDetails(student,{...details,phone:'٠٦١٢٣٤٥٦٧٨'}).phone,'0612345678');
});
