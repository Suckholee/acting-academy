import { translate } from './translate';

const languages = [['ko', '한국어'], ['en', 'English'], ['ja', '日本語'], ['zh', '中文']];
const key = 'kjt-academy-language';
let language = 'ko';
try { language = localStorage.getItem(key) || 'ko'; } catch {}
if (!languages.some(([code]) => code === language)) language = 'ko';
// Keep editing and private administrative screens in their source language.
if (!location.pathname.startsWith('/admin') && !new URLSearchParams(location.search).has('admin')) {
  const originals = new WeakMap();
  const attributes = new WeakMap();
  const excluded = 'script,style,textarea,[contenteditable],.language-picker,[data-no-translate]';
  const picker = document.createElement('label');
  picker.className = 'language-picker';
  picker.textContent = '🌐 ';
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Language / 언어 선택');
  for (const [code, label] of languages) select.add(new Option(label, code));
  select.value = language;
  picker.append(select);
  const note = document.createElement('span');
  note.className = 'language-note';
  picker.append(note);
  document.body.append(picker);
  const observer = new MutationObserver(apply);
  function apply() {
    observer.disconnect();
    document.documentElement.lang = language;
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.parentElement || node.parentElement.closest(excluded)) continue;
      const previous = originals.get(node);
      if (!previous || node.data !== previous.rendered) originals.set(node, { source: node.data });
      const record = originals.get(node);
      record.rendered = translate(language, record.source);
      if (node.data !== record.rendered) node.data = record.rendered;
    }
    document.querySelectorAll('[placeholder],[title],[aria-label],img[alt]').forEach(element => {
      if (element.closest(excluded)) return;
      const records = attributes.get(element) || {};
      for (const name of ['placeholder', 'title', 'aria-label', 'alt']) {
        if (!element.hasAttribute(name)) continue;
        const current = element.getAttribute(name);
        if (!records[name] || current !== records[name].rendered) records[name] = { source: current };
        const record = records[name];
        record.rendered = translate(language, record.source);
        if (current !== record.rendered) element.setAttribute(name, record.rendered);
      }
      attributes.set(element, records);
    });
    note.textContent = ({ko:'', en:'Some details are available in Korean.', ja:'一部の詳細は韓国語で表示されます。', zh:'部分详细内容以韩语显示。'})[language];
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['placeholder','title','aria-label','alt'] });
  }
  select.addEventListener('change', () => {
    language = select.value;
    try { localStorage.setItem(key, language); } catch {}
    apply();
  });
  apply();
}
