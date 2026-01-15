// App State
let currentIndex = 0;
let isTyping = false;
let abortTyping = false;  // 用於中斷打字動畫
let started = false;
let letterContent = '';
let currentTab = 'timeline';
let loadedTabs = { timeline: true };

// DOM Elements
const terminalBody = document.getElementById('terminal-body');
const conversationEl = document.getElementById('conversation');
const progressEl = document.getElementById('progress');
const welcomeMessage = document.querySelector('.welcome-message');

// Tab content sources
const tabSources = {
  patterns: 'AI-COLLABORATION-PATTERNS.md',
  trust: 'CLI-TRUST-ANALYSIS.md',
  letter: 'letter.md'
};

// Load letter content from markdown file (for timeline embed)
async function loadLetterContent() {
  try {
    const response = await fetch('letter.md');
    const markdown = await response.text();
    // Remove the H1 title since we have section header
    letterContent = marked.parse(markdown.replace(/^# .+\n\n/, ''));
  } catch (error) {
    console.error('Error loading letter:', error);
    letterContent = '<p>無法載入情書內容</p>';
  }
}

// Load markdown content for a tab
async function loadTabContent(tabName) {
  if (loadedTabs[tabName]) return;

  const source = tabSources[tabName];
  if (!source) return;

  // Letter tab uses .love-letter, others use .markdown-content
  const selector = tabName === 'letter'
    ? `#${tabName}-content .love-letter`
    : `#${tabName}-content .markdown-content`;
  const contentEl = document.querySelector(selector);
  if (!contentEl) return;

  try {
    // Add cache-busting to avoid stale content
    const response = await fetch(source + '?_=' + Date.now());
    const markdown = await response.text();
    contentEl.innerHTML = marked.parse(markdown);

    // Render mermaid diagrams
    const mermaidEls = contentEl.querySelectorAll('.language-mermaid');
    for (const el of mermaidEls) {
      const code = el.textContent;
      const container = document.createElement('div');
      container.className = 'mermaid-container';
      const { svg } = await mermaid.render('mermaid-' + Date.now(), code);
      container.innerHTML = svg;
      el.parentElement.replaceWith(container);
    }

    loadedTabs[tabName] = true;
  } catch (error) {
    console.error(`Error loading ${tabName}:`, error);
    contentEl.innerHTML = '<p>無法載入內容</p>';
  }
}

// Switch tab
function switchTab(tabName) {
  if (currentTab === tabName) return;

  // Update tab buttons
  document.querySelectorAll('.terminal-tabs .tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-content`);
  });

  // Load content if needed
  loadTabContent(tabName);

  // Scroll to top
  terminalBody.scrollTop = 0;

  // Update footer based on tab
  updateFooterForTab(tabName);

  currentTab = tabName;
}

// Update footer for different tabs
function updateFooterForTab(tabName) {
  const instructionEl = document.querySelector('.terminal-footer .instruction');
  const jumpBtn = document.getElementById('jump-results');
  if (tabName === 'timeline') {
    progressEl.style.display = '';
    jumpBtn.style.display = '';
    instructionEl.textContent = '點擊或按 Enter 繼續';
  } else {
    progressEl.style.display = 'none';
    jumpBtn.style.display = 'none';
    instructionEl.textContent = '滾動閱讀 · 點擊分頁切換視角';
  }
}

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#4ec9b0',
    primaryTextColor: '#d4d4d4',
    primaryBorderColor: '#4ec9b0',
    lineColor: '#888',
    secondaryColor: '#2d2d2d',
    tertiaryColor: '#1e1e1e',
    background: '#1e1e1e',
    mainBkg: '#2d2d2d',
    nodeBorder: '#4ec9b0',
    clusterBkg: '#2d2d2d',
    clusterBorder: '#4ec9b0',
    titleColor: '#4ec9b0',
    edgeLabelBackground: '#2d2d2d'
  }
});

// Initialize
async function init() {
  await loadLetterContent();
  updateProgress();

  // Tab click handlers
  document.querySelectorAll('.terminal-tabs .tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      switchTab(tab.dataset.tab);
    });
  });

  // Click to advance (only for timeline tab)
  document.addEventListener('click', (e) => {
    // Ignore clicks on tabs
    if (e.target.closest('.terminal-tabs')) return;
    // Only advance on timeline tab
    if (currentTab === 'timeline') {
      handleAdvance();
    }
  });

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    // Tab switching with number keys
    if (e.key === '1') { switchTab('timeline'); return; }
    if (e.key === '2') { switchTab('patterns'); return; }
    if (e.key === '3') { switchTab('trust'); return; }
    if (e.key === '4') { switchTab('letter'); return; }

    // G = jump to results (timeline only)
    if ((e.key === 'g' || e.key === 'G') && currentTab === 'timeline') {
      e.preventDefault();
      jumpToResults();
      return;
    }

    // Enter / Space / Arrow Down = next message (timeline only)
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentTab === 'timeline') {
        handleAdvance();
      } else {
        terminalBody.scrollBy({ top: 100, behavior: 'smooth' });
      }
    }
    // Arrow Up = scroll up a bit
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      terminalBody.scrollBy({ top: -100, behavior: 'smooth' });
    }
    // Page Down = jump to next section (timeline) or scroll more (others)
    if (e.key === 'PageDown') {
      e.preventDefault();
      if (currentTab === 'timeline') {
        scrollToNextSection();
      } else {
        terminalBody.scrollBy({ top: 400, behavior: 'smooth' });
      }
    }
    // Page Up = jump to previous section (timeline) or scroll more (others)
    if (e.key === 'PageUp') {
      e.preventDefault();
      if (currentTab === 'timeline') {
        scrollToPreviousSection();
      } else {
        terminalBody.scrollBy({ top: -400, behavior: 'smooth' });
      }
    }
  });

  // Mouse wheel: normal scrolling (no override)

  // Jump to results button
  document.getElementById('jump-results').addEventListener('click', (e) => {
    e.stopPropagation();
    jumpToResults();
  });
}

function handleAdvance() {
  if (isTyping) return;

  if (!started) {
    startConversation();
    return;
  }

  if (currentIndex < conversationData.length) {
    advanceToNextSection();
  }
}

function startConversation() {
  started = true;
  welcomeMessage.style.display = 'none';
  conversationEl.classList.add('active');
  advanceToNextSection();
}

function showNextMessage() {
  if (currentIndex >= conversationData.length) return;

  const msg = conversationData[currentIndex];
  const messageEl = createMessageElement(msg);
  conversationEl.appendChild(messageEl);

  // Trigger animation
  requestAnimationFrame(() => {
    messageEl.classList.add('visible');
  });

  // Type the content
  const contentEl = messageEl.querySelector('.content, .tip-content, .section-header');
  if (contentEl && msg.type !== 'code' && msg.type !== 'table' && msg.type !== 'letter' && msg.type !== 'narration') {
    typeText(contentEl, msg.text || msg.content || '');
  }

  // Narration: show with line breaks (no typing effect for multi-line)
  const narrationEl = messageEl.querySelector('.narration');
  if (narrationEl && msg.type === 'narration') {
    const text = msg.text || '';
    if (text.includes('\n')) {
      narrationEl.innerHTML = text.replace(/\n/g, '<br>');
    } else {
      typeText(narrationEl, text);
    }
  }

  // Letter content is pre-rendered from markdown in createMessageElement

  // Scroll to bottom
  scrollToBottom();

  currentIndex++;
  updateProgress();
}

function createMessageElement(msg) {
  const div = document.createElement('div');
  div.className = 'message';

  switch (msg.type) {
    case 'section':
      // Detect if section title starts with timestamp (e.g., "11:01", "12:30")
      const isTimestamp = /^\d{1,2}:\d{2}/.test(msg.text);
      const sectionClass = isTimestamp ? 'section-header timestamp' : 'section-header other';
      div.innerHTML = `<div class="${sectionClass}"></div>`;
      break;

    case 'me':
      div.innerHTML = `
        <div class="speaker me"></div>
        <div class="content"></div>
      `;
      break;

    case 'wife':
      div.innerHTML = `
        <div class="speaker wife"></div>
        <div class="content"></div>
      `;
      break;

    case 'narration':
      div.innerHTML = `<div class="narration"></div>`;
      break;

    case 'code':
      div.innerHTML = `<pre class="code-block">${escapeHtml(msg.text)}</pre>`;
      break;

    case 'tip':
      div.innerHTML = `
        <div class="tip-box">
          <div class="tip-title">${msg.title}</div>
          <div class="tip-content"></div>
        </div>
      `;
      break;

    case 'table':
      div.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead><tr>${msg.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${msg.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>
      `;
      break;

    case 'letter':
      div.id = 'letter';  // 錨點
      div.innerHTML = `<div class="love-letter">${letterContent}</div>`;
      break;

    case 'end':
      div.innerHTML = `
        <div class="end-screen">
          <h2>— THE END —</h2>
          <div class="stats">
            ${msg.text}
          </div>
          <div class="restart-hint">按 F5 重新開始</div>
        </div>
      `;
      break;

    default:
      div.innerHTML = `<div class="content">${msg.text}</div>`;
  }

  return div;
}

function typeText(element, text, speed = 15) {
  isTyping = true;
  let i = 0;
  element.innerHTML = '';

  // Add cursor
  const cursor = document.createElement('span');
  cursor.className = 'typing-cursor';
  element.appendChild(cursor);

  function type() {
    // 檢查是否被中斷
    if (abortTyping) {
      cursor.remove();
      element.textContent = text;
      isTyping = false;
      return;
    }

    if (i < text.length) {
      // Insert text before cursor
      const textNode = document.createTextNode(text.charAt(i));
      element.insertBefore(textNode, cursor);
      i++;
      scrollToBottom();
      setTimeout(type, speed);
    } else {
      // Remove cursor when done
      cursor.remove();
      isTyping = false;
    }
  }

  type();
}

function scrollToBottom() {
  terminalBody.scrollTop = terminalBody.scrollHeight;
}

function scrollToPreviousSection() {
  const sections = conversationEl.querySelectorAll('.message.visible .section-header');
  if (sections.length < 1) return;

  const currentScroll = terminalBody.scrollTop;

  // Find previous section header
  for (let i = sections.length - 1; i >= 0; i--) {
    const sectionTop = sections[i].closest('.message').offsetTop - 20;
    if (sectionTop < currentScroll - 30) {
      terminalBody.scrollTo({ top: sectionTop, behavior: 'smooth' });
      return;
    }
  }

  // If no previous section, scroll to top
  terminalBody.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToNextSection() {
  const sections = conversationEl.querySelectorAll('.message.visible .section-header');
  const currentScroll = terminalBody.scrollTop;

  // Find next section header
  for (let i = 0; i < sections.length; i++) {
    const sectionTop = sections[i].closest('.message').offsetTop - 20;
    if (sectionTop > currentScroll + 50) {
      terminalBody.scrollTo({ top: sectionTop, behavior: 'smooth' });
      return;
    }
  }

  // No next section visible - advance conversation until we hit next section
  advanceToNextSection();
}

function advanceToNextSection() {
  if (currentIndex >= conversationData.length) {
    scrollToBottom();
    return;
  }

  // Collect all messages until next section
  const messagesToShow = [];
  let i = currentIndex;

  // Include section header if current message is one
  if (conversationData[i].type === 'section') {
    messagesToShow.push(conversationData[i]);
    i++;
  }

  // Collect messages until next section
  while (i < conversationData.length && conversationData[i].type !== 'section') {
    messagesToShow.push(conversationData[i]);
    i++;
  }

  // Show messages with typing effect, one after another
  showMessagesWithAnimation(messagesToShow);
}

function showMessagesWithAnimation(messages, index = 0) {
  if (index >= messages.length) {
    isTyping = false;
    return;
  }

  isTyping = true;
  const msg = messages[index];
  const messageEl = createMessageElement(msg);
  conversationEl.appendChild(messageEl);

  requestAnimationFrame(() => {
    messageEl.classList.add('visible');
  });

  currentIndex++;
  updateProgress();

  // Get the element to type into
  const contentEl = messageEl.querySelector('.content, .section-header');
  const tipContentEl = messageEl.querySelector('.tip-content');
  const narrationEl = messageEl.querySelector('.narration');
  const letterEl = messageEl.querySelector('.love-letter');

  // Determine what to animate
  if (msg.type === 'code' || msg.type === 'table' || msg.type === 'end' || msg.type === 'letter') {
    // No typing for these, show immediately (letter is pre-rendered from markdown)
    scrollToBottom();
    setTimeout(() => showMessagesWithAnimation(messages, index + 1), 100);
  } else if (narrationEl) {
    // Narration with line breaks
    const text = msg.text || '';
    if (text.includes('\n')) {
      narrationEl.innerHTML = text.replace(/\n/g, '<br>');
      scrollToBottom();
      setTimeout(() => showMessagesWithAnimation(messages, index + 1), 200);
    } else {
      typeTextThen(narrationEl, text, () => showMessagesWithAnimation(messages, index + 1));
    }
  } else if (tipContentEl) {
    typeTextThen(tipContentEl, msg.content || '', () => showMessagesWithAnimation(messages, index + 1));
  } else if (contentEl) {
    typeTextThen(contentEl, msg.text || msg.content || '', () => showMessagesWithAnimation(messages, index + 1));
  } else {
    scrollToBottom();
    setTimeout(() => showMessagesWithAnimation(messages, index + 1), 100);
  }
}

function typeTextThen(element, text, callback, speed = 8) {
  let i = 0;
  element.innerHTML = '';

  const cursor = document.createElement('span');
  cursor.className = 'typing-cursor';
  element.appendChild(cursor);

  function type() {
    // 檢查是否被中斷
    if (abortTyping) {
      cursor.remove();
      // 立即顯示完整內容
      element.innerHTML = text.replace(/\n/g, '<br>');
      isTyping = false;
      // 不調用 callback，讓 jumpToResults 接管
      return;
    }

    if (i < text.length) {
      const char = text.charAt(i);
      if (char === '\n') {
        // Handle newline by inserting <br>
        const br = document.createElement('br');
        element.insertBefore(br, cursor);
      } else {
        const textNode = document.createTextNode(char);
        element.insertBefore(textNode, cursor);
      }
      i++;
      scrollToBottom();
      setTimeout(type, speed);
    } else {
      cursor.remove();
      setTimeout(callback, 100);
    }
  }

  type();
}

function showNextMessageImmediate() {
  if (currentIndex >= conversationData.length) return;

  const msg = conversationData[currentIndex];
  const messageEl = createMessageElement(msg);
  conversationEl.appendChild(messageEl);
  messageEl.classList.add('visible');

  // For immediate show, don't use typing effect
  const contentEl = messageEl.querySelector('.content, .tip-content, .section-header');
  if (contentEl) {
    contentEl.textContent = msg.text || msg.content || '';
  }
  const narrationEl = messageEl.querySelector('.narration');
  if (narrationEl) {
    narrationEl.innerHTML = (msg.text || '').replace(/\n/g, '<br>');
  }
  // Letter content is pre-rendered from markdown in createMessageElement

  currentIndex++;
  updateProgress();
}

function updateProgress() {
  progressEl.textContent = `${currentIndex} / ${conversationData.length}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Jump to "今日成果" section
function jumpToResults() {
  // 如果正在打字，先中斷，等待後再執行
  if (isTyping) {
    abortTyping = true;
    setTimeout(() => {
      abortTyping = false;  // 重置 flag
      jumpToResults();      // 重新調用自己
    }, 100);
    return;
  }

  // Initialize if not started (without animation)
  if (!started) {
    started = true;
    welcomeMessage.style.display = 'none';
    conversationEl.classList.add('active');
  }

  // Show ALL messages immediately (no animation)
  while (currentIndex < conversationData.length) {
    showNextMessageImmediate();
  }

  // Find and scroll to the results section
  requestAnimationFrame(() => {
    const sections = conversationEl.querySelectorAll('.section-header');
    for (const section of sections) {
      if (section.textContent === '今日成果') {
        const messageEl = section.closest('.message');
        if (messageEl) {
          const targetTop = messageEl.offsetTop - 150;
          terminalBody.scrollTop = targetTop;
        }
        return;
      }
    }
  });
}

// Start
init();
