// 玩家系統邏輯模組

export function createPlayerManager({
    playerData,
    levelSystem,
    pointRewards,
    storageKeys,
    onUIUpdate,
    onPointNotification,
    onLevelUp
}) {
    const uiUpdate = typeof onUIUpdate === 'function' ? onUIUpdate : () => {};
    const pointNotify = typeof onPointNotification === 'function' ? onPointNotification : () => {};
    const levelNotify = typeof onLevelUp === 'function' ? onLevelUp : () => {};

    function savePlayerData() {
        const dataToSave = {
            ...playerData,
            functionsUsed: Array.from(playerData.functionsUsed),
            firstTimeActions: Array.from(playerData.firstTimeActions)
        };
        localStorage.setItem(storageKeys.playerData, JSON.stringify(dataToSave));
    }

    function updatePlayerLevel() {
        const currentLevel = levelSystem.find((level) =>
            playerData.points >= level.minPoints && playerData.points <= level.maxPoints
        );

        if (currentLevel && currentLevel.level !== playerData.level) {
            const previousLevel = playerData.level;
            playerData.level = currentLevel.level;
            playerData.levelName = currentLevel.name;

            if (currentLevel.level > previousLevel) {
                levelNotify(currentLevel.level, currentLevel.name);
            }
        }
    }

    function awardPoints(points, message = '') {
        playerData.points += points;
        updatePlayerLevel();
        uiUpdate(playerData);
        savePlayerData();

        if (message) {
            pointNotify(message);
        }
    }

    function handleDailyLogin() {
        const today = new Date().toDateString();
        const lastLogin = playerData.lastLoginDate;

        if (lastLogin !== today) {
            if (lastLogin) {
                const lastDate = new Date(lastLogin);
                const todayDate = new Date(today);
                const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

                if (daysDiff === 1) {
                    playerData.dailyLoginStreak++;
                } else {
                    playerData.dailyLoginStreak = 1;
                }
            } else {
                playerData.dailyLoginStreak = 1;
            }

            playerData.lastLoginDate = today;

            let dailyPoints = pointRewards.dailyLogin;
            if (playerData.dailyLoginStreak > 1) {
                dailyPoints += pointRewards.streakBonus * Math.min(playerData.dailyLoginStreak - 1, 10);
            }

            awardPoints(dailyPoints, `每日登入 +${dailyPoints} 🖌️`);

            savePlayerData();
        }
    }

    function loadPlayerData() {
        const savedNew = localStorage.getItem(storageKeys.playerData);
        const savedOld = localStorage.getItem(storageKeys.playerDataLegacy);
        const raw = savedNew || savedOld;

        if (raw) {
            const data = JSON.parse(raw);
            if (data.functionsUsed && Array.isArray(data.functionsUsed)) {
                data.functionsUsed = new Set(data.functionsUsed);
            }
            if (data.firstTimeActions && Array.isArray(data.firstTimeActions)) {
                data.firstTimeActions = new Set(data.firstTimeActions);
            }
            Object.assign(playerData, data);

            if (!savedNew && savedOld) {
                savePlayerData();
                try { localStorage.removeItem(storageKeys.playerDataLegacy); } catch (e) {}
            } else if (savedNew && savedOld) {
                try { localStorage.removeItem(storageKeys.playerDataLegacy); } catch (e) {}
            }
        }

        const today = new Date().toDateString();
        if (playerData.statistics.lastResetDate !== today) {
            playerData.statistics = {
                charactersToday: 0,
                wordsToday: 0,
                practiceToday: 0,
                gamesPlayedToday: 0,
                lastResetDate: today
            };
        }

        uiUpdate(playerData);
        handleDailyLogin();
    }

    return {
        loadPlayerData,
        awardPoints
    };
}


