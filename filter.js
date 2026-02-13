// Social Feed Filter — content script
// Supports: Substack Notes, Instagram, Facebook, X/Twitter
(function () {
  const STORAGE_KEY = 'substackFilterWords';
  let blockedTerms = [];

  function loadTerms(cb) {
    chrome.storage.sync.get(STORAGE_KEY, (data) => {
      blockedTerms = (data[STORAGE_KEY] || []).map(t => t.toLowerCase().trim()).filter(Boolean);
      if (cb) cb();
    });
  }

  function containsBlocked(text) {
    if (!text || blockedTerms.length === 0) return false;
    const lower = text.toLowerCase();
    return blockedTerms.some(term => lower.includes(term));
  }

  function getHost() {
    const h = location.hostname;
    if (h.includes('substack.com')) return 'substack';
    if (h.includes('instagram.com')) return 'instagram';
    if (h.includes('facebook.com')) return 'facebook';
    if (h.includes('x.com') || h.includes('twitter.com')) return 'x';
    return 'unknown';
  }

  // Platform-specific selectors for feed posts
  function getPostSelectors(platform) {
    switch (platform) {
      case 'substack':
        return [
          '[class*="note"]', '[class*="Note"]', '[data-testid*="note"]',
          'article', '.feed-note', '.note-card',
          '[class*="FeedNote"]', '[class*="feedNote"]'
        ];
      case 'instagram':
        return [
          'article', '[role="presentation"]',
          '[class*="x1lliihq"]', // IG feed post containers
          'div[style] > div > div > article'
        ];
      case 'facebook':
        return [
          '[data-pagelet*="FeedUnit"]', '[role="article"]',
          'div[data-ad-preview]', '.x1yztbdb',
          '[class*="userContent"]'
        ];
      case 'x':
        return [
          'article', '[data-testid="tweet"]',
          '[data-testid="cellInnerDiv"]'
        ];
      default:
        return ['article'];
    }
  }

  function filterPosts() {
    const platform = getHost();
    const selectors = getPostSelectors(platform);
    const candidates = new Set();

    selectors.forEach(sel => {
      try {
        document.querySelectorAll(sel).forEach(el => candidates.add(el));
      } catch (e) {}
    });

    // Also grab feed area children
    const feedAreas = document.querySelectorAll(
      '[class*="feed"], [class*="Feed"], [role="feed"], [role="main"], main'
    );
    feedAreas.forEach(feed => {
      Array.from(feed.children).forEach(child => {
        if (child.tagName === 'DIV' || child.tagName === 'ARTICLE') {
          candidates.add(child);
        }
      });
    });

    candidates.forEach(el => {
      const text = el.textContent || el.innerText || '';
      if (containsBlocked(text)) {
        el.style.display = 'none';
        el.dataset.substackFiltered = 'true';
      }
    });
  }

  function observe() {
    const observer = new MutationObserver((mutations) => {
      let hasNew = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) { hasNew = true; break; }
      }
      if (hasNew) filterPosts();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes[STORAGE_KEY]) {
      blockedTerms = (changes[STORAGE_KEY].newValue || []).map(t => t.toLowerCase().trim()).filter(Boolean);
      document.querySelectorAll('[data-substack-filtered]').forEach(el => {
        el.style.display = '';
        delete el.dataset.substackFiltered;
      });
      filterPosts();
    }
  });

  loadTerms(() => {
    filterPosts();
    observe();
  });
})();
