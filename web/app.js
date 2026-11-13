"use strict";

const disjunctives = new Map([
  ["\u05c3", "1-II"],
  ["\u0591", "2-II"],
  ["\u0592", "3-III"],
  ["\u0593", "4-III"],
  ["\u0594", "5-III"],
  ["\u0595", "6-III"],
  ["\u0597", "7-IV"],
  ["\u0596", "8-III"],
  ["\u0598", "9-IV"],
  ["\u0599", "10-IV"],
  ["\u059a", "11-IV"],
  ["\u059b", "12-IV"],
  ["\u059c", "13-V"],
  ["\u059e", "14-V"],
  ["\u05a1", "15-V"],
  ["\u059f", "16-V"],
  ["\u05a0", "17-V"],
  ["\u05c0", "Potential 18-V"]
]);

const majorMarkerPattern = /\(?((?:1-II|2-II|7-IV|5-III))\)?/g;
const wordMarkerPattern = /\((?:Potential )?\d+-(?:II|III|IV|V)\)/g;

function markDisjunctives(text) {
  return text.split(/(\s+)/).map((token) => {
	if (!token || /^\s+$/.test(token)) {
	  return token;
	}

	const markers = [];
	for (const character of token) {
	  const marker = disjunctives.get(character);
	  if (marker && !markers.includes(marker)) {
		markers.push(marker);
	  }
	}

	return markers.length ? token + markers.map((marker) => `(${marker})`).join("") : token;
  }).join("");
}

function addBreaksAfterMajor(text) {
  const output = [];
  let last = 0;
  let lastBreakIndex = 0;
  majorMarkerPattern.lastIndex = 0;

  for (const match of text.matchAll(majorMarkerPattern)) {
	output.push(text.slice(last, match.index + match[0].length));
	const marker = match[1];
	if (marker === "1-II") {
	  output.push("\n\n");
	  lastBreakIndex = match.index + match[0].length;
	} else if (marker === "2-II") {
	  output.push("\n");
	  lastBreakIndex = match.index + match[0].length;
	} else {
	  const segment = text.slice(lastBreakIndex, match.index);
	  if (segment.includes("(") || segment.includes(")")) {
		output.push("\n");
		lastBreakIndex = match.index + match[0].length;
	  }
	}
	last = match.index + match[0].length;
  }

  output.push(text.slice(last));
  return output.join("");
}

function processText(text) {
  return addBreaksAfterMajor(markDisjunctives(text));
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (character) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
  })[character]);
}

function createRtlPreview(text) {
  const safeText = escapeHtml(text).replace(wordMarkerPattern, (marker) =>
	`<bdi dir="ltr">${marker}</bdi>`
  );
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hebrew Bible Delimiter — RTL Preview</title>
<style>
body{font:22pt/1.9 "SBL Hebrew",Arial,sans-serif;margin:2em;direction:rtl;text-align:right}
pre{white-space:pre-wrap;unicode-bidi:plaintext}
</style>
</head>
<body><pre dir="rtl">${safeText}</pre></body>
</html>`;
}

function xmlEscape(text) {
  return text.replace(/[&<>"']/g, (character) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&apos;"
  })[character]);
}

function wordRun(text, rightToLeft) {
  if (!text) {
	return "";
  }
  const direction = rightToLeft ? "<w:rtl/>" : '<w:rtl w:val="0"/>';
  const language = rightToLeft
	? '<w:lang w:val="he-IL" w:bidi="he-IL"/>'
	: '<w:lang w:val="en-US"/>';
  return `<w:r><w:rPr><w:rFonts w:ascii="SBL Hebrew" w:hAnsi="SBL Hebrew" w:cs="SBL Hebrew" w:eastAsia="SBL Hebrew"/>${direction}${language}</w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
}

function wordParagraph(line) {
  const runs = [];
  let offset = 0;
  for (const marker of line.matchAll(wordMarkerPattern)) {
	runs.push(wordRun(line.slice(offset, marker.index), true));
	runs.push(wordRun(marker[0], false));
	offset = marker.index + marker[0].length;
  }
  runs.push(wordRun(line.slice(offset), true));
  return `<w:p><w:pPr><w:bidi/><w:jc w:val="start"/></w:pPr>${runs.join("")}</w:p>`;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < table.length; n += 1) {
	let value = n;
	for (let bit = 0; bit < 8; bit += 1) {
	  value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
	}
	table[n] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
	crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
	const fileName = encoder.encode(name);
	const data = encoder.encode(content);
	const crc = crc32(data);
	const local = new Uint8Array(30 + fileName.length + data.length);
	const localView = new DataView(local.buffer);
	localView.setUint32(0, 0x04034b50, true);
	localView.setUint16(4, 20, true);
	localView.setUint16(6, 0x0800, true);
	localView.setUint16(8, 0, true);
	localView.setUint16(10, 0, true);
	localView.setUint16(12, 0x21, true);
	localView.setUint32(14, crc, true);
	localView.setUint32(18, data.length, true);
	localView.setUint32(22, data.length, true);
	localView.setUint16(26, fileName.length, true);
	localView.setUint16(28, 0, true);
	local.set(fileName, 30);
	local.set(data, 30 + fileName.length);
	localParts.push(local);

	const central = new Uint8Array(46 + fileName.length);
	const centralView = new DataView(central.buffer);
	centralView.setUint32(0, 0x02014b50, true);
	centralView.setUint16(4, 20, true);
	centralView.setUint16(6, 20, true);
	centralView.setUint16(8, 0x0800, true);
	centralView.setUint16(10, 0, true);
	centralView.setUint16(12, 0, true);
	centralView.setUint16(14, 0x21, true);
	centralView.setUint32(16, crc, true);
	centralView.setUint32(20, data.length, true);
	centralView.setUint32(24, data.length, true);
	centralView.setUint16(28, fileName.length, true);
	centralView.setUint16(30, 0, true);
	centralView.setUint16(32, 0, true);
	centralView.setUint16(34, 0, true);
	centralView.setUint16(36, 0, true);
	centralView.setUint32(38, 0, true);
	centralView.setUint32(42, offset, true);
	central.set(fileName, 46);
	centralParts.push(central);
	offset += local.length;
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, centralParts.length, true);
  endView.setUint16(10, centralParts.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, end], {
	type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
}

function createWordDocument(text) {
  const paragraphs = text.split("\n").map(wordParagraph).join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
  const relationships = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  return createZip({
	"[Content_Types].xml": contentTypes,
	"_rels/.rels": relationships,
	"word/document.xml": documentXml
  });
}

const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const status = document.getElementById("status");

function setStatus(message) {
  status.textContent = message;
}

document.getElementById("processButton").addEventListener("click", () => {
  outputText.value = processText(inputText.value);
  setStatus(outputText.value ? "Processing complete." : "Paste Hebrew text to begin.");
});

document.getElementById("clearButton").addEventListener("click", () => {
  inputText.value = "";
  outputText.value = "";
  setStatus("");
  inputText.focus();
});

document.getElementById("previewButton").addEventListener("click", () => {
  if (!outputText.value) {
	setStatus("Process some text first.");
	return;
  }
  const preview = new Blob([createRtlPreview(outputText.value)], { type: "text/html;charset=utf-8" });
  const previewUrl = URL.createObjectURL(preview);
  window.open(previewUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60000);
});

document.getElementById("saveButton").addEventListener("click", () => {
  if (!outputText.value) {
	setStatus("Process some text before saving.");
	return;
  }
  const file = createWordDocument(outputText.value);
  const downloadUrl = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = "deliminated_verse.docx";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);
  setStatus("Word document downloaded. SBL Hebrew must be installed to display that font.");
});

document.getElementById("quitButton").addEventListener("click", () => {
  window.close();
  setStatus("Close this browser tab to exit.");
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {
	setStatus("The app works, but offline support could not be enabled.");
  });
}
