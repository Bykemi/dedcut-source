/* ---------- QR code (v4.65) : élément du Montage et source du studio Live ----------
   Le QR code est fabriqué sur ce PC (src/qr.ts, bibliothèque qrcode-generator, MIT) : un lien (chaîne, réseau, site,
   cagnotte…) que les spectateurs scannent avec leur téléphone. Trois styles : carré classique, points ronds,
   carte avec une petite phrase (« Scanne-moi »). */
const QR_STY=['qcard','qsq','qdot'];
const qrOk=s=>String(s||'').trim().length>0;
/** dessin commun : carte (fond arrondi + QR + phrase) ou QR seul, centré dans la boîte (x, y, w, h) */
function qrPaint(g,x,y,w,h,o){
  const Q=window.dedcutQR;if(!Q)return;
  const card=o.st==='qcard',cap=card&&qrOk(o.t1),side=Math.min(w,h/(cap?1.22:1)),pad=card?side*.08:0,s=side-pad*2,bh=side+(cap?side*.2:0);
  const x0=x+(w-side)/2,y0=y+(h-bh)/2,dark=o.color||'#111111',light=o.bg||'#ffffff';
  if(card){g.fillStyle=light;g.beginPath();g.roundRect(x0,y0,side,bh,side*.08);g.fill()}
  if(!Q.draw(g,String(o.text||' '),x0+pad,y0+pad,s,{dark,light:card?null:light,dots:o.st==='qdot'})){
    g.fillStyle=light;g.fillRect(x0,y0,side,side);g.fillStyle=dark;g.font=`700 ${side*.07}px "Segoe UI", sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(T('qr.tooLong'),x0+side/2,y0+side/2,side*.9);return;
  }
  if(cap){g.fillStyle=dark;g.font=`700 ${side*.1}px Bahnschrift, "Segoe UI", sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(String(o.t1),x0+side/2,y0+side+side*.06,side*.9)}
}

/* ---------- Montage : élément « QR code » (bibliothèque d'éléments, catégorie Réseaux) ---------- */
WDRAW.qr=(c,p,loc)=>{
  const s=H*(p.size??34)/100,cap=p.st==='qcard'&&qrOk(p.t1),w=s,h=s*(cap?1.22:1),cx=W*(p.x??50)/100,cy=H*(p.y??50)/100;
  boxes.set(c.id,{x:cx-w/2,y:cy-h/2,w,h,rot:0});
  const k=easeOut(clamp(loc/.35,0,1));
  ctx.save();ctx.globalAlpha*=k;ctx.translate(cx,cy);ctx.scale(.86+.14*k,.86+.14*k);ctx.translate(-cx,-cy);
  qrPaint(ctx,cx-w/2,cy-h/2,w,h,p);ctx.restore();
};
WSTY.qr=QR_STY.slice();
WDEF.qr=()=>({dur:6,p:{st:'qcard',text:'https://',t1:T('qr.scan'),color:'#111111',bg:'#ffffff',size:34,x:80,y:56,op:100}});
WINSP.qr=[['st','st'],['text','txt','qr.text'],['t1','txt','qr.caption',null,['qcard']],['color','col','qr.dark'],['bg','col','qr.light'],['size','num','qr.size',[8,95,.5]],['hint','hint','qr.hint']];
GN.qr='qr.name';
WSIZE.add('qr');
for(const s of QR_STY)WLIB.push({c:'social',g:'qr',s,n:'wst.'+s,tt:1});

/* ---------- Live : source « QR code » ---------- */
ICO.qr='<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM14 18.5v2M18.5 14h2"/>';
ST_KINDS.qr='qr';
ST_NEW.qr={o:()=>({st:'qcard',text:'https://',t1:T('qr.scan'),color:'#111111',bg:'#ffffff'}),r:()=>({x:.81,y:.06,w:.16,h:.36})};
ST_DRAW.qr=(g,it,x,y,w,h)=>{g.save();try{qrPaint(g,x,y,w,h,it.o)}finally{g.restore()}};
{const _n=stName;stName=function(it){return it&&it.kind==='qr'?T('st.k.qr')+(it.o.t1?' · '+String(it.o.t1).slice(0,24):''):_n.apply(this,arguments)}}
ST_PROPS.qr=it=>{const o=it.o;
  return`<div class="fld"><label>${T('qr.text')}</label><input type="text" data-o="text" value="${esc(o.text||'')}" maxlength="400" placeholder="https://"></div>
  <div class="fld"><label>${T('qr.style')}</label><select data-o="st">${QR_STY.map(s=>`<option value="${s}" ${(o.st||'qcard')===s?'selected':''}>${T('wst.'+s)}</option>`).join('')}</select></div>
  ${(o.st||'qcard')==='qcard'?`<div class="fld"><label>${T('qr.caption')}</label><input type="text" data-o="t1" value="${esc(o.t1||'')}" maxlength="40"></div>`:''}
  <div class="two"><div class="fld"><label>${T('qr.dark')}</label><input type="color" data-o="color" value="${esc(o.color||'#111111')}"></div><div class="fld"><label>${T('qr.light')}</label><input type="color" data-o="bg" value="${esc(o.bg||'#ffffff')}"></div></div>
  <p class="hint">${T('qr.hint')}</p>`;
};

/* ---------- assistant, Ctrl+K, DedCut IA ---------- */
function qrAddMontage(o={}){
  if(appMode!=='edit')setMode('edit');
  const d=WDEF.qr(),c=newClip({track:tk('over'),start:time,dur:d.dur,gen:'qr',p:Object.assign(d.p,o.text?{text:String(o.text).slice(0,400)}:{},o.caption!=null?{t1:String(o.caption).slice(0,40)}:{},QR_STY.includes(o.style)?{st:o.style}:{})});
  if(trk(c).lock){toast(T('msg.trackLocked'));return null}
  clips.push(c);sel=c.id;commit();refresh();
  return c;
}
CMDS.push({id:'qrcode',n:'qr.cmd',f:()=>{const c=qrAddMontage();if(c)toast(T('qr.added'))}});
SPACE_TOOLS.add_qr_code=async a=>{
  if(!qrOk(a.text))throw new Error('give the text or link (https://...) of the QR code');
  if(a.space==='live'){await stGo();stAdd('qr');const it=stScene().items.find(i=>i.id===stSelId);if(it){it.o.text=String(a.text).slice(0,400);if(a.caption!=null)it.o.t1=String(a.caption).slice(0,40);stSave();stRender();stSideUI();stSourcesUI()}return{added:'live source',scene:stScene().name}}
  const c=qrAddMontage({text:a.text,caption:a.caption,style:a.style});if(!c)throw new Error('the overlay track is locked');
  return{added:'montage element',id:c.id,note:'Move or resize it with update_clip (p.x, p.y, p.size in %).'};
};
MCP_READ.add('add_qr_code');
{const b=dcaiSpace;dcaiSpace=async function(raw,q){
  if(dcHas(q,['qr code','qrcode','qr-code','=qr','code qr','código qr','codigo qr','qr-kod','qrコード','qr 코드','二维码'])){
    const m=String(raw).match(/https?:\/\/[^\s"'<>]+|www\.[^\s"'<>]+/i);
    if(!m||dcIsQ(q,raw)&&!dcIsReq(q,raw))return{text:T('qr.howTo')};
    const c=qrAddMontage({text:m[0].startsWith('www.')?'https://'+m[0]:m[0]});if(!c)return{text:T('msg.trackLocked')};
    chatActs++;chatAdd('act',T('ai.t.add_qr_code'));return{text:T('qr.added')};
  }
  return b(raw,q);
}}
