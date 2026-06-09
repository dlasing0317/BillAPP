// 綁定 UI 元素
const tipSlider = document.getElementById('tip-slider');
const btnMinus = document.getElementById('btn-minus');
const btnPlus = document.getElementById('btn-plus');
const splitCountDisplay = document.getElementById('split-count');
const perPersonAmountDisplay = document.getElementById('per-person-amount');
const btnShare = document.getElementById('btn-share');
const btnDone = document.getElementById('btn-done');

// 相機與 OCR 相關元素
const btnSnap = document.getElementById('btn-snap');
const cameraInput = document.getElementById('camera-input');

// 初始預設金額
let scannedSubtotal = 0.00; 
let scannedTax = 0.00;       
let currentSplitCount = 4;   

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

    // 顯示讀取中狀態
    const originalBtnHTML = btnSnap.innerHTML;
    btnSnap.innerHTML = '<span class="snap-text" style="color:#007aff;">讀取收據中... ⏳</span>';
    btnSnap.style.pointerEvents = 'none'; 

    try {
        const result = await Tesseract.recognize(file, 'eng');
        const text = result.data.text;
        
        // 🌟 已經除錯完畢，把這行註解掉，就不會每次都彈出一大堆字了
        // alert("🚨 AI 實際看到的文字是：\n\n" + text);

        // 🌟 全新升級版 Regex：支援更多收據單字 (如 Taxable value, Surtax)，且不強制要求小數點
        const subtotalMatch = text.match(/(?:subtotal|taxable value|net)[^\d]*([\d,]+(?:\.\d{1,2})?)/i);
        const taxMatch = text.match(/(?:surtax|\btax\b|vat)[^\d]*([\d,]+(?:\.\d{1,2})?)/i);
        const totalMatch = text.match(/(?:total amount|\btotal\b)[^\d]*([\d,]+(?:\.\d{1,2})?)/i);

        // 每次掃描前先歸零
        scannedSubtotal = 0;
        scannedTax = 0;

        // 抓取 Subtotal 或 Total
        if (subtotalMatch) {
            scannedSubtotal = parseFloat(subtotalMatch[1].replace(',', ''));
        } else if (totalMatch) {
            scannedSubtotal = parseFloat(totalMatch[1].replace(',', ''));
        }

        // 抓取 Tax
        if (taxMatch) {
            scannedTax = parseFloat(taxMatch[1].replace(',', ''));
        }

        // 驗證是否成功抓到數字並更新畫面
        if (scannedSubtotal > 0) {
            alert(`✅ 掃描成功！\n稅前總計: $${scannedSubtotal}\n稅金: $${scannedTax}`);
            calculateAndRender();
        } else {
            alert('⚠️ 找不到收據上的金額，請確保照片清晰或手動輸入。');
        }

    } catch (error) {
        console.error("OCR 錯誤:", error);
        alert('❌ 圖片辨識失敗，請重試。');
    } finally {
        // 恢復按鈕原本的樣子
        btnSnap.innerHTML = originalBtnHTML;
        btnSnap.style.pointerEvents = 'auto';
        // 清空 input，確保下次拍同一張照片也能觸發 change 事件
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

// 初始化畫面數字
calculateAndRender();

// 預留後續功能
btnShare.addEventListener('click', async () => { alert('即將加入分享功能！'); });
btnDone.addEventListener('click', () => { alert('分帳完成！'); });