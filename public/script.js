/* ════════════════════════════════════════════════════════════════
   VORTEX AI — Main Frontend Script
   Features: Chat, Multimodal, Voice, Image Generation, Language Toggle
   ════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────────
  const state = {
    language: 'arabic',
    mode: 'chat',
    sessionId: generateSessionId(),
    isLoading: false,
    isRecording: false,
    attachments: [],
    lastGeneratedImage: null,
    recognition: null,
  };

  // ── DOM References ─────────────────────────────────────────────
  const dom = {
    body:               document.body,
    app:                document.getElementById('app'),
    sidebar:            document.getElementById('sidebar'),
    sidebarToggle:      document.getElementById('sidebar-toggle'),
    sidebarClose:       document.getElementById('sidebar-close'),
    overlay:            document.getElementById('overlay'),
    chatContainer:      document.getElementById('chat-container'),
    messages:           document.getElementById('messages'),
    welcomeScreen:      document.getElementById('welcome-screen'),
    typingIndicator:    document.getElementById('typing-indicator'),
    messageInput:       document.getElementById('message-input'),
    sendBtn:            document.getElementById('send-btn'),
    voiceBtn:           document.getElementById('voice-btn'),
    attachBtn:          document.getElementById('attach-btn'),
    fileInput:          document.getElementById('file-input'),
    attachmentsPreview: document.getElementById('attachments-preview'),
    newChatBtn:         document.getElementById('new-chat-btn'),
    clearChat:          document.getElementById('clear-chat'),
    langToggle:         document.getElementById('lang-toggle'),
    modeBtns:           document.querySelectorAll('.mode-btn'),
    imagePanel:         document.getElementById('image-mode-panel'),
    inputArea:          document.getElementById('input-area'),
    imageResult:        document.getElementById('image-result'),
    generatedImage:     document.getElementById('generated-image'),
    downloadImage:      document.getElementById('download-image'),
    useInChat:          document.getElementById('use-in-chat'),
    toastContainer:     document.getElementById('toast-container'),
    statusText:         document.getElementById('status-text'),
    welcomeSuggestions: document.getElementById('welcome-suggestions'),
  };

  // ── UI Text Config ─────────────────────────────────────────────
  const uiText = {
    arabic: {
      inputPlaceholder:  'اكتب رسالتك هنا...',
      you:               'أنت',
      vortex:            'Vortex',
      copy:              'نسخ',
      copied:            '✓ تم النسخ',
      copiedMsg:         '✓ نسخ',
      regenerate:        'إعادة توليد',
      imagePlaceholder:  'صف الصورة التي تريدها بالتفصيل...',
      generating:        '✨ جاري توليد الصورة...',
      loadingModel:      '⏳ النموذج يُحمَّل، انتظر لحظة...',
      errorPrefix:       '⚠️ خطأ: ',
      voiceStart:        'الاستماع...',
    },
    english: {
      inputPlaceholder:  'Type your message here...',
      you:               'You',
      vortex:            'Vortex',
      copy:              'Copy',
      copied:            '✓ Copied',
      copiedMsg:         '✓ Copied',
      regenerate:        'Regenerate',
      imagePlaceholder:  'Describe the image you want in detail...',
      generating:        '✨ Generating image...',
      loadingModel:      '⏳ Model loading, please wait...',
      errorPrefix:       '⚠️ Error: ',
      voiceStart:        'Listening...',
    },
  };

  // ── Utility Functions ──────────────────────────────────────────
  function generateSessionId() {
    return 'vortex-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }

  function t(key) {
    return uiText[state.language][key] || key;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function autoResizeTextarea(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  function scrollToBottom(smooth = true) {
    requestAnimationFrame(() => {
      dom.chatContainer.scrollTo({
        top: dom.chatContainer.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant',
      });
    });
  }

  function formatTimestamp() {
    return new Date().toLocaleTimeString(state.language === 'arabic' ? 'ar-IQ' : 'en-US', {
      hour: '2-digit', minute: '2-digit',
    });
  }

  // ── Toast Notifications ────────────────────────────────────────
  function showToast(message, type = 'info', duration = 3500) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  }

  // ── Language Toggle ────────────────────────────────────────────
  function switchLanguage(lang) {
    state.language = lang;
    const isAr = lang === 'arabic';

    dom.body.className = isAr ? 'lang-ar' : 'lang-en';
    document.documentElement.lang = isAr ? 'ar' : 'en';
    document.documentElement.dir  = isAr ? 'rtl' : 'ltr';

    // Show/hide toggle labels
    dom.langToggle.querySelector('.lang-ar-text').style.display = isAr ? '' : 'none';
    dom.langToggle.querySelector('.lang-en-text').style.display = isAr ? 'none' : '';

    // Update all data-ar / data-en elements
    document.querySelectorAll('[data-ar]').forEach(el => {
      const key = isAr ? 'ar' : 'en';
      if (el.dataset[key]) el.textContent = el.dataset[key];
    });

    // Update suggestion chips
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
      const key = isAr ? 'ar' : 'en';
      if (chip.dataset[key]) chip.textContent = chip.dataset[key];
    });

    // Update placeholder
    dom.messageInput.placeholder = state.mode === 'image'
      ? t('imagePlaceholder')
      : t('inputPlaceholder');

    showToast(isAr ? '🇮🇶 تم التبديل للعربية' : '🇬🇧 Switched to English', 'info', 2000);
  }

  // ── Mode Switching ─────────────────────────────────────────────
  function switchMode(mode) {
    state.mode = mode;

    dom.modeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    if (mode === 'image') {
      dom.chatContainer.style.display = 'none';
      dom.imagePanel.style.display = 'flex';
      dom.messageInput.placeholder = t('imagePlaceholder');
    } else {
      dom.chatContainer.style.display = 'flex';
      dom.imagePanel.style.display = 'none';
      dom.messageInput.placeholder = t('inputPlaceholder');
    }

    dom.messageInput.focus();
  }

  // ── Sidebar ────────────────────────────────────────────────────
  function openSidebar() {
    dom.sidebar.classList.add('open');
    dom.overlay.classList.add('active');
    dom.sidebarToggle.setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    dom.sidebar.classList.remove('open');
    dom.overlay.classList.remove('active');
    dom.sidebarToggle.setAttribute('aria-expanded', 'false');
  }

  // ── Attachments ────────────────────────────────────────────────
  function renderAttachments() {
    if (state.attachments.length === 0) {
      dom.attachmentsPreview.style.display = 'none';
      return;
    }
    dom.attachmentsPreview.style.display = 'flex';
    dom.attachmentsPreview.innerHTML = '';

    state.attachments.forEach((att, idx) => {
      const chip = document.createElement('div');
      chip.className = 'attachment-chip';

      if (att.type === 'image') {
        chip.innerHTML = `
          <img src="${att.data}" alt="${escapeHtml(att.name)}" />
          <span>${escapeHtml(att.name.length > 14 ? att.name.slice(0, 12) + '…' : att.name)}</span>
          <button class="remove-attachment" data-idx="${idx}" aria-label="Remove attachment">✕</button>
        `;
      } else {
        chip.innerHTML = `
          <span>📎</span>
          <span>${escapeHtml(att.name.length > 18 ? att.name.slice(0, 16) + '…' : att.name)}</span>
          <button class="remove-attachment" data-idx="${idx}" aria-label="Remove attachment">✕</button>
        `;
      }
      dom.attachmentsPreview.appendChild(chip);
    });
  }

  async function handleFileAttach(files) {
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_TEXT_SIZE  =  1 * 1024 * 1024; //  1MB

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        if (file.size > MAX_IMAGE_SIZE) {
          showToast(`الصورة كبيرة جداً: ${file.name}`, 'error');
          continue;
        }
        const data = await fileToBase64(file);
        state.attachments.push({ type: 'image', name: file.name, data, mimeType: file.type });
      } else {
        if (file.size > MAX_TEXT_SIZE) {
          showToast(`الملف كبير جداً: ${file.name}`, 'error');
          continue;
        }
        const content = await readFileAsText(file);
        state.attachments.push({ type: 'file', name: file.name, content });
      }
    }

    renderAttachments();
    updateSendBtn();
  }

  // ── Message Rendering ──────────────────────────────────────────
  function renderMarkdown(text) {
    if (!text) return '';

    // Configure marked
    marked.setOptions({
      highlight: (code, lang) => {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
      },
      breaks: true,
      gfm: true,
    });

    let html = marked.parse(text);

    // Wrap code blocks for copy button
    html = html.replace(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g, (match, attrs, code) => {
      return `<div class="code-block-wrapper"><pre><code${attrs}>${code}</code></pre>
        <button class="copy-code-btn" onclick="copyCode(this)" aria-label="Copy code">${t('copy')}</button></div>`;
    });

    return html;
  }

  function appendMessage(role, content, { images = [], isError = false } = {}) {
    // Hide welcome screen
    dom.welcomeScreen.style.display = 'none';

    const msgEl = document.createElement('div');
    msgEl.className = `message ${role}${isError ? ' error' : ''}`;

    const isUser = role === 'user';
    const avatarEmoji = isUser ? '👤' : '🌀';
    const label = isUser ? t('you') : t('vortex');

    let imagesHtml = '';
    if (images && images.length > 0) {
      imagesHtml = images
        .filter(img => img.type === 'image')
        .map(img => `<img class="message-image" src="${img.data}" alt="Uploaded image" loading="lazy" />`)
        .join('');
    }

    const contentHtml = isUser
      ? `<p>${escapeHtml(content)}</p>${imagesHtml}`
      : renderMarkdown(content);

    const actionsHtml = !isUser
      ? `<div class="message-actions">
          <button class="msg-action-btn" onclick="copyMessage(this)" aria-label="Copy message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            <span>${t('copy')}</span>
          </button>
        </div>`
      : '';

    msgEl.innerHTML = `
      <div class="message-avatar" aria-hidden="true">${avatarEmoji}</div>
      <div class="message-content-wrapper">
        <span class="message-label">${escapeHtml(label)} · ${formatTimestamp()}</span>
        <div class="message-bubble">${contentHtml}</div>
        ${actionsHtml}
      </div>
    `;

    dom.messages.appendChild(msgEl);

    // Highlight code blocks
    msgEl.querySelectorAll('pre code').forEach(block => {
      hljs.highlightElement(block);
    });

    scrollToBottom();
    return msgEl;
  }

  // ── Send Button State ──────────────────────────────────────────
  function updateSendBtn() {
    const hasText = dom.messageInput.value.trim().length > 0;
    const hasAtt  = state.attachments.length > 0;
    dom.sendBtn.disabled = state.isLoading || (!hasText && !hasAtt);
  }

  // ── Send Chat Message ──────────────────────────────────────────
  async function sendMessage() {
    if (state.isLoading) return;

    const text = dom.messageInput.value.trim();
    const attachments = [...state.attachments];

    if (!text && attachments.length === 0) return;

    // Append user message
    const images = attachments.filter(a => a.type === 'image');
    appendMessage('user', text, { images });

    // Clear input
    dom.messageInput.value = '';
    dom.messageInput.style.height = 'auto';
    state.attachments = [];
    renderAttachments();
    updateSendBtn();

    // Show typing
    state.isLoading = true;
    dom.typingIndicator.style.display = 'flex';
    scrollToBottom();

    try {
      const payload = {
        message:   text,
        sessionId: state.sessionId,
        language:  state.language,
        images:    images.map(img => ({ data: img.data, mimeType: img.mimeType })),
        files:     attachments.filter(a => a.type === 'file').map(f => ({ name: f.name, content: f.content })),
      };

      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Server error');

      dom.typingIndicator.style.display = 'none';
      appendMessage('assistant', data.response);

    } catch (err) {
      dom.typingIndicator.style.display = 'none';
      appendMessage('assistant', `${t('errorPrefix')}${err.message}`, { isError: true });
      showToast(err.message, 'error');
    } finally {
      state.isLoading = false;
      updateSendBtn();
      dom.messageInput.focus();
    }
  }

  // ── Generate Image ─────────────────────────────────────────────
  async function generateImage() {
    if (state.isLoading) return;

    const prompt = dom.messageInput.value.trim();
    if (!prompt) {
      showToast(
        state.language === 'arabic' ? 'اكتب وصفاً للصورة أولاً' : 'Please describe the image first',
        'warning'
      );
      return;
    }

    state.isLoading = true;
    dom.sendBtn.disabled = true;

    // Show generating state
    dom.imageResult.style.display = 'none';
    const statusEl = document.querySelector('.image-panel-subtitle');
    const originalSubtitle = statusEl.textContent;
    statusEl.textContent = t('generating');

    try {
      const res = await fetch('/api/generate-image', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.loading) {
          statusEl.textContent = t('loadingModel');
          showToast(t('loadingModel'), 'info', 5000);
          return;
        }
        throw new Error(data.error || 'Image generation failed');
      }

      state.lastGeneratedImage = data.image;
      dom.generatedImage.src = data.image;
      dom.imageResult.style.display = 'flex';

      dom.messageInput.value = '';
      autoResizeTextarea(dom.messageInput);
      showToast('✨ ' + (state.language === 'arabic' ? 'تم توليد الصورة بنجاح!' : 'Image generated successfully!'), 'success');

    } catch (err) {
      showToast(`${t('errorPrefix')}${err.message}`, 'error');
    } finally {
      state.isLoading = false;
      statusEl.textContent = originalSubtitle;
      updateSendBtn();
    }
  }

  // ── Voice Input (Web Speech API) ───────────────────────────────
  function initVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      dom.voiceBtn.title = state.language === 'arabic'
        ? 'المتصفح لا يدعم الإدخال الصوتي'
        : 'Browser does not support voice input';
      dom.voiceBtn.disabled = true;
      return;
    }

    state.recognition = new SpeechRecognition();
    state.recognition.continuous = false;
    state.recognition.interimResults = true;

    state.recognition.onstart = () => {
      state.isRecording = true;
      dom.voiceBtn.classList.add('recording');
      dom.voiceBtn.title = t('voiceStart');
      showToast('🎙️ ' + t('voiceStart'), 'info', 2500);
    };

    state.recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      dom.messageInput.value = transcript;
      autoResizeTextarea(dom.messageInput);
      updateSendBtn();
    };

    state.recognition.onend = () => {
      state.isRecording = false;
      dom.voiceBtn.classList.remove('recording');
      dom.voiceBtn.title = state.language === 'arabic' ? 'إدخال صوتي' : 'Voice input';
    };

    state.recognition.onerror = (event) => {
      state.isRecording = false;
      dom.voiceBtn.classList.remove('recording');
      console.error('Speech recognition error:', event.error);
    };
  }

  function toggleVoice() {
    if (!state.recognition) return;

    if (state.isRecording) {
      state.recognition.stop();
    } else {
      state.recognition.lang = state.language === 'arabic' ? 'ar-IQ' : 'en-US';
      try {
        state.recognition.start();
      } catch (e) {
        console.error('Recognition start error:', e);
      }
    }
  }

  // ── Clear Chat ─────────────────────────────────────────────────
  async function clearChat() {
    dom.messages.innerHTML = '';
    dom.welcomeScreen.style.display = '';
    state.sessionId = generateSessionId();

    try {
      await fetch('/api/clear', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId: state.sessionId }),
      });
    } catch { /* silent */ }

    showToast(
      state.language === 'arabic' ? '🗑️ تم مسح المحادثة' : '🗑️ Chat cleared',
      'success', 2000
    );
  }

  // ── Copy Functions (global, called from HTML) ──────────────────
  window.copyCode = function (btn) {
    const code = btn.closest('.code-block-wrapper').querySelector('code');
    navigator.clipboard.writeText(code.textContent || '').then(() => {
      const original = btn.textContent;
      btn.textContent = t('copied');
      setTimeout(() => { btn.textContent = original; }, 2000);
    }).catch(() => showToast('Failed to copy', 'error'));
  };

  window.copyMessage = function (btn) {
    const bubble = btn.closest('.message-content-wrapper').querySelector('.message-bubble');
    navigator.clipboard.writeText(bubble.innerText || '').then(() => {
      const span = btn.querySelector('span');
      const original = span.textContent;
      span.textContent = t('copiedMsg');
      setTimeout(() => { span.textContent = original; }, 2000);
    }).catch(() => showToast('Failed to copy', 'error'));
  };

  // ── Download Generated Image ───────────────────────────────────
  function downloadGeneratedImage() {
    if (!state.lastGeneratedImage) return;
    const a = document.createElement('a');
    a.href = state.lastGeneratedImage;
    a.download = `vortex-image-${Date.now()}.jpg`;
    a.click();
  }

  // ── Use Generated Image in Chat ────────────────────────────────
  function useImageInChat() {
    if (!state.lastGeneratedImage) return;
    switchMode('chat');
    state.attachments.push({
      type:     'image',
      name:     'generated-image.jpg',
      data:     state.lastGeneratedImage,
      mimeType: 'image/jpeg',
    });
    renderAttachments();
    updateSendBtn();
    showToast(
      state.language === 'arabic' ? 'تم إضافة الصورة للدردشة' : 'Image added to chat',
      'success', 2000
    );
  }

  // ── Event Listeners ────────────────────────────────────────────
  function bindEvents() {
    // Send button
    dom.sendBtn.addEventListener('click', () => {
      if (state.mode === 'image') generateImage();
      else sendMessage();
    });

    // Enter key (Shift+Enter = new line)
    dom.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (state.mode === 'image') generateImage();
        else sendMessage();
      }
    });

    // Auto-resize textarea
    dom.messageInput.addEventListener('input', () => {
      autoResizeTextarea(dom.messageInput);
      updateSendBtn();
    });

    // Language toggle
    dom.langToggle.addEventListener('click', () => {
      switchLanguage(state.language === 'arabic' ? 'english' : 'arabic');
    });

    // Mode buttons
    dom.modeBtns.forEach(btn => {
      btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });

    // Sidebar toggle
    dom.sidebarToggle.addEventListener('click', () => {
      if (dom.sidebar.classList.contains('open')) closeSidebar();
      else openSidebar();
    });
    dom.sidebarClose.addEventListener('click', closeSidebar);
    dom.overlay.addEventListener('click', closeSidebar);

    // New Chat
    dom.newChatBtn.addEventListener('click', () => {
      clearChat();
      closeSidebar();
    });

    // Clear Chat
    dom.clearChat.addEventListener('click', clearChat);

    // File attach
    dom.attachBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => {
      handleFileAttach(Array.from(e.target.files));
      e.target.value = '';
    });

    // Drag & drop on input area
    dom.inputArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      dom.inputArea.style.borderColor = 'var(--clr-violet)';
    });
    dom.inputArea.addEventListener('dragleave', () => {
      dom.inputArea.style.borderColor = '';
    });
    dom.inputArea.addEventListener('drop', (e) => {
      e.preventDefault();
      dom.inputArea.style.borderColor = '';
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) handleFileAttach(files);
    });

    // Paste images from clipboard
    dom.messageInput.addEventListener('paste', async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageItems = Array.from(items).filter(i => i.type.startsWith('image/'));
      if (imageItems.length > 0) {
        e.preventDefault();
        const files = imageItems.map(i => i.getAsFile()).filter(Boolean);
        await handleFileAttach(files);
      }
    });

    // Remove attachment
    dom.attachmentsPreview.addEventListener('click', (e) => {
      const btn = e.target.closest('.remove-attachment');
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx, 10);
      state.attachments.splice(idx, 1);
      renderAttachments();
      updateSendBtn();
    });

    // Voice input
    dom.voiceBtn.addEventListener('click', toggleVoice);

    // Image download / use in chat
    dom.downloadImage.addEventListener('click', downloadGeneratedImage);
    dom.useInChat.addEventListener('click', useImageInChat);

    // Suggestion chips
    dom.welcomeSuggestions.addEventListener('click', (e) => {
      const chip = e.target.closest('.suggestion-chip');
      if (!chip) return;
      dom.messageInput.value = chip.textContent.trim();
      autoResizeTextarea(dom.messageInput);
      updateSendBtn();
      dom.messageInput.focus();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K = new chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        clearChat();
      }
      // Escape = close sidebar
      if (e.key === 'Escape') closeSidebar();
      // Ctrl/Cmd + / = focus input
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        dom.messageInput.focus();
      }
    });
  }

  // ── Health Check ───────────────────────────────────────────────
  async function checkHealth() {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Server offline');
      const data = await res.json();
      console.log('✅ Vortex server healthy:', data);
    } catch {
      dom.statusText.textContent = state.language === 'arabic' ? 'غير متصل' : 'Offline';
      const pill = document.getElementById('status-pill');
      if (pill) {
        pill.style.background = 'rgba(244,63,94,0.1)';
        pill.style.borderColor = 'rgba(244,63,94,0.2)';
        pill.style.color = 'var(--clr-rose)';
        const dot = pill.querySelector('.status-dot');
        if (dot) dot.style.background = 'var(--clr-rose)';
      }
    }
  }

  // ── Init ───────────────────────────────────────────────────────
  function init() {
    // Set initial placeholder
    dom.messageInput.placeholder = t('inputPlaceholder');

    // Init voice
    initVoice();

    // Bind all events
    bindEvents();

    // Check server health
    checkHealth();

    // Focus input
    setTimeout(() => dom.messageInput.focus(), 100);

    console.log(`
    🌀 Vortex AI — Frontend Ready
    Session: ${state.sessionId}
    Language: ${state.language}
    `);
  }

  // Start the app
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

})();
