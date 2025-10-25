# 統一批注系統設計文檔

## 背景

時文寶鑑第二版功能需要統一學生端和老師端的批注系統，實現 Google Docs 風格的批注體驗。同時需要處理學生端右側區域的雨村評點與老師批注的共存問題。

## 設計目標

1. **統一體驗**：學生端和老師端使用完全相同的 Google Docs 風格批注界面
2. **智能共存**：雨村評點和老師批注能夠智能共存，不互相干擾
3. **空間優化**：批注能夠智能跟隨原文高亮，充分利用右側空間
4. **用戶體驗**：雨村評點可收合，為批注留出更多顯示空間

## 技術架構

### 1. 分層顯示模式

#### HTML 結構設計

```html
<!-- 右側側邊欄結構 -->
<aside class="w-80 bg-white border-l border-gray-200 flex flex-col">
  <!-- 雨村評點區域（可收合） -->
  <div id="feedback-section" class="border-b border-gray-200">
    <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 cursor-pointer" 
         id="feedback-header" onclick="toggleFeedbackSection()">
      <div class="flex items-center justify-between">
        <h4 class="font-semibold text-blue-800 flex items-center">
          <i class="fas fa-robot mr-2"></i>雨村評點
        </h4>
        <i id="feedback-arrow" class="fas fa-chevron-down text-blue-600 transition-transform"></i>
      </div>
    </div>
    <div id="feedback-content" class="p-4 max-h-64 overflow-y-auto hidden">
      <!-- AI 反饋內容 -->
    </div>
  </div>
  
  <!-- 老師批注區域（主要顯示） -->
  <div id="annotations-section" class="flex-1">
    <div class="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-200">
      <h4 class="font-semibold text-amber-800 flex items-center">
        <i class="fas fa-comments mr-2"></i>老師批注
        <span id="annotation-count" class="ml-2 text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full">0</span>
      </h4>
    </div>
    <div id="annotations-content" class="p-4 max-h-96 overflow-y-auto">
      <!-- Google Docs 風格批注列表 -->
    </div>
  </div>
</aside>
```

#### CSS 樣式設計

```css
/* 雨村評點收合動畫 */
#feedback-content {
  transition: all 0.3s ease-in-out;
  overflow: hidden;
}

#feedback-content.hidden {
  max-height: 0;
  padding: 0;
}

#feedback-content.expanded {
  max-height: 16rem; /* 256px */
  padding: 1rem;
}

/* 箭頭旋轉動畫 */
#feedback-arrow {
  transition: transform 0.3s ease-in-out;
}

#feedback-arrow.rotated {
  transform: rotate(180deg);
}

/* 智能高度分配 */
#feedback-section.collapsed {
  flex: 0 0 auto;
}

#feedback-section.expanded {
  flex: 0 0 16rem; /* 固定高度 */
}

#annotations-section {
  flex: 1;
  min-height: 0; /* 確保可以收縮 */
}
```

### 2. 智能空間分配邏輯

#### JavaScript 實現

```javascript
class SidebarManager {
  constructor() {
    this.feedbackSection = document.getElementById('feedback-section');
    this.annotationsSection = document.getElementById('annotations-section');
    this.feedbackContent = document.getElementById('feedback-content');
    this.feedbackHeader = document.getElementById('feedback-header');
    this.feedbackArrow = document.getElementById('feedback-arrow');
    this.annotationCount = document.getElementById('annotation-count');
  }
  
  // 切換雨村評點收合狀態
  toggleFeedbackSection() {
    const isExpanded = !this.feedbackContent.classList.contains('hidden');
    
    if (isExpanded) {
      this.collapseFeedback();
    } else {
      this.expandFeedback();
    }
  }
  
  // 收合雨村評點
  collapseFeedback() {
    this.feedbackContent.classList.add('hidden');
    this.feedbackArrow.classList.remove('rotated');
    this.feedbackSection.classList.add('collapsed');
    this.feedbackSection.classList.remove('expanded');
  }
  
  // 展開雨村評點
  expandFeedback() {
    this.feedbackContent.classList.remove('hidden');
    this.feedbackArrow.classList.add('rotated');
    this.feedbackSection.classList.remove('collapsed');
    this.feedbackSection.classList.add('expanded');
  }
  
  // 智能空間分配
  adjustLayout() {
    const hasAnnotations = this.annotationCount.textContent !== '0';
    const hasFeedback = this.feedbackContent.children.length > 0;
    
    if (hasAnnotations && hasFeedback) {
      // 兩者都有：雨村評點收合，批注優先
      this.collapseFeedback();
    } else if (hasAnnotations) {
      // 只有批注：雨村評點隱藏
      this.feedbackSection.style.display = 'none';
    } else if (hasFeedback) {
      // 只有反饋：雨村評點展開
      this.feedbackSection.style.display = 'block';
      this.expandFeedback();
    }
  }
  
  // 更新批注計數
  updateAnnotationCount(count) {
    this.annotationCount.textContent = count;
    this.adjustLayout();
  }
}
```

### 3. 批注智能跟隨

#### 容器查找邏輯

```javascript
// 在 AnnotationManager 中修改容器查找
createFloatingAnnotation(annotationId, annotation) {
  // 嘗試多個容器選擇器
  const wrapper = document.querySelector('.grading-content-wrapper') ||
                  document.querySelector('.essay-editor-container') ||
                  document.querySelector('#essayViewer')?.parentElement;
  
  if (!wrapper) {
    console.log('❌ 找不到滾動容器');
    return;
  }
  
  // 創建浮動批注
  const floatingAnnotation = document.createElement('div');
  floatingAnnotation.className = 'floating-annotation';
  floatingAnnotation.dataset.annotationId = annotationId;
  
  // 設置批注內容
  floatingAnnotation.innerHTML = this.createAnnotationHTML(annotation);
  
  // 添加到容器
  wrapper.appendChild(floatingAnnotation);
  
  // 智能定位
  this.positionAnnotation(floatingAnnotation, annotation);
}
```

## 實施步驟

### 階段 1：基礎結構
1. 修改 HTML 模板，實現分層顯示結構
2. 添加 CSS 樣式，實現收合/展開動畫
3. 實現基本的 JavaScript 控制邏輯

### 階段 2：智能邏輯
1. 實現智能空間分配算法
2. 集成批注計數更新
3. 實現自動收合邏輯

### 階段 3：集成測試
1. 測試雨村評點收合/展開功能
2. 測試批注智能跟隨顯示
3. 測試不同屏幕尺寸下的響應式效果

## 預期效果

1. **用戶體驗**：雨村評點默認收合，不影響批注顯示
2. **空間利用**：批注能夠智能跟隨原文高亮，充分利用右側空間
3. **功能完整**：兩個功能都能正常使用，互不干擾
4. **視覺一致**：與老師端使用相同的 Google Docs 風格批注界面

## 風險與注意事項

1. **容器兼容性**：確保 AnnotationManager 在學生端能找到正確的容器
2. **動畫性能**：收合/展開動畫要流暢，不影響用戶體驗
3. **響應式設計**：在不同屏幕尺寸下都能正常顯示
4. **狀態同步**：雨村評點和批注的狀態要正確同步

## 技術細節

### 收合/展開狀態管理

```javascript
// 狀態管理
const SidebarState = {
  feedbackExpanded: false,
  hasAnnotations: false,
  hasFeedback: false
};

// 狀態更新
function updateSidebarState() {
  SidebarState.hasAnnotations = window.studentAnnotationManager?.annotations?.size > 0;
  SidebarState.hasFeedback = document.getElementById('feedback-content').children.length > 0;
  
  // 根據狀態調整佈局
  sidebarManager.adjustLayout();
}
```

### 事件綁定

```javascript
// 綁定事件
document.addEventListener('DOMContentLoaded', () => {
  const sidebarManager = new SidebarManager();
  
  // 綁定雨村評點切換事件
  document.getElementById('feedback-header')?.addEventListener('click', () => {
    sidebarManager.toggleFeedbackSection();
  });
  
  // 監聽批注變化
  window.addEventListener('annotationUpdated', () => {
    sidebarManager.updateAnnotationCount(window.studentAnnotationManager?.annotations?.size || 0);
  });
});
```

這個設計確保了雨村評點和老師批注能夠智能共存，用戶可以根據需要自由切換，同時批注能夠智能跟隨原文高亮，提供最佳的用戶體驗。
