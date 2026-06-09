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

// 初始預設金額 (為了還沒拍照前有數字可以看)
let scannedSubtotal = 0.00; 
let scannedTax = 0.00;       
let currentSplitCount = 4;   

// 計算與更新畫面邏輯
function calculateAndRender() {
    const tipPercentage = parseInt(tipSlider.value); 
    const tipAmount = scannedSubtotal * (tipPercentage / 100);
    const grandTotal = scannedSubtotal + scannedTax + tipAmount;
    const perPerson = grandTotal / currentSplitCount;

    // 如果還沒掃描，顯示 0.00
    if (grandTotal === 0) {
        perPersonAmountDisplay.textContent = `$0.00`;
    } else {
        perPersonAmountDisplay.textContent = `$${perPerson.toFixed(2)}`;
    }
}

// --- 相機與 OCR 處理邏輯 ---

// 1. 點擊「拍一張」按鈕時，觸發隱藏的相機 Input
btnSnap.addEventListener('click', () => {
    cameraInput.click();
});

// 2. 當使用者拍完照（或選擇照片）後觸發
cameraInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return; // 如果使用者取消拍照就退出

    // 改變按鈕外觀，提示正在處理中 (OCR 需要幾秒鐘)
    const originalBtnHTML = btnSnap.innerHTML;
    btnSnap.innerHTML = '<span class="snap-text" style="color:#007aff;">讀取收據中... ⏳</span>';
    btnSnap.style.pointerEvents = 'none'; // 暫時禁止重複點擊

    try {
        // 呼叫 Tesseract 進行英文與數字辨識
        const result = await Tesseract.recognize(file, 'eng', {
            logger: m => console.log("OCR進度:", m) // 可以在開發者工具看進度
        });

        const text = result.data.text;
        console.log("辨識出的純文字:\n", text);

        // 3. 使用正則表達式 (Regex) 從亂碼中抓取 Subtotal 和 Tax
        // 尋找類似 "Subtotal 85.50" 或 "Tax: 7.25" 的格式
        const subtotalMatch = text.match(/subtotal[\s:;\|]*\$?([\d,]+\.\d{2})/i);
        const taxMatch = text.match(/tax[\s:;\|]*\$?([\d,]+\.\d{2})/i);
        const totalMatch = text.match(/total[\s:;\|]*\$?([\d,]+\.\d{2})/i);

        // 如果找到 Subtotal 就用它，找不到就試著找 Total
        if (subtotalMatch) {
            scannedSubtotal = parseFloat(subtotalMatch[1].replace(',', ''));
        } else if (totalMatch) {
            scannedSubtotal = parseFloat(totalMatch[1].replace(',', ''));
        }

        // 如果找到 Tax 就抓出來
        if (taxMatch) {
            scannedTax = parseFloat(taxMatch[1].replace(',', ''));
        }

        // 驗證是否成功抓到數字
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

// 初始化第一次計算
calculateAndRender();

// 分享與完成按鈕保留原本邏輯
btnShare.addEventListener('click', async () => { /* ...分享邏輯... */ });
btnDone.addEventListener('click', () => { alert('分帳完成！'); });