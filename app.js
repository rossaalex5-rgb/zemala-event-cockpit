const STORAGE_KEY = 'zemala_v1_ledger';

const Ledger = {
    data: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),

    async sha256(text) {
        const enc = new TextEncoder().encode(text);
        const buf = await crypto.subtle.digest("SHA-256", enc);
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    },

    canonicalize(obj) {
        if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
        if (Array.isArray(obj)) return '[' + obj.map(this.canonicalize.bind(this)).join(',') + ']';
        const keys = Object.keys(obj).sort();
        const parts = keys.map(k => JSON.stringify(k) + ':' + this.canonicalize(obj[k]));
        return '{' + parts.join(',') + '}';
    },

    async add(event) {
        const prevHash = this.data.length > 0 ? this.data[this.data.length - 1].hash : "GENESIS_ZEMALA_0";
        event.parentHash = prevHash;
        event.timestamp = new Date().toISOString();
        
        const canon = this.canonicalize(event);
        event.hash = await this.sha256(canon);

        this.data.push(event);
        this.save();
        this.render();
        this.validateChain();
    },

    save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); },

    render() {
        const container = document.getElementById("ledger");
        if (!this.data.length) { container.innerHTML = "Keine Events vorhanden."; return; }
        container.innerHTML = this.data.slice().reverse().map(e => `
            <div class="entry">
                <div><b>${this.escapeHtml(e.command)}</b> <span class="meta">${new Date(e.timestamp).toLocaleString()}</span></div>
                <div class="meta">Payload: ${this.escapeHtml(JSON.stringify(e.payload))}</div>
                <div class="hash">Hash: ${e.hash.substring(0,16)}... | Parent: ${e.parentHash.substring(0,8)}...</div>
            </div>
        `).join("");
    },

    escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    },

    validateChain() {
        const statusEl = document.getElementById("status");
        let valid = true;
        for (let i = 1; i < this.data.length; i++) {
            if (this.data[i].parentHash !== this.data[i-1].hash) { valid = false; break; }
        }
        statusEl.textContent = valid ? "✓ Chain intakt" : "✗ Chain beschädigt!";
        statusEl.style.color = valid ? "#FFD700" : "#ff4444";
    }
};

async function signAndDownload() {
    const cmd = document.getElementById("cmd").value;
    const val = document.getElementById("payload").value || "";
    const event = { id: "evt-" + Date.now(), command: cmd, payload: { value: val } };
    await Ledger.add(event);

    const blob = new Blob([JSON.stringify(event, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.timestamp.replace(/[:.]/g, "-")}.event.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

window.onload = () => { Ledger.render(); Ledger.validateChain(); };
