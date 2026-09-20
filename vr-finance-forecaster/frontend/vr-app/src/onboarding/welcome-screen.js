(function () {
  function buildWelcomeScreen() {
    const style = document.createElement('style');
    style.textContent = `
      #welcome-overlay {
        position: fixed;
        inset: 0;
        background: rgba(10, 10, 10, 0.88);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        color: #ffffff;
      }
      #welcome-card {
        max-width: 480px;
        width: 90vw;
        background: #1a1a19;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 12px;
        padding: 28px 32px;
      }
      #welcome-card h1 { font-size: 20px; margin: 0 0 8px; }
      #welcome-card p.welcome-sub { font-size: 13px; color: #c3c2b7; margin: 0 0 18px; }
      #welcome-card ul { list-style: none; margin: 0 0 22px; padding: 0; font-size: 14px; line-height: 1.6; }
      #welcome-card ul li { display: flex; gap: 10px; margin-bottom: 6px; }
      #welcome-card kbd {
        display: inline-block; min-width: 20px; text-align: center;
        padding: 2px 6px; border-radius: 4px; background: #2c2c2a;
        border: 1px solid rgba(255,255,255,0.15); font-size: 12px;
      }
      #welcome-enter-btn {
        width: 100%; padding: 10px; border: none; border-radius: 6px;
        background: #2a78d6; color: #fff; font-size: 14px; cursor: pointer;
      }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'welcome-overlay';
    overlay.innerHTML = `
      <div id="welcome-card">
        <h1>VR Finance Forecaster</h1>
        <p class="welcome-sub">Explore AAPL price data, forecasts, and risk through five VR charts, with an AI assistant that can answer questions about whichever one you're viewing.</p>
        <ul>
          <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> <span>Move around the space</span></li>
          <li><kbd>&#8592;&#8594;&#8593;&#8595;</kbd> / drag mouse <span>Look around</span></li>
          <li><kbd>M</kbd> <span>Open the chart navigation menu (gaze or click a button to jump to a chart)</span></li>
          <li><kbd>V</kbd> <span>Voice-navigate &mdash; say a chart name, like &ldquo;trend&rdquo; or &ldquo;volatility&rdquo;</span></li>
          <li><kbd>C</kbd> <span>Ask the AI a question about the chart you're viewing (type or speak it)</span></li>
        </ul>
        <button id="welcome-enter-btn">Enter the Lab</button>
      </div>
    `;
    document.body.appendChild(overlay);

    function dismiss() {
      overlay.remove();
      window.removeEventListener('keydown', onKeyDown);
    }

    function onKeyDown(e) {
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
        dismiss();
      }
    }

    overlay.querySelector('#welcome-enter-btn').addEventListener('click', dismiss);
    window.addEventListener('keydown', onKeyDown);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWelcomeScreen);
  } else {
    buildWelcomeScreen();
  }
})();