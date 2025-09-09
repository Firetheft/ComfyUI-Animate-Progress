import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

// Create a single, independent preview element and attach it directly to the body.
const hoverPreview = document.createElement("div");
hoverPreview.id = "ap-gif-hover-preview";
Object.assign(hoverPreview.style, {
    position: 'fixed',
    display: 'none',
    zIndex: '1005',
    background: 'transparent',
    border: 'none',
    padding: '0',
    pointerEvents: 'none', // Allow clicks to pass through
});
const hoverPreviewImg = document.createElement("img");
Object.assign(hoverPreviewImg.style, {
    maxWidth: '150px',
    maxHeight: '150px',
});
hoverPreview.appendChild(hoverPreviewImg);
document.body.appendChild(hoverPreview);

class SettingsDialog {
    constructor() {
        this.element = document.createElement("div");
        this.element.id = "ap-settings-dialog";
        Object.assign(this.element.style, {
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            backgroundColor: 'var(--comfy-menu-secondary-bg)', color: 'var(--node-text-color)', padding: '20px', borderRadius: '10px',
            boxShadow: '0 0 20px rgba(0,0,0,0.8)', zIndex: '1002', display: 'none',
            minWidth: '450px', border: '1px solid #444', fontFamily: 'sans-serif'
        });

        this.element.innerHTML = `
            <div id="ap-settings-header" style="cursor: move; background-color: var(--comfy-input-bg); padding: 10px; border-radius: 8px 8px 0 0; margin: -20px -20px 15px -20px;">
                <h2 style="margin: 0; font-size: 18px;">Animate Progress Bar Settings</h2>
                <button id="ap-close-btn" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: #fff; font-size: 20px; cursor: pointer;">&times;</button>
            </div>
            <div class="ap-setting"><label>Enable Plugin</label><input type="checkbox" data-setting="enabled"></div>
            <div class="ap-setting">
                <label>GIF Animation</label>
                <div class="ap-custom-select-wrapper" data-select-for="selectedGif">
                    <div class="ap-custom-select-trigger"><span></span><div class="ap-arrow"></div></div>
                    <div class="ap-custom-options"></div>
                </div>
            </div>
            <div class="ap-setting"><label>GIF Size (height)</label><input type="range" min="20" max="150" data-setting="gifHeight"> <span>60px</span></div>
            <div class="ap-setting"><label>GIF Position (top)</label><input type="range" min="-150" max="50" data-setting="gifTop"> <span>-55px</span></div>
            <hr style="border-color: #444;">
            <div class="ap-setting"><label>Enable GIF Shadow</label><input type="checkbox" data-setting="shadowEnabled"></div>
            <div class="ap-setting"><label>Shadow Blur</label><input type="range" min="0" max="20" data-setting="shadowBlur"> <span>3px</span></div>
            <hr style="border-color: #444;">
            <div class="ap-setting">
                <label>Bar Style</label>
                <div class="ap-custom-select-wrapper" data-select-for="barStyle">
                    <div class="ap-custom-select-trigger"><span></span><div class="ap-arrow"></div></div>
                    <div class="ap-custom-options"></div>
                </div>
            </div>
            <div class="ap-setting"><label>Bar Gradient Start</label><input type="color" data-setting="gradientColor1"></div>
            <div class="ap-setting"><label>Bar Gradient Middle</label><input type="color" data-setting="gradientColor2"></div>
            <div class="ap-setting"><label>Bar Gradient End</label><input type="color" data-setting="gradientColor3"></div>
            <div class="ap-setting"><label>End Color Opacity</label><input type="range" min="0" max="1" step="0.01" data-setting="gradientColor3Alpha"> <span>1.0</span></div>
            <hr style="border-color: #444;">
            <div class="ap-setting"><label>Fade In/Out Effect</label><input type="checkbox" data-setting="fadeInOut"></div>
        `;
        document.body.appendChild(this.element);
        this.makeDraggable();
        this.element.querySelector('#ap-close-btn').onclick = () => this.hide();
    }
    show() { this.element.style.display = 'block'; }
    hide() { this.element.style.display = 'none'; }
    isVisible() { return this.element.style.display === 'block'; }
    makeDraggable() {
        const header = this.element.querySelector("#ap-settings-header");
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        header.onmousedown = (e) => {
            e.preventDefault();
            pos3 = e.clientX; pos4 = e.clientY;
            document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
            document.onmousemove = (e) => {
                e.preventDefault();
                pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
                pos3 = e.clientX; pos4 = e.clientY;
                this.element.style.top = `${this.element.offsetTop - pos2}px`;
                this.element.style.left = `${this.element.offsetLeft - pos1}px`;
            };
        };
    }
}

app.registerExtension({
    name: "Comfy.AnimateProgress.Final",
    
    settings: {
        enabled: true, selectedGif: 'random', gifHeight: 60, gifTop: -55, shadowEnabled: true,
        shadowBlur: 3, barStyle: 'default', gradientColor1: '#00c3ff', gradientColor2: '#ff00c3',
        gradientColor3: '#00ffc9', gradientColor3Alpha: 0.0, fadeInOut: true,
    },

    loadSettings() {
        const saved = localStorage.getItem('comfy.animateProgress.settings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    },

    saveSettings() {
        localStorage.setItem('comfy.animateProgress.settings', JSON.stringify(this.settings));
    },

    createElements() {
        this.containerElement = document.createElement("div");
        this.containerElement.id = "progress-container-fixed";
        this.containerElement.className = "ap-container";
        Object.assign(this.containerElement.style, {
            position: 'fixed', bottom: '0px', left: '50%', transform: 'translateX(-50%)',
            width: '50%', maxWidth: '600px', height: '5px', backgroundColor: 'var(--comfy-input-bg)',
            borderRadius: '2px', boxShadow: '0 0 10px rgba(0,0,0,0.5)', display: 'none',
            pointerEvents: 'none', zIndex: '1001'
        });

        this.progressBarElement = document.createElement("div");
        this.progressBarElement.id = "progress-bar-fill";
        Object.assign(this.progressBarElement.style, {
            position: 'absolute', left: '0', top: '0', height: '100%', width: '0%', borderRadius: '10px'
        });

        this.runnerElement = document.createElement("img");
        this.runnerElement.id = "execution-runner-final";
        Object.assign(this.runnerElement.style, {
            position: 'absolute', left: '0%', transform: 'translateX(-50%)', imageRendering: 'pixelated',
            zIndex: '1002'
        });
        this.runnerElement.onerror = () => console.error("AnimateProgress: Failed to load runner GIF!");

        this.containerElement.append(this.progressBarElement, this.runnerElement);
        document.body.appendChild(this.containerElement);
    },
    
    hexToRgba(hex, alpha) {
        let r = 0, g = 0, b = 0;
        if (hex.length == 4) { r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16); } 
        else if (hex.length == 7) { r = parseInt(hex[1] + hex[2], 16); g = parseInt(hex[3] + hex[4], 16); b = parseInt(hex[5] + hex[6], 16); }
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },
    
    applySettings() {
        this.runnerElement.style.height = `${this.settings.gifHeight}px`;
        this.runnerElement.style.top = `${this.settings.gifTop}px`;
        this.runnerElement.style.filter = this.settings.shadowEnabled ? `drop-shadow(2px 2px ${this.settings.shadowBlur}px rgba(0, 0, 0, 0.7))` : 'none';
        
        const color3Rgba = this.hexToRgba(this.settings.gradientColor3, this.settings.gradientColor3Alpha);
        const baseGradient = `linear-gradient(to right, ${this.settings.gradientColor1}, ${this.settings.gradientColor2}, ${color3Rgba})`;
        
        let style = { background: baseGradient, animation: 'none', boxShadow: 'none' };

        switch(this.settings.barStyle) {
            case 'scanner':
                const scannerGradient = `linear-gradient(to right, transparent, rgba(255,255,255,0.8), transparent)`;
                style.background = `${baseGradient}, ${scannerGradient}`;
                style.backgroundSize = '100% 100%, 15% 100%';
                style.backgroundRepeat = 'no-repeat';
                style.animation = 'techScannerAnimation 2s ease-in-out infinite';
                break;
            case 'pulsing':
                style.animation = `pulsingGlowAnimation 2s ease-in-out infinite`;
                break;
            case 'plasma':
                style.background = `linear-gradient(-45deg, ${this.settings.gradientColor1}, ${this.settings.gradientColor2}, ${this.settings.gradientColor3}, #ff00c3)`;
                style.backgroundSize = '400% 400%';
                style.animation = 'plasmaFlowAnimation 10s ease infinite';
                break;
            case 'barber':
                style.background = `repeating-linear-gradient(45deg, ${this.settings.gradientColor1}, ${this.settings.gradientColor1} 10px, ${this.settings.gradientColor2} 10px, ${this.settings.gradientColor2} 20px)`;
                style.animation = 'barberpoleAnimation 1s linear infinite';
                break;
            case 'cosmic-weave':
                style.background = `
                    linear-gradient(60deg, ${this.settings.gradientColor1} 12%, transparent 12.5%, transparent 87%, ${this.settings.gradientColor1} 87.5%, ${this.settings.gradientColor1}),
                    linear-gradient(-60deg, ${this.settings.gradientColor2} 12%, transparent 12.5%, transparent 87%, ${this.settings.gradientColor2} 87.5%, ${this.settings.gradientColor2}),
                    linear-gradient(60deg, ${this.settings.gradientColor3} 12%, transparent 12.5%, transparent 87%, ${this.settings.gradientColor3} 87.5%, ${this.settings.gradientColor3}),
                    linear-gradient(-60deg, ${this.settings.gradientColor1} 12%, transparent 12.5%, transparent 87%, ${this.settings.gradientColor1} 87.5%, ${this.settings.gradientColor1})
                `;
                style.backgroundSize = '20px 35px';
                style.animation = 'cosmicWeaveAnimation 2s linear infinite';
                break;
            case 'dna-helix':
                style.background = `
                    linear-gradient(45deg, ${this.settings.gradientColor1} 25%, transparent 25%), 
                    linear-gradient(-45deg, ${this.settings.gradientColor1} 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, ${this.settings.gradientColor2} 75%),
                    linear-gradient(-45deg, transparent 75%, ${this.settings.gradientColor2} 75%)
                `;
                style.backgroundSize = '20px 20px';
                style.animation = 'dnaHelixAnimation 1s linear infinite';
                break;
            case 'marching-ants':
                style.background = `repeating-linear-gradient(to right, ${this.settings.gradientColor1} 0, ${this.settings.gradientColor1} 10px, transparent 10px, transparent 20px)`;
                style.backgroundSize = `40px 100%`;
                style.animation = 'marchingAntsAnimation 1s linear infinite';
                break;
        }

        this.progressBarElement.style.cssText = `position: absolute; left: 0; top: 0; height: 100%; width: ${this.progressBarElement.style.width}; border-radius: 10px;`;
        Object.assign(this.progressBarElement.style, style);

        this.containerElement.style.transition = this.settings.fadeInOut ? 'opacity 0.5s ease-in-out' : 'none';
    },

    populateSettings() {
        const dialog = this.settingsDialog.element;
        // Populate standard settings
        for (const [key, value] of Object.entries(this.settings)) {
            if (key === 'selectedGif' || key === 'barStyle') continue; // Skip custom selects
            const el = dialog.querySelector(`[data-setting="${key}"]`);
            if (el) {
                if (el.type === 'checkbox') el.checked = value;
                else el.value = value;
                if (el.type === 'range') {
                    el.nextElementSibling.textContent = (key === 'gradientColor3Alpha') ? parseFloat(value).toFixed(2) : `${value}px`;
                }
            }
        }
        
        // Populate Custom GIF Selector
        const gifSelect = dialog.querySelector('[data-select-for="selectedGif"]');
        gifSelect.querySelector('.ap-custom-select-trigger span').textContent = this.settings.selectedGif;
        const gifOptionsContainer = gifSelect.querySelector('.ap-custom-options');
        gifOptionsContainer.innerHTML = '';
        ['random', ...this.runnerGifs].forEach(gif => {
            const optionEl = document.createElement('div');
            optionEl.className = 'ap-custom-option';
            optionEl.textContent = gif;
            optionEl.dataset.value = gif;
            gifOptionsContainer.appendChild(optionEl);
        });

        // Populate Custom Bar Style Selector
        const barStyleSelect = dialog.querySelector('[data-select-for="barStyle"]');
        const barStyleOptions = {
            'default': 'Default Gradient', 'scanner': 'Tech Scanner', 'pulsing': 'Pulsing Glow',
            'plasma': 'Plasma Flow', 'barber': 'Barber Pole', 'cosmic-weave': 'Cosmic Weave',
            'dna-helix': 'DNA Helix', 'marching-ants': 'Marching Ants'
        };
        barStyleSelect.querySelector('.ap-custom-select-trigger span').textContent = barStyleOptions[this.settings.barStyle] || this.settings.barStyle;
        const barStyleOptionsContainer = barStyleSelect.querySelector('.ap-custom-options');
        barStyleOptionsContainer.innerHTML = '';
        for (const [value, text] of Object.entries(barStyleOptions)) {
            const optionEl = document.createElement('div');
            optionEl.className = 'ap-custom-option';
            optionEl.textContent = text;
            optionEl.dataset.value = value;
            barStyleOptionsContainer.appendChild(optionEl);
        }
    },

    async setup() {
        this.isExecuting = false; this.progress = 0; this.runnerGifs = [];

        const styleSheet = document.createElement("style");
        styleSheet.innerText = `
            .ap-setting{display:flex;align-items:center;margin-bottom:10px;font-size:13px}
            .ap-setting label{width:150px;flex-shrink:0}
            .ap-setting select,.ap-setting input:not([type=checkbox]){flex-grow:1}
            .ap-setting input[type=color]{padding:0;border:none;min-width:50px;background:0 0}
            .ap-setting input[type=range]+span{min-width:50px;text-align:right}
            .ap-custom-select-wrapper { position: relative; flex-grow: 1; user-select: none; }
            .ap-custom-select-trigger { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 5px; background: var(--comfy-input-bg); border-radius: 4px; border: 1px solid #555; cursor: pointer; height: 26px; box-sizing: border-box; }
            .ap-custom-select-trigger span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .ap-arrow { width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid #fff; }
            .ap-custom-options { position: absolute; top: 105%; left: 0; right: 0; background: var(--comfy-menu-bg); border: 1px solid #555; border-radius: 4px; z-index: 1004; max-height: 200px; overflow-y: auto; display: none; }
            .ap-custom-option { padding: 8px; cursor: pointer; }
            .ap-custom-option:hover { background: var(--comfy-menu-secondary-bg); }
            .ap-custom-options.open { display: block; }
            @keyframes techScannerAnimation{0%{background-position:-15% 0, -15% 0}50%{background-position:0 0, 115% 0}100%{background-position:0 0, 115% 0}}
            @keyframes pulsingGlowAnimation{0%{box-shadow:0 0 5px 0px rgba(255,255,255,0.2)}50%{box-shadow:0 0 15px 5px rgba(24, 247, 255, 0.7)}100%{box-shadow:0 0 5px 0px rgba(255,255,255,0.2)}}
            @keyframes plasmaFlowAnimation{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
            @keyframes barberpoleAnimation{0%{background-position:0 0}100%{background-position:20px 0}}
            @keyframes cosmicWeaveAnimation {0% {background-position: 0 0;} 100% {background-position: 40px 70px;}}
            @keyframes dnaHelixAnimation {0% {background-position: 0 0;} 100% {background-position: 40px 0;}}
            @keyframes marchingAntsAnimation {0% {background-position: 0 0;} 100% {background-position: 40px 0;}}
        `;
        document.head.appendChild(styleSheet);
        
        this.loadSettings();
        this.createElements();

        this.settingsDialog = new SettingsDialog();
        const settingsIcon = document.createElement("div");
        settingsIcon.id = "ap-settings-icon";
        settingsIcon.textContent = "🔜";
        Object.assign(settingsIcon.style, {
            position: 'fixed', bottom: '240px', right: '12px', width: '40px', height: '40px', 
            backgroundColor: 'var(--p-button-secondary-background)', color: '#fff', borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', zIndex: '1001', border: '1px solid var(--p-button-secondary-border-color)'
        });
        settingsIcon.onclick = () => {
            if (this.settingsDialog.isVisible()) { this.settingsDialog.hide(); } 
            else { this.populateSettings(); this.settingsDialog.show(); }
        };
        settingsIcon.onmouseover = () => {
            settingsIcon.style.backgroundColor = 'var(--comfy-menu-bg)';
        };
        settingsIcon.onmouseout = () => {
            settingsIcon.style.backgroundColor = 'var(--p-button-secondary-background)';
        };
        document.body.appendChild(settingsIcon);

        this.applySettings();
        
        try {
            const res = await api.fetchApi("/extensions/ComfyUI-Animate-Progress/get_gifs");
            if (res.status === 200) this.runnerGifs = await res.json();
        } catch (e) { console.error("AnimateProgress: Error fetching GIF list:", e); }

        // The original listener for standard inputs. It now ignores custom selects.
        this.settingsDialog.element.querySelectorAll("input[data-setting]").forEach(el => {
            el.addEventListener('input', e => {
                const setting = e.target.dataset.setting;
                let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                if (e.target.type === 'range') {
                    if (setting === 'gradientColor3Alpha') { e.target.nextElementSibling.textContent = parseFloat(value).toFixed(2); } 
                    else { e.target.nextElementSibling.textContent = `${value}px`; }
                    value = Number(value);
                }
                this.settings[setting] = value;
                this.applySettings();
                this.saveSettings();
            });
        });

        // New, separate listeners for the custom dropdowns
        const dialog = this.settingsDialog.element;
        dialog.querySelectorAll('.ap-custom-select-wrapper').forEach(wrapper => {
            const trigger = wrapper.querySelector('.ap-custom-select-trigger');
            const optionsContainer = wrapper.querySelector('.ap-custom-options');
            const settingKey = wrapper.dataset.selectFor;

            trigger.addEventListener('click', () => optionsContainer.classList.toggle('open'));

            optionsContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('ap-custom-option')) {
                    this.settings[settingKey] = e.target.dataset.value;
                    optionsContainer.classList.remove('open');
					hoverPreview.style.display = 'none';
                    this.populateSettings();
                    this.applySettings();
                    this.saveSettings();
                }
            });

            if (settingKey === 'selectedGif') {
                optionsContainer.addEventListener('mouseover', (e) => {
                    if (e.target.classList.contains('ap-custom-option')) {
                        const gif = e.target.dataset.value;
                        if (gif && gif !== 'random') {
                            hoverPreviewImg.src = `/extensions/ComfyUI-Animate-Progress/runners/${gif}`;
                            const rect = e.target.getBoundingClientRect();
                            hoverPreview.style.left = `${rect.right + 50}px`;
                            hoverPreview.style.top = `${rect.top - 50}px`;
                            hoverPreview.style.display = 'block';
                        } else {
                            hoverPreview.style.display = 'none';
                        }
                    }
                });
                optionsContainer.addEventListener('mouseleave', () => {
                    hoverPreview.style.display = 'none';
                });
            }
        });
        window.addEventListener('click', (e) => {
            if (!e.target.closest('.ap-custom-select-wrapper')) {
                dialog.querySelectorAll('.ap-custom-options').forEach(o => o.classList.remove('open'));
            }
        });


        api.addEventListener("progress", ({ detail: p }) => {
            if (!this.settings.enabled) return;
            const wasExecuting = this.isExecuting;
            this.isExecuting = true;
            this.progress = p.value / p.max;
            if (!wasExecuting) {
                if (this.runnerGifs.length > 0) {
                    let gif = this.settings.selectedGif === 'random' ? this.runnerGifs[Math.floor(Math.random() * this.runnerGifs.length)] : this.settings.selectedGif;
                    this.runnerElement.src = `/extensions/ComfyUI-Animate-Progress/runners/${gif}`;
                }
                this.renderLoop();
            }
            this.updateProgressPosition();
        });

        api.addEventListener("executing", ({ detail: nodeId }) => {
            if (!nodeId && this.isExecuting) this.isExecuting = false;
        });
    },

    updateProgressPosition() {
        const perc = `${(this.progress * 100).toFixed(2)}%`;
        this.progressBarElement.style.width = perc;
        this.runnerElement.style.left = perc;
    },

    renderLoop() {
        if (!this.isExecuting) {
            this.containerElement.style.opacity = '0';
            setTimeout(() => { if (!this.isExecuting) this.containerElement.style.display = 'none'; }, 500);
            return;
        }
        
        this.containerElement.style.display = 'block';
        requestAnimationFrame(() => { this.containerElement.style.opacity = '1'; });

        this.updateProgressPosition();
        requestAnimationFrame(() => this.renderLoop());
    }
});