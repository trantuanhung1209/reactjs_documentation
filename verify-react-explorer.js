const assert = require('node:assert/strict');
const fs = require('node:fs');

const markdown = fs.readFileSync('React-base-nang-cao.md', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const chapters = [...markdown.matchAll(/^## (.+)$/gm)];
const ids = [...markdown.matchAll(/^<!--\s*content-id:\s*([a-z0-9-]+)\s*-->\s*$/gim)].map(match => match[1]);
assert.ok(chapters.length > 0, 'Markdown must contain chapters');
assert.ok(ids.length >= chapters.length, 'Every chapter needs a stable content-id');
assert.equal(new Set(ids).size, ids.length, 'content-id values must be unique');

const sourceMatch = html.match(/const SOURCE_B64 = '([^']+)'/);
assert.ok(sourceMatch, 'Built HTML must embed the Markdown source');
assert.equal(Buffer.from(sourceMatch[1], 'base64').toString('utf8'), markdown, 'Embedded source must match Markdown byte-for-byte');

const renderMatch = html.match(/const CHAPTER_RENDER_B64 = '([^']+)'/);
assert.ok(renderMatch, 'Built HTML must embed Markdown rendered from the AST');
const rendered = JSON.parse(Buffer.from(renderMatch[1], 'base64').toString('utf8'));
assert.equal(rendered.length, chapters.length, 'Every chapter must have a rendered AST result');
assert.equal(new Set(rendered.map(chapter => chapter.id)).size, chapters.length, 'Rendered chapter IDs must be unique');

const script = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
assert.ok(script, 'Built HTML must include the application script');
new Function(script); // Syntax check only; browser APIs are intentionally not executed in Node.

const anchors = [...html.matchAll(/anchor:(['"])(.*?)\1/g)].map(match => match[2]);
assert.deepEqual(anchors.filter(anchor => !markdown.includes(anchor)), [], 'Every visual flow needs a source anchor');
const flowMarkers = [...JSON.stringify(rendered).matchAll(/<!--FLOW:([a-zA-Z0-9]+)-->/g)].map(match => match[1]);
assert.equal(new Set(flowMarkers).size, anchors.length, 'Every visual flow must be inserted at a rendered source anchor');
const flowBlock = script.match(/const FLOW_DEFS = \{([\s\S]*?)\n    \};/)?.[1] || '';
const traceBlock = script.match(/const TRACE_DEFS = \{([\s\S]*?)\n    \};/)?.[1] || '';
const flowIds = [...flowBlock.matchAll(/^      ([a-zA-Z][a-zA-Z0-9]*):/gm)].map(match => match[1]);
const traceIds = [...traceBlock.matchAll(/^      ([a-zA-Z][a-zA-Z0-9]*):/gm)].map(match => match[1]);
assert.deepEqual(traceIds, flowIds.filter(id => id !== 'liveReact'), 'Every explanatory diagram needs a line-by-line code trace');
const flows = new Function('return ({' + flowBlock + '});')();
const traces = new Function('return ({' + traceBlock + '});')();
for (const id of traceIds) {
  const values = Object.fromEntries((flows[id].fields || []).map(field => [field.key, field.value || field.options?.[0] || '']));
  const steps = flows[id].build ? flows[id].build(values) : flows[id].steps;
  const trace = typeof traces[id] === 'function' ? traces[id](values) : traces[id];
  assert.equal(trace.at.length, steps.length, `${id}: every diagram step needs highlighted code lines`);
  assert.equal(trace.results.length, steps.length, `${id}: every diagram step needs a mapped result`);
  assert.ok(trace.at.flat().every(line => Number.isInteger(line) && line >= 0 && line < trace.code.length), `${id}: highlighted code line must exist`);
}
assert.ok(html.includes('class="flow-trace"'), 'Diagram markup must include the code trace panel');
assert.ok(html.includes('globalSearch'), 'Global full-text search must be present');
assert.ok(html.includes('readStorage'), 'Storage fallback must be present');

console.log(`Verified ${chapters.length} chapters, ${ids.length} stable IDs, and ${anchors.length} visual flows.`);
