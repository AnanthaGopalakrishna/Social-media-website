# Pulse

A social app for people who make things — profiles, posts with image/video uploads, tags, likes, comments, follows, notifications, and a trending explore feed. Built with **plain HTML, CSS, and JavaScript** — no frameworks, no build step, no backend.

## Features

- **Profiles** — name, handle, bio, follower/following counts, and a grid of each person's own posts
- **Posts** — text, an uploaded image *or* video (previewed before posting), and freeform tags
- **Likes & comments** — inline, with live counts
- **Follow system** — follow/unfollow from a profile page or the "Suggested to follow" panel
- **Notifications** — triggered when someone likes your post, comments on it, follows you, or someone you follow shares a new post
- **Explore / Trending** — ranks posts by total engagement (likes + comments); tag cloud in the sidebar filters the feed by tag
- **Search** — matches post text, tags, and author name/handle
- **Demo user switcher** — a dropdown in the top bar lets you view the app as any of five seeded users, so you can see likes/follows/notifications happen from different perspectives without building a login system

## Getting started

1. Download all three files into the same folder:
   ```
   pulse/
   ├── index.html
   ├── style.css
   └── script.js
   ```
2. Open `index.html` in any modern browser (double-click it), **or**
3. In VS Code, install the **Live Server** extension, right-click `index.html`, and choose **"Open with Live Server"** (recommended — some browsers restrict file uploads / video previews when opened directly via `file://`).

No installs, no `npm`, no server required.

## Project structure

| File | Responsibility |
|---|---|
| `index.html` | Page structure only — top bar, layout shell, and the (hidden by default) new-post composer. Contains one empty `<div id="view-root">` that JavaScript fills in. |
| `style.css` | All visual styling. Colors and fonts are defined once as CSS variables at the top of the file (`:root`) — change them there to re-theme the whole app. |
| `script.js` | All app logic and data. See breakdown below. |

### Inside `script.js`

1. **Seed data** — five demo users and four starter posts so the app isn't empty on first load
2. **`state`** object — the single source of truth for everything: users, posts, follows, notifications, current view, search text, etc.
3. **Helpers** — small utilities like `timeAgo()`, `avatarColor()`, `escapeHtml()` (guards against post text being interpreted as HTML)
4. **Rendering functions** — turn `state` into HTML strings and inject them into the page; `renderAll()` redraws everything after any change
5. **Actions** — functions like `toggleLike()`, `createPost()`, `toggleFollow()` that mutate `state`, then call `renderAll()`
6. **Composer logic** — handles the new-post modal, including reading uploaded files with `FileReader` and converting them into previewable/storable data URLs
7. **Event wiring** — a single `DOMContentLoaded` block attaches all listeners. Most interactions (likes, comments, follows, tag clicks) are handled through **one delegated listener** on `document.body` that reads `data-action` attributes, so buttons inside posts that don't exist yet at page-load still work once rendered.

## Data persistence

All data lives in memory in the `state` object — **nothing is saved**. Refreshing the page resets everything back to the seed data.

To make it persist across page reloads, you'd save `state` to `localStorage` after every change and load it back on startup. Two things to handle if you do this:
- `Set` objects (used for `likes` and `follows`) aren't JSON-serializable directly — convert them to arrays before saving and back to `Set`s after loading.
- Uploaded images/videos are stored as data URLs (base64 text), which can get large — `localStorage` has a ~5–10MB limit depending on the browser, so a handful of media posts could fill it up.

## Known limitations

- No backend — nothing is shared between browsers or devices; this is a single-browser-tab demo
- No real authentication — the "user switcher" dropdown simulates being logged in as different people
- No image/video compression — large uploads are stored as full-size base64 data URLs

## Possible next steps

- Persist to `localStorage` (see above) or wire up a real backend (Firebase, Supabase, or a small Node/Express + database API)
- Add a dark mode toggle
- Add image galleries (multiple images per post) or threaded comment replies
- Add basic client-side validation/limits on upload file size
