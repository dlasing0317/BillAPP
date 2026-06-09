// 綁定 UI 元素
const tipSlider = document.getElementById('tip-slider');
const btnMinus = document.getElementById('btn-minus');
const btnPlus = document.getElementById('btn-plus');
const splitCountDisplay = document.getElementById('split-count');
const perPersonAmountDisplay = document.getElementById('per-person-amount');
const btnShare = document.getElementById('btn-share');
const btnDone = document.getElementById('btn-done');

// 綁定 Modal 元素
const customModal = document.getElementById('custom-modal');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const modalCloseBtn = document.getElementById('modal-close-btn');

// 相機與 OCR 元素
const btnSnap = document.getElementById('btn-snap');
const cameraInput = document.getElementById('camera-input');

let scannedSubtotal = 0.00; 
let scannedTax = 0.00;       
let currentSplitCount = 4;   

// --- 🌟 Modal 控制邏輯 ---
modalCloseBtn.addEventListener('click', () => {
    customModal.classList.add('hidden');
});

function showResultModal(subtotal, tax) {
    modalIcon.textContent = '🧾';
    modalTitle.textContent = '掃描成功';
    modalContent.innerHTML = `
        <div class="modal-amount-row">
            <span class="modal-amount-label">稅前總計 (Subtotal)</span>
            <span class="modal-amount-value">$${subtotal}</span>
        </div>
        <div class="modal-amount-row">
            <span class="modal-amount-label">精準稅金 (Tax)</span>
            <span class="modal-amount-value">$${tax}</span>
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

// 計算與更新畫面邏輯
function calculateAndRender() {
    const tipPercentage = parseInt(tipSlider.value); 
    const tipAmount = scannedSubtotal * (tipPercentage / 100);
    const grandTotal = scannedSubtotal + scannedTax + tipAmount;
    const perPerson = grandTotal / currentSplitCount;

    if (grandTotal === 0) {
        perPersonAmountDisplay.textContent = `$0.00`;
    } else {
        perPersonAmountDisplay.textContent = `$${perPerson.toFixed(2)}`;
    }
}

// --- 相機與 OCR 處理邏輯 ---
btnSnap.addEventListener('click', () => {
    cameraInput.click();
});

cameraInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const originalBtnHTML = btnSnap.innerHTML;
    btnSnap.innerHTML = '<span class="snap-text" style="color:#007aff;">讀取收據中... ⏳</span>';
    btnSnap.style.pointerEvents = 'none'; 

    try {
        const result = await Tesseract.recognize(file, 'eng');
        const text = result.data.text;

        const subtotalMatch = text.match(/(?:subtotal|taxable value|net)[^\d]*([\d,]+(?:\.\d{1,2})?)/i);
        const taxMatch = text.match(/(?:surtax|\btax\b|vat)[^\d]*([\d,]+(?:\.\d{1,2})?)/i);
        const totalMatch = text.match(/(?:total amount|\btotal\b)[^\d]*([\d,]+(?:\.\d{1,2})?)/i);

        let parsedSubtotal = 0;
        let parsedTax = 0;
        let parsedTotal = 0;

        if (subtotalMatch) parsedSubtotal = parseFloat(subtotalMatch[1].replace(',', ''));
        if (taxMatch) parsedTax = parseFloat(taxMatch[1].replace(',', ''));
        if (totalMatch) parsedTotal = parseFloat(totalMatch[1].replace(',', ''));

        // 🌟 數學防呆校正邏輯：精準計算稅金 🌟
        if (parsedTotal > 0 && parsedSubtotal > 0) {
            scannedSubtotal = parsedSubtotal;
            scannedTax = parsedTotal - parsedSubtotal; // 總計減去稅前，無視錯字
        } else if (parsedSubtotal > 0) {
            scannedSubtotal = parsedSubtotal;
            scannedTax = parsedTax;
        } else if (parsedTotal > 0) {
            scannedSubtotal = parsedTotal;
            scannedTax = 0;
        } else {
            scannedSubtotal = 0;
            scannedTax = 0;
        }

        if (scannedSubtotal > 0) {
            // 呼叫超美客製化 Modal
            showResultModal(scannedSubtotal, scannedTax);
            calculateAndRender();
        } else {
            showErrorModal('找不到收據上的金額，請確保照片清晰或手動輸入。');
        }

    } catch (error) {
        showErrorModal('圖片辨識失敗，請重試。');
    } finally {
        btnSnap.innerHTML = originalBtnHTML;
        btnSnap.style.pointerEvents = 'auto';
        cameraInput.value = ''; 
    }
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
btnDone.addEventListener('click', () => { showResultModal(scannedSubtotal, scannedTax); });