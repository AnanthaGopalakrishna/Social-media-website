/* ==========================================================
   PULSE — vanilla JS app logic
   All data lives in memory (the `state` object below).
   Reloading the page resets everything back to the seed data.
   ========================================================== */

/* ---------------- 1. Seed data ---------------- */

const SEED_USERS = [
  { id: "u1", name: "Nadia Osei",  handle: "nadia.makes", bio: "Ceramics + light. Lagos → Lisbon." },
  { id: "u2", name: "Theo Marsh",  handle: "theomarsh",   bio: "Motion designer. Slow mornings, fast renders." },
  { id: "u3", name: "Priya Nandan",handle: "priyabuilds", bio: "Furniture from reclaimed wood." },
  { id: "u4", name: "Sam Ruiz",    handle: "samruiz",     bio: "Street photography, mostly rain." },
  { id: "you", name: "You",       handle: "you",          bio: "Tell people what you make." },
];

function seedPosts() {
  const now = Date.now();
  return [
    {
      id: "p1", authorId: "u1",
      text: "Glaze test #14 finally landed the color I wanted. Three months of ugly tests to get one good jar.",
      image: null, video: null, tags: ["ceramics", "process"],
      timestamp: now - 1000 * 60 * 42,
      likes: new Set(["u2", "u3"]),
      comments: [{ id: "c1", authorId: "u2", text: "That blue is unreal", timestamp: now - 1000 * 60 * 30 }],
    },
    {
      id: "p2", authorId: "u2",
      text: "Storyboarding a loop for a client this week — six frames, no more. Constraints make it better every time.",
      image: null, video: null, tags: ["motion", "design"],
      timestamp: now - 1000 * 60 * 60 * 3,
      likes: new Set(["u1"]),
      comments: [],
    },
    {
      id: "p3", authorId: "u3",
      text: "Reclaimed oak bench, joinery only — no screws. Sanding took longer than I'll admit.",
      image: null, video: null, tags: ["woodworking", "process"],
      timestamp: now - 1000 * 60 * 60 * 20,
      likes: new Set(["u4", "u1", "u2"]),
      comments: [
        { id: "c2", authorId: "u4", text: "The joints are so clean", timestamp: now - 1000 * 60 * 60 * 18 },
        { id: "c3", authorId: "u1", text: "Need this in my kitchen", timestamp: now - 1000 * 60 * 60 * 10 },
      ],
    },
    {
      id: "p4", authorId: "u4",
      text: "Waited forty minutes in the rain for this one bus to pass. Worth it.",
      image: null, video: null, tags: ["photography", "street"],
      timestamp: now - 1000 * 60 * 60 * 30,
      likes: new Set(["u3"]),
      comments: [],
    },
  ];
}

/* ---------------- 2. Global state ---------------- */

const state = {
  users: Object.fromEntries(SEED_USERS.map((u) => [u.id, u])),
  currentUserId: "you",
  posts: seedPosts(),
  follows: {
    you: new Set(["u1", "u3"]),
    u1: new Set(["u2"]),
    u2: new Set(["u1", "u3"]),
    u3: new Set(["u4"]),
    u4: new Set(["u1"]),
  },
  notifications: [], // { id, type, actorId, targetId, postId, text, timestamp, read }
  view: "feed",       // feed | explore | notifications | profile
  profileTarget: "you",
  activeTag: null,
  search: "",
  pendingImage: null,  // data URL staged in the composer
  pendingVideo: null,
};

/* ---------------- 3. Small helpers ---------------- */

const AVATAR_PALETTE = ["#E8A33D", "#2E8B84", "#E2543A", "#6C7A4F", "#4E6FA3"];

function avatarColor(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function initials(name) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function currentUser() {
  return state.users[state.currentUserId];
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function avatarHtml(user, sizeClass) {
  return `<div class="avatar ${sizeClass}" style="background:${avatarColor(user.id)}">${initials(user.name)}</div>`;
}

/* ---------------- 4. Rendering ---------------- */

function renderAll() {
  renderTopBar();
  renderNav();
  renderRightColumn();
  renderView();
  if (window.lucide) lucide.createIcons();
}

function renderTopBar() {
  const select = document.getElementById("user-switcher");
  select.innerHTML = SEED_USERS
    .map((u) => `<option value="${u.id}" ${u.id === state.currentUserId ? "selected" : ""}>viewing as @${u.handle}</option>`)
    .join("");

  document.getElementById("open-my-profile").innerHTML = avatarHtml(currentUser(), "avatar-36");
}

function renderNav() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    const view = btn.dataset.view;
    const isProfileMe = view === "profile-me" && state.view === "profile" && state.profileTarget === state.currentUserId;
    const isActive = view === state.view || isProfileMe;
    btn.classList.toggle("active", isActive);
  });

  const myNotifs = notificationsForCurrentUser();
  const unread = myNotifs.filter((n) => !n.read).length;
  const badge = document.getElementById("notif-badge");
  badge.hidden = unread === 0;
  badge.textContent = unread;
}

function notificationsForCurrentUser() {
  return state.notifications
    .filter((n) => n.targetId === state.currentUserId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

function renderRightColumn() {
  // trending tags
  const counts = {};
  state.posts.forEach((p) => p.tags.forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const tagsEl = document.getElementById("trending-tags");
  tagsEl.innerHTML = sorted.length
    ? sorted.map(([tag, count]) =>
        `<button class="tag ${state.activeTag === tag ? "active" : ""}" data-action="toggle-tag" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)} · ${count}</button>`
      ).join("")
    : `<span style="font-size:13px;color:var(--muted)">No tags yet.</span>`;

  // suggested users
  const suggested = Object.values(state.users)
    .filter((u) => u.id !== state.currentUserId && !state.follows[state.currentUserId]?.has(u.id))
    .slice(0, 3);
  const suggEl = document.getElementById("suggested-users");
  suggEl.innerHTML = suggested.length
    ? suggested.map((u) => `
        <div class="suggested-row">
          <button class="suggested-user-btn" data-action="open-profile" data-user="${u.id}">
            ${avatarHtml(u, "avatar-30")}
            <div>
              <div class="suggested-name">${escapeHtml(u.name)}</div>
              <div class="suggested-handle">@${escapeHtml(u.handle)}</div>
            </div>
          </button>
          <button data-action="toggle-follow" data-user="${u.id}"><i data-lucide="user-plus" size="16"></i></button>
        </div>`).join("")
    : `<span style="font-size:13px;color:var(--muted)">You're following everyone.</span>`;
}

function renderView() {
  const root = document.getElementById("view-root");
  const tagBar = document.getElementById("active-tag-bar");

  if (state.activeTag) {
    tagBar.hidden = false;
    tagBar.innerHTML = `Filtering by <button class="tag active" data-action="toggle-tag" data-tag="${escapeHtml(state.activeTag)}">#${escapeHtml(state.activeTag)}</button>`;
  } else {
    tagBar.hidden = true;
  }

  if (state.view === "feed") root.innerHTML = renderFeedView();
  else if (state.view === "explore") root.innerHTML = renderExploreView();
  else if (state.view === "notifications") root.innerHTML = renderNotificationsView();
  else if (state.view === "profile") root.innerHTML = renderProfileView();

  if (window.lucide) lucide.createIcons();
}

function renderFeedView() {
  let list = [...state.posts].sort((a, b) => b.timestamp - a.timestamp);
  if (state.activeTag) list = list.filter((p) => p.tags.includes(state.activeTag));
  if (state.search.trim()) {
    const q = state.search.toLowerCase();
    list = list.filter((p) => {
      const author = state.users[p.authorId];
      return (
        p.text.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        author.name.toLowerCase().includes(q) ||
        author.handle.toLowerCase().includes(q)
      );
    });
  }
  if (list.length === 0) return emptyState("No posts match that search yet.");
  return list.map(renderPostCard).join("");
}

function renderExploreView() {
  const trending = [...state.posts]
    .sort((a, b) => (b.likes.size + b.comments.length) - (a.likes.size + a.comments.length))
    .slice(0, 6);
  return `<h2 class="section-title">Trending now</h2>` + trending.map(renderPostCard).join("");
}

function renderNotificationsView() {
  const myNotifs = notificationsForCurrentUser();
  let html = `<h2 class="section-title">Notifications</h2>`;
  if (myNotifs.length === 0) return html + emptyState("Nothing yet. Interactions on your posts will show up here.");
  html += myNotifs.map((n) => {
    const actor = state.users[n.actorId];
    return `
      <div class="notif-row">
        ${avatarHtml(actor, "avatar-34")}
        <div>
          <b>${escapeHtml(actor.name)}</b> ${escapeHtml(n.text)}
          <div class="notif-text-time">${timeAgo(n.timestamp)}</div>
        </div>
      </div>`;
  }).join("");
  return html;
}

function renderProfileView() {
  const target = state.users[state.profileTarget];
  const isMe = target.id === state.currentUserId;
  const targetPosts = state.posts.filter((p) => p.authorId === target.id).sort((a, b) => b.timestamp - a.timestamp);
  const followers = Object.values(state.users).filter((u) => state.follows[u.id]?.has(target.id)).length;
  const following = state.follows[target.id]?.size || 0;
  const isFollowing = state.follows[state.currentUserId]?.has(target.id);

  const followBtn = isMe ? "" : `
    <button class="follow-btn ${isFollowing ? "following" : "not-following"}" data-action="toggle-follow" data-user="${target.id}">
      <i data-lucide="${isFollowing ? "user-check" : "user-plus"}" size="16"></i>
      ${isFollowing ? "Following" : "Follow"}
    </button>`;

  let html = `
    <div class="profile-header">
      <div class="profile-top">
        <div class="profile-id">
          ${avatarHtml(target, "avatar-64")}
          <div>
            <div class="profile-name">${escapeHtml(target.name)}</div>
            <div class="profile-handle">@${escapeHtml(target.handle)}</div>
          </div>
        </div>
        ${followBtn}
      </div>
      <p class="profile-bio">${escapeHtml(target.bio)}</p>
      <div class="profile-stats">
        <span><b>${targetPosts.length}</b> posts</span>
        <span><b>${followers}</b> followers</span>
        <span><b>${following}</b> following</span>
      </div>
    </div>`;

  html += targetPosts.length
    ? targetPosts.map(renderPostCard).join("")
    : emptyState(isMe ? "Nothing here yet — share what you're working on." : `${escapeHtml(target.name)} hasn't posted yet.`);

  return html;
}

function emptyState(text) {
  return `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function renderPostCard(post) {
  const author = state.users[post.authorId];
  const liked = post.likes.has(state.currentUserId);
  const fold = avatarColor(author.id);

  let media = "";
  if (post.image) media = `<img class="post-media" src="${post.image}" alt="post image" />`;
  else if (post.video) media = `<video class="post-media" src="${post.video}" controls></video>`;

  const tags = post.tags.length
    ? `<div class="post-tags">${post.tags.map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join("")}</div>`
    : "";

  const deleteBtn = author.id === state.currentUserId
    ? `<button class="post-delete-btn" data-action="delete-post" data-post="${post.id}" title="Delete post"><i data-lucide="trash-2" size="16"></i></button>`
    : "";

  const comments = post.comments.map((c) => {
    const cAuthor = state.users[c.authorId];
    return `
      <div class="comment-row">
        ${avatarHtml(cAuthor, "avatar-28")}
        <div>
          <div class="comment-author">${escapeHtml(cAuthor.name)} <span class="comment-time">· ${timeAgo(c.timestamp)}</span></div>
          <div class="comment-text">${escapeHtml(c.text)}</div>
        </div>
      </div>`;
  }).join("");

  return `
    <article class="post-card" data-post-id="${post.id}">
      <div class="post-fold" style="background:${fold}"></div>
      <div class="post-head">
        <button data-action="open-profile" data-user="${author.id}">${avatarHtml(author, "avatar-42")}</button>
        <button class="post-head-name-btn" data-action="open-profile" data-user="${author.id}">
          <div class="post-author-name">${escapeHtml(author.name)}</div>
          <div class="post-meta">@${escapeHtml(author.handle)} · ${timeAgo(post.timestamp)}</div>
        </button>
        ${deleteBtn}
      </div>
      ${post.text ? `<p class="post-text">${escapeHtml(post.text)}</p>` : ""}
      ${media}
      ${tags}
      <div class="post-actions">
        <button class="post-action-btn ${liked ? "liked" : ""}" data-action="like" data-post="${post.id}">
          <i data-lucide="heart" size="19" ${liked ? 'fill="currentColor"' : ""}></i>
          <span>${post.likes.size}</span>
        </button>
        <button class="post-action-btn" data-action="toggle-comments" data-post="${post.id}">
          <i data-lucide="message-circle" size="19"></i>
          <span>${post.comments.length}</span>
        </button>
      </div>
      <div class="comments-block" data-comments-for="${post.id}" ${post.comments.length === 0 ? "hidden" : ""}>
        ${comments}
        <div class="comment-input-row">
          ${avatarHtml(currentUser(), "avatar-28")}
          <input type="text" placeholder="Add a comment" data-comment-input="${post.id}" />
          <button data-action="submit-comment" data-post="${post.id}"><i data-lucide="send" size="16"></i></button>
        </div>
      </div>
    </article>`;
}

/* ---------------- 5. Actions (mutate state, then re-render) ---------------- */

function pushNotification({ type, actorId, targetId, postId, text }) {
  state.notifications.unshift({
    id: `n${Date.now()}${Math.random()}`,
    type, actorId, targetId, postId, text,
    timestamp: Date.now(),
    read: false,
  });
}

function toggleLike(postId) {
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return;
  const uid = state.currentUserId;
  if (post.likes.has(uid)) {
    post.likes.delete(uid);
  } else {
    post.likes.add(uid);
    if (post.authorId !== uid) {
      pushNotification({ type: "like", actorId: uid, targetId: post.authorId, postId: post.id, text: "liked your post" });
    }
  }
  renderAll();
}

function submitComment(postId, text) {
  if (!text.trim()) return;
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return;
  post.comments.push({ id: `c${Date.now()}`, authorId: state.currentUserId, text: text.trim(), timestamp: Date.now() });
  if (post.authorId !== state.currentUserId) {
    pushNotification({ type: "comment", actorId: state.currentUserId, targetId: post.authorId, postId: post.id, text: "commented on your post" });
  }
  renderAll();
  // re-open the comments panel and focus the input after re-render
  const panel = document.querySelector(`[data-comments-for="${postId}"]`);
  if (panel) panel.hidden = false;
}

function deletePost(postId) {
  state.posts = state.posts.filter((p) => p.id !== postId);
  renderAll();
}

function toggleFollow(targetId) {
  const uid = state.currentUserId;
  const mine = state.follows[uid] || new Set();
  if (mine.has(targetId)) {
    mine.delete(targetId);
  } else {
    mine.add(targetId);
    pushNotification({ type: "follow", actorId: uid, targetId, text: "started following you" });
  }
  state.follows[uid] = mine;
  renderAll();
}

function createPost({ text, image, video, tags }) {
  const post = {
    id: `p${Date.now()}`,
    authorId: state.currentUserId,
    text, image, video, tags,
    timestamp: Date.now(),
    likes: new Set(),
    comments: [],
  };
  state.posts.unshift(post);

  // notify everyone who follows the current user
  Object.entries(state.follows).forEach(([followerId, set]) => {
    if (set.has(state.currentUserId)) {
      pushNotification({ type: "post", actorId: state.currentUserId, targetId: followerId, postId: post.id, text: "shared a new post" });
    }
  });

  renderAll();
}

function openProfile(userId) {
  state.profileTarget = userId;
  state.view = "profile";
  renderAll();
}

function setView(view) {
  state.view = view;
  if (view === "notifications") {
    state.notifications.forEach((n) => {
      if (n.targetId === state.currentUserId) n.read = true;
    });
  }
  renderAll();
}

/* ---------------- 6. Composer ---------------- */

function openComposer() {
  const avatarEl = document.getElementById("composer-avatar");
  avatarEl.textContent = initials(currentUser().name);
  avatarEl.style.background = avatarColor(currentUser().id);
  document.getElementById("composer-text").value = "";
  document.getElementById("composer-tags").value = "";
  state.pendingImage = null;
  state.pendingVideo = null;
  updateComposerMediaPreviews();
  const overlay = document.getElementById("composer-overlay");
  overlay.hidden = false;
  overlay.style.display = "flex";
  document.getElementById("composer-text").focus();
}

function closeComposer() {
  const overlay = document.getElementById("composer-overlay");
  overlay.hidden = true;
  overlay.style.display = "none";
}

function updateComposerMediaPreviews() {
  const imgPreview = document.getElementById("composer-image-preview");
  const vidPreview = document.getElementById("composer-video-preview");
  if (state.pendingImage) {
    imgPreview.hidden = false;
    document.getElementById("composer-image-tag").src = state.pendingImage;
  } else {
    imgPreview.hidden = true;
  }
  if (state.pendingVideo) {
    vidPreview.hidden = false;
    document.getElementById("composer-video-tag").src = state.pendingVideo;
  } else {
    vidPreview.hidden = true;
  }
  if (window.lucide) lucide.createIcons();
}

function handleComposerSubmit() {
  const text = document.getElementById("composer-text").value.trim();
  const tagsRaw = document.getElementById("composer-tags").value;
  const tags = tagsRaw.split(/[\s,]+/).map((t) => t.replace(/^#/, "").trim()).filter(Boolean);

  if (!text && !state.pendingImage && !state.pendingVideo) return;

  createPost({ text, image: state.pendingImage, video: state.pendingVideo, tags });
  closeComposer();
}

/* ---------------- 7. Event wiring ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  renderAll();

  // top bar
  document.getElementById("user-switcher").addEventListener("change", (e) => {
    state.currentUserId = e.target.value;
    renderAll();
  });
  document.getElementById("open-my-profile").addEventListener("click", () => openProfile(state.currentUserId));
  document.getElementById("search-input").addEventListener("input", (e) => {
    state.search = e.target.value;
    renderView();
  });

  // left nav
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      if (view === "profile-me") openProfile(state.currentUserId);
      else setView(view);
    });
  });

  // composer open/close
  document.getElementById("open-composer").addEventListener("click", openComposer);
  document.getElementById("close-composer").addEventListener("click", closeComposer);
  document.getElementById("composer-overlay").addEventListener("click", (e) => {
    if (e.target.id === "composer-overlay") closeComposer();
  });
  document.getElementById("composer-submit").addEventListener("click", handleComposerSubmit);

  // composer media
  document.getElementById("composer-add-image").addEventListener("click", () => document.getElementById("composer-file-image").click());
  document.getElementById("composer-add-video").addEventListener("click", () => document.getElementById("composer-file-video").click());

  document.getElementById("composer-file-image").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.pendingImage = reader.result;
      state.pendingVideo = null;
      updateComposerMediaPreviews();
    };
    reader.readAsDataURL(file);
  });
  document.getElementById("composer-file-video").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.pendingVideo = reader.result;
      state.pendingImage = null;
      updateComposerMediaPreviews();
    };
    reader.readAsDataURL(file);
  });

  document.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.remove === "image") state.pendingImage = null;
      if (btn.dataset.remove === "video") state.pendingVideo = null;
      updateComposerMediaPreviews();
    });
  });

  // delegated clicks for dynamically rendered content (post cards, panels, notifications)
  document.body.addEventListener("click", (e) => {
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.action;

    if (action === "like") toggleLike(actionEl.dataset.post);
    else if (action === "delete-post") deletePost(actionEl.dataset.post);
    else if (action === "toggle-follow") toggleFollow(actionEl.dataset.user);
    else if (action === "open-profile") openProfile(actionEl.dataset.user);
    else if (action === "toggle-tag") {
      const tag = actionEl.dataset.tag;
      state.activeTag = state.activeTag === tag ? null : tag;
      renderView();
      renderRightColumn();
      if (window.lucide) lucide.createIcons();
    }
    else if (action === "toggle-comments") {
      const panel = document.querySelector(`[data-comments-for="${actionEl.dataset.post}"]`);
      if (panel) panel.hidden = !panel.hidden;
    }
    else if (action === "submit-comment") {
      const postId = actionEl.dataset.post;
      const input = document.querySelector(`[data-comment-input="${postId}"]`);
      submitComment(postId, input.value);
      input.value = "";
    }
  });

  // delegated "Enter to submit" for comment inputs
  document.body.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("[data-comment-input]")) {
      const postId = e.target.dataset.commentInput;
      submitComment(postId, e.target.value);
      e.target.value = "";
    }
  });
});