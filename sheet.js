import {
  SUPABASE_ANON_KEY,
  SUPABASE_REST_URL,
  SUPABASE_TABLE_NAME
} from "./supabase-config.js";

const sheetPages = document.getElementById("sheet-pages");
const sheetEmpty = document.getElementById("sheet-empty");
const sheetSummary = document.getElementById("sheet-summary");
const REFRESH_INTERVAL_MS = 5000;
const CUTS_PER_PAGE = 5;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatStyledText(value) {
  const safe = escapeHtml(value || "");
  const tagRules = [
    ["red", "text-accent-red"],
    ["orange", "text-accent-orange"],
    ["blue", "text-accent-blue"],
    ["green", "text-accent-green"],
    ["bold", "text-accent-bold"]
  ];

  return tagRules.reduce((result, [tag, className]) => {
    const pattern = new RegExp(`\\[${tag}\\](.*?)\\[\\/${tag}\\]`, "gis");
    return result.replace(pattern, `<span class="${className}">$1</span>`);
  }, safe);
}

function getImageMarkup(imageValue, altText = "스토리보드 이미지") {
  if (!imageValue) {
    return '<div class="sheet-image-placeholder">등록된 사진이 없습니다.</div>';
  }

  return `<img src="${imageValue}" alt="${escapeHtml(altText)}">`;
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function requestSupabase() {
  const response = await fetch(`${SUPABASE_REST_URL}/${SUPABASE_TABLE_NAME}?select=*&order=sort_order.asc`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

function createSheetRow(scene, cutNumber) {
  const row = document.createElement("article");
  row.className = "sheet-row";
  row.innerHTML = `
    <div class="sheet-cell sheet-visual-cell">
      <div class="sheet-cut-badge">${cutNumber}</div>
      <div class="sheet-image-box">${getImageMarkup(scene.image, `${scene.title || "컷"} 이미지`)}</div>
    </div>
    <div class="sheet-cell sheet-mini-cell">
      <div class="sheet-mini-block">
        <p class="sheet-mini-title">가사</p>
        <p class="sheet-mini-copy">${formatStyledText(scene.lyrics || "")}</p>
      </div>
      <div class="sheet-mini-meta">
        <p><strong>카메라</strong> ${escapeHtml(scene.camera || "-")}</p>
        <p><strong>장소</strong> ${escapeHtml(scene.location || "-")}</p>
      </div>
    </div>
    <div class="sheet-cell sheet-desc-cell">
      <p class="sheet-mini-title">장면 설명</p>
      <p class="sheet-desc-copy">${formatStyledText(scene.description || "")}</p>
      <div class="sheet-bottom-meta">
        <span><strong>구간</strong> ${escapeHtml(scene.part || "-")}</span>
        <span><strong>시간</strong> ${escapeHtml(scene.duration || "-")}</span>
        <span><strong>편집</strong> ${escapeHtml(scene.edit || "-")}</span>
      </div>
    </div>
  `;
  return row;
}

function renderSheets(scenes) {
  sheetPages.innerHTML = "";

  if (!Array.isArray(scenes) || scenes.length === 0) {
    sheetSummary.textContent = "저장된 컷이 없습니다.";
    sheetEmpty.hidden = false;
    return;
  }

  sheetEmpty.hidden = true;
  const pages = chunk(scenes, CUTS_PER_PAGE);
  sheetSummary.textContent = `총 ${scenes.length}개 컷을 시트형으로 정리했습니다. 페이지당 ${CUTS_PER_PAGE}개씩 표시됩니다.`;

  pages.forEach((pageScenes, pageIndex) => {
    const section = document.createElement("section");
    section.className = "sheet-board";

    const firstScene = pageScenes[0];
    const lastScene = pageScenes[pageScenes.length - 1];
    const firstCut = String(pageIndex * CUTS_PER_PAGE + 1).padStart(2, "0");
    const lastCut = String(pageIndex * CUTS_PER_PAGE + pageScenes.length).padStart(2, "0");

    section.innerHTML = `
      <div class="sheet-board-header">
        <div class="sheet-header-box sheet-header-strong">CUT ${firstCut}-${lastCut}</div>
        <div class="sheet-header-box">${escapeHtml(firstScene?.part || "구간 미정")}</div>
        <div class="sheet-header-box">뮤직비디오 콘티 시트</div>
        <div class="sheet-header-box">${escapeHtml(lastScene?.part || "구간 미정")}</div>
        <div class="sheet-header-box sheet-header-side">PAGE ${pageIndex + 1}</div>
      </div>
      <div class="sheet-board-body"></div>
    `;

    const body = section.querySelector(".sheet-board-body");
    pageScenes.forEach((scene, index) => {
      body.appendChild(createSheetRow(scene, pageIndex * CUTS_PER_PAGE + index + 1));
    });

    sheetPages.appendChild(section);
  });
}

async function refreshSheets() {
  try {
    const scenes = await requestSupabase();
    renderSheets(scenes);
  } catch (error) {
    sheetSummary.textContent = "Supabase 데이터를 불러오지 못했습니다. 설정이 완료됐는지 확인해주세요.";
    sheetEmpty.hidden = false;
    console.error(error);
  }
}

refreshSheets();
window.setInterval(refreshSheets, REFRESH_INTERVAL_MS);
