async function build() {
const fs = require('fs');
const { marked } = await import('marked');

const sourcePath = 'React-base-nang-cao.md';
const outputPath = 'index.html';
const deployOutputPath = 'public/index.html';
const markdown = fs.readFileSync(sourcePath, 'utf8');
const encodedSource = Buffer.from(markdown, 'utf8').toString('base64');
const sourceAst = marked.lexer(markdown, { gfm: true });

const flowBindings = {
  snapshot:'Hãy đọc handler như một “bức ảnh chụp”', asyncOrder:'b có thể resolve trước a.', immutableFlow:'Nếu có thể tính một giá trị từ props/state', xssLab:'Demo bên dưới dùng payload vô hại', repaint:'render lại cả 1000 tin nhắn cũ + 1 tin mới', declarativeFlow:'Công thức cốt lõi:', compositionFlow:'React ưu tiên Composition hơn Inheritance.', oneWay:'function Child({ onIncrease })', jsx:"children: 'Hello'", reconciliation:'messages.map(msg => <div key={msg.id}', keys:'key={item.id} data={item}', fiber:'Concurrent Rendering', hooks:'đơn vị tính năng', redux:'dispatch(removeItem(item.id))', batching:'count tăng đúng 3, vì mỗi lần React đưa', requestReducer:'return <div>{state.data.name}</div>;', effectCycle:'}, [dependencies]);', fetchCleanup:'return user ? <div>{user.name}</div>', staleClosure:'snapshot lúc mount', memo:'}, [products, keyword]);', callbackMemo:'ExpensiveChild render', contextFlow:'const user = useContext(UserContext)', refFlow:'Điểm khác biệt cốt lõi so với', customHookFlow:'Nếu cần thêm debounce', thunkFlow:'chuẩn hóa vòng đời', statePlacement:'Trước khi chọn', controlledForm:'Input controlled nhận', serverCache:'Checklist cho một resource', requestRace:'Checklist cho một resource', transition:'urgent: input phản hồi ngay', suspenseFlow:'không tự kích hoạt Suspense', errorBoundaryFlow:'Error Boundary hiển thị fallback', testingFlow:'Test nên kiểm tra điều người dùng', accessibilityFlow:'Ưu tiên HTML semantic', liveReact:'React lab — phòng lab cô lập'
};

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const slug = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const markdownHeadings = raw => {
  let pendingId = '';
  return raw.replace(/\r/g,'').split('\n').flatMap(line => {
    const id = line.match(/^<!--\s*content-id:\s*([a-z0-9-]+)\s*-->\s*$/i);
    if (id) { pendingId = id[1]; return []; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (!heading) return [];
    const value = { depth:heading[1].length, text:heading[2], id:pendingId || slug(heading[2]) };
    pendingId = '';
    return [value];
  });
};
const chapterMatches = [...markdown.matchAll(/^## (.+)$/gm)];
const preface = markdown.slice(0, chapterMatches[0].index).trim();
const renderedChapters = chapterMatches.map((match, index) => {
  const start = match.index;
  const end = chapterMatches[index + 1]?.index ?? markdown.length;
  const raw = (index === 0 ? preface + '\n\n' : '') + markdown.slice(start, end).trim();
  const chapterId = markdown.slice(Math.max(0, start - 100), start).match(/<!--\s*content-id:\s*([a-z0-9-]+)\s*-->\s*$/i)?.[1];
  if (!chapterId) throw new Error('Missing stable content-id before chapter: ' + match[1]);
  const headings = markdownHeadings(raw);
  const renderHeadings = [...headings];
  const renderer = new marked.Renderer();
  renderer.heading = function({ tokens, depth }) {
      const heading = renderHeadings.shift();
      return '<h' + depth + ' id="' + escape(heading?.id || '') + '">' + this.parser.parseInline(tokens) + '</h' + depth + '>';
    };
  renderer.code = function({ text, lang }) {
      return '<div class="code-wrap"><div class="code-head"><span>' + escape(lang || 'code') + '</span><button class="copy-btn" type="button">Sao chép</button></div><pre><code>' + escape(text) + '</code></pre></div>\n';
    };
  renderer.link = function({ href, tokens }) {
      const safe = /^(https?:\/\/|\/|#)/i.test(href || '') ? href : '#';
      return '<a href="' + escape(safe) + '" target="_blank" rel="noreferrer">' + this.parser.parseInline(tokens) + '</a>';
    };
  const tokens = marked.lexer(raw.replace(/<!--\s*content-id:\s*[a-z0-9-]+\s*-->\s*\r?\n?/gi, ''), { gfm:true });
  const inserted = new Set();
  let html = '';
  for (const token of tokens) {
    html += marked.parser([token], { gfm:true, renderer });
    for (const [flow, anchor] of Object.entries(flowBindings)) {
      if (!inserted.has(flow) && token.raw.includes(anchor)) { html += '<!--FLOW:' + flow + '-->'; inserted.add(flow); }
    }
  }
  return { id:chapterId, html, sections:headings.filter(heading => heading.depth === 3 || heading.depth === 4).map(heading => ({ level:heading.depth, title:heading.text, id:heading.id })) };
});
const encodedChapterRender = Buffer.from(JSON.stringify(renderedChapters), 'utf8').toString('base64');

const html = String.raw`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <title>React Explorer — Từ Bản Chất Đến Thực Hành</title>
  <style>
    :root {
      --bg: #0a0c10; --surface: #10141b; --surface-2: #161b24; --surface-3: #1d2430;
      --text: #e8edf4; --muted: #9099a8; --faint: #5d6674; --line: #272e3a;
      --accent: #62dafb; --accent-2: #8b7cf6; --good: #56d7a0; --warn: #f3bd68;
      --code: #090b0f; --sidebar: 292px; --shadow: 0 18px 60px rgba(0,0,0,.28);
    }
    :root[data-theme="light"] {
      --bg: #f6f7f9; --surface: #fff; --surface-2: #f0f3f6; --surface-3: #e8edf2;
      --text: #18202b; --muted: #647083; --faint: #8791a0; --line: #dce2e9;
      --accent: #087ea4; --accent-2: #6555d9; --good: #087d57; --warn: #a36308;
      --code: #161b22; --shadow: 0 18px 55px rgba(31,42,55,.1);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; min-height: 100vh; color: var(--text); background: var(--bg); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    button, input, select { font: inherit; }
    button { color: inherit; }
    a { color: var(--accent); }
    .progress-rail { position: fixed; inset: 0 0 auto; height: 3px; z-index: 80; background: var(--surface-3); }
    .progress-bar { height: 100%; width: 0; background: linear-gradient(90deg,var(--accent),var(--accent-2)); transition: width .12s linear; }
    .topbar { position: fixed; z-index: 60; top: 3px; left: var(--sidebar); right: 0; height: 64px; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; gap: 20px; border-bottom: 1px solid color-mix(in srgb,var(--line) 75%,transparent); background: color-mix(in srgb,var(--bg) 88%,transparent); backdrop-filter: blur(16px); }
    .topbar-title { min-width: 0; }
    .eyebrow { color: var(--accent); font: 700 10px/1.2 ui-monospace,SFMono-Regular,monospace; letter-spacing: .15em; text-transform: uppercase; }
    .current-title { margin-top: 4px; max-width: 56vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; color: var(--muted); }
    .top-actions { display: flex; align-items: center; gap: 8px; }
    .search-wrap { position: relative; flex: 1 1 280px; max-width: 390px; }
    .search-input { width: 100%; min-height: 36px; padding: 7px 11px; border: 1px solid var(--line); border-radius: 10px; color: var(--text); background: var(--surface); outline: 0; font-size: 12px; }
    .search-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb,var(--accent) 14%,transparent); }
    .search-results { position: absolute; z-index: 90; top: calc(100% + 8px); left: 0; width: min(620px,calc(100vw - 32px)); max-height: min(62vh,510px); overflow: auto; padding: 6px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow); }
    .search-results[hidden] { display: none; }
    .search-result { display: block; width: 100%; padding: 10px; border: 0; border-radius: 8px; color: var(--text); background: transparent; text-align: left; cursor: pointer; }
    .search-result:hover, .search-result:focus-visible { background: var(--surface-2); outline: 0; }
    .search-result small, .search-result span { display: block; }
    .search-result small { color: var(--accent); font: 700 10px/1.4 ui-monospace,SFMono-Regular,monospace; }
    .search-result span { margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.45; }
    .search-empty { padding: 13px; color: var(--muted); font-size: 12px; }
    .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
    .chapter-count { padding: 7px 10px; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); font-size: 12px; white-space: nowrap; }
    .icon-btn { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); cursor: pointer; display: grid; place-items: center; }
    .icon-btn:hover { border-color: var(--accent); color: var(--accent); }
    .menu-btn { display: none; }
    .sidebar { position: fixed; z-index: 70; inset: 3px auto 0 0; width: var(--sidebar); padding: 24px 16px 18px; border-right: 1px solid var(--line); background: var(--surface); display: flex; flex-direction: column; }
    .brand { padding: 2px 10px 22px; display: flex; align-items: center; gap: 11px; }
    .brand-mark { width: 38px; height: 38px; border: 1px solid color-mix(in srgb,var(--accent) 65%,var(--line)); border-radius: 12px; display: grid; place-items: center; color: var(--accent); font-weight: 800; background: color-mix(in srgb,var(--accent) 8%,transparent); }
    .brand strong { display: block; font-size: 15px; letter-spacing: -.01em; }
    .brand span { display: block; margin-top: 2px; font-size: 10px; color: var(--muted); letter-spacing: .09em; text-transform: uppercase; }
    .side-label { padding: 0 10px 9px; color: var(--faint); font: 700 10px/1 ui-monospace,SFMono-Regular,monospace; letter-spacing: .14em; text-transform: uppercase; }
    .chapter-list { margin: 0; padding: 0; list-style: none; overflow: auto; flex: 1; scrollbar-width: thin; }
    .chapter-link { width: 100%; display: grid; grid-template-columns: 25px 1fr 18px; gap: 8px; align-items: start; padding: 10px; border: 0; border-radius: 10px; color: var(--muted); background: transparent; text-align: left; cursor: pointer; }
    .chapter-link:hover { color: var(--text); background: var(--surface-2); }
    .chapter-link.active { color: var(--text); background: color-mix(in srgb,var(--accent) 11%,var(--surface)); box-shadow: inset 2px 0 var(--accent); }
    .chapter-no { color: var(--faint); font: 600 10px/1.5 ui-monospace,SFMono-Regular,monospace; }
    .chapter-link.active .chapter-no { color: var(--accent); }
    .chapter-name { font-size: 12px; line-height: 1.45; font-weight: 590; }
    .check { color: var(--good); font-size: 13px; opacity: 0; }
    .chapter-link.done .check { opacity: 1; }
    .section-list { margin: -2px 0 5px 39px; padding: 0; list-style: none; }
    .section-link { display: block; width: 100%; padding: 5px 8px; border: 0; border-left: 1px solid var(--line); color: var(--faint); background: transparent; text-align: left; font-size: 11px; line-height: 1.35; cursor: pointer; }
    .section-link:hover, .section-link:focus-visible { color: var(--accent); border-left-color: var(--accent); outline: 0; }
    .section-link.sec-h4 { padding-left: 16px; font-size: 10px; }
    .source-meta { margin: 14px 7px 0; padding: 12px; border-top: 1px solid var(--line); color: var(--faint); font: 10px/1.6 ui-monospace,SFMono-Regular,monospace; }
    .main { margin-left: var(--sidebar); padding: 112px 26px 70px; }
    .reader { width: min(100%, 790px); margin: 0 auto; }
    .chapter-kicker { display: flex; align-items: center; gap: 10px; color: var(--accent); font: 700 11px/1 ui-monospace,SFMono-Regular,monospace; letter-spacing: .14em; text-transform: uppercase; }
    .chapter-kicker::after { content: ""; width: 42px; height: 1px; background: var(--accent); opacity: .5; }
    .content { animation: reveal .35s ease both; }
    @keyframes reveal { from { opacity: 0; transform: translateY(7px); } }
    .content h1 { margin: 18px 0 18px; font-size: clamp(35px,6vw,58px); line-height: 1.04; letter-spacing: -.045em; }
    .content h2 { margin: 18px 0 36px; font-size: clamp(31px,5vw,48px); line-height: 1.08; letter-spacing: -.038em; }
    .content h3 { margin: 56px 0 20px; padding-top: 8px; font-size: clamp(22px,3vw,28px); line-height: 1.25; letter-spacing: -.025em; scroll-margin-top: 90px; }
    .content h4 { margin: 36px 0 14px; font-size: 18px; }
    .content p, .content li { font-size: 16px; line-height: 1.83; color: color-mix(in srgb,var(--text) 91%,var(--muted)); }
    .content p { margin: 18px 0; }
    .content strong { color: var(--text); font-weight: 720; }
    .content em { color: color-mix(in srgb,var(--text) 88%,var(--accent)); }
    .content ul, .content ol { margin: 17px 0; padding-left: 25px; }
    .content li { padding-left: 5px; margin: 7px 0; }
    .content li::marker { color: var(--accent); font-weight: 700; }
    .content blockquote { margin: 26px 0; padding: 17px 20px; border-left: 3px solid var(--accent); border-radius: 0 12px 12px 0; background: color-mix(in srgb,var(--accent) 7%,var(--surface)); color: var(--muted); }
    .content blockquote p { margin: 0; font-size: 15px; }
    .content hr { margin: 48px 0; height: 1px; border: 0; background: var(--line); }
    .content :not(pre) > code { padding: .16em .42em; border: 1px solid var(--line); border-radius: 5px; color: color-mix(in srgb,var(--accent) 85%,var(--text)); background: var(--surface-2); font: .88em/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; }
    .code-wrap { position: relative; margin: 24px 0 28px; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; background: var(--code); box-shadow: var(--shadow); }
    .code-head { height: 38px; padding: 0 12px 0 15px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #252b34; color: #7e8998; font: 10px/1 ui-monospace,SFMono-Regular,monospace; letter-spacing: .09em; text-transform: uppercase; }
    .code-head::before { content: "●  ●  ●"; color: #586170; letter-spacing: 3px; }
    .copy-btn { padding: 5px 8px; border: 0; color: #8d98a8; background: transparent; font: 10px/1 ui-monospace,SFMono-Regular,monospace; cursor: pointer; }
    .copy-btn:hover { color: #62dafb; }
    pre { margin: 0; padding: 20px; overflow: auto; color: #d8dee9; font: 13px/1.72 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; tab-size: 2; }
    table { width: 100%; margin: 24px 0 30px; border-spacing: 0; border-collapse: separate; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; font-size: 14px; }
    th, td { padding: 13px 15px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; line-height: 1.55; }
    th:last-child, td:last-child { border-right: 0; } tr:last-child td { border-bottom: 0; }
    th { color: var(--text); background: var(--surface-2); font-size: 12px; }
    td { color: var(--muted); }
    .table-scroll { overflow-x: auto; margin: 24px 0; }
    .table-scroll table { margin: 0; min-width: 620px; }
    @media (max-width: 620px) { .content table { display: block; overflow-x: auto; white-space: nowrap; } }
    .flow { margin: 32px -24px 38px; padding: 25px; border: 1px solid color-mix(in srgb,var(--accent) 35%,var(--line)); border-radius: 18px; background: radial-gradient(circle at 100% 0,color-mix(in srgb,var(--accent-2) 10%,transparent),transparent 40%),var(--surface); box-shadow: var(--shadow); }
    .flow-top { display: flex; align-items: start; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
    .flow-label { margin-bottom: 6px; color: var(--accent); font: 700 9px/1 ui-monospace,SFMono-Regular,monospace; letter-spacing: .16em; text-transform: uppercase; }
    .flow h4 { margin: 0; font-size: 18px; letter-spacing: -.015em; }
    .flow-note { max-width: 530px; margin: 8px 0 0; color: var(--muted); font-size: 12px; line-height: 1.45; }
    .flow-counter { flex: 0 0 auto; padding: 7px 9px; border: 1px solid var(--line); border-radius: 8px; color: var(--muted); font: 11px/1 ui-monospace,SFMono-Regular,monospace; }
    .flow-inputs { display: flex; flex-wrap: wrap; align-items: end; gap: 10px; margin: -3px 0 18px; }
    .field { display: grid; gap: 5px; color: var(--muted); font-size: 11px; }
    .field input, .field select { min-height: 36px; max-width: 210px; padding: 7px 10px; border: 1px solid var(--line); border-radius: 8px; color: var(--text); background: var(--surface-2); outline: none; }
    .field input:focus, .field select:focus { border-color: var(--accent); }
    .flow-stage { min-height: 164px; padding: 21px; border: 1px solid var(--line); border-radius: 13px; background: color-mix(in srgb,var(--bg) 54%,var(--surface)); overflow-x: auto; }
    .flow-scene { min-width: 610px; min-height: 220px; margin-bottom: 20px; display: grid; place-items: center; border-bottom: 1px dashed var(--line); padding: 4px 0 20px; }
    .flow-path { min-width: max-content; min-height: 76px; display: flex; align-items: stretch; justify-content: center; gap: 25px; }
    .flow-node { position: relative; width: 128px; min-height: 72px; padding: 13px 12px; border: 1px solid var(--line); border-radius: 11px; display: grid; place-content: center; text-align: center; color: var(--faint); background: var(--surface); opacity: .45; transform: translateY(3px); transition: .3s ease; }
    .flow-node:not(:last-child)::after { content: "→"; position: absolute; left: calc(100% + 8px); top: 50%; width: 10px; color: var(--faint); transform: translateY(-50%); }
    .flow-node.active { opacity: 1; color: var(--text); border-color: color-mix(in srgb,var(--accent) 60%,var(--line)); box-shadow: 0 0 0 3px color-mix(in srgb,var(--accent) 7%,transparent); transform: none; }
    .flow-node.current { background: color-mix(in srgb,var(--accent) 10%,var(--surface)); }
    .node-title { font-size: 12px; font-weight: 730; }
    .node-detail { margin-top: 5px; color: var(--muted); font: 10px/1.35 ui-monospace,SFMono-Regular,monospace; white-space: normal; }
    .scene-grid { width: 100%; display: grid; grid-template-columns: 1fr 54px 1fr; align-items: center; gap: 10px; }
    .scene-grid.three { grid-template-columns: 1fr 38px 1fr 38px 1fr; }
    .scene-pipeline { width: 100%; display: flex; align-items: center; gap: 8px; }
    .scene-pipeline .data-card { flex: 1 0 112px; }
    .scene-pipeline .scene-arrow { flex: 0 0 28px; }
    .scene-arrow { display: grid; place-items: center; color: var(--faint); font-size: 22px; transition: .3s ease; }
    .scene-arrow.hot { color: var(--accent); transform: translateX(3px); text-shadow: 0 0 14px color-mix(in srgb,var(--accent) 70%,transparent); }
    .tree-panel { min-height: 174px; padding: 13px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
    .tree-label { margin-bottom: 12px; color: var(--muted); font: 700 9px/1 ui-monospace,SFMono-Regular,monospace; letter-spacing: .12em; text-transform: uppercase; }
    .dom-tree { display: grid; justify-items: center; }
    .dom-root, .dom-child { position: relative; border: 1px solid var(--line); background: var(--surface-2); font: 700 10px/1 ui-monospace,SFMono-Regular,monospace; transition: .35s ease; }
    .dom-root { padding: 8px 15px; border-radius: 8px; color: var(--accent); }
    .dom-branch { position: relative; width: 100%; padding-top: 25px; display: flex; justify-content: center; gap: 7px; }
    .dom-branch::before { content: ""; position: absolute; top: 0; left: 50%; width: 1px; height: 17px; background: var(--line); }
    .dom-child { min-width: 38px; padding: 7px 6px; border-radius: 6px; color: var(--muted); text-align: center; cursor: pointer; }
    .dom-child:hover, .dom-child.selected { transform: translateY(-3px); box-shadow: 0 6px 16px rgba(0,0,0,.22); outline: 2px solid color-mix(in srgb,var(--accent) 35%,transparent); outline-offset: 2px; }
    .dom-child.keep { color: var(--good); border-color: color-mix(in srgb,var(--good) 55%,var(--line)); background: color-mix(in srgb,var(--good) 8%,var(--surface)); }
    .dom-child.change { color: var(--warn); border-color: color-mix(in srgb,var(--warn) 60%,var(--line)); background: color-mix(in srgb,var(--warn) 10%,var(--surface)); animation: nodePulse .65s ease both; }
    .dom-child.add { color: var(--accent); border-color: var(--accent); background: color-mix(in srgb,var(--accent) 12%,var(--surface)); animation: nodePop .45s cubic-bezier(.2,.9,.25,1.25) both; }
    .dom-child.remove { color: #ff7b86; border-color: #ff6675; opacity: .55; text-decoration: line-through; transform: scale(.9); }
    @keyframes nodePop { from { opacity: 0; transform: translateY(-10px) scale(.75); } }
    @keyframes nodePulse { 50% { box-shadow: 0 0 0 5px color-mix(in srgb,var(--warn) 12%,transparent); } }
    .node-stack { display: grid; gap: 7px; }
    .stack-row { display: grid; grid-template-columns: 35px 1fr; gap: 8px; align-items: center; }
    .stack-key { color: var(--faint); font: 9px/1 ui-monospace,SFMono-Regular,monospace; }
    .stack-item { padding: 8px 10px; border: 1px solid var(--line); border-radius: 7px; color: var(--muted); background: var(--surface-2); font: 700 10px/1 ui-monospace,SFMono-Regular,monospace; transition: .3s ease; }
    .stack-item.bad { color: var(--warn); border-color: var(--warn); }
    .stack-item.good { color: var(--good); border-color: var(--good); }
    .stack-item.gone { color: #ff7b86; border-color: #ff6675; opacity: .5; text-decoration: line-through; }
    .legend { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 12px; color: var(--faint); font: 9px/1 ui-monospace,SFMono-Regular,monospace; }
    .legend i { display: inline-block; width: 7px; height: 7px; margin-right: 5px; border-radius: 2px; background: currentColor; }
    .legend .lg-keep { color: var(--good); } .legend .lg-change { color: var(--warn); } .legend .lg-add { color: var(--accent); }
    .data-card { min-height: 128px; padding: 15px; border: 1px solid var(--line); border-radius: 12px; display: grid; place-content: center; justify-items: center; text-align: center; background: var(--surface); transition: .3s ease; }
    .data-card.hot { border-color: var(--accent); background: color-mix(in srgb,var(--accent) 9%,var(--surface)); box-shadow: 0 0 0 4px color-mix(in srgb,var(--accent) 6%,transparent); }
    .data-icon { width: 42px; height: 42px; margin-bottom: 10px; border: 1px solid var(--line); border-radius: 12px; display: grid; place-items: center; color: var(--accent); background: var(--surface-2); font: 800 15px/1 ui-monospace,SFMono-Regular,monospace; }
    .data-name { font-size: 11px; font-weight: 750; }
    .data-value { max-width: 150px; margin-top: 5px; color: var(--muted); font: 9px/1.35 ui-monospace,SFMono-Regular,monospace; overflow-wrap: anywhere; }
    .timeline { width: 100%; display: grid; gap: 18px; }
    .timeline-row { display: grid; grid-template-columns: 76px 1fr; gap: 12px; align-items: center; }
    .timeline-label { color: var(--muted); font: 700 9px/1 ui-monospace,SFMono-Regular,monospace; text-align: right; }
    .timeline-track { height: 38px; padding: 5px; border: 1px solid var(--line); border-radius: 9px; display: flex; gap: 5px; background: var(--surface); }
    .work-block { flex: 1; border-radius: 5px; display: grid; place-items: center; color: var(--muted); background: var(--surface-3); font: 700 9px/1 ui-monospace,SFMono-Regular,monospace; }
    .work-block.on { color: var(--text); background: color-mix(in srgb,var(--accent-2) 42%,var(--surface-2)); }
    .work-block.event { color: #101419; background: var(--warn); animation: nodePop .4s ease both; }
    .work-block.pause { flex: .45; color: var(--accent); border: 1px dashed var(--accent); background: transparent; }
    .flow-explain { min-height: 44px; margin-top: 15px; color: var(--muted); font-size: 13px; line-height: 1.55; }
    .code-trace { width: 100%; margin: 0 0 20px; display: grid; grid-template-columns: minmax(0,1.45fr) minmax(190px,.55fr); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: var(--code); }
    .trace-code { min-width: 0; padding: 10px 0; overflow-x: auto; }
    .trace-head { padding: 9px 12px; color: var(--faint); font: 700 9px/1 ui-monospace,SFMono-Regular,monospace; letter-spacing: .12em; text-transform: uppercase; background: var(--surface-2); }
    .trace-line { min-width: max-content; padding: 4px 14px 4px 0; display: grid; grid-template-columns: 36px 1fr; border-left: 3px solid transparent; color: #8791a1; font: 11px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; transition: .2s ease; }
    .trace-line-number { padding-right: 9px; color: #4f5968; text-align: right; user-select: none; }
    .content .trace-line code { padding: 0; border: 0; border-radius: 0; color: inherit; background: transparent; font: inherit; white-space: pre; }
    .trace-line.done { color: #a8b1bf; background: color-mix(in srgb,var(--good) 4%,transparent); }
    .trace-line.current { border-left-color: var(--accent); color: #f2f7fb; background: color-mix(in srgb,var(--accent) 13%,transparent); box-shadow: inset 3px 0 10px color-mix(in srgb,var(--accent) 8%,transparent); }
    .trace-line.current .trace-line-number { color: var(--accent); font-weight: 800; }
    .trace-result { min-width: 0; border-left: 1px solid var(--line); display: grid; grid-template-rows: auto 1fr; background: color-mix(in srgb,var(--surface-2) 78%,var(--code)); }
    .trace-result-body { padding: 15px; display: grid; align-content: center; gap: 8px; }
    .trace-result-label { color: var(--accent); font: 700 9px/1 ui-monospace,SFMono-Regular,monospace; text-transform: uppercase; letter-spacing: .1em; }
    .trace-result-value { color: var(--text); font: 12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
    .flow-controls { margin-top: 17px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .step-dots { display: flex; gap: 6px; }
    .step-dot { width: 27px; height: 5px; border: 0; border-radius: 4px; background: var(--line); cursor: pointer; }
    .step-dot.active { background: var(--accent); }
    .run-btn { min-width: 106px; padding: 9px 14px; border: 1px solid color-mix(in srgb,var(--accent) 65%,var(--line)); border-radius: 9px; color: var(--bg); background: var(--accent); font-size: 12px; font-weight: 750; cursor: pointer; }
    :root[data-theme="dark"] .run-btn, :root:not([data-theme]) .run-btn { color: #071014; }
    .run-btn:hover { filter: brightness(1.06); }
    .xss-lab { width: 100%; display: grid; grid-template-columns: 1fr 42px 1fr; align-items: stretch; gap: 10px; }
    .xss-panel { min-height: 174px; padding: 14px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
    .xss-panel.bad { border-color: color-mix(in srgb,#ff6675 60%,var(--line)); }
    .xss-panel.good { border-color: color-mix(in srgb,var(--good) 60%,var(--line)); }
    .xss-label { margin-bottom: 10px; color: var(--muted); font: 700 9px/1 ui-monospace,SFMono-Regular,monospace; letter-spacing: .12em; text-transform: uppercase; }
    .xss-output { min-height: 83px; padding: 11px; border: 1px dashed var(--line); border-radius: 8px; color: var(--muted); background: var(--surface-2); font: 11px/1.55 ui-monospace,SFMono-Regular,monospace; overflow-wrap: anywhere; }
    .xss-frame { width: 100%; height: 83px; border: 1px dashed var(--line); border-radius: 8px; background: #fff; }
    .react-lab-frame { width: 100%; height: 490px; border: 1px solid var(--line); border-radius: 10px; background: #fff; }
    .xss-proof { margin-top: 10px; padding: 9px 10px; border-radius: 7px; color: var(--muted); background: var(--surface-2); font-size: 11px; line-height: 1.45; }
    .xss-proof.danger { color: #ff8b95; background: color-mix(in srgb,#ff6675 10%,var(--surface-2)); }
    .xss-proof.safe { color: var(--good); background: color-mix(in srgb,var(--good) 10%,var(--surface-2)); }
    .chapter-nav { margin-top: 64px; padding-top: 24px; border-top: 1px solid var(--line); display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .nav-btn { min-height: 76px; padding: 15px 17px; border: 1px solid var(--line); border-radius: 13px; background: var(--surface); cursor: pointer; text-align: left; }
    .nav-btn.next { text-align: right; }
    .nav-btn:hover { border-color: color-mix(in srgb,var(--accent) 65%,var(--line)); transform: translateY(-1px); }
    .nav-dir { display: block; color: var(--accent); font: 700 10px/1 ui-monospace,SFMono-Regular,monospace; letter-spacing: .1em; text-transform: uppercase; }
    .nav-title { display: block; margin-top: 8px; color: var(--muted); font-size: 12px; line-height: 1.4; }
    .nav-spacer { visibility: hidden; }
    .scrim { display: none; }
    .empty { padding: 60px 0; color: var(--muted); }
    @media (max-width: 920px) {
      :root { --sidebar: 0px; }
      .sidebar { width: min(86vw,310px); transform: translateX(-101%); transition: transform .25s ease; box-shadow: var(--shadow); }
      body.menu-open .sidebar { transform: none; }
      .scrim { position: fixed; z-index: 65; inset: 0; background: rgba(0,0,0,.58); }
      body.menu-open .scrim { display: block; }
      .menu-btn { display: grid; }
      .topbar { left: 0; padding: 0 16px; }
      .topbar-title { display: none; }
      .search-wrap { max-width: none; }
      .main { margin-left: 0; padding: 98px 20px 55px; }
    }
    @media (max-width: 620px) {
      .main { padding-inline: 16px; }
      .chapter-count { display: none; }
      .search-wrap { flex-basis: 0; }
      .content h2 { margin-bottom: 28px; }
      .content h3 { margin-top: 46px; }
      .content p, .content li { font-size: 15px; line-height: 1.78; }
      .flow { margin-inline: -8px; padding: 18px; border-radius: 15px; }
      .flow-top { gap: 8px; }
      .flow-stage { padding: 17px; }
      .flow-scene { min-width: 560px; }
      .code-trace { min-width: 560px; grid-template-columns: 1.35fr .65fr; }
      .flow-path { justify-content: flex-start; }
      .xss-lab { grid-template-columns: 1fr; }
      .xss-lab > .scene-arrow { transform: rotate(90deg); }
      .chapter-nav { grid-template-columns: 1fr; }
      .nav-btn.next { text-align: left; }
      .nav-spacer { display: none; }
      pre { font-size: 12px; padding: 17px; }
    }
    @media (prefers-reduced-motion: reduce) { *,*::before,*::after { scroll-behavior: auto!important; animation-duration: .01ms!important; transition-duration: .01ms!important; } }
  </style>
</head>
<body>
  <div class="progress-rail"><div class="progress-bar" id="progressBar"></div></div>
  <aside class="sidebar" id="sidebar" aria-label="Danh sách chương">
    <div class="brand"><div class="brand-mark">R</div><div><strong>React Explorer</strong><span>Deep learning notes</span></div></div>
    <div class="side-label">Các chương</div>
    <ol class="chapter-list" id="chapterList"></ol>
    <div class="source-meta" id="sourceMeta"></div>
  </aside>
  <div class="scrim" id="scrim"></div>
  <header class="topbar">
    <div class="top-actions"><button class="icon-btn menu-btn" id="menuBtn" aria-label="Mở danh sách chương" aria-expanded="false" aria-controls="sidebar">☰</button><div class="topbar-title"><div class="eyebrow">React Explorer</div><div class="current-title" id="currentTitle"></div></div></div>
    <div class="search-wrap"><label class="sr-only" for="globalSearch">Tìm trong toàn bộ tài liệu</label><input class="search-input" id="globalSearch" type="search" autocomplete="off" placeholder="Tìm trong tài liệu…"><div class="search-results" id="searchResults" role="listbox" hidden></div></div><div class="top-actions"><span class="chapter-count" id="chapterCount"></span><button class="icon-btn" id="themeBtn" aria-label="Đổi giao diện sáng tối" aria-pressed="false">◐</button></div>
  </header>
  <main class="main"><div class="reader"><div class="chapter-kicker" id="chapterKicker"></div><article class="content" id="content"></article><nav class="chapter-nav" id="chapterNav"></nav></div></main>
  <script>
    const SOURCE_B64 = '${encodedSource}';
    const SOURCE = new TextDecoder().decode(Uint8Array.from(atob(SOURCE_B64), c => c.charCodeAt(0)));
    const CHAPTER_RENDER_B64 = '${encodedChapterRender}';
    const CHAPTER_RENDER = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(CHAPTER_RENDER_B64), c => c.charCodeAt(0))));

    const escapeHtml = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const slugify = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    function splitSource(source) {
      const matches = [...source.matchAll(/^## (.+)$/gm)];
      const preface = source.slice(0, matches[0].index).trim();
      return matches.map((match, index) => {
        const start = match.index;
        const end = matches[index + 1]?.index ?? source.length;
        const raw = source.slice(start, end).trim();
        const prefix = source.slice(Math.max(0, start - 100), start);
        const contentIdMatch = prefix.match(new RegExp('<' + '!--\\s*content-id:\\s*([a-z0-9-]+)\\s*--' + '>\\s*$', 'i'));
        const contentId = contentIdMatch ? contentIdMatch[1] : undefined;
        if (!contentId) throw new Error('Missing stable content-id before chapter: ' + match[1]);
        const rendered = CHAPTER_RENDER.find(chapter => chapter.id === contentId);
        if (!rendered) throw new Error('Missing rendered chapter AST for: ' + contentId);
        return { index, id: contentId, title: match[1], slug: contentId, raw: index === 0 ? preface + '\n\n' + raw : raw, html:rendered.html, sections:rendered.sections };
      });
    }

    const FLOW_DEFS = {
      snapshot: { title:'Snapshot: handler cũ không đổi giá trị của nó', anchor:'Hãy đọc handler như một “bức ảnh chụp”', steps:[
        {name:'Render A',detail:'count = 0',text:'React gọi component và tạo handler đọc count bằng 0.'},
        {name:'Click',detail:'setCount(1)',text:'Handler yêu cầu React cập nhật state; binding count trong handler này chưa đổi.'},
        {name:'Render B',detail:'count = 1',text:'React gọi component lần mới với binding count mới.'},
        {name:'Handler A',detail:'vẫn thấy 0',text:'Callback cũ vẫn là closure của render A. Đây là cơ chế, không tự nó là lỗi.'}
      ]},
      xssLab: { title:'XSS: cùng một dữ liệu, hai cách render', anchor:'Demo bên dưới dùng payload vô hại', steps:[
        {name:'Input',detail:'name=<script>…',text:'Kẻ tấn công kiểm soát giá trị name trong request. Ở bước này nó vẫn chỉ là một chuỗi dữ liệu.'},
        {name:'Ghép chuỗi',detail:'HTML chứa payload',text:'Server nối dữ liệu vào template mà không encode, làm mất ranh giới giữa text và HTML/JavaScript.'},
        {name:'Browser parse',detail:'JavaScript chạy',text:'Khung sandbox thực thi payload minh họa vô hại và đổi dòng trạng thái — bằng chứng trình duyệt đã hiểu dữ liệu là mã.'},
        {name:'Encode output',detail:'< → &lt;',text:'Khi encode đúng, cùng payload chỉ xuất hiện như văn bản; trình duyệt không tạo thẻ script và không chạy mã.'}
      ]},
      repaint: { title:'Vẽ lại toàn bộ vs chỉ vá phần đổi', anchor:'render lại cả 1000 tin nhắn cũ + 1 tin mới', fields:[{key:'size',label:'Số tin nhắn cũ',type:'number',value:'1000'}], build:v=>[
        {name:'Tin nhắn mới',detail:'+ 1 item',text:'Một tin nhắn mới được thêm vào danh sách.'},
        {name:'Ghi đè toàn bộ',detail:(v.size||1000)+' node cũ bị dựng lại',text:'Cách truyền thống ghi đè toàn bộ DOM dù chỉ có một phần tử đổi.'},
        {name:'Đối chiếu UI',detail:'mô tả mới ↔ cũ',text:'React đối chiếu mô tả UI để quyết định cập nhật renderer.'},
        {name:'Commit',detail:'thường chèn 1 node',text:'Với trường hợp đơn giản này commit thường chèn node mới; đây không phải benchmark hay cam kết cho mọi UI.'}
      ]},
      oneWay: { title:'One-way Data Flow', anchor:'function Child({ onIncrease })', steps:[
        {name:'Child',detail:'click “Tăng”',text:'Child phát sinh tương tác nhưng không tự sửa state.'},
        {name:'Callback đi lên',detail:'onIncrease()',text:'Child gọi callback function mà Parent đã truyền xuống.'},
        {name:'Parent',detail:'setCount(count + 1)',text:'Parent — nơi sở hữu state — quyết định cập nhật count.'},
        {name:'Props đi xuống',detail:'Parent → Child',text:'Giá trị mới tiếp tục chảy từ cha xuống con qua props.'}
      ]},
      jsx: { title:'JSX → object JavaScript', anchor:"children: 'Hello'", steps:[
        {name:'JSX',detail:'<h1>Hello</h1>',text:'Bạn viết JSX để mô tả giao diện.'},
        {name:'Babel',detail:'transform',text:'JSX bắt buộc qua bước biên dịch trước khi trình duyệt chạy.'},
        {name:'Object JS',detail:"type: 'h1' · props.children",text:'Kết quả là object JavaScript mô tả giao diện, không phải HTML thật.'}
      ]},
      reconciliation: { title:'Reconciliation — 4 giai đoạn', anchor:'messages.map(msg => <div key={msg.id}', steps:[
        {name:'Render đầu tiên',detail:'UI → host nodes',text:'React tính UI ban đầu rồi commit các host node cần thiết.'},
        {name:'Re-render',detail:'state đổi · UI mới',text:'React có thể gọi lại component để tính UI kế tiếp; DOM chưa chắc đổi ở pha này.'},
        {name:'Reconciliation',detail:'mô tả mới ↔ cũ',text:'React đối chiếu mô tả UI theo type, key và các quy tắc nhận diện.'},
        {name:'Commit',detail:'cập nhật renderer',text:'React DOM áp thay đổi cần thiết; trình duyệt tự quyết định style, layout và paint.'}
      ]},
      keys: { title:'Xóa A: key=index vs key=id', anchor:'key={item.id} data={item}', fields:[{key:'items',label:'Danh sách (xóa phần tử đầu)',type:'text',value:'A, B, C'}], build:v=>{
        const items=(v.items||'A, B, C').split(',').map(x=>x.trim()).filter(Boolean); const after=items.slice(1); const first=items[0]||'A';
        return [
          {name:'Trước khi xóa',detail:items.map((x,i)=>x+' / key='+i).join(' · '),text:'Danh sách ban đầu dùng vị trí làm key.'},
          {name:'Xóa '+first,detail:after.map((x,i)=>x+' / key='+i).join(' · ')||'Danh sách rỗng',text:'Với key=index, key cũ được gắn sang item khác nên state nội bộ có thể “dính” sai.'},
          {name:'Dùng key=id',detail:after.map(x=>x+' / key='+x).join(' · ')||'Danh sách rỗng',text:'Với id ổn định, React nhận diện đúng '+first+' biến mất; các item còn lại giữ nguyên danh tính.'}
        ];
      }},
      fiber: { title:'Stack Reconciler vs React Fiber', anchor:'Concurrent Rendering', steps:[
        {name:'Stack',detail:'A → B → C → D',text:'Stack Reconciler chạy một khối đồng bộ và không thể dừng giữa chừng.'},
        {name:'Main thread',detail:'bị chiếm dụng',text:'Công việc lớn có thể khiến scroll, click và animation bị giật.'},
        {name:'Fiber',detail:'A · B  | pause |  C · D',text:'Fiber biểu diễn công việc để scheduler có thể nhường ở các điểm phù hợp.'},
        {name:'Nhường ưu tiên',detail:'click / tương tác',text:'React có thể ưu tiên công việc tương tác rồi tiếp tục, làm lại hoặc bỏ render nền trước commit.'}
      ]},
      hooks: { title:'Class lifecycle ↔ useEffect + cleanup', anchor:'đơn vị tính năng', steps:[
        {name:'Class · Mount',detail:'componentDidMount',text:'Class đặt logic đăng ký trong componentDidMount.'},
        {name:'Hook · Effect',detail:'useEffect',text:'Hook đặt logic đăng ký trong callback của useEffect.'},
        {name:'Class · Unmount',detail:'componentWillUnmount',text:'Class tách logic dọn dẹp sang lifecycle method khác.'},
        {name:'Hook · Cleanup',detail:'return () => ...',text:'Hook đặt cleanup ngay cùng khối với logic đăng ký liên quan.'}
      ]},
      redux: { title:'Luồng cập nhật Redux', anchor:'dispatch(removeItem(item.id))', fields:[{key:'action',label:'Action',type:'select',options:['addItem(product)','removeItem(item.id)','applyDiscount(percent)']}], build:v=>[
        {name:'dispatch',detail:v.action||'addItem(product)',text:'Component chỉ yêu cầu thay đổi qua dispatch, không tự sửa state.'},
        {name:'reducer',detail:'cartSlice.reducers',text:'Reducer là nơi duy nhất xử lý action theo quy tắc đã định nghĩa.'},
        {name:'store update',detail:'state mới · immutable',text:'Store nhận state mới; với RTK, Immer đảm bảo immutable phía sau.'},
        {name:'useSelector',detail:'state.cart.items',text:'Component đọc lại đúng phần dữ liệu cần dùng từ store.'},
        {name:'UI',detail:'render lại',text:'UI phản ánh dữ liệu mới sau khi store cập nhật.'}
      ]},
      batching: { title:'Batching: giá trị cũ vs functional update', anchor:'count tăng đúng 3, vì mỗi lần React đưa', steps:[
        {name:'Giá trị ban đầu',detail:'count = 0',text:'Cả hai cách đều bắt đầu với count bằng 0.'},
        {name:'Dạng count + 1',detail:'1 · 1 · 1',text:'Ba lời gọi cùng đọc count cũ bằng 0, nên đều yêu cầu cập nhật thành 1.'},
        {name:'Functional update',detail:'0 → 1 → 2 → 3',text:'Mỗi callback nhận prev mới nhất từ lần cập nhật ngay trước.'},
        {name:'Commit',detail:'sai: 1 · đúng: 3',text:'React batching thành một lần render; functional update vẫn tạo kết quả đúng là 3.'}
      ]},
      requestReducer: { title:'useReducer: request chỉ có state hợp lệ', anchor:'return <div>{state.data.name}</div>;', fields:[{key:'requestAction',label:'Kết quả request',type:'select',options:['FETCH_SUCCESS','FETCH_ERROR']}], build:v=>[
        {name:'dispatch',detail:'FETCH_START',text:'Bắt đầu request bằng một action duy nhất.'},
        {name:'reducer',detail:'loading=true · error=null',text:'Reducer trả về đầy đủ một object state hợp lệ cho trạng thái đang tải.'},
        {name:'fetch',detail:v.requestAction||'FETCH_SUCCESS',text:'Request hoàn thành và dispatch action tương ứng.'},
        {name:'state mới',detail:(v.requestAction==='FETCH_ERROR'?'loading=false · error=err':'loading=false · data=json'),text:'Reducer đồng bộ data, isLoading và error trong một lần.'},
        {name:'UI',detail:v.requestAction==='FETCH_ERROR'?'Lỗi: error.message':'state.data.name',text:'UI chọn đúng nhánh từ state mới.'}
      ]},
      effectCycle: { title:'Vòng chạy của useEffect và cleanup', anchor:'}, [dependencies]);', steps:[
        {name:'Render',detail:'component chạy',text:'Component render trước; effect chưa chạy trong lúc render.'},
        {name:'Effect',detail:'đăng ký side effect',text:'Sau render, React chạy callback của useEffect.'},
        {name:'Dependency đổi',detail:'render tiếp theo',text:'Khi dependency đổi, component tạo render mới.'},
        {name:'Cleanup',detail:'return () => ...',text:'React chạy cleanup của effect cũ trước khi chạy effect mới.'},
        {name:'Effect mới',detail:'dependency mới',text:'Effect được đăng ký lại với giá trị dependency mới.'}
      ]},
      fetchCleanup: { title:'userId đổi: cleanup chặn response cũ', anchor:'return user ? <div>{user.name}</div>', fields:[{key:'userId',label:'userId mới',type:'text',value:'2'}], build:v=>[
        {name:'Effect cũ',detail:'fetch /users/1',text:'Request cho userId cũ đang chạy.'},
        {name:'userId đổi',detail:'1 → '+(v.userId||'2'),text:'Dependency đổi làm component render lại.'},
        {name:'Cleanup',detail:'cancelled = true',text:'Cleanup đánh dấu request cũ đã bị hủy trước khi effect mới chạy.'},
        {name:'Effect mới',detail:'fetch /users/'+(v.userId||'2'),text:'Effect mới gửi request theo userId mới.'},
        {name:'setUser',detail:'chỉ response mới',text:'Điều kiện !cancelled ngăn response cũ ghi đè dữ liệu mới.'}
      ]},
      staleClosure: { title:'Stale closure: vì sao count đứng ở 1', anchor:'snapshot lúc mount', steps:[
        {name:'Mount',detail:'count = 0',text:'Effect đăng ký interval từ snapshot lúc mount.'},
        {name:'Closure',detail:'callback giữ count = 0',text:'Callback của interval đóng gói giá trị count tại thời điểm được tạo.'},
        {name:'Tick 1',detail:'0 + 1 → setCount(1)',text:'Lần đầu state đổi từ 0 thành 1 và UI render lại.'},
        {name:'Tick 2, 3…',detail:'vẫn 0 + 1 → 1',text:'Interval vẫn dùng callback cũ; React nhận lại giá trị 1 nên không render tiếp.'}
      ]},
      memo: { title:'useMemo: dependency quyết định có filter lại', anchor:'}, [products, keyword]);', fields:[{key:'memoCase',label:'Lần render tiếp theo',type:'select',options:['Parent re-render, deps giữ nguyên','keyword đổi']}], build:v=>[
        {name:'Render',detail:'ProductList',text:'Component được gọi lại.'},
        {name:'So sánh deps',detail:'[products, keyword]',text:'useMemo so sánh reference products và giá trị keyword với lần trước.'},
        {name:v.memoCase==='keyword đổi'?'Cache miss':'Cache hit',detail:v.memoCase==='keyword đổi'?'chạy filter 10.000 item':'dùng filtered đã nhớ',text:v.memoCase==='keyword đổi'?'Dependency đổi nên hàm filter chạy lại.':'Dependencies giữ nguyên nên React trả lại kết quả đã ghi nhớ.'},
        {name:'Render danh sách',detail:'filtered.map(...)',text:'UI nhận cùng một kết quả, nhưng tránh được tính toán thừa khi cache hit.'}
      ]},
      callbackMemo: { title:'useCallback giữ reference cho React.memo', anchor:'ExpensiveChild render', steps:[
        {name:'Parent render',detail:'count đổi',text:'State của Parent đổi làm Parent render lại.'},
        {name:'useCallback',detail:'dependency []',text:'useCallback trả lại đúng reference handleClick từ lần trước.'},
        {name:'React.memo',detail:'so sánh prop onClick',text:'React.memo có thể bỏ qua lần render do cha khi props không đổi theo phép so sánh của nó.'},
        {name:'ExpensiveChild',detail:'có thể bỏ qua',text:'State hoặc context của chính con vẫn có thể làm con cập nhật; memo là tối ưu, không phải điều kiện đúng đắn.'}
      ]},
      contextFlow: { title:'Context bỏ qua các tầng props trung gian', anchor:'const user = useContext(UserContext)', steps:[
        {name:'Provider',detail:'value={user}',text:'UserContext.Provider cung cấp user cho toàn bộ cây con.'},
        {name:'Layout',detail:'không nhận user prop',text:'Layout chỉ nằm trong cây, không cần truyền hộ dữ liệu.'},
        {name:'Section / Panel',detail:'không prop drilling',text:'Các tầng trung gian tiếp tục không cần biết đến user.'},
        {name:'ProfileCard',detail:'useContext(UserContext)',text:'ProfileCard đọc trực tiếp giá trị từ Provider gần nhất.'}
      ]},
      requestRace: { title:'Request race: A không được ghi đè B', anchor:'Checklist cho một resource', steps:[
        {name:'A bắt đầu',detail:'userId = 1',text:'Màn hình tạo request A cho user 1.'},
        {name:'B bắt đầu',detail:'userId = 2',text:'Người dùng đổi ngữ cảnh, request B là đại diện cho màn hình hiện tại.'},
        {name:'B hoàn tất',detail:'commit user 2',text:'UI nhận dữ liệu B vì request/key vẫn hiện hành.'},
        {name:'A hoàn tất muộn',detail:'bỏ qua / abort',text:'Request ID, key hoặc AbortController ngăn A ghi đè B.'}
      ]},
      transition: { title:'Urgent input và transition', anchor:'urgent: input phản hồi ngay', steps:[
        {name:'Gõ ký tự',detail:'setQuery',text:'Giá trị điều khiển input được cập nhật khẩn cấp.'},
        {name:'Transition',detail:'setFilter',text:'Cập nhật danh sách tốn kém được đánh dấu không khẩn cấp.'},
        {name:'Pending',detail:'isPending',text:'UI có thể báo đang cập nhật nhưng vẫn nhận thao tác tiếp.'},
        {name:'UI theo kịp',detail:'Results',text:'React có thể làm gián đoạn và thay thế render nền trước commit.'}
      ]},
      asyncOrder: { title:'Event loop: bắt đầu trước không có nghĩa hoàn tất trước', anchor:'b có thể resolve trước a.', steps:[
        {name:'Call stack',detail:'khởi tạo A',text:'Request A được khởi tạo trước và trả về Promise đang chờ.'},
        {name:'Call stack',detail:'khởi tạo B',text:'Request B được khởi tạo sau nhưng chạy độc lập với A.'},
        {name:'B resolve',detail:'microtask B',text:'B hoàn tất trước; continuation của B được đưa vào hàng microtask.'},
        {name:'A resolve',detail:'microtask A',text:'A hoàn tất muộn hơn. Thứ tự kết quả là B rồi A, không phải thứ tự bắt đầu.'}
      ]},
      immutableFlow: { title:'Immutable update: giữ identity cũ, thay đúng nhánh đổi', anchor:'Nếu có thể tính một giá trị từ props/state', steps:[
        {name:'State cũ',detail:'todos · identity A',text:'State hiện tại là một snapshot có identity riêng.'},
        {name:'map',detail:'duyệt từng todo',text:'Các item không đổi được tái sử dụng cùng reference.'},
        {name:'Copy item đổi',detail:'{ ...todo, done }',text:'Chỉ item cần sửa được tạo object mới.'},
        {name:'State mới',detail:'array identity B',text:'Setter nhận array mới; giá trị suy ra tiếp tục được tính trong render, không lưu state trùng.'}
      ]},
      declarativeFlow: { title:'Declarative: state đi qua một hàm mô tả UI', anchor:'Công thức cốt lõi:', steps:[
        {name:'Tương tác',detail:'click',text:'Người dùng tạo một sự kiện.'},
        {name:'State',detail:'count: 0 → 1',text:'Handler yêu cầu cập nhật state, không tự sửa từng DOM node.'},
        {name:'Render',detail:'UI = f(state)',text:'Component mô tả lại text và màu từ cùng một nguồn state.'},
        {name:'Commit',detail:'DOM đồng bộ',text:'React DOM áp các thay đổi cần thiết để giao diện khớp mô tả mới.'}
      ]},
      compositionFlow: { title:'Composition: ghép cây component qua children', anchor:'React ưu tiên Composition hơn Inheritance.', steps:[
        {name:'App',detail:'chọn UserCard',text:'Component cha đặt UserCard vào cây giao diện.'},
        {name:'UserCard',detail:'dùng Card',text:'UserCard ghép Card thay vì kế thừa từ Card.'},
        {name:'children',detail:'Avatar + h3',text:'Nội dung được truyền qua children như một phần của mô tả UI.'},
        {name:'Cây UI',detail:'Card bao nội dung',text:'Kết quả là cây component có thể thay nội dung mà không cần tạo class con.'}
      ]},
      refFlow: { title:'useRef: cùng một hộp qua render, đổi current không render lại', anchor:'Điểm khác biệt cốt lõi so với', steps:[
        {name:'Render',detail:'ref object được tạo',text:'React trả về một ref object và giữ nguyên identity của nó.'},
        {name:'Gắn DOM',detail:'ref.current = input',text:'Sau commit, current trỏ đến DOM node thật.'},
        {name:'Event',detail:'input.focus()',text:'Handler đọc current để gọi API imperative của DOM.'},
        {name:'Đổi current',detail:'không schedule render',text:'Gán current chỉ đổi chiếc hộp; nếu UI cần phản ánh giá trị, hãy dùng state.'}
      ]},
      customHookFlow: { title:'Custom Hook: chia sẻ logic, không chia sẻ state instance', anchor:'Nếu cần thêm debounce', steps:[
        {name:'Sidebar',detail:'useWindowWidth()',text:'Sidebar gọi hook và nhận một state instance của riêng nó.'},
        {name:'Header',detail:'useWindowWidth()',text:'Header dùng lại cùng logic nhưng có state/effect instance riêng.'},
        {name:'Hook',detail:'listener + cleanup',text:'Quy tắc đăng ký resize và cleanup chỉ được viết tại một nơi.'},
        {name:'Thay đổi logic',detail:'thêm debounce',text:'Sửa implementation của hook giúp mọi nơi gọi dùng cùng quy tắc mới.'}
      ]},
      thunkFlow: { title:'createAsyncThunk: một request, ba action vòng đời', anchor:'chuẩn hóa vòng đời', steps:[
        {name:'pending',detail:'requestId = A',text:'Thunk dispatch pending trước khi chạy payload creator; reducer bật loading và giữ requestId.'},
        {name:'payload creator',detail:'await fetch',text:'Promise chạy và có thể hoàn tất hoặc throw.'},
        {name:'fulfilled',detail:'payload = user',text:'Thành công tạo fulfilled; reducer chỉ nhận nếu requestId còn hiện hành.'},
        {name:'rejected',detail:'error.message',text:'Nếu throw, rejected đi vào nhánh lỗi thay cho fulfilled.'}
      ]},
      statePlacement: { title:'Đặt state đúng nơi: một cây quyết định ngắn', anchor:'Trước khi chọn', steps:[
        {name:'Suy ra được?',detail:'có → tính khi render',text:'Không lưu bản sao nếu giá trị có thể tính từ props/state khác.'},
        {name:'Chỉ dùng cục bộ?',detail:'có → local state',text:'Đặt state gần component tương tác nhất.'},
        {name:'Cần URL?',detail:'có → URL state',text:'Đưa phần cần chia sẻ, bookmark hoặc phục hồi vào URL.'},
        {name:'Từ server?',detail:'key + cache',text:'Mô hình hóa server state bằng key, độ stale, retry và invalidation.'}
      ]},
      controlledForm: { title:'Controlled input: DOM → state → validation → UI', anchor:'Input controlled nhận', fields:[{key:'email',label:'Email thử nghiệm',type:'text',value:'a@b.dev'}], build:v=>[
        {name:'Input event',detail:v.email||'(rỗng)',text:'Trình duyệt phát onChange với giá trị mới.'},
        {name:'setEmail',detail:'state nhận value',text:'Handler yêu cầu React lưu giá trị input.'},
        {name:'Derived valid',detail:(v.email||'').includes('@')?'true':'false',text:'Validation được tính từ email trong render, không cần state valid riêng.'},
        {name:'UI',detail:(v.email||'').includes('@')?'ẩn cảnh báo':'hiện cảnh báo',text:'value và thông báo đều được mô tả từ cùng state email.'}
      ]},
      serverCache: { title:'Server state: key, cache, stale và revalidation', anchor:'Checklist cho một resource', steps:[
        {name:'Resource key',detail:"['user', userId]",text:'Key nhận diện chính xác dữ liệu mà màn hình đang yêu cầu.'},
        {name:'Cache lookup',detail:'fresh / stale / miss',text:'Cache quyết định có thể dùng dữ liệu sẵn có hay cần fetch.'},
        {name:'Fetch',detail:'request theo key',text:'Request mới gắn với key; response của key cũ không đại diện màn hình hiện tại.'},
        {name:'Revalidate',detail:'cache + UI đồng bộ',text:'Kết quả hợp lệ cập nhật cache, rồi subscriber của đúng key nhận dữ liệu.'}
      ]},
      suspenseFlow: { title:'Suspense boundary: child suspend, fallback giữ ranh giới', anchor:'không tự kích hoạt Suspense', steps:[
        {name:'Render child',detail:'đọc resource',text:'React bắt đầu render nội dung bên trong boundary.'},
        {name:'Suspend',detail:'resource chưa sẵn sàng',text:'Child báo chưa thể hoàn tất render qua cơ chế có hỗ trợ Suspense.'},
        {name:'Fallback',detail:'Skeleton',text:'Boundary gần nhất hiển thị fallback thay cho vùng nội dung đang chờ.'},
        {name:'Retry render',detail:'resource sẵn sàng',text:'React thử render lại child và commit nội dung hoàn chỉnh.'}
      ]},
      errorBoundaryFlow: { title:'Error Boundary: cô lập lỗi render theo nhánh cây', anchor:'Error Boundary hiển thị fallback', steps:[
        {name:'Render child',detail:'ProductPanel',text:'Boundary render cây con bình thường.'},
        {name:'Throw',detail:'lỗi trong render',text:'Một descendant throw khi React đang render.'},
        {name:'Catch boundary',detail:'error state',text:'Boundary gần nhất chuyển sang trạng thái lỗi; sibling ngoài boundary vẫn tồn tại.'},
        {name:'Fallback / retry',detail:'tạo lần thử mới',text:'Fallback cho người dùng thao tác retry; ứng dụng phải quyết định cách reset đúng state/resource.'}
      ]},
      testingFlow: { title:'Test hành vi: thao tác như người dùng, kiểm tra UI', anchor:'Test nên kiểm tra điều người dùng', steps:[
        {name:'Render',detail:'<EmailField />',text:'Test dựng component từ public API của nó.'},
        {name:'Query',detail:'role + accessible name',text:'Tìm control theo cách người dùng và assistive technology nhận biết.'},
        {name:'Interact',detail:'type email',text:'user-event mô phỏng chuỗi thao tác thay vì gọi thẳng handler nội bộ.'},
        {name:'Assert',detail:'alert không tồn tại',text:'Kiểm tra kết quả quan sát được, không phụ thuộc state hay tên hàm bên trong.'}
      ]},
      accessibilityFlow: { title:'Accessibility: semantic → name → keyboard → feedback', anchor:'Ưu tiên HTML semantic', steps:[
        {name:'Semantic HTML',detail:'button / label',text:'Chọn element đúng tạo sẵn role và hành vi nền tảng.'},
        {name:'Accessible name',detail:'label liên kết input',text:'Control có tên để screen reader và query theo role nhận diện.'},
        {name:'Keyboard + focus',detail:'Tab / Enter',text:'Người dùng bàn phím tiếp cận, thao tác và nhìn thấy focus.'},
        {name:'Feedback',detail:'text + ARIA phù hợp',text:'Thông báo không chỉ dựa vào màu; kiểm tra tự động được bổ sung bằng thử nghiệm thủ công.'}
      ]},
      liveReact: { title:'React lab: key, closure và request race', anchor:'React lab — phòng lab cô lập', live:true }
    };

    const TRACE_DEFS = {
      snapshot: { code:[
        'function render(count) {',
        '  const handleClick = () => setCount(count + 1);',
        '  return handleClick;',
        '}',
        'const handlerA = render(0);',
        'handlerA();',
        'const handlerB = render(1);',
        'handlerA();'
      ], at:[[0,4],[1,5],[0,6],[7]], results:['handlerA đóng gói count = 0','enqueue state = 1; handlerA vẫn thấy 0','handlerB đóng gói count = 1','handlerA cũ vẫn tính 0 + 1 = 1'] },
      xssLab: { code:[
        'const name = request.query.name;',
        'const html = "<h1>Chào " + name + "</h1>";',
        'browser.parse(html);',
        'const safe = escapeHtml(name);',
        'browser.parse("<h1>Chào " + safe + "</h1>");'
      ], at:[[0],[1],[2],[3,4]], results:['name là chuỗi chưa tin cậy','response chứa một node script','script chạy trong iframe sandbox','payload hiển thị như text; không có script node'] },
      repaint: values => { const size=Math.max(1,Number(values.size)||1000); return { code:[
        'messages.push(newMessage);',
        'chatBox.innerHTML = renderAll(messages);',
        'const nextTree = render(messages);',
        'const changes = diff(previousTree, nextTree);',
        'commit(changes);'
      ], at:[[0],[1],[2,3],[4]], results:['messages.length = '+(size+1),'dựng lại '+(size+1)+' DOM node','changes = [{ type: "INSERT", index: '+size+' }]','DOM chèn thêm đúng node #'+(size+1)] }; },
      oneWay: { code:[
        'function Child({ count, onIncrease }) {',
        '  return <button onClick={onIncrease}>{count}</button>;',
        '}',
        'const onIncrease = () => setCount(c => c + 1);',
        '<Child count={count} onIncrease={onIncrease} />;'
      ], at:[[1],[1,3],[3],[4]], results:['Child phát sinh sự kiện click','onIncrease được gọi','Parent enqueue count + 1','Child nhận count mới qua props'] },
      jsx: { code:[
        'const source = <h1 className="title">Hello</h1>;',
        '// compiler transform',
        'const element = _jsx("h1", {',
        '  className: "title", children: "Hello"',
        '});'
      ], at:[[0],[1],[2,3,4]], results:['đầu vào: cú pháp JSX','JSX được compiler chuyển đổi','element = { type: "h1", props: { ... } }'] },
      reconciliation: { code:[
        'const previousTree = render({ count: 0 });',
        'commit(mount(previousTree));',
        'const nextTree = render({ count: 1 });',
        'const changes = reconcile(previousTree, nextTree);',
        'commit(changes);'
      ], at:[[0,1],[2],[3],[4]], results:['DOM: h1, p(count=0), button','tạo mô tả p(count=1); DOM chưa đổi','changes = [UPDATE_TEXT p]','DOM: chỉ text trong p đổi thành 1'] },
      keys: values => { const items=(values.items||'A, B, C').split(',').map(x=>x.trim()).filter(Boolean); const first=items[0]||'A'; const after=items.slice(1); return { code:[
        'const before = ['+items.map(x=>'"'+x+'"').join(', ')+'];',
        'render(before, (item, index) => index);',
        'const after = before.slice(1);',
        'render(after, (item, index) => index);',
        'render(after, item => item.id);'
      ], at:[[0,1],[2,3],[4]], results:['key theo vị trí: '+items.map((x,i)=>i+'→'+x).join(', '),'key cũ đổi chủ: '+after.map((x,i)=>i+'→'+x).join(', ')+'; '+first+' bị xóa','key theo id: '+after.map(x=>x+'→'+x).join(', ')+'; state bám đúng item'] }; },
      fiber: { code:[
        'while (nextUnit) { performUnit(nextUnit); }',
        '// main thread chưa thể nhận click',
        'while (nextUnit && !shouldYield()) {',
        '  nextUnit = performUnit(nextUnit);',
        '}',
        'schedule(highPriorityClick);'
      ], at:[[0],[1],[2,3,4],[5]], results:['A → B → C → D chạy liền một khối','click phải chờ công việc đồng bộ hoàn tất','Fiber dừng tại ranh giới unit of work','click được ưu tiên; render nền có thể tiếp tục/làm lại'] },
      hooks: { code:[
        'componentDidMount() { subscribe(id); }',
        'componentWillUnmount() { unsubscribe(id); }',
        'useEffect(() => {',
        '  subscribe(id);',
        '  return () => unsubscribe(id);',
        '}, [id]);'
      ], at:[[0],[2,3],[1],[4,5]], results:['class đăng ký khi mount','effect đăng ký sau commit','class cleanup nằm ở method khác','hook đặt subscribe và unsubscribe cạnh nhau'] },
      redux: values => ({ code:[
        'dispatch('+String(values.action||'addItem(product)')+');',
        'const nextState = cartReducer(state, action);',
        'store.setState(nextState);',
        'const items = useSelector(s => s.cart.items);',
        'return <Cart items={items} />;'
      ], at:[[0],[1],[2],[3],[4]], results:['action được gửi tới store','reducer tính state kế tiếp','subscriber được thông báo','component đọc items mới','UI render từ state mới'] }),
      batching: { code:[
        'let count = 0;',
        'setCount(count + 1); // enqueue 1',
        'setCount(count + 1); // enqueue 1',
        'setCount(count + 1); // enqueue 1',
        'setCount(prev => prev + 1); // 0 → 1',
        'setCount(prev => prev + 1); // 1 → 2',
        'setCount(prev => prev + 1); // 2 → 3',
        'commit();'
      ], at:[[0],[1,2,3],[4,5,6],[7]], results:['snapshot count = 0','queue thay thế: [1, 1, 1]','queue hàm: 0 → 1 → 2 → 3','kết quả trực tiếp = 1; functional = 3'] },
      requestReducer: values => { const action=values.requestAction||'FETCH_SUCCESS'; const failed=action==='FETCH_ERROR'; return { code:[
        'dispatch({ type: "FETCH_START" });',
        'state = reducer(state, startAction);',
        'const result = await fetchUser();',
        'dispatch({ type: "'+action+'", payload: result });',
        'state = reducer(state, resultAction);',
        'return state.isLoading ? <Spinner /> : <Profile />;'
      ], at:[[0],[1],[2,3],[4],[5]], results:['action = FETCH_START','{ data:null, isLoading:true, error:null }',action+' được dispatch',failed?'{ data:null, isLoading:false, error:err }':'{ data:user, isLoading:false, error:null }',failed?'UI hiển thị error.message':'UI hiển thị state.data.name'] }; },
      effectCycle: { code:[
        'function Component({ roomId }) {',
        '  useEffect(() => {',
        '    const connection = connect(roomId);',
        '    return () => connection.disconnect();',
        '  }, [roomId]);',
        '}'
      ], at:[[0],[1,2],[0,4],[3],[1,2]], results:['render với roomId hiện tại','effect kết nối sau commit','roomId đổi; tạo render kế tiếp','ngắt connection của roomId cũ','kết nối bằng roomId mới'] },
      fetchCleanup: values => { const userId=String(values.userId||'2'); return { code:[
        'useEffect(() => {',
        '  let cancelled = false;',
        '  fetch("/users/" + userId)',
        '    .then(data => { if (!cancelled) setUser(data); });',
        '  return () => { cancelled = true; };',
        '}, [userId]);'
      ], at:[[0,2],[5],[4],[0,2],[3]], results:['request /users/1 đang chờ','userId: 1 → '+userId,'closure cũ: cancelled = true','request /users/'+userId+' bắt đầu','chỉ response có cancelled = false được setUser'] }; },
      staleClosure: { code:[
        'useEffect(() => {',
        '  const id = setInterval(() => {',
        '    setCount(count + 1);',
        '  }, 1000);',
        '  return () => clearInterval(id);',
        '}, []);'
      ], at:[[0,5],[1,2],[2],[2]], results:['effect mount chụp count = 0','interval callback giữ count = 0','enqueue 0 + 1; UI thành 1','vẫn enqueue 1; Object.is(1, 1) nên UI đứng yên'] },
      memo: values => { const changed=values.memoCase==='keyword đổi'; return { code:[
        'const filtered = useMemo(() => {',
        '  return products.filter(matchesKeyword);',
        '}, [products, keyword]);',
        'return filtered.map(renderProduct);'
      ], at:[[0],[2],[changed?1:0],[3]], results:['ProductList được gọi lại','so sánh products và keyword bằng Object.is',changed?'keyword đổi → chạy filter lại':'deps giữ nguyên → trả cached filtered','render danh sách từ filtered'] }; },
      callbackMemo: { code:[
        'const handleClick = useCallback(() => {',
        '  submitOrder(productId);',
        '}, [productId]);',
        'return <ExpensiveChild onClick={handleClick} />;'
      ], at:[[0],[0,2],[3],[3]], results:['Parent render vì count đổi','productId giữ nguyên → cùng function reference','React.memo thấy onClick không đổi','bỏ qua render do Parent; update riêng của Child vẫn chạy'] },
      contextFlow: { code:[
        '<UserContext.Provider value={user}>',
        '  <Layout><Section><ProfileCard /></Section></Layout>',
        '</UserContext.Provider>',
        'function ProfileCard() {',
        '  const user = useContext(UserContext);',
        '  return <Avatar user={user} />;',
        '}'
      ], at:[[0],[1],[1],[3,4,5]], results:['Provider công bố value = user','Layout không cần nhận user prop','Section không phải truyền hộ user','ProfileCard đọc Provider gần nhất và render Avatar'] },
      requestRace: { code:[
        'const tokenA = ++latest; fetchUser(1);',
        'const tokenB = ++latest; fetchUser(2);',
        'if (tokenB === latest) setUser(userB);',
        'if (tokenA === latest) setUser(userA);'
      ], at:[[0],[1],[2],[3]], results:['tokenA = 1; A đang chờ','tokenB = latest = 2','2 === 2 → UI hiện user B','1 !== 2 → bỏ qua response A về muộn'] },
      transition: { code:[
        'setQuery(nextQuery);',
        'startTransition(() => {',
        '  setFilter(nextQuery);',
        '});',
        'if (isPending) showProgress();',
        'return <Results filter={filter} />;'
      ], at:[[0],[1,2,3],[4],[5]], results:['input controlled phản hồi ngay','enqueue update filter ở transition lane','isPending = true; input vẫn tương tác','commit Results của query mới nhất'] },
      asyncOrder: { code:[
        'const promiseA = fetchUser(1);',
        'const promiseB = fetchUser(2);',
        'promiseA.then(user => commit("A", user));',
        'promiseB.then(user => commit("B", user));'
      ], at:[[0],[1],[3],[2]], results:['A bắt đầu; Promise A pending','B bắt đầu; Promise B pending','B resolve trước → chạy continuation B','A resolve sau → chạy continuation A'] },
      immutableFlow: { code:[
        'const nextTodos = previous.map(todo =>',
        '  todo.id === id',
        '    ? { ...todo, done: !todo.done }',
        '    : todo',
        ');',
        'setTodos(nextTodos);',
        'const doneCount = nextTodos.filter(t => t.done).length;'
      ], at:[[0],[1,3],[2],[4,5,6]], results:['đọc snapshot previous','item không khớp giữ nguyên reference','item khớp nhận object/reference mới','array mới được lưu; doneCount được suy ra'] },
      declarativeFlow: { code:[
        'function handleClick() {',
        '  setCount(count + 1);',
        '}',
        'return <p style={{ color: count % 2 ? "blue" : "red" }}>',
        '  {count}',
        '</p>;'
      ], at:[[0],[1],[3,4,5],[3,4]], results:['click gọi handler','enqueue count = 1','render mô tả text 1 và màu blue','DOM được đồng bộ với mô tả mới'] },
      compositionFlow: { code:[
        'function Card({ children }) {',
        '  return <div className="card">{children}</div>;',
        '}',
        'function UserCard({ user }) {',
        '  return <Card><Avatar user={user} /><h3>{user.name}</h3></Card>;',
        '}'
      ], at:[[3],[4],[0,1],[1,4]], results:['App chọn render UserCard','UserCard trả về Card với nội dung con','Card nhận children mà không biết chi tiết nội dung','cây kết quả: div.card → Avatar + h3'] },
      refFlow: { code:[
        'const inputRef = useRef(null);',
        '<input ref={inputRef} />;',
        'function focusInput() {',
        '  inputRef.current.focus();',
        '}',
        'inputRef.current = anotherNode;'
      ], at:[[0],[1],[2,3],[5]], results:['ref = { current: null }; identity được giữ','sau commit: current = HTMLInputElement','DOM input nhận focus; không cần render mới','current đổi nhưng React không schedule render'] },
      customHookFlow: { code:[
        'function useWindowWidth() {',
        '  const [width, setWidth] = useState(window.innerWidth);',
        '  useEffect(() => subscribeResize(setWidth), []);',
        '  return width;',
        '}',
        'const sidebarWidth = useWindowWidth();',
        'const headerWidth = useWindowWidth();'
      ], at:[[5],[6],[0,1,2,3],[2]], results:['Sidebar có state/effect instance #1','Header có state/effect instance #2','logic subscribe/cleanup nằm trong một hook','thêm debounce tại hook → cả hai caller dùng quy tắc mới'] },
      thunkFlow: { code:[
        'dispatch(fetchUser(id));',
        '// tự động: fetchUser.pending(requestId)',
        'const user = await fetch("/users/" + id);',
        '// thành công: fetchUser.fulfilled(user, requestId)',
        '// thất bại: fetchUser.rejected(error, requestId)'
      ], at:[[0,1],[2],[3],[4]], results:['loading = true; currentRequestId được lưu','payload creator đang chờ fetch','đúng requestId → user được cập nhật','đúng requestId → error được cập nhật'] },
      statePlacement: { code:[
        'if (canDerive(value)) return calculateDuringRender();',
        'if (isLocal(value)) return useStateNearOwner();',
        'if (mustBeShareable(value)) return putInURL();',
        'if (comesFromServer(value)) return cacheByResourceKey();'
      ], at:[[0],[1],[2],[3]], results:['derived value: không tạo state thứ hai','local UI: đặt gần nơi tương tác','bookmark/back/forward: URL là nguồn phù hợp','server data: key + stale + cache + invalidation'] },
      controlledForm: values => { const email=String(values.email||''); const valid=email.includes('@'); return { code:[
        'const [email, setEmail] = useState("");',
        'const onChange = event => setEmail(event.target.value);',
        'const valid = email.includes("@");',
        '<input value={email} onChange={onChange} />',
        '{!valid && email && <span role="alert">Email chưa hợp lệ</span>}'
      ], at:[[1],[0,1],[2],[3,4]], results:['event.target.value = "'+email+'"','email state = "'+email+'"','valid = '+valid,valid?'input hiển thị email; alert bị ẩn':'input hiển thị email; alert xuất hiện'] }; },
      serverCache: { code:[
        'const key = ["user", userId];',
        'const cached = cache.get(key);',
        'if (!cached || cached.stale) fetchByKey(key);',
        'cache.set(key, response);',
        'notifySubscribers(key);'
      ], at:[[0],[1],[2],[3,4]], results:['key nhận diện user hiện tại','cache trả fresh, stale hoặc miss','stale/miss → request gắn với đúng key','cache cập nhật; UI của đúng key nhận response'] },
      suspenseFlow: { code:[
        '<Suspense fallback={<Skeleton />}>',
        '  <ProductList />',
        '</Suspense>',
        'const products = readProducts();',
        '// resource pending → suspend',
        '// resource ready → retry render'
      ], at:[[1,3],[4],[0,2],[5,1,3]], results:['ProductList bắt đầu đọc resource','render chưa thể hoàn tất','boundary gần nhất hiển thị Skeleton','ProductList render lại và thay fallback bằng nội dung'] },
      errorBoundaryFlow: { code:[
        '<ErrorBoundary fallback={<Retry />}>',
        '  <ProductPanel />',
        '</ErrorBoundary>',
        'throw new Error("Không đọc được sản phẩm");',
        'static getDerivedStateFromError(error) { return { error }; }',
        'if (error) return <Retry />;'
      ], at:[[0,1,2],[3],[4],[5]], results:['ProductPanel nằm trong phạm vi boundary','descendant lỗi trong render','boundary gần nhất lưu trạng thái lỗi','chỉ vùng này chuyển sang Retry fallback'] },
      testingFlow: { code:[
        'render(<EmailField />);',
        'const input = screen.getByRole("textbox", { name: /email/i });',
        'await user.type(input, "a@b.dev");',
        'expect(screen.queryByRole("alert")).not.toBeInTheDocument();'
      ], at:[[0],[1],[2],[3]], results:['EmailField xuất hiện trong DOM test','tìm thấy input qua role + accessible name','người dùng nhập email hợp lệ','PASS: UI không còn cảnh báo'] },
      accessibilityFlow: { code:[
        '<label htmlFor="email">Email</label>',
        '<input id="email" aria-describedby="email-help" />',
        '<p id="email-help">Dùng địa chỉ công việc</p>',
        '<button type="submit">Lưu</button>',
        '<p role="status">Đã lưu</p>'
      ], at:[[0,1,3],[0,1],[3],[2,4]], results:['input và button có semantic mặc định','textbox có accessible name “Email”','Tab tới button; Enter kích hoạt submit','hướng dẫn và trạng thái có text, không chỉ có màu'] }
    };

    const FLOW_BY_CHAPTER = { 0:['snapshot','asyncOrder','immutableFlow'], 1:['xssLab','repaint'], 2:['declarativeFlow','compositionFlow','oneWay'], 3:['jsx'], 4:['reconciliation','keys','fiber'], 5:['hooks'], 6:['batching','requestReducer','effectCycle','fetchCleanup','staleClosure','refFlow','memo','callbackMemo','customHookFlow'], 7:['contextFlow','redux','thunkFlow'], 8:['statePlacement','controlledForm','serverCache','requestRace'], 9:['transition','suspenseFlow','errorBoundaryFlow'], 10:['testingFlow','accessibilityFlow','liveReact'] };
    const chapters = splitSource(SOURCE);
    const readStorage = (key, fallback) => {
      try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); }
      catch { return fallback; }
    };
    const writeStorage = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
    let current = 0;
    const knownContentIds = new Set(chapters.map(chapter => chapter.id));
    let completed = new Set(readStorage('react-explorer-completed-v3', []).filter(id => typeof id === 'string' && knownContentIds.has(id)));

    function traceHtml(id, step, values) {
      const source=TRACE_DEFS[id];
      if (!source) return '';
      const trace=typeof source==='function' ? source(values) : source;
      const active=new Set(trace.at[step]||[]);
      const done=new Set(trace.at.slice(0,step).flat());
      const lines=trace.code.map((line,index)=>{
        const state=active.has(index)?'current':done.has(index)?'done':'';
        return '<div class="trace-line '+state+'"><span class="trace-line-number">'+(index+1)+'</span><code>'+escapeHtml(line)+'</code></div>';
      }).join('');
      const lineLabel=[...active].map(index=>index+1).join(', ');
      return '<div class="code-trace"><div><div class="trace-head">Code trace · dòng đang chạy</div><div class="trace-code">'+lines+'</div></div><div class="trace-result"><div class="trace-head">Ánh xạ kết quả</div><div class="trace-result-body"><span class="trace-result-label">Sau dòng '+escapeHtml(lineLabel)+'</span><output class="trace-result-value" aria-live="polite">'+escapeHtml(trace.results[step]||'')+'</output></div></div></div>';
    }

    function flowHtml(id, def) {
      if (def.live) return '<section class="flow" data-flow="'+id+'"><div class="flow-top"><div><div class="flow-label">React lab · iframe sandbox</div><h4>'+escapeHtml(def.title)+'</h4><p class="flow-note">Chọn từng bài theo thứ tự. Mỗi bài chỉ kiểm chứng một ý và tự nêu kết luận sau thao tác. Cần mạng để tải React 19.2 từ CDN.</p></div></div><iframe class="react-lab-frame" sandbox="allow-scripts" title="Phòng lab React lab" srcdoc="'+escapeHtml(reactLabDocument())+'"></iframe></section>';
      const fields=(def.fields||[]).map(field=>{
        const control=field.type==='select' ? '<select data-field="'+field.key+'">'+field.options.map(x=>'<option>'+escapeHtml(x)+'</option>').join('')+'</select>' : '<input data-field="'+field.key+'" type="'+field.type+'" value="'+escapeHtml(field.value)+'" min="1">';
        return '<label class="field">'+escapeHtml(field.label)+control+'</label>';
      }).join('');
      return '<section class="flow" data-flow="'+id+'"><div class="flow-top"><div><div class="flow-label">Mô hình giải thích tương tác</div><h4>'+escapeHtml(def.title)+'</h4><p class="flow-note">Bấm từng bước để theo dõi dòng code, state/kết quả và sơ đồ tương ứng. Trace diễn giải cơ chế; không phải mã nguồn React nội bộ hay benchmark.</p></div><span class="flow-counter" aria-live="polite">1 / 1</span></div>'+(fields?'<div class="flow-inputs">'+fields+'</div>':'')+'<div class="flow-stage"><div class="flow-scene"></div><div class="flow-trace"></div><div class="flow-path"></div><div class="flow-explain" aria-live="polite"></div></div><div class="flow-controls"><div class="step-dots"></div><button class="run-btn" type="button">Chạy →</button></div></section>';
    }

    function reactLabDocument() {
      return [
        '<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:16px;font:14px/1.5 system-ui;color:#17202a;background:#f8fafc}h2{margin:0 0 5px;font-size:19px}p{margin:7px 0}.sub{color:#536273}.tabs{display:flex;gap:6px;flex-wrap:wrap;margin:16px 0}.tabs button{background:#eef3f8}.tabs button[aria-selected=true]{background:#163f63;color:#fff;border-color:#163f63}button,input{font:inherit}button{padding:7px 10px;border:1px solid #b9c4d1;border-radius:7px;background:#fff;cursor:pointer}.box{padding:13px;border:1px solid #d9e1ea;border-radius:9px;background:#fff}.row{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.note{width:130px}.goal{margin:0 0 8px;font-weight:700}.steps{margin:8px 0 13px;padding-left:21px}.result{margin:12px 0 0;padding:9px 11px;border-left:3px solid #167a4a;border-radius:4px;background:#edf9f1;color:#174e32}.status{margin:10px 0 0;color:#536273;font:12px ui-monospace,monospace}.muted{color:#536273;font-size:12px}</style>',
        '<div id="root">Đang tải React…</div>',
        '<scr'+'ipt type="module">',
        'import React,{useRef,useState} from "https://esm.sh/react@19.2.0?dev";import{createRoot}from "https://esm.sh/react-dom@19.2.0/client?dev";const h=React.createElement;',
        'function Item(p){const[n,setN]=useState("note của "+p.label);return h("label",{className:"row"},h("strong",null,p.label),h("input",{className:"note",value:n,onChange:e=>setN(e.target.value),"aria-label":"Ghi chú của "+p.label}));}',
        'function KeyLesson(){const[items,setItems]=useState(["A","B","C"]),[byId,setById]=useState(false),[removed,setRemoved]=useState(false);const reset=()=>{setItems(["A","B","C"]);setRemoved(false)};return h("section",null,h("p",{className:"goal"},"Mục tiêu: state của mỗi hàng phải đi cùng dữ liệu, không đi cùng vị trí."),h("ol",{className:"steps"},h("li",null,"Giữ key=index, rồi bấm “Xóa A”."),h("li",null,"So sánh ghi chú còn lại: B sẽ mang note của A; C sẽ mang note của B."),h("li",null,"Bấm “Dùng key=id”, reset và xóa A lần nữa.")),h("div",{className:"box"},h("div",{className:"row"},h("button",{onClick:()=>setById(x=>!x),"aria-pressed":byId},byId?"Đang dùng key=id":"Đang dùng key=index"),h("button",{onClick:()=>{setItems(x=>x.slice(1));setRemoved(true)}},"Xóa A"),h("button",{onClick:reset},"Làm lại")),h("p",{className:"muted"},"Mỗi input có state riêng, khởi đầu là note của chính hàng đó."),items.map((x,i)=>h(Item,{key:byId?x:i,label:x})),removed&&h("p",{className:"result"},byId?"Đúng: B vẫn giữ note của B, vì key mô tả identity của dữ liệu.":"Đã thấy lỗi: B đang giữ note của A. key=index khiến React ghép state theo vị trí 0, 1… thay vì theo item.")));}',
        'function ClosureLesson(){const[count,setCount]=useState(0),[message,setMessage]=useState("Chưa có callback nào."),timer=useRef();const schedule=()=>{const snapshot=count;clearTimeout(timer.current);setMessage("Đã chụp count="+snapshot+". Bây giờ hãy tăng ngay +2.");timer.current=setTimeout(()=>{setCount(snapshot+1);setMessage("Callback cũ chạy: setCount("+(snapshot+1)+"). Nó không biết count đã tăng sau đó.");},700)};const reset=()=>{clearTimeout(timer.current);setCount(0);setMessage("Chưa có callback nào.")};return h("section",null,h("p",{className:"goal"},"Mục tiêu: callback giữ snapshot tại lúc nó được tạo."),h("ol",{className:"steps"},h("li",null,"Bấm “Chụp callback”."),h("li",null,"Ngay lập tức bấm “Tăng +2”. count sẽ thành 2."),h("li",null,"Chờ 0,7 giây: callback cũ ghi lại 1.")),h("div",{className:"box"},h("div",{className:"row"},h("button",{onClick:schedule},"Chụp callback"),h("button",{onClick:()=>setCount(x=>x+2)},"Tăng +2"),h("button",{onClick:reset},"Làm lại"),h("strong",null,"count = "+count)),h("p",{className:"status"},message),h("p",{className:"result"},"Bài học: khi state mới dựa vào state cũ, viết setCount(previous => previous + 1). React sẽ đưa previous mới nhất vào hàm.")));}',
        'function RaceLesson(){const[safe,setSafe]=useState(true),[who,setWho]=useState("Chưa chạy"),[message,setMessage]=useState(""),latest=useRef(0);const run=()=>{const aToken=++latest.current,bToken=++latest.current;setWho("Đang chờ A và B…");setMessage("A bắt đầu trước nhưng chậm (0,8s); B bắt đầu sau nhưng nhanh (0,22s).");setTimeout(()=>{if(safe&&bToken!==latest.current)return;setWho("B (mới hơn)");setMessage("B hoàn tất trước và hiện lên UI.");},220);setTimeout(()=>{if(safe&&aToken!==latest.current){setMessage("A về muộn nên bị bỏ qua: UI vẫn giữ B.");return}setWho("A (cũ nhưng về muộn)");setMessage("A đã ghi đè B — đây là race condition.");},800)};return h("section",null,h("p",{className:"goal"},"Mục tiêu: request khởi tạo trước không có quyền ghi đè UI hiện tại khi nó về muộn."),h("ol",{className:"steps"},h("li",null,"Để “Bảo vệ response mới” bật, rồi bấm chạy A → B."),h("li",null,"Chờ 0,8 giây: kết quả phải là B."),h("li",null,"Tắt bảo vệ và chạy lại để quan sát A ghi đè B.")),h("div",{className:"box"},h("div",{className:"row"},h("button",{onClick:()=>setSafe(x=>!x),"aria-pressed":safe},safe?"Bảo vệ response mới: bật":"Bảo vệ response mới: tắt"),h("button",{onClick:run},"Chạy A chậm → B nhanh")),h("p",null,h("strong",null,"UI đang hiện: "+who)),h("p",{className:"status"},message),h("p",{className:"result"},"Trong app thật, dùng AbortController, request id hoặc key cache để đảm bảo response cũ không ghi đè dữ liệu hiện hành.")));}',
        'function App(){const[active,setActive]=useState(0),lessons=[["1. Key","Key và state item"],["2. Closure","Snapshot trong callback"],["3. Race","Response cũ và mới"]],Lesson=[KeyLesson,ClosureLesson,RaceLesson][active];return h("main",null,h("h2",null,"React lab · từng bài một"),h("p",{className:"sub"},"Không cần làm cả ba. Chọn một bài, đọc mục tiêu, làm đúng các bước, rồi đối chiếu kết luận màu xanh."),h("div",{className:"tabs",role:"tablist","aria-label":"Bài thực hành"},lessons.map((item,i)=>h("button",{key:item[0],role:"tab","aria-selected":active===i,onClick:()=>setActive(i)},item[0]))),h("h3",null,lessons[active][1]),h(Lesson));}createRoot(document.getElementById("root")).render(h(App));',
        '</scr'+'ipt>'
      ].join('');
    }

    function renderMarkdown(chapter) {
      const flowIds=FLOW_BY_CHAPTER[chapter.index]||[];
      let html=chapter.html;
      for (const id of flowIds) {
        const marker='<!--FLOW:'+id+'-->';
        const flow=flowHtml(id,FLOW_DEFS[id]);
        html=html.includes(marker) ? html.replace(marker,flow) : html+flow;
      }
      return html;
    }

    function domTree(label, items, states, rootLabel) {
      const children=items.map((item,index)=>'<button type="button" class="dom-child '+escapeHtml(states[index]||'')+'" data-dom-node="'+escapeHtml(String(item))+'" aria-label="Xem trạng thái node '+escapeHtml(String(item))+'">'+escapeHtml(String(item))+'</button>').join('');
      return '<div class="tree-panel"><div class="tree-label">'+escapeHtml(label)+'</div><div class="dom-tree"><div class="dom-root">'+escapeHtml(rootLabel||'div')+'</div><div class="dom-branch">'+children+'</div></div><div class="legend"><span class="lg-keep"><i></i>giữ nguyên</span><span class="lg-change"><i></i>cập nhật lại</span><span class="lg-add"><i></i>node mới</span></div></div>';
    }

    function dataCard(icon,name,value,hot) {
      return '<div class="data-card '+(hot?'hot':'')+'"><div class="data-icon">'+escapeHtml(icon)+'</div><div class="data-name">'+escapeHtml(name)+'</div><div class="data-value">'+escapeHtml(value)+'</div></div>';
    }

    function sceneHtml(id, step, values) {
      if (id==='xssLab') {
        const rawPayload='<script>document.getElementById("proof").textContent="⚠ JavaScript đã chạy";document.getElementById("proof").style.color="#b42318"</scr'+'ipt>';
        const payloadLabel='?name=<script>…</scr'+'ipt>';
        const vulnerable='<h1>Chào mừng, '+rawPayload+'!</h1>';
        const encoded='<h1>Chào mừng, &lt;script&gt;...&lt;/script&gt;!</h1>';
        if(step===0) return '<div class="scene-grid">'+dataCard('GET','Request',payloadLabel,true)+'<div class="scene-arrow hot">→</div>'+dataCard('PHP','\u0024_GET[\'name\']','chuỗi do người dùng kiểm soát',false)+'</div>';
        if(step===1) return '<div class="xss-lab"><div class="xss-panel bad"><div class="xss-label">Không encode · response HTML</div><div class="xss-output">'+escapeHtml(vulnerable)+'</div><div class="xss-proof danger">Ranh giới data/code đã bị phá vỡ</div></div><div class="scene-arrow hot">→</div><div class="xss-panel"><div class="xss-label">Trình duyệt sẽ parse</div><div class="xss-output">Thẻ &lt;h1&gt; được tạo<br>Thẻ &lt;script&gt; cũng được tạo<br>JavaScript trở thành mã thực thi</div></div></div>';
        if(step===2) {
          const sandboxDoc='<style>body{margin:0;padding:12px;font:13px system-ui;background:#fff;color:#333}#proof{margin-top:8px;padding:8px;border-radius:6px;background:#fff1f0}</style><strong>Chào mừng!</strong><div id="proof">Chưa chạy JavaScript</div><script>document.getElementById("proof").textContent="⚠ JavaScript đã chạy trong sandbox";document.getElementById("proof").style.color="#b42318"</scr'+'ipt>';
          return '<div class="xss-lab"><div class="xss-panel bad"><div class="xss-label">Kết quả vulnerable · sandbox cô lập</div><iframe class="xss-frame" sandbox="allow-scripts" title="Minh họa payload XSS vô hại" srcdoc="'+escapeHtml(sandboxDoc)+'"></iframe><div class="xss-proof danger">Payload chỉ đổi chữ trong iframe, không đọc cookie và không gọi mạng.</div></div><div class="scene-arrow hot">≠</div><div class="xss-panel good"><div class="xss-label">Mục tiêu đúng</div><div class="xss-output">Dữ liệu phải được hiển thị nguyên dạng như text, không được trở thành node HTML.</div></div></div>';
        }
        return '<div class="xss-lab"><div class="xss-panel good"><div class="xss-label">Có output encoding · response HTML</div><div class="xss-output">'+escapeHtml(encoded)+'</div><div class="xss-proof safe">✓ Trình duyệt hiển thị payload như chữ</div></div><div class="scene-arrow hot">→</div><div class="xss-panel good"><div class="xss-label">React JSX mặc định</div><div class="xss-output">&lt;h1&gt;Chào mừng, {username}!&lt;/h1&gt;</div><div class="xss-proof safe">✓ Giá trị nội suy được escape</div></div></div>';
      }
      if (id==='repaint') {
        const size=Math.max(1,Number(values.size)||1000); const sample=['#1','#2','#3','…','#'+size];
        if(step===0) return '<div class="scene-grid">'+domTree('DOM hiện tại · '+size+' tin nhắn',sample,['keep','keep','keep','keep','keep'],'chat-box')+'<div class="scene-arrow hot">＋</div>'+dataCard('＋','Tin nhắn mới','#'+(size+1),true)+'</div>';
        if(step===1) return '<div class="scene-grid">'+domTree('DOM cũ',sample,['remove','remove','remove','remove','remove'],'chat-box')+'<div class="scene-arrow hot">→</div>'+domTree('innerHTML · dựng lại '+(size+1)+' node',['#1','#2','#3','…','#'+(size+1)],['change','change','change','change','change'],'chat-box')+'</div>';
        if(step===2) return '<div class="scene-grid">'+domTree('VDOM cũ',sample,['keep','keep','keep','keep','keep'],'div')+'<div class="scene-arrow hot">↔</div>'+domTree('VDOM mới',['#1','#2','#3','…','#'+(size+1)],['keep','keep','keep','keep','add'],'div')+'</div>';
        return '<div class="scene-grid">'+dataCard('Δ','Patch tối thiểu','INSERT node #'+(size+1),true)+'<div class="scene-arrow hot">→</div>'+domTree('DOM thật sau Commit',['#1','#2','#3','…','#'+(size+1)],['keep','keep','keep','keep','add'],'chat-box')+'</div>';
      }
      if (id==='reconciliation') {
        const oldTree=domTree('VDOM cũ',['h1','p','button'],['keep','keep','keep'],'App');
        const newTree=domTree('VDOM mới',['h1','p','button'],['keep',step>=1?'change':'keep','keep'],'App');
        if(step===0) return '<div class="scene-grid">'+dataCard('JS','Component','lần render đầu tiên',true)+'<div class="scene-arrow hot">→</div>'+domTree('DOM thật',['h1','p','button'],['add','add','add'],'App')+'</div>';
        if(step===1) return '<div class="scene-grid">'+dataCard('S','state','setCount → component chạy lại',true)+'<div class="scene-arrow hot">→</div>'+newTree+'</div>';
        if(step===2) return '<div class="scene-grid">'+oldTree+'<div class="scene-arrow hot">↔</div>'+newTree+'</div>';
        return '<div class="scene-grid">'+dataCard('Δ','Patch','chỉ cập nhật node <p>',true)+'<div class="scene-arrow hot">→</div>'+domTree('DOM thật',['h1','p','button'],['keep','change','keep'],'App')+'</div>';
      }
      if (id==='keys') {
        const items=(values.items||'A, B, C').split(',').map(x=>x.trim()).filter(Boolean); const first=items[0]||'A'; const after=items.slice(1);
        const rows=(list,keyMode,state)=>list.map((item,index)=>'<div class="stack-row"><span class="stack-key">key='+escapeHtml(keyMode==='id'?item:String(index))+'</span><span class="stack-item '+state+'">Item '+escapeHtml(item)+' · state['+escapeHtml(item)+']</span></div>').join('')||'<div class="stack-item">Danh sách rỗng</div>';
        if(step===0) return '<div class="scene-grid"><div class="tree-panel"><div class="tree-label">key=index · trước khi xóa</div><div class="node-stack">'+rows(items,'index','')+'</div></div><div class="scene-arrow">＝</div><div class="tree-panel"><div class="tree-label">key=id · trước khi xóa</div><div class="node-stack">'+rows(items,'id','good')+'</div></div></div>';
        if(step===1) return '<div class="scene-grid"><div class="tree-panel"><div class="tree-label">Xóa '+escapeHtml(first)+' · key=index</div><div class="node-stack">'+rows(after,'index','bad')+'</div><div class="legend"><span class="lg-change"><i></i>state cũ bị gắn nhầm item</span></div></div><div class="scene-arrow hot">⚠</div>'+dataCard('0','key không đổi','key=0: '+first+' → '+(after[0]||'rỗng'),true)+'</div>';
        return '<div class="scene-grid"><div class="tree-panel"><div class="tree-label">Xóa '+escapeHtml(first)+' · key=id</div><div class="node-stack">'+rows(after,'id','good')+'</div><div class="legend"><span class="lg-keep"><i></i>state đúng item được giữ</span></div></div><div class="scene-arrow hot">✓</div>'+dataCard('ID','Danh tính ổn định',first+' biến mất · '+after.join(', ')+' giữ nguyên',true)+'</div>';
      }
      if (id==='batching') {
        return '<div class="timeline"><div class="timeline-row"><div class="timeline-label">count + 1</div><div class="timeline-track"><span class="work-block '+(step>=0?'on':'')+'">count=0</span><span class="work-block '+(step>=1?'event':'')+'">→ 1</span><span class="work-block '+(step>=1?'event':'')+'">→ 1</span><span class="work-block '+(step>=1?'event':'')+'">→ 1</span><span class="work-block '+(step>=3?'on':'')+'">commit 1</span></div></div><div class="timeline-row"><div class="timeline-label">prev + 1</div><div class="timeline-track"><span class="work-block '+(step>=0?'on':'')+'">prev=0</span><span class="work-block '+(step>=2?'on':'')+'">→ 1</span><span class="work-block '+(step>=2?'on':'')+'">→ 2</span><span class="work-block '+(step>=2?'on':'')+'">→ 3</span><span class="work-block '+(step>=3?'event':'')+'">commit 3</span></div></div></div>';
      }
      if (id==='contextFlow') {
        return '<div class="scene-grid">'+dataCard('P','UserContext.Provider','value = user',step===0)+'<div class="scene-arrow '+(step>=1?'hot':'')+'">↘</div><div class="tree-panel"><div class="tree-label">Cây component · dữ liệu đi thẳng qua Context</div><div class="node-stack"><div class="stack-row"><span class="stack-key">01</span><span class="stack-item">Layout · không user prop</span></div><div class="stack-row"><span class="stack-key">02</span><span class="stack-item">Section / Panel · không truyền hộ</span></div><div class="stack-row"><span class="stack-key">03</span><span class="stack-item '+(step>=3?'good':'')+'">ProfileCard · useContext(UserContext)</span></div></div></div></div>';
      }
      if (id==='fiber') {
        return '<div class="timeline"><div class="timeline-row"><div class="timeline-label">Stack</div><div class="timeline-track"><span class="work-block '+(step>=0?'on':'')+'">A</span><span class="work-block '+(step>=0?'on':'')+'">B</span><span class="work-block '+(step>=0?'on':'')+'">C</span><span class="work-block '+(step>=0?'on':'')+'">D · block</span></div></div><div class="timeline-row"><div class="timeline-label">Fiber</div><div class="timeline-track"><span class="work-block '+(step>=2?'on':'')+'">A</span><span class="work-block '+(step>=2?'on':'')+'">B</span><span class="work-block pause">pause</span><span class="work-block '+(step>=2?'on':'')+'">C</span><span class="work-block '+(step>=2?'on':'')+'">D</span></div></div><div class="timeline-row"><div class="timeline-label">Main thread</div><div class="timeline-track"><span class="work-block">render</span><span class="work-block '+(step>=3?'event':'')+'">click</span><span class="work-block">resume</span></div></div></div>';
      }
      const generic={
        snapshot:[['Render A','count=0'],['Handler A','closure count=0'],['setCount','request 1'],['Render B','count=1']],
        oneWay:[['Child','button click'],['↑','onIncrease()'],['Parent','setCount'],['↓','props mới']],
        jsx:[['JSX','<h1>Hello</h1>'],['Babel','transform'],['Object','type + props']],
        hooks:[['Class','componentDidMount'],['Hook','useEffect'],['Class','componentWillUnmount'],['Hook','cleanup']],
        redux:[['UI','dispatch'],['Action',values.action||'addItem(product)'],['Reducer','cartSlice'],['Store','state mới'],['UI','useSelector']],
        requestReducer:[['dispatch','FETCH_START'],['reducer','loading = true'],['fetch',values.requestAction||'FETCH_SUCCESS'],['state','object hợp lệ'],['UI',values.requestAction==='FETCH_ERROR'?'Lỗi':'data.name']],
        effectCycle:[['Render','component'],['Effect','side effect'],['Deps','thay đổi'],['Cleanup','effect cũ'],['Effect','giá trị mới']],
        fetchCleanup:[['fetch','/users/1'],['userId','1 → '+(values.userId||'2')],['cleanup','cancelled=true'],['fetch','/users/'+(values.userId||'2')],['UI','response mới']],
        staleClosure:[['Mount','count=0'],['Closure','giữ count=0'],['Tick 1','setCount(1)'],['Tick 2…','vẫn setCount(1)']],
        memo:[['Render','ProductList'],['Deps','products + keyword'],[values.memoCase==='keyword đổi'?'Miss':'Hit',values.memoCase==='keyword đổi'?'filter lại':'dùng cache'],['UI','filtered.map']],
        callbackMemo:[['Parent','count đổi'],['useCallback','cùng reference'],['React.memo','props không đổi'],['Child','skip render']],
        requestRace:[['Request A','user 1'],['Request B','user 2'],['B resolve','commit user 2'],['A resolve','ignored']],
        transition:[['Input','query mới'],['Transition','filter mới'],['Pending','UI vẫn tương tác'],['Results','theo kịp']],
        asyncOrder:[['Start A','Promise pending'],['Start B','Promise pending'],['Resolve B','microtask B'],['Resolve A','microtask A']],
        immutableFlow:[['Previous','array A'],['Reuse','item không đổi'],['Copy','item đổi'],['Next','array B + derived']],
        declarativeFlow:[['Event','click'],['State','count → 1'],['Render','UI = f(state)'],['Commit','DOM khớp UI']],
        compositionFlow:[['App','UserCard'],['UserCard','Card'],['children','Avatar + h3'],['UI tree','div.card']],
        refFlow:[['Render','ref object'],['Commit','current = input'],['Event','focus()'],['Mutation','không render']],
        customHookFlow:[['Sidebar','hook instance 1'],['Header','hook instance 2'],['useWindowWidth','logic dùng chung'],['Edit once','debounce']],
        thunkFlow:[['pending','requestId'],['payload','await fetch'],['fulfilled','user'],['rejected','error']],
        statePlacement:[['Derived','tính khi render'],['Local','useState gần owner'],['Shareable','URL'],['Server','key + cache']],
        controlledForm:[['onChange',values.email||'(rỗng)'],['state','email mới'],['valid',(values.email||'').includes('@')?'true':'false'],['UI',(values.email||'').includes('@')?'hợp lệ':'cảnh báo']],
        serverCache:[['Key','user + id'],['Cache','fresh/stale/miss'],['Fetch','theo key'],['Notify','đúng subscriber']],
        suspenseFlow:[['Child','read resource'],['Suspend','pending'],['Boundary','fallback'],['Retry','content']],
        errorBoundaryFlow:[['Boundary','ProductPanel'],['Throw','render error'],['Catch','error state'],['Fallback','Retry']],
        testingFlow:[['Render','public UI'],['Query','role + name'],['Interact','user.type'],['Assert','visible result']],
        accessibilityFlow:[['Semantic','label/button'],['Name','Email'],['Keyboard','Tab + Enter'],['Feedback','text + status']]
      }[id]||[];
      return '<div class="scene-pipeline">'+generic.map((item,index)=>dataCard(item[0],item[0],item[1],index===step)+(index<generic.length-1?'<div class="scene-arrow '+(index<step?'hot':'')+'">→</div>':'')).join('')+'</div>';
    }

    function setupFlows() {
      document.querySelectorAll('.flow').forEach(root=>{
        const def=FLOW_DEFS[root.dataset.flow]; if (def.live) return; let step=0;
        const values=()=>Object.fromEntries([...root.querySelectorAll('[data-field]')].map(el=>[el.dataset.field,el.value]));
        const steps=()=>def.build?def.build(values()):def.steps;
        const paint=()=>{
          const list=steps(); step=Math.min(step,list.length-1);
          root.querySelector('.flow-counter').textContent=(step+1)+' / '+list.length;
          root.querySelector('.flow-scene').innerHTML=sceneHtml(root.dataset.flow,step,values());
          root.querySelector('.flow-trace').innerHTML=traceHtml(root.dataset.flow,step,values());
          root.querySelector('.flow-path').innerHTML=list.map((item,i)=>'<div class="flow-node '+(i<=step?'active ':'')+(i===step?'current':'')+'"><div class="node-title">'+escapeHtml(item.name)+'</div><div class="node-detail">'+escapeHtml(item.detail)+'</div></div>').join('');
          root.querySelector('.flow-explain').textContent=list[step].text;
          root.querySelector('.step-dots').innerHTML=list.map((_,i)=>'<button type="button" class="step-dot '+(i===step?'active':'')+'" data-step="'+i+'" aria-label="Bước '+(i+1)+'"></button>').join('');
          root.querySelector('.run-btn').textContent=step===list.length-1?'Chạy lại ↻':'Bước tiếp →';
        };
        root.addEventListener('click',event=>{
          if(event.target.matches('.run-btn')) { const list=steps(); step=step===list.length-1?0:step+1; paint(); }
          if(event.target.matches('.step-dot')) { step=Number(event.target.dataset.step); paint(); }
          if(event.target.matches('.dom-child')) {
            root.querySelectorAll('.dom-child').forEach(node=>node.classList.remove('selected')); event.target.classList.add('selected');
            const state=event.target.classList.contains('add')?'node mới':event.target.classList.contains('change')?'cập nhật lại':event.target.classList.contains('remove')?'loại bỏ':'giữ nguyên';
            root.querySelector('.flow-explain').textContent='Node '+event.target.dataset.domNode+' · '+state+'.';
          }
        });
        root.querySelectorAll('[data-field]').forEach(el=>el.addEventListener('input',()=>{step=0;paint();})); paint();
      });
    }

    function shortTitle(title) { return title.replace(/^\d+\.\s*/,''); }
    function renderSidebar() {
      const sections=chapters[current].sections;
      document.getElementById('chapterList').innerHTML=chapters.map((chapter,index)=>{
        const active=index===current;
        const sectionHtml=active&&sections.length?'<ul class="section-list">'+sections.map(section=>'<li><button class="section-link '+(section.level===4?'sec-h4':'')+'" data-heading="'+escapeHtml(section.id)+'">'+escapeHtml(shortTitle(section.title))+'</button></li>').join('')+'</ul>':'';
        return '<li><button class="chapter-link '+(active?'active ':'')+(completed.has(chapter.id)?'done':'')+'" data-index="'+index+'"'+(active?' aria-current="page"':'')+'><span class="chapter-no">'+String(index+1).padStart(2,'0')+'</span><span class="chapter-name">'+escapeHtml(shortTitle(chapter.title))+'</span><span class="check" aria-label="Đã xem">✓</span></button>'+sectionHtml+'</li>';
      }).join('');
    }
    function navButton(index,direction) {
      if(index<0||index>=chapters.length) return '<div class="nav-spacer"></div>';
      return '<button class="nav-btn '+(direction==='next'?'next':'')+'" data-index="'+index+'"><span class="nav-dir">'+(direction==='next'?'Chương tiếp theo →':'← Chương trước')+'</span><span class="nav-title">'+escapeHtml(shortTitle(chapters[index].title))+'</span></button>';
    }
    function searchText(raw) {
      const fence = String.fromCharCode(96);
      const htmlComment = new RegExp('<' + '!--[^]*?--' + '>', 'g');
      return raw.replace(htmlComment,'').replace(new RegExp(fence+'{3}[^\\n]*','g'),'').replace(/[_*>#|\[\]()]/g,' ').replace(/\s+/g,' ').trim();
    }
    const searchIndex=chapters.flatMap(chapter=>{
      const text=searchText(chapter.raw);
      const headings=chapter.sections;
      return [{ chapter, heading:'', title:chapter.title, text }, ...headings.map(heading=>({ chapter, heading:heading.id, title:heading.title, text }))];
    });
    function renderSearch(query) {
      const root=document.getElementById('searchResults');
      const normalized=query.trim().toLocaleLowerCase('vi-VN');
      if (!normalized) { root.hidden=true; root.innerHTML=''; return; }
      const results=searchIndex.filter(item=>(item.title+' '+item.text).toLocaleLowerCase('vi-VN').includes(normalized)).slice(0,12);
      root.hidden=false;
      if (!results.length) { root.innerHTML='<div class="search-empty">Không tìm thấy kết quả.</div>'; return; }
      root.innerHTML=results.map(item=>{
        const haystack=item.text; const at=haystack.toLocaleLowerCase('vi-VN').indexOf(normalized); const start=Math.max(0,at-72); const excerpt=(start?'…':'')+haystack.slice(start,at+normalized.length+115)+(at+normalized.length+115<haystack.length?'…':'');
        return '<button type="button" class="search-result" role="option" data-search-index="'+item.chapter.index+'" data-heading="'+escapeHtml(item.heading)+'"><small>'+escapeHtml(shortTitle(item.chapter.title))+'</small><strong>'+escapeHtml(shortTitle(item.title))+'</strong><span>'+escapeHtml(excerpt)+'</span></button>';
      }).join('');
    }
    function goTo(index,updateHash=true,heading='') {
      current=Math.max(0,Math.min(index,chapters.length-1)); const chapter=chapters[current];
      document.getElementById('content').innerHTML=renderMarkdown(chapter);
      document.getElementById('chapterKicker').textContent='Chương '+(current+1).toString().padStart(2,'0');
      document.getElementById('chapterCount').textContent='Chương '+(current+1)+' / '+chapters.length;
      document.getElementById('currentTitle').textContent=chapter.title;
      document.getElementById('chapterNav').innerHTML=navButton(current-1,'prev')+navButton(current+1,'next');
      document.title=chapter.title+' — React Explorer'; renderSidebar(); setupFlows(); setupCopy();
      if(updateHash) history.pushState(null,'','#'+chapter.slug+(heading?'--'+heading:''));
      setMenu(false);
      const target=heading&&document.getElementById(heading);
      if(target) { target.setAttribute('tabindex','-1'); target.focus({preventScroll:true}); target.scrollIntoView({block:'start'}); }
      else {
        window.scrollTo({top:0,behavior:'auto'});
        if (updateHash) { const title=document.querySelector('#content h2'); if(title) { title.setAttribute('tabindex','-1'); title.focus({preventScroll:true}); } }
      }
      updateProgress();
    }
    function setupCopy() {
      document.querySelectorAll('.copy-btn').forEach(button=>button.addEventListener('click',async()=>{
        await navigator.clipboard.writeText(button.closest('.code-wrap').querySelector('code').textContent); button.textContent='Đã chép ✓'; setTimeout(()=>button.textContent='Sao chép',1400);
      }));
    }
    function updateProgress() {
      const doc=document.documentElement; const max=doc.scrollHeight-innerHeight; const ratio=max>0?scrollY/max:1;
      document.getElementById('progressBar').style.width=(ratio*100)+'%';
      const chapterId=chapters[current].id;
      if(ratio>.96 && !completed.has(chapterId)) { completed.add(chapterId); writeStorage('react-explorer-completed-v3',[...completed]); renderSidebar(); }
    }
    function hashTarget() {
      const hash=decodeURIComponent(location.hash.slice(1));
      const chapter=chapters.findIndex(ch=>hash===ch.slug||hash.startsWith(ch.slug+'--')||hash==='chuong-'+(ch.index+1));
      const found=chapter<0?0:chapter;
      const prefix=chapters[found].slug+'--';
      return { index:found, heading:hash.startsWith(prefix)?hash.slice(prefix.length):'' };
    }
    function setMenu(open) {
      document.body.classList.toggle('menu-open',open);
      document.getElementById('menuBtn').setAttribute('aria-expanded',String(open));
      syncSidebarAccessibility(open);
    }
    function syncSidebarAccessibility(open=document.body.classList.contains('menu-open')) {
      const sidebar=document.getElementById('sidebar');
      const hidden=matchMedia('(max-width: 920px)').matches&&!open;
      sidebar.inert=hidden;
      sidebar.setAttribute('aria-hidden',String(hidden));
    }
    document.addEventListener('click',event=>{
      const searchResult=event.target.closest('[data-search-index]');
      if(searchResult) { document.getElementById('globalSearch').value=''; renderSearch(''); goTo(Number(searchResult.dataset.searchIndex),true,searchResult.dataset.heading); return; }
      const section=event.target.closest('.section-link[data-heading]');
      if(section) { goTo(current,true,section.dataset.heading); return; }
      const target=event.target.closest('[data-index]'); if(target) goTo(Number(target.dataset.index));
    });
    document.getElementById('menuBtn').addEventListener('click',()=>setMenu(!document.body.classList.contains('menu-open')));
    document.getElementById('scrim').addEventListener('click',()=>setMenu(false));
    document.getElementById('themeBtn').addEventListener('click',()=>{ const next=document.documentElement.dataset.theme==='light'?'dark':'light'; document.documentElement.dataset.theme=next; document.getElementById('themeBtn').setAttribute('aria-pressed',String(next==='dark')); writeStorage('react-explorer-theme',next); });
    document.getElementById('globalSearch').addEventListener('input',event=>renderSearch(event.target.value));
    document.getElementById('globalSearch').addEventListener('keydown',event=>{ if(event.key==='Escape') { event.currentTarget.value=''; renderSearch(''); event.currentTarget.blur(); } });
    addEventListener('scroll',updateProgress,{passive:true});
    addEventListener('resize',()=>syncSidebarAccessibility());
    addEventListener('popstate',()=>{ const target=hashTarget(); goTo(target.index,false,target.heading); });
    addEventListener('keydown',event=>{ if(/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return; if(event.key==='ArrowRight'&&current<chapters.length-1)goTo(current+1); if(event.key==='ArrowLeft'&&current>0)goTo(current-1); });
    const savedTheme=readStorage('react-explorer-theme',null); if(savedTheme==='light'||savedTheme==='dark')document.documentElement.dataset.theme=savedTheme;
    document.getElementById('themeBtn').setAttribute('aria-pressed',String(document.documentElement.dataset.theme==='dark'));
    document.getElementById('sourceMeta').innerHTML='Nguồn nguyên văn<br>'+SOURCE.length.toLocaleString('vi-VN')+' ký tự · '+chapters.length+' chương';
    console.info('[React Explorer] Source integrity:', {characters:SOURCE.length,chapters:chapters.map(ch=>({title:ch.title,characters:ch.raw.length}))});
    syncSidebarAccessibility();
    { const target=hashTarget(); goTo(target.index,false,target.heading); }
  </script>
</body>
</html>`;

fs.writeFileSync(outputPath, html, 'utf8');
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync(deployOutputPath, html, 'utf8');

const headings = sourceAst.filter(token => token.type === 'heading' && token.depth === 2);
const contentIds = [...markdown.matchAll(/^<!--\s*content-id:\s*([a-z0-9-]+)\s*-->\s*$/gim)].map(match => match[1]);
if (!headings.length) throw new Error('No chapters found in Markdown AST');
if (contentIds.length < headings.length) throw new Error(`Expected a stable content-id for every chapter; found ${contentIds.length} ids for ${headings.length} chapters.`);
if (new Set(contentIds).size !== contentIds.length) throw new Error('Duplicate content-id found in Markdown source');
if (!html.includes(encodedSource)) throw new Error('Source embedding integrity check failed');
console.log(`Built ${outputPath}: ${markdown.length} source characters, ${headings.length} chapters, ${html.length} HTML characters.`);
}

build().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
