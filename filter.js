// Sovereign Scroll — content script
// Universal feed filter with aggressive scanning
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

  // Walk up from element to find a "post" — a list item among siblings
  function findPostContainer(el) {
    let current = el;
    let best = null;

    while (current && current !== document.body) {
      const parent = current.parentElement;
      if (!parent) break;

      const siblings = parent.children.length;
      const rect = current.getBoundingClientRect();
      const height = rect.height;

      // A post container: has siblings, reasonable visual height
      if (siblings >= 2 && height > 50 && height < 2000) {
        best = current;
      }

      // Stop if parent is massive
      if (best && parent.getBoundingClientRect().height > 5000) {
        break;
      }

      current = parent;
    }

    return best;
  }

  function scanAndFilter() {
    if (blockedTerms.length === 0) return;

    // Get ALL divs, spans, p, article, section on the page
    const allElements = document.querySelectorAll('div, span, p, article, section, li, a, h1, h2, h3, h4');

    const checked = new Set();
    const toHide = new Set();

    allElements.forEach(el => {
      // Skip already filtered
      if (el.closest('[data-sovereign-filtered]')) return;
      // Skip tiny elements
      if (!el.textContent || el.textContent.length < 3) return;

      // Check direct text (not children's text) first for efficiency
      // But also check full textContent for phrases split across children
      const text = el.textContent;
      if (!containsBlocked(text)) return;

      // Found blocked content — find the post container
      const container = findPostContainer(el);
      if (container && !checked.has(container)) {
        checked.add(container);
        // Verify the container itself has the blocked text
        if (containsBlocked(container.textContent)) {
          toHide.add(container);
        }
      }
    });

    toHide.forEach(el => {
      el.style.display = 'none';
      el.setAttribute('data-sovereign-filtered', 'true');
    });
  }

  function resetAndFilter() {
    document.querySelectorAll('[data-sovereign-filtered]').forEach(el => {
      el.style.display = '';
      el.removeAttribute('data-sovereign-filtered');
    });
    scanAndFilter();
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes[STORAGE_KEY]) {
      blockedTerms = (changes[STORAGE_KEY].newValue || []).map(t => t.toLowerCase().trim()).filter(Boolean);
      resetAndFilter();
    }
  });

  // Aggressive: scan on load, on mutations, AND on a timer
  // because some sites (Instagram, X) do weird lazy rendering
  loadTerms(() => {
    scanAndFilter();

    // Watch for new content
    const observer = new MutationObserver(() => {
      setTimeout(scanAndFilter, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Also poll every 2 seconds for content that slips through
    setInterval(scanAndFilter, 2000);

    // Also scan on scroll (new content loads)
    let scrollTimer;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(scanAndFilter, 300);
    }, { passive: true });
  });
})();
