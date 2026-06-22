// This page shows one project's board: three columns (To Do, In Progress, Done)
// full of task cards. Everything talks to the backend through apiRequest().

requireAuth();

const params = new URLSearchParams(window.location.search);
const projectId = params.get("id");

if (!projectId) window.location.href = "dashboard.html";

let currentProject = null;
let currentTasks = [];
let activeTaskId = null;
let pendingNewTaskStatus = "todo";

const STATUSES = ["todo", "in-progress", "done"];
const STATUS_LABELS = { todo: "To Do", "in-progress": "In Progress", done: "Done" };

/* ---------------- Initial load ---------------- */

async function loadProject() {
  currentProject = await apiRequest(`/projects/${projectId}`);
  document.getElementById("project-name").textContent = currentProject.name;
  populateAssigneeDropdowns(currentProject.members);
}

async function loadTasks() {
  currentTasks = await apiRequest(`/projects/${projectId}/tasks`);
  renderBoard();
}

function populateAssigneeDropdowns(members) {
  const options = `<option value="">Unassigned</option>` +
    members.map((m) => `<option value="${m._id}">${escapeHtml(m.name)}</option>`).join("");

  document.getElementById("task-assignee").innerHTML = options;
  document.getElementById("detail-assignee").innerHTML = options;
}

/* ---------------- Rendering ---------------- */

function renderBoard() {
  STATUSES.forEach((status) => {
    const list = currentTasks.filter((t) => t.status === status);
    const container = document.getElementById(`cards-${status}`);
    container.innerHTML = list.map(taskCardHtml).join("");
    document.getElementById(`count-${status}`).textContent = list.length;
  });
  attachCardListeners();
}

// Builds the HTML for one task card, including a "Move to" dropdown
// so you can change its column without drag-and-drop.
function taskCardHtml(task) {
  const assigneeChip = task.assignedTo
    ? `<span class="assignee-chip">${escapeHtml(task.assignedTo.name)}</span>`
    : `<span class="assignee-chip">Unassigned</span>`;

  const moveOptions = STATUSES
    .map((s) => `<option value="${s}" ${s === task.status ? "selected" : ""}>${STATUS_LABELS[s]}</option>`)
    .join("");

  return `
    <div class="card" data-id="${task._id}">
      <h4>${escapeHtml(task.title)}</h4>
      ${task.description ? `<p class="desc">${escapeHtml(task.description)}</p>` : ""}
      <div class="card-foot">
        ${assigneeChip}
        <select class="move-select" data-id="${task._id}">${moveOptions}</select>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------------- Card interactions ---------------- */

function attachCardListeners() {
  // Clicking the card body (but not the dropdown) opens the detail modal
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("move-select")) return;
      openTaskDetail(card.dataset.id);
    });
  });

  // Changing the "Move to" dropdown updates the task's status
  document.querySelectorAll(".move-select").forEach((select) => {
    select.addEventListener("click", (e) => e.stopPropagation());
    select.addEventListener("change", async (e) => {
      const taskId = e.target.dataset.id;
      const newStatus = e.target.value;
      try {
        await apiRequest(`/tasks/${taskId}`, { method: "PUT", body: { status: newStatus } });
        await loadTasks();
      } catch (err) {
        showToast(err.message);
      }
    });
  });
}

/* ---------------- New task modal ---------------- */

document.querySelectorAll(".add-card-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    pendingNewTaskStatus = btn.dataset.status;
    document.getElementById("new-task-status-label").textContent = STATUS_LABELS[pendingNewTaskStatus];
    document.getElementById("task-modal-backdrop").classList.add("open");
  });
});

document.getElementById("cancel-task-modal-btn").addEventListener("click", () => {
  document.getElementById("task-modal-backdrop").classList.remove("open");
});

document.getElementById("task-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("task-title").value.trim();
  const description = document.getElementById("task-desc").value.trim();
  const assignedTo = document.getElementById("task-assignee").value || null;

  try {
    // New tasks are always created in "To Do" by the API, so if the
    // person clicked "+ Add a task" under a different column, we move
    // it there right after creating it.
    const task = await apiRequest(`/projects/${projectId}/tasks`, {
      method: "POST",
      body: { title, description, assignedTo },
    });

    if (pendingNewTaskStatus !== "todo") {
      await apiRequest(`/tasks/${task._id}`, { method: "PUT", body: { status: pendingNewTaskStatus } });
    }

    document.getElementById("task-modal-backdrop").classList.remove("open");
    document.getElementById("task-form").reset();
    loadTasks();
  } catch (err) {
    showToast(err.message);
  }
});

/* ---------------- Task detail modal ---------------- */

async function openTaskDetail(taskId) {
  activeTaskId = taskId;
  const task = currentTasks.find((t) => t._id === taskId);
  if (!task) return;

  document.getElementById("detail-title").textContent = task.title;
  document.getElementById("detail-desc").textContent = task.description || "No description.";
  document.getElementById("detail-assignee").value = task.assignedTo ? task.assignedTo._id : "";

  document.querySelectorAll(".status-pill").forEach((pill) => {
    pill.classList.toggle("active", pill.dataset.status === task.status);
  });

  await loadComments(taskId);
  document.getElementById("detail-modal-backdrop").classList.add("open");
}

document.getElementById("close-detail-btn").addEventListener("click", () => {
  document.getElementById("detail-modal-backdrop").classList.remove("open");
  activeTaskId = null;
});

document.querySelectorAll(".status-pill").forEach((pill) => {
  pill.addEventListener("click", async () => {
    if (!activeTaskId) return;
    const status = pill.dataset.status;
    try {
      await apiRequest(`/tasks/${activeTaskId}`, { method: "PUT", body: { status } });
      document.querySelectorAll(".status-pill").forEach((p) => p.classList.toggle("active", p === pill));
      loadTasks();
    } catch (err) {
      showToast(err.message);
    }
  });
});

document.getElementById("detail-assignee").addEventListener("change", async (e) => {
  if (!activeTaskId) return;
  try {
    await apiRequest(`/tasks/${activeTaskId}`, {
      method: "PUT",
      body: { assignedTo: e.target.value || null },
    });
    loadTasks();
  } catch (err) {
    showToast(err.message);
  }
});

document.getElementById("delete-task-btn").addEventListener("click", async () => {
  if (!activeTaskId) return;
  if (!confirm("Delete this task? This cannot be undone.")) return;

  try {
    await apiRequest(`/tasks/${activeTaskId}`, { method: "DELETE" });
    document.getElementById("detail-modal-backdrop").classList.remove("open");
    loadTasks();
  } catch (err) {
    showToast(err.message);
  }
});

/* ---------------- Comments ---------------- */

async function loadComments(taskId) {
  const comments = await apiRequest(`/tasks/${taskId}/comments`);
  renderComments(comments);
}

function renderComments(comments) {
  const list = document.getElementById("comments-list");
  if (comments.length === 0) {
    list.innerHTML = `<p style="color:var(--muted);font-size:0.85rem;">No comments yet.</p>`;
    return;
  }
  list.innerHTML = comments
    .map(
      (c) => `
      <div class="comment-item">
        <div class="meta">${escapeHtml(c.author.name)} &middot; ${new Date(c.createdAt).toLocaleString()}</div>
        <div>${escapeHtml(c.text)}</div>
      </div>
    `
    )
    .join("");
  list.scrollTop = list.scrollHeight;
}

document.getElementById("comment-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!activeTaskId) return;

  const input = document.getElementById("comment-input");
  const text = input.value.trim();
  if (!text) return;

  try {
    await apiRequest(`/tasks/${activeTaskId}/comments`, { method: "POST", body: { text } });
    input.value = "";
    await loadComments(activeTaskId); // refresh the list to show the new comment
  } catch (err) {
    showToast(err.message);
  }
});

/* ---------------- Add teammate ---------------- */

document.getElementById("add-member-btn").addEventListener("click", () => {
  document.getElementById("member-modal-backdrop").classList.add("open");
});
document.getElementById("cancel-member-modal-btn").addEventListener("click", () => {
  document.getElementById("member-modal-backdrop").classList.remove("open");
});

document.getElementById("member-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("member-email").value.trim();

  try {
    const updated = await apiRequest(`/projects/${projectId}/members`, { method: "PUT", body: { email } });
    currentProject = updated;
    populateAssigneeDropdowns(updated.members);
    document.getElementById("member-modal-backdrop").classList.remove("open");
    document.getElementById("member-form").reset();
    showToast("Teammate added");
  } catch (err) {
    showToast(err.message);
  }
});

/* ---------------- Boot ---------------- */

(async function init() {
  try {
    await loadProject();
    await loadTasks();
  } catch (err) {
    showToast(err.message);
  }
})();
