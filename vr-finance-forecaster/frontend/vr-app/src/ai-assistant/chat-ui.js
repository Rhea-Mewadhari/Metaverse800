(function () {
  const API_BASE = 'http://localhost:8000/api';

  AFRAME.registerComponent('chat-ui', {
    init: function () {
      this.isOpen = false;
      this.buildOverlay();
      this.onKeyDown = this.onKeyDown.bind(this);
      window.addEventListener('keydown', this.onKeyDown);
    },

    buildOverlay: function () {
      const style = document.createElement('style');
      style.textContent = `
        #chat-ui-overlay {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: 420px;
          max-width: 90vw;
          background: rgba(20, 20, 20, 0.92);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          padding: 14px 16px;
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
          color: #ffffff;
          z-index: 9999;
          display: none;
        }
        #chat-ui-overlay.open { display: block; }
        #chat-ui-chart-label { font-size: 12px; color: #c3c2b7; margin-bottom: 6px; }
        #chat-ui-answer {
          font-size: 14px; line-height: 1.4; margin-bottom: 10px;
          max-height: 160px; overflow-y: auto; white-space: pre-wrap;
        }
        #chat-ui-answer.thinking {
          color: #c3c2b7;
          font-style: italic;
          animation: chat-ui-pulse 1.1s ease-in-out infinite;
        }
        @keyframes chat-ui-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        #chat-ui-row { display: flex; gap: 8px; }
        #chat-ui-input {
          flex: 1; padding: 8px 10px; border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.2); background: #1a1a19;
          color: #fff; font-size: 14px;
        }
        #chat-ui-input:disabled, #chat-ui-ask-btn:disabled, #chat-ui-mic-btn:disabled {
          opacity: 0.5; cursor: not-allowed;
        }
        #chat-ui-ask-btn, #chat-ui-mic-btn {
          padding: 8px 12px; border-radius: 6px; border: none;
          background: #2a78d6; color: #fff; font-size: 14px; cursor: pointer;
        }
        #chat-ui-mic-btn.listening { background: #e34948; }
        #chat-ui-footer {
          text-align: right;
          margin-top: 8px; font-size: 11px; color: #898781;
        }
      `;
      document.head.appendChild(style);

      const overlay = document.createElement('div');
      overlay.id = 'chat-ui-overlay';
      overlay.innerHTML = `
        <div id="chat-ui-chart-label">No chart in view</div>
        <div id="chat-ui-answer"></div>
        <div id="chat-ui-row">
          <input id="chat-ui-input" type="text" placeholder="Ask about this chart..." />
          <button id="chat-ui-mic-btn" title="Ask by voice">\u{1F3A4}</button>
          <button id="chat-ui-ask-btn">Ask</button>
        </div>
        <div id="chat-ui-footer">Press C to close</div>
      `;
      document.body.appendChild(overlay);

      this.overlay = overlay;
      this.chartLabelEl = overlay.querySelector('#chat-ui-chart-label');
      this.answerEl = overlay.querySelector('#chat-ui-answer');
      this.inputEl = overlay.querySelector('#chat-ui-input');
      this.askBtn = overlay.querySelector('#chat-ui-ask-btn');
      this.micBtn = overlay.querySelector('#chat-ui-mic-btn');

      this.askBtn.addEventListener('click', () => this.ask());
      this.inputEl.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          this.ask();
        } else if (e.key === 'Escape') {
          this.toggle(false);
        }
      });
      this.micBtn.addEventListener('click', () => this.askByVoice());
    },

    onKeyDown: function (evt) {
      const active = document.activeElement;
      const typing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
      if (evt.key.toLowerCase() === 'c' && !typing) {
        this.toggle();
      }
    },

    toggle: function (force) {
      this.isOpen = typeof force === 'boolean' ? force : !this.isOpen;
      this.overlay.classList.toggle('open', this.isOpen);
      if (this.isOpen) {
        this.updateChartLabel();
        this.inputEl.focus();
      }
    },

    updateChartLabel: function () {
      const chart = this.getCurrentChart();
      this.chartLabelEl.textContent = chart
        ? `Viewing: ${chart.label}`
        : 'No chart in view — move closer to one';
    },

    getCurrentChart: function () {
      const tracker = this.el.components['current-chart-tracker'];
      return tracker ? tracker.currentChart : null;
    },

    setBusy: function (busy) {
      this.askBtn.disabled = busy;
      this.inputEl.disabled = busy;
      this.micBtn.disabled = busy;
    },

    ask: function () {
      const question = this.inputEl.value.trim();
      if (!question) return;
      const chart = this.getCurrentChart();
      if (!chart) {
        this.answerEl.textContent = 'Move closer to a chart before asking.';
        this.answerEl.classList.remove('thinking');
        return;
      }

      this.answerEl.textContent = 'Thinking...';
      this.answerEl.classList.add('thinking');
      this.setBusy(true);

      fetch(`${API_BASE}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart_id: chart.id, question: question }),
      })
        .then((res) => {
          if (!res.ok) {
            return res.json().then((body) => {
              throw new Error(body.detail || res.statusText);
            });
          }
          return res.json();
        })
        .then((data) => {
          this.answerEl.classList.remove('thinking');
          this.answerEl.textContent = data.answer;
          this.inputEl.value = '';
          if (window.speakText) {
            window.speakText(data.answer);
          }
        })
        .catch((err) => {
          this.answerEl.classList.remove('thinking');
          this.answerEl.textContent = `Error: ${err.message}`;
        })
        .finally(() => {
          this.setBusy(false);
        });
    },

    askByVoice: function () {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        this.answerEl.textContent = 'Voice input is not supported in this browser.';
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      this.micBtn.classList.add('listening');
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.inputEl.value = transcript;
        this.ask();
      };
      recognition.onerror = () => {
        this.answerEl.textContent = 'Could not hear a question — try again.';
      };
      recognition.onend = () => {
        this.micBtn.classList.remove('listening');
      };
      recognition.start();
    },

    tick: function () {
      if (this.isOpen) {
        this.updateChartLabel();
      }
    },

    remove: function () {
      window.removeEventListener('keydown', this.onKeyDown);
      if (this.overlay) this.overlay.remove();
    },
  });
})();