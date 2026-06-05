// 抓取 HTML 元素
const subtotalInput = document.getElementById('subtotal');
const taxInput = document.getElementById('tax');
const splitInput = document.getElementById('split');
const tipButtons = document.querySelectorAll('.tip-btn');
const btnMinus = document.getElementById('btn-minus');
const btnPlus = document.getElementById('btn-plus');

const tipAmountDisplay = document.getElementById('tip-amount');
const totalAmountDisplay = document.getElementById('total-amount');
const perPersonDisplay = document.getElementById('per-person');

let currentTipPercentage = 18; // 預設 18%

// 計算核心邏輯
function calculate() {
    // 取得輸入值，如果沒填就當作 0
    const subtotal = parseFloat(subtotalInput.value) || 0;
    const tax = parseFloat(taxInput.value) || 0;
    const splitCount = parseInt(splitInput.value) || 1;

    // 1. 嚴格計算小費 (只用稅前金額)
    const tipAmount = subtotal * (currentTipPercentage / 100);
    
    // 2. 計算總金額
    const totalAmount = subtotal + tax + tipAmount;
    
    // 3. 計算每人分攤
    const perPerson = totalAmount / splitCount;

    // 更新畫面顯示 (四捨五入到小數點後兩位)
    tipAmountDisplay.textContent = `$${tipAmount.toFixed(2)}`;
    totalAmountDisplay.textContent = `$${totalAmount.toFixed(2)}`;
    perPersonDisplay.textContent = `$${perPerson.toFixed(2)}`;
}

// 綁定事件：當輸入框數字改變時，自動重新計算
subtotalInput.addEventListener('input', calculate);
taxInput.addEventListener('input', calculate);
splitInput.addEventListener('input', calculate);

// 小費按鈕切換邏輯
tipButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        // 移除所有按鈕的 active 樣式
        tipButtons.forEach(b => b.classList.remove('active'));
        // 給點擊的按鈕加上 active 樣式
        this.classList.add('active');
        // 更新當前小費比例並重新計算
        currentTipPercentage = parseFloat(this.getAttribute('data-tip'));
        calculate();
    });
});

// 人數加減按鈕邏輯
btnMinus.addEventListener('click', () => {
    if (splitInput.value > 1) {
        splitInput.value = parseInt(splitInput.value) - 1;
        calculate();
    }
});

btnPlus.addEventListener('click', () => {
    splitInput.value = parseInt(splitInput.value) + 1;
    calculate();
});