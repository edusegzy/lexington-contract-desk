const crypto=require('node:crypto');
const required=['APP_ACCESS_KEY','DOCUSIGN_INTEGRATION_KEY','DOCUSIGN_USER_ID','DOCUSIGN_ACCOUNT_ID','DOCUSIGN_PRIVATE_KEY'];
const json=(res,status,obj)=>res.status(status).json(obj);
function tokenJwt(){
const now=Math.floor(Date.now()/1000),env=process.env.DOCUSIGN_ENV==='production'?'account.docusign.com':'account-d.docusign.com';
const enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const body=enc({iss:process.env.DOCUSIGN_INTEGRATION_KEY,sub:process.env.DOCUSIGN_USER_ID,aud:env,iat:now-30,exp:now+300,scope:'signature impersonation'});
const pre=enc({alg:'RS256',typ:'JWT'})+'.'+body;
const key=process.env.DOCUSIGN_PRIVATE_KEY.replace(/\\n/g,'\n');return {env,jwt:pre+'.'+crypto.sign('RSA-SHA256',Buffer.from(pre),key).toString('base64url')};
}
module.exports=async(req,res)=>{
if(req.method!=='POST')return json(res,405,{error:'POST required'});
res.setHeader('Cache-Control','no-store');
if(required.some(k=>!process.env[k]))return json(res,503,{error:'DocuSign API integration not configured. Set required server-side environment variables.'});
const provided=req.headers['x-app-key'];const secret=process.env.APP_ACCESS_KEY;
if(typeof provided!=='string'||Buffer.byteLength(provided)!==Buffer.byteLength(secret)||!crypto.timingSafeEqual(Buffer.from(provided),Buffer.from(secret)))return json(res,401,{error:'Invalid website API access key'});
const {pdfBase64,seller,sellerEmail,buyer,buyerEmail,property}=req.body||{};
if(!pdfBase64||pdfBase64.length>12e6||!/^JVBER/.test(pdfBase64))return json(res,400,{error:'A valid PDF is required'});
if([seller,sellerEmail,buyer,buyerEmail,property].some(v=>typeof v!=='string'||!v.trim()||v.length>300))return json(res,400,{error:'Buyer, seller and property details are required'});
if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(sellerEmail)||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(buyerEmail))return json(res,400,{error:'Invalid recipient email'});
try{
const {env,jwt}=tokenJwt();
const tokenRes=await fetch('https://'+env+'/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})});
if(!tokenRes.ok)return json(res,502,{error:'DocuSign OAuth authorization failed. Check credentials and JWT user consent.'});
const {access_token}=await tokenRes.json();
const base=process.env.DOCUSIGN_BASE_URI||(process.env.DOCUSIGN_ENV==='production'?'https://na1.docusign.net':'https://demo.docusign.net');
if(!/^https:\/\/[-a-zA-Z0-9.]+$/.test(base))return json(res,503,{error:'Invalid DocuSign base URI configuration'});
const recipients=[
{email:buyerEmail,name:buyer,recipientId:'1',routingOrder:'1',tabs:{signHereTabs:[{documentId:'1',pageNumber:'10',xPosition:'85',yPosition:'310'}]}},
{email:sellerEmail,name:seller,recipientId:'2',routingOrder:'2',tabs:{signHereTabs:[{documentId:'1',pageNumber:'10',xPosition:'325',yPosition:'310'}]}}
];
const payload={emailSubject:'Review and sign TREC contract - '+property,documents:[{documentBase64:pdfBase64,name:'TREC-20-19-contract.pdf',fileExtension:'pdf',documentId:'1'}],recipients:{signers:recipients},status:'created'};
const response=await fetch(base+'/restapi/v2.1/accounts/'+encodeURIComponent(process.env.DOCUSIGN_ACCOUNT_ID)+'/envelopes',{method:'POST',headers:{Authorization:'Bearer '+access_token,'Content-Type':'application/json'},body:JSON.stringify(payload)});
if(!response.ok)return json(res,502,{error:'DocuSign rejected the draft. Check account configuration, PDF, and recipient setup.'});
const data=await response.json();return json(res,200,{envelopeId:data.envelopeId,status:'created'});
}catch(e){return json(res,502,{error:'DocuSign integration error. Check server settings and logs.'})}
};