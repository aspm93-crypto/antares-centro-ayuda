'use strict';
(async function () {
  const $ = (s) => document.querySelector(s);
  const nav = $('#navSections');
  const content = $('#helpContent');
  const sidebar = $('#sidebar');
  const menu = $('#menuBtn');
  const input = $('#searchInput');
  const resultBar = $('#resultBar');
  const empty = $('#emptyResults');
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };
  const normalize = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const safeUrl = (value, image = false) => {
    try {
      const raw = String(value || '').trim();
      if (!raw || raw.startsWith('//')) return '';
      const u = new URL(raw, location.href);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
      if (image && u.origin !== location.origin && u.protocol !== 'https:') return '';
      return u.href;
    } catch (_) { return ''; }
  };
  // Parse a small subset of Markdown without inserting raw, unsanitized HTML.
  function inlineMarkdown(target, source) {
    const pattern = /(!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let last = 0;
    for (const match of String(source || '').matchAll(pattern)) {
      if (match.index > last) target.append(document.createTextNode(source.slice(last, match.index)));
      if (match[2] !== undefined) {
        const src = safeUrl(match[3], true);
        if (src) { const img = el('img','inline-img'); img.alt=match[2]; img.src=src; img.loading='lazy'; target.append(img); }
        else target.append(document.createTextNode(match[2] || 'Imagen'));
      } else if (match[4] !== undefined) {
        const href = safeUrl(match[5]);
        if (href) { const a=el('a','content-link',match[4]); a.href=href; if (new URL(href).origin!==location.origin) {a.target='_blank';a.rel='noopener noreferrer';} target.append(a); }
        else target.append(document.createTextNode(match[4]));
      } else if (match[6] !== undefined) target.append(el('strong','',match[6]));
      else target.append(el('em','',match[7]));
      last = match.index+match[0].length;
    }
    if (last < source.length) target.append(document.createTextNode(source.slice(last)));
  }
  function markdownBlock(target, source) {
    const lines=String(source||'').trim().split(/\r?\n/);
    let list=null;
    for (const line of lines) {
      if (!line.trim()) {list=null;continue;}
      if (/^[-*] /.test(line.trim())) {
        if (!list) {list=el('ul');target.append(list);} const li=el('li'); inlineMarkdown(li,line.trim().slice(2));list.append(li);
      } else {list=null;const p=el('p');inlineMarkdown(p,line);target.append(p);}
    }
  }
  function render(data) {
    document.title = 'Centro de Ayuda · Antares Helper';
    $('#heroTag').textContent=data.hero_tag || 'CENTRO DE AYUDA';
    const h1=$('#heroHeading');h1.replaceChildren(document.createTextNode((data.hero_title||'Antares Helper')+' '),el('span','',data.hero_accent||'Centro de ayuda'));
    $('#heroSummary').textContent=data.hero_summary||'';
    nav.replaceChildren();content.replaceChildren();
    const sections=Array.isArray(data.sections)?data.sections:[];
    const used=new Set();
    sections.forEach((sec,index)=>{
      // No HTML injection or unsafe arbitrary id selectors.
      const id=String(sec.id||`seccion-${index+1}`).replace(/[^a-z0-9_-]/gi,'-').toLowerCase();
      const sid=used.has(id)?`${id}-${index}`:id;used.add(sid);
      const link=el('a');link.href='#'+sid;link.dataset.nav=sid;
      link.append(el('span','nav-icon',sec.symbol||'•'),el('span','',sec.title||sid));nav.append(link);
      const section=el('section','topic');section.id=sid;
      const header=el('header','topic-header');header.append(el('span','topic-symbol',sec.symbol||'•'));
      const headerInfo=el('div');headerInfo.append(el('span','eyebrow',sec.eyebrow||''),el('h2','',sec.title||'Sin título'),el('p','',sec.summary||''));header.append(headerInfo);section.append(header);
      const list=el('div','feature-list');
      (Array.isArray(sec.features)?sec.features:[]).forEach(feat=>{
        const article=el('article','feature');const left=el('div');left.append(el('h3','',feat.title||'Información'));
        const body=el('div','richtext');markdownBlock(body,feat.body||'');left.append(body);
        const src=safeUrl(feat.image,true);
        if (src){const img=el('img','feature-image');img.alt=feat.title||'Ilustración de ayuda';img.src=src;img.loading='lazy';left.append(img);}
        article.append(left);if(feat.tip){const aside=el('aside');markdownBlock(aside,feat.tip);article.append(aside);}
        list.append(article);
      });
      section.append(list);
      section.dataset.search=normalize([sec.title,sec.summary,sec.eyebrow,...(sec.features||[]).flatMap(f=>[f.title,f.body,f.tip])].join(' '));
      content.append(section);
    });
    const links=Array.from(nav.querySelectorAll('a'));
    links.forEach(link=>link.addEventListener('click',()=>{
      if(sidebar)sidebar.classList.remove('open'); if(menu)menu.setAttribute('aria-expanded','false');
      if(input.value){input.value='';filter();}
      markActive();
    }));
    function filter(){
      const words=normalize(input.value).trim().split(/\s+/).filter(Boolean);
      let shown=0;
      for (const section of content.children){const visible=words.every(w=>section.dataset.search.includes(w));section.hidden=!visible;if(visible)shown++;}
      empty.hidden=shown!==0;
      resultBar.textContent=words.length?`${shown} sección(es) encontradas`:`Explora ${sections.length} secciones de ayuda`;
    }
    function markActive(){const current=location.hash.slice(1)||'inicio';links.forEach(a=>a.classList.toggle('active',a.dataset.nav===current));}
    input.addEventListener('input',filter);
    window.addEventListener('hashchange',markActive);
    filter();markActive();
    if(location.hash){const target=document.getElementById(location.hash.slice(1));if(target)requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));}
  }
  if(menu&&sidebar)menu.addEventListener('click',()=>{const open=!sidebar.classList.contains('open');sidebar.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open));});
  try {
    const res=await fetch('./content/guia.json',{cache:'no-store'});
    if(!res.ok)throw Error('HTTP '+res.status);
    const data=await res.json();
    if(!data||!Array.isArray(data.sections))throw Error('El contenido no tiene las secciones esperadas');
    render(data);
  }catch(err){resultBar.textContent='No se pudo cargar la guía.';content.append(el('p','load-error','Comprueba la conexión y que el archivo content/guia.json esté publicado junto al sitio.'));console.error('Antares help:',err);}
  // This configuration only applies when embedded inside the Chrome extension.
  if(location.protocol==='chrome-extension:'&&typeof chrome!=='undefined'&&chrome.storage?.local){
    const container=$('#externalConfig'),urlInput=$('#externalUrl'),save=$('#saveExternalUrl'),result=$('#saveResult');
    if(container&&urlInput&&save&&result){
      container.hidden=false;
      chrome.storage.local.get('antares_help_site_url',obj=>urlInput.value=obj.antares_help_site_url||'');
      save.addEventListener('click',()=>{
        const url=urlInput.value.trim();
        if(url&&!/^https:\/\/[^\s/]+/i.test(url)){result.textContent='Introduce un enlace HTTPS válido.';return;}
        chrome.storage.local.set({antares_help_site_url:url},()=>result.textContent='Enlace guardado correctamente.');
      });
    }
  }
})();
