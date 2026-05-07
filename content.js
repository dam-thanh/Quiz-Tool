(function () {
  'use strict';

  // ====== CẤU HÌNH CỐ ĐỊNH (sửa lại cho hosting của bạn) ======
  const API_URL = 'https://step2go.site/quiz-api.php'; // <-- URL file PHP
  const API_KEY = 'damthanhdeptraivodichvutru';   // <-- API Key giống trong PHP

  // Gửi request thông qua background (để tránh CORS)
  function callApi(method, body = null) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'callApi',
        method,
        url: API_URL,
        apiKey: API_KEY,
        body
      }, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Lỗi không xác định'));
        }
      });
    });
  }

  // ====== GIAO DIỆN (nhúng CSS) ======
  const style = document.createElement('style');
  style.textContent = `
    #quiz-tool-panel, #quiz-tool-toggle {
      position: fixed !important;
      z-index: 2147483647 !important;
      font-family: Arial, sans-serif !important;
      box-sizing: border-box !important;
    }
    #quiz-tool-panel {
      bottom: 80px !important;
      right: 20px !important;
      width: 280px !important;
      background: white !important;
      border: 2px solid #ff6b6b !important;
      border-radius: 10px !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25) !important;
      padding: 14px !important;
      display: none;
    }
    #quiz-tool-panel.dragging { opacity: 0.9; cursor: grabbing; }
    #quiz-tool-panel .title-bar {
      cursor: grab;
      background: linear-gradient(135deg, #ff6b6b, #ee5a24);
      color: white;
      padding: 6px 10px;
      margin: -14px -14px 12px -14px;
      border-radius: 8px 8px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      font-weight: bold;
    }
    #quiz-tool-panel .title-bar button {
      background: transparent;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 0 4px;
    }
    #quiz-tool-panel button.action {
      width: 100%;
      padding: 7px;
      margin: 4px 0;
      border: none;
      border-radius: 5px;
      color: white;
      font-size: 13px;
      cursor: pointer;
      font-weight: 500;
      transition: opacity 0.2s;
    }
    #quiz-tool-panel button.action:hover { opacity: 0.9; }
    .btn-collect { background: #ee5a24; }
    .btn-answer { background: #0abde3; }
    #quiz-tool-panel .msg {
      font-size: 12px;
      margin-top: 8px;
      padding: 7px;
      border-radius: 5px;
      display: none;
    }
    #quiz-tool-panel .msg.success { background: #d4edda; color: #155724; display: block; }
    #quiz-tool-panel .msg.error { background: #f8d7da; color: #721c24; display: block; }
    #quiz-tool-panel .msg.info { background: #d1ecf1; color: #0c5460; display: block; }
    #quiz-tool-panel .qr-section {
      margin-top: 15px;
      padding-top: 12px;
      border-top: 2px solid #f0f0f0;
      text-align: center;
    }
    #quiz-tool-panel .qr-label {
      font-size: 12px;
      font-weight: 600;
      color: #333;
      margin-bottom: 10px;
      display: block;
      letter-spacing: 0.5px;
    }
    #quiz-tool-panel .qr-image {
      width: 100%;
      max-width: 180px;
      margin: 0 auto;
      border-radius: 8px;
      display: block;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border: 1px solid #e8e8e8;
      transition: transform 0.2s;
    }
    #quiz-tool-panel .qr-image:hover {
      transform: scale(1.05);
    }
    #quiz-tool-toggle {
      bottom: 20px !important;
      right: 20px !important;
      width: 46px !important;
      height: 46px !important;
      background: linear-gradient(135deg, #ff6b6b, #ee5a24) !important;
      color: white !important;
      border: none !important;
      border-radius: 50% !important;
      font-size: 22px !important;
      line-height: 46px !important;
      text-align: center !important;
      cursor: pointer !important;
      box-shadow: 0 3px 10px rgba(238,90,36,0.4) !important;
      display: block !important;
      opacity: 1 !important;
      visibility: visible !important;
    }
    .quiz-highlight-correct {
      outline: 2px solid #0abde3 !important;
      background: #e6faff !important;
      border-radius: 4px !important;
    }
  `;
  document.head.appendChild(style);

  createUI();

  function createUI() {
    // Xóa cũ nếu có
    document.getElementById('quiz-tool-panel')?.remove();
    document.getElementById('quiz-tool-toggle')?.remove();

    // Nút bật/tắt
    const toggleBtn = document.createElement('div');
    toggleBtn.id = 'quiz-tool-toggle';
    toggleBtn.textContent = '📋';
    toggleBtn.title = 'Quiz Tool (bật/tắt)';
    document.body.appendChild(toggleBtn);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'quiz-tool-panel';
    const qrImageUrl = chrome.runtime.getURL('icons/qrchuyenkhoan.jpg');
    panel.innerHTML = `
      <div class="title-bar" id="panel-drag-handle">
        <span>🌐 Quiz Tool</span>
        <button id="panel-close-btn">×</button>
      </div>
      <button id="collect-btn" class="action btn-collect">📚 Thu thập </button>
      <button id="auto-answer-btn" class="action btn-answer">📥 Tải đáp án & Tự động điền</button>
      <div class="msg" id="tool-msg"></div>
      <div class="qr-section">
        <span class="qr-label">❤️ Ủng hộ nhà sáng tạo</span>
        <img src="${qrImageUrl}" alt="QR Chuyển Khoản" class="qr-image">
      </div>
    `;
    document.body.appendChild(panel);

    setupEvents(panel, toggleBtn);
  }

  function setupEvents(panel, toggleBtn) {
    // Toggle panel
    toggleBtn.addEventListener('click', () => {
      panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    });
    document.getElementById('panel-close-btn').addEventListener('click', () => {
      panel.style.display = 'none';
    });

    // Kéo thả
    const handle = document.getElementById('panel-drag-handle');
    let isDragging = false, startX, startY, initialLeft, initialTop;
    handle.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = panel.offsetLeft;
      initialTop = panel.offsetTop;
      panel.classList.add('dragging');
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panel.style.left = (initialLeft + e.clientX - startX) + 'px';
      panel.style.top = (initialTop + e.clientY - startY) + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    });
    window.addEventListener('mouseup', () => {
      isDragging = false;
      panel.classList.remove('dragging');
    });

    // === NÚT THU THẬP ===
    document.getElementById('collect-btn').addEventListener('click', async () => {
      if (!isFullScore()) {
        showMessage('⛔ Chưa đạt điểm tối đa (10.00). Không thể lưu!', 'error');
        return;
      }
      showMessage('🔍 Đang quét câu hỏi...', 'info');
      const newQuestions = collectQuestions();
      if (newQuestions.length === 0) {
        showMessage('❌ Không tìm thấy câu hỏi có đáp án đúng.', 'error');
        return;
      }
      try {
        showMessage(`Đang lưu ${newQuestions.length} câu...`, 'info');
        const result = await callApi('POST', newQuestions);
        showMessage(`✅ Đã lưu thành công! (tổng ${result.total} câu)`, 'success');
      } catch (e) {
        showMessage(`❌ Lỗi: ${e.message}`, 'error');
      }
    });

    // === NÚT TỰ ĐỘNG ĐIỀN ===
    document.getElementById('auto-answer-btn').addEventListener('click', async () => {
      showMessage('📥 Đang tải đáp án...', 'info');
      try {
        const data = await callApi('GET');
        if (!Array.isArray(data)) throw new Error('Dữ liệu không đúng định dạng');
        showMessage(`Đã tải ${data.length} câu. Đang điền...`, 'info');
        const answered = answerQuestions(data);
        showMessage(`✅ Đã điền ${answered} câu.`, 'success');
      } catch (e) {
        showMessage(`❌ Lỗi: ${e.message}`, 'error');
      }
    });
  }

  // ====== CÁC HÀM HỖ TRỢ ======
  function showMessage(text, type) {
    const msg = document.getElementById('tool-msg');
    if (msg) {
      msg.textContent = text;
      msg.className = 'msg ' + type;
      setTimeout(() => msg.classList.remove(type), 5000);
    }
  }

  function isFullScore() {
    const scoreEl = document.querySelector('h3.MuiTypography-root.MuiTypography-h3.css-jwbvxr');
    if (scoreEl && scoreEl.textContent.trim() === '10.00') return true;
    const altScore = document.querySelector('span.MuiTypography-body1.css-15vuy4d');
    if (altScore && (altScore.textContent.includes('10/10') || altScore.textContent.includes('10 điểm'))) return true;
    return false;
  }

  function collectQuestions() {
    const containers = [];
    document.querySelectorAll('p.MuiTypography-body1.css-1ltklc6').forEach(p => {
      let el = p.parentElement;
      while (el) {
        if (el.classList?.contains('MuiBox-root') && el.querySelector('.MuiFormControl-root')) {
          if (!containers.includes(el)) containers.push(el);
          break;
        }
        el = el.parentElement;
      }
    });
    return containers.map(c => {
      const numEl = c.querySelector('p.MuiTypography-body1.css-1ltklc6');
      const qNum = numEl ? numEl.textContent.replace(/[^\d]/g, '').trim() : '?';
      const textEl = c.querySelector('.MuiTypography-body1.css-9l3uo3 div[style*="text-align: justify;"] font[size="3"]');
      const qText = textEl ? textEl.textContent.trim() : '';
      const labels = c.querySelectorAll('label.MuiFormControlLabel-root');
      const options = [];
      let correctText = null;
      labels.forEach(label => {
        const span = label.querySelector('.MuiBox-root.css-k008qs');
        if (!span) return;
        const fullText = span.textContent.trim();
        const match = fullText.match(/^[A-D]\.\s*(.+)$/);
        if (match) {
          const text = match[1].trim();
          const isChecked = label.querySelector('input[checked]') !== null;
          const hasIcon = label.querySelector('button img[alt="CheckCircleIcon"]') !== null;
          options.push({ label: fullText.charAt(0), text });
          if (isChecked || hasIcon) correctText = text;
        }
      });
      return { questionNumber: qNum, questionText: qText, options, correctAnswerText: correctText };
    }).filter(q => q.correctAnswerText && q.questionText);
  }

  function normalizeText(text) {
    return text.replace(/\s+/g, ' ').trim();
  }

  function answerQuestions(data) {
    const containers = [];
    document.querySelectorAll('p.MuiTypography-body1.css-1ltklc6').forEach(p => {
      let el = p.parentElement;
      while (el) {
        if (el.classList?.contains('MuiBox-root') && el.querySelector('.MuiFormControl-root')) {
          if (!containers.includes(el)) containers.push(el);
          break;
        }
        el = el.parentElement;
      }
    });
    let count = 0;
    containers.forEach(c => {
      if (c.querySelector('button img[alt="CheckCircleIcon"]') || c.querySelector('input[checked]')) return;
      const textEl = c.querySelector('.MuiTypography-body1.css-9l3uo3 div[style*="text-align: justify;"] font[size="3"]');
      if (!textEl) return;
      const cur = normalizeText(textEl.textContent);
      const match = data.find(q => normalizeText(q.questionText) === cur);
      if (!match) return;
      const correct = normalizeText(match.correctAnswerText);
      c.querySelectorAll('label.MuiFormControlLabel-root').forEach(l => {
        const span = l.querySelector('.MuiBox-root.css-k008qs');
        if (!span) return;
        const m = span.textContent.trim().match(/^[A-D]\.\s*(.+)$/);
        if (m && normalizeText(m[1]) === correct) {
          l.click();
          l.querySelector('input[type="radio"]')?.click();
          count++;
        }
      });
    });
    return count;
  }
})();
