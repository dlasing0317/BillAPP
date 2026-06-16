// ==========================================
// 🔌 1. 綁定 UI 元素 (確認所有 ID 正確)
// ==========================================
const btnSnap = document.getElementById('btn-snap');
const cameraInput = document.getElementById('camera-input');

const tipSlider = document.getElementById('tip-slider');
const tipDisplay = document.getElementById('tip-display');
const tipRing = document.getElementById('tip-ring');
const tipThumb = document.getElementById('tip-thumb');
const tipNumbersContainer = document.getElementById('tip-numbers');

const splitSlider = document.getElementById('split-slider');
const splitDisplay = document.getElementById('split-display');
const splitRing = document.getElementById('split-ring');
const splitThumb = document.getElementById('split-thumb');
const splitNumbersContainer = document.getElementById('split-numbers');

const resultOrb = document.getElementById('result-orb');
const perPersonAmountDisplay = document.getElementById('per-person-amount');

const btnShare = document.getElementById('btn-share');
const btnDone = document.getElementById('btn-done');

const manualSubtotalInput = document.getElementById('manual-subtotal');
const manualTaxInput = document.getElementById('manual-tax');

const btnSettings = document.getElementById('btn-settings');
const settingsModal = document.getElementById('settings-modal');
const settingsNameInput = document.getElementById('settings-name-input');
const settingsVenmoInput = document.getElementById('settings-venmo-input');
const settingsZelleInput = document.getElementById('settings-zelle-input');
const btnSettingsSave = document.getElementById('btn-settings-save');
const btnSettingsCancel = document.getElementById('btn-settings-cancel');

const customModal = document.getElementById('custom-modal');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const modalCloseBtn = document.getElementById('modal-close-btn');

const cropModal = document.getElementById('crop-modal');
const cropImage = document.getElementById('crop-image');
const btnCropCancel = document.getElementById('btn-crop-cancel');
const btnCropConfirm = document.getElementById('btn-crop-confirm');
let cropper = null; 

// 🌟 全域狀態
let scannedSubtotal = 0.00; 
let scannedTax = 0.00;       
let currentGrandTotal = 0.00; 
let currentPerPerson = 0.00;  
let lastScannedImageFile = null; 

// ==========================================
// 📸 2. 核心拍照與裁切功能 (修復 Dennis 遇到的問題)
// ==========================================

// A. 點擊光圈按鈕 -> 強制開啟檔案選擇/相機
btnSnap.addEventListener('click', () => {
    console.log("Aperture Clicked! Triggering camera...");
    cameraInput.click();
});

// B. 當檔案被選擇後 -> 進入裁切流程
cameraInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log("File selected:", file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
        cropImage.src = e.target.result;
        cropModal.classList.remove('hidden'); // 顯示裁切視窗
        
        if (cropper) cropper.destroy();
        cropper = new Cropper(cropImage, {
            viewMode: 1, 
            dragMode: 'crop', 
            autoCropArea: 0.8, 
            restore: false,
            guides: true, 
            center: true, 
            highlight: false, 
            cropBoxMovable: true,
            cropBoxResizable: true, 
            toggleDragModeOnDblclick: false,
        });
    };
    reader.readAsDataURL(file);
});

// C. 點擊裁切視窗的 Cancel
btnCropCancel.addEventListener('click', () => {
    cropModal.classList.add('hidden');
    if (cropper) cropper.destroy();
    cameraInput.value = ''; // 清空檔案，避免下次無法選擇同張圖
});

// D. 點擊 Analyze (裁切並分析)
btnCropConfirm.addEventListener('click', async () => {
    if (!cropper) return;

    console.log("Starting OCR Analysis...");

    cropper.getCroppedCanvas({ maxWidth: 1024, maxHeight: 1024 }).toBlob(async (blob) => {
        cropModal.classList.add('hidden');
        cropper.destroy();
        lastScannedImageFile = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
        
        // 視覺回饋：光圈轉動發光
        btnSnap.classList.add('scanning');
        btnSnap.style.pointerEvents = 'none';

        try {
            const result = await Tesseract.recognize(blob, 'eng');
            let cleanText = result.data.text.replace(/(\d+)\s*[_\.,]\s*(\d+)/g, "$1.$2").replace(/\d+(?:\.\d+)?\s*%/g, "");

            // 執行我們那套強大的三大引擎 (加總、數學解謎、文字鎖定)
            const allAmounts = [...cleanText.matchAll(/\b\d{1,4}(?:,\d{3})*\.\d{2}\b/g)]
                .map(m => parseFloat(m[0].replace(',', ''))).sort((a, b) => b - a);

            let finalSub = 0, finalTax = 0, finalTotal = 0;

            // 引擎組合邏輯 (略縮，與之前版本相同但確保執行)
            const splitMatch = cleanText.match(/subtotal|taxable value|net|surtax|\btax\b|vat|total amount|\btotal\b/i);
            if (splitMatch && allAmounts.length > 0) {
                const itemAmounts = [...cleanText.substring(0, splitMatch.index).matchAll(/\b\d{1,4}(?:,\d{3})*\.\d{2}\b/g)]
                    .map(m => parseFloat(m[0].replace(',', '')));
                const sumSubtotal = itemAmounts.reduce((a, b) => a + b, 0);
                const maxTotal = allAmounts[0]; 
                const diffTax = maxTotal - sumSubtotal;
                if (sumSubtotal > 0 && diffTax >= 0 && diffTax < sumSubtotal * 0.3) {
                    finalSub = sumSubtotal; finalTax = diffTax; finalTotal = maxTotal;
                }
            }

            if (finalSub === 0) {
                for (let i = 0; i < allAmounts.length; i++) {
                    for (let j = i + 1; j < allAmounts.length; j++) {
                        for (let k = j + 1; k < allAmounts.length; k++) {
                            let c = allAmounts[i], a = allAmounts[j], b = allAmounts[k];
                            if (Math.abs((a + b) - c) < 0.05 && b < a * 0.3) {
                                finalTotal = c; finalSub = a; finalTax = b; break;
                            }
                        }
                        if (finalTotal) break;
                    }
                    if (finalTotal) break;
                }
            }

            // 更新 UI
            if (finalSub > 0 || finalTotal > 0) {
                if (finalSub === 0 && finalTotal > 0) finalSub = finalTotal;
                manualSubtotalInput.value = Math.abs(parseFloat(finalSub.toFixed(2)));
                manualTaxInput.value = Math.abs(parseFloat(finalTax.toFixed(2)));
                calculateAndRender();
                console.log("OCR Success:", finalSub, finalTax);
            } else {
                lastScannedImageFile = null;
                showNoticeModal('❌', 'No Amount Found', 'Please crop specifically around Subtotal and Tax.');
            }

        } catch (error) {
            console.error("OCR Error:", error);
            showNoticeModal('⚠️', 'Error', 'Recognition failed. Please try again.');
        } finally {
            btnSnap.classList.remove('scanning');
            btnSnap.style.pointerEvents = 'auto';
            cameraInput.value = ''; 
        }
    }, 'image/jpeg'); 
});

// ==========================================
// 📐 3. 其他功能 (圓環、計算、分享、設定)
// ==========================================

function generateDialLabels(container, values, isPercent) {
    container.innerHTML = '';
    const radius = 92; 
    values.forEach(val => {
        let min = isPercent ? 5 : 1, max = isPercent ? 30 : 20;
        const percentage = (val - min) / (max - min);
        const angleDeg = (percentage * 360) - 90;
        const angleRad = angleDeg * (Math.PI / 180);
        const x = Math.cos(angleRad) * radius, y = Math.sin(angleRad) * radius;
        const span = document.createElement('span');
        span.className = 'dial-tick';
        span.textContent = val + (isPercent ? '%' : '');
        span.style.left = `calc(50% + ${x}px)`;
        span.style.top = `calc(50% + ${y}px)`;
        container.appendChild(span);
    });
}
generateDialLabels(tipNumbersContainer, [5, 10, 15, 20, 25, 30], true);
generateDialLabels(splitNumbersContainer, [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20], false);

function updateDial(slider, ring, thumb, display, isPercent) {
    const val = parseInt(slider.value), min = parseInt(slider.min), max = parseInt(slider.max);
    const r = 38, cx = 50, cy = 50, circumference = 2 * Math.PI * r; 
    ring.style.strokeDasharray = `${circumference} ${circumference}`;
    const percentage = (val - min) / (max - min);
    ring.style.strokeDashoffset = circumference - (percentage * circumference);
    display.textContent = val + (isPercent ? '%' : '');
    const angleRad = (percentage * 360) * (Math.PI / 180);
    thumb.setAttribute('cx', cx + r * Math.cos(angleRad));
    thumb.setAttribute('cy', cy + r * Math.sin(angleRad));
    calculateAndRender();
}
tipSlider.addEventListener('input', () => updateDial(tipSlider, tipRing, tipThumb, tipDisplay, true));
splitSlider.addEventListener('input', () => updateDial(splitSlider, splitRing, splitThumb, splitDisplay, false));

function calculateAndRender() {
    const tip = parseInt(tipSlider.value), split = parseInt(splitSlider.value);
    const sub = parseFloat(manualSubtotalInput.value) || 0, tax = parseFloat(manualTaxInput.value) || 0;
    const total = sub + tax + (sub * tip / 100);
    currentGrandTotal = total;
    currentPerPerson = total / split;
    perPersonAmountDisplay.textContent = total === 0 ? `$0.00` : `$${currentPerPerson.toFixed(2)}`;
    total > 0 ? resultOrb.classList.remove('inactive') : resultOrb.classList.add('inactive');
}
manualSubtotalInput.addEventListener('input', calculateAndRender);
manualTaxInput.addEventListener('input', calculateAndRender);

btnSettings.addEventListener('click', () => {
    settingsNameInput.value = localStorage.getItem('billapp_user_name') || '';
    settingsVenmoInput.value = localStorage.getItem('billapp_venmo_id') || '';
    settingsZelleInput.value = localStorage.getItem('billapp_zelle_id') || '';
    settingsModal.classList.remove('hidden');
});
btnSettingsCancel.addEventListener('click', () => settingsModal.classList.add('hidden'));
btnSettingsSave.addEventListener('click', () => {
    localStorage.setItem('billapp_user_name', settingsNameInput.value.trim());
    localStorage.setItem('billapp_venmo_id', settingsVenmoInput.value.trim());
    localStorage.setItem('billapp_zelle_id', settingsZelleInput.value.trim());
    settingsModal.classList.add('hidden');
    showNoticeModal('✅', 'Profile Saved', 'Details stored locally.');
});

function showNoticeModal(icon, title, text) {
    modalIcon.textContent = icon; modalTitle.textContent = title;
    modalContent.innerHTML = `<p style="color: var(--text-dim);">${text}</p>`;
    customModal.classList.remove('hidden');
}
modalCloseBtn.addEventListener('click', () => customModal.classList.add('hidden'));

btnShare.addEventListener('click', async () => {
    if (currentGrandTotal === 0) return;
    const name = localStorage.getItem('billapp_user_name') || 'Me';
    const venmo = localStorage.getItem('billapp_venmo_id') || '';
    const zelle = localStorage.getItem('billapp_zelle_id') || '';
    let payMsg = (venmo || zelle) ? `\n👇 Pay Me:\n` : "";
    if (venmo) payMsg += `🔵 Venmo: https://venmo.com/?tx=pay&recipients=${venmo}&amount=${currentPerPerson.toFixed(2)}&note=Dinner\n`;
    if (zelle) payMsg += `🟣 Zelle: ${zelle} ($${currentPerPerson.toFixed(2)})\n`;
    const shareText = `🍽️ ${name}'s Bill\n💰 Per Person: $${currentPerPerson.toFixed(2)}\n${payMsg}`;
    if (navigator.share) {
        try { await navigator.share({ title: `${name}'s Bill`, text: shareText }); } catch (e) {}
    } else {
        navigator.clipboard.writeText(shareText).then(() => showNoticeModal('📋', 'Copied', 'Details copied.'));
    }
});

btnDone.addEventListener('click', () => { 
    manualSubtotalInput.value = ''; manualTaxInput.value = '';
    tipSlider.value = 15; splitSlider.value = 4;
    updateDial(tipSlider, tipRing, tipThumb, tipDisplay, true);
    updateDial(splitSlider, splitRing, splitThumb, splitDisplay, false);
    calculateAndRender();
});

// 初始化
updateDial(tipSlider, tipRing, tipThumb, tipDisplay, true);
updateDial(splitSlider, splitRing, splitThumb, splitDisplay, false);