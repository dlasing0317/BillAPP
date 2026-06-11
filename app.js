// ==========================================
// 綁定 UI 元素
// ==========================================
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
const cameraInput = document.getElementById('camera-input');

// 裁切 UI 元素
const cropModal = document.getElementById('crop-modal');
const cropImage = document.getElementById('crop-image');
const btnCropCancel = document.getElementById('btn-crop-cancel');
const btnCropConfirm = document.getElementById('btn-crop-confirm');
let cropper = null; 

// 滑動與手動輸入 UI 元素
const swipeContainer = document.getElementById('swipe-container');
const dot1 = document.getElementById('dot-1');
const dot2 = document.getElementById('dot-2');
const btnManualUpdate = document.getElementById('btn-manual-update');
const manualSubtotalInput = document.getElementById('manual-subtotal');
const manualTaxInput = document.getElementById('manual-tax');
const venmoIdInput = document.getElementById('venmo-id-input'); // 🌟 新增的 Venmo ID 輸入框

// 🌟 全域狀態
let scannedSubtotal = 0.00; 
let scannedTax = 0.00;       
let currentSplitCount = 4;   
let currentGrandTotal = 0.00; 
let currentPerPerson = 0.00;  
let lastScannedImageFile = null; 

// 🌟 初始化：從瀏覽器記憶中讀取之前存好的 Venmo ID
const savedVenmo = localStorage.getItem('billapp_venmo_id');
if (savedVenmo) {
    venmoIdInput.value = savedVenmo;
}

// 🌟 當使用者在框框裡打字時，自動偷偷存進瀏覽器記憶
venmoIdInput.addEventListener('input', (e) => {
    localStorage.setItem('billapp_venmo_id', e.target.value.trim());
});

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
    currentGrandTotal = scannedSubtotal + scannedTax + tipAmount; 
    currentPerPerson = currentGrandTotal / currentSplitCount;     

    perPersonAmountDisplay.textContent = currentGrandTotal === 0 ? `$0.00` : `$${currentPerPerson.toFixed(2)}`;
}

// --- 手動輸入與滑動分頁邏輯 ---
swipeContainer.addEventListener('scroll', () => {
    const scrollPos = swipeContainer.scrollLeft;
    const halfWidth = swipeContainer.clientWidth / 2;
    
    if (scrollPos > halfWidth) {
        dot1.classList.remove('active');
        dot2.classList.add('active');
    } else {
        dot1.classList.add('active');
        dot2.classList.remove('active');
    }
});

btnManualUpdate.addEventListener('click', () => {
    const sub = parseFloat(manualSubtotalInput.value) || 0;
    const tax = parseFloat(manualTaxInput.value) || 0;
    
    // 點擊更新時，也確保最新的 Venmo ID 有被存下來
    localStorage.setItem('billapp_venmo_id', venmoIdInput.value.trim());

    if (sub === 0 && tax === 0) {
        showErrorModal('請輸入有效的金額！');
        return;
    }
    
    scannedSubtotal = sub;
    scannedTax = tax;
    lastScannedImageFile = null; 
    calculateAndRender();
    
    modalIcon.textContent = '✍️';
    modalTitle.textContent = '手動輸入成功';
    modalContent.innerHTML = `<p class="modal-text">金額與設定已更新，將為您重新計算每人應付金額。</p>`;
    customModal.classList.remove('hidden');
});

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

    cropper.getCroppedCanvas({
        maxWidth: 1024,
        maxHeight: 1024
    }).toBlob(async (blob) => {
        cropModal.classList.add('hidden');
        cropper.destroy();
        
        lastScannedImageFile = new File([blob], 'receipt_scanned.jpg', { type: 'image/jpeg' });
        
        btnSnap.innerHTML = '<span style="font-size: 28px;">⏳</span>';
        btnSnap.style.pointerEvents = 'none';

        try {
            const result = await Tesseract.recognize(blob, 'eng');
            const rawText = result.data.text;

            let cleanText = rawText;
            cleanText = cleanText.replace(/(\d+)\s*[_\.,]\s*(\d+)/g, "$1.$2");
            cleanText = cleanText.replace(/\d+(?:\.\d+)?\s*%/g, "");

            let debugMsg = "=== 👁️ 淨化後的 AI 視力測驗 ===\n" + cleanText + "\n====================\n\n";

            const allAmounts = [...cleanText.matchAll(/\b\d{1,4}(?:,\d{3})*\.\d{2}\b/g)]
                .map(m => parseFloat(m[0].replace(',', '')))
                .sort((a, b) => b - a);

            debugMsg += `1. 所有有效金額:\n[${allAmounts.join(', ')}]\n\n`;

            let finalSub = 0, finalTax = 0, finalTotal = 0;

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
                if (finalTotal) debugMsg += `✅ 引擎 B 成功 (完美配對)！\n\n`;
            }

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
                
                manualSubtotalInput.value = scannedSubtotal.toFixed(2);
                manualTaxInput.value = scannedTax.toFixed(2);
                
                calculateAndRender();
            } else {
                lastScannedImageFile = null;
                showDebugAndResultModal("0.00", "0.00", "❌ 找不到任何金額。\n\n" + debugMsg);
            }

        } catch (error) {
            console.error("OCR Error:", error);
            showErrorModal('圖片辨識失敗，請重試。');
        } finally {
            btnSnap.innerHTML = '<img src="camera-icon.png" alt="Camera" class="cam-icon-img">';
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

// 🌟 整合動態 Venmo 付款連結的分享功能
btnShare.addEventListener('click', async () => {
    if (currentGrandTotal === 0) {
        showErrorModal('目前還沒有帳單資料可以分享喔！');
        return;
    }

    const tipPercentage = parseInt(tipSlider.value); 
    const tipAmount = (scannedSubtotal * (tipPercentage / 100)).toFixed(2);
    
    // 從輸入框即時抓取使用者設定的 Venmo 帳號
    const currentVenmoId = venmoIdInput.value.trim();
    let venmoText = "";

    // 如果使用者有輸入 Venmo 帳號，才加入收款連結
    if (currentVenmoId) {
        const venmoLink = `https://venmo.com/?tx=pay&recipients=${currentVenmoId}&amount=${currentPerPerson.toFixed(2)}&note=Dinner%20Bill`;
        venmoText = `\n💸 點擊下方連結使用 Venmo 快速付款：\n${venmoLink}\n`;
    }

    const shareTitle = '🧾 BillApp 帳單分享';
    const shareText = 
`🍽️ 聚餐帳單明細

🔹 稅前 (Subtotal): $${scannedSubtotal.toFixed(2)}
🔹 稅金 (Tax): $${scannedTax.toFixed(2)}
🔹 貼士 (Tip ${tipPercentage}%): $${tipAmount}
💰 總金額 (Total): $${currentGrandTotal.toFixed(2)}

👥 分攤人數: ${currentSplitCount} 人
👉 每人應付: $${currentPerPerson.toFixed(2)}
${venmoText}
(由 BillApp 自動計算 🤖)`;

    const shareData = {
        title: shareTitle,
        text: shareText
    };

    if (lastScannedImageFile && navigator.canShare && navigator.canShare({ files: [lastScannedImageFile] })) {
        shareData.files = [lastScannedImageFile];
    }

    if (navigator.share) {
        try {
            await navigator.share(shareData);
            console.log('分享完成');
        } catch (error) {
            console.log('使用者取消分享或發生錯誤:', error);
        }
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            showErrorModal('您的裝置不支援快速分享，已將明細與付款連結複製到剪貼簿！');
        }).catch(err => {
            showErrorModal('分享功能發生錯誤。');
        });
    }
});

btnDone.addEventListener('click', () => { 
    scannedSubtotal = 0.00;
    scannedTax = 0.00;
    manualSubtotalInput.value = '';
    manualTaxInput.value = '';
    tipSlider.value = 15;
    currentSplitCount = 4;
    splitCountDisplay.textContent = currentSplitCount;
    lastScannedImageFile = null; 
    calculateAndRender();
});

// 初始化計算
calculateAndRender();