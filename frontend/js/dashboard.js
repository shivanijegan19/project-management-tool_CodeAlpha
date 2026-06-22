requireAuth();

const user = getCurrentUser();
document.getElementById("user-pill").textContent = user.name;

document.getElementById("logout-btn").addEventListener("click", logout);

const grid = document.getElementById("project-grid");
const emptyState = document.getElementById("empty-state");
const backdrop = document.getElementById("modal-backdrop");

document.getElementById("new-project-btn").addEventListener("click", () => {
  backdrop.classList.add("open");
});
document.getElementById("cancel-modal-btn").addEventListener("click", () => {
  backdrop.classList.remove("open");
});

document.getElementById("project-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("project-name").value.trim();
  const description = document.getElementById("project-desc").value.trim();

  try {
    await apiRequest("/projects", { method: "POST", body: { name, description } });
    backdrop.classList.remove("open");
    document.getElementById("project-form").reset();
    loadProjects();
  } catch (err) {
    showToast(err.message);
  }
});

function projectCardHtml(project) {
  const memberAvatars = project.members
    .slice(0, 4)
    .map((m) => `<span class="avatar" title="${m.name}">${initials(m.name)}</span>`)
    .join("");

  return `
    <a class="project-card" href="board.html?id=${project._id}" style="text-decoration:none;color:inherit;">
      <h3>${escapeHtml(project.name)}</h3>
      <p>${escapeHtml(project.description) || "No description yet."}</p>
      <div class="project-meta">
        <div class="avatars">${memberAvatars}</div>
        <span>${project.members.length} member${project.members.length === 1 ? "" : "s"}</span>
      </div>
    </a>
  `;
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadProjects() {
  try {
    const projects = await apiRequest("/projects");
    grid.innerHTML = projects.map(projectCardHtml).join("");
    emptyState.style.display = projects.length === 0 ? "block" : "none";
  } catch (err) {
    showToast(err.message);
  }
}

loadProjects();
