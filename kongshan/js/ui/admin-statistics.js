// =====================================================
// 管理後台 - 數據統計介面
// =====================================================

/**
 * 渲染數據統計介面
 * @param {HTMLElement} container
 * @param {object} context
 * @param {import('../core/admin-manager.js').AdminManager} context.adminManager
 */
export async function renderStatistics(container, { adminManager }) {
  if (!container || !adminManager) {
    return;
  }

  container.classList.add('admin-view-shell');

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  container.innerHTML = `
    <section class="admin-section">
      <header class="admin-section-header">
        <div>
          <h2 class="admin-section-title">數據統計</h2>
          <p class="admin-description">查看空山的數據概覽與趨勢分析，時間範圍以月為單位。</p>
        </div>
        <div class="admin-inline-actions">
          <label for="statistics-month-select" class="sr-only">選擇月份</label>
          <input 
            type="month" 
            id="statistics-month-select" 
            class="admin-form-input admin-month-select"
            value="${currentMonth}"
            max="${currentMonth}"
          />
          <button class="admin-btn admin-btn-secondary admin-btn-small" type="button" data-action="refresh">
            <i class="fas fa-rotate-right" aria-hidden="true"></i>
            重新整理
          </button>
        </div>
      </header>

      <!-- 統計卡片 -->
      <div class="admin-statistics-cards" id="admin-statistics-cards">
        <div class="admin-stat-card">
          <div class="admin-stat-card-icon">
            <i class="fas fa-users" aria-hidden="true"></i>
          </div>
          <div class="admin-stat-card-content">
            <div class="admin-stat-card-value" id="stat-total-users">-</div>
            <div class="admin-stat-card-label">總用戶數</div>
            <div class="admin-stat-card-change" id="stat-new-users">本月新增：-</div>
          </div>
        </div>

        <div class="admin-stat-card">
          <div class="admin-stat-card-icon">
            <i class="fas fa-mountain-sun" aria-hidden="true"></i>
          </div>
          <div class="admin-stat-card-content">
            <div class="admin-stat-card-value" id="stat-total-atmospheres">-</div>
            <div class="admin-stat-card-label">聲色意境總數</div>
            <div class="admin-stat-card-change" id="stat-new-atmospheres">本月新增：-</div>
          </div>
        </div>

        <div class="admin-stat-card">
          <div class="admin-stat-card-icon">
            <i class="fas fa-music" aria-hidden="true"></i>
          </div>
          <div class="admin-stat-card-content">
            <div class="admin-stat-card-value" id="stat-total-sounds">-</div>
            <div class="admin-stat-card-label">音效總數</div>
            <div class="admin-stat-card-change" id="stat-sound-breakdown">系統：- / 用戶：-</div>
          </div>
        </div>

        <div class="admin-stat-card">
          <div class="admin-stat-card-icon">
            <i class="fas fa-book-open" aria-hidden="true"></i>
          </div>
          <div class="admin-stat-card-content">
            <div class="admin-stat-card-value" id="stat-total-poems">-</div>
            <div class="admin-stat-card-label">詩句總數</div>
            <div class="admin-stat-card-change" id="stat-pending-recordings">待審核音效：-</div>
          </div>
        </div>
      </div>

      <!-- 圖表區域 -->
      <div class="admin-statistics-charts">
        <div class="admin-chart-card">
          <h3 class="admin-chart-title">用戶增長趨勢</h3>
          <div class="admin-chart-container">
            <canvas id="user-growth-chart"></canvas>
          </div>
        </div>

        <div class="admin-chart-card">
          <h3 class="admin-chart-title">聲色意境創建趨勢</h3>
          <div class="admin-chart-container">
            <canvas id="atmosphere-growth-chart"></canvas>
          </div>
        </div>
      </div>

      <!-- 熱門詩句 -->
      <div class="admin-card">
        <h3 class="admin-chart-title">熱門詩句（按聲色意境數量）</h3>
        <div class="admin-card-table-wrapper">
          <table class="admin-table admin-popular-poems-table">
            <thead>
              <tr>
                <th scope="col">排名</th>
                <th scope="col">詩句</th>
                <th scope="col">作者</th>
                <th scope="col">題名</th>
                <th scope="col">聲色意境數</th>
              </tr>
            </thead>
            <tbody id="popular-poems-table-body">
              <tr>
                <td colspan="5">
                  <div class="admin-empty-state">
                    <i class="fas fa-spinner fa-pulse" aria-hidden="true"></i>
                    <p>載入中...</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;

  const state = {
    statistics: null,
    isLoading: false,
    charts: {
      userGrowth: null,
      atmosphereGrowth: null
    }
  };

  const monthSelect = container.querySelector('#statistics-month-select');
  const refreshBtn = container.querySelector('[data-action="refresh"]');
  const popularPoemsBody = container.querySelector('#popular-poems-table-body');

  if (monthSelect) {
    monthSelect.addEventListener('change', () => {
      loadStatistics(monthSelect.value).catch(err => console.warn('載入統計數據失敗:', err));
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadStatistics(monthSelect.value, true).catch(err => console.warn('重新整理統計數據失敗:', err));
    });
  }

  await loadStatistics(currentMonth);

  async function loadStatistics(month, forceReload = false) {
    if (state.isLoading && !forceReload) {
      return;
    }

    state.isLoading = true;
    showLoading();

    try {
      const stats = await adminManager.getAdminStatistics(month);
      state.statistics = stats;

      renderStatisticsCards(stats);
      renderCharts(stats);
      await renderPopularPoems(stats.trends.popularPoems);

      hideLoading();
    } catch (error) {
      console.error('載入統計數據失敗:', error);
      showError('載入統計數據失敗，請稍後再試。');
    } finally {
      state.isLoading = false;
    }
  }

  function renderStatisticsCards(stats) {
    const totalUsersEl = container.querySelector('#stat-total-users');
    const newUsersEl = container.querySelector('#stat-new-users');
    const totalAtmospheresEl = container.querySelector('#stat-total-atmospheres');
    const newAtmospheresEl = container.querySelector('#stat-new-atmospheres');
    const totalSoundsEl = container.querySelector('#stat-total-sounds');
    const soundBreakdownEl = container.querySelector('#stat-sound-breakdown');
    const totalPoemsEl = container.querySelector('#stat-total-poems');
    const pendingRecordingsEl = container.querySelector('#stat-pending-recordings');

    if (totalUsersEl) totalUsersEl.textContent = formatNumber(stats.users.total);
    if (newUsersEl) newUsersEl.textContent = `本月新增：${formatNumber(stats.users.newThisMonth)}`;
    if (totalAtmospheresEl) totalAtmospheresEl.textContent = formatNumber(stats.atmospheres.total);
    if (newAtmospheresEl) newAtmospheresEl.textContent = `本月新增：${formatNumber(stats.atmospheres.newThisMonth)}`;
    
    const totalSounds = stats.sounds.system + stats.sounds.user;
    if (totalSoundsEl) totalSoundsEl.textContent = formatNumber(totalSounds);
    if (soundBreakdownEl) {
      soundBreakdownEl.textContent = `系統：${formatNumber(stats.sounds.system)} / 用戶：${formatNumber(stats.sounds.user)}`;
    }
    
    if (totalPoemsEl) totalPoemsEl.textContent = formatNumber(stats.poems.total);
    if (pendingRecordingsEl) {
      pendingRecordingsEl.textContent = `待審核音效：${formatNumber(stats.sounds.pending)}`;
    }
  }

  function renderCharts(stats) {
    renderUserGrowthChart(stats.trends.userGrowth);
    renderAtmosphereGrowthChart(stats.trends.atmosphereGrowth);
  }

  function renderUserGrowthChart(data) {
    const canvas = container.querySelector('#user-growth-chart');
    if (!canvas) return;

    // 銷毀舊圖表
    if (state.charts.userGrowth) {
      state.charts.userGrowth.destroy();
    }

    const ctx = canvas.getContext('2d');
    state.charts.userGrowth = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(item => formatMonthLabel(item.month)),
        datasets: [{
          label: '新增用戶數',
          data: data.map(item => item.count),
          borderColor: 'rgb(120, 146, 98)',
          backgroundColor: 'rgba(120, 146, 98, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  }

  function renderAtmosphereGrowthChart(data) {
    const canvas = container.querySelector('#atmosphere-growth-chart');
    if (!canvas) return;

    // 銷毀舊圖表
    if (state.charts.atmosphereGrowth) {
      state.charts.atmosphereGrowth.destroy();
    }

    const ctx = canvas.getContext('2d');
    state.charts.atmosphereGrowth = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(item => formatMonthLabel(item.month)),
        datasets: [{
          label: '新增聲色意境數',
          data: data.map(item => item.count),
          borderColor: 'rgb(186, 144, 90)',
          backgroundColor: 'rgba(186, 144, 90, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  }

  async function renderPopularPoems(popularPoemsData) {
    if (!popularPoemsBody) {
      return;
    }

    if (!popularPoemsData || popularPoemsData.length === 0) {
      popularPoemsBody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="admin-empty-state">
              <i class="fas fa-book-open" aria-hidden="true"></i>
              <p>目前沒有數據</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    // 獲取詩句詳細信息
    const poemIds = popularPoemsData.map(item => item.poemId);
    const poemsMap = new Map();

    try {
      if (adminManager.supabase && poemIds.length > 0) {
        const { data: poems, error } = await adminManager.supabase
          .from('poems')
          .select('id, title, author, content')
          .in('id', poemIds);

        if (!error && Array.isArray(poems)) {
          poems.forEach(poem => {
            poemsMap.set(poem.id, poem);
          });
        }
      }
    } catch (error) {
      console.warn('獲取詩句詳細信息失敗:', error);
    }

    popularPoemsBody.innerHTML = popularPoemsData.map((item, index) => {
      const poem = poemsMap.get(item.poemId);
      const contentPreview = poem?.content 
        ? (poem.content.length > 30 ? poem.content.substring(0, 30) + '...' : poem.content)
        : '（未知）';
      const title = poem?.title || '（未知）';
      const author = poem?.author || '（未知）';

      return `
        <tr>
          <td>${index + 1}</td>
          <td class="admin-poem-content-cell">${escapeHtml(contentPreview)}</td>
          <td>${escapeHtml(author)}</td>
          <td>${escapeHtml(title)}</td>
          <td><strong>${formatNumber(item.count)}</strong></td>
        </tr>
      `;
    }).join('');
  }

  function showLoading() {
    // 統計卡片已經顯示，不需要額外的加載狀態
  }

  function hideLoading() {
    // 統計卡片已經顯示，不需要額外的加載狀態
  }

  function showError(message) {
    const cardsEl = container.querySelector('#admin-statistics-cards');
    if (cardsEl) {
      cardsEl.innerHTML = `
        <div class="admin-error" style="grid-column: 1 / -1;">
          <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
          <p>${message}</p>
        </div>
      `;
    }
  }

  // =====================================================
  // 輔助函數
  // =====================================================

  function formatNumber(num) {
    if (typeof num !== 'number') {
      return '0';
    }
    return num.toLocaleString('zh-TW');
  }

  function formatMonthLabel(monthStr) {
    // YYYY-MM -> YYYY年MM月
    const [year, month] = monthStr.split('-');
    return `${year}年${parseInt(month, 10)}月`;
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') {
      return '';
    }
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

