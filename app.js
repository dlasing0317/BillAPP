// 綁定 UI 元素
const tipSlider = document.getElementById('tip-slider');
const btnMinus = document.getElementById('btn-minus');
const btnPlus = document.getElementById('btn-plus');
const splitCountDisplay = document.getElementById('split-count');
const perPersonAmountDisplay = document.getElementById('per-person-amount');
const btnShare = document.getElementById('btn-share');
const btnDone = document.getElementById('btn-done');

// Modal 元素
const customModal = document.getElementById('custom-modal');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const modalCloseBtn = document.getElementById('modal-close-btn');

// 相機與 OCR 元素
const btnSnap = document.getElementById('btn-snap');
const snapText = document.getElementById('snap-text');
const cameraInput = document.getElementById('camera-input');

// 裁切 UI 元素
const cropModal = document.getElementById('crop-modal');
const cropImage = document.getElementById('crop-image');
const btnCropCancel = document.getElementById('btn-crop-cancel');
const btnCropConfirm = document.getElementById('btn-crop-confirm');
let cropper = null; 

// 初始狀態
let scannedSubtotal = 0.00; 
let scannedTax = 0.00;       
let currentSplitCount = 4;   

// --- UI 控制邏輯 ---
modalCloseBtn.addEventListener('click', () => customModal.classList.add('hidden'));
btnCropCancel.addEventListener('click', () => {
    cropModal.classList.add('hidden');
    if (cropper) cropper.destroy();
    cameraInput.value = ''; 
});

function showDebugAndResultModal(subtotal, tax, debugText) {
    modalIcon.textContent = '🧾';
    modalTitle.textContent = '掃描結果與分析';
    modalContent.innerHTML = `
        <div class="modal-amount-row" style="padding: 10px;">
            <span class="modal-amount-label">稅前總計</span>
            <span class="modal-amount-value" style="font-size: 2rem;">$${subtotal}</span>
        </div>
        <div class="modal-amount-row" style="padding: 10px; margin-bottom: 15px;">
            <span class="modal-amount-label">精準稅金</span>
            <span class="modal-amount-value" style="font-size: 2rem;">$${tax}</span>
        </div>
        <div style="text-align: left; background: #f4f7fb; border-radius: 12px; padding: 15px; max-height: 200px; overflow-y: auto; box-shadow: inset 0 2px 5px rgba(0,0,0,0.05);">
            <p style="font-size: 0.8rem; font-weight: 700; color: #888; margin-bottom: 8px;">🛠️ X光大腦分析報告：</p>
            <pre style="font-size: 0.75rem; color: #555; white-space: pre-wrap; font-family: monospace; line-height: 1.4; user-select: text; -webkit-user-select: text;">${debugText}</pre>
        </div>
    `;
    customModal.classList.remove('hidden');
}

function showErrorModal(message) {
    modalIcon.textContent = '⚠️';
    modalTitle.textContent = '掃描提示';
    modalContent.innerHTML = `<p class="modal-text">${message}</p>`;
    customModal.classList.remove('hidden');
}

function calculateAndRender() {
    const tipPercentage = parseInt(tipSlider.value); 
    const tipAmount = scannedSubtotal * (tipPercentage / 100);
    const grandTotal = scannedSubtotal + scannedTax + tipAmount;
    const perPerson = grandTotal / currentSplitCount;

    perPersonAmountDisplay.textContent = grandTotal === 0 ? `$0.00` : `$${perPerson.toFixed(2)}`;
}

// --- 拍照與裁切流程 ---
btnSnap.addEventListener('click', () => cameraInput.click());

cameraInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        cropImage.src = e.target.result;
        cropModal.classList.remove('hidden');
        
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

// --- 執行 OCR 與三大引擎分析 ---
btnCropConfirm.addEventListener('click', async () => {
    if (!cropper) return;

    cropper.getCroppedCanvas().toBlob(async (blob) => {
        cropModal.classList.add('hidden');
        cropper.destroy();
        
        const originalBtnText = snapText.textContent;
        snapText.textContent = '大腦分析中... ⏳';
        btnSnap.style.pointerEvents = 'none';

        try {
            const result = await Tesseract.recognize(blob, 'eng');
            const rawText = result.data.text;

            // ==========================================
            // 🌟 魔法淨化器 (Text Sanitization)
            // ==========================================
            let cleanText = rawText;
            
            // 1. 修復斷裂的小數點 (把 "3. 84" 或 "42 _ 33" 縫合為 "3.84"、"42.33")
            cleanText = cleanText.replace(/(\d+)\s*[_\.,]\s*(\d+)/g, "$1.$2");
            
            // 2. 徹底抹除帶有 % 的數字 (把 "10.0%" 刪掉，避免 Regex 抓錯)
            cleanText = cleanText.replace(/\d+(?:\.\d+)?\s*%/g, "");

            let debugMsg = "=== 👁️ 淨化後的 AI 視力測驗 ===\n" + cleanText + "\n====================\n\n";

            // 使用淨化後的乾淨文字進行後續所有的分析
            const allAmounts = [...cleanText.matchAll(/\b\d{1,4}(?:,\d{3})*\.\d{2}\b/g)]
                .map(m => parseFloat(m[0].replace(',', '')))
                .sort((a, b) => b - a);

            debugMsg += `1. 所有有效金額:\n[${allAmounts.join(', ')}]\n\n`;

            let finalSub = 0, finalTax = 0, finalTotal = 0;

            // 🚀 引擎 A：餐點明細加總法 
            const splitMatch = cleanText.match(/subtotal|taxable value|net|surtax|\btax\b|vat|total amount|\btotal\b/i);
            if (splitMatch && allAmounts.length > 0) {
                const upperText = cleanText.substring(0, splitMatch.index);
                const itemAmounts = [...upperText.matchAll(/\b\d{1,4}(?:,\d{3})*\.\d{2}\b/g)]
                    .map(m => parseFloat(m[0].replace(',', '')));
                
                const sumSubtotal = itemAmounts.reduce((a, b) => a + b, 0);
                const maxTotal = allAmounts[0]; 
                const diffTax = maxTotal - sumSubtotal;

                if (sumSubtotal > 0 && diffTax >= 0 && diffTax < sumSubtotal * 0.3) {
                    finalSub = sumSubtotal; finalTax = diffTax; finalTotal = maxTotal;
                    debugMsg += `✅ 引擎 A 成功 (明細加總)！\n\n`;
                }
            }

            // 🚀 引擎 B：A+B=C 數學解謎組合
            if (finalSub === 0) {
                for (let i = 0; i < allAmounts.length; i++) {
                    for (let j = i + 1; j < allAmounts.length; j++) {
                        for (let k = j + 1; k < allAmounts.length; k++) {
                            let c = allAmounts[i], a = allAmounts[j], b = allAmounts[k];
                            if (Math.abs((a + b) - c) < 0.05 && b < a * 0.3) {
                                finalTotal = c; finalSub = a; finalTax = b;
                                break;
                            }
                        }
                        if (finalTotal) break;
                    }
                    if (finalTotal) break;
                }
                if (finalTotal) debugMsg += `✅ 引擎 B 成功 (完美配對: ${finalSub} + ${finalTax} = ${finalTotal})！\n\n`;
            }

            // 🛡️ 引擎 C：嚴格同行 Regex 文字鎖定
            if (finalSub === 0) {
                const subMatch = cleanText.match(/(?:subtotal|taxable value|net)[^\n\r]{0,40}?(\d{1,4}(?:,\d{3})*\.\d{2})/i);
                const taxMatch = cleanText.match(/(?:surtax|\btax\b|vat)[^\n\r]{0,40}?(\d{1,4}(?:,\d{3})*\.\d{2})/i);
                const totalMatch = cleanText.match(/(?:total amount|\btotal\b)[^\n\r]{0,40}?(\d{1,4}(?:,\d{3})*\.\d{2})/i);

                let parsedSub = subMatch ? parseFloat(subMatch[1].replace(',', '')) : 0;
                let parsedTax = taxMatch ? parseFloat(taxMatch[1].replace(',', '')) : 0;
                let parsedTotal = totalMatch ? parseFloat(totalMatch[1].replace(',', '')) : 0;

                if (parsedSub > 0 && parsedTax > 0) {
                    finalSub = parsedSub; finalTax = parsedTax; finalTotal = parsedSub + parsedTax;
                } else if (parsedTotal > 0 && parsedSub > 0 && parsedSub < parsedTotal) {
                    finalTotal = parsedTotal; finalSub = parsedSub; finalTax = parsedTotal - parsedSub;
                } else if (parsedTotal > 0 && parsedTax > 0 && parsedTax < parsedTotal * 0.3) {
                    finalTotal = parsedTotal; finalTax = parsedTax; finalSub = parsedTotal - parsedTax;
                } else if (parsedSub > 0) {
                    finalSub = parsedSub; finalTax = parsedTax;
                } else if (parsedTotal > 0) {
                    finalTotal = parsedTotal; finalSub = parsedTotal; finalTax = 0; 
                }
                if (finalSub > 0 || finalTotal > 0) debugMsg += `✅ 引擎 C 成功 (文字鎖定)！\n\n`;
            }

            scannedSubtotal = Math.abs(parseFloat(finalSub.toFixed(2)));
            scannedTax = Math.abs(parseFloat(finalTax.toFixed(2)));

            debugMsg += `👉 最終決定採用的數字:\nSubtotal: $${scannedSubtotal}\nTax: $${scannedTax}`;

            if (scannedSubtotal > 0 || finalTotal > 0) {
                if (scannedSubtotal === 0 && finalTotal > 0) scannedSubtotal = finalTotal;
                showDebugAndResultModal(scannedSubtotal.toFixed(2), scannedTax.toFixed(2), debugMsg);
                calculateAndRender();
            } else {
                showDebugAndResultModal("0.00", "0.00", "❌ 找不到任何金額。\n\n" + debugMsg);
            }

        } catch (error) {
            console.error("OCR Error:", error);
            showErrorModal('圖片辨識失敗，請重試。');
        } finally {
            snapText.textContent = '拍一張';
            btnSnap.style.pointerEvents = 'auto';
            cameraInput.value = ''; 
        }
    }, 'image/jpeg');
});

// --- 事件監聽器 ---
tipSlider.addEventListener('input', calculateAndRender);

btnMinus.addEventListener('click', () => {
    if (currentSplitCount > 1) {
        currentSplitCount--;
        splitCountDisplay.textContent = currentSplitCount;
        calculateAndRender();
    }
});

btnPlus.addEventListener('click', () => {
    currentSplitCount++;
    splitCountDisplay.textContent = currentSplitCount;
    calculateAndRender();
});

calculateAndRender();

btnShare.addEventListener('click', () => { showErrorModal('即將加入分享功能！'); });
btnDone.addEventListener('click', () => { customModal.classList.add('hidden'); });