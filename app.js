const STORAGE_KEY = 'zemala_v1_ledger';

const UI = {
    toast(msg) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2500);
    },
    updateStatus(valid) {
        const s = document.getElementById('status');
        s.textContent = valid ? '✓ KETTE INTEGRAL' : '⚠️ KETTE BESCHÄDIGT';
        s.style.color = valid ? '#ffd700' : '#ff4444';
    }
};

const Ledger = {
    data: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),

    async sha256(text) {
        const enc = new TextEncoder().encode(text);
        const buf = await crypto.subtle.digest("SHA-256", enc);
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    },

    canonicalize(obj) {
        const keys = Object.keys(obj).sort();
        return JSON.stringify(obj, keys);
    },

    async add(cmd, val) {
        const event = {
            id: 'evt-' + Date.now(),
            command: cmd,
            payload: val,
            timestamp: new Date().toISOString(),
            parentHash: this.data.length ? this.data[this.data.length - 1].hash : "GENESIS"
        };

        const canon = this.canonicalize(event);
        event.hash = await this.sha256(canon);

        this.data.push(event);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        this.render();
        await this.validate();
        return event;
    },

    render() {
        const container = document.getElementById("ledger");
        container.innerHTML = this.data.slice().reverse().map(e => `
            <div class="bubble">
                <div style="color:var(--gold); font-weight:bold;">${e.command.toUpperCase()}</div>
                <div style="margin-top:5px;">${e.payload}</div>
                <div class="meta">
                    <span>${new Date(e.timestamp).toLocaleTimeString()}</span>
                    <span style="opacity:0.5;">ID: ${e.id.split('-')[1]}</span>
                </div>
                <div class="hash">HASH: ${e.hash}</div>
            </div>
        `).join("");
    },

    async validate() {
        let valid = true;
        for (let i = 0; i < this.data.length; i++) {
            const e = this.data[i];
            const copy = {...e}; delete copy.hash;
            const recomputed = await this.sha256(this.canonicalize(copy));
            if (recomputed !== e.hash || (i > 0 && e.parentHash !== this.data[i-1].hash)) {
                valid = false; break;
            }
        }
        UI.updateStatus(valid);
    }
};

window.signAndDownload = async function() {
    const cmd = document.getElementById("cmd").value;
    const val = document.getElementById("payload").value;
    if(!val) return;

    const event = await Ledger.add(cmd, val);
    UI.toast("VOLLZUG BESTÄTIGT");
    document.getElementById("payload").value = "";

    const blob = new Blob([JSON.stringify(event, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `event-${event.id}.json`;
    a.click();
};

window.exportAll = function() {
    const blob = new Blob([JSON.stringify(Ledger.data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `zemala-ledger-full.json`;
    a.click();
    UI.toast("EXPORT ABGESCHLOSSEN");
};

window.onload = () => {
    Ledger.render();
    Ledger.validate();
};
