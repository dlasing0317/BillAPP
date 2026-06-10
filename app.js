// --- 執行 OCR 與三大引擎分析 ---
btnCropConfirm.addEventListener('click', async () => {
    if (!cropper) return;

    // 🌟 關鍵修復：限制輸出解析度，防止 iOS 記憶體崩潰產生破圖！
    cropper.getCroppedCanvas({
        maxWidth: 1024,
        maxHeight: 1024
    }).toBlob(async (blob) => {
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