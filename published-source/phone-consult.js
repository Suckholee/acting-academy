(() => {
 const dialog=document.querySelector('.phone-consult-dialog');if(!dialog)return;
 let returnFocus;
 const open=trigger=>{returnFocus=trigger;if(!dialog.open)dialog.showModal();};
 document.addEventListener('click',event=>{
  const trigger=event.target.closest('[data-consult],a[href*="?consult="]');
  if(!trigger)return;
  event.preventDefault();event.stopImmediatePropagation();open(trigger);
 },true);
 dialog.querySelector('.phone-consult-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 dialog.addEventListener('close',()=>returnFocus?.focus());
 if(new URLSearchParams(location.search).has('consult'))open(document.querySelector('[data-consult],a[href*="?consult="]'));
})();
