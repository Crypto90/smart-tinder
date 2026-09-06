// ============================================================================
// SmartTinder V2 - Automation, Criteria Filter Engine & Modern Glassmorphic UI
// ============================================================================

(function () {
  let uiInjected = false;
  let initTimer = null;

  function initSmartTinder() {
    if (uiInjected || document.getElementById('st-wrapper')) return;
    if (!document.body) return;

    uiInjected = true;
    if (initTimer) clearInterval(initTimer);

    // --- 1. Persistent Storage & State Management ---
    function getStored(key, defaultVal) {
      try {
        const item = localStorage.getItem(key);
        return item !== null ? JSON.parse(item) : defaultVal;
      } catch (e) {
        return defaultVal;
      }
    }

    function setStored(key, val) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (e) {}
    }

    // Config stored in localStorage (persistent across browser sessions)
    let speed = parseFloat(getStored('st-speed', 1.5));
    let randDelay = parseFloat(getStored('st-rand', 1.0));
    let maxSwipesPerCat = parseInt(getStored('st-limit', 50), 10);
    let passRate = parseInt(getStored('st-passRate', 0), 10); // 0% means 100% Right Swipes on passing profiles
    let autoLoop = getStored('st-autoLoop', true);
    let maxDistance = parseInt(getStored('st-maxDist', 0), 10); // 0 = disabled
    let minAge = parseInt(getStored('st-minAge', 18), 10);
    let maxAge = parseInt(getStored('st-maxAge', 0), 10); // 0 = off
    let requireBio = getStored('st-reqBio', false);
    let verifiedOnly = getStored('st-verifiedOnly', false);
    let humanCooldowns = getStored('st-cooldowns', true);
    let savedCategories = getStored('st-categories', []);
    let enabledCats = getStored('st-enabledCats', ['/app/recs']);
    let isCompact = getStored('st-compact', false);
    let isCollapsed = getStored('st-collapsed', false);
    let savedPos = getStored('st-pos', { top: 20, left: 20 });

    // Preset exclusion groups (auto-swipes left if matched in bio, tags, pronouns)
    const PRESET_GROUPS = [
      {
        title: 'Gender & Pronouns',
        icon: '⚧️',
        tags: ['he/him', 'they/them', 'er/ihn', 'she/they', 'trans', 'transgender', 'ladyboy', 'crossdresser', 't-girl', 'shemale', 'ftm', 'mtf']
      },
      {
        title: 'Couples & Poly',
        icon: '👥',
        tags: ['couple', 'looking for third', 'dreier', 'paar', 'unicorn']
      },
      {
        title: 'Promo & Spam',
        icon: '💸',
        tags: ['onlyfans', 'cashapp', 'paypal.me', 'sugar baby', 'insta:', 'ig:', 'snap:', 'sc:']
      }
    ];
    const allPresetTags = PRESET_GROUPS.flatMap(g => g.tags);
    const defaultKeywords = [...allPresetTags];
    let savedKeywords = getStored('st-keywords', defaultKeywords);

    // Session-based state (resets on fresh session, preserved on category reload)
    let isLiking = sessionStorage.getItem('st-isLiking') === 'true';
    let likeCount = parseInt(sessionStorage.getItem('st-likeCount') || '0', 10);
    let passCount = parseInt(sessionStorage.getItem('st-passCount') || '0', 10);
    let currentQueue = JSON.parse(sessionStorage.getItem('st-queue') || '[]');
    let currentCategorySwipes = parseInt(sessionStorage.getItem('st-catSwipes') || '0', 10);
    
    // Runtime execution variables
    let activeTimeoutId = null;
    let emptySwipeCount = 0;
    let emptyCategoryStartTime = null;
    let consecutiveMissedCardCount = 0;
    let loopHasProfiles = false;
    let lastProfileIdentifier = '';
    let activityLog = [];
    let swipesSinceBreak = 0;
    let currentBreakTarget = Math.floor(Math.random() * 11) + 20; // 20 - 30 swipes
    let breakTimerId = null;
    let isBreakActive = false;

    // --- 2. Build Glassmorphic UI ---
    const overlayHTML = `
      <style>
        #st-wrapper *, #st-wrapper *::before, #st-wrapper *::after { box-sizing: border-box; }
        #st-body::-webkit-scrollbar, #st-kw-list::-webkit-scrollbar, #st-cat-list::-webkit-scrollbar { width: 5px; }
        #st-body::-webkit-scrollbar-track, #st-kw-list::-webkit-scrollbar-track, #st-cat-list::-webkit-scrollbar-track { background: rgba(0,0,0,0.25); border-radius: 4px; }
        #st-body::-webkit-scrollbar-thumb, #st-kw-list::-webkit-scrollbar-thumb, #st-cat-list::-webkit-scrollbar-thumb { background: rgba(253,41,123,0.5); border-radius: 4px; }
        #st-body::-webkit-scrollbar-thumb:hover, #st-kw-list::-webkit-scrollbar-thumb:hover, #st-cat-list::-webkit-scrollbar-thumb:hover { background: rgba(253,41,123,0.8); }
      </style>
      <div id="st-wrapper" style="
        position: fixed; top: ${savedPos.top}px; left: ${savedPos.left}px; width: 330px;
        background: rgba(18, 20, 32, 0.94); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6); color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
        z-index: 999999; display: flex; flex-direction: column; overflow: hidden; user-select: none;
        max-height: calc(100vh - 40px); transition: width 0.25s ease, opacity 0.2s ease;
      ">
        <!-- Compact Bar (Shown only in Compact Mode) -->
        <div id="st-compact-bar" style="display: ${isCompact ? 'flex' : 'none'}; align-items: center; justify-content: space-between; padding: 8px 12px; background: linear-gradient(135deg, rgba(253, 41, 123, 0.85), rgba(255, 101, 91, 0.85)); flex-shrink: 0;">
          <div style="font-weight: 800; font-size: 13px; display: flex; align-items: center; gap: 6px;">
            <span>🔥</span>
            <span id="st-compact-likes" style="font-size: 13px;">${likeCount}</span>
            <span style="opacity: 0.6; font-size: 10px;">L</span>
            <span style="opacity: 0.4;">|</span>
            <span id="st-compact-passes" style="font-size: 13px; color: #ff9e9e;">${passCount}</span>
            <span style="opacity: 0.6; font-size: 10px;">P</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button id="st-compact-toggle-run" title="Start / Stop" style="background: rgba(0,0,0,0.25); border: none; border-radius: 4px; color: #fff; font-size: 12px; padding: 2px 6px; cursor: pointer;">
              ${isLiking ? '⏸️' : '▶️'}
            </button>
            <button id="st-expand-btn" title="Expand Widget" style="background: none; border: none; color: #fff; font-size: 14px; cursor: pointer; padding: 0 2px;">❐</button>
          </div>
        </div>

        <!-- Full UI Content -->
        <div id="st-full-ui" style="display: ${isCompact ? 'none' : 'flex'}; flex-direction: column; flex: 1; min-height: 0; overflow: hidden;">
          <!-- Draggable Header -->
          <div id="st-header" style="
            padding: 10px 12px; background: linear-gradient(135deg, rgba(253, 41, 123, 0.9), rgba(255, 101, 91, 0.9));
            cursor: grab; font-weight: 700; font-size: 13px; display: flex; justify-content: space-between; align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1); flex-shrink: 0;
          ">
            <span style="display: flex; align-items: center; gap: 6px;">
              <span>🔥</span>
              <span>Smart Tinder</span>
            </span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <button id="st-kofi-header-btn" title="Support Developer on Ko-fi (Buy me a coffee)" style="background: none; border: none; color: white; cursor: pointer; font-size: 11px; padding: 0 2px; opacity: 0.85;">☕</button>
              <button id="st-check-update-btn" title="Check for Updates" style="background: none; border: none; color: white; cursor: pointer; font-size: 11px; padding: 0 2px; opacity: 0.75;">🔄</button>
              <button id="st-devtools-btn" title="Toggle Developer Console (F12 or Cmd+Option+I)" style="background: none; border: none; color: white; cursor: pointer; font-size: 11px; padding: 0 2px; opacity: 0.75;">🛠️</button>
              <button id="st-compact-btn" title="Compact Mode" style="background: none; border: none; color: white; cursor: pointer; font-size: 12px; padding: 0 3px; opacity: 0.9;">🗕</button>
              <button id="st-collapse" title="Minimize Body" style="background: none; border: none; color: white; cursor: pointer; font-size: 12px; padding: 0 3px; opacity: 0.9;">${isCollapsed ? '▲' : '▼'}</button>
            </div>
          </div>
          
          <!-- Update Notification Banner (Hidden by default) -->
          <div id="st-update-banner" style="display: none; background: linear-gradient(135deg, rgba(0, 230, 118, 0.22), rgba(41, 121, 255, 0.22)); border-bottom: 1px solid rgba(0, 230, 118, 0.4); padding: 6px 10px; font-size: 10px; align-items: center; justify-content: space-between; flex-shrink: 0;">
            <div style="display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <span>🚀</span>
              <span id="st-update-text" style="color: #00e676; font-weight: 700; font-size: 10px;">Update available!</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <button id="st-update-action-btn" style="background: #00e676; border: none; border-radius: 4px; color: #000; font-size: 9px; font-weight: 800; padding: 2px 7px; cursor: pointer;">DOWNLOAD ➔</button>
              <button id="st-update-dismiss-btn" title="Dismiss" style="background: none; border: none; color: rgba(255,255,255,0.6); font-size: 12px; cursor: pointer; padding: 0 2px; line-height: 1;">✕</button>
            </div>
          </div>
          
          <!-- Tab Navigation Bar -->
          <div id="st-tabs" style="display: flex; background: rgba(0,0,0,0.35); border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;">
            <button id="st-tab-main" style="flex: 1; padding: 8px 10px; background: rgba(255,255,255,0.08); border: none; border-bottom: 2px solid #fd297b; color: #fff; font-size: 11px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: all 0.2s;">
              <span>⚡ Swiper</span>
            </button>
            <button id="st-tab-criteria" style="flex: 1; padding: 8px 10px; background: transparent; border: none; border-bottom: 2px solid transparent; color: rgba(255,255,255,0.6); font-size: 11px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;">
              <span>🛡️ Criteria</span>
              <span id="st-tab-badge" style="font-size: 9px; background: #fd297b; color: white; padding: 1px 6px; border-radius: 10px; font-weight: bold;">${savedKeywords.length}</span>
            </button>
          </div>
          
          <!-- Scrollable Body -->
          <div id="st-body" style="padding: 12px; display: ${isCollapsed ? 'none' : 'flex'}; flex-direction: column; overflow-y: auto; overflow-x: hidden; flex: 1; min-height: 0;">
            
            <!-- PANEL 1: MAIN SWIPER CONTROLS -->
            <div id="st-panel-main" style="display: flex; flex-direction: column; gap: 10px;">
              <!-- Counters Row -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 8px; text-align: center;">
                <div>
                  <div style="font-size: 10px; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.5px;">Likes</div>
                  <div id="st-counter" style="font-size: 18px; font-weight: 800; color: #4ade80;">${likeCount}</div>
                </div>
                <div style="border-left: 1px solid rgba(255,255,255,0.08);">
                  <div style="font-size: 10px; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.5px;">Passes</div>
                  <div id="st-pass-counter" style="font-size: 18px; font-weight: 800; color: #f87171;">${passCount}</div>
                </div>
              </div>

              <!-- Category Progress -->
              <div style="background: rgba(0,0,0,0.25); border-radius: 6px; padding: 6px 8px; font-size: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: rgba(255,255,255,0.7);">Cat Swipes:</span>
                <span id="st-cat-progress" style="font-weight: 700; color: #fd297b;">${currentCategorySwipes} / ${maxSwipesPerCat}</span>
              </div>

              <!-- Action Buttons -->
              <div style="display: flex; gap: 6px;">
                <button id="st-start" style="flex: 1; padding: 8px; background: ${isLiking ? 'rgba(255,255,255,0.1)' : 'linear-gradient(45deg, #00C853, #64DD17)'}; border: none; border-radius: 6px; color: #fff; font-weight: bold; font-size: 11px; cursor: pointer; box-shadow: ${isLiking ? 'none' : '0 4px 12px rgba(0,200,83,0.3)'};" ${isLiking ? 'disabled' : ''}>START</button>
                <button id="st-stop" style="flex: 1; padding: 8px; background: ${isLiking ? 'rgba(255, 75, 75, 0.25)' : 'rgba(255, 255, 255, 0.1)'}; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: ${isLiking ? '#ff4b4b' : '#fff'}; font-weight: bold; font-size: 11px; cursor: pointer;" ${!isLiking ? 'disabled' : ''}>STOP</button>
              </div>
              
              <!-- Automation Sliders -->
              <div style="display: flex; flex-direction: column; gap: 8px; background: rgba(255,255,255,0.03); padding: 8px; border-radius: 8px;">
                <div style="display: flex; flex-direction: column; gap: 3px;">
                  <label style="font-size: 10px; color: rgba(255,255,255,0.8); display: flex; justify-content: space-between;">
                    <span>Base Speed</span>
                    <span id="st-speed-val" style="font-weight: bold; color: #fd297b;">${speed}s</span>
                  </label>
                  <input type="range" id="st-speed" min="0.5" max="5.0" step="0.1" value="${speed}" style="accent-color: #fd297b; height: 4px; cursor: pointer;">
                </div>

                <div style="display: flex; flex-direction: column; gap: 3px;">
                  <label style="font-size: 10px; color: rgba(255,255,255,0.8); display: flex; justify-content: space-between;">
                    <span>Random Jitter</span>
                    <span id="st-rand-val" style="font-weight: bold; color: #fd297b;">${randDelay}s</span>
                  </label>
                  <input type="range" id="st-rand" min="0" max="3.0" step="0.1" value="${randDelay}" style="accent-color: #fd297b; height: 4px; cursor: pointer;">
                </div>

                <div style="display: flex; flex-direction: column; gap: 3px;">
                  <label style="font-size: 10px; color: rgba(255,255,255,0.8); display: flex; justify-content: space-between;">
                    <span>Category Limit</span>
                    <span id="st-limit-val" style="font-weight: bold; color: #fd297b;">${maxSwipesPerCat}</span>
                  </label>
                  <input type="range" id="st-limit" min="10" max="250" step="10" value="${maxSwipesPerCat}" style="accent-color: #fd297b; height: 4px; cursor: pointer;">
                </div>

                <div style="display: flex; flex-direction: column; gap: 3px;">
                  <label style="font-size: 10px; color: rgba(255,255,255,0.8); display: flex; justify-content: space-between;">
                    <span>Random Pass Rate</span>
                    <span id="st-pass-val" style="font-weight: bold; color: #fd297b;">${passRate}%</span>
                  </label>
                  <input type="range" id="st-passrate" min="0" max="50" step="5" value="${passRate}" style="accent-color: #fd297b; height: 4px; cursor: pointer;">
                  <span style="font-size: 9px; color: rgba(255,255,255,0.5);">0% = 100% Right Swipes on passing profiles</span>
                </div>
              </div>

              <!-- Quick Link Card to Criteria -->
              <div id="st-open-criteria" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px 10px; cursor: pointer;">
                <div>
                  <div style="font-size: 11px; font-weight: bold; color: #fff; display: flex; align-items: center; gap: 6px;">
                    <span>🛡️ Negative Criteria</span>
                    <span id="st-filter-count" style="font-size: 9px; background: rgba(253,41,123,0.3); color: #fd297b; padding: 1px 6px; border-radius: 6px; font-weight: bold;">${savedKeywords.length} active</span>
                  </div>
                  <div style="font-size: 9px; color: rgba(255,255,255,0.5); margin-top: 2px;">Click to manage preset tags & custom words</div>
                </div>
                <span style="font-size: 10px; color: #fd297b; font-weight: bold;">Manage →</span>
              </div>

              <!-- Auto-Loop & Cooldowns Row -->
              <div style="display: flex; flex-direction: column; gap: 6px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 6px 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <label style="font-size: 10px; display: flex; align-items: center; gap: 6px; cursor: pointer; color: #fff;">
                    <input type="checkbox" id="st-autoloop" ${autoLoop ? 'checked' : ''} style="accent-color: #fd297b; cursor: pointer;"> Auto-Loop Categories
                  </label>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <label style="font-size: 10px; display: flex; align-items: center; gap: 6px; cursor: pointer; color: #fff;">
                    <input type="checkbox" id="st-cooldowns" ${humanCooldowns ? 'checked' : ''} style="accent-color: #fd297b; cursor: pointer;">
                    <span>☕ Human Cooldowns</span>
                  </label>
                  <button id="st-skip-break" style="display: none; background: rgba(253,41,123,0.3); border: 1px solid #fd297b; border-radius: 4px; color: #fff; font-size: 9px; font-weight: bold; padding: 2px 6px; cursor: pointer;">Skip Break ⏩</button>
                </div>
              </div>

              <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 2px 0;">
              
              <!-- Explore Categories Section -->
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: rgba(255,255,255,0.8);">Categories</div>
                <div style="display: flex; gap: 4px;">
                  <button id="st-select-all" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 3px; font-size: 8px; padding: 2px 5px; cursor: pointer;">All</button>
                  <button id="st-deselect-all" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 3px; font-size: 8px; padding: 2px 5px; cursor: pointer;">None</button>
                  <button id="st-scan" style="background: rgba(253,41,123,0.3); border: 1px solid rgba(253,41,123,0.5); color: white; border-radius: 3px; font-size: 8px; padding: 2px 5px; cursor: pointer;">Scan</button>
                </div>
              </div>
              
              <div id="st-cat-list" style="display: flex; flex-direction: column; gap: 5px; font-size: 10px; max-height: 90px; overflow-y: auto; padding-right: 4px;">
                <!-- Dynamically populated -->
              </div>

              <!-- Queue Indicators -->
              <div style="background: rgba(0,0,0,0.35); border-radius: 6px; padding: 5px 8px; font-size: 9px; color: #ccc;">
                <div style="margin-bottom: 2px;"><strong style="color:#fff;">Active:</strong> <span id="st-current-queue" style="color:#fd297b; font-weight: bold;">None</span></div>
                <div><strong style="color:#fff;">Next:</strong> <span id="st-next-queue">None</span></div>
              </div>

              <!-- Live Decision Feed -->
              <div style="background: rgba(0,0,0,0.35); border-radius: 6px; padding: 6px 8px; font-size: 9px; display: flex; flex-direction: column; gap: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 700; color: rgba(255,255,255,0.8); text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px;">📋 Live Decision Feed</span>
                  <button id="st-feed-clear" style="background: none; border: none; color: rgba(255,255,255,0.4); font-size: 8px; text-decoration: underline; cursor: pointer; padding: 0;">Clear</button>
                </div>
                <div id="st-feed-list" style="display: flex; flex-direction: column; gap: 3px; max-height: 80px; overflow-y: auto; padding-right: 2px;">
                  <span style="color: rgba(255,255,255,0.3); font-style: italic;">No decisions logged yet</span>
                </div>
              </div>

              <!-- Status Display -->
              <div id="st-status" style="text-align: center; font-size: 10px; color: rgba(255,255,255,0.6); font-style: italic; min-height: 14px; word-break: break-word;">
                ${isLiking ? 'Running...' : 'Ready.'}
              </div>

              <!-- Reset Counter Button -->
              <button id="st-reset-counters" style="background: none; border: none; color: rgba(255,255,255,0.3); font-size: 9px; text-decoration: underline; cursor: pointer; padding: 2px;">Reset counters</button>
            </div>

            <!-- PANEL 2: DEDICATED CRITERIA MANAGER -->
            <div id="st-panel-criteria" style="display: none; flex-direction: column; gap: 10px;">
              <div style="font-size: 10px; color: rgba(255,255,255,0.7); line-height: 1.4; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 8px 10px;">
                Auto-swipes <strong>LEFT (Pass)</strong> if matched in profile bio, tags, pronouns, or details. Click any preset pill to toggle ON / OFF:
              </div>

              <!-- Advanced Profile Filters -->
              <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 6px;">
                <span style="font-size: 10px; font-weight: bold; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.5px;">Advanced Filters</span>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <label style="font-size: 10px; color: rgba(255,255,255,0.8); display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" id="st-req-bio" ${requireBio ? 'checked' : ''} style="accent-color: #fd297b; cursor: pointer;">
                    <span>📝 Bio Required (Pass empty)</span>
                  </label>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <label style="font-size: 10px; color: rgba(255,255,255,0.8); display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" id="st-verified-only" ${verifiedOnly ? 'checked' : ''} style="accent-color: #fd297b; cursor: pointer;">
                    <span>☑️ Verified Only (Pass unverified)</span>
                  </label>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: rgba(255,255,255,0.8);">
                  <span>🎂 Age Range:</span>
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <input type="number" id="st-min-age" min="18" max="100" value="${minAge}" placeholder="18" style="width: 44px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: white; font-size: 10px; padding: 3px 4px; text-align: center;">
                    <span>–</span>
                    <input type="number" id="st-max-age" min="0" max="100" value="${maxAge}" placeholder="0=off" style="width: 44px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: white; font-size: 10px; padding: 3px 4px; text-align: center;">
                  </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: rgba(255,255,255,0.8);">
                  <span>📍 Max Distance:</span>
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <input type="number" id="st-max-dist" min="0" max="500" step="5" value="${maxDistance}" placeholder="0=off" style="width: 60px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: white; font-size: 10px; padding: 3px 4px; text-align: center;">
                    <span>km</span>
                  </div>
                </div>
              </div>

              <!-- Presets Header & Action Buttons -->
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 10px; font-weight: bold; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.5px;">Presets</span>
                <div style="display: flex; gap: 4px;">
                  <button id="st-kw-all" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #fff; font-size: 9px; padding: 3px 7px; cursor: pointer;">All</button>
                  <button id="st-kw-none" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #fff; font-size: 9px; padding: 3px 7px; cursor: pointer;">None</button>
                  <button id="st-kw-reset" style="background: rgba(253,41,123,0.25); border: 1px solid rgba(253,41,123,0.45); border-radius: 4px; color: #fff; font-size: 9px; padding: 3px 7px; cursor: pointer; font-weight: bold;">Reset</button>
                </div>
              </div>

              <!-- Preset Groups Container (Natural full height) -->
              <div id="st-preset-groups" style="display: flex; flex-direction: column; gap: 8px;">
                <!-- Dynamically populated preset pills -->
              </div>

              <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin: 2px 0;">

              <!-- Custom Keywords Section -->
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <span style="font-size: 10px; font-weight: bold; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.5px;">Custom Keywords</span>
                <div id="st-custom-kw-list" style="display: flex; flex-wrap: wrap; gap: 4px; min-height: 20px;">
                  <!-- Dynamically populated custom chips -->
                </div>
                <div style="display: flex; gap: 5px;">
                  <input type="text" id="st-kw-input" placeholder="Add custom keyword..." style="flex: 1; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); border-radius: 5px; color: white; font-size: 10px; padding: 5px 8px;">
                  <button id="st-kw-add" style="background: #fd297b; border: none; border-radius: 5px; color: white; font-size: 10px; font-weight: bold; padding: 5px 10px; cursor: pointer;">+ Add</button>
                </div>
              </div>

              <!-- Preset Portability (Export / Import JSON) -->
              <div style="display: flex; gap: 6px;">
                <button id="st-export-btn" style="flex: 1; padding: 6px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #fff; font-size: 10px; font-weight: 600; cursor: pointer;">💾 Export JSON</button>
                <button id="st-import-btn" style="flex: 1; padding: 6px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #fff; font-size: 10px; font-weight: 600; cursor: pointer;">📥 Import JSON</button>
              </div>

              <!-- Support Developer / Buy Me a Coffee -->
              <button id="st-support-btn" style="width: 100%; padding: 7px; background: linear-gradient(135deg, #ff5e5b, #ff8c42); border: none; border-radius: 6px; color: white; font-size: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 3px 10px rgba(255, 94, 91, 0.35);">
                <span>☕ Buy Me a Coffee (Support on Ko-fi)</span>
              </button>

              <button id="st-back-to-swiper" style="width: 100%; padding: 8px; background: linear-gradient(135deg, rgba(253, 41, 123, 0.85), rgba(255, 101, 91, 0.85)); border: none; border-radius: 6px; color: white; font-size: 11px; font-weight: bold; cursor: pointer; margin-top: 4px; box-shadow: 0 4px 12px rgba(253,41,123,0.3);">✓ Done (Back to Swiper)</button>
            </div>

            <!-- Configuration Modal Dialog (Export / Import) -->
            <div id="st-config-modal" style="display: none; position: absolute; inset: 0; background: rgba(10, 12, 20, 0.96); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 14px; padding: 14px; flex-direction: column; gap: 10px; z-index: 1000000;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">
                <span id="st-modal-title" style="font-size: 11px; font-weight: 700; color: #fff;">Preset Profile</span>
                <button id="st-modal-close" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 14px;">✕</button>
              </div>
              <textarea id="st-modal-textarea" style="flex: 1; width: 100%; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #4ade80; font-family: monospace; font-size: 9px; padding: 8px; resize: none;"></textarea>
              <div style="display: flex; gap: 6px;">
                <button id="st-modal-action" style="flex: 1; padding: 7px; background: #fd297b; border: none; border-radius: 6px; color: #fff; font-size: 10px; font-weight: bold; cursor: pointer;">Copy to Clipboard</button>
                <button id="st-modal-cancel" style="padding: 7px 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #fff; font-size: 10px; cursor: pointer;">Close</button>
              </div>
            </div>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = overlayHTML;
    document.body.appendChild(container);

    // --- 3. DOM References ---
    const wrapper = document.getElementById('st-wrapper');
    const fullUi = document.getElementById('st-full-ui');
    const compactBar = document.getElementById('st-compact-bar');
    const header = document.getElementById('st-header');
    const bodyEl = document.getElementById('st-body');
    const devtoolsBtn = document.getElementById('st-devtools-btn');
    const collapseBtn = document.getElementById('st-collapse');
    const compactBtn = document.getElementById('st-compact-btn');
    const expandBtn = document.getElementById('st-expand-btn');
    const compactToggleRun = document.getElementById('st-compact-toggle-run');
    const compactLikes = document.getElementById('st-compact-likes');
    const compactPasses = document.getElementById('st-compact-passes');

    const counterEl = document.getElementById('st-counter');
    const passCounterEl = document.getElementById('st-pass-counter');
    const catProgressEl = document.getElementById('st-cat-progress');
    const speedEl = document.getElementById('st-speed');
    const speedValEl = document.getElementById('st-speed-val');
    const randEl = document.getElementById('st-rand');
    const randValEl = document.getElementById('st-rand-val');
    const limitEl = document.getElementById('st-limit');
    const limitValEl = document.getElementById('st-limit-val');
    const passRateEl = document.getElementById('st-passrate');
    const passRateValEl = document.getElementById('st-pass-val');
    const loopToggle = document.getElementById('st-autoloop');
    const cooldownToggle = document.getElementById('st-cooldowns');
    const skipBreakBtn = document.getElementById('st-skip-break');
    const feedListEl = document.getElementById('st-feed-list');
    const feedClearBtn = document.getElementById('st-feed-clear');

    const tabMainBtn = document.getElementById('st-tab-main');
    const tabCriteriaBtn = document.getElementById('st-tab-criteria');
    const tabBadgeEl = document.getElementById('st-tab-badge');
    const panelMain = document.getElementById('st-panel-main');
    const panelCriteria = document.getElementById('st-panel-criteria');
    const openCriteriaBtn = document.getElementById('st-open-criteria');
    const backToSwiperBtn = document.getElementById('st-back-to-swiper');
    const filterCount = document.getElementById('st-filter-count');
    const presetGroupsEl = document.getElementById('st-preset-groups');
    const customKwListEl = document.getElementById('st-custom-kw-list');
    const kwInput = document.getElementById('st-kw-input');
    const kwAddBtn = document.getElementById('st-kw-add');
    const kwSelectAllBtn = document.getElementById('st-kw-all');
    const kwSelectNoneBtn = document.getElementById('st-kw-none');
    const kwResetBtn = document.getElementById('st-kw-reset');
    const maxDistInput = document.getElementById('st-max-dist');

    const reqBioToggle = document.getElementById('st-req-bio');
    const verifiedOnlyToggle = document.getElementById('st-verified-only');
    const minAgeInput = document.getElementById('st-min-age');
    const maxAgeInput = document.getElementById('st-max-age');
    const exportBtn = document.getElementById('st-export-btn');
    const importBtn = document.getElementById('st-import-btn');

    const modalContainer = document.getElementById('st-config-modal');
    const modalTitle = document.getElementById('st-modal-title');
    const modalTextarea = document.getElementById('st-modal-textarea');
    const modalActionBtn = document.getElementById('st-modal-action');
    const modalCancelBtn = document.getElementById('st-modal-cancel');
    const modalCloseBtn = document.getElementById('st-modal-close');

    const startBtn = document.getElementById('st-start');
    const stopBtn = document.getElementById('st-stop');
    const scanBtn = document.getElementById('st-scan');
    const selectAllBtn = document.getElementById('st-select-all');
    const deselectAllBtn = document.getElementById('st-deselect-all');
    const catList = document.getElementById('st-cat-list');
    const currentQueueEl = document.getElementById('st-current-queue');
    const nextQueueEl = document.getElementById('st-next-queue');
    const statusEl = document.getElementById('st-status');
    const resetCountersBtn = document.getElementById('st-reset-counters');

    // --- 4. Queue Helpers ---
    function formatQueueName(name) {
      if (name === '/app/recs') return 'Normal Recs';
      return name;
    }

    function updateQueueVisuals() {
      if (!isLiking || currentQueue.length === 0) {
        currentQueueEl.textContent = 'None';
        nextQueueEl.textContent = 'None';
        return;
      }
      currentQueueEl.textContent = formatQueueName(currentQueue[0]);
      if (currentQueue.length > 1) {
        nextQueueEl.textContent = formatQueueName(currentQueue[1]);
      } else if (autoLoop) {
        nextQueueEl.textContent = '(Restart Loop)';
      } else {
        nextQueueEl.textContent = '(End of Queue)';
      }
    }

    // --- 5. Render Keywords (Presets & Custom) ---
    function renderKeywords() {
      if (!presetGroupsEl || !customKwListEl) return;
      presetGroupsEl.innerHTML = '';
      customKwListEl.innerHTML = '';
      if (filterCount) filterCount.textContent = `${savedKeywords.length} active`;
      if (tabBadgeEl) tabBadgeEl.textContent = savedKeywords.length;

      // 1. Render Preset Groups
      PRESET_GROUPS.forEach(group => {
        const grp = document.createElement('div');
        grp.style = "background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 7px 8px; display: flex; flex-direction: column; gap: 5px;";

        const activeCount = group.tags.filter(t => savedKeywords.includes(t)).length;

        const title = document.createElement('div');
        title.style = "font-size: 10px; color: rgba(255,255,255,0.7); display: flex; justify-content: space-between; align-items: center; font-weight: 600;";
        title.innerHTML = `<span>${group.icon} ${group.title}</span> <span style="font-size: 9px; color: #fd297b; font-weight: bold;">${activeCount}/${group.tags.length}</span>`;
        grp.appendChild(title);

        const pills = document.createElement('div');
        pills.style = "display: flex; flex-wrap: wrap; gap: 4px;";

        group.tags.forEach(tag => {
          const isActive = savedKeywords.includes(tag);
          const pill = document.createElement('button');
          pill.style = isActive
            ? "background: linear-gradient(135deg, rgba(253, 41, 123, 0.45), rgba(255, 101, 91, 0.45)); border: 1px solid #fd297b; border-radius: 12px; padding: 3px 8px; font-size: 10px; color: #fff; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s ease;"
            : "background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 3px 8px; font-size: 10px; color: rgba(255, 255, 255, 0.45); cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s ease;";
          
          pill.innerHTML = isActive 
            ? `<span style="color: #4ade80; font-size: 9px; font-weight: bold;">✓</span> <span>${tag}</span>` 
            : `<span style="opacity: 0.5; font-size: 9px;">+</span> <span>${tag}</span>`;

          pill.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isActive) {
              savedKeywords = savedKeywords.filter(k => k !== tag);
            } else {
              savedKeywords.push(tag);
            }
            setStored('st-keywords', savedKeywords);
            renderKeywords();
          });

          pills.appendChild(pill);
        });

        grp.appendChild(pills);
        presetGroupsEl.appendChild(grp);
      });

      // 2. Render Custom Keywords
      const allPresets = PRESET_GROUPS.flatMap(g => g.tags);
      const customTags = savedKeywords.filter(k => !allPresets.includes(k));

      if (customTags.length === 0) {
        customKwListEl.innerHTML = '<span style="font-size: 9px; color: rgba(255,255,255,0.3); font-style: italic;">No custom keywords added</span>';
      } else {
        customTags.forEach(ctag => {
          const chip = document.createElement('span');
          chip.style = "background: rgba(253, 41, 123, 0.25); border: 1px solid rgba(253, 41, 123, 0.5); border-radius: 12px; padding: 3px 8px; font-size: 10px; display: inline-flex; align-items: center; gap: 5px; color: #fff;";
          chip.innerHTML = `${ctag} <span data-del="${ctag}" style="cursor: pointer; opacity: 0.7; font-weight: bold; padding: 0 2px;">&times;</span>`;
          customKwListEl.appendChild(chip);
        });

        customKwListEl.querySelectorAll('span[data-del]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const word = btn.getAttribute('data-del');
            savedKeywords = savedKeywords.filter(k => k !== word);
            setStored('st-keywords', savedKeywords);
            renderKeywords();
          });
        });
      }
    }
    renderKeywords();

    kwAddBtn.addEventListener('click', () => {
      const val = kwInput.value.trim();
      if (val && !savedKeywords.includes(val)) {
        savedKeywords.push(val);
        setStored('st-keywords', savedKeywords);
        kwInput.value = '';
        renderKeywords();
      }
    });

    kwInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') kwAddBtn.click();
    });

    kwSelectAllBtn.addEventListener('click', () => {
      const allPresets = PRESET_GROUPS.flatMap(g => g.tags);
      allPresets.forEach(t => {
        if (!savedKeywords.includes(t)) savedKeywords.push(t);
      });
      setStored('st-keywords', savedKeywords);
      renderKeywords();
    });

    kwSelectNoneBtn.addEventListener('click', () => {
      const allPresets = PRESET_GROUPS.flatMap(g => g.tags);
      savedKeywords = savedKeywords.filter(k => !allPresets.includes(k));
      setStored('st-keywords', savedKeywords);
      renderKeywords();
    });

    kwResetBtn.addEventListener('click', () => {
      savedKeywords = [...defaultKeywords];
      setStored('st-keywords', savedKeywords);
      renderKeywords();
    });

    // Tab Switching Logic
    let activeTab = getStored('st-activeTab', 'main');
    function switchTab(tabName) {
      activeTab = tabName;
      setStored('st-activeTab', tabName);
      if (tabName === 'criteria') {
        panelMain.style.display = 'none';
        panelCriteria.style.display = 'flex';
        tabMainBtn.style.background = 'transparent';
        tabMainBtn.style.borderBottom = '2px solid transparent';
        tabMainBtn.style.color = 'rgba(255,255,255,0.6)';
        tabCriteriaBtn.style.background = 'rgba(255,255,255,0.08)';
        tabCriteriaBtn.style.borderBottom = '2px solid #fd297b';
        tabCriteriaBtn.style.color = '#fff';
        renderKeywords();
      } else {
        panelCriteria.style.display = 'none';
        panelMain.style.display = 'flex';
        tabCriteriaBtn.style.background = 'transparent';
        tabCriteriaBtn.style.borderBottom = '2px solid transparent';
        tabCriteriaBtn.style.color = 'rgba(255,255,255,0.6)';
        tabMainBtn.style.background = 'rgba(255,255,255,0.08)';
        tabMainBtn.style.borderBottom = '2px solid #fd297b';
        tabMainBtn.style.color = '#fff';
      }
    }

    tabMainBtn.addEventListener('click', () => switchTab('main'));
    tabCriteriaBtn.addEventListener('click', () => switchTab('criteria'));
    if (openCriteriaBtn) openCriteriaBtn.addEventListener('click', () => switchTab('criteria'));
    if (backToSwiperBtn) backToSwiperBtn.addEventListener('click', () => switchTab('main'));
    switchTab(activeTab);

    if (devtoolsBtn) {
      devtoolsBtn.addEventListener('click', () => {
        try {
          const { ipcRenderer } = require('electron');
          ipcRenderer.send('st-toggle-devtools');
        } catch (e) {
          console.warn('Could not toggle DevTools via IPC:', e);
        }
      });
    }

    // --- Release Update Checker Controls & Listeners ---
    const updateBanner = document.getElementById('st-update-banner');
    const updateText = document.getElementById('st-update-text');
    const updateActionBtn = document.getElementById('st-update-action-btn');
    const updateDismissBtn = document.getElementById('st-update-dismiss-btn');
    const checkUpdateBtn = document.getElementById('st-check-update-btn');
    let latestReleaseUrl = 'https://github.com/Crypto90/smart-tinder/releases';

    if (updateDismissBtn) {
      updateDismissBtn.addEventListener('click', () => {
        if (updateBanner) updateBanner.style.display = 'none';
      });
    }

    if (updateActionBtn) {
      updateActionBtn.addEventListener('click', () => {
        try {
          const { ipcRenderer } = require('electron');
          ipcRenderer.send('st-open-url', latestReleaseUrl);
        } catch (e) {
          window.open(latestReleaseUrl, '_blank');
        }
      });
    }

    if (checkUpdateBtn) {
      checkUpdateBtn.addEventListener('click', () => {
        try {
          statusEl.textContent = 'Checking for updates...';
          const { ipcRenderer } = require('electron');
          ipcRenderer.send('st-check-for-updates');
        } catch (e) {
          console.warn('Could not check for updates:', e);
        }
      });
    }

    // --- Ko-fi Support / Buy Me a Coffee Controls ---
    const kofiHeaderBtn = document.getElementById('st-kofi-header-btn');
    const supportBtn = document.getElementById('st-support-btn');

    if (kofiHeaderBtn) {
      kofiHeaderBtn.addEventListener('click', () => {
        try {
          const { ipcRenderer } = require('electron');
          ipcRenderer.send('st-open-url', 'https://ko-fi.com/crypto90?ref=smart-tinder-app-header');
        } catch (e) {
          window.open('https://ko-fi.com/crypto90?ref=smart-tinder-app-header', '_blank');
        }
      });
    }

    if (supportBtn) {
      supportBtn.addEventListener('click', () => {
        try {
          const { ipcRenderer } = require('electron');
          ipcRenderer.send('st-open-url', 'https://ko-fi.com/crypto90?ref=smart-tinder-app');
        } catch (e) {
          window.open('https://ko-fi.com/crypto90?ref=smart-tinder-app', '_blank');
        }
      });
    }

    try {
      const { ipcRenderer } = require('electron');
      ipcRenderer.on('st-update-available', (event, data) => {
        if (updateBanner && updateText) {
          latestReleaseUrl = data.releaseUrl || latestReleaseUrl;
          updateText.textContent = `v${data.latestVersion} available!`;
          updateBanner.style.display = 'flex';
        }
      });

      ipcRenderer.on('st-update-not-available', (event, data) => {
        statusEl.textContent = `Smart Tinder is up to date (v${data.currentVersion || '1.0.0'})`;
        setTimeout(() => {
          if (!isLiking && statusEl.textContent.includes('up to date')) {
            statusEl.textContent = 'Ready.';
          }
        }, 4000);
      });

      ipcRenderer.on('st-update-error', () => {
        statusEl.textContent = 'Update check failed (offline).';
      });
    } catch (e) {
      // Context without IPC
    }

    maxDistInput.addEventListener('change', (e) => {
      maxDistance = parseInt(e.target.value || '0', 10);
      setStored('st-maxDist', maxDistance);
    });

    reqBioToggle.addEventListener('change', (e) => {
      requireBio = e.target.checked;
      setStored('st-reqBio', requireBio);
    });

    verifiedOnlyToggle.addEventListener('change', (e) => {
      verifiedOnly = e.target.checked;
      setStored('st-verifiedOnly', verifiedOnly);
    });

    minAgeInput.addEventListener('change', (e) => {
      minAge = parseInt(e.target.value || '18', 10);
      setStored('st-minAge', minAge);
    });

    maxAgeInput.addEventListener('change', (e) => {
      maxAge = parseInt(e.target.value || '0', 10);
      setStored('st-maxAge', maxAge);
    });

    cooldownToggle.addEventListener('change', (e) => {
      humanCooldowns = e.target.checked;
      setStored('st-cooldowns', humanCooldowns);
    });

    skipBreakBtn.addEventListener('click', skipCooldownBreak);
    feedClearBtn.addEventListener('click', () => {
      activityLog = [];
      renderActivityFeed();
    });

    // Preset Export / Import Dialog Handlers
    function showConfigModal(title, text, isImportMode) {
      modalTitle.textContent = title;
      modalTextarea.value = text;
      modalTextarea.readOnly = !isImportMode;
      modalContainer.style.display = 'flex';

      if (isImportMode) {
        modalActionBtn.textContent = 'Apply Settings';
        modalActionBtn.onclick = () => {
          try {
            const parsed = JSON.parse(modalTextarea.value);
            if (parsed.savedKeywords && Array.isArray(parsed.savedKeywords)) {
              savedKeywords = parsed.savedKeywords;
              setStored('st-keywords', savedKeywords);
            }
            if (typeof parsed.speed === 'number') { speed = parsed.speed; setStored('st-speed', speed); speedEl.value = speed; speedValEl.textContent = `${speed}s`; }
            if (typeof parsed.randDelay === 'number') { randDelay = parsed.randDelay; setStored('st-rand', randDelay); randEl.value = randDelay; randValEl.textContent = `${randDelay}s`; }
            if (typeof parsed.maxSwipesPerCat === 'number') { maxSwipesPerCat = parsed.maxSwipesPerCat; setStored('st-limit', maxSwipesPerCat); limitEl.value = maxSwipesPerCat; limitValEl.textContent = maxSwipesPerCat; }
            if (typeof parsed.passRate === 'number') { passRate = parsed.passRate; setStored('st-passRate', passRate); passRateEl.value = passRate; passRateValEl.textContent = `${passRate}%`; }
            if (typeof parsed.maxDistance === 'number') { maxDistance = parsed.maxDistance; setStored('st-maxDist', maxDistance); maxDistInput.value = maxDistance; }
            if (typeof parsed.minAge === 'number') { minAge = parsed.minAge; setStored('st-minAge', minAge); minAgeInput.value = minAge; }
            if (typeof parsed.maxAge === 'number') { maxAge = parsed.maxAge; setStored('st-maxAge', maxAge); maxAgeInput.value = maxAge; }
            if (typeof parsed.requireBio === 'boolean') { requireBio = parsed.requireBio; setStored('st-reqBio', requireBio); reqBioToggle.checked = requireBio; }
            if (typeof parsed.verifiedOnly === 'boolean') { verifiedOnly = parsed.verifiedOnly; setStored('st-verifiedOnly', verifiedOnly); verifiedOnlyToggle.checked = verifiedOnly; }
            if (typeof parsed.humanCooldowns === 'boolean') { humanCooldowns = parsed.humanCooldowns; setStored('st-cooldowns', humanCooldowns); cooldownToggle.checked = humanCooldowns; }

            renderKeywords();
            statusEl.textContent = 'Preset configuration imported successfully! ✨';
            modalContainer.style.display = 'none';
          } catch (err) {
            alert('Invalid JSON configuration format.');
          }
        };
      } else {
        modalActionBtn.textContent = 'Copy to Clipboard';
        modalActionBtn.onclick = () => {
          modalTextarea.select();
          document.execCommand('copy');
          modalActionBtn.textContent = 'Copied! ✓';
          setTimeout(() => { modalContainer.style.display = 'none'; }, 1000);
        };
      }
    }

    exportBtn.addEventListener('click', () => {
      const config = {
        version: 2,
        speed,
        randDelay,
        maxSwipesPerCat,
        passRate,
        maxDistance,
        minAge,
        maxAge,
        requireBio,
        verifiedOnly,
        humanCooldowns,
        autoLoop,
        savedKeywords,
        enabledCats
      };
      showConfigModal('Exported Preset (Copy Below):', JSON.stringify(config, null, 2), false);
    });

    importBtn.addEventListener('click', () => {
      showConfigModal('Import Preset (Paste JSON Below):', '', true);
    });

    modalCloseBtn.addEventListener('click', () => { modalContainer.style.display = 'none'; });
    modalCancelBtn.addEventListener('click', () => { modalContainer.style.display = 'none'; });

    // --- 6. Render Categories ---
    function renderCategories() {
      catList.innerHTML = '';
      
      // Normal Swiping
      const normalLabel = document.createElement('label');
      normalLabel.style = "display: flex; align-items: center; gap: 6px; cursor: pointer; color: white; min-height: 16px;";
      normalLabel.innerHTML = `<input type="checkbox" value="/app/recs" style="accent-color: #fd297b;" ${enabledCats.includes('/app/recs') ? 'checked' : ''}> <strong>Normal Swiping</strong>`;
      catList.appendChild(normalLabel);

      savedCategories.forEach(cat => {
        const lbl = document.createElement('label');
        lbl.style = "display: flex; align-items: center; gap: 6px; cursor: pointer; color: white; min-height: 16px;";
        lbl.innerHTML = `<input type="checkbox" value="${cat}" style="accent-color: #fd297b;" ${enabledCats.includes(cat) ? 'checked' : ''}> ${cat}`;
        catList.appendChild(lbl);
      });

      catList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.checked) {
            if (!enabledCats.includes(cb.value)) enabledCats.push(cb.value);
          } else {
            enabledCats = enabledCats.filter(u => u !== cb.value);
          }
          setStored('st-enabledCats', enabledCats);
        });
      });
    }
    renderCategories();

    selectAllBtn.addEventListener('click', () => {
      enabledCats = ['/app/recs', ...savedCategories];
      setStored('st-enabledCats', enabledCats);
      renderCategories();
    });

    deselectAllBtn.addEventListener('click', () => {
      enabledCats = [];
      setStored('st-enabledCats', enabledCats);
      renderCategories();
    });

    // --- 7. UI Controls & Persistence ---
    speedEl.addEventListener('input', (e) => {
      speed = parseFloat(e.target.value);
      speedValEl.textContent = `${speed}s`;
      setStored('st-speed', speed);
    });

    randEl.addEventListener('input', (e) => {
      randDelay = parseFloat(e.target.value);
      randValEl.textContent = `${randDelay}s`;
      setStored('st-rand', randDelay);
    });

    limitEl.addEventListener('input', (e) => {
      maxSwipesPerCat = parseInt(e.target.value, 10);
      limitValEl.textContent = maxSwipesPerCat;
      catProgressEl.textContent = `${currentCategorySwipes} / ${maxSwipesPerCat}`;
      setStored('st-limit', maxSwipesPerCat);
    });

    passRateEl.addEventListener('input', (e) => {
      passRate = parseInt(e.target.value, 10);
      passRateValEl.textContent = `${passRate}%`;
      setStored('st-passRate', passRate);
    });

    loopToggle.addEventListener('change', (e) => {
      autoLoop = e.target.checked;
      setStored('st-autoLoop', autoLoop);
    });

    resetCountersBtn.addEventListener('click', () => {
      likeCount = 0;
      passCount = 0;
      currentCategorySwipes = 0;
      sessionStorage.setItem('st-likeCount', '0');
      sessionStorage.setItem('st-passCount', '0');
      sessionStorage.setItem('st-catSwipes', '0');
      counterEl.textContent = '0';
      passCounterEl.textContent = '0';
      compactLikes.textContent = '0';
      compactPasses.textContent = '0';
      catProgressEl.textContent = `0 / ${maxSwipesPerCat}`;
      statusEl.textContent = 'Counters reset.';
    });

    // Dragging
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      dragOffsetX = e.clientX - wrapper.getBoundingClientRect().left;
      dragOffsetY = e.clientY - wrapper.getBoundingClientRect().top;
      header.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      let newLeft = Math.max(0, Math.min(window.innerWidth - wrapper.offsetWidth, e.clientX - dragOffsetX));
      let newTop = Math.max(10, Math.min(window.innerHeight - 80, e.clientY - dragOffsetY));
      wrapper.style.left = `${newLeft}px`;
      wrapper.style.top = `${newTop}px`;
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = 'grab';
        setStored('st-pos', {
          left: parseInt(wrapper.style.left, 10) || 20,
          top: parseInt(wrapper.style.top, 10) || 20
        });
      }
    });

    // Collapse
    collapseBtn.addEventListener('click', () => {
      isCollapsed = !isCollapsed;
      bodyEl.style.display = isCollapsed ? 'none' : 'flex';
      collapseBtn.textContent = isCollapsed ? '▼' : '▲';
      setStored('st-collapsed', isCollapsed);
    });

    // Ensure outer wrapper containers never scroll internally
    wrapper.addEventListener('scroll', () => { wrapper.scrollTop = 0; wrapper.scrollLeft = 0; });
    fullUi.addEventListener('scroll', () => { fullUi.scrollTop = 0; fullUi.scrollLeft = 0; });

    // Compact Mode Toggle
    function setCompactMode(compact) {
      isCompact = compact;
      setStored('st-compact', isCompact);
      if (isCompact) {
        fullUi.style.display = 'none';
        compactBar.style.display = 'flex';
        wrapper.style.width = '190px';
      } else {
        compactBar.style.display = 'none';
        fullUi.style.display = 'flex';
        wrapper.style.width = '320px';
      }
    }

    compactBtn.addEventListener('click', () => setCompactMode(true));
    expandBtn.addEventListener('click', () => setCompactMode(false));
    compactToggleRun.addEventListener('click', () => {
      if (isLiking) stopAutomation();
      else startAutomation();
    });

    // --- 8. Modal & Popup Auto-Dismisser ---
    function dismissPopups() {
      // Only press Escape if an actual overlay / modal is currently present in the DOM
      const modal = document.querySelector('[role="dialog"], [role="alertdialog"], .modal, div[class*="overlay" i]');
      if (modal && !modal.closest('#st-wrapper')) {
        dispatchKey('Escape', 'Escape', 27);
      }

      let dismissed = false;
      const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));

      // Text patterns for common dismissal buttons (English & German)
      const dismissPatterns = [
        /^keep swiping$/i, /^weiterswipen$/i,
        /^not now$/i, /^nicht jetzt$/i,
        /^maybe later$/i, /^später vielleicht$/i, /^später$/i,
        /^no thanks$/i, /^nein danke$/i,
        /^i decline$/i, /^ablehnen$/i,
        /^back to tinder$/i, /^zurück zu tinder$/i,
        /^agree$/i, /^zustimmen$/i, /^akzeptieren$/i, /^verstanden$/i
      ];

      for (const btn of buttons) {
        if (btn.closest('#st-wrapper')) continue;
        const text = (btn.innerText || '').trim();
        const aria = (btn.getAttribute('aria-label') || '').trim();

        const matchesText = dismissPatterns.some(p => p.test(text));
        const matchesAria = /(close|schließen|schliessen|dismiss|back to tinder|zurück zu tinder)/i.test(aria) && !/(like|nope|pass|super|boost)/i.test(aria);

        if (matchesText || matchesAria) {
          try {
            btn.click();
            dismissed = true;
          } catch (e) {}
        }
      }

      return dismissed;
    }

    // --- 9. Multi-Language Paywall Detection ---
    function checkPaywall() {
      const text = getCleanProfileText().toLowerCase();
      const isEnglishPaywall = text.includes('out of likes') && (text.includes('get tinder') || text.includes('unlimited likes'));
      const isGermanPaywall = (text.includes('keine likes mehr') || text.includes('keine likes')) && (text.includes('hol dir tinder') || text.includes('unbegrenzt likes') || text.includes('mehr likes'));
      return isEnglishPaywall || isGermanPaywall;
    }

    // --- 10. Clean Profile Extraction & Criteria Evaluator ---
    function escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function getCleanProfileContainer() {
      const specificCardSelectors = [
        '[data-testid="recs-card"]',
        '[data-testid="rec-card"]',
        '.recsCardboard__card',
        '.recCard',
        'div[aria-label*="Profile" i]',
        'div[aria-hidden="false"] div[role="img"]'
      ];
      for (const sel of specificCardSelectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (!el.closest('#st-wrapper')) {
            return el;
          }
        }
      }

      // Fallback: check main containers, but ONLY if they contain a genuine profile header & action controls,
      // and DO NOT contain empty-stack exhausted keywords
      const fallbackSelectors = ['div[role="main"]', '#main-content', 'main'];
      for (const sel of fallbackSelectors) {
        const el = document.querySelector(sel);
        if (el && !el.closest('#st-wrapper')) {
          const text = (el.innerText || '').toLowerCase();
          const hasEmptyMarkers = text.includes("keine neuen members") ||
                                  text.includes("keine potentiellen matches") ||
                                  text.includes("zurück zu explore") ||
                                  text.includes("back to explore") ||
                                  text.includes("no one new around you") ||
                                  text.includes("no new members in your area") ||
                                  text.includes("out of potential matches");
          if (hasEmptyMarkers) {
            continue;
          }
          const hasName = Boolean(el.querySelector('h1, span[itemprop="name"], [data-testid="rec-name"]'));
          const hasGamepad = Boolean(document.querySelector(
            'button[aria-label*="Like" i], button[aria-label*="Gefällt mir" i], button[data-testid="gamepad-like"]'
          ));
          if (hasName && hasGamepad) {
            return el;
          }
        }
      }
      return null;
    }

    function extractProfileDetails(card) {
      if (!card) return { name: '', age: 0, bio: '', isVerified: false };

      // 1. Name & age header
      const nameEl = card.querySelector('h1, span[itemprop="name"], [data-testid="rec-name"]') || card.querySelector('h1');
      let name = '';
      let age = 0;
      if (nameEl) {
        const rawText = (nameEl.innerText || '').trim();
        const m = rawText.match(/^([^\d,]+)[,\s]+(\d+)/i) || rawText.match(/(\d{2})/);
        if (m) {
          if (m.length === 3) {
            name = m[1].trim();
            age = parseInt(m[2], 10);
          } else if (m.length === 2) {
            age = parseInt(m[1], 10);
            name = rawText.replace(/\d+/g, '').replace(/,/g, '').trim();
          }
        } else {
          name = rawText;
        }
      }

      // 2. Verified status
      const isVerified = Boolean(
        card.querySelector('[aria-label*="Verified" i]') ||
        card.querySelector('[aria-label*="Verifiziert" i]') ||
        card.querySelector('svg[aria-label*="Verified" i]') ||
        card.querySelector('svg[aria-label*="Verifiziert" i]') ||
        card.querySelector('[title*="Verified" i]') ||
        card.querySelector('[data-testid="verified-badge"]') ||
        card.querySelector('.badge-verified')
      );

      // 3. Bio text (clean clone without name and HUD)
      const clone = card.cloneNode(true);
      const hudInClone = clone.querySelector('#st-wrapper');
      if (hudInClone) hudInClone.remove();
      const nameInClone = clone.querySelector('h1, span[itemprop="name"], [data-testid="rec-name"]');
      if (nameInClone) nameInClone.remove();

      const bio = (clone.innerText || '').replace(/\s+/g, ' ').trim();

      return { name, age, bio, isVerified };
    }

    function getCleanProfileSignature() {
      const card = getCleanProfileContainer();
      if (!card) return '';

      const nameEl = card.querySelector('h1, span[itemprop="name"], [data-testid="rec-name"]') || card.querySelector('h1');
      const nameText = nameEl ? (nameEl.innerText || '').trim() : '';

      const imgEl = card.querySelector('img') || card.querySelector('div[style*="background-image"]');
      const imgSrc = imgEl ? (imgEl.getAttribute('src') || imgEl.style.backgroundImage || '') : '';

      const clone = card.cloneNode(true);
      const hudInClone = clone.querySelector('#st-wrapper');
      if (hudInClone) hudInClone.remove();
      const text = (clone.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120);

      return `${nameText}|${imgSrc.slice(-50)}|${text}`;
    }

    function getCleanProfileText() {
      const card = getCleanProfileContainer();
      if (card) {
        const clone = card.cloneNode(true);
        const hudInClone = clone.querySelector('#st-wrapper');
        if (hudInClone) hudInClone.remove();
        return clone.innerText || '';
      }

      const wrapperEl = document.getElementById('st-wrapper');
      let text = '';
      for (const child of document.body.children) {
        if (child.id !== 'st-wrapper' && (!wrapperEl || !child.contains(wrapperEl))) {
          text += ' ' + (child.innerText || '');
        }
      }
      return text.trim();
    }

    // Visual neon card glow feedback
    function applyCardGlow(action) {
      const card = getCleanProfileContainer();
      if (!card) return;
      card.style.transition = 'box-shadow 0.2s ease, outline 0.2s ease';
      if (action === 'LIKE') {
        card.style.boxShadow = '0 0 28px rgba(74, 222, 128, 0.7)';
        card.style.outline = '2px solid #4ade80';
      } else {
        card.style.boxShadow = '0 0 28px rgba(248, 113, 113, 0.7)';
        card.style.outline = '2px solid #f87171';
      }
      setTimeout(() => {
        if (card) {
          card.style.boxShadow = '';
          card.style.outline = '';
        }
      }, 350);
    }

    // Live Activity Feed Logger
    function addActivityLog(action, name, age, reason) {
      const now = new Date();
      const time = now.toTimeString().split(' ')[0];
      const displayLabel = name ? (age ? `${name}, ${age}` : name) : 'Profile';
      activityLog.unshift({ action, label: displayLabel, reason, time });
      if (activityLog.length > 10) activityLog.pop();
      renderActivityFeed();
    }

    function renderActivityFeed() {
      if (!feedListEl) return;
      if (activityLog.length === 0) {
        feedListEl.innerHTML = '<span style="color: rgba(255,255,255,0.3); font-style: italic;">No decisions logged yet</span>';
        return;
      }
      feedListEl.innerHTML = activityLog.map(item => {
        const isLike = item.action === 'LIKE';
        const badgeColor = isLike ? '#4ade80' : '#f87171';
        const badgeIcon = isLike ? '✓' : '✗';
        return `
          <div style="display: flex; align-items: baseline; justify-content: space-between; font-size: 9px; line-height: 1.2; padding: 2px 4px; background: rgba(255,255,255,0.03); border-radius: 4px;">
            <div style="display: flex; align-items: center; gap: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 195px;">
              <span style="color: ${badgeColor}; font-weight: bold; font-size: 8px;">${badgeIcon}</span>
              <span style="font-weight: 700; color: #fff;">${item.label}</span>
              <span style="color: rgba(255,255,255,0.5); font-size: 8px;">${item.reason}</span>
            </div>
            <span style="color: rgba(255,255,255,0.3); font-size: 8px; flex-shrink: 0;">${item.time}</span>
          </div>
        `;
      }).join('');
    }

    // Cooldown Break System
    function triggerCooldownBreak() {
      if (!isLiking) return;
      isBreakActive = true;
      if (activeTimeoutId) clearTimeout(activeTimeoutId);

      let secondsLeft = Math.floor(Math.random() * 21) + 40; // 40 - 60s
      statusEl.textContent = `☕ Taking break (${secondsLeft}s)...`;
      skipBreakBtn.style.display = 'inline-block';

      breakTimerId = setInterval(() => {
        if (!isLiking || !isBreakActive) {
          clearInterval(breakTimerId);
          skipBreakBtn.style.display = 'none';
          return;
        }
        secondsLeft--;
        if (secondsLeft <= 0) {
          clearInterval(breakTimerId);
          isBreakActive = false;
          skipBreakBtn.style.display = 'none';
          statusEl.textContent = 'Break finished. Resuming...';
          activeTimeoutId = setTimeout(performSwipe, 1000);
        } else {
          statusEl.textContent = `☕ Taking break (${secondsLeft}s)...`;
        }
      }, 1000);
    }

    function skipCooldownBreak() {
      if (breakTimerId) clearInterval(breakTimerId);
      isBreakActive = false;
      skipBreakBtn.style.display = 'none';
      statusEl.textContent = 'Break skipped. Resuming...';
      activeTimeoutId = setTimeout(performSwipe, 800);
    }

    function evaluateProfileCriteria() {
      const card = getCleanProfileContainer();
      const details = extractProfileDetails(card);
      const profileText = getCleanProfileText();
      const lowerText = profileText.toLowerCase();

      // Record profile signature for change detection
      lastProfileIdentifier = getCleanProfileSignature();

      // A. Verified Only Check
      if (verifiedOnly && !details.isVerified) {
        return { action: 'PASS', reason: 'Unverified Profile', name: details.name, age: details.age };
      }

      // B. Age Range Limits Check
      if (details.age > 0) {
        if (minAge > 0 && details.age < minAge) {
          return { action: 'PASS', reason: `Age: ${details.age} < ${minAge} min`, name: details.name, age: details.age };
        }
        if (maxAge > 0 && details.age > maxAge) {
          return { action: 'PASS', reason: `Age: ${details.age} > ${maxAge} max`, name: details.name, age: details.age };
        }
      }

      // C. Bio Required Check
      if (requireBio && details.bio.length < 6) {
        return { action: 'PASS', reason: 'Bio Required (empty bio)', name: details.name, age: details.age };
      }

      // D. Check Negative Keywords / Blacklist (pronouns, identity tags, terms)
      for (const kw of savedKeywords) {
        const cleanKw = kw.trim().toLowerCase();
        if (!cleanKw) continue;

        // Regex with word boundaries for short words or direct match for phrases
        const hasWordBoundary = /^[a-z0-9]+$/i.test(cleanKw);
        const matched = hasWordBoundary 
          ? new RegExp(`(^|\\W)${escapeRegExp(cleanKw)}(\\W|$)`, 'i').test(lowerText)
          : lowerText.includes(cleanKw);

        if (matched) {
          return { action: 'PASS', reason: `Negative: "${kw}"`, name: details.name, age: details.age };
        }
      }

      // E. Check Max Distance
      if (maxDistance > 0) {
        const distMatch = lowerText.match(/(\d+)\s*(km|kilometers|miles|meilen)\s*(away|entfernt)?/i);
        if (distMatch) {
          const dist = parseInt(distMatch[1], 10);
          if (dist > maxDistance) {
            return { action: 'PASS', reason: `Distance: ${dist}km > ${maxDistance}km`, name: details.name, age: details.age };
          }
        }
      }

      // F. Random Pass Rate (if user set passRate > 0)
      if (passRate > 0 && Math.random() * 100 < passRate) {
        return { action: 'PASS', reason: `Random Pass (${passRate}%)`, name: details.name, age: details.age };
      }

      // G. All criteria passed -> LIKE
      return { action: 'LIKE', reason: 'Passed criteria', name: details.name, age: details.age };
    }

    // --- 11. Key & Action Dispatchers ---
    function dispatchKey(key, code, keyCode) {
      const opts = { key, code, keyCode, which: keyCode, bubbles: true, cancelable: true };
      const down = new KeyboardEvent('keydown', opts);
      const up = new KeyboardEvent('keyup', opts);

      if (document.activeElement && document.activeElement !== document.body && !document.activeElement.closest('#st-wrapper')) {
        document.activeElement.dispatchEvent(down);
      }
      document.body.dispatchEvent(down);
      window.dispatchEvent(down);

      setTimeout(() => {
        if (document.activeElement && document.activeElement !== document.body && !document.activeElement.closest('#st-wrapper')) {
          document.activeElement.dispatchEvent(up);
        }
        document.body.dispatchEvent(up);
        window.dispatchEvent(up);
      }, 50);
    }

    function triggerLike() {
      dispatchKey('ArrowRight', 'ArrowRight', 39);
    }

    function triggerPass() {
      dispatchKey('ArrowLeft', 'ArrowLeft', 37);
    }

    function clickLikeButtonFallback() {
      const selectors = [
        'button[aria-label*="Like" i]',
        'button[aria-label*="Gefällt mir" i]',
        'button[data-testid="gamepad-like"]',
        '.button[aria-label*="Like" i]'
      ];
      for (const sel of selectors) {
        const btn = document.querySelector(sel);
        if (btn && !btn.closest('#st-wrapper')) {
          try { btn.click(); return true; } catch (e) {}
        }
      }
      return false;
    }

    function clickPassButtonFallback() {
      const selectors = [
        'button[aria-label*="Nope" i]',
        'button[aria-label*="Pass" i]',
        'button[aria-label*="Nicht" i]',
        'button[data-testid="gamepad-pass"]'
      ];
      for (const sel of selectors) {
        const btn = document.querySelector(sel);
        if (btn && !btn.closest('#st-wrapper')) {
          try { btn.click(); return true; } catch (e) {}
        }
      }
      return false;
    }

    function hasGamepadButtons() {
      const selectors = [
        'button[aria-label*="Like" i]',
        'button[aria-label*="Gefällt mir" i]',
        'button[data-testid="gamepad-like"]',
        'button[aria-label*="Nope" i]',
        'button[aria-label*="Pass" i]',
        'button[data-testid="gamepad-pass"]'
      ];
      for (const sel of selectors) {
        const btn = document.querySelector(sel);
        if (btn && !btn.closest('#st-wrapper')) {
          return true;
        }
      }
      return false;
    }

    function findBackToExploreButton() {
      const elements = document.querySelectorAll('button, a, div[role="button"]');
      for (const el of elements) {
        if (el.closest('#st-wrapper')) continue;
        const text = (el.innerText || '').toLowerCase().trim();
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        if (text.includes('zurück zu explore') || text.includes('back to explore') || text.includes('go to explore') ||
            aria.includes('zurück zu explore') || aria.includes('back to explore') || aria.includes('go to explore')) {
          return el;
        }
      }
      return null;
    }

    function exitCategoryViewToExplore() {
      // 1. Prioritize explicit "Zurück zu Explore" button
      const exploreBtn = findBackToExploreButton();
      if (exploreBtn) {
        try { exploreBtn.click(); return true; } catch (e) {}
      }

      // 2. Category header close / back button (e.g. X button)
      const closeSelectors = [
        'button[aria-label*="Close" i]',
        'button[aria-label*="Schließen" i]',
        'button[aria-label*="Back" i]',
        'button[aria-label*="Zurück" i]',
        '[data-testid*="back" i]',
        '[data-testid*="close" i]'
      ];
      for (const sel of closeSelectors) {
        const btn = document.querySelector(sel);
        if (btn && !btn.closest('#st-wrapper')) {
          try {
            const clickable = btn.closest('button') || btn;
            clickable.click();
            return true;
          } catch (e) {}
        }
      }

      // 3. Fallback to client navigation to Explore
      return clientNavigate('/app/explore');
    }

    // --- Strict Empty Stack / Out of Profiles Verifier ---
    function isStackGenuinelyEmpty() {
      // 1. Direct detection: "Zurück zu Explore" / "Back to Explore" button is rendered
      if (findBackToExploreButton() !== null) {
        return true;
      }

      // 2. Check for empty stack / category messages across languages
      const pageText = getCleanProfileText().toLowerCase();
      const hasEmptyText = pageText.includes("there's no one new around you") ||
                           pageText.includes("there's no one new") ||
                           pageText.includes("niemanden neues in deiner umgebung") ||
                           pageText.includes("es gibt niemanden neues") ||
                           pageText.includes("out of potential matches") ||
                           pageText.includes("gibt gerade keine neuen members in deiner gegend") ||
                           pageText.includes("keine neuen members in deiner gegend") ||
                           pageText.includes("keine potentiellen matches in deiner gegend") ||
                           pageText.includes("keine potentiellen matches") ||
                           pageText.includes("erweiter den entfernungsradius") ||
                           pageText.includes("expand your search distance") ||
                           pageText.includes("no new members in your area") ||
                           pageText.includes("zurück zu explore") ||
                           pageText.includes("back to explore");

      if (hasEmptyText) {
        return true;
      }

      // 3. If genuine profile card container exists, stack is NOT empty!
      const card = getCleanProfileContainer();
      if (card) {
        return false;
      }

      // 4. Check if Tinder's beacon / radar animation is visible
      const isBeaconActive = document.querySelector('.beacon') !== null ||
                             document.querySelector('div[class*="beacon" i]') !== null ||
                             document.querySelector('[data-testid="radar"]') !== null;

      // 5. If no card and no gamepad buttons exist, screen is loading or empty
      const noGamepad = !hasGamepadButtons();

      return isBeaconActive || noGamepad;
    }

    // --- 12. Swiping Automation Loop ---
    async function performSwipe() {
      if (!isLiking || isBreakActive) return;

      // Check paywall
      if (checkPaywall()) {
        stopAutomation();
        statusEl.textContent = 'Paywall hit (out of likes). Stopped.';
        return;
      }

      // Dismiss any interfering popups
      dismissPopups();

      // Check if stack is empty or loading (with continuous 5-second debounce)
      if (isStackGenuinelyEmpty()) {
        const now = Date.now();
        if (!emptyCategoryStartTime) {
          emptyCategoryStartTime = now;
        }

        const elapsedMs = now - emptyCategoryStartTime;
        const elapsedSec = (elapsedMs / 1000).toFixed(1);

        if (elapsedMs < 5000) {
          statusEl.textContent = `Looking for profiles (${elapsedSec}s / 5.0s)...`;
          // Re-check frequently (600ms) without swiping to catch newly loaded cards or confirm empty
          activeTimeoutId = setTimeout(performSwipe, 600);
          return;
        }

        // Confirmed empty for 5 seconds straight! Transition to next category
        emptyCategoryStartTime = null;
        emptySwipeCount = 0;
        statusEl.textContent = 'Category empty (5s confirmed). Switching category...';
        addActivityLog('INFO', 'Category Empty', '', 'Exhausted (5s confirmed)');

        // Exit category view if inside one
        exitCategoryViewToExplore();

        activeTimeoutId = setTimeout(() => {
          handleEndOfStack('empty');
        }, 800);
        return;
      }

      // Genuine card present: reset continuous empty counter
      emptyCategoryStartTime = null;
      emptySwipeCount = 0;

      // Micro-inspection simulation (15% chance to view next photo briefly before deciding)
      if (Math.random() < 0.15) {
        dispatchKey('Space', 'Space', 32);
        await new Promise(r => setTimeout(r, 450 + Math.random() * 250));
      }

      // Evaluate profile against criteria
      const decision = evaluateProfileCriteria();
      const wasLike = decision.action === 'LIKE';

      // Visual feedback: apply neon card glow
      applyCardGlow(decision.action);

      if (wasLike) {
        triggerLike();
      } else {
        triggerPass();
      }

      // Check if card moved after 350ms; if keyboard didn't trigger it, invoke button fallback
      setTimeout(() => {
        if (!isLiking) return;

        let currentSig = getCleanProfileSignature();
        let cardMoved = (currentSig !== lastProfileIdentifier) && (lastProfileIdentifier !== '');

        if (!cardMoved) {
          if (wasLike) clickLikeButtonFallback();
          else clickPassButtonFallback();
        }

        // Wait another 350ms to allow card animation / DOM replacement to complete
        setTimeout(() => {
          if (!isLiking) return;

          currentSig = getCleanProfileSignature();
          cardMoved = (currentSig !== lastProfileIdentifier) && (lastProfileIdentifier !== '');

          if (cardMoved) {
            consecutiveMissedCardCount = 0;
            if (wasLike) {
              likeCount++;
              sessionStorage.setItem('st-likeCount', likeCount);
              counterEl.textContent = likeCount;
              compactLikes.textContent = likeCount;
            } else {
              passCount++;
              sessionStorage.setItem('st-passCount', passCount);
              passCounterEl.textContent = passCount;
              compactPasses.textContent = passCount;
            }

            currentCategorySwipes++;
            sessionStorage.setItem('st-catSwipes', currentCategorySwipes);
            catProgressEl.textContent = `${currentCategorySwipes} / ${maxSwipesPerCat}`;

            statusEl.textContent = wasLike ? `Liked (${decision.reason})` : `Passed (${decision.reason})`;

            // Record to live activity feed
            addActivityLog(decision.action, decision.name, decision.age, decision.reason);

            // Check human cooldown break
            if (humanCooldowns) {
              swipesSinceBreak++;
              if (swipesSinceBreak >= currentBreakTarget) {
                swipesSinceBreak = 0;
                currentBreakTarget = Math.floor(Math.random() * 11) + 20;
                triggerCooldownBreak();
                return;
              }
            }

            // Check category limit (only switch if multiple categories exist in queue/loop)
            const hasMultipleCategories = enabledCats.length > 1 || currentQueue.length > 1;
            if (currentCategorySwipes >= maxSwipesPerCat && hasMultipleCategories) {
              currentCategorySwipes = 0;
              sessionStorage.setItem('st-catSwipes', '0');
              statusEl.textContent = 'Category limit reached. Switching...';
              activeTimeoutId = setTimeout(() => handleEndOfStack('limit'), 1000);
              return;
            }
          } else {
            // Card didn't change: could be slow network, unresponsiveness, or stack just ran empty
            if (isStackGenuinelyEmpty()) {
              // Immediately route to performSwipe to manage the unified 5s continuous verification
              scheduleNextSwipe(350);
              return;
            }

            consecutiveMissedCardCount++;
            if (consecutiveMissedCardCount >= 4) {
              consecutiveMissedCardCount = 0;
              statusEl.textContent = 'Card unmoving. Retrying action...';
              dismissPopups();
              if (wasLike) clickLikeButtonFallback();
              else clickPassButtonFallback();
            }
          }

          scheduleNextSwipe();
        }, 350);
      }, 350);
    }

    function scheduleNextSwipe(customDelay = null) {
      if (!isLiking) return;
      if (activeTimeoutId) clearTimeout(activeTimeoutId);

      const delayMs = customDelay !== null 
        ? customDelay 
        : (speed * 1000) + (Math.random() * (randDelay * 1000));

      statusEl.textContent = `Next in ${(delayMs / 1000).toFixed(1)}s...`;
      activeTimeoutId = setTimeout(performSwipe, delayMs);
    }

    // --- 13. Client-Side SPA Navigation Engine (Zero Page Reloads) ---
    function clientNavigate(targetPath) {
      if (window.location.pathname === targetPath) return true;

      let targetLink = null;
      if (targetPath.includes('/recs')) {
        targetLink = document.querySelector(
          'a[href*="/app/recs"], a[href$="/recs"], a[href="/app"], a[aria-label*="Recs" i], a[aria-label*="Matches" i], a[aria-label*="Tinder" i]'
        );
      } else if (targetPath.includes('/explore')) {
        // 1. Check "Zurück zu Explore" button
        const exploreBackBtn = findBackToExploreButton();
        if (exploreBackBtn) {
          try { exploreBackBtn.click(); return true; } catch (e) {}
        }

        // 2. Back / Close button check if inside a category stack
        const backBtn = document.querySelector(
          'button[aria-label*="Back" i], button[aria-label*="Zurück" i], a[aria-label*="Back" i], a[aria-label*="Zurück" i], button[aria-label*="Close" i], button[aria-label*="Schließen" i], [data-testid*="back" i], [data-testid*="close" i]'
        );
        if (backBtn && !backBtn.closest('#st-wrapper')) {
          try { backBtn.click(); return true; } catch (e) {}
        }
        targetLink = document.querySelector(
          'a[href*="/app/explore"], a[href$="/explore"], a[aria-label*="Explore" i], a[aria-label*="Entdecken" i]'
        );
      } else {
        targetLink = document.querySelector(`a[href*="${targetPath}"]`);
      }

      if (targetLink && !targetLink.closest('#st-wrapper')) {
        try {
          targetLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return true;
        } catch (e) {
          try { targetLink.click(); return true; } catch (err) {}
        }
      }

      // React Router / HTML5 history fallback (never triggers a page reload)
      try {
        window.history.pushState(null, '', targetPath);
        window.dispatchEvent(new PopStateEvent('popstate'));
        return true;
      } catch (e) {
        return false;
      }
    }

    function findCategoryTile(catTitle) {
      const normTitle = catTitle.toLowerCase().trim();
      const slug = normTitle.replace(/[^a-z0-9]+/g, '-');
      const candidates = Array.from(document.querySelectorAll('a, button, div[role="button"], div[class*="explore" i]'));

      for (const el of candidates) {
        if (el.closest('#st-wrapper')) continue;

        // Check href slug
        const href = (el.getAttribute('href') || '').toLowerCase();
        if (href && href.includes(slug)) return el;

        // Check headings or text content
        const heading = el.querySelector('h1, h2, h3, h4, span, div');
        const text = (heading ? heading.innerText : el.innerText || '').toLowerCase().trim();
        if (text === normTitle || text.startsWith(normTitle) || (normTitle.length > 4 && text.includes(normTitle))) {
          return el;
        }
      }
      return null;
    }

    async function diveIntoCategory(catTitle) {
      statusEl.textContent = `Opening ${catTitle}...`;

      // If currently inside a category modal / empty category view, exit back to explore grid first
      if (findBackToExploreButton() || window.location.pathname.length > '/app/explore'.length + 1) {
        exitCategoryViewToExplore();
        await new Promise(r => setTimeout(r, 1200));
      } else if (!window.location.pathname.includes('/explore')) {
        clientNavigate('/app/explore');
        await new Promise(r => setTimeout(r, 1200));
      }

      // Retry search for tile over several attempts, scrolling if needed
      let targetBtn = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        targetBtn = findCategoryTile(catTitle);
        if (targetBtn) break;

        // Smooth scroll Explore page to reveal more tiles
        const scroller = document.querySelector('main') || document.querySelector('#main-content') || window;
        if (typeof scroller.scrollBy === 'function') {
          scroller.scrollBy({ top: 300, behavior: 'smooth' });
        }
        await new Promise(r => setTimeout(r, 600));
      }

      if (targetBtn) {
        try {
          targetBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        } catch (e) {
          try { targetBtn.click(); } catch (err) {}
        }

        statusEl.textContent = `Swiping in ${catTitle}...`;
        activeTimeoutId = setTimeout(() => {
          if (isLiking) performSwipe();
        }, 2500);
      } else {
        statusEl.textContent = `Category "${catTitle}" not found in Explore.`;
        // Delay before moving to next item so user sees status and no rapid-fire loop occurs
        activeTimeoutId = setTimeout(() => handleEndOfStack('not_found'), 2500);
      }
    }

    function handleEndOfStack(reason = 'empty') {
      if (!isLiking) return;
      if (activeTimeoutId) clearTimeout(activeTimeoutId);

      if (reason === 'limit') {
        loopHasProfiles = true;
      }

      currentQueue.shift();
      updateQueueVisuals();

      if (currentQueue.length === 0) {
        if (autoLoop && enabledCats.length > 0) {
          currentQueue = [...enabledCats];
          sessionStorage.setItem('st-queue', JSON.stringify(currentQueue));
          updateQueueVisuals();

          if (loopHasProfiles) {
            statusEl.textContent = 'Looping categories...';
            loopHasProfiles = false;
            activeTimeoutId = setTimeout(() => navigateToItem(currentQueue[0]), 2000);
          } else {
            statusEl.textContent = 'All stacks empty. Waiting 5m...';
            activeTimeoutId = setTimeout(() => navigateToItem(currentQueue[0]), 5 * 60 * 1000);
          }
        } else {
          stopAutomation();
          statusEl.textContent = 'Queue finished.';
        }
      } else {
        sessionStorage.setItem('st-queue', JSON.stringify(currentQueue));
        statusEl.textContent = `Switching to ${formatQueueName(currentQueue[0])}...`;
        activeTimeoutId = setTimeout(() => navigateToItem(currentQueue[0]), 1500);
      }
    }

    function navigateToItem(item) {
      currentCategorySwipes = 0;
      emptyCategoryStartTime = null;
      sessionStorage.setItem('st-catSwipes', '0');
      catProgressEl.textContent = `0 / ${maxSwipesPerCat}`;

      if (item === '/app/recs') {
        statusEl.textContent = 'Navigating to Normal Recs...';
        clientNavigate('/app/recs');
        activeTimeoutId = setTimeout(() => {
          if (isLiking) {
            statusEl.textContent = 'Swiping in Normal Recs...';
            performSwipe();
          }
        }, 2200);
        return;
      }

      // Explore category
      diveIntoCategory(item);
    }

    // --- 14. Explore Page Auto-Scanner ---
    function runAutoScan() {
      statusEl.textContent = 'Scanning categories...';
      const elements = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      let newCats = [];

      elements.forEach(el => {
        if (el.closest('#st-wrapper')) return;
        const heading = el.querySelector('h3, h2, h1');
        if (heading && heading.innerText) {
          const title = heading.innerText.trim();
          if (title.length > 2 && !newCats.includes(title) && !title.toLowerCase().includes('smart tinder')) {
            newCats.push(title);
          }
        }
      });

      if (newCats.length > 0) {
        savedCategories = newCats;
        setStored('st-categories', savedCategories);
        renderCategories();
        statusEl.textContent = `Discovered ${newCats.length} categories!`;
      } else {
        statusEl.textContent = 'No categories found on this page.';
      }
    }

    scanBtn.addEventListener('click', async () => {
      if (!window.location.pathname.includes('/explore')) {
        statusEl.textContent = 'Navigating to Explore...';
        clientNavigate('/app/explore');
        await new Promise(r => setTimeout(r, 2000));
      }
      runAutoScan();
    });

    // --- 15. Start & Stop Controls ---
    function startAutomation() {
      isLiking = true;
      sessionStorage.setItem('st-isLiking', 'true');
      if (activeTimeoutId) clearTimeout(activeTimeoutId);

      // Initialize queue if empty
      if (currentQueue.length === 0) {
        currentQueue = enabledCats.length > 0 ? [...enabledCats] : ['/app/recs'];
        sessionStorage.setItem('st-queue', JSON.stringify(currentQueue));
        loopHasProfiles = false;
        updateQueueVisuals();

        const firstItem = currentQueue[0];
        if (firstItem === '/app/recs' && !window.location.pathname.includes('/recs')) {
          navigateToItem(firstItem);
          return;
        } else if (firstItem !== '/app/recs' && !window.location.pathname.includes('/explore')) {
          navigateToItem(firstItem);
          return;
        }
      }

      // UI state
      startBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      startBtn.style.boxShadow = 'none';
      startBtn.disabled = true;

      stopBtn.style.background = 'rgba(255, 75, 75, 0.25)';
      stopBtn.style.color = '#ff4b4b';
      stopBtn.disabled = false;

      compactToggleRun.textContent = '⏸️';
      emptySwipeCount = 0;
      emptyCategoryStartTime = null;
      consecutiveMissedCardCount = 0;
      statusEl.textContent = 'Starting swiping engine...';
      updateQueueVisuals();

      activeTimeoutId = setTimeout(performSwipe, 1500);
    }

    function stopAutomation() {
      isLiking = false;
      emptyCategoryStartTime = null;
      sessionStorage.setItem('st-isLiking', 'false');
      sessionStorage.removeItem('st-queue');
      currentQueue = [];
      updateQueueVisuals();

      if (activeTimeoutId) clearTimeout(activeTimeoutId);

      startBtn.style.background = 'linear-gradient(45deg, #00C853, #64DD17)';
      startBtn.style.boxShadow = '0 4px 12px rgba(0, 200, 83, 0.3)';
      startBtn.disabled = false;

      stopBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      stopBtn.style.color = '#fff';
      stopBtn.disabled = true;

      compactToggleRun.textContent = '▶️';
      statusEl.textContent = 'Paused.';
    }

    startBtn.addEventListener('click', startAutomation);
    stopBtn.addEventListener('click', stopAutomation);

    // Auto-resume swiping if was active prior to session start
    if (isLiking) {
      setTimeout(() => {
        if (isLiking) performSwipe();
      }, 2000);
    }
  }

  // Polling to mount on Tinder SPA load
  initTimer = setInterval(initSmartTinder, 1000);
  initSmartTinder();
})();
