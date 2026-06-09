const cameraInput = document.getElementById('camera-input');
const subtotalInput = document.getElementById('subtotal');
const taxInput = document.getElementById('tax');
const ocrDebugText = document.getElementById('ocr-debug-text');
const loadingIndicator = document.getElementById('loading-indicator');

// 監聽相機上傳/拍照事件
cameraInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 更新 UI 狀態
    loadingIndicator.style.display = 'inline';
    ocrDebugText.value = "正在分析收據照片，請稍候...\n這可能需要幾十秒的時間，請保持畫面開啟。";

    // 啟動 Tesseract.js 進行文字辨識
    Tesseract.recognize(
        file,
        'eng', // 使用英文語言包
        { logger: m => console.log(m) } // 可在瀏覽器控制台看進度
    ).then(({ data: { text } }) => {
        
        loadingIndicator.style.display = 'none';

        // 🌟 核心除錯步驟：把 AI 看到的「原汁原味」文字印出來！
        ocrDebugText.value = text;

        // 嘗試用基本的正規表示式(Regex)抓取 Subtotal 和 Tax 金額
        // 注意：這裡假設收據上印的是 "Subtotal" 和 "Tax" 字眼
        const subtotalMatch = text.match(/subtotal[\s$:]*([\d.]+)/i);
        const taxMatch = text.match(/tax[\s$:]*([\d.]+)/i);

        // 處理 Subtotal
        if (subtotalMatch && subtotalMatch[1]) {
            subtotalInput.value = parseFloat(subtotalMatch[1]);
        } else {
            alert("找不到金額！請查看下方除錯框裡的文字，看看收據上的關鍵字是不是被讀成了別的字 (例如 Amount Due 或 Balance)。");
        }

        // 處理 Tax
        if (taxMatch && taxMatch[1]) {
            taxInput.value = parseFloat(taxMatch[1]);
        }

    }).catch(err => {
        loadingIndicator.style.display = 'none';
        ocrDebugText.value = "掃描發生錯誤：\n" + err;
        alert("OCR 引擎發生錯誤，請看除錯框的詳細訊息。");
    });
});

// 簡單的返回按鈕測試邏輯
document.getElementById('btn-back').addEventListener('click', () => {
    alert("點擊了返回按鈕！");
});