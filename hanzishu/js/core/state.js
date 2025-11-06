// 狀態管理與本地存儲鍵名

export const STORAGE_KEYS = {
    playerData: 'hanzishu_player_data',
    playerDataLegacy: 'diandianmobao_player_data',
    vocabularyBook: 'hanzishu_vocabulary_book',
    vocabularyBookLegacy: 'vocabularyBook'
};

export function createInitialPlayerData() {
    return {
        points: 0,
        level: 1,
        levelName: '墨韻初心',
        dailyLoginStreak: 0,
        lastLoginDate: null,
        totalCharactersLearned: 0,
        totalWordsLearned: 0,
        totalStrokePractices: 0,
        totalMemoryGames: 0,
        totalRadicalGames: 0,
        totalCollections: 0,
        perfectMemoryGames: 0,
        perfectRadicalGames: 0,
        functionsUsed: new Set(),
        firstTimeActions: new Set(),
        achievements: new Set(),
        statistics: {
            charactersToday: 0,
            wordsToday: 0,
            practiceToday: 0,
            gamesPlayedToday: 0,
            lastResetDate: new Date().toDateString()
        }
    };
}

export function createInitialVocabularyBook() {
    return {
        items: []
    };
}


