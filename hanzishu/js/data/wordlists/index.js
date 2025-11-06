// 系統內建字詞表匯總
// 依序匯出各年級字詞表
import { hongliPrepWordlist } from './hongli-prep.js';
import { hongliElementaryWordlist } from './hongli-elementary.js';

export { hongliPrepWordlist, hongliElementaryWordlist };

export const systemWordlistsData = [
    hongliPrepWordlist,
    hongliElementaryWordlist
];
