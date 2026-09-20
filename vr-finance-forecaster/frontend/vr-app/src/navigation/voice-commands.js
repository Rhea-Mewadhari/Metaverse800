/* global AFRAME */
(function () {
  const CHART_ALIASES = {
    trend: ['trend', 'price trend', 'moving average'],
    forecast: ['forecast', 'regression', 'prediction'],
    'monte-carlo': ['monte carlo', 'simulation', 'cone'],
    volatility: ['volatility', 'risk'],
    correlation: ['correlation', 'heatmap', 'diversification'],
  };

  AFRAME.registerComponent('voice-commands', {
    init: function () {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('voice-commands: Web Speech API not supported in this browser — voice nav disabled, gaze menu and keyboard still work.');
        return;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event) => {
        const said = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log('voice-commands heard:', said);
        this.handleCommand(said);
      };
      this.recognition.onerror = (event) => console.warn('voice-commands error:', event.error);
      // browsers auto-stop recognition after silence — restart it so voice
      // stays available for the whole session, not just the first utterance
      this.recognition.onend = () => { if (this.listening) this.recognition.start(); };

      this.listening = false;
      this.onKeyDown = (e) => { if (e.code === 'KeyV') this.toggleListening(); };
      window.addEventListener('keydown', this.onKeyDown);

      const status = document.createElement('a-text');
      status.setAttribute('value', '');
      status.setAttribute('color', '#0ca30c');
      status.setAttribute('align', 'center');
      status.setAttribute('width', 1.5);
      status.setAttribute('position', '0 0.4 -1');
      this.el.appendChild(status);
      this.status = status;
    },

    toggleListening: function () {
      this.listening = !this.listening;
      if (this.listening) this.recognition.start(); else this.recognition.stop();
      this.status.setAttribute('value', this.listening ? 'Listening (say a chart name)' : '');
    },

    handleCommand: function (said) {
      for (const [chartId, aliases] of Object.entries(CHART_ALIASES)) {
        if (aliases.some((phrase) => said.includes(phrase))) {
          this.el.emit('voice-navigate', { chartId });
          return;
        }
      }
      if (said.includes('menu') || said.includes('help')) this.el.emit('voice-toggle-menu');
    },

    remove: function () {
      window.removeEventListener('keydown', this.onKeyDown);
      if (this.recognition) this.recognition.stop();
    },
  });
})();