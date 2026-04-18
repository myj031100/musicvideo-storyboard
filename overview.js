const STORAGE_KEY = "mv-storyboard-scenes-v1";

const flowGrid = document.getElementById("flow-grid");
const flowEmpty = document.getElementById("flow-empty");
const overviewSummary = document.getElementById("overview-summary");

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

function renderScenes() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    overviewSummary.textContent = "저장된 씬이 없습니다.";
    flowEmpty.hidden = false;
    return;
  }

  let scenes = [];
  try {
    scenes = JSON.parse(raw);
  } catch {
    overviewSummary.textContent = "저장된 데이터를 읽지 못했습니다.";
    flowEmpty.hidden = false;
    return;
  }

  if (!Array.isArray(scenes) || scenes.length === 0) {
    overviewSummary.textContent = "저장된 씬이 없습니다.";
    flowEmpty.hidden = false;
    return;
  }

  flowEmpty.hidden = true;
  const parts = new Set(scenes.map((scene) => scene.part).filter(Boolean));
  overviewSummary.textContent = `총 ${scenes.length}개 장면, ${parts.size}개 구간으로 구성되어 있습니다.`;

  scenes
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .forEach((scene, index) => {
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
        <div class="flow-card-layout">
          <div class="scene-image-frame">${getImageMarkup(scene.image, `${scene.title || "장면"} 이미지`)}</div>
          <div class="flow-card-copy single-copy">
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

renderScenes();
