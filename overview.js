import {
  SUPABASE_ANON_KEY,
  SUPABASE_REST_URL,
  SUPABASE_TABLE_NAME
} from "./supabase-config.js";

const flowGrid = document.getElementById("flow-grid");
const flowEmpty = document.getElementById("flow-empty");
const overviewSummary = document.getElementById("overview-summary");
const REFRESH_INTERVAL_MS = 5000;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getStatusClass(status) {
  if (status === "촬영 완료") return "is-shot";
  if (status === "편집 중") return "is-editing";
  if (status === "편집 완료") return "is-done";
  return "is-planned";
}

function getImageMarkup(imageValue, altText = "스토리보드 이미지") {
  if (!imageValue) {
    return '<div class="scene-image-placeholder">등록된 사진이 없습니다.</div>';
  }
  return `<img src="${imageValue}" alt="${escapeHtml(altText)}">`;
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

function renderScenes(scenes) {
  flowGrid.innerHTML = "";

  if (!Array.isArray(scenes) || scenes.length === 0) {
    overviewSummary.textContent = "저장된 씬이 없습니다.";
    flowEmpty.hidden = false;
    return;
  }

  flowEmpty.hidden = true;
  const parts = new Set(scenes.map((scene) => scene.part).filter(Boolean));
  overviewSummary.textContent = `총 ${scenes.length}개 장면, ${parts.size}개 구간으로 구성되어 있습니다.`;

  scenes.forEach((scene, index) => {
    const card = document.createElement("article");
    card.className = "flow-card";
    card.innerHTML = `
      <div class="flow-card-top">
        <div>
          <p class="scene-number">SCENE ${String(index + 1).padStart(2, "0")}</p>
          <h3>${escapeHtml(scene.title || "제목 없음")}</h3>
        </div>
        <div class="flow-top-meta">
          <span class="scene-tag">${escapeHtml(scene.part || "구간 없음")}</span>
          <span class="scene-status-badge ${getStatusClass(scene.status || "촬영 전")}">${escapeHtml(scene.status || "촬영 전")}</span>
        </div>
      </div>
      <div class="flow-card-layout horizontal-flow-layout">
        <div class="scene-image-frame overview-image-frame">${getImageMarkup(scene.image, `${scene.title || "장면"} 이미지`)}</div>
        <div class="flow-card-copy single-copy overview-copy">
          <div class="scene-lyrics-box overview-lyrics-box">
            <p class="scene-box-label">가사</p>
            <p class="scene-lyrics-text">${escapeHtml(scene.lyrics || "")}</p>
          </div>
        </div>
      </div>
    `;
    flowGrid.appendChild(card);
  });
}

async function refreshOverview() {
  try {
    const scenes = await requestSupabase();
    renderScenes(scenes);
  } catch (error) {
    overviewSummary.textContent = "Supabase 데이터를 불러오지 못했습니다. 설정이 완료됐는지 확인해주세요.";
    flowEmpty.hidden = false;
    console.error(error);
  }
}

refreshOverview();
window.setInterval(refreshOverview, REFRESH_INTERVAL_MS);
