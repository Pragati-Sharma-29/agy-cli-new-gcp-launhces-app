import os
import re
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_html_content(html_str):
    if not html_str:
        return []
    
    parts = re.split(r'<h3>(.*?)</h3>', html_str)
    updates = []
    
    if len(parts) > 1:
        for i in range(1, len(parts), 2):
            heading = parts[i].strip()
            content_block = parts[i+1].strip() if i+1 < len(parts) else ""
            
            # Extract plain text
            plain_text = re.sub(r'<[^>]+>', '', content_block).strip()
            plain_text = re.sub(r'\s+', ' ', plain_text)
            
            updates.append({
                "type": heading,
                "html": content_block,
                "text": plain_text
            })
    else:
        plain_text = re.sub(r'<[^>]+>', '', html_str).strip()
        plain_text = re.sub(r'\s+', ' ', plain_text)
        updates.append({
            "type": "General",
            "html": html_str,
            "text": plain_text
        })
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    try:
        r = requests.get(FEED_URL, timeout=10)
        r.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(r.content)
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        
        entries = []
        for entry in root.findall("atom:entry", ns):
            title = entry.find("atom:title", ns).text.strip()
            updated = entry.find("atom:updated", ns).text.strip()
            
            link_elem = entry.find("atom:link[@rel='alternate']", ns)
            link_href = link_elem.attrib.get("href", "") if link_elem is not None else ""
            
            content_elem = entry.find("atom:content", ns)
            content_html = content_elem.text if content_elem is not None else ""
            
            # Split parsed content into individual updates
            updates = parse_html_content(content_html)
            
            entries.append({
                "date": title,
                "updated": updated,
                "link": link_href,
                "updates": updates
            })
            
        return jsonify({
            "status": "success",
            "entries": entries
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
