// ==========================================
// 🔌 1. 綁定 UI 元素 (清理舊代碼，對齊最新 UI)
// ==========================================
const btnSnap = document.getElementById('btn-snap');
const cameraInput = document.getElementById('camera-input');
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

// 🌟 全域狀態 (將滑桿數值獨立出來)
let scannedSubtotal = 0.00; 
let scannedTax = 0.00;       
let currentGrandTotal = 0.00; 
let currentPerPerson = 0.00;  
let lastScannedImageFile = null; 

let globalTipValue = 15;
let globalSplitValue = 4;

// ==========================================
// 🧮 2. 核心計算邏輯
// ==========================================
function calculateAndRender() {
    const sub = parseFloat(manualSubtotalInput.value) || 0;
    const tax = parseFloat(manualTaxInput.value) || 0;
    scannedSubtotal = sub;
    scannedTax = tax;

    // 直接使用全域變數，不再依賴已移除的舊滑桿 DOM
    const tipAmount = scannedSubtotal * (globalTipValue / 100);
    currentGrandTotal = scannedSubtotal + scannedTax + tipAmount; 
    currentPerPerson = currentGrandTotal / globalSplitValue;     

    perPersonAmountDisplay.textContent = currentGrandTotal === 0 ? `$0.00` : `$${currentPerPerson.toFixed(2)}`;
    currentGrandTotal > 0 ? resultOrb.classList.remove('inactive') : resultOrb.classList.add('inactive');
}

manualSubtotalInput.addEventListener('input', calculateAndRender);
manualTaxInput.addEventListener('input', calculateAndRender);

// ==========================================
// 📐 3. 核心魔法：真實環形觸控引擎 (True Circular Touch)
// ==========================================
function setupCircularDial(wrapperId, ringId, thumbId, displayId, numbersId, min, max, step, initialValue, isPercent, onChangeCallback) {
    const wrapper = document.getElementById(wrapperId);
    const ring = document.getElementById(ringId);
    const thumb = document.getElementById(thumbId);
    const display = document.getElementById(displayId);
    const numbersContainer = document.getElementById(numbersId);

    let currentValue = initialValue;
    const r = 38; // 配合 CSS 的半徑
    const cx = 50;
    const cy = 50;
    const circumference = 2 * Math.PI * r;

    // 建立 270 度的開口弧線
    const arcDegrees = 270;
    const arcLength = circumference * (arcDegrees / 360);
    ring.style.strokeDasharray = `${arcLength} ${circumference}`;

    // A. 動態繪製對齊的外圍數字
    function generateLabels() {
        numbersContainer.innerHTML = '';
        const radius = 95; // 外圍數字的擴張半徑
        
        let values = [];
        if (isPercent) {
            values = [5, 10, 15, 20, 25, 30];
        } else {
            values = [1, 4, 8, 12, 16, 20]; // 避免太擠，人數只標示部分數字
        }

        values.forEach(val => {
            const percentage = (val - min) / (max - min);
            // 視覺角度：從左下 (135度) 畫到 右下 (405度)
            const visualAngleDeg = 135 + (percentage * arcDegrees);
            const visualAngleRad = visualAngleDeg * (Math.PI / 180);

            const x = Math.cos(visualAngleRad) * radius;
            const y = Math.sin(visualAngleRad) * radius;

            const span = document.createElement('span');
            span.className = 'dial-tick';
            span.textContent = val + (isPercent ? '%' : '');
            span.style.left = `calc(50% + ${x}px)`;
            span.style.top = `calc(50% + ${y}px)`;
            numbersContainer.appendChild(span);
        });
    }

    // B. 更新 UI (光條與發光圓點位置)
    function updateUI(val) {
        const percentage = (val - min) / (max - min);
        
        const offset = arcLength - (percentage * arcLength);
        ring.style.strokeDashoffset = offset;

        // SVG 內部坐標被 CSS 轉了 135度，所以直接從 0 算到 270度 即可
        const svgAngleRad = (percentage * arcDegrees) * (Math.PI / 180);
        thumb.setAttribute('cx', cx + r * Math.cos(svgAngleRad));
        thumb.setAttribute('cy', cy + r * Math.sin(svgAngleRad));

        display.textContent = val + (isPercent ? '%' : '');
        onChangeCallback(val);
    }

    // C. 處理所有觸控事件 (三角函數運算)
    let isDragging = false;

    function handlePointer(e) {
        if (!isDragging && e.type !== 'pointerdown' && e.type !== 'touchstart') return;
        e.preventDefault(); 

        const rect = wrapper.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // 支援滑鼠 (clientX) 與手機觸控 (touches)
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);

        if(clientX === undefined || clientY === undefined) return;

        const dx = clientX - centerX;
        const dy = clientY - centerY;
        let angle = Math.atan2(dy, dx) * (180 / Math.PI); 

        if (angle < 0) angle += 360; 

        // 弧線從 135度開始，把 135度 前的區域推到後方方便計算百分比
        let adjustedAngle = angle;
        if (angle < 135) adjustedAngle += 360;

        let percentage = (adjustedAngle - 135) / arcDegrees;

        // 手指滑到下方開口處 (空白區) 時卡住最大/最小值
        if (percentage < 0) { if (adjustedAngle < 135) percentage = 0; }
        if (percentage > 1) { if (adjustedAngle > 135 + arcDegrees) percentage = 1; }

        percentage = Math.max(0, Math.min(1, percentage));

        let val = min + percentage * (max - min);
        val = Math.round(val / step) * step; // 根據 step 產生格段吸附感
        val = Math.max(min, Math.min(max, val));

        if (val !== currentValue) {
            currentValue = val;
            updateUI(currentValue);
        }
    }

    // 電腦端 Pointer Events
    wrapper.addEventListener('pointerdown', (e) => {
        isDragging = true;
        handlePointer(e);
        wrapper.setPointerCapture(e.pointerId);
    });
    wrapper.addEventListener('pointermove', handlePointer);
    wrapper.addEventListener('pointerup', (e) => {
        isDragging = false;
        wrapper.releasePointerCapture(e.pointerId);
    });
    wrapper.addEventListener('pointercancel', () => { isDragging = false; });
    
    // 📱 手機端 Touch Events (雙重防護)
    wrapper.addEventListener('touchstart', (e) => {
        isDragging = true;
        handlePointer(e);
    }, {passive: false});
    wrapper.addEventListener('touchmove', handlePointer, {passive: false});
    wrapper.addEventListener('touchend', () => { isDragging = false; });


    generateLabels();
    updateUI(currentValue);
    
    return {
        setValue: (val) => { currentValue = val; updateUI(val); }
    };
}

// 🚀 初始化兩個環形控制器，並綁定全域變數
const tipDialControl = setupCircularDial(
    'tip-wrapper', 'tip-ring', 'tip-thumb', 'tip-display', 'tip-numbers',
    5, 30, 5, 15, true,
    (val) => { globalTipValue = val; calculateAndRender(); }
);

const splitDialControl = setupCircularDial(
    'split-wrapper', 'split-ring', 'split-thumb', 'split-display', 'split-numbers',
    1, 20, 1, 4, false,
    (val) => { globalSplitValue = val; calculateAndRender(); }
);

// ==========================================
// 4. 其他功能 (相機、設定、分享)
// ==========================================
settingsNameInput.value = localStorage.getItem('billapp_user_name') || '';
settingsVenmoInput.value = localStorage.getItem('billapp_venmo_id') || '';
settingsZelleInput.value = localStorage.getItem('billapp_zelle_id') || '';

btnSettings.addEventListener('click', () => settingsModal.classList.remove('hidden'));
btnSettingsCancel.addEventListener('click', () => settingsModal.classList.add('hidden'));

btnSettingsSave.addEventListener('click', () => {
    localStorage.setItem('billapp_user_name', settingsNameInput.value.trim());
    localStorage.setItem('billapp_venmo_id', settingsVenmoInput.value.trim());
    localStorage.setItem('billapp_zelle_id', settingsZelleInput.value.trim());
    settingsModal.classList.add('hidden');
    showNoticeModal('✅', 'Profile Saved', 'Your payment details are securely stored.');
});

function showNoticeModal(icon, title, text) {
    modalIcon.textContent = icon;
    modalTitle.textContent = title;
    modalContent.innerHTML = `<p style="color: var(--text-dim);">${text}</p>`;
    customModal.classList.remove('hidden');
}
modalCloseBtn.addEventListener('click', () => customModal.classList.add('hidden'));

btnSnap.addEventListener('click', () => cameraInput.click());
btnCropCancel.addEventListener('click', () => {
    cropModal.classList.add('hidden');
    if (cropper) cropper.destroy();
    cameraInput.value = ''; 
});

cameraInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        cropImage.src = e.target.result;
        cropModal.classList.remove('hidden');
        if (cropper) cropper.destroy();
        cropper = new Cropper(cropImage, {
            viewMode: 1, dragMode: 'crop', autoCropArea: 0.8, restore: false,
            guides: true, center: true, highlight: false, cropBoxMovable: true,
            cropBoxResizable: true, toggleDragModeOnDblclick: false,
        });
    };
    reader.readAsDataURL(file);
});

const originalApertureSVG = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="14.31" y1="8" x2="20.05" y2="17.94"></line>
    <line x1="9.69" y1="8" x2="21.17" y2="8"></line>
    <line x1="7.38" y1="12" x2="13.12" y2="2.06"></line>
    <line x1="9.69" y1="16" x2="3.95" y2="6.06"></line>
    <line x1="14.31" y1="16" x2="2.83" y2="16"></line>
    <line x1="16.62" y1="12" x2="10.88" y2="21.94"></line>
</svg>`;

btnCropConfirm.addEventListener('click', async () => {
    if (!cropper) return;

    cropper.getCroppedCanvas({ maxWidth: 1024, maxHeight: 1024 }).toBlob(async (blob) => {
        cropModal.classList.add('hidden');
        cropper.destroy();
        lastScannedImageFile = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
        
        btnSnap.classList.add('scanning');
        btnSnap.style.pointerEvents = 'none';

        try {
            const result = await Tesseract.recognize(blob, 'eng');
            let cleanText = result.data.text.replace(/(\d+)\s*[_\.,]\s*(\d+)/g, "$1.$2").replace(/\d+(?:\.\d+)?\s*%/g, "");

            const allAmounts = [...cleanText.matchAll(/\b\d{1,4}(?:,\d{3})*\.\d{2}\b/g)]
                .map(m => parseFloat(m[0].replace(',', ''))).sort((a, b) => b - a);

            let finalSub = 0, finalTax = 0, finalTotal = 0;

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

            if (finalSub === 0) {
                const subMatch = cleanText.match(/(?:subtotal|taxable value|net)[^\n\r]{0,40}?(\d{1,4}(?:,\d{3})*\.\d{2})/i);
                const taxMatch = cleanText.match(/(?:surtax|\btax\b|vat)[^\n\r]{0,40}?(\d{1,4}(?:,\d{3})*\.\d{2})/i);
                const totalMatch = cleanText.match(/(?:total amount|\btotal\b)[^\n\r]{0,40}?(\d{1,4}(?:,\d{3})*\.\d{2})/i);
                let parsedSub = subMatch ? parseFloat(subMatch[1].replace(',', '')) : 0;
                let parsedTax = taxMatch ? parseFloat(taxMatch[1].replace(',', '')) : 0;
                let parsedTotal = totalMatch ? parseFloat(totalMatch[1].replace(',', '')) : 0;

                if (parsedSub > 0 && parsedTax > 0) { finalSub = parsedSub; finalTax = parsedTax; finalTotal = parsedSub + parsedTax; }
                else if (parsedTotal > 0 && parsedSub > 0 && parsedSub < parsedTotal) { finalTotal = parsedTotal; finalSub = parsedSub; finalTax = parsedTotal - parsedSub; }
                else if (parsedTotal > 0 && parsedTax > 0 && parsedTax < parsedTotal * 0.3) { finalTotal = parsedTotal; finalTax = parsedTax; finalSub = parsedTotal - parsedTax; }
                else if (parsedSub > 0) { finalSub = parsedSub; finalTax = parsedTax; }
                else if (parsedTotal > 0) { finalTotal = parsedTotal; finalSub = parsedTotal; finalTax = 0; }
            }

            if (finalSub > 0 || finalTotal > 0) {
                if (finalSub === 0 && finalTotal > 0) finalSub = finalTotal;
                manualSubtotalInput.value = Math.abs(parseFloat(finalSub.toFixed(2)));
                manualTaxInput.value = Math.abs(parseFloat(finalTax.toFixed(2)));
                calculateAndRender();
            } else {
                lastScannedImageFile = null;
                showNoticeModal('❌', 'No Amount Found', 'Please try cropping closer to the Subtotal and Tax.');
            }

        } catch (error) {
            showNoticeModal('⚠️', 'Error', 'Recognition failed. Try again.');
        } finally {
            btnSnap.innerHTML = originalApertureSVG;
            btnSnap.classList.remove('scanning');
            btnSnap.style.pointerEvents = 'auto';
            cameraInput.value = ''; 
        }
    }, 'image/jpeg'); 
});

btnShare.addEventListener('click', async () => {
    if (currentGrandTotal === 0) return;
    const userName = localStorage.getItem('billapp_user_name') || 'Me';
    const currentVenmoId = localStorage.getItem('billapp_venmo_id') || '';
    const currentZelleId = localStorage.getItem('billapp_zelle_id') || '';
    
    let paymentOptionsText = "";
    if (currentVenmoId || currentZelleId) {
        paymentOptionsText += "\n👇 Payment Options 👇\n";
        if (currentVenmoId) {
            const venmoLink = `https://venmo.com/?tx=pay&recipients=${currentVenmoId}&amount=${currentPerPerson.toFixed(2)}&note=Dinner%20Bill`;
            paymentOptionsText += `\n🔵 Venmo Auto-Pay:\n${venmoLink}\n`;
        }
        if (currentZelleId) {
            paymentOptionsText += `\n🟣 Zelle (Copy to transfer):\n${currentZelleId}\n(Amount: $${currentPerPerson.toFixed(2)})\n`;
        }
    }

    const shareTitle = `${userName}'s Bill`;
    const shareText = 
`🍽️ ${userName} shared a bill\n\n🔹 Subtotal: $${scannedSubtotal.toFixed(2)}\n🔹 Tax: $${scannedTax.toFixed(2)}\n🔹 Tip (${globalTipValue}%): $${(scannedSubtotal * (globalTipValue / 100)).toFixed(2)}\n💰 Total: $${currentGrandTotal.toFixed(2)}\n\n👥 Split: ${globalSplitValue} ppl\n👉 Per Person: $${currentPerPerson.toFixed(2)}\n${paymentOptionsText}`;

    const shareData = { title: shareTitle, text: shareText };
    if (lastScannedImageFile && navigator.canShare && navigator.canShare({ files: [lastScannedImageFile] })) {
        shareData.files = [lastScannedImageFile];
    }

    if (navigator.share) {
        try { await navigator.share(shareData); } catch (e) {}
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            showNoticeModal('📋', 'Copied', 'Details copied to clipboard.');
        });
    }
});

btnDone.addEventListener('click', () => { 
    manualSubtotalInput.value = '';
    manualTaxInput.value = '';
    lastScannedImageFile = null; 
    
    // 重置旋鈕
    tipDialControl.setValue(15);
    splitDialControl.setValue(4);
});

// 啟動畫面時執行一次計算
calculateAndRender();