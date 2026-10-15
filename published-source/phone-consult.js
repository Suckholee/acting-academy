(() => {
 const dialog=document.querySelector('.phone-consult-dialog');if(!dialog)return;
 let returnFocus,previousOverflow;
 const open=trigger=>{
  if(dialog.open)return;
  returnFocus=trigger;
  const header=trigger?.closest('header.mobile-menu-open');
  if(header){
   const menuButton=header.querySelector('.mobile-menu-button');
   menuButton?.click();
   returnFocus=menuButton;
  }
  previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  dialog.showModal();
 };
 document.addEventListener('click',event=>{
  const trigger=event.target.closest('[data-consult],a[href*="?consult="]');
  if(!trigger)return;
  event.preventDefault();event.stopImmediatePropagation();open(trigger);
 },true);
 dialog.querySelector('.phone-consult-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;returnFocus?.focus();});
 if(new URLSearchParams(location.search).has('consult'))open(document.querySelector('[data-consult],a[href*="?consult="]'));
})();
