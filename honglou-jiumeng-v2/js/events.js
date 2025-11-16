// 事件系統

export class EventSystem {
    constructor(state) {
        this.state = state;
    }

    init() {
        // 初始化事件系統
    }

    checkSeasonalEvents() {
        const season = this.state.getCurrentSeason();
        
        // 清明節氣事件：葬花相關
        if (season === '清明') {
            this.triggerQingmingEvent();
        }
    }

    triggerQingmingEvent() {
        console.log('清明節氣：葬花相關記憶更容易觸發');
        // 這裡可以調整記憶搜尋機率或給予特殊獎勵
    }
}

