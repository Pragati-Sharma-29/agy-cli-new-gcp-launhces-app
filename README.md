# 🚀 BigQuery Release Pulse

**BigQuery Release Pulse** is a real-time curation dashboard designed for cloud architects, developers, and developer relations teams to stay updated on Google Cloud BigQuery releases. Built with a **Python Flask** backend and a responsive, high-performance vanilla **HTML5/CSS3/JS** frontend, it parses live release feeds, provides statistics and keyword search, and facilitates smart social sharing with automatic length limit enforcement.

---

## 🎨 Main Features

-   **🔄 Dynamic Feed Fetching**: Fetches the live Google Cloud BigQuery Atom XML feed directly and parses it on the fly.
-   **🧩 Granular Update Segmentation**: Rather than presenting daily entries as a single massive wall of text, a backend regex-based parser splits entries by `<h3>` headings (e.g., *Feature, Fixed, Changed, Deprecated*).
-   **📊 Active Stats Dashboard**: Real-time analytics showing total logged days, overall update count, and metrics highlighting features vs. changes/fixes.
-   **🔍 Sub-Second Full-Text Filter**: Instantly search for keywords, filter by category types, or sort chronological directions (Newest First vs. Oldest First).
-   **🐦 Smart Tweet Intent modal**: Opens a customizable sharing editor with a live character count. It intelligently truncates long descriptions down to fit precisely within Twitter's **280-character limit** while preserving critical metadata (Date, Category, and Link).
-   **✨ Premium Visual Theme**: Features a custom-styled, futuristic deep-space visual design complete with glassmorphic cards, timeline tracking, and pulsing status effects.

---

## 📂 Project Structure

```
bigquery-release-notes-app/
├── app.py                      # Flask Application Server (XML Parser & Segmentation logic)
├── README.md                   # Project Documentation
├── .gitignore                  # Git Ignore Configurations
├── templates/
│   └── index.html              # Core HTML5 layout with metadata and dialog overlays
└── static/
    ├── css/
    │   └── style.css           # Premium Space-Tech Theme & timeline CSS rules
    └── js/
        └── app.js              # Client state, dynamic re-rendering, and Tweet compiler
```

---

## 🛠️ Installation & Setup

### Prerequisites
-   Python 3.8 or later
-   `pip` package manager

### 1. Set Up Your Environment
Navigate to the directory and set up a Python virtual environment:
```bash
cd bigquery-release-notes-app
python3 -m venv venv
```

### 2. Activate the Virtual Environment
-   **On Linux / macOS:**
    ```bash
    source venv/bin/activate
    ```
-   **On Windows (cmd):**
    ```cmd
    venv\Scripts\activate.bat
    ```

### 3. Install Dependencies
Install the required packages:
```bash
pip install flask requests
```

### 4. Launch the Web Application
Start the local server:
```bash
python app.py
```
Open your browser and navigate to **[http://localhost:5000](http://localhost:5000)** to view the live dashboard!

---

## ⚙️ How It Works (Under the Hood)

### The Backend XML & Text Parser
The server (`app.py`) fetches the Atom XML and loads it into an Element Tree. Because the actual content is embedded as a single HTML string, we use a regex splitter to segment updates dynamically:
```python
parts = re.split(r'<h3>(.*?)</h3>', html_str)
```
This isolates sections like *Feature* or *Fixed* along with their corresponding text. It then strips HTML tags to compile a clean plain-text summary used by the frontend for social shares.

### Client-Side Reactivity
The frontend (`app.js`) handles state tracking. When filters change, it filters the pre-fetched dataset and reconstructs the DOM structure on the fly without refreshing the page.

For Twitter sharing, the JS calculates string lengths:
```javascript
const maxBodyLen = 280 - prefix.length - suffix.length - 4;
```
This guarantees that any update shared will fit perfectly within Twitter's character limits.

---

## 📝 License
This project is licensed under the MIT License.
