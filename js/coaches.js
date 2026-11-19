// ==========================================
// 教練姓名、預設資料、專屬費率設定與選單管理
// ==========================================
const DEFAULT_COACH_PROFILES = {
  '彭教練': { avatar: '🥇', tag: '基礎與戰術指導', bio: '專注基本功動作定型、單雙打輪轉觀念與穩定度訓練。' },
  '盧教練': { avatar: '⚡', tag: '敏捷步伐與控球', bio: '擅長場上步伐啟動、網前細膩手感與節奏變化指導。' },
  '陳教練': { avatar: '🔥', tag: '進階殺球與體能', bio: '強化後場進攻發力、連貫防守與實戰對抗訓練。' },
  '張教練': { avatar: '🎯', tag: '精準落點與球路', bio: '注重擊球品質、發接發搶攻與比賽心理素質培養。' },
  '方教練': { avatar: '🏸', tag: '青少年啟蒙培訓', bio: '耐心引導羽球興趣、協調性建立與標準握拍揮拍。' }
};

let coachList = JSON.parse(localStorage.getItem('badminton_coach_list_v2')) || [
  { name: '彭教練', rate1: 600, rate2: 400, ...DEFAULT_COACH_PROFILES['彭教練'] },
  { name: '盧教練', rate1: 600, rate2: 400, ...DEFAULT_COACH_PROFILES['盧教練'] },
  { name: '陳教練', rate1: 600, rate2: 400, ...DEFAULT_COACH_PROFILES['陳教練'] },
  { name: '張教練', rate1: 600, rate2: 400, ...DEFAULT_COACH_PROFILES['張教練'] },
  { name: '方教練', rate1: 600, rate2: 400, ...DEFAULT_COACH_PROFILES['方教練'] }
];

function normalizeCoachList(list) {
  return list.map(item => {
    if (typeof item === 'string') {
      const cleanName = toHalfWidth(item);
      const def = DEFAULT_COACH_PROFILES[cleanName] || { avatar: '🏸', tag: '專業教練', bio: '歡迎預約一對一或一對二個人練習。' };
      return { name: cleanName, rate1: 600, rate2: 400, ...def };
    }
    const cleanName = toHalfWidth(item.name);
    const def = DEFAULT_COACH_PROFILES[cleanName] || { avatar: '🏸', tag: '專業教練', bio: '歡迎預約一對一或一對二個人練習。' };
    return {
      name: cleanName,
      rate1: item.rate1 ?? 600,
      rate2: item.rate2 ?? 400,
      avatar: item.avatar || def.avatar,
      tag: item.tag || def.tag,
      bio: item.bio || def.bio
    };
  });
}

coachList = normalizeCoachList(coachList);
localStorage.setItem('badminton_coach_list_v2', JSON.stringify(coachList));

function saveCoachData() {
  coachList = normalizeCoachList(coachList);
  localStorage.setItem('badminton_coach_list_v2', JSON.stringify(coachList));
  if (window.db) {
    const coachDocRef = window.fsDoc(window.db, "settings", "coaches");
    window.fsSetDoc(coachDocRef, { list: coachList }).catch(err => console.error("教練資料儲存失敗:", err));
  }
}

function getCoachObj(coachName) {
  const clean = toHalfWidth(coachName);
  const found = coachList.find(c => toHalfWidth(c.name) === clean);
  return found || { name: clean || '無', rate1: 600, rate2: 400, avatar: '🏸', tag: '專業教練', bio: '' };
}

function setupCoachFirestoreListener() {
  if (!window.db) return;
  if (coachUnsubscribe) coachUnsubscribe();

  const coachDocRef = window.fsDoc(window.db, "settings", "coaches");
  coachUnsubscribe = window.fsOnSnapshot(coachDocRef, (docSnap) => {
    if (docSnap.exists() && Array.isArray(docSnap.data().list)) {
      coachList = normalizeCoachList(docSnap.data().list);
      localStorage.setItem('badminton_coach_list_v2', JSON.stringify(coachList));
      if (!coachManageModal.classList.contains('hidden')) {
        renderCoachManageList();
      }
      if (typeof renderPublicAnnouncementUI === 'function') renderPublicAnnouncementUI();
      if (typeof renderGrid === 'function') renderGrid();
    } else {
      saveCoachData();
    }
  }, (err) => {
    console.error("教練 Firestore 監聽失敗:", err);
  });
}

function renderCoachSelect(selectedCoach = '') {
  selectCoach.innerHTML = '<option value="">-- 無指定教練 --</option>';
  coachList.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.innerText = `${c.name} (1v1:$${c.rate1}/1v2:$${c.rate2})`;
    if (toHalfWidth(c.name) === toHalfWidth(selectedCoach)) opt.selected = true;
    selectCoach.appendChild(opt);
  });

  if (isAdminLoggedIn) {
    const addOpt = document.createElement('option');
    addOpt.value = '__ADD_NEW_COACH__';
    addOpt.innerText = '➕ 快速新增教練...';
    selectCoach.appendChild(addOpt);
  }
}

selectCoach.addEventListener('change', (e) => {
  if (e.target.value === '__ADD_NEW_COACH__') {
    const newCoachName = prompt('請輸入新教練的名稱：');
    if (newCoachName && toHalfWidth(newCoachName) !== '') {
      const trimmed = toHalfWidth(newCoachName);
      if (!coachList.some(c => toHalfWidth(c.name) === trimmed)) {
        coachList.push({
          name: trimmed,
          rate1: 600,
          rate2: 400,
          avatar: '🏸',
          tag: '專業教練',
          bio: '歡迎預約一對一或一對二個人練習。'
        });
        saveCoachData();
      }
      renderCoachSelect(trimmed);
    } else {
      selectCoach.value = '';
    }
  }
});

manageCoachesBtn.addEventListener('click', () => {
  renderCoachManageList();
  coachManageModal.classList.remove('hidden');
});

closeCoachModalBtn.addEventListener('click', () => coachManageModal.classList.add('hidden'));

function renderCoachManageList() {
  coachManageList.innerHTML = '';
  if (coachList.length === 0) {
    coachManageList.innerHTML = '<div class="text-xs text-slate-400 text-center py-2">目前無教練名單</div>';
    return;
  }
  coachList.forEach((coach, index) => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 bg-slate-50 p-2 rounded-md border border-slate-200';
    row.innerHTML = `
      <input type="text" value="${coach.name}" class="w-28 text-xs p-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold" id="coach-name-${index}">
      <div class="flex items-center gap-1 text-[11px] text-slate-600">
        <span>1對1:</span>
        <input type="number" value="${coach.rate1}" class="w-16 text-xs p-1.5 bg-white border border-slate-300 rounded font-mono text-right" id="coach-r1-${index}">
      </div>
      <div class="flex items-center gap-1 text-[11px] text-slate-600">
        <span>1對2:</span>
        <input type="number" value="${coach.rate2}" class="w-16 text-xs p-1.5 bg-white border border-slate-300 rounded font-mono text-right" id="coach-r2-${index}">
      </div>
      <button class="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded text-xs transition save-coach-edit ml-auto" data-index="${index}">儲存</button>
      <button class="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1.5 rounded text-xs transition delete-coach-btn" data-index="${index}">刪除</button>
    `;
    coachManageList.appendChild(row);
  });

  coachManageList.querySelectorAll('.save-coach-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.target.dataset.index;
      const nameVal = toHalfWidth(document.getElementById(`coach-name-${idx}`).value);
      const r1Val = parseFloat(document.getElementById(`coach-r1-${idx}`).value) || 0;
      const r2Val = parseFloat(document.getElementById(`coach-r2-${idx}`).value) || 0;
      if (nameVal) {
        coachList[idx] = {
          ...coachList[idx],
          name: nameVal,
          rate1: r1Val,
          rate2: r2Val
        };
        saveCoachData();
        alert('教練名稱與費率已同步更新至資料庫！');
        if (typeof renderGrid === 'function') renderGrid();
        renderCoachManageList();
      }
    });
  });

  coachManageList.querySelectorAll('.delete-coach-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.target.dataset.index;
      if (confirm(`確定要刪除教練「${coachList[idx].name}」嗎？`)) {
        coachList.splice(idx, 1);
        saveCoachData();
        renderCoachManageList();
        if (typeof renderGrid === 'function') renderGrid();
      }
    });
  });
}

addCoachSubmitBtn.addEventListener('click', () => {
  const nameVal = toHalfWidth(newCoachInput.value);
  const r1Val = parseFloat(newCoach1on1.value) || 600;
  const r2Val = parseFloat(newCoach1on2.value) || 400;

  if (nameVal && !coachList.some(c => toHalfWidth(c.name) === nameVal)) {
    coachList.push({
      name: nameVal,
      rate1: r1Val,
      rate2: r2Val,
      avatar: '🏸',
      tag: '專業教練',
      bio: '歡迎預約一對一或一對二個人練習。'
    });
    saveCoachData();
    newCoachInput.value = '';
    renderCoachManageList();
    if (typeof renderGrid === 'function') renderGrid();
    alert('新教練新增成功並已同步至資料庫！');
  } else {
    alert('請輸入有效或未重複的教練名稱！');
  }
});