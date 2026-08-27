# Aura Reflection - User-Authenticated AI Journal with Gemini & Firestore

Aura Reflection is a secure, user-authenticated journaling and multi-turn reflection web application built on **Google Cloud Run**, **Gemini 3.6 Flash**, and **Cloud Firestore**. 

---

## 🛡️ Agentic Threat Summary Table

| Threat Zone | Potential Risks | Applied Countermeasures |
| :--- | :--- | :--- |
| **1. Input Surfaces** | Malicious prompt injection, oversized payload attacks, malicious script injection in journal reflections. | Top-level body limits (2MB), strict JSON payload parsing, defensive schema validation before forwarding to Gemini. |
| **2. Planning & Reasoning** | System instruction bypass, model downtime/rate limits (503/429), ungrounded advice. | System instruction framing treating journal inputs as inert content; **Resilient Model Fallback Ladder** (`gemini-3.6-flash` → `gemini-3.1-flash-lite` → dynamic alias → `gemini-3.7-flash`). |
| **3. Tool Execution & Server Endpoints** | Unauthorized API usage, SSRF, dynamic code execution. | Strict server-side proxying for Gemini, defensive null-safe payload ingestion, no external SSRF capabilities. |
| **4. Memory & State (Firestore)** | Cross-user data leakage, reading another user's private journal entries, corrupted document state. | User-isolated document paths under `/users/{userId}/*`, strict Firestore security rules enforcing `request.auth.uid == userId`, strict undefined-stripping via `cleanPayload()`. |
| **5. Inter-System Communication & Secrets** | Client-side API key leakage, token theft, hardcoded secrets. | `GEMINI_API_KEY` stored exclusively in Secret Manager / server-side env vars; Zero-hardcoding standard; Federated Google Authentication via Firebase Auth. |

---

## 🔒 Cloud Firestore Security Rules

Deploy the following security rules to guarantee user data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🚀 Step-by-Step Google Cloud Run Deployment Guide

### 1. Prerequisites & API Activation

Ensure you have the Google Cloud CLI (`gcloud`) installed and configured with your project:

```bash
# Set default project
gcloud config set project YOUR_PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

### 2. Secret Manager Configuration (Zero-Hardcoding)

Create and populate the `GEMINI_API_KEY` secret, and bind access to your Cloud Run runtime service account:

```bash
# Create the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Populate the secret with your Gemini API Key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Obtain your project number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

# Grant the default compute service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Build & Deploy to Google Cloud Run

Deploy the container directly from source:

```bash
gcloud run deploy aura-reflection \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

### 4. Mandatory Campaign Challenge Labeling

Apply the mandatory resource label to register your Cloud Run service for automated challenge verification:

```bash
gcloud run services update aura-reflection \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🧪 Functional Walkthrough & Test Guide

Every user interaction has a corresponding verification test case:

| Test ID | Interaction / Flow | Action & Expected Outcome |
| :--- | :--- | :--- |
| **TC-01** | Landing & Sign In | Click **"Continue with Google"** on landing. Sign-in popup appears, authenticates via Firebase Auth, and seamlessly navigates to the private dashboard. |
| **TC-02** | Start Reflection | Title input accepts custom reflection title; category and mood pills are selectable and persist state immediately. |
| **TC-03** | Multi-Turn Conversation with Gemini | Type journal text and click **Send** or press Enter. Gemini reflects back with empathetic analysis, key takeaways, and prompt continuations. |
| **TC-04** | Cloud Firestore Persistence | Observe the **"Saved to Firestore"** indicator. Any input or Gemini synthesis is immediately written to `/users/{userId}/entries/{id}` with `cleanPayload()`. |
| **TC-05** | View Past Entries Archive | Click **"Past Entries"** in navigation. Archived entries are queried in real time, showing categories, mood tags, turn counts, and AI summaries. |
| **TC-06** | Search & Filter History | Type keywords in the search bar or filter by Category/Mood dropdowns. History list filters dynamically. |
| **TC-07** | Resume Past Reflection | Click any entry in the history grid. The editor opens with full multi-turn history restored, allowing additional turns. |
| **TC-08** | Security & Threat Model Inspector | Click the shield icon in Navbar to inspect the 5 Threat Zones and Firestore security rules verification matrix. |
| **TC-09** | Sign Out & Session Teardown | Click the Sign Out icon in Navbar. State clears and UI redirects to AuthLanding. |
