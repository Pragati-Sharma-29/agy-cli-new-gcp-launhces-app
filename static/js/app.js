// Initialize theme as early as possible to avoid page flashing
const savedTheme = localStorage.getItem('theme') || 'dark';
document.body.setAttribute('data-theme', savedTheme);

// State variables
let releaseNotesData = [];
let activeFilters = {
    search: '',
    type: 'all',
    sort: 'desc'
};

// Elements
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const btnRefresh = document.getElementById('btn-refresh');
const searchInput = document.getElementById('search-input');
const btnClearSearch = document.getElementById('btn-clear-search');
const filterType = document.getElementById('filter-type');
const sortOrder = document.getElementById('sort-order');
const timelineEvents = document.getElementById('timeline-events');

// Stats Elements
const statTotalDays = document.querySelector('#stat-total-days .stat-value');
const statTotalUpdates = document.querySelector('#stat-total-updates .stat-value');
const statFeatures = document.querySelector('#stat-features .stat-value');
const statFixes = document.querySelector('#stat-fixes .stat-value');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const btnModalClose = document.getElementById('modal-close');
const btnModalCancel = document.getElementById('modal-btn-cancel');
const btnModalTweet = document.getElementById('modal-btn-tweet');
const textareaTweet = document.getElementById('tweet-text');
const charCount = document.getElementById('char-count');
const previewDateBadge = document.getElementById('preview-date-badge');
const previewTypeBadge = document.getElementById('preview-type-badge');
const previewTextContent = document.getElementById('preview-text-content');

// Active tweet meta to compile
let currentTweetMeta = null;

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // Update Theme Toggle UI
    const activeTheme = document.body.getAttribute('data-theme') || 'dark';
    updateToggleUI(activeTheme);

    fetchReleaseNotes();
    setupEventListeners();
});

/* ==========================================================================
   EVENT LISTENERS Setup
   ========================================================================== */
function setupEventListeners() {
    // Theme toggle click
    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateToggleUI(newTheme);
        });
    }

    // Refresh click
    btnRefresh.addEventListener('click', () => {
        fetchReleaseNotes();
    });

    // Live search
    searchInput.addEventListener('input', (e) => {
        activeFilters.search = e.target.value.toLowerCase().stripAndClean();
        btnClearSearch.style.display = activeFilters.search ? 'block' : 'none';
        renderTimeline();
    });

    // Clear search
    btnClearSearch.addEventListener('click', () => {
        searchInput.value = '';
        activeFilters.search = '';
        btnClearSearch.style.display = 'none';
        renderTimeline();
    });

    // Category filter
    filterType.addEventListener('change', (e) => {
        activeFilters.type = e.target.value;
        renderTimeline();
    });

    // Sort order
    sortOrder.addEventListener('change', (e) => {
        activeFilters.sort = e.target.value;
        renderTimeline();
    });

    // Close Modal events
    btnModalClose.addEventListener('click', closeModal);
    btnModalCancel.addEventListener('click', closeModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeModal();
    });

    // Textarea input for character count
    textareaTweet.addEventListener('input', () => {
        updateCharCount();
    });

    // Actual tweet action
    btnModalTweet.addEventListener('click', () => {
        const text = textareaTweet.value;
        if (text.length > 280) {
            showToast('Tweet exceeds 280 characters limit!', 'error');
            return;
        }
        
        // Open Twitter Web Intent
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
        closeModal();
        showToast('Opening Twitter Share Dialog...', 'success');
    });

    // Interactive KPI Stats Filtering
    const cardFeatures = document.getElementById('stat-features');
    const cardFixes = document.getElementById('stat-fixes');
    const cardTotalUpdates = document.getElementById('stat-total-updates');
    const cardTotalDays = document.getElementById('stat-total-days');

    if (cardFeatures) {
        cardFeatures.addEventListener('click', () => {
            filterType.value = 'Feature';
            filterType.dispatchEvent(new Event('change'));
            showToast('Filtering: Features only', 'success');
        });
    }
    if (cardFixes) {
        cardFixes.addEventListener('click', () => {
            filterType.value = 'Fixed';
            filterType.dispatchEvent(new Event('change'));
            showToast('Filtering: Fixes & Changes', 'success');
        });
    }
    if (cardTotalUpdates || cardTotalDays) {
        const resetFilter = () => {
            filterType.value = 'all';
            filterType.dispatchEvent(new Event('change'));
            showToast('Feed filter reset to show all types', 'success');
        };
        if (cardTotalUpdates) cardTotalUpdates.addEventListener('click', resetFilter);
        if (cardTotalDays) cardTotalDays.addEventListener('click', resetFilter);
    }
}

// Utility prototype method
String.prototype.stripAndClean = function() {
    return this.trim().replace(/\s+/g, ' ');
};

/* ==========================================================================
   API FETCH logic
   ========================================================================== */
async function fetchReleaseNotes() {
    // Start spinner animation
    const icon = btnRefresh.querySelector('.btn-icon i');
    icon.classList.add('spinning');
    btnRefresh.disabled = true;

    // Show loading state in UI
    timelineEvents.innerHTML = `
        <div class="loading-state">
            <div class="pulse-loader"></div>
            <p>Fetching BigQuery release notes...</p>
        </div>
    `;

    try {
        const response = await fetch('/api/release-notes');
        const data = await response.json();

        if (data.status === 'success') {
            releaseNotesData = data.entries;
            calculateDashboardStats();
            renderTimeline();
            showToast('Release notes successfully refreshed!', 'success');
        } else {
            throw new Error(data.message || 'Failed to parse RSS feed.');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        timelineEvents.innerHTML = `
            <div class="error-state">
                <div class="error-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <div class="state-title">Unable to Load Feed</div>
                <div class="state-desc">${error.message || 'The Google Cloud feed is currently unreachable.'}</div>
            </div>
        `;
        showToast('Failed to refresh feed.', 'error');
    } finally {
        // Stop spinner
        icon.classList.remove('spinning');
        btnRefresh.disabled = false;
    }
}

/* ==========================================================================
   STATS CALCULATIONS
   ========================================================================== */
function calculateDashboardStats() {
    let days = releaseNotesData.length;
    let totalUpdates = 0;
    let featuresCount = 0;
    let otherCount = 0;

    releaseNotesData.forEach(entry => {
        totalUpdates += entry.updates.length;
        entry.updates.forEach(u => {
            if (u.type.toLowerCase() === 'feature') {
                featuresCount++;
            } else {
                otherCount++;
            }
        });
    });

    statTotalDays.textContent = days;
    statTotalUpdates.textContent = totalUpdates;
    statFeatures.textContent = featuresCount;
    statFixes.textContent = otherCount;
}

/* ==========================================================================
   DYNAMIC RENDERING logic
   ========================================================================== */
function renderTimeline() {
    // 1. Apply filtering & search
    let filteredEntries = JSON.parse(JSON.stringify(releaseNotesData)); // Deep copy to safely modify inside

    filteredEntries.forEach(entry => {
        // Filter sub-updates of each day
        entry.updates = entry.updates.filter(update => {
            const matchesType = activeFilters.type === 'all' || update.type.toLowerCase() === activeFilters.type.toLowerCase();
            const matchesSearch = !activeFilters.search || 
                update.text.toLowerCase().includes(activeFilters.search) || 
                update.type.toLowerCase().includes(activeFilters.search) || 
                entry.date.toLowerCase().includes(activeFilters.search);
            return matchesType && matchesSearch;
        });
    });

    // Remove entries that ended up with empty updates after filtering
    filteredEntries = filteredEntries.filter(entry => entry.updates.length > 0);

    // 2. Sort entries by date
    filteredEntries.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return activeFilters.sort === 'desc' ? dateB - dateA : dateA - dateB;
    });

    // 3. Render
    if (filteredEntries.length === 0) {
        timelineEvents.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
                <div class="state-title">No matches found</div>
                <div class="state-desc">Try clearing the search or choosing a different filter category.</div>
            </div>
        `;
        return;
    }

    let html = '';
    filteredEntries.forEach(entry => {
        html += `
            <div class="timeline-node">
                <div class="timeline-dot"></div>
                <div class="timeline-content-card">
                    <div class="date-header">
                        <span>${entry.date}</span>
                        <a href="${entry.link}" target="_blank" rel="noopener noreferrer" class="date-header-anchor" title="View official release page">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                    </div>
                    <div class="updates-list">
                        ${entry.updates.map((update, index) => renderUpdateItem(update, entry.date, entry.link)).join('')}
                    </div>
                </div>
            </div>
        `;
    });

    timelineEvents.innerHTML = html;
}

function renderUpdateItem(update, date, link) {
    const typeClass = update.type.toLowerCase();
    
    // Select visual badge based on category
    let badgeIcon = 'fa-solid fa-circle-info';
    let badgeClass = 'badge-general';
    
    if (typeClass === 'feature') {
        badgeIcon = 'fa-solid fa-star';
        badgeClass = 'badge-feature';
    } else if (typeClass === 'fixed') {
        badgeIcon = 'fa-solid fa-screwdriver-wrench';
        badgeClass = 'badge-fixed';
    } else if (typeClass === 'changed') {
        badgeIcon = 'fa-solid fa-pen-to-square';
        badgeClass = 'badge-changed';
    } else if (typeClass === 'deprecated') {
        badgeIcon = 'fa-solid fa-ban';
        badgeClass = 'badge-deprecated';
    }

    // Escape text double-quotes for the inline attribute trigger
    const escapedText = update.text.replace(/"/g, '&quot;');
    const escapedType = update.type.replace(/"/g, '&quot;');
    const escapedDate = date.replace(/"/g, '&quot;');
    const escapedLink = link.replace(/"/g, '&quot;');

    return `
        <div class="update-item ${typeClass}">
            <div class="update-item-header">
                <span class="badge ${badgeClass}">
                    <i class="${badgeIcon}"></i> ${update.type}
                </span>
                <div class="update-actions-wrapper">
                    <button class="btn-action-inline" 
                            onclick="copyUpdateMarkdown('${escapedDate}', '${escapedType}', '${escapedText}', '${escapedLink}', this)" 
                            title="Copy update as Markdown to clipboard">
                        <i class="fa-regular fa-copy"></i> Copy Markdown
                    </button>
                    <button class="btn-action-inline" 
                            onclick="openTweetBuilder('${escapedDate}', '${escapedType}', '${escapedText}', '${escapedLink}')" 
                            title="Tweet about this update">
                        <i class="fa-brands fa-x-twitter"></i> Share
                    </button>
                </div>
            </div>
            <div class="update-item-body">
                ${update.html}
            </div>
        </div>
    `;
}

/* ==========================================================================
   TWEET BUILDER MODAL & TWITTER INTENTS
   ========================================================================== */
function openTweetBuilder(date, type, text, link) {
    currentTweetMeta = { date, type, text, link };
    
    // Populate Preview Boxes
    previewDateBadge.textContent = date;
    previewTypeBadge.textContent = type;
    previewTextContent.textContent = text;
    
    // Create Smartly-truncated Default Tweet Content
    const prefix = `🚀 Google Cloud BigQuery Update (${date})\nCategory: #${type}\n\n`;
    const suffix = `\n\nRead official docs: ${link}`;
    
    // Limit to ensure safety within 280 chars total
    const constantLen = prefix.length + suffix.length;
    const maxBodyLen = 280 - constantLen - 4; // 4 for "..." and padding
    
    let mainBody = text;
    if (mainBody.length > maxBodyLen) {
        mainBody = mainBody.substring(0, maxBodyLen) + "...";
    }
    
    textareaTweet.value = `${prefix}${mainBody}${suffix}`;
    
    // Open modal
    tweetModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // prevent scrolling underneath
    
    updateCharCount();
}

function closeModal() {
    tweetModal.style.display = 'none';
    document.body.style.overflow = 'auto'; // restore scroll
    currentTweetMeta = null;
}

function updateCharCount() {
    const len = textareaTweet.value.length;
    charCount.textContent = len;
    
    if (len > 280) {
        charCount.parentElement.classList.add('exceeded');
    } else {
        charCount.parentElement.classList.remove('exceeded');
    }
}

/* ==========================================================================
   TOAST NOTIFICATION COMPONENT
   ========================================================================== */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-solid fa-circle-check';
    if (type === 'error') {
        iconClass = 'fa-solid fa-circle-xmark';
    }
    
    toast.innerHTML = `
        <i class="${iconClass}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Smooth fadeout and removal
    setTimeout(() => {
        toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(15px)';
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 3500);
}

/* ==========================================================================
   THEME TOGGLE UI UPDATE
   ========================================================================== */
function updateToggleUI(theme) {
    if (!btnThemeToggle) return;
    const icon = btnThemeToggle.querySelector('.btn-icon i');
    const text = btnThemeToggle.querySelector('.btn-text');
    if (!icon || !text) return;
    
    if (theme === 'light') {
        icon.className = 'fa-solid fa-moon';
        text.textContent = 'Dark Mode';
    } else {
        icon.className = 'fa-solid fa-sun';
        text.textContent = 'Light Mode';
    }
}

/* ==========================================================================
   CLIPBOARD SHARING & MARKDOWN EXPORT
   ========================================================================== */
function copyUpdateMarkdown(date, type, text, link, button) {
    const markdown = `### Google Cloud BigQuery Update (${date})\n**Category**: ${type}\n\n${text}\n\n[Official Release Notes](${link})`;
    
    navigator.clipboard.writeText(markdown).then(() => {
        // Provide instant tactile visual feedback in button
        const originalHTML = button.innerHTML;
        button.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--color-feature)"></i> Copied!`;
        button.disabled = true;
        
        showToast('Update Markdown copied to clipboard!', 'success');
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.disabled = false;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy update.', 'error');
    });
}
