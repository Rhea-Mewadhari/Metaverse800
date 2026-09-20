# Project Structure

```vr-finance-forecaster/
├── README.md
├── .gitignore
├── .env.example                    # placeholder keys (Gemini/Groq, Firebase/Supabase) — never commit real ones
├── data/
│   ├── raw/                        # cached yfinance pulls
│   └── processed/                  # precomputed chart JSON (trend, regression, monte-carlo, volatility, correlation)
├── notebooks/                      # Colab/Jupyter scripts: pull yfinance data, run regression/Monte Carlo/volatility, export JSON to data/processed
├── backend/
│   ├── requirements.txt
│   ├── main.py                     # FastAPI entrypoint, mounts routers below
│   ├── charts/                     # serves precomputed chart JSON from data/processed
│   ├── voice/                      # thin: logs/normalizes voice commands (recognition itself is client-side — see note)
│   ├── ai/                         # POST /ask — builds prompt from "current chart" context + question, calls Gemini/Groq, keeps API key server-side
│   └── dashboard/                  # POST /events (log usage), GET /summary (aggregated stats) — wraps Firebase/Supabase
└── frontend/
    ├── vr-app/
    │   ├── index.html
    │   └── src/
    │       ├── charts/             # one module per visualization (trend, regression, monte-carlo, volatility, correlation)
    │       ├── navigation/         # voice-commands.js (Web Speech API) + controller-menu.js (gaze/controller fallback)
    │       └── ai-assistant/       # chat-ui.js + speech-output.js (Web Speech Synthesis for spoken answers)
    └── usage-dashboard/            # separate lightweight 2D page (Chart.js/Plotly or Streamlit instead) reading /summary
```

## How to set up

### Backend set up:

1. Create venv in backend folder:
```
cd vr-finance-forecaster/backend
```
```
python -m venv venv
```
2. Activate environment
```
venv/Scripts/activate
```
3. Install requirements
```
pip install -r requirements.txt
```
4. start the backend server:
```
uvicorn main:app --reload --port 8000
```

### Frontend Setup:

1. Once above is completed, navigate to the root folder and start the server:
```
python -m http.server 8080
```

Both frontend and backend server should be up. Navigate to :
`http://localhost:8080/frontend/vr-app/` to see the rendered page


For the agent functionality create your Grok account and create your .env file in the backend folder. See .env.example for the structure

Access the usage dashboard here: `http://localhost:8080/frontend/usage-dashboard/index.html`