const STORAGE_KEY = "mv-storyboard-scenes-v1";
const DRAFT_KEY = "mv-storyboard-draft-v1";
const FILTER_ALL_LABEL = "전체 보기";
const FEEDBACK_EMPTY_TEXT = "아직 등록된 피드백이 없습니다.";
const IMAGE_PLACEHOLDER = '<div class="scene-image-placeholder">사진을 넣으면 이 영역에 표시됩니다.</div>';

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

function readScenes() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const scenes = JSON.parse(raw);
    return Array.isArray(scenes) ? scenes : [];
  } catch {
    return [];
  }
}

function writeScenes(scenes) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes));
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

function updateFilterOptions(scenes) {
  const unique = (key) => [...new Set(scenes.map((scene) => scene[key]).filter(Boolean))];
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

function updateOutline(scenes) {
  sceneOutlineCount.textContent = `${scenes.length}개 장면`;
  sceneOutlineList.innerHTML = "";
  if (!scenes.length) {
    const empty = document.createElement("p");
    empty.className = "scene-outline-empty";
    empty.textContent = "아직 등록된 장면이 없습니다.";
    sceneOutlineList.appendChild(empty);
    return;
  }

  scenes.forEach((scene, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scene-outline-button";
    button.innerHTML = `
      <strong>SCENE ${String(index + 1).padStart(2, "0")}</strong>
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

function saveAndRender(scenes, message) {
  writeScenes(scenes);
  renderScenes();
  if (message) {
    saveStatus.textContent = message;
  }
}

function attachCardHandlers(card) {
  const id = card.dataset.id;
  const feedbackInput = card.querySelector(".feedback-input");
  const feedbackButton = card.querySelector(".add-feedback-button");
  const feedbackList = card.querySelector(".feedback-list");
  const feedbackEmpty = card.querySelector(".feedback-empty");

  function getScenes() {
    return readScenes();
  }

  function updateFeedbacks() {
    const feedbacks = [...feedbackList.querySelectorAll(".feedback-text")].map((node) => node.textContent);
    const scenes = getScenes().map((scene) => scene.id === id ? { ...scene, feedbacks } : scene);
    saveAndRender(scenes);
  }

  function bindFeedbackDeletes() {
    card.querySelectorAll(".delete-feedback-button").forEach((button) => {
      button.onclick = () => {
        button.closest("li")?.remove();
        feedbackEmpty.hidden = feedbackList.children.length > 0;
        updateFeedbacks();
        saveStatus.textContent = "피드백이 삭제되었습니다.";
      };
    });
  }

  bindFeedbackDeletes();

  feedbackButton.addEventListener("click", () => {
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
    updateFeedbacks();
    saveStatus.textContent = "피드백이 추가되었습니다.";
  });

  card.querySelector(".delete-scene-button").addEventListener("click", () => {
    const scenes = getScenes()
      .filter((scene) => scene.id !== id)
      .map((scene, index) => ({ ...scene, order: index }));
    saveAndRender(scenes, "스토리보드가 삭제되었습니다.");
  });

  card.querySelector(".move-up-button").addEventListener("click", () => {
    const scenes = getScenes();
    const index = scenes.findIndex((scene) => scene.id === id);
    if (index <= 0) return;
    [scenes[index - 1], scenes[index]] = [scenes[index], scenes[index - 1]];
    saveAndRender(scenes.map((scene, order) => ({ ...scene, order })), "스토리보드 순서를 변경했습니다.");
  });

  card.querySelector(".move-down-button").addEventListener("click", () => {
    const scenes = getScenes();
    const index = scenes.findIndex((scene) => scene.id === id);
    if (index === -1 || index >= scenes.length - 1) return;
    [scenes[index], scenes[index + 1]] = [scenes[index + 1], scenes[index]];
    saveAndRender(scenes.map((scene, order) => ({ ...scene, order })), "스토리보드 순서를 변경했습니다.");
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
    editor.hidden = false;
    saveStatus.textContent = "스토리보드 수정창을 열었습니다.";
  });

  cancelButton.addEventListener("click", () => {
    editor.hidden = true;
    saveStatus.textContent = "스토리보드 수정을 취소했습니다.";
  });

  saveButton.addEventListener("click", async () => {
    const scenes = getScenes();
    const target = scenes.find((scene) => scene.id === id);
    if (!target) return;

    const payload = {
      ...target,
      part: partInput.value.trim(),
      title: titleInput.value.trim(),
      location: locationInput.value.trim(),
      camera: cameraInput.value.trim(),
      edit: editInput.value.trim(),
      duration: durationInput.value.trim(),
      status: statusInput.value,
      lyrics: lyricsInput.value.trim(),
      desc: descInput.value.trim()
    };

    if (!payload.part || !payload.title || !payload.location || !payload.camera || !payload.edit || !payload.duration || !payload.lyrics || !payload.desc) {
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

    const updated = scenes.map((scene) => scene.id === id ? payload : scene);
    saveAndRender(updated, "스토리보드가 수정되었습니다.");
  });
}

function renderScenes() {
  const scenes = readScenes();
  storyboardGrid.innerHTML = "";

  scenes.forEach((scene, index) => {
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
            <p class="scene-number">SCENE ${String(index + 1).padStart(2, "0")}</p>
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

    attachCardHandlers(article);
    storyboardGrid.appendChild(article);
  });

  updateFilterOptions(scenes);
  updateOutline(scenes);
  applyFilter();
}

async function addScene() {
  const payload = {
    id: `scene-${Date.now()}`,
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
    feedbacks: [],
    order: readScenes().length
  };

  if (!payload.part || !payload.title || !payload.lyrics || !payload.camera || !payload.location || !payload.edit || !payload.duration || !payload.desc) {
    saveStatus.textContent = "스토리보드 추가 전 모든 항목을 입력해주세요.";
    return;
  }

  if (sceneImageField.files[0]) {
    payload.image = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
      reader.readAsDataURL(sceneImageField.files[0]);
    });
  }

  const scenes = [...readScenes(), payload];
  writeScenes(scenes);
  resetSceneInputs();
  clearDraft();
  closeSceneBuilder();
  renderScenes();
  saveStatus.textContent = "새 스토리보드 장면이 추가되었습니다.";
}

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

loadDraft();
renderScenes();
saveStatus.textContent = "현재는 이 브라우저에만 저장됩니다.";
