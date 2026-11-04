const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(`${__dirname}/background.js`,'utf8');const drive=source.slice(source.indexOf('function drive('),source.indexOf('function fillOtp('));
function probe({url='https://sso.oldmutual.co.za/login',text='Login to Old Mutual Username Password',button='Login',passwords=1,captcha=false,dialog=false}={}){
 let writes=0;class Input{constructor(type){this.type=type;this.name=type==='password'?'password':'username';}getClientRects(){return[1]}focus(){writes++}getAttribute(){return null}getRootNode(){return{}}}
 const controls=[new Input('text'),...Array.from({length:passwords},()=>new Input('password'))];
 const action={textContent:button,getClientRects:()=>[1],click:()=>writes++};
 const document={body:{innerText:text},querySelectorAll:s=>s==='input'?controls:s==='*'?[]:s.includes('captcha')?(captcha?[action]:[]):s.includes('dialog')?(dialog?[action]:[]):s.includes('button')?[action]:[]};
 const ctx=vm.createContext({URL,location:{href:url},document});vm.runInContext(drive,ctx);
 const result=vm.runInContext("drive('', '', true, 'https://my.oldmutual.co.za', 'oldmutual.co.za', true, true)",ctx);
 return{state:result.state,writes};
}
test('expired-session probe recognises the Old Mutual SSO login without filling or clicking',()=>assert.deepEqual(probe(),{state:'login',writes:0}));
test('probe does not treat password change or a quote input as a login',()=>{assert.equal(probe({button:'Save password',passwords:2}).state,'waiting');assert.equal(probe({passwords:0,text:'Life quote client details'}).state,'waiting')});
test('CAPTCHA, unexpected dialogs and unrelated domains cannot trigger automatic credential submission',()=>{assert.deepEqual(probe({captcha:true}),{state:'captcha',writes:0});assert.deepEqual(probe({dialog:true}),{state:'blocked',writes:0});assert.deepEqual(probe({url:'https://oldmutual.co.za.evil.example/login'}),{state:'waiting',writes:0})});
