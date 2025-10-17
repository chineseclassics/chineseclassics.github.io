// 在瀏覽器控制台運行此腳本檢查佈局問題

console.log('=== 佈局診斷 ===\n');

// 檢查主要容器的尺寸
const mainContent = document.querySelector('.main-content');
const container = document.querySelector('.container');
const startScreen = document.getElementById('start-screen');
const content = startScreen?.querySelector('.content');

console.log('1️⃣ 視窗和容器尺寸：');
console.log('   視窗寬度:', window.innerWidth, 'px');
console.log('   視窗高度:', window.innerHeight, 'px');
console.log('');

console.log('2️⃣ .main-content:');
if (mainContent) {
    const rect = mainContent.getBoundingClientRect();
    const computed = window.getComputedStyle(mainContent);
    console.log('   實際寬度:', rect.width, 'px');
    console.log('   左邊距:', computed.marginLeft);
    console.log('   右邊距:', computed.marginRight);
    console.log('   max-width:', computed.maxWidth);
    console.log('   overflow-x:', computed.overflowX);
    console.log('   左邊位置:', rect.left, 'px');
    console.log('   右邊位置:', rect.right, 'px');
    console.log('   計算: 280px + ', rect.width, '=', 280 + rect.width, 'px (應 ≤', window.innerWidth, 'px)');
}
console.log('');

console.log('3️⃣ .container:');
if (container) {
    const rect = container.getBoundingClientRect();
    const computed = window.getComputedStyle(container);
    console.log('   實際寬度:', rect.width, 'px');
    console.log('   max-width:', computed.maxWidth);
    console.log('   overflow-x:', computed.overflowX);
}
console.log('');

console.log('4️⃣ #start-screen .content:');
if (content) {
    const rect = content.getBoundingClientRect();
    const computed = window.getComputedStyle(content);
    console.log('   實際寬度:', rect.width, 'px');
    console.log('   max-width:', computed.maxWidth);
    console.log('   overflow-x:', computed.overflowX);
    console.log('   overflow-y:', computed.overflowY);
    console.log('   scrollWidth:', content.scrollWidth, 'px (> width 表示有溢出)');
    console.log('   scrollHeight:', content.scrollHeight, 'px');
}
console.log('');

console.log('5️⃣ 檢查是否有元素超出容器：');
const allElements = document.querySelectorAll('#start-screen *');
let overflowElements = [];

allElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    const computed = window.getComputedStyle(el);
    
    // 檢查是否超出視窗右側
    if (rect.right > window.innerWidth) {
        overflowElements.push({
            element: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.split(' ')[0] : ''),
            right: rect.right,
            width: rect.width,
            overflow: rect.right - window.innerWidth
        });
    }
});

if (overflowElements.length > 0) {
    console.log('   ⚠️ 發現', overflowElements.length, '個溢出元素：');
    overflowElements.sort((a, b) => b.overflow - a.overflow);
    overflowElements.slice(0, 5).forEach(item => {
        console.log(`      ${item.element}: 右邊=${item.right}px, 超出=${item.overflow}px`);
    });
} else {
    console.log('   ✅ 沒有發現超出視窗的元素');
}

console.log('\n=== 診斷完成 ===');
console.log('\n💡 滾動條位置問題通常由以下原因造成：');
console.log('1. main-content 寬度計算錯誤（margin-left + width > 100vw）');
console.log('2. 某個子元素超出容器寬度');
console.log('3. padding 沒有包含在 box-sizing 中');

