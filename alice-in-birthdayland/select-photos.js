/* ========================================
   Alice in Birthdayland - 照片選擇腳本
   ======================================== */

/**
 * 基於照片描述分析，選擇最適合做拼圖的 6-8 張照片
 * 選擇標準：清晰度高、表情生動、構圖良好、適合切割
 */

const photoSelection = {
  // 基於描述分析的最佳選擇
  selected: [
    {
      original: 'DSCF3746_DxO.JPG',  // 海邊家庭照（三人，陽光明媚）
      newName: 'photo-1.jpg',
      reason: '海邊家庭照，陽光明媚，人物清晰，適合切割'
    },
    {
      original: 'DSCF3042_DxO.JPG',  // 戶外公園姐弟照（抱著笑）
      newName: 'photo-2.jpg', 
      reason: '姐弟親密照，表情生動，背景自然'
    },
    {
      original: 'DSCF3396_DxO.JPG',  // 父女親密照（戶外綠植背景）
      newName: 'photo-3.jpg',
      reason: '父女親密，戶外背景，構圖良好'
    },
    {
      original: 'DSCF7351.JPG',      // 海邊玩水照（動態有趣）
      newName: 'photo-4.jpg',
      reason: '海邊玩水，動態有趣，表情自然'
    },
    {
      original: 'DSCF7244.JPG',      // 夜市手牽手照（溫馨氛圍）
      newName: 'photo-5.jpg',
      reason: '夜市溫馨照，手牽手，燈光氛圍好'
    },
    {
      original: 'f79fc53fb5b65880aaa823245ac674e5.JPG', // 戶外陽光笑容照
      newName: 'photo-6.jpg',
      reason: '戶外陽光，笑容燦爛，橡膠雞玩具可愛'
    },
    {
      original: '0fdeb64621a4ac5a115f2c832ebbf65e.JPG', // 備選照片
      newName: 'photo-7.jpg',
      reason: '備選照片，表情生動'
    },
    {
      original: '655a39d56ee1d4667c49c59aa583453c.JPG', // 備選照片
      newName: 'photo-8.jpg',
      reason: '備選照片，構圖良好'
    }
  ],
  
  // 排除的照片（HEIC 格式或不太適合）
  excluded: [
    'IMG_9610.HEIC',  // HEIC 格式，需要轉換
    'IMG_9692.HEIC',  // HEIC 格式
    'IMG_9827.HEIC',  // HEIC 格式  
    'IMG_9877.HEIC',  // HEIC 格式
    'IMG_6511.HEIC',  // HEIC 格式
    'DSCF9046 - 副本.JPG'  // 文件過大（12MB）
  ]
};

console.log('照片選擇完成！');
console.log('選中的照片：', photoSelection.selected.map(p => `${p.original} → ${p.newName}`));
console.log('排除的照片：', photoSelection.excluded);

export { photoSelection };
