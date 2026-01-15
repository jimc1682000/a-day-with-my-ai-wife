// App State
let currentIndex = 0;
let isTyping = false;
let started = false;

// DOM Elements
const terminalBody = document.getElementById('terminal-body');
const conversationEl = document.getElementById('conversation');
const progressEl = document.getElementById('progress');
const welcomeMessage = document.querySelector('.welcome-message');

// Initialize
function init() {
  updateProgress();

  // Click to advance
  document.addEventListener('click', handleAdvance);

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    // Enter / Space / Arrow Down = next message
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      handleAdvance();
    }
    // Arrow Up = scroll up a bit
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      terminalBody.scrollBy({ top: -100, behavior: 'smooth' });
    }
    // Page Down = jump to next section
    if (e.key === 'PageDown') {
      e.preventDefault();
      scrollToNextSection();
    }
    // Page Up = jump to previous section
    if (e.key === 'PageUp') {
      e.preventDefault();
      scrollToPreviousSection();
    }
  });

  // Mouse wheel: normal scrolling (no override)
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

  // Special handling for love letter (show all at once, it's too long to type)
  const letterEl = messageEl.querySelector('.love-letter');
  if (letterEl && msg.type === 'letter') {
    letterEl.innerHTML = msg.text.replace(/\n/g, '<br>');
  }

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
      div.innerHTML = `<div class="love-letter"></div>`;
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
  if (msg.type === 'code' || msg.type === 'table' || msg.type === 'end') {
    // No typing for these, show immediately
    scrollToBottom();
    setTimeout(() => showMessagesWithAnimation(messages, index + 1), 100);
  } else if (letterEl) {
    // Love letter - slower typing effect (50ms vs 8ms for others)
    typeTextThen(letterEl, msg.text.replace(/\n/g, '\n'), () => showMessagesWithAnimation(messages, index + 1), 50);
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
  const letterEl = messageEl.querySelector('.love-letter');
  if (letterEl) {
    letterEl.innerHTML = (msg.text || '').replace(/\n/g, '<br>');
  }

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

// Start
init();
