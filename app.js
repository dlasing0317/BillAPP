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

    const originalBtnHTML = btnSnap.innerHTML;
    btnSnap.innerHTML = '<span class="snap-text" style="color:#007aff;">讀取收據中... ⏳</span>';
    btnSnap.style.pointerEvents = 'none'; 

    try {
        const result = await Tesseract.recognize(file, 'eng');
        const text = result.data.text;
        
        // 🌟 核心修改在這裡！用 alert 彈出來，讓你在 iPhone 上能看到 AI 到底讀到了什麼 🌟
        alert("🚨 AI 實際看到的文字是（請截圖！）：\n\n" + text);

        const subtotalMatch = text.match(/subtotal[\s:;\|]*\$?([\d,]+\.\d{2})/i);
        const taxMatch = text.match(/tax[\s:;\|]*\$?([\d,]+\.\d{2})/i);
        const totalMatch = text.match(/total[\s:;\|]*\$?([\d,]+\.\d{2})/i);

        if (subtotalMatch) {
            scannedSubtotal = parseFloat(subtotalMatch[1].replace(',', ''));
        } else if (totalMatch) {
            scannedSubtotal = parseFloat(totalMatch[1].replace(',', ''));
        }

        if (taxMatch) {
            scannedTax = parseFloat(taxMatch[1].replace(',', ''));
        }

        if (scannedSubtotal > 0) {
            alert(`✅ 掃描成功！\n稅前總計: $${scannedSubtotal}\n稅金: $${scannedTax}`);
            calculateAndRender();
        } else {
            alert('⚠️ 找不到收據上的金額，因為抓取規則跟上面的文字對不上。');
        }

    } catch (error) {
        alert('❌ 圖片辨識失敗，請重試。');
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

btnShare.addEventListener('click', async () => { alert('即將加入分享功能！'); });
btnDone.addEventListener('click', () => { alert('分帳完成！'); });