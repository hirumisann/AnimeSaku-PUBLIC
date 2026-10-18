/* ============================================================
ANIME SAKU INI DI BUAT OLEH MUHAMMAD HILMY
MY INSTAGRAM : @hirumisann
INI ADALAH WEBSITE YANG DI KERJAKAN DENGAN CARA ( VIBE CODING )
============================================================ */

(function () {
  "use strict";

  // ==================== KONFIGURASI ====================
  const WORKER_URL = "https://animesaku.studiosaku.deno.net";

  const API = "https://animeinweb.com/api/proxy/3/2/";
  const IMG_XYZ = "https://xyz-api.animein.net";
  const IMG_API = "https://api.animein.net";
  const PLACEHOLDER =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280"><rect fill="#F5F5F5" width="200" height="280"/><text x="100" y="145" fill="#9CA3AF" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="600">No Image</text></svg>',
    );
  const PLACEHOLDER_WIDE =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect fill="#F5F5F5" width="320" height="180"/><text x="160" y="95" fill="#9CA3AF" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="600">No Image</text></svg>',
    );

  const GENRES = {
    14: "Action",
    16: "Adventure",
    25: "Comedy",
    43: "Demons",
    20: "Drama",
    17: "Ecchi",
    13: "Fantasy",
    37: "Game",
    29: "Harem",
    18: "Historical",
    35: "Horror",
    30: "Magic",
    15: "Martial Arts",
    40: "Mecha",
    36: "Military",
    33: "Music",
    21: "Mystery",
    44: "Parody",
    23: "Psychological",
    19: "Romance",
    26: "School",
    31: "Sci-Fi",
    22: "Seinen",
    38: "Shoujo",
    49: "Shoujo Ai",
    32: "Shounen",
    51: "Shounen Ai",
    27: "Slice of Life",
    42: "Sports",
    41: "Super Power",
    24: "Supernatural",
    34: "Thriller",
    128: "Tokusatsu",
  };

  const DAYS = [
    "SENIN",
    "SELASA",
    "RABU",
    "KAMIS",
    "JUMAT",
    "SABTU",
    "MINGGU",
    "RANDOM",
  ];

  // ==================== STATE ====================
  let navStack = ["home"];
  let currentRoute = "home";
  let pageData = {};
  let chatTimer = null;
  let sliderTimer = null;
  let sliderIdx = 0;
  let searchKW = "";
  let searchPg = 0;
  let catGenres = [];
  let catPg = 0;
  let cmtEpId = null;
  let cmtSort = "top";
  let cmtPg = 0;
  let episodePg = 0;
  let schedDay = "";
  let drawerOpen = false;
  let isOffline = !navigator.onLine;

  // ===== DOWNLOAD STATE =====
  let dlActive = false;
  let dlProgress = { current: "", index: 0, total: 0, pct: 0 };
  let downloadedEps = {};
  let activeBlobUrls = [];

  // ==================== DOM ====================
  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => (p || document).querySelectorAll(s);
  const main = $("#appMain");

  // ==================== INDEXED DB ====================
  const DB_NAME = "AnimeSakuDB";
  const DB_VER = 2;
  let idb = null;

  function openDB() {
    return new Promise(function (resolve, reject) {
      if (idb) return resolve(idb);
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function (e) {
        const d = e.target.result;
        if (!d.objectStoreNames.contains("downloads"))
          d.createObjectStore("downloads", { keyPath: "id" });
        if (!d.objectStoreNames.contains("anime_meta"))
          d.createObjectStore("anime_meta", { keyPath: "id" });
      };
      req.onsuccess = function (e) {
        idb = e.target.result;
        resolve(idb);
      };
      req.onerror = function (e) {
        reject(e.target.error);
      };
    });
  }

  function dbPut(store, data) {
    return openDB().then(function (d) {
      return new Promise(function (res, rej) {
        const tx = d.transaction(store, "readwrite");
        tx.objectStore(store).put(data);
        tx.oncomplete = res;
        tx.onerror = function (e) {
          rej(e.target.error);
        };
      });
    });
  }

  function dbGet(store, key) {
    return openDB().then(function (d) {
      return new Promise(function (res, rej) {
        const tx = d.transaction(store, "readonly");
        const r = tx.objectStore(store).get(key);
        r.onsuccess = function () {
          res(r.result);
        };
        r.onerror = function (e) {
          rej(e.target.error);
        };
      });
    });
  }

  function dbGetAll(store) {
    return openDB().then(function (d) {
      return new Promise(function (res, rej) {
        const tx = d.transaction(store, "readonly");
        const r = tx.objectStore(store).getAll();
        r.onsuccess = function () {
          res(r.result || []);
        };
        r.onerror = function (e) {
          rej(e.target.error);
        };
      });
    });
  }

  function dbDelete(store, key) {
    return openDB().then(function (d) {
      return new Promise(function (res, rej) {
        const tx = d.transaction(store, "readwrite");
        const r = tx.objectStore(store).delete(key);
        r.onsuccess = res;
        r.onerror = function (e) {
          rej(e.target.error);
        };
      });
    });
  }

  function dbClear(store) {
    return openDB().then(function (d) {
      return new Promise(function (res, rej) {
        const tx = d.transaction(store, "readwrite");
        tx.objectStore(store).clear();
        tx.oncomplete = res;
        tx.onerror = function (e) {
          rej(e.target.error);
        };
      });
    });
  }

  async function loadDownloadedEps() {
    try {
      const all = await dbGetAll("downloads");
      downloadedEps = {};
      all.forEach(function (d) {
        downloadedEps[d.epId] = d.quality;
      });
    } catch (e) {
      downloadedEps = {};
    }
  }

  function isEpDownloaded(epId) {
    return !!downloadedEps[epId];
  }
  function getEpDlQuality(epId) {
    return downloadedEps[epId] || null;
  }

  // ==================== UTILITAS ====================
  function apiUrl(path) {
    return WORKER_URL + "/api?path=" + encodeURIComponent(path);
  }

  // FIX: Cegah Double Encoding URL (misal %20 jadi %2520) yang menyebabkan 429/404
  function mediaProxyUrl(directUrl) {
    if (!directUrl) return "";
    if (directUrl.startsWith("http://"))
      directUrl = directUrl.replace("http://", "https://");

    try {
      directUrl = decodeURIComponent(directUrl);
    } catch (e) {}

    return WORKER_URL + "/media?url=" + encodeURIComponent(directUrl);
  }

  function fixImg(url) {
    if (!url) return PLACEHOLDER;
    if (url.startsWith("http://")) url = url.replace("http://", "https://");
    if (url.startsWith("/assets_xyz")) return mediaProxyUrl(IMG_XYZ + url);
    if (url.startsWith("/assets")) return mediaProxyUrl(IMG_API + url);
    if (url.startsWith("https://")) {
      if (url.includes("animein.net") || url.includes("animeinweb.com")) {
        return mediaProxyUrl(url);
      }
      return url;
    }
    return PLACEHOLDER;
  }

  function fixImgWide(url) {
    if (!url) return PLACEHOLDER_WIDE;
    if (url.startsWith("http://")) url = url.replace("http://", "https://");
    if (url.startsWith("/assets_xyz")) return mediaProxyUrl(IMG_XYZ + url);
    if (url.startsWith("/assets")) return mediaProxyUrl(IMG_API + url);
    if (url.startsWith("https://")) {
      if (url.includes("animein.net") || url.includes("animeinweb.com")) {
        return mediaProxyUrl(url);
      }
      return url;
    }
    return PLACEHOLDER_WIDE;
  }

  function videoProxyUrl(directUrl) {
    if (!directUrl) return "";
    if (directUrl.startsWith("http://"))
      directUrl = directUrl.replace("http://", "https://");
    if (directUrl.startsWith("https://")) return mediaProxyUrl(directUrl);
    if (directUrl.startsWith("/")) return mediaProxyUrl(IMG_XYZ + directUrl);
    return directUrl;
  }

  function esc(s) {
    if (!s) return "";
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function fmtNum(n) {
    n = parseInt(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return String(n);
  }

  function fmtSize(bytes) {
    if (!bytes || bytes <= 0) return "0 B";
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + " GB";
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
    return bytes + " B";
  }

  function statusCls(s) {
    if (!s) return "";
    s = s.toUpperCase();
    if (s === "ONGOING") return "status-ongoing";
    if (s === "WAITING") return "status-waiting";
    return "status-finished";
  }

  async function fetchApi(url) {
    if (isOffline) throw new Error("Anda sedang offline.");
    const r = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json, text/plain, */*" },
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 11) return "Selamat Pagi";
    if (h < 15) return "Selamat Siang";
    if (h < 18) return "Selamat Sore";
    return "Selamat Malam";
  }

  function getTodayDay() {
    const d = new Date().getDay();
    return DAYS[d === 0 ? 6 : d - 1];
  }

  // ==================== THEME ====================
  function loadTheme() {
    var saved = localStorage.getItem("animesaku_theme") || "light";
    applyTheme(saved, false);
  }

  function applyTheme(theme, save) {
    document.documentElement.setAttribute("data-theme", theme);
    if (save !== false) {
      localStorage.setItem("animesaku_theme", theme);
    }
    var sw = $("#themeSwitch");
    if (sw) sw.checked = theme === "dark";
  }

  function toggleTheme() {
    var current =
      document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(current === "dark" ? "light" : "dark");
  }

  // ==================== HTML HELPERS ====================
  function loadingHTML() {
    return '<div class="loading-screen"><div class="candy-loader"><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div></div></div>';
  }

  function errorHTML(msg, retryId) {
    return (
      '<div class="error-box"><h3>Oops!</h3><p>' +
      esc(msg) +
      '</p><button class="btn"' +
      (retryId ? ' id="' + retryId + '"' : "") +
      '><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> Coba Lagi</button></div>'
    );
  }

  function emptyHTML(emoji, title, desc) {
    return (
      '<div class="empty-state"><span class="emoji">' +
      emoji +
      "</span><h3>" +
      esc(title) +
      "</h3><p>" +
      esc(desc || "") +
      "</p></div>"
    );
  }

  function animeCardHTML(a) {
    var html = '<div class="anime-card" data-id="' + a.id + '">';
    html += '<div class="card-img-wrap">';
    html +=
      '<img src="' +
      fixImg(a.image_poster) +
      '" alt="' +
      esc(a.title) +
      '" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=\'' +
      PLACEHOLDER +
      "'\">";
    if (a.type) html += '<span class="card-badge">' + esc(a.type) + "</span>";
    if (a.status)
      html +=
        '<span class="card-badge ' +
        statusCls(a.status) +
        '" style="top:auto;bottom:8px;left:8px">' +
        esc(a.status) +
        "</span>";
    html += "</div>";
    html += '<div class="card-info">';
    html += '<div class="card-title">' + esc(a.title) + "</div>";
    html += '<div class="card-meta"><span>' + fmtNum(a.views) + " views</span>";
    if (a.year && a.year !== "UNKNOWN")
      html += '<span class="dot"></span><span>' + esc(a.year) + "</span>";
    html += "</div></div></div>";
    return html;
  }

  // ===== DOWNLOAD SVG ICONS =====
  const DL_SVG =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
  const CHECK_SVG =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  const PLAY_SVG =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
  const TRASH_SVG =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';

  // ====================================================================
  //  MODAL SYSTEM
  // ====================================================================
  function openModal(title, bodyHtml) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = bodyHtml;
    $("#modalOverlay").classList.add("show");
  }

  function closeModal() {
    $("#modalOverlay").classList.remove("show");
  }

  // ====================================================================
  //  DOWNLOAD ENGINE
  // ====================================================================
  async function fetchAllEpisodes(movieId, maxIndex) {
    const allEps = [];
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      const json = await fetchApi(
        apiUrl("movie/episode/" + movieId + "?page=" + page),
      );
      const eps = (json && json.data && json.data.episode) || [];
      if (!eps.length) break;
      allEps.push.apply(allEps, eps);
      let maxFound = 0;
      eps.forEach(function (ep) {
        const idx = parseInt(ep.index) || 0;
        if (idx > maxFound) maxFound = idx;
      });
      if (maxFound >= maxIndex || eps.length < 15) hasMore = false;
      else page++;
    }
    allEps.sort(function (a, b) {
      return (parseInt(a.index) || 0) - (parseInt(b.index) || 0);
    });
    return allEps;
  }

  async function fetchStreamLinks(epId) {
    const json = await fetchApi(apiUrl("episode/streamnew/" + epId));
    if (!json || !json.data) throw new Error("Tidak ada data stream");
    return json.data;
  }

  function findServerByQuality(servers, quality) {
    if (!servers || !servers.length) return null;
    for (let i = 0; i < servers.length; i++) {
      if (
        servers[i].quality === quality &&
        servers[i].type === "direct" &&
        servers[i].link
      )
        return servers[i];
    }
    return null;
  }

  function updateDlProgress(current, pct) {
    dlProgress.current = current;
    dlProgress.pct = pct;
    const text = $("#dlFloatingText");
    const count = $("#dlFloatingCount");
    const fill = $("#dlFloatingFill");
    if (text) text.textContent = current;
    if (count) count.textContent = dlProgress.index + "/" + dlProgress.total;
    if (fill) fill.style.width = (pct >= 0 ? pct : 0) + "%";
  }

  function showFloatingBar(current, idx, total) {
    dlProgress.index = idx;
    dlProgress.total = total;
    dlProgress.current = current || "";
    dlProgress.pct = 0;
    const bar = $("#dlFloatingBar");
    if (bar) bar.classList.add("show");
    updateDlProgress(current, 0);
  }

  function hideFloatingBar() {
    dlActive = false;
    const bar = $("#dlFloatingBar");
    if (bar) bar.classList.remove("show");
  }

  async function downloadAndStore(item) {
    const url = videoProxyUrl(item.videoUrl);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const contentLength = parseInt(resp.headers.get("Content-Length") || "0");
    const reader = resp.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      chunks.push(result.value);
      received += result.value.length;
      const pct =
        contentLength > 0 ? Math.round((received / contentLength) * 100) : -1;
      updateDlProgress(item.epTitle, pct);
    }
    const blob = new Blob(chunks, { type: "video/mp4" });
    const record = {
      id: item.epId + "_" + item.quality,
      epId: item.epId,
      movieId: item.movieId,
      title: item.title,
      epTitle: item.epTitle,
      epIndex: item.epIndex,
      quality: item.quality,
      size: blob.size,
      blob: blob,
      timestamp: Date.now(),
    };
    await dbPut("downloads", record);
    downloadedEps[item.epId] = item.quality;
    return record;
  }

  async function processQueue(items, idx) {
    if (idx >= items.length) {
      hideFloatingBar();
      if (currentRoute === "downloads") renderDownloads();
      return;
    }
    dlActive = true;
    const item = items[idx];
    showFloatingBar(item.epTitle, idx + 1, items.length);
    try {
      await downloadAndStore(item);
    } catch (e) {
      console.error("Download gagal:", item.epTitle, e);
    }
    await processQueue(items, idx + 1);
  }

  function showBatchModal(movieId, title) {
    let h =
      '<p class="batch-desc">Masukkan rentang episode yang ingin di-download</p>';
    h += '<div class="batch-range">';
    h +=
      '<div class="batch-input-group"><label>Dari</label><input type="number" id="batchFrom" min="1" max="999" value="1"></div>';
    h += '<span class="batch-separator">sampai</span>';
    h +=
      '<div class="batch-input-group"><label>Sampai</label><input type="number" id="batchTo" min="1" max="999" value="13"></div>';
    h += "</div>";
    h += '<p class="batch-warning">Maksimal 13 episode per batch</p>';
    h +=
      '<button class="btn batch-next-btn" id="batchNextBtn">Lanjut Pilih Kualitas</button>';
    openModal("Download Batch", h);
    $("#batchNextBtn").addEventListener("click", function () {
      let from = parseInt($("#batchFrom").value) || 1;
      let to = parseInt($("#batchTo").value) || 13;
      if (from < 1) from = 1;
      if (to > from + 12) to = from + 12;
      if (to < from) {
        const tmp = from;
        from = to;
        to = tmp;
      }
      showQualityModal("batch", movieId, title, null, null, from, to);
    });
  }

  function showQualityModal(mode, movieId, title, epId, epTitle, fromEp, toEp) {
    const qualities = ["360p", "480p", "720p", "1080p"];
    let h = '<p class="quality-desc">Pilih kualitas video</p>';
    h += '<div class="quality-grid">';
    qualities.forEach(function (q) {
      h += '<button class="quality-opt" data-q="' + q + '">' + q + "</button>";
    });
    h += "</div>";
    h +=
      '<button class="btn quality-start-btn" id="qualityStartBtn" disabled>Mulai Download</button>';
    openModal(mode === "batch" ? "Pilih Kualitas Batch" : "Pilih Kualitas", h);
    let selected = null;
    $$(".quality-opt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$(".quality-opt").forEach(function (b) {
          b.classList.remove("selected");
        });
        btn.classList.add("selected");
        selected = btn.dataset.q;
        $("#qualityStartBtn").disabled = false;
      });
    });
    $("#qualityStartBtn").addEventListener("click", function () {
      if (!selected) return;
      closeModal();
      if (mode === "batch") {
        startBatchDownload(movieId, title, fromEp, toEp, selected);
      } else {
        startSingleDownload(epId, movieId, title, epTitle, selected);
      }
    });
  }

  async function startBatchDownload(movieId, title, fromEp, toEp, quality) {
    if (dlActive) {
      alert("Download sedang berjalan, tunggu sampai selesai.");
      return;
    }
    main.innerHTML = loadingHTML();
    try {
      const allEps = await fetchAllEpisodes(movieId, toEp);
      const filtered = allEps.filter(function (ep) {
        const idx = parseInt(ep.index) || 0;
        return idx >= fromEp && idx <= toEp;
      });
      if (!filtered.length) {
        main.innerHTML = emptyHTML(
          "😕",
          "Tidak Ditemukan",
          "Tidak ada episode dalam rentang tersebut",
        );
        return;
      }
      await dbPut("anime_meta", {
        id: movieId,
        title: title,
        image_poster:
          pageData.detail && pageData.detail.posterUrl
            ? pageData.detail.posterUrl
            : "",
      });
      const items = [];
      for (let i = 0; i < filtered.length; i++) {
        const ep = filtered[i];
        if (downloadedEps[ep.id] === quality) continue;
        try {
          const streamData = await fetchStreamLinks(ep.id);
          const servers = streamData.server || [];
          const server = findServerByQuality(servers, quality);
          if (!server) {
            console.warn(
              "Quality " + quality + " tidak tersedia untuk " + ep.title,
            );
            continue;
          }
          items.push({
            epId: ep.id,
            movieId: movieId,
            title: title,
            epTitle: ep.title,
            epIndex: ep.index,
            quality: quality,
            videoUrl: server.link,
          });
        } catch (e) {
          console.warn("Gagal ambil link untuk " + ep.title, e);
        }
      }
      if (!items.length) {
        main.innerHTML = emptyHTML(
          "✅",
          "Semua Sudah Didownload",
          "Episode dalam rentang ini sudah didownload",
        );
        return;
      }
      showFloatingBar(items[0].epTitle, 1, items.length);
      await processQueue(items, 0);
      if (currentRoute === "detail") renderDetail();
      else if (currentRoute === "episodes") renderEpisodes();
    } catch (e) {
      console.error("Batch download error:", e);
      if (currentRoute === "detail") renderDetail();
    }
  }

  async function startSingleDownload(epId, movieId, title, epTitle, quality) {
    if (dlActive) {
      alert("Download sedang berjalan, tunggu sampai selesai.");
      return;
    }
    try {
      const streamData = await fetchStreamLinks(epId);
      const server = findServerByQuality(streamData.server || [], quality);
      if (!server) {
        alert("Kualitas " + quality + " tidak tersedia untuk episode ini.");
        return;
      }
      await dbPut("anime_meta", {
        id: movieId,
        title: title,
        image_poster:
          pageData.detail && pageData.detail.posterUrl
            ? pageData.detail.posterUrl
            : "",
      });
      const item = {
        epId: epId,
        movieId: movieId,
        title: title,
        epTitle: epTitle,
        epIndex:
          streamData.episode && streamData.episode.index
            ? streamData.episode.index
            : "",
        quality: quality,
        videoUrl: server.link,
      };
      showFloatingBar(epTitle, 1, 1);
      await processQueue([item], 0);
      if (currentRoute === "episodes") {
        episodePg = 0;
        renderEpisodes();
      } else if (currentRoute === "stream") renderStream();
    } catch (e) {
      console.error("Single download error:", e);
      alert("Download gagal: " + e.message);
    }
  }

  function showSingleDlModal(epId, movieId, title, epTitle) {
    showQualityModal("single", movieId, title, epId, epTitle, null, null);
  }

  // ====================================================================
  //  ROUTER
  // ====================================================================
  function navigate(route, data) {
    if (
      isOffline &&
      route !== "offline-mode" &&
      route !== "offline-play" &&
      route !== "download-detail" &&
      route !== "downloads" &&
      route !== "settings"
    ) {
      return;
    }
    clearTimers();
    navStack.push(route);
    currentRoute = route;
    if (data) pageData[route] = data;
    history.pushState({ route: route }, "");
    render(route);
    updateUI();
    main.scrollTop = 0;
  }

  function goBack() {
    if (navStack.length <= 1) return;
    clearTimers();
    navStack.pop();
    currentRoute = navStack[navStack.length - 1];
    render(currentRoute);
    updateUI();
  }

  function switchTab(route) {
    if (
      isOffline &&
      route !== "offline-mode" &&
      route !== "download-detail" &&
      route !== "downloads" &&
      route !== "settings"
    ) {
      return;
    }
    clearTimers();
    navStack = [route];
    currentRoute = route;
    history.pushState({ route: route }, "");
    render(route);
    updateUI();
    main.scrollTop = 0;
  }

  function clearTimers() {
    if (chatTimer) {
      clearInterval(chatTimer);
      chatTimer = null;
    }
    if (sliderTimer) {
      clearInterval(sliderTimer);
      sliderTimer = null;
    }
    revokeBlobUrls();
  }

  function revokeBlobUrls() {
    activeBlobUrls.forEach(function (u) {
      try {
        URL.revokeObjectURL(u);
      } catch (e) {}
    });
    activeBlobUrls = [];
  }

  function updateUI() {
    var isTop = navStack.length <= 1;
    $("#backBtn").classList.toggle("show", !isTop);
    var topRoute = navStack[0];
    $$(".nav-item").forEach(function (n) {
      n.classList.toggle("active", n.dataset.route === topRoute);
    });
    updateNavAvatar();
  }

  function updateNavAvatar() {
    var avatar = localStorage.getItem("animesaku_avatar");
    var settingsNav = $('.nav-item[data-route="settings"]');
    if (!settingsNav) return;
    var existingImg = settingsNav.querySelector("img.nav-avatar");
    if (avatar) {
      if (!existingImg) {
        var svg = settingsNav.querySelector("svg");
        if (svg) svg.style.display = "none";
        var img = document.createElement("img");
        img.className = "nav-avatar";
        img.src = avatar;
        img.style.cssText =
          "width:24px;height:24px;border-radius:50%;object-fit:cover;border:2px solid var(--primary)";
        settingsNav.insertBefore(img, settingsNav.firstChild);
      } else {
        existingImg.src = avatar;
      }
    } else {
      if (existingImg) existingImg.remove();
      var svg2 = settingsNav.querySelector("svg");
      if (svg2) svg2.style.display = "";
    }
  }

  function render(route) {
    switch (route) {
      case "home":
        renderHome();
        break;
      case "detail":
        renderDetail();
        break;
      case "episodes":
        episodePg = 0;
        renderEpisodes();
        break;
      case "stream":
        renderStream();
        break;
      case "search":
        renderSearch();
        break;
      case "schedule":
        renderSchedule();
        break;
      case "chat":
        renderChat();
        break;
      case "category":
        renderCategory();
        break;
      case "settings":
        renderSettings();
        break;
      case "downloads":
        renderDownloads();
        break;
      case "download-detail":
        renderDownloadDetail();
        break;
      case "offline-play":
        renderOfflinePlay();
        break;
      case "offline-mode":
        renderOfflineMode();
        break;
      default:
        renderHome();
    }
  }

  function hideSplash() {
    var splash = $("#splashScreen");
    if (!splash) return;
    splash.classList.add("hidden");
    setTimeout(function () {
      if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
    }, 600);
  }

  // ==================== HOME ====================
  async function renderHome() {
    main.innerHTML = loadingHTML();
    try {
      // Ambil data sesuai hari ini dan limit 16
      var url = WORKER_URL + "/home?day=" + getTodayDay() + "&limit=16";
      var json = await fetchApi(url);
      if (!json || !json.data) throw new Error("Data kosong");

      // Penyesuaian struktur JSON dari proxy worker
      var d = json.data.data || json.data;
      var html = "";

      html += '<div class="home-greet fade-in">';
      html += "<h1>" + getGreeting() + ", <span>AnimeSaku</span></h1>";
      html += "<p>Streaming anime terbaru dan terlengkap</p>";
      html += "</div>";

      // Slider menggunakan gambar lokal
      var sliderImages = [
        { image: "./Slide 1.jpg", link: "", type: "IMAGE" },
        { image: "./Slide 2.jpg", link: "", type: "IMAGE" },
        { image: "./Slide 3.jpg", link: "", type: "IMAGE" },
        { image: "./Slide 4.jpg", link: "", type: "IMAGE" },
      ];

      if (sliderImages && sliderImages.length) {
        html += '<div class="slider-wrap fade-in" id="homeSlider">';
        html += '<div class="slider" id="sliderTrack">';
        sliderImages.forEach(function (s) {
          var inner = '<img src="' + s.image + '" alt="slider" loading="lazy">';
          if (s.type === "WEB" && s.link) {
            html +=
              '<div class="slide"><a href="' +
              esc(s.link) +
              '" target="_blank" rel="noopener">' +
              inner +
              "</a></div>";
          } else {
            html += '<div class="slide">' + inner + "</div>";
          }
        });
        html += "</div>";
        html += '<div class="slider-dots" id="sliderDots">';
        sliderImages.forEach(function (_, i) {
          html +=
            '<span class="' +
            (i === 0 ? "active" : "") +
            '" data-i="' +
            i +
            '"></span>';
        });
        html += "</div></div>";
      }

      if (d.trailer && d.trailer.length) {
        html += '<div class="section fade-in">';
        html +=
          '<div class="section-header"><h2 class="section-title">Trailer <span class="section-emoji">🎬</span></h2></div>';
        html += '<div class="hscroll">';
        d.trailer.forEach(function (t) {
          html +=
            '<div class="trailer-card" data-yt="' + esc(t.url_youtube) + '">';
          html += '<div class="trailer-thumb">';
          html +=
            '<img src="' +
            fixImg(t.image_poster) +
            '" alt="' +
            esc(t.title) +
            '" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=\'' +
            PLACEHOLDER_WIDE +
            "'\">";
          html +=
            '<div class="trailer-play"><div class="trailer-play-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div></div>';
          html += "</div>";
          html +=
            '<div class="trailer-info"><div class="trailer-title">' +
            esc(t.title) +
            "</div></div>";
          html += "</div>";
        });
        html += "</div></div>";
      }

      function hSection(emoji, title, items) {
        if (!items || !items.length) return "";
        var h = '<div class="section fade-in">';
        h +=
          '<div class="section-header"><h2 class="section-title">' +
          title +
          ' <span class="section-emoji">' +
          emoji +
          "</span></h2></div>";
        h += '<div class="hscroll">';
        items.forEach(function (a) {
          h += animeCardHTML(a);
        });
        h += "</div></div>";
        return h;
      }

      html += hSection("🔥", "Sedang Populer", d.popular);
      html += hSection("⚡", "Sedang Hot", d.hot);
      html += hSection("✨", "Terbaru", d.new);
      html += hSection("📅", "Rilis Hari Ini", d.today);
      html += hSection("⏳", "Menunggu Rilis", d.waiting);

      if (d.random && d.random.length) {
        html += '<div class="section fade-in">';
        html +=
          '<div class="section-header"><h2 class="section-title">Rekomendasi <span class="section-emoji">🎲</span></h2></div>';
        html += '<div class="hscroll">';
        d.random.forEach(function (a) {
          html += animeCardHTML(a);
        });
        html += "</div></div>";
      }

      main.innerHTML = html;
      bindHomeEvents();
      initSlider();
      hideSplash();
    } catch (e) {
      console.error("Home error:", e);
      main.innerHTML = errorHTML(
        "Gagal memuat beranda. Periksa koneksi internetmu.",
        "retryHome",
      );
      $("#retryHome").addEventListener("click", renderHome);
      hideSplash();
    }
  }

  function bindHomeEvents() {
    main.querySelectorAll(".anime-card[data-id]").forEach(function (card) {
      card.addEventListener("click", function () {
        navigate("detail", { id: card.dataset.id });
      });
    });
    main.querySelectorAll(".trailer-card[data-yt]").forEach(function (card) {
      card.addEventListener("click", function () {
        window.open(card.dataset.yt, "_blank");
      });
    });

    // TAMBAHAN: Scroll horizontal menggunakan mouse wheel (untuk Laptop/PC)
    main.querySelectorAll(".hscroll").forEach(function (track) {
      track.addEventListener("wheel", function (e) {
        // Jika scroll vertikal (deltaY), ubah jadi scroll horizontal (scrollLeft)
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          track.scrollLeft += e.deltaY;
        }
      });
    });
  }

  function initSlider() {
    var wrap = $("#homeSlider");
    if (!wrap) return;
    var track = $("#sliderTrack");
    var dots = $$("#sliderDots span");
    var total = dots.length;
    if (total <= 1) return;
    sliderIdx = 0;
    function goTo(i) {
      sliderIdx = i;
      track.scrollTo({ left: wrap.offsetWidth * i, behavior: "smooth" });
      dots.forEach(function (d, j) {
        d.classList.toggle("active", j === i);
      });
    }
    dots.forEach(function (d) {
      d.addEventListener("click", function () {
        goTo(parseInt(d.dataset.i));
      });
    });
    sliderTimer = setInterval(function () {
      goTo((sliderIdx + 1) % total);
    }, 4000);
  }

  // ==================== DETAIL ====================
  async function renderDetail() {
    var data = pageData.detail;
    if (!data || !data.id) {
      main.innerHTML = errorHTML("Data tidak valid");
      return;
    }
    main.innerHTML = loadingHTML();
    try {
      var json = await fetchApi(apiUrl("movie/detail/" + data.id));
      if (!json || !json.data) throw new Error("Data kosong");
      var m = json.data.movie;
      var ep = json.data.episode;
      data.posterUrl = m.image_poster;

      var html = '<div class="fade-in"><div class="detail-hero">';
      html +=
        '<div class="detail-hero-bg" style="background-image:url(\'' +
        fixImg(m.image_cover) +
        "')\"></div>";
      html += '<div class="detail-hero-overlay"></div>';
      html += '<div class="detail-hero-content">';
      html +=
        '<div class="detail-poster"><img src="' +
        fixImg(m.image_poster) +
        '" alt="' +
        esc(m.title) +
        '" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=\'' +
        PLACEHOLDER +
        "'\"></div>";
      html += '<div class="detail-title-wrap">';
      html += '<div class="detail-title">' + esc(m.title) + "</div>";
      if (m.synonyms)
        html += '<div class="detail-synonyms">' + esc(m.synonyms) + "</div>";
      html += '<div class="detail-stats">';
      if (m.type) html += '<span class="stat-pill">' + esc(m.type) + "</span>";
      if (m.year && m.year !== "UNKNOWN")
        html += '<span class="stat-pill">' + esc(m.year) + "</span>";
      if (m.status)
        html += '<span class="stat-pill">' + esc(m.status) + "</span>";
      if (m.day && m.day !== "RANDOM")
        html += '<span class="stat-pill">' + esc(m.day) + "</span>";
      if (m.studio)
        html += '<span class="stat-pill">' + esc(m.studio) + "</span>";
      html += "</div></div></div></div>";

      html += '<div class="detail-body">';
      html += '<div class="detail-section-title">Sinopsis</div>';
      html += '<div class="detail-synopsis">' + esc(m.synopsis) + "</div>";
      html += '<div class="info-grid">';
      html +=
        '<div class="info-item"><div class="info-label">Tipe</div><div class="info-value">' +
        esc(m.type || "-") +
        "</div></div>";
      html +=
        '<div class="info-item"><div class="info-label">Status</div><div class="info-value">' +
        esc(m.status || "-") +
        "</div></div>";
      if (m.studio)
        html +=
          '<div class="info-item"><div class="info-label">Studio</div><div class="info-value">' +
          esc(m.studio) +
          "</div></div>";
      html +=
        '<div class="info-item"><div class="info-label">Tayang</div><div class="info-value">' +
        esc(m.aired_start || "-") +
        "</div></div>";
      html +=
        '<div class="info-item"><div class="info-label">Views</div><div class="info-value">' +
        fmtNum(m.views) +
        "</div></div>";
      html +=
        '<div class="info-item"><div class="info-label">Favorite</div><div class="info-value">' +
        fmtNum(m.favorites) +
        "</div></div>";
      html += "</div>";
      if (m.genre) {
        html += '<div class="genre-chips">';
        m.genre.split(",").forEach(function (g) {
          html += '<span class="genre-chip">' + esc(g.trim()) + "</span>";
        });
        html += "</div>";
      }
      html += "</div>";

      if (ep) {
        html += '<div class="detail-body">';
        html += '<div class="detail-section-title">Episode Terbaru</div>';
        html += '<div class="next-ep-card" id="latestEpBtn">';
        html +=
          '<div class="next-ep-thumb"><img src="' +
          fixImgWide(ep.image) +
          '" alt="' +
          esc(ep.title) +
          '" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=\'' +
          PLACEHOLDER_WIDE +
          "'\"></div>";
        html += '<div class="next-ep-info">';
        html +=
          '<div class="next-ep-label">Tayang ' + esc(ep.key_time) + "</div>";
        html += '<div class="next-ep-title">' + esc(ep.title) + "</div>";
        html += "</div></div></div>";
      }

      html += '<div class="action-row">';
      html +=
        '<button class="btn" id="btnAllEp"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg> Semua Episode</button>';
      html +=
        '<button class="btn btn-dl-batch" id="btnBatchDl">' +
        DL_SVG +
        " Download Batch</button>";
      html += "</div></div>";

      main.innerHTML = html;
      bindDetailEvents(m, ep);
    } catch (e) {
      console.error("Detail error:", e);
      main.innerHTML = errorHTML("Gagal memuat detail anime.", "retryDetail");
      var rb = $("#retryDetail");
      if (rb) rb.addEventListener("click", renderDetail);
    }
  }

  function bindDetailEvents(m, ep) {
    var allBtn = $("#btnAllEp");
    if (allBtn)
      allBtn.addEventListener("click", function () {
        navigate("episodes", { id: m.id, title: m.title });
      });
    var batchBtn = $("#btnBatchDl");
    if (batchBtn)
      batchBtn.addEventListener("click", function () {
        showBatchModal(m.id, m.title);
      });
    var latBtn = $("#latestEpBtn");
    if (latBtn && ep)
      latBtn.addEventListener("click", function () {
        navigate("stream", {
          epId: ep.id,
          movieId: m.id,
          title: m.title,
          epTitle: ep.title,
        });
      });
  }

  // ==================== EPISODES ====================
  function buildEpisodeCardHTML(ep, movieId, movieTitle) {
    var epIndex = parseInt(ep.index) || 0;
    var dlQ = getEpDlQuality(ep.id);
    var isDl = !!dlQ;

    var h =
      '<div class="episode-card" data-ep-id="' +
      ep.id +
      '" data-movie-id="' +
      movieId +
      '" data-title="' +
      esc(movieTitle) +
      '" data-ep-title="' +
      esc(ep.title) +
      '">';
    h += '<div class="ep-thumb">';
    h +=
      '<img src="' +
      fixImgWide(ep.image) +
      '" alt="' +
      esc(ep.title) +
      '" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=\'' +
      PLACEHOLDER_WIDE +
      "'\">";
    h +=
      '<div class="ep-play-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div>';
    if (ep.is_new === "1") h += '<span class="ep-new">BARU</span>';
    h += "</div>";
    h += '<div class="ep-info">';
    h += '<div class="ep-number">Ep ' + epIndex + "</div>";
    h += '<div class="ep-title">' + esc(ep.title) + "</div>";
    h += '<div class="ep-meta">';
    h += '<span class="ep-meta-views">' + fmtNum(ep.views) + " views</span>";
    h += '<span class="ep-meta-sep">&middot;</span>';
    h += '<span class="ep-meta-time">' + esc(ep.key_time) + "</span>";
    if (isDl) {
      h += '<span class="ep-meta-sep">&middot;</span>';
      h += '<span class="ep-meta-quality">' + esc(dlQ) + "</span>";
    }
    h += "</div></div>";
    h +=
      '<button class="ep-dl-btn' +
      (isDl ? " downloaded" : "") +
      '" data-dl-ep-id="' +
      ep.id +
      '" data-dl-movie-id="' +
      movieId +
      '" data-dl-title="' +
      esc(movieTitle) +
      '" data-dl-ep-title="' +
      esc(ep.title) +
      '">';
    h += isDl ? CHECK_SVG : DL_SVG;
    h += "</button>";
    h += "</div>";
    return h;
  }

  async function renderEpisodes(append) {
    var data = pageData.episodes;
    if (!data || !data.id) {
      main.innerHTML = errorHTML("Data tidak valid");
      return;
    }
    if (episodePg === 0) main.innerHTML = loadingHTML();
    try {
      var json = await fetchApi(
        apiUrl("movie/episode/" + data.id + "?page=" + episodePg),
      );
      if (!json || !json.data) throw new Error("Data kosong");
      var eps = json.data.episode || [];

      if (episodePg === 0 && !eps.length) {
        main.innerHTML =
          '<div class="fade-in">' +
          emptyHTML("📺", "Belum Ada Episode", "Episode belum tersedia") +
          "</div>";
        return;
      }

      var html = "";
      if (episodePg === 0) {
        html += '<div class="fade-in">';
        html +=
          '<div class="ep-list-header"><div class="ep-list-title">Daftar Episode</div></div>';
        html += '<div class="episode-list" id="epList">';
      }

      eps.forEach(function (ep) {
        html += buildEpisodeCardHTML(ep, data.id, data.title);
      });

      if (episodePg === 0) {
        html += "</div></div>";
        main.innerHTML = html;
      } else {
        var list = $("#epList");
        if (list) list.insertAdjacentHTML("beforeend", html);
      }

      bindEpisodeCardEvents();

      var old = $("#loadMoreEpisodes");
      if (old) old.remove();
      if (eps.length >= 15) {
        var btn = document.createElement("button");
        btn.className = "btn btn-outline ep-load-more";
        btn.id = "loadMoreEpisodes";
        btn.textContent = "Muat Lebih Banyak";
        btn.addEventListener("click", function () {
          episodePg++;
          renderEpisodes(true);
        });
        var container = $(".fade-in");
        if (container) container.appendChild(btn);
        else main.appendChild(btn);
      }
    } catch (e) {
      console.error("Episodes error:", e);
      if (episodePg === 0) {
        main.innerHTML = errorHTML("Gagal memuat daftar episode.", "retryEp");
        var rb = $("#retryEp");
        if (rb)
          rb.addEventListener("click", function () {
            renderEpisodes();
          });
      }
    }
  }

  function bindEpisodeCardEvents() {
    main.querySelectorAll(".episode-card[data-ep-id]").forEach(function (card) {
      if (card.dataset.bound) return;
      card.dataset.bound = "1";
      card.addEventListener("click", function (e) {
        if (e.target.closest(".ep-dl-btn")) return;
        navigate("stream", {
          epId: card.dataset.epId,
          movieId: card.dataset.movieId,
          title: card.dataset.title,
          epTitle: card.dataset.epTitle,
        });
      });
    });

    main.querySelectorAll(".ep-dl-btn[data-dl-ep-id]").forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var epId = btn.dataset.dlEpId;
        if (isEpDownloaded(epId)) return;
        showSingleDlModal(
          epId,
          btn.dataset.dlMovieId,
          btn.dataset.dlTitle,
          btn.dataset.dlEpTitle,
        );
      });
    });
  }

  // ==================== STREAM (ORIGINAL PLAYER) ====================
  function formatTime(sec) {
    if (isNaN(sec) || sec < 0) return "0:00";
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  async function renderStream() {
    var data = pageData.stream;
    if (!data || !data.epId) {
      main.innerHTML = errorHTML("Data tidak valid");
      return;
    }
    main.innerHTML = loadingHTML();

    try {
      var json = await fetchApi(apiUrl("episode/streamnew/" + data.epId));
      if (!json || !json.data) throw new Error("Data kosong");

      var ep = json.data.episode;
      var nextEp = json.data.episode_next;
      var rawServers = json.data.server || [];

      // PROSES KUALITAS: Hitung duplikat & beri label
      var qualityCount = {};
      var servers = rawServers.map(function (s) {
        var q = s.quality ? s.quality.toString().trim().toUpperCase() : "";
        if (!q || q === "UNKNOWN") q = "TIDAK DIKETAHUI";
        if (!qualityCount[q]) qualityCount[q] = 0;
        qualityCount[q]++;
        s._qualityKey = q;
        s._label = qualityCount[q] > 1 ? q + " (" + qualityCount[q] + ")" : q;
        return s;
      });

      // URUTKAN: Dari terkecil ke terbesar
      var qOrder = {
        "360P": 1,
        "480P": 2,
        "720P": 3,
        "1080P": 4,
        "1440P": 5,
        "4K": 6,
      };
      servers.sort(function (a, b) {
        return (qOrder[a._qualityKey] || 99) - (qOrder[b._qualityKey] || 99);
      });

      var best = servers.length ? servers[servers.length - 1] : null;
      var bestProxied = best ? videoProxyUrl(best.link) : "";

      var html = '<div class="fade-in">';

      // VIDEO PLAYER ORIGINAL DENGAN CONTROLS BAWAAN BROWSER
      html +=
        '<div class="custom-player-wrap" id="customPlayerWrap" style="aspect-ratio:16/9; max-height:70vh; background:#000;">';
      html +=
        '<video id="videoPlayer" playsinline preload="metadata" autoplay controls style="width:100%; height:100%; object-fit:contain;"' +
        (bestProxied ? ' src="' + bestProxied + '"' : "") +
        "></video>";
      html += "</div>";

      // PILIHAN KUALITAS (DIPINDAH KE LUAR VIDEO)
      if (servers.length > 0) {
        html +=
          '<div class="quality-selector-bar" style="display:flex; gap:8px; margin-top:10px; overflow-x:auto; padding-bottom:5px;">';
        servers.forEach(function (s, i) {
          var isActive = i === servers.length - 1 ? " active" : "";
          html +=
            '<button class="q-btn' +
            isActive +
            '" data-raw="' +
            esc(s.link) +
            '">' +
            esc(s._label) +
            "</button>";
        });
        html += "</div>";
      }

      if (!isEpDownloaded(data.epId)) {
        html +=
          '<div style="margin-bottom:12px;margin-top:16px"><button class="btn btn-dl-batch" id="streamDlBtn" style="width:100%;justify-content:center">' +
          DL_SVG +
          " Download Episode Ini</button></div>";
      } else {
        html +=
          '<div style="margin-bottom:12px;margin-top:16px;text-align:center;padding:10px;background:var(--card);border-radius:12px;font-size:13px;color:#22c55e;font-weight:700">✅ Episode sudah didownload (' +
          getEpDlQuality(data.epId) +
          ")</div>";
      }

      html += '<div class="stream-info">';
      html += '<div class="stream-title">' + esc(data.title || "") + "</div>";
      html += '<div class="stream-ep">' + esc(ep.title || "") + "</div>";
      html += '<div class="stream-stats">';
      html +=
        '<span><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> ' +
        fmtNum(ep.views) +
        " views</span>";
      html +=
        '<span><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ' +
        esc(ep.key_time || "") +
        "</span>";
      html += "</div>";

      if (nextEp) {
        html += '<div class="next-ep-card" id="nextEpBtn">';
        html +=
          '<div class="next-ep-thumb"><img src="' +
          fixImgWide(nextEp.image) +
          '" alt="' +
          esc(nextEp.title) +
          '" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=\'' +
          PLACEHOLDER_WIDE +
          "'\"></div>";
        html += '<div class="next-ep-info">';
        html += '<div class="next-ep-label">Episode Berikutnya</div>';
        html += '<div class="next-ep-title">' + esc(nextEp.title) + "</div>";
        html += "</div></div>";
      }
      html += "</div>";

      html += '<div class="comments-wrap" id="commentsWrap">';
      html += '<div class="detail-section-title">Komentar</div>';
      html += '<div class="comments-filter" id="cmtFilter">';
      html += '<button class="filter-btn active" data-sort="top">Top</button>';
      html += '<button class="filter-btn" data-sort="new">Terbaru</button>';
      html += "</div>";
      html += '<div id="cmtList">' + loadingHTML() + "</div>";
      html += "</div>";
      html += "</div>";

      main.innerHTML = html;
      initCustomPlayer(servers);

      var streamDlBtn = $("#streamDlBtn");
      if (streamDlBtn) {
        streamDlBtn.addEventListener("click", function () {
          showSingleDlModal(data.epId, data.movieId, data.title, data.epTitle);
        });
      }

      var nextBtn = $("#nextEpBtn");
      if (nextBtn && nextEp) {
        nextBtn.addEventListener("click", function () {
          navigate("stream", {
            epId: nextEp.id,
            movieId: data.movieId,
            title: data.title,
            epTitle: nextEp.title,
          });
        });
      }

      cmtEpId = data.epId;
      cmtSort = "top";
      cmtPg = 0;
      loadComments();

      $$("#cmtFilter .filter-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          $$("#cmtFilter .filter-btn").forEach(function (b) {
            b.classList.remove("active");
          });
          btn.classList.add("active");
          cmtSort = btn.dataset.sort;
          cmtPg = 0;
          loadComments();
        });
      });
    } catch (e) {
      console.error("Stream error:", e);
      main.innerHTML = errorHTML(
        "Gagal memuat stream: " + e.message,
        "retryStream",
      );
      var rb = $("#retryStream");
      if (rb) rb.addEventListener("click", renderStream);
    }
  }

  function initCustomPlayer(servers) {
    const video = $("#videoPlayer");
    if (!video) return;

    let isVideoError = false;

    video.addEventListener("loadedmetadata", function () {
      if (!isVideoError) video.play().catch(() => {});
    });

    video.addEventListener("error", function () {
      if (isVideoError) return;
      isVideoError = true;
      console.error("Video Error:", video.error);

      var errorBody =
        '<p style="font-size:14px; color:var(--text-muted); line-height:1.5; text-align:center; margin-bottom:16px;">Server untuk kualitas ini sedang mengalami error (526/429).<br><br>Silakan ganti ke kualitas lain melalui tombol di bawah player.</p>';
      errorBody +=
        '<button class="btn" id="modalErrorBtn" style="width:100%; justify-content:center;">Mengerti</button>';
      openModal("⚠️ Server Error", errorBody);
      $("#modalErrorBtn").addEventListener("click", closeModal);
    });

    // Handle ganti kualitas via tombol di luar video
    document.querySelectorAll(".q-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const rawUrl = btn.dataset.raw;
        const time = video.currentTime;
        const wasPaused = video.paused;

        isVideoError = false;
        alert("Mengganti kualitas video, mohon tunggu...");

        video.src = videoProxyUrl(rawUrl);
        video.load();
        video.addEventListener("loadedmetadata", function h() {
          video.currentTime = time;
          if (!wasPaused) video.play().catch(() => {});
          video.removeEventListener("loadedmetadata", h);
        });

        document
          .querySelectorAll(".q-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    // TAMBAHAN: Shortcut Keyboard untuk PC/Laptop
    const handleKeyDown = (e) => {
      // Hapus listener jika player sudah tidak ada di layar
      if (!document.body.contains(video)) {
        document.removeEventListener("keydown", handleKeyDown);
        return;
      }
      // Jangan aktifkan shortcut jika user sedang mengetik di kolom komentar/search
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;

      switch (e.key.toLowerCase()) {
        case "f": // Tekan F untuk Fullscreen
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            if (video.requestFullscreen) video.requestFullscreen();
            else if (video.webkitRequestFullscreen)
              video.webkitRequestFullscreen();
          }
          break;
        case " ": // Tekan Spasi untuk Play/Pause
          e.preventDefault();
          if (video.paused) video.play().catch(() => {});
          else video.pause();
          break;
        case "m": // Tekan M untuk Mute/Unmute
          e.preventDefault();
          video.muted = !video.muted;
          break;
        case "arrowleft": // Panah Kiri Mundur 5 detik
          e.preventDefault();
          video.currentTime -= 5;
          break;
        case "arrowright": // Panah Kanan Maju 5 detik
          e.preventDefault();
          video.currentTime += 5;
          break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
  }

  // ==================== COMMENTS ====================
  async function loadComments() {
    var list = $("#cmtList");
    if (!list || !cmtEpId) return;
    if (cmtPg === 0) list.innerHTML = loadingHTML();
    try {
      var json = await fetchApi(
        apiUrl(
          "comment/data?id_episode=" +
            cmtEpId +
            "&sort=" +
            cmtSort +
            "&page=" +
            cmtPg,
        ),
      );
      var raw = json && json.data;
      var comments = [];
      if (Array.isArray(raw)) comments = raw;
      else if (raw && Array.isArray(raw.comment)) comments = raw.comment;
      else if (raw && Array.isArray(raw.comments)) comments = raw.comments;

      if (cmtPg === 0) {
        if (!comments.length) {
          list.innerHTML = emptyHTML(
            "💬",
            "Belum Ada Komentar",
            "Jadilah yang pertama berkomentar",
          );
          return;
        }
        list.innerHTML = comments.map(buildCommentHTML).join("");
      } else {
        comments.forEach(function (c) {
          list.insertAdjacentHTML("beforeend", buildCommentHTML(c));
        });
      }

      var old = $("#loadMoreCmt");
      if (old) old.remove();
      if (comments.length >= 15) {
        var wrap = $("#commentsWrap");
        var btn = document.createElement("button");
        btn.className = "btn btn-outline";
        btn.id = "loadMoreCmt";
        btn.style.cssText =
          "width:100%;margin-top:14px;justify-content:center;";
        btn.textContent = "Muat Lebih Banyak";
        btn.addEventListener("click", function () {
          cmtPg++;
          loadComments();
        });
        wrap.appendChild(btn);
      }
    } catch (e) {
      if (cmtPg === 0)
        list.innerHTML =
          '<p style="color:var(--text-muted);text-align:center;padding:20px;font-size:13px">Gagal memuat komentar</p>';
    }
  }

  function buildCommentHTML(c) {
    var initial = (c.user_name || "?").substring(0, 2).toUpperCase();
    var html = '<div class="comment-item">';
    html += '<div class="comment-avatar">';
    if (c.image_url) {
      html +=
        '<img src="' +
        fixImg(c.image_url) +
        '" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.parentElement.innerHTML=\'' +
        initial +
        "'\">";
    } else {
      html += initial;
    }
    html += "</div>";
    html += '<div class="comment-body">';
    html += '<div class="comment-head">';
    html +=
      '<span class="comment-user">' + esc(c.user_name || "Anon") + "</span>";
    if (c.rank && parseInt(c.rank) > 0)
      html += '<span class="chat-rank">Lv.' + esc(c.rank) + "</span>";
    html += '<span class="comment-time">' + esc(c.time || "") + "</span>";
    html += "</div>";
    if (c.text_replay && c.user_name_replay) {
      html +=
        '<div class="comment-reply"><strong>@' +
        esc(c.user_name_replay) +
        "</strong>: " +
        esc(c.text_replay) +
        "</div>";
    }
    html += '<div class="comment-text">' + esc(c.text || "") + "</div>";
    html += "</div></div>";
    return html;
  }

  // ==================== SEARCH ====================
  function renderSearch() {
    searchKW = "";
    searchPg = 0;
    catGenres = []; // Reset genre saat baru buka halaman search
    updateActiveTags(); // Kosongkan tag genre sebelumnya

    var html = '<div class="fade-in">';

    // Search Bar
    html += '<div class="search-bar">';
    html +=
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--text-muted)" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
    html +=
      '<input type="text" id="searchInput" placeholder="Cari anime..." autocomplete="off">';
    html +=
      '<button class="search-submit" id="searchGo"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></button>';
    html += "</div>";

    // Tombol Filter Genre
    html +=
      '<button class="btn btn-outline" id="openSearchGenreBtn" style="width: 100%; margin-top: 12px; margin-bottom: 12px; justify-content: center; font-size: 13px; padding: 10px;">';
    html +=
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="margin-right: 6px;"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
    html += "Filter Genre";
    html += "</button>";

    // Tempat Tag Genre Aktif
    html +=
      '<div class="active-genre-tags" id="activeGenreTags" style="margin-bottom: 10px;"></div>';

    // Hasil Pencarian
    html +=
      '<div id="searchResults">' +
      emptyHTML(
        "🔍",
        "Cari Anime Favoritmu",
        "Ketik judul anime atau pilih genre untuk mulai mencari",
      ) +
      "</div>";
    html += "</div>";

    main.innerHTML = html;

    var input = $("#searchInput");
    var debounce = null;
    input.addEventListener("input", function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () {
        doSearch(input.value.trim());
      }, 600);
    });

    $("#searchGo").addEventListener("click", function () {
      clearTimeout(debounce);
      doSearch(input.value.trim());
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        clearTimeout(debounce);
        doSearch(input.value.trim());
      }
    });

    // Buka drawer genre saat tombol diklik
    $("#openSearchGenreBtn").addEventListener("click", openDrawer);

    setTimeout(function () {
      input.focus();
    }, 100);
  }

  async function doSearch(keyword, append) {
    var container = $("#searchResults");

    // Jika tidak ada keyword dan tidak ada genre dipilih
    if (!keyword && catGenres.length === 0) {
      container.innerHTML = emptyHTML(
        "🔍",
        "Cari Anime Favoritmu",
        "Ketik judul anime atau pilih genre untuk mulai mencari",
      );
      return;
    }

    if (!append) {
      searchKW = keyword;
      searchPg = 0;
    }

    if (searchPg === 0) container.innerHTML = loadingHTML();

    try {
      // Gabungkan keyword dan genre_in ke dalam URL API
      var url = apiUrl(
        "explore/movie?page=" +
          searchPg +
          "&sort=views&keyword=" +
          encodeURIComponent(searchKW) +
          "&genre_in=" +
          catGenres.join(","),
      );
      var json = await fetchApi(url);
      var movies = (json && json.data && json.data.movie) || [];

      if (searchPg === 0 && !movies.length) {
        container.innerHTML = emptyHTML(
          "🎥",
          "Tidak Ditemukan",
          "Tidak ada anime yang cocok dengan pencarian/genre ini",
        );
        return;
      }

      var cardsHTML = "";
      movies.forEach(function (a) {
        cardsHTML += animeCardHTML(a);
      });

      if (searchPg === 0) {
        container.innerHTML =
          '<div class="anime-grid" id="searchGrid">' + cardsHTML + "</div>";
      } else {
        var grid = $("#searchGrid");
        if (grid) grid.insertAdjacentHTML("beforeend", cardsHTML);
      }

      $$("#searchGrid .anime-card[data-id]").forEach(function (card) {
        card.addEventListener("click", function () {
          navigate("detail", { id: card.dataset.id });
        });
      });

      var old = $("#loadMoreSearch");
      if (old) old.remove();
      if (movies.length >= 15) {
        var btn = document.createElement("button");
        btn.className = "btn btn-outline";
        btn.id = "loadMoreSearch";
        btn.style.cssText =
          "width:100%;margin-top:16px;justify-content:center;";
        btn.textContent = "Muat Lebih Banyak";
        btn.addEventListener("click", function () {
          searchPg++;
          doSearch(searchKW, true);
        });
        container.appendChild(btn);
      }
    } catch (e) {
      console.error("Search error:", e);
      if (searchPg === 0)
        container.innerHTML = errorHTML("Gagal mencari.", "retrySearch");
      var rb = $("#retrySearch");
      if (rb)
        rb.addEventListener("click", function () {
          doSearch(searchKW);
        });
    }
  }

  // ==================== SCHEDULE ====================
  function renderSchedule() {
    schedDay = schedDay || getTodayDay();
    var html = '<div class="fade-in">';
    html +=
      '<div class="section-header"><h2 class="section-title">Jadwal Rilis</h2></div>';
    html += '<div class="tabs-wrap"><div class="tabs" id="dayTabs">';
    DAYS.forEach(function (d) {
      html +=
        '<button class="tab' +
        (d === schedDay ? " active" : "") +
        '" data-day="' +
        d +
        '">' +
        d.charAt(0) +
        d.slice(1).toLowerCase() +
        "</button>";
    });
    html += "</div></div>";
    html += '<div id="schedList">' + loadingHTML() + "</div>";
    html += "</div>";
    main.innerHTML = html;

    $$("#dayTabs .tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        schedDay = tab.dataset.day;
        $$("#dayTabs .tab").forEach(function (t) {
          t.classList.remove("active");
        });
        tab.classList.add("active");
        loadSchedule();
      });
    });
    loadSchedule();
  }

  async function loadSchedule() {
    var list = $("#schedList");
    if (!list) return;
    list.innerHTML = loadingHTML();
    try {
      var json = await fetchApi(apiUrl("schedule/data?day=" + schedDay));
      var movies = (json && json.data && json.data.movie) || [];
      if (!movies.length) {
        list.innerHTML = emptyHTML(
          "📅",
          "Tidak Ada Jadwal",
          "Tidak ada anime untuk hari " + schedDay,
        );
        return;
      }

      var html = '<div class="schedule-grid">';
      movies.forEach(function (m) {
        html += '<div class="schedule-card" data-id="' + m.id + '">';
        html += '<div class="schedule-poster">';
        html +=
          '<img src="' +
          fixImg(m.image_poster) +
          '" alt="' +
          esc(m.title) +
          '" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=\'' +
          PLACEHOLDER +
          "'\">";
        if (m.time) {
          html += '<div class="schedule-time-badge">';
          html +=
            '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
          html += esc(m.time);
          html += "</div>";
        }
        html += "</div>";
        html += '<div class="schedule-info">';
        html += '<div class="schedule-title">' + esc(m.title) + "</div>";
        if (m.genre)
          html += '<div class="schedule-genre">' + esc(m.genre) + "</div>";
        html += "</div></div>";
      });
      html += "</div>";

      list.innerHTML = html;
      list.querySelectorAll(".schedule-card[data-id]").forEach(function (el) {
        el.addEventListener("click", function () {
          navigate("detail", { id: el.dataset.id });
        });
      });
    } catch (e) {
      console.error("Schedule error:", e);
      list.innerHTML = errorHTML("Gagal memuat jadwal.", "retrySched");
      var rb = $("#retrySched");
      if (rb) rb.addEventListener("click", loadSchedule);
    }
  }

  // ==================== CHAT ====================
  function renderChat() {
    var html = '<div class="fade-in">';
    html +=
      '<div class="section-header"><h2 class="section-title">Live Chat 💬</h2></div>';
    html += '<div class="chat-list" id="chatList">' + loadingHTML() + "</div>";
    html += "</div>";
    main.innerHTML = html;
    loadChat();
    chatTimer = setInterval(loadChat, 3000);
  }

  async function loadChat() {
    var list = $("#chatList");
    if (!list) return;
    try {
      var json = await fetchApi(apiUrl("chat/data"));
      var chats = (json && json.data && json.data.chat) || [];
      if (!chats.length) return;
      list.innerHTML = chats.map(buildChatHTML).join("");
      list.querySelectorAll(".chat-movie-ref[data-id]").forEach(function (el) {
        el.addEventListener("click", function (e) {
          e.stopPropagation();
          navigate("detail", { id: el.dataset.id });
        });
      });
    } catch (e) {
      /* silent */
    }
  }

  function buildChatHTML(c) {
    var initial = (c.user_name || "?").substring(0, 2).toUpperCase();
    var html = '<div class="chat-item">';
    html += '<div class="chat-avatar">';
    if (c.image_masukotto) {
      html +=
        '<img src="' +
        fixImg(c.image_masukotto) +
        '" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.parentElement.innerHTML=\'' +
        initial +
        "'\">";
    } else {
      html += initial;
    }
    html += "</div>";
    html += '<div class="chat-body">';
    html += '<div class="chat-head">';
    html += '<span class="chat-user">' + esc(c.user_name || "Anon") + "</span>";
    if (c.pro === "1") html += '<span class="chat-pro">PRO</span>';
    if (c.pro === "2") html += '<span class="chat-pro">VIP</span>';
    if (c.rank && parseInt(c.rank) > 0)
      html += '<span class="chat-rank">Lv.' + esc(c.rank) + "</span>";
    html += '<span class="chat-time">' + esc(c.time || "") + "</span>";
    html += "</div>";
    if (c.text_replay && c.user_name_replay) {
      html +=
        '<div class="chat-reply"><strong>@' +
        esc(c.user_name_replay) +
        "</strong>: " +
        esc(c.text_replay) +
        "</div>";
    }
    html += '<div class="chat-text">' + esc(c.text || "") + "</div>";
    if (c.movie) {
      var mv = c.movie;
      html += '<div class="chat-movie-ref" data-id="' + mv.id + '">';
      html +=
        '<div class="chat-movie-poster"><img src="' +
        fixImg(mv.image_poster) +
        '" alt="' +
        esc(mv.title) +
        '" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=\'' +
        PLACEHOLDER +
        "'\"></div>";
      html +=
        '<div class="chat-movie-info"><div class="chat-movie-label">Anime</div><div class="chat-movie-title">' +
        esc(mv.title) +
        "</div></div>";
      html += "</div>";
    }
    html += "</div></div>";
    return html;
  }

  // ==================== CATEGORY / GENRE ====================
  function renderCategory() {
    catGenres = [];
    catPg = 0;

    var html = '<div class="fade-in">';
    html += '<div class="category-header">';
    html += "<h2>Genre Anime</h2>";
    html += '<button class="hamburger-btn" id="openDrawerBtn">';
    html +=
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
    html += "Filter Genre";
    html += "</button>";
    html += "</div>";
    html += '<div class="active-genre-tags" id="activeGenreTags"></div>';
    html +=
      '<div id="catResults">' +
      emptyHTML(
        "🎯",
        "Pilih Genre",
        'Tekan "Filter Genre" untuk memilih genre anime favoritmu',
      ) +
      "</div>";
    html += "</div>";

    main.innerHTML = html;

    var openBtn = $("#openDrawerBtn");
    if (openBtn) {
      openBtn.addEventListener("click", function () {
        openDrawer();
      });
    }
  }

  function openDrawer() {
    var overlay = $("#drawerOverlay");
    var drawer = $("#genreDrawer");
    if (!overlay || !drawer) return;
    drawerOpen = true;
    overlay.classList.add("show");
    drawer.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    var overlay = $("#drawerOverlay");
    var drawer = $("#genreDrawer");
    if (!overlay || !drawer) return;
    drawerOpen = false;
    overlay.classList.remove("show");
    drawer.classList.remove("show");
    document.body.style.overflow = "";
  }

  function updateActiveTags() {
    var container = $("#activeGenreTags");
    if (!container) return;
    if (!catGenres.length) {
      container.innerHTML = "";
      return;
    }
    var html = "";
    catGenres.forEach(function (gid) {
      html += '<span class="active-tag" data-remove="' + gid + '">';
      html += esc(GENRES[gid] || gid);
      html +=
        ' <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      html += "</span>";
    });
    container.innerHTML = html;
    container
      .querySelectorAll(".active-tag[data-remove]")
      .forEach(function (tag) {
        tag.addEventListener("click", function () {
          catGenres = catGenres.filter(function (g) {
            return g !== tag.dataset.remove;
          });
          var opt = $(
            '.drawer-genre-opt[data-gid="' + tag.dataset.remove + '"]',
          );
          if (opt) opt.classList.remove("active");
          updateActiveTags();
        });
      });
  }

  async function loadCategory(append) {
    var container = $("#catResults");
    if (!catGenres.length) {
      if (container)
        container.innerHTML = emptyHTML(
          "🎯",
          "Pilih Genre",
          'Tekan "Filter Genre" untuk memilih genre',
        );
      return;
    }
    if (!append) catPg = 0;
    if (catPg === 0 && container) container.innerHTML = loadingHTML();
    try {
      var json = await fetchApi(
        apiUrl(
          "explore/movie?page=" +
            catPg +
            "&sort=views&keyword=&genre_in=" +
            catGenres.join(","),
        ),
      );
      var movies = (json && json.data && json.data.movie) || [];
      if (catPg === 0 && !movies.length) {
        if (container)
          container.innerHTML = emptyHTML(
            "😕",
            "Tidak Ditemukan",
            "Tidak ada anime untuk kombinasi genre ini",
          );
        return;
      }
      var cardsHTML = "";
      movies.forEach(function (a) {
        cardsHTML += animeCardHTML(a);
      });
      if (catPg === 0) {
        container.innerHTML =
          '<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">' +
          movies.length +
          '+ anime ditemukan</div><div class="anime-grid" id="catGrid">' +
          cardsHTML +
          "</div>";
      } else {
        var grid = $("#catGrid");
        if (grid) grid.insertAdjacentHTML("beforeend", cardsHTML);
      }
      $$("#catGrid .anime-card[data-id]").forEach(function (card) {
        card.addEventListener("click", function () {
          navigate("detail", { id: card.dataset.id });
        });
      });
      var old = $("#loadMoreCat");
      if (old) old.remove();
      if (movies.length >= 15) {
        var btn = document.createElement("button");
        btn.className = "btn btn-outline";
        btn.id = "loadMoreCat";
        btn.style.cssText =
          "width:100%;margin-top:16px;justify-content:center;";
        btn.textContent = "Muat Lebih Banyak";
        btn.addEventListener("click", function () {
          catPg++;
          loadCategory(true);
        });
        container.appendChild(btn);
      }
    } catch (e) {
      console.error("Category error:", e);
      if (catPg === 0 && container)
        container.innerHTML = errorHTML("Gagal memuat.", "retryCat");
      var rb = $("#retryCat");
      if (rb)
        rb.addEventListener("click", function () {
          loadCategory();
        });
    }
  }

  // ==================== SETTINGS PAGE ====================
  function renderSettings() {
    var savedName =
      localStorage.getItem("animesaku_username") || "AnimeSaku Fan";
    var savedAvatar = localStorage.getItem("animesaku_avatar") || "";
    var currentTheme =
      document.documentElement.getAttribute("data-theme") || "light";
    var isDark = currentTheme === "dark";

    var avatarContent = savedAvatar
      ? '<img src="' +
        savedAvatar +
        '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
      : "🌸";

    var html = '<div class="settings-page fade-in">';
    html += '<div class="settings-profile-card">';
    html += '<div class="profile-avatar-wrap">';
    html +=
      '<div class="profile-avatar" id="avatarClick">' +
      avatarContent +
      "</div>";
    html += '<div class="profile-avatar-edit" id="avatarEditBtn">';
    html +=
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
    html += "</div></div>";
    html += '<div class="profile-name">Halo Selamat Datang! 👋</div>';
    html +=
      '<input class="profile-username-input" id="usernameInput" type="text" value="' +
      esc(savedName) +
      '" maxlength="30" placeholder="Masukkan namamu...">';
    html += '<br><button class="profile-save-btn" id="saveProfileBtn">';
    html +=
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    html += "Simpan Profil</button>";
    html += '<input type="file" id="avatarFileInput" accept="image/*">';
    html += "</div>";

    html += '<div class="settings-section">';
    html += '<div class="settings-section-title">Tampilan</div>';
    html += '<div class="settings-row">';
    html += '<div class="settings-row-left">';
    html +=
      '<div class="settings-row-icon">' + (isDark ? "🌙" : "☀️") + "</div>";
    html +=
      '<div class="settings-row-text"><div class="settings-row-label">Mode Gelap</div><div class="settings-row-desc">' +
      (isDark ? "Tema gelap aktif" : "Tema terang aktif") +
      "</div></div>";
    html += "</div>";
    html += '<label class="toggle-switch">';
    html +=
      '<input type="checkbox" id="themeSwitch"' +
      (isDark ? " checked" : "") +
      ">";
    html += '<span class="toggle-slider"></span>';
    html += "</label>";
    html += "</div></div>";

    html += '<div class="settings-section">';
    html += '<div class="settings-section-title">Tentang Aplikasi</div>';
    html += '<div class="settings-row">';
    html +=
      '<div class="settings-row-left"><div class="settings-row-icon">📱</div><div class="settings-row-text"><div class="settings-row-label">Versi</div><div class="settings-row-desc">AnimeSaku v2.0</div></div></div>';
    html += "</div>";
    html += '<div class="settings-row">';
    html +=
      '<div class="settings-row-left"><div class="settings-row-icon">🎨</div><div class="settings-row-text"><div class="settings-row-label">Tema</div><div class="settings-row-desc">Candy Style</div></div></div>';
    html += "</div>";
    html += '<div class="settings-row">';
    html +=
      '<div class="settings-row-left"><div class="settings-row-icon">⚡</div><div class="settings-row-text"><div class="settings-row-label">Sumber Data</div><div class="settings-row-desc">AnimeInWeb API</div></div></div>';
    html += "</div></div>";

    html += '<div class="settings-section">';
    html += '<div class="settings-section-title">Storage</div>';
    html += '<div class="settings-row">';
    html +=
      '<div class="settings-row-left"><div class="settings-row-icon">💾</div><div class="settings-row-text"><div class="settings-row-label">Hapus Cache Download</div><div class="settings-row-desc">Hapus semua video yang didownload</div></div></div>';
    html +=
      '<button class="btn btn-outline" id="clearCacheBtn" style="font-size:12px;padding:6px 14px;color:var(--accent);border-color:var(--accent)">Hapus</button>';
    html += "</div></div>";

    html += '<div class="creator-card">';
    html += '<div class="creator-badge">✨ INFORMASI</div>';
    html +=
      '<div class="creator-avatar-wrap"><img src="https://i.ibb.co.com/LXLCMZb5/Screenshot-2026-04-26-202313.png" alt="Avatar" style="width:72px;height:72px;border-radius:50%;object-fit:cover"></div>';
    html += '<div class="creator-name">Muhammad Hilmy</div>';
    html +=
      '<p style="font-size:13px;color:var(--text-muted);margin-top:4px">Developer & Designer</p>';
    html += "<br>";
    html +=
      '<a class="creator-ig" href="https://instagram.com/hirumisann" target="_blank" rel="noopener">';
    html +=
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>';
    html += "@hirumisann";
    html += "</a>";
    html += "</div>";

    html += '<div class="app-version">AnimeSaku © 2026 — Muhammad Hilmy</div>';
    html += "</div>";

    main.innerHTML = html;
    bindSettingsEvents();
  }

  function bindSettingsEvents() {
    var sw = $("#themeSwitch");
    if (sw) {
      sw.addEventListener("change", function () {
        applyTheme(sw.checked ? "dark" : "light");
        var icon = sw
          .closest(".settings-row")
          .querySelector(".settings-row-icon");
        var desc = sw
          .closest(".settings-row")
          .querySelector(".settings-row-desc");
        if (icon) icon.textContent = sw.checked ? "🌙" : "☀️";
        if (desc)
          desc.textContent = sw.checked
            ? "Tema gelap aktif"
            : "Tema terang aktif";
      });
    }

    var avatarClick = $("#avatarClick");
    var avatarEditBtn = $("#avatarEditBtn");
    var fileInput = $("#avatarFileInput");

    function triggerFileInput() {
      if (fileInput) fileInput.click();
    }
    if (avatarClick) avatarClick.addEventListener("click", triggerFileInput);
    if (avatarEditBtn)
      avatarEditBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        triggerFileInput();
      });

    if (fileInput) {
      fileInput.addEventListener("change", function () {
        var file = fileInput.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (e) {
          var dataUrl = e.target.result;
          localStorage.setItem("animesaku_avatar", dataUrl);
          var av = $("#avatarClick");
          if (av)
            av.innerHTML =
              '<img src="' +
              dataUrl +
              '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
          updateNavAvatar();
        };
        reader.readAsDataURL(file);
      });
    }

    var saveBtn = $("#saveProfileBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        var input = $("#usernameInput");
        if (!input) return;
        var name = input.value.trim() || "AnimeSaku Fan";
        localStorage.setItem("animesaku_username", name);
        saveBtn.innerHTML =
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Tersimpan!';
        setTimeout(function () {
          saveBtn.innerHTML =
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Simpan Profil';
        }, 1800);
      });
    }

    var clearBtn = $("#clearCacheBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", async function () {
        if (!confirm("Hapus semua video yang didownload?")) return;
        try {
          await dbClear("downloads");
          await dbClear("anime_meta");
          downloadedEps = {};
          alert("Cache download berhasil dihapus.");
        } catch (e) {
          alert("Gagal menghapus: " + e.message);
        }
      });
    }
  }

  // ==================== DOWNLOADS PAGE ====================
  async function renderDownloads() {
    main.innerHTML = loadingHTML();
    try {
      const allDl = await dbGetAll("downloads");
      const allMeta = await dbGetAll("anime_meta");
      const groups = {};
      allDl.forEach(function (d) {
        if (!groups[d.movieId])
          groups[d.movieId] = { meta: null, eps: [], totalSize: 0 };
        groups[d.movieId].eps.push(d);
        groups[d.movieId].totalSize += d.size || 0;
      });
      allMeta.forEach(function (m) {
        if (groups[m.id]) groups[m.id].meta = m;
      });

      let html = '<div class="fade-in">';
      html += '<div class="dl-section-title">Download 📥</div>';

      if (dlActive) {
        html +=
          '<div class="dl-active-item"><div class="dl-active-top"><span class="dl-active-title">' +
          esc(dlProgress.current) +
          '</span><span class="dl-active-status">' +
          dlProgress.index +
          "/" +
          dlProgress.total +
          (dlProgress.pct >= 0 ? " (" + dlProgress.pct + "%)" : "") +
          "</span></div>";
        html +=
          '<div class="dl-progress-bar"><div class="dl-progress-fill" style="width:' +
          (dlProgress.pct >= 0 ? dlProgress.pct : 0) +
          '%"></div></div></div>';
      }

      const movieIds = Object.keys(groups);
      if (!movieIds.length) {
        html += emptyHTML(
          "📥",
          "Belum Ada Download",
          "Download episode anime untuk nonton offline",
        );
      } else {
        let totalSize = 0;
        movieIds.forEach(function (mid) {
          totalSize += groups[mid].totalSize;
        });
        html +=
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:10px 14px;background:var(--card);border-radius:12px;box-shadow:var(--shadow)">';
        html +=
          '<span style="font-size:13px;color:var(--text-muted)">' +
          movieIds.length +
          " anime &middot; " +
          allDl.length +
          " episode</span>";
        html +=
          '<span style="font-size:13px;font-weight:700;color:var(--primary)">' +
          fmtSize(totalSize) +
          "</span></div>";
        html += '<div class="dl-grid">';
        movieIds.forEach(function (mid) {
          const g = groups[mid];
          const meta = g.meta || { title: "Unknown", image_poster: "" };
          html += '<div class="dl-anime-card" data-movie-id="' + mid + '">';
          html +=
            '<div class="dl-anime-poster"><img src="' +
            fixImg(meta.image_poster) +
            '" alt="' +
            esc(meta.title) +
            '" loading="lazy" onerror="this.onerror=null;this.src=\'' +
            PLACEHOLDER +
            "'\"></div>";
          html +=
            '<div class="dl-anime-info"><div class="dl-anime-title">' +
            esc(meta.title) +
            "</div>";
          html +=
            '<div class="dl-anime-meta"><span>' +
            g.eps.length +
            " ep</span><span>" +
            fmtSize(g.totalSize) +
            "</span></div>";
          html +=
            '<div class="dl-storage-bar"><div class="dl-storage-fill" style="width:100%"></div></div>';
          html += "</div></div>";
        });
        html += "</div>";
      }
      html += "</div>";
      main.innerHTML = html;

      main
        .querySelectorAll(".dl-anime-card[data-movie-id]")
        .forEach(function (card) {
          card.addEventListener("click", function () {
            navigate("download-detail", { movieId: card.dataset.movieId });
          });
        });
    } catch (e) {
      console.error("Downloads error:", e);
      main.innerHTML = errorHTML("Gagal memuat daftar download.", "retryDl");
      $("#retryDl").addEventListener("click", renderDownloads);
    }
  }

  // ==================== DOWNLOAD DETAIL ====================
  async function renderDownloadDetail() {
    const data = pageData["download-detail"];
    if (!data || !data.movieId) {
      main.innerHTML = errorHTML("Data tidak valid");
      return;
    }
    main.innerHTML = loadingHTML();
    try {
      const allDl = await dbGetAll("downloads");
      const meta = await dbGet("anime_meta", data.movieId);
      const eps = allDl.filter(function (d) {
        return d.movieId === data.movieId;
      });
      eps.sort(function (a, b) {
        return (parseInt(a.epIndex) || 0) - (parseInt(b.epIndex) || 0);
      });

      if (!eps.length) {
        main.innerHTML = emptyHTML(
          "📭",
          "Tidak Ada Episode",
          "Episode tidak ditemukan",
        );
        return;
      }

      let html = '<div class="fade-in">';
      html += '<div class="detail-body" style="margin-bottom:16px">';
      html += '<div style="display:flex;gap:14px;align-items:center">';
      html +=
        '<div style="flex:0 0 80px;aspect-ratio:3/4;border-radius:12px;overflow:hidden;background:var(--accent-light)"><img src="' +
        fixImg(meta ? meta.image_poster : "") +
        '" style="width:100%;height:100%;object-fit:cover" onerror="this.onerror=null;this.src=\'' +
        PLACEHOLDER +
        "'\"></div>";
      html += '<div style="flex:1;min-width:0">';
      html +=
        '<div style="font-size:17px;font-weight:800;color:var(--text)">' +
        esc(meta ? meta.title : "Unknown") +
        "</div>";
      html +=
        '<div style="font-size:13px;color:var(--text-muted);margin-top:4px">' +
        eps.length +
        " episode didownload</div>";
      let totalSize = 0;
      eps.forEach(function (e) {
        totalSize += e.size || 0;
      });
      html +=
        '<div style="font-size:13px;color:var(--primary);font-weight:700;margin-top:2px">' +
        fmtSize(totalSize) +
        "</div></div></div></div>";

      html += '<div class="dl-section-title">Episode Tersimpan</div>';
      eps.forEach(function (ep) {
        html +=
          '<div class="dl-ep-item" data-play-ep-id="' +
          ep.epId +
          '" data-play-movie-id="' +
          ep.movieId +
          '">';
        html +=
          '<div class="dl-ep-play" data-play-ep-id="' +
          ep.epId +
          '" data-play-movie-id="' +
          ep.movieId +
          '" data-play-title="' +
          esc(ep.title) +
          '" data-play-ep-title="' +
          esc(ep.epTitle) +
          '">' +
          PLAY_SVG +
          "</div>";
        html +=
          '<div class="dl-ep-info"><div class="dl-ep-title">' +
          esc(ep.epTitle) +
          "</div>";
        html +=
          '<div class="dl-ep-meta">' +
          ep.quality +
          " &middot; " +
          fmtSize(ep.size || 0) +
          "</div></div>";
        html += '<div class="dl-ep-actions">';
        html +=
          '<button class="dl-ep-act-btn danger" data-del-id="' +
          ep.id +
          '" data-del-ep-id="' +
          ep.epId +
          '">' +
          TRASH_SVG +
          "</button>";
        html += "</div></div>";
      });
      html += "</div>";
      main.innerHTML = html;

      main.querySelectorAll("[data-play-ep-id]").forEach(function (el) {
        el.addEventListener("click", function () {
          navigate("offline-play", {
            movieId: el.dataset.playMovieId,
            epId: el.dataset.playEpId,
            title: el.dataset.playTitle,
            epTitle: el.dataset.playEpTitle,
          });
        });
      });

      main.querySelectorAll("[data-del-id]").forEach(function (btn) {
        btn.addEventListener("click", async function (e) {
          e.stopPropagation();
          if (!confirm("Hapus episode ini?")) return;
          try {
            await dbDelete("downloads", btn.dataset.delId);
            delete downloadedEps[btn.dataset.delEpId];
            renderDownloadDetail();
          } catch (err) {
            alert("Gagal menghapus: " + err.message);
          }
        });
      });
    } catch (e) {
      console.error("Download detail error:", e);
      main.innerHTML = errorHTML("Gagal memuat detail download.");
    }
  }

  // ==================== OFFLINE PLAYER ====================
  async function renderOfflinePlay() {
    const data = pageData["offline-play"];
    if (!data || !data.epId) {
      main.innerHTML = errorHTML("Data tidak valid");
      return;
    }
    main.innerHTML = loadingHTML();
    try {
      const allDl = await dbGetAll("downloads");
      let record = null;
      for (let i = 0; i < allDl.length; i++) {
        if (allDl[i].epId === data.epId) {
          record = allDl[i];
          break;
        }
      }
      if (!record || !record.blob) {
        main.innerHTML = errorHTML(
          "Video tidak ditemukan. Mungkin sudah dihapus.",
        );
        return;
      }
      const blobUrl = URL.createObjectURL(record.blob);
      activeBlobUrls.push(blobUrl);

      let html = '<div class="fade-in">';
      html +=
        '<div class="custom-player-wrap" id="customPlayerWrap" style="aspect-ratio:16/9; max-height:70vh; background:#000;">';
      html +=
        '<video id="videoPlayer" playsinline preload="metadata" autoplay controls src="' +
        blobUrl +
        '" style="width:100%; height:100%; object-fit:contain;"></video>';
      html += "</div>";

      html += '<div class="stream-info" style="margin-top: 16px;">';
      html += '<div class="stream-title">' + esc(data.title || "") + "</div>";
      html += '<div class="stream-ep">' + esc(data.epTitle || "") + "</div>";
      html +=
        '<div class="stream-stats"><span>📱 Offline</span><span>' +
        (record.quality || "") +
        "</span><span>" +
        fmtSize(record.size || 0) +
        "</span></div>";
      html += "</div></div>";

      main.innerHTML = html;
      initCustomPlayer([]);
    } catch (e) {
      console.error("Offline play error:", e);
      main.innerHTML = errorHTML("Gagal memutar video: " + e.message);
    }
  }

  // ==================== OFFLINE MODE PAGE ====================
  async function renderOfflineMode() {
    main.innerHTML = loadingHTML();
    try {
      const allDl = await dbGetAll("downloads");
      const allMeta = await dbGetAll("anime_meta");
      const groups = {};
      allDl.forEach(function (d) {
        if (!groups[d.movieId])
          groups[d.movieId] = { meta: null, eps: [], totalSize: 0 };
        groups[d.movieId].eps.push(d);
        groups[d.movieId].totalSize += d.size || 0;
      });
      allMeta.forEach(function (m) {
        if (groups[m.id]) groups[m.id].meta = m;
      });

      let html = '<div class="fade-in">';
      html += '<div style="text-align:center; padding: 30px 20px 20px;">';
      html +=
        '<span style="font-size:64px; display:block; margin-bottom:12px;">📡</span>';
      html +=
        '<h2 style="color:var(--text); margin-bottom:6px;">Kamu Sedang Offline</h2>';
      html +=
        '<p style="color:var(--text-muted); font-size:14px; line-height:1.5;">Tidak ada koneksi internet. Kamu hanya bisa menonton anime yang sudah didownload di bawah ini.</p>';
      html += "</div>";

      const movieIds = Object.keys(groups);
      if (!movieIds.length) {
        html += emptyHTML(
          "📭",
          "Belum Ada Download",
          "Kamu belum mendownload anime apapun untuk ditonton offline.",
        );
      } else {
        html +=
          '<div class="dl-section-title">Tersedia untuk Ditonton 📥</div>';
        html += '<div class="dl-grid">';
        movieIds.forEach(function (mid) {
          const g = groups[mid];
          const meta = g.meta || { title: "Unknown", image_poster: "" };
          html += '<div class="dl-anime-card" data-movie-id="' + mid + '">';
          html +=
            '<div class="dl-anime-poster"><img src="' +
            fixImg(meta.image_poster) +
            '" alt="' +
            esc(meta.title) +
            '" loading="lazy" onerror="this.onerror=null;this.src=\'' +
            PLACEHOLDER +
            "'\"></div>";
          html +=
            '<div class="dl-anime-info"><div class="dl-anime-title">' +
            esc(meta.title) +
            "</div>";
          html +=
            '<div class="dl-anime-meta"><span>' +
            g.eps.length +
            " ep</span><span>" +
            fmtSize(g.totalSize) +
            "</span></div>";
          html += "</div></div>";
        });
        html += "</div>";
      }
      html += "</div>";
      main.innerHTML = html;

      main
        .querySelectorAll(".dl-anime-card[data-movie-id]")
        .forEach(function (card) {
          card.addEventListener("click", function () {
            navigate("download-detail", { movieId: card.dataset.movieId });
          });
        });
    } catch (e) {
      console.error("Offline mode error:", e);
      main.innerHTML = errorHTML("Gagal memuat data offline.");
    }
  }

  // ==================== NETWORK LISTENERS ====================
  window.addEventListener("offline", function () {
    isOffline = true;
    clearTimers();
    switchTab("offline-mode");
  });

  window.addEventListener("online", function () {
    isOffline = false;
    alert("Koneksi internet kembali tersedia! 🌐");
    switchTab("home");
  });

  // ====================================================================
  //  DRAWER EVENTS
  // ====================================================================
  // ====================================================================
  //  DRAWER EVENTS
  // ====================================================================
  function initDrawerEvents() {
    var overlay = $("#drawerOverlay");
    var closeBtn = $("#drawerClose");
    var resetBtn = $("#drawerReset");
    var applyBtn = $("#drawerApply"); // PASTIKAN BARIS INI ADA

    if (overlay) overlay.addEventListener("click", closeDrawer);
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        catGenres = [];
        $$(".drawer-genre-opt").forEach(function (o) {
          o.classList.remove("active");
        });
      });
    }

    if (applyBtn) {
      applyBtn.addEventListener("click", function () {
        closeDrawer();
        updateActiveTags();
        if (currentRoute === "search") {
          searchPg = 0;
          doSearch(searchKW);
        } else {
          loadCategory();
        }
      });
    }
  }

  function initGenreDrawerOptions() {
    var drawerOpts = $("#drawerGenreOptions");
    if (drawerOpts) {
      var opts = "";
      Object.keys(GENRES).forEach(function (id) {
        opts +=
          '<button class="drawer-genre-opt" data-gid="' +
          id +
          '">' +
          esc(GENRES[id]) +
          "</button>";
      });
      drawerOpts.innerHTML = opts;

      drawerOpts.querySelectorAll(".drawer-genre-opt").forEach(function (opt) {
        opt.addEventListener("click", function () {
          var gid = opt.dataset.gid;
          if (catGenres.indexOf(gid) !== -1) {
            catGenres = catGenres.filter(function (g) {
              return g !== gid;
            });
            opt.classList.remove("active");
          } else {
            catGenres.push(gid);
            opt.classList.add("active");
          }
        });
      });
    }
  }

  // ====================================================================
  //  GLOBAL EVENT LISTENERS
  // ====================================================================
  $("#backBtn").addEventListener("click", function () {
    history.back();
  });
  $("#headerSearchBtn").addEventListener("click", function (e) {
    e.preventDefault();
    switchTab("search");
  });
  $("#themeToggleBtn").addEventListener("click", function () {
    toggleTheme();
  });
  $(".brand").addEventListener("click", function (e) {
    e.preventDefault();
    switchTab("home");
  });
  $$(".nav-item").forEach(function (nav) {
    nav.addEventListener("click", function (e) {
      e.preventDefault();
      if (drawerOpen) {
        closeDrawer();
        return;
      }
      switchTab(nav.dataset.route);
    });
  });

  $("#modalClose").addEventListener("click", closeModal);
  $("#modalOverlay").addEventListener("click", function (e) {
    if (e.target === this) closeModal();
  });

  $("#dlFloatingBar").addEventListener("click", function () {
    if (currentRoute !== "downloads") switchTab("downloads");
  });

  // ====================================================================
  //  BROWSER BACK / FORWARD
  // ====================================================================
  window.addEventListener("popstate", function () {
    if (drawerOpen) {
      closeDrawer();
      history.pushState(null, "");
      return;
    }

    if ($("#modalOverlay").classList.contains("show")) {
      closeModal();
      history.pushState(null, "");
      return;
    }

    if (navStack.length > 1) {
      goBack();
    } else if (currentRoute !== "home" && currentRoute !== "offline-mode") {
      navStack = [isOffline ? "offline-mode" : "home"];
      currentRoute = navStack[0];
      history.pushState({ route: currentRoute }, "");
      render(currentRoute);
      updateUI();
    } else {
      history.pushState(null, "");
    }
  });

  // ====================================================================
  //  INIT
  // ====================================================================

  loadTheme();
  initDrawerEvents();
  initGenreDrawerOptions(); // <--- TAMBAHKAN INI
  loadDownloadedEps();

  if (isOffline) {
    currentRoute = "offline-mode";
    navStack = ["offline-mode"];
  } else {
    currentRoute = "home";
    navStack = ["home"];
  }

  history.replaceState({ route: currentRoute }, "");
  render(currentRoute);
  updateUI();
  setTimeout(hideSplash, 2500);
})();
