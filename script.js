import {
  SUPABASE_ANON_KEY,
  SUPABASE_REST_URL,
  SUPABASE_TABLE_NAME
} from "./supabase-config.js";

const DRAFT_KEY = "mv-storyboard-draft-v1";
const FILTER_ALL_LABEL = "전체 보기";
const FEEDBACK_EMPTY_TEXT = "아직 등록된 피드백이 없습니다.";
const IMAGE_PLACEHOLDER = '<div class="scene-image-placeholder">사진을 넣으면 이 영역에 표시됩니다.</div>';
const REFRESH_INTERVAL_MS = 5000;

const filterPart = document.getElementById("filter-part");
const filterLocation = document.getElementById("filter-location");
const filterCamera = document.getElementById("filter-camera");
const filterEdit = document.getElementById("filter-edit");
const filterStatus = document.getElementById("filter-status");

const partSuggestions = document.getElementById("part-suggestions");
const locationSuggestions = document.getElementById("location-suggestions");
const cameraSuggestions = document.getElementById("camera-suggestions");
const editSuggestions = document.getElementById("edit-suggestions");
const durationSuggestions = document.getElementById("duration-suggestions");

const storyboardGrid = document.getElementById("storyboard-grid");
const emptyState = document.getElementById("empty-state");
const saveStatus = document.getElementById("save-status");
const sceneSearchInput = document.getElementById("scene-search");
const sceneOutlineList = document.getElementById("scene-outline-list");
const sceneOutlineCount = document.getElementById("scene-outline-count");

const addSceneButton = document.getElementById("add-scene");
const sceneBuilderModal = document.getElementById("scene-builder-modal");
const sceneBuilderBackdrop = document.getElementById("scene-builder-backdrop");
const openSceneBuilderPlus = document.getElementById("open-scene-builder-plus");
const closeSceneBuilderButton = document.getElementById("close-scene-builder");
const cancelSceneBuilderButton = document.getElementById("cancel-scene-builder");

const scenePartField = document.getElementById("scene-part");
const sceneTitleField = document.getElementById("scene-title");
const sceneLyricsField = document.getElementById("scene-lyrics");
const sceneCameraField = document.getElementById("scene-camera");
const sceneLocationField = document.getElementById("scene-location");
const sceneEditField = document.getElementById("scene-edit");
const sceneDurationField = document.getElementById("scene-duration");
const sceneStatusField = document.getElementById("scene-status");
const sceneDescField = document.getElementById("scene-desc");
const sceneImageField = document.getElementById("scene-image");

const draftFields = [
  scenePartField,
  sceneTitleField,
  sceneLyricsField,
  sceneCameraField,
  sceneLocationField,
  sceneEditField,
  sceneDurationField,
  sceneStatusField,
  sceneDescField
];

let scenesCache = [];
let refreshTimer = null;
let activeEditorSceneId = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getImageMarkup(imageValue, altText = "스토리보드 이미지") {
  if (!imageValue) return IMAGE_PLACEHOLDER;
  return `<img src="${imageValue}" alt="${escapeHtml(altText)}">`;
}

function getStatusClass(status) {
  if (status === "촬영 완료") return "is-shot";
  if (status === "편집 중") return "is-editing";
  if (status === "편집 완료") return "is-done";
  return "is-planned";
}

function openSceneBuilder() {
  sceneBuilderModal.hidden = false;
  document.body.style.overflow = "hidden";
  scenePartField.focus();
}

function closeSceneBuilder() {
  sceneBuilderModal.hidden = true;
  document.body.style.overflow = "";
}

function saveDraft() {
  const draft = {
    part: scenePartField.value,
    title: sceneTitleField.value,
    lyrics: sceneLyricsField.value,
    camera: sceneCameraField.value,
    location: sceneLocationField.value,
    edit: sceneEditField.value,
    duration: sceneDurationField.value,
    status: sceneStatusField.value,
    desc: sceneDescField.value
  };
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function loadDraft() {
  const raw = window.localStorage.getItem(DRAFT_KEY);
  if (!raw) return;

  try {
    const draft = JSON.parse(raw);
    scenePartField.value = draft.part || "";
    sceneTitleField.value = draft.title || "";
    sceneLyricsField.value = draft.lyrics || "";
    sceneCameraField.value = draft.camera || "";
    sceneLocationField.value = draft.location || "";
    sceneEditField.value = draft.edit || "";
    sceneDurationField.value = draft.duration || "";
    sceneStatusField.value = draft.status || "촬영 전";
    sceneDescField.value = draft.desc || "";
  } catch {
    window.localStorage.removeItem(DRAFT_KEY);
  }
}

function clearDraft() {
  window.localStorage.removeItem(DRAFT_KEY);
}

function resetSceneInputs() {
  scenePartField.value = "";
  sceneTitleField.value = "";
  sceneLyricsField.value = "";
  sceneCameraField.value = "";
  sceneLocationField.value = "";
  sceneEditField.value = "";
  sceneDurationField.value = "";
  sceneStatusField.value = "촬영 전";
  sceneDescField.value = "";
  sceneImageField.value = "";
}

function toSceneRecord(scene, order) {
  return {
    sort_order: order,
    part: scene.part,
    title: scene.title,
    lyrics: scene.lyrics,
    camera: scene.camera,
    location: scene.location,
    edit: scene.edit,
    duration: scene.duration,
    status: scene.status,
    description: scene.desc,
    image: scene.image || "",
    feedbacks: Array.isArray(scene.feedbacks) ? scene.feedbacks : []
  };
}

function fromSceneRecord(record) {
  return {
    id: record.id,
    part: record.part || "",
    title: record.title || "",
    lyrics: record.lyrics || "",
    camera: record.camera || "",
    location: record.location || "",
    edit: record.edit || "",
    duration: record.duration || "",
    status: record.status || "촬영 전",
    desc: record.description || "",
    image: record.image || "",
    feedbacks: Array.isArray(record.feedbacks) ? record.feedbacks : [],
    order: record.sort_order ?? 0
  };
}

async function requestSupabase(path = "", options = {}) {
  const response = await fetch(`${SUPABASE_REST_URL}/${SUPABASE_TABLE_NAME}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Supabase 요청에 실패했습니다.");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function fetchScenes() {
  const data = await requestSupabase("?select=*&order=sort_order.asc");
  scenesCache = (data || []).map(fromSceneRecord);
  renderScenes();
}

async function insertScene(scene) {
  const [inserted] = await requestSupabase("?select=*", {
    method: "POST",
    body: JSON.stringify([toSceneRecord(scene, scenesCache.length)])
  });
  return fromSceneRecord(inserted);
}

async function updateScene(id, payload) {
  const [updated] = await requestSupabase(`?id=eq.${encodeURIComponent(id)}&select=*`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  return fromSceneRecord(updated);
}

async function removeScene(id) {
  await requestSupabase(`?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" }
  });
}

async function updateOrders(orderedScenes) {
  await Promise.all(
    orderedScenes.map((scene, index) =>
      updateScene(scene.id, { sort_order: index })
    )
  );
}

function syncFilterOptions(selectElement, values) {
  const currentValue = selectElement.value;
  selectElement.innerHTML = `<option value="all">${FILTER_ALL_LABEL}</option>`;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  });
  selectElement.value = values.includes(currentValue) || currentValue === "all" ? currentValue : "all";
}

function syncSuggestionOptions(datalistElement, values) {
  datalistElement.innerHTML = "";
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    datalistElement.appendChild(option);
  });
}

function updateFilterOptions() {
  const unique = (key) => [...new Set(scenesCache.map((scene) => scene[key]).filter(Boolean))];
  syncFilterOptions(filterPart, unique("part"));
  syncFilterOptions(filterLocation, unique("location"));
  syncFilterOptions(filterCamera, unique("camera"));
  syncFilterOptions(filterEdit, unique("edit"));
  syncFilterOptions(filterStatus, unique("status"));

  syncSuggestionOptions(partSuggestions, unique("part"));
  syncSuggestionOptions(locationSuggestions, unique("location"));
  syncSuggestionOptions(cameraSuggestions, unique("camera"));
  syncSuggestionOptions(editSuggestions, unique("edit"));
  syncSuggestionOptions(durationSuggestions, unique("duration"));
}

function updateOutline() {
  sceneOutlineCount.textContent = `${scenesCache.length}개 장면`;
  sceneOutlineList.innerHTML = "";

  if (!scenesCache.length) {
    const empty = document.createElement("p");
    empty.className = "scene-outline-empty";
    empty.textContent = "아직 등록된 장면이 없습니다.";
    sceneOutlineList.appendChild(empty);
    return;
  }

  scenesCache.forEach((scene, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scene-outline-button";
    button.innerHTML = `
      <strong>CUT ${String(index + 1).padStart(2, "0")}</strong>
      <span>${escapeHtml(scene.title || "제목 없음")}</span>
    `;
    button.addEventListener("click", () => {
      document.getElementById(`scene-card-${scene.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    sceneOutlineList.appendChild(button);
  });
}

function createFeedbackMarkup(feedbacks) {
  return (feedbacks || []).map((text) => `
    <li>
      <span class="feedback-text">${escapeHtml(text)}</span>
      <button class="delete-feedback-button" type="button">삭제</button>
    </li>
  `).join("");
}

function applyFilter() {
  const selectedPart = filterPart.value;
  const selectedLocation = filterLocation.value;
  const selectedCamera = filterCamera.value;
  const selectedEdit = filterEdit.value;
  const selectedStatus = filterStatus.value;
  const searchText = sceneSearchInput.value.trim().toLowerCase();

  const cards = [...document.querySelectorAll(".scene-card")];
  cards.forEach((card) => {
    const matchesPart = selectedPart === "all" || card.dataset.part === selectedPart;
    const matchesLocation = selectedLocation === "all" || card.dataset.location === selectedLocation;
    const matchesCamera = selectedCamera === "all" || card.dataset.camera === selectedCamera;
    const matchesEdit = selectedEdit === "all" || card.dataset.edit === selectedEdit;
    const matchesStatus = selectedStatus === "all" || card.dataset.status === selectedStatus;
    const searchTarget = [
      card.dataset.part,
      card.dataset.title,
      card.dataset.location,
      card.dataset.camera,
      card.dataset.edit,
      card.dataset.status,
      card.dataset.duration,
      card.dataset.desc,
      card.dataset.lyrics
    ].join(" ").toLowerCase();
    const matchesSearch = !searchText || searchTarget.includes(searchText);
    card.classList.toggle("hidden", !(matchesPart && matchesLocation && matchesCamera && matchesEdit && matchesStatus && matchesSearch));
  });

  const hasVisible = cards.some((card) => !card.classList.contains("hidden"));
  emptyState.hidden = hasVisible;
  if (!hasVisible) {
    emptyState.textContent = cards.length === 0
      ? "아직 추가된 스토리보드가 없습니다. 아래 `+` 버튼을 눌러 장면을 추가해보세요."
      : "선택한 조건에 맞는 스토리보드가 없습니다.";
  }
}

function createSceneCard(scene, index) {
  const article = document.createElement("article");
  article.className = "scene-card";
  article.id = `scene-card-${scene.id}`;
  article.dataset.id = scene.id;
  article.dataset.part = scene.part || "";
  article.dataset.title = scene.title || "";
  article.dataset.lyrics = scene.lyrics || "";
  article.dataset.camera = scene.camera || "";
  article.dataset.location = scene.location || "";
  article.dataset.edit = scene.edit || "";
  article.dataset.duration = scene.duration || "";
  article.dataset.status = scene.status || "촬영 전";
  article.dataset.desc = scene.desc || "";

  article.innerHTML = `
    <div class="scene-card-header">
      <div class="scene-card-title-block">
        <div class="scene-top">
          <p class="scene-number">CUT ${String(index + 1).padStart(2, "0")}</p>
          <span class="scene-tag">${escapeHtml(scene.part || "")}</span>
        </div>
        <h3>${escapeHtml(scene.title || "")}</h3>
      </div>
      <div class="scene-actions">
        <button class="scene-action-button move-up-button" type="button">위로</button>
        <button class="scene-action-button move-down-button" type="button">아래로</button>
        <button class="scene-action-button edit-scene-button" type="button">수정</button>
        <button class="scene-action-button delete-scene-button" type="button">삭제</button>
      </div>
    </div>
    <div class="scene-layout">
      <div class="scene-image-frame">${getImageMarkup(scene.image, `${scene.title || "장면"} 이미지`)}</div>
      <div class="scene-side">
        <div class="scene-lyrics-box">
          <p class="scene-box-label">가사</p>
          <p class="scene-lyrics-text">${escapeHtml(scene.lyrics || "")}</p>
        </div>
        <div class="scene-desc-box">
          <p class="scene-box-label">장면 설명</p>
          <p class="scene-desc">${escapeHtml(scene.desc || "")}</p>
        </div>
      </div>
      <ul class="scene-meta">
        <li><strong>카메라</strong><span>${escapeHtml(scene.camera || "")}</span></li>
        <li><strong>장소</strong><span>${escapeHtml(scene.location || "")}</span></li>
        <li><strong>편집</strong><span>${escapeHtml(scene.edit || "")}</span></li>
        <li><strong>장면 시간</strong><span>${escapeHtml(scene.duration || "")}</span></li>
        <li><strong>촬영 상태</strong><span class="scene-status-badge ${getStatusClass(scene.status || "촬영 전")}">${escapeHtml(scene.status || "촬영 전")}</span></li>
      </ul>
    </div>
    <div class="feedback-box">
      <h4>피드백</h4>
      <div class="feedback-input-row">
        <textarea class="feedback-input" placeholder="이 장면에 대한 피드백을 적어보세요."></textarea>
        <button class="button ghost add-feedback-button" type="button">피드백 추가</button>
      </div>
      <ul class="feedback-list">${createFeedbackMarkup(scene.feedbacks || [])}</ul>
      <p class="feedback-empty"${(scene.feedbacks || []).length ? " hidden" : ""}>${FEEDBACK_EMPTY_TEXT}</p>
    </div>
    <div class="scene-editor" hidden>
      <div class="scene-editor-grid">
        <div class="field"><label>구간</label><input class="edit-scene-part" type="text" list="part-suggestions" value="${escapeHtml(scene.part || "")}"></div>
        <div class="field"><label>장면 제목</label><input class="edit-scene-title" type="text" value="${escapeHtml(scene.title || "")}"></div>
        <div class="field"><label>장소</label><input class="edit-scene-location" type="text" list="location-suggestions" value="${escapeHtml(scene.location || "")}"></div>
        <div class="field"><label>카메라</label><input class="edit-scene-camera" type="text" list="camera-suggestions" value="${escapeHtml(scene.camera || "")}"></div>
        <div class="field"><label>편집</label><input class="edit-scene-edit" type="text" list="edit-suggestions" value="${escapeHtml(scene.edit || "")}"></div>
        <div class="field"><label>장면 시간</label><input class="edit-scene-duration" type="text" list="duration-suggestions" value="${escapeHtml(scene.duration || "")}"></div>
        <div class="field">
          <label>촬영 상태</label>
          <select class="edit-scene-status">
            <option value="촬영 전"${scene.status === "촬영 전" ? " selected" : ""}>촬영 전</option>
            <option value="촬영 완료"${scene.status === "촬영 완료" ? " selected" : ""}>촬영 완료</option>
            <option value="편집 중"${scene.status === "편집 중" ? " selected" : ""}>편집 중</option>
            <option value="편집 완료"${scene.status === "편집 완료" ? " selected" : ""}>편집 완료</option>
          </select>
        </div>
        <div class="field"><label>사진 수정</label><input class="edit-scene-image" type="file" accept="image/*"></div>
      </div>
      <div class="scene-editor-grid text-grid">
        <div class="field"><label>가사</label><textarea class="edit-scene-lyrics">${escapeHtml(scene.lyrics || "")}</textarea></div>
        <div class="field"><label>장면 설명</label><textarea class="edit-scene-desc">${escapeHtml(scene.desc || "")}</textarea></div>
      </div>
      <label class="remove-image-label"><input class="remove-scene-image" type="checkbox">현재 사진 제거</label>
      <div class="scene-editor-actions">
        <button class="button primary save-scene-button" type="button">수정 저장</button>
        <button class="button ghost cancel-scene-button" type="button">취소</button>
      </div>
    </div>
  `;

  attachCardHandlers(article, scene);
  return article;
}

function renderScenes() {
  storyboardGrid.innerHTML = "";
  scenesCache.forEach((scene, index) => {
    storyboardGrid.appendChild(createSceneCard(scene, index));
  });
  updateFilterOptions();
  updateOutline();
  applyFilter();
}

async function refreshScenesSilently() {
  if (activeEditorSceneId || !sceneBuilderModal.hidden) {
    return;
  }

  try {
    await fetchScenes();
  } catch {
    // keep current UI when polling fails
  }
}

function scheduleRefresh() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
  }
  refreshTimer = window.setInterval(refreshScenesSilently, REFRESH_INTERVAL_MS);
}

function attachCardHandlers(card, scene) {
  const feedbackInput = card.querySelector(".feedback-input");
  const feedbackButton = card.querySelector(".add-feedback-button");
  const feedbackList = card.querySelector(".feedback-list");
  const feedbackEmpty = card.querySelector(".feedback-empty");

  function currentFeedbacks() {
    return [...feedbackList.querySelectorAll(".feedback-text")].map((node) => node.textContent);
  }

  function bindFeedbackDeletes() {
    card.querySelectorAll(".delete-feedback-button").forEach((button) => {
      button.onclick = async () => {
        button.closest("li")?.remove();
        feedbackEmpty.hidden = currentFeedbacks().length > 0;
        await updateScene(scene.id, { feedbacks: currentFeedbacks() });
        await fetchScenes();
        saveStatus.textContent = "피드백이 삭제되었습니다.";
      };
    });
  }

  bindFeedbackDeletes();

  feedbackButton.addEventListener("click", async () => {
    const text = feedbackInput.value.trim();
    if (!text) {
      saveStatus.textContent = "피드백 내용을 입력한 뒤 추가해주세요.";
      return;
    }

    const item = document.createElement("li");
    item.innerHTML = `
      <span class="feedback-text">${escapeHtml(text)}</span>
      <button class="delete-feedback-button" type="button">삭제</button>
    `;
    feedbackList.appendChild(item);
    feedbackInput.value = "";
    feedbackEmpty.hidden = true;
    bindFeedbackDeletes();

    await updateScene(scene.id, { feedbacks: currentFeedbacks() });
    await fetchScenes();
    saveStatus.textContent = "피드백이 추가되었습니다.";
  });

  card.querySelector(".delete-scene-button").addEventListener("click", async () => {
    await removeScene(scene.id);
    const nextScenes = scenesCache.filter((item) => item.id !== scene.id);
    await updateOrders(nextScenes);
    await fetchScenes();
    saveStatus.textContent = "스토리보드가 삭제되었습니다.";
  });

  card.querySelector(".move-up-button").addEventListener("click", async () => {
    const index = scenesCache.findIndex((item) => item.id === scene.id);
    if (index <= 0) return;
    const reordered = [...scenesCache];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    await updateOrders(reordered);
    await fetchScenes();
    saveStatus.textContent = "스토리보드 순서를 변경했습니다.";
  });

  card.querySelector(".move-down-button").addEventListener("click", async () => {
    const index = scenesCache.findIndex((item) => item.id === scene.id);
    if (index === -1 || index >= scenesCache.length - 1) return;
    const reordered = [...scenesCache];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    await updateOrders(reordered);
    await fetchScenes();
    saveStatus.textContent = "스토리보드 순서를 변경했습니다.";
  });

  const editor = card.querySelector(".scene-editor");
  const editButton = card.querySelector(".edit-scene-button");
  const cancelButton = card.querySelector(".cancel-scene-button");
  const saveButton = card.querySelector(".save-scene-button");

  const partInput = card.querySelector(".edit-scene-part");
  const titleInput = card.querySelector(".edit-scene-title");
  const locationInput = card.querySelector(".edit-scene-location");
  const cameraInput = card.querySelector(".edit-scene-camera");
  const editInput = card.querySelector(".edit-scene-edit");
  const durationInput = card.querySelector(".edit-scene-duration");
  const statusInput = card.querySelector(".edit-scene-status");
  const lyricsInput = card.querySelector(".edit-scene-lyrics");
  const descInput = card.querySelector(".edit-scene-desc");
  const imageInput = card.querySelector(".edit-scene-image");
  const removeImageInput = card.querySelector(".remove-scene-image");

  editButton.addEventListener("click", () => {
    activeEditorSceneId = scene.id;
    editor.hidden = false;
    saveStatus.textContent = "스토리보드 수정창을 열었습니다.";
  });

  cancelButton.addEventListener("click", () => {
    activeEditorSceneId = null;
    editor.hidden = true;
    saveStatus.textContent = "스토리보드 수정을 취소했습니다.";
  });

  saveButton.addEventListener("click", async () => {
    const payload = {
      part: partInput.value.trim(),
      title: titleInput.value.trim(),
      location: locationInput.value.trim(),
      camera: cameraInput.value.trim(),
      edit: editInput.value.trim(),
      duration: durationInput.value.trim(),
      status: statusInput.value,
      lyrics: lyricsInput.value.trim(),
      description: descInput.value.trim(),
      feedbacks: scene.feedbacks || []
    };

    if (!payload.part || !payload.title || !payload.location || !payload.camera || !payload.edit || !payload.duration || !payload.lyrics || !payload.description) {
      saveStatus.textContent = "수정 저장 전 모든 항목을 입력해주세요.";
      return;
    }

    if (removeImageInput.checked) {
      payload.image = "";
    } else if (imageInput.files[0]) {
      payload.image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
        reader.readAsDataURL(imageInput.files[0]);
      });
    }

    await updateScene(scene.id, payload);
    activeEditorSceneId = null;
    editor.hidden = true;
    await fetchScenes();
    saveStatus.textContent = "스토리보드가 수정되었습니다.";
  });
}

async function addScene() {
  const scene = {
    part: scenePartField.value.trim(),
    title: sceneTitleField.value.trim(),
    lyrics: sceneLyricsField.value.trim(),
    camera: sceneCameraField.value.trim(),
    location: sceneLocationField.value.trim(),
    edit: sceneEditField.value.trim(),
    duration: sceneDurationField.value.trim(),
    status: sceneStatusField.value,
    desc: sceneDescField.value.trim(),
    image: "",
    feedbacks: []
  };

  if (!scene.part || !scene.title || !scene.lyrics || !scene.camera || !scene.location || !scene.edit || !scene.duration || !scene.desc) {
    saveStatus.textContent = "스토리보드 추가 전 모든 항목을 입력해주세요.";
    return;
  }

  if (sceneImageField.files[0]) {
    scene.image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
      reader.readAsDataURL(sceneImageField.files[0]);
    });
  }

  await insertScene(scene);
  resetSceneInputs();
  clearDraft();
  closeSceneBuilder();
  await fetchScenes();
  saveStatus.textContent = "새 스토리보드 장면이 추가되었습니다.";
}

async function init() {
  loadDraft();

  draftFields.forEach((field) => {
    field.addEventListener("input", saveDraft);
    field.addEventListener("change", saveDraft);
  });

  filterPart.addEventListener("change", applyFilter);
  filterLocation.addEventListener("change", applyFilter);
  filterCamera.addEventListener("change", applyFilter);
  filterEdit.addEventListener("change", applyFilter);
  filterStatus.addEventListener("change", applyFilter);
  sceneSearchInput.addEventListener("input", applyFilter);

  addSceneButton.addEventListener("click", addScene);
  openSceneBuilderPlus.addEventListener("click", openSceneBuilder);
  closeSceneBuilderButton.addEventListener("click", closeSceneBuilder);
  cancelSceneBuilderButton.addEventListener("click", closeSceneBuilder);
  sceneBuilderBackdrop.addEventListener("click", closeSceneBuilder);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !sceneBuilderModal.hidden) {
      closeSceneBuilder();
    }
  });

  try {
    await fetchScenes();
    saveStatus.textContent = "Supabase와 연결되었습니다. 여러 기기에서 같은 내용을 확인할 수 있습니다.";
    scheduleRefresh();
  } catch (error) {
    saveStatus.textContent = "Supabase 연결에 실패했습니다. `supabase-setup.sql`을 먼저 실행했는지 확인해주세요.";
    console.error(error);
  }
}

init();
