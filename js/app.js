// ==========================================
// 預約表渲染、日期切換、學員/教練管理與系統啟動
// ==========================================
function updateAdminUIState() {
  if (isAdminLoggedIn) {
    clearDayBtn.classList.remove('hidden');
    nightToggleWrapper.classList.remove('hidden');
    nightToggleWrapper.classList.add('flex');
    hideDayToggleWrapper.classList.remove('hidden');
    hideDayToggleWrapper.classList.add('flex');
    manageStudentsBtn.classList.remove('hidden');
    manageCoachesBtn.classList.remove('hidden');
    openStatsBtn.classList.remove('hidden');
    openQuickParseBtn.classList.remove('hidden');
    openBoardManageBtn.classList.remove('hidden');
    adminLockIcon.className = 'fa-solid fa-lock-open';
    adminBtnText.innerText = '管理員登出';
    adminLoginBtn.className = 'bg-rose-600 hover:bg-rose-500 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition shadow-sm flex items-center gap-1 shrink-0';
  } else {
    clearDayBtn.classList.add('hidden');
    nightToggleWrapper.classList.add('hidden');
    hideDayToggleWrapper.classList.add('hidden');
    manageStudentsBtn.classList.add('hidden');
    manageCoachesBtn.classList.add('hidden');
    openStatsBtn.classList.add('hidden');
    openQuickParseBtn.classList.add('hidden');
    openBoardManageBtn.classList.add('hidden');
    autoGradePreview.classList.add('hidden');
    adminLockIcon.className = 'fa-solid fa-lock';
    adminBtnText.innerText = '管理員登入';
    adminLoginBtn.className = 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition shadow-sm flex items-center gap-1 shrink-0';
    selectedCells.clear();
    updateActionBar();
  }
  updateEventBannerDisplay();
}

function updateAutoGradePreview() {
  if (!isAdminLoggedIn || currentBookingType !== 'personal') {
    autoGradePreview.classList.add('hidden');
    return;
  }
  const rawName = toHalfWidth(inputStudent.value);
  if (!rawName) {
    autoGradePreview.classList.add('hidden');
    return;
  }

  const names = rawName.split('/').map(n => toHalfWidth(n)).filter(n => n !== '');
  const statusParts = names.map(n => {
    const g = getSingleStudentGrade(n, '');
    return g ? `${n}：${g}` : `${n}：未設定`;
  });

  const hasAnySet = names.some(n => getSingleStudentGrade(n, '') !== '');
  autoGradePreviewText.innerHTML = `<i class="fa-solid fa-graduation-cap mr-1"></i>總表年級自動帶入｜<b>${statusParts.join(' / ')}</b>`;
  autoGradePreview.className = `mt-1.5 text-[11px] px-2 py-1 rounded border flex items-center justify-between ${
    hasAnySet ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-amber-50 border-amber-200 text-amber-800'
  }`;
  autoGradePreview.classList.remove('hidden');
}

inputStudent.addEventListener('input', updateAutoGradePreview);

quickOpenGradeMasterBtn.addEventListener('click', () => {
  if (!isAdminLoggedIn) return;
  const rawName = toHalfWidth(inputStudent.value);
  if (rawName) {
    const firstUnset = rawName.split('/').map(n => toHalfWidth(n)).find(n => n && !getSingleStudentGrade(n, ''));
    newStudentGradeName.value = firstUnset || rawName.split('/')[0].trim();
  }
  renderStudentGradeList();
  studentGradeModal.classList.remove('hidden');
});

manageStudentsBtn.addEventListener('click', () => {
  if (!isAdminLoggedIn) return;
  studentGradeSearch.value = '';
  studentGradeFilter.value = 'ALL';
  renderStudentGradeList();
  studentGradeModal.classList.remove('hidden');
});

closeStudentGradeModalBtn.addEventListener('click', () => {
  studentGradeModal.classList.add('hidden');
  updateAutoGradePreview();
});

studentGradeSearch.addEventListener('input', renderStudentGradeList);
studentGradeFilter.addEventListener('change', renderStudentGradeList);

function renderStudentGradeList() {
  studentGradeList.innerHTML = '';
  const keyword = toHalfWidth(studentGradeSearch.value).toLowerCase();
  const filterGrade = studentGradeFilter.value;

  const entries = Object.entries(studentGradeMap)
    .filter(([name, grade]) => {
      if (keyword && !toHalfWidth(name).toLowerCase().includes(keyword)) return false;
      if (filterGrade === 'UNSET') return !grade;
      if (filterGrade !== 'ALL') return grade === filterGrade;
      return true;
    })
    .sort((a, b) => {
      const rankA = getGradeRank(a[1]);
      const rankB = getGradeRank(b[1]);
      if (rankA !== rankB) return rankA - rankB;
      return a[0].localeCompare(b[0], 'zh-Hant');
    });

  if (entries.length === 0) {
    studentGradeList.innerHTML = '<div class="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded border border-dashed">目前無符合條件的學員資料</div>';
    return;
  }

  entries.forEach(([name, currentGrade]) => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-md border border-slate-200 hover:bg-teal-50/40 transition';

    let optionsHtml = `<option value="" ${!currentGrade ? 'selected' : ''}>-- 未設定年級 --</option>`;
    GRADE_OPTIONS.forEach(g => {
      optionsHtml += `<option value="${g}" ${currentGrade === g ? 'selected' : ''}>${g}</option>`;
    });

    row.innerHTML = `
      <div class="flex items-center gap-2 min-w-0">
        <span class="font-bold text-xs text-slate-800 truncate">${name}</span>
        ${!currentGrade ? '<span class="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">待設定</span>' : ''}
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <select class="text-xs p-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium student-grade-row-select" data-name="${name}">
          ${optionsHtml}
        </select>
        <button type="button" class="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1.5 rounded text-xs transition delete-student-grade-btn" data-name="${name}">刪除</button>
      </div>
    `;
    studentGradeList.appendChild(row);
  });

  studentGradeList.querySelectorAll('.student-grade-row-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const sName = e.target.dataset.name;
      studentGradeMap[sName] = e.target.value;
      saveStudentGradeData();
      renderStudentGradeList();
    });
  });

  studentGradeList.querySelectorAll('.delete-student-grade-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sName = e.target.dataset.name;
      if (confirm(`確定要從年級總表移除學員「${sName}」嗎？`)) {
        delete studentGradeMap[sName];
        saveStudentGradeData();
        renderStudentGradeList();
      }
    });
  });
}

addStudentGradeBtn.addEventListener('click', () => {
  const nameVal = toHalfWidth(newStudentGradeName.value);
  const gradeVal = newStudentGradeSelect.value;
  if (!nameVal) {
    alert('請輸入學員姓名！');
    return;
  }
  if (nameVal.includes('/')) {
    alert('總表請逐一輸入單一學員姓名（勿包含斜線 /）！');
    return;
  }
  studentGradeMap[nameVal] = gradeVal;
  saveStudentGradeData();
  newStudentGradeName.value = '';
  renderStudentGradeList();
});

newStudentGradeName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addStudentGradeBtn.click();
});

importStudentsFromBookingsBtn.addEventListener('click', () => {
  let addedCount = 0;
  Object.values(bookings).forEach(dayData => {
    if (!dayData || !dayData.slots) return;
    Object.values(dayData.slots).forEach(slot => {
      if (slot.type === 'personal' && slot.student) {
        const names = toHalfWidth(slot.student).split('/').map(n => toHalfWidth(n)).filter(n => n !== '');
        names.forEach(n => {
          if (!Object.prototype.hasOwnProperty.call(studentGradeMap, n)) {
            studentGradeMap[n] = slot.grade || '';
            addedCount++;
          } else if (!studentGradeMap[n] && slot.grade) {
            studentGradeMap[n] = slot.grade;
            addedCount++;
          }
        });
      }
    });
  });

  if (addedCount > 0) {
    saveStudentGradeData();
    renderStudentGradeList();
    alert(`已成功從預約紀錄匯入 ${addedCount} 筆學員資料至總表！`);
  } else {
    alert('目前載入的預約紀錄中，所有學員皆已在總表內！');
  }
});

function updateEventBannerDisplay() {
  const val = (bookings[currentDate] && bookings[currentDate].eventTitle) || '';
  dayEventTitleInput.value = val;

  if (val.trim() !== '') {
    marqueeText.innerText = val;
    dayEventTitleInput.classList.add('hidden');
    dayEventMarquee.classList.remove('hidden');
  } else {
    dayEventTitleInput.classList.remove('hidden');
    dayEventMarquee.classList.add('hidden');
  }

  if (isAdminLoggedIn) {
    dayEventTitleInput.removeAttribute('readonly');
    dayEventTitleInput.classList.remove('cursor-not-allowed');
  } else {
    dayEventTitleInput.setAttribute('readonly', 'readonly');
    dayEventTitleInput.classList.add('cursor-not-allowed');
  }
}

marqueeContainer.addEventListener('click', () => {
  if (!isAdminLoggedIn) return;
  dayEventMarquee.classList.add('hidden');
  dayEventTitleInput.classList.remove('hidden');
  dayEventTitleInput.focus();
});

dayEventTitleInput.addEventListener('blur', () => {
  if (!isAdminLoggedIn) return;
  if (!bookings[currentDate]) {
    bookings[currentDate] = { eventTitle: '', nightOnly: false, hideAllSlots: false, slots: {} };
  }
  bookings[currentDate].eventTitle = dayEventTitleInput.value;
  saveData();
  updateEventBannerDisplay();
});

dayEventTitleInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    dayEventTitleInput.blur();
  }
});

hideDayCheckbox.addEventListener('change', (e) => {
  if (!isAdminLoggedIn) return;
  if (!bookings[currentDate]) {
    bookings[currentDate] = { eventTitle: '', nightOnly: false, hideAllSlots: false, slots: {} };
  }
  bookings[currentDate].hideAllSlots = e.target.checked;
  saveData();
  renderGrid();
});

function getActiveTimeSlots() {
  const isNightOnly = bookings[currentDate] && bookings[currentDate].nightOnly;
  if (isNightOnly) {
    return [
      { time: '18:00 ~ 19:00', originalIdx: 11 },
      { time: '19:00 ~ 20:00', originalIdx: 12 },
      { time: '20:00 ~ 21:00', originalIdx: 13 }
    ];
  } else {
    return ALL_TIME_SLOTS.map((time, idx) => ({ time, originalIdx: idx }));
  }
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

adminLoginBtn.addEventListener('click', () => {
  if (isAdminLoggedIn) {
    if (confirm('確定要登出管理員身分嗎？登出後將切換為唯讀檢視模式。')) {
      isAdminLoggedIn = false;
      updateAdminUIState();
      renderGrid();
    }
  } else {
    adminPasswordInput.value = '';
    loginModal.classList.remove('hidden');
    adminPasswordInput.focus();
  }
});

submitLoginBtn.addEventListener('click', async () => {
  const inputPwd = adminPasswordInput.value;
  if (!window.db) {
    alert('尚未連線至資料庫，無法進行遠端密碼驗證！');
    return;
  }

  try {
    const settingsRef = window.fsDoc(window.db, "settings", "auth");
    const docSnap = await window.fsGetDoc(settingsRef);

    if (!docSnap.exists()) {
      alert('資料庫中尚未設定管理員密碼，請先於 Firestore 建立 settings/auth 文件並設定 adminPassword 欄位！');
      return;
    }

    const correctPwd = docSnap.data().adminPassword;
    if (inputPwd === correctPwd) {
      isAdminLoggedIn = true;
      loginModal.classList.add('hidden');
      updateAdminUIState();
      renderGrid();
      alert('管理員登入成功！已解鎖預約與修改權限。');
    } else {
      alert('密碼錯誤！');
    }
  } catch (e) {
    alert('連線資料庫驗證密碼發生錯誤，請檢查網路或資料庫權限！');
  }
});

closeLoginBtn.addEventListener('click', () => loginModal.classList.add('hidden'));

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
        renderGrid();
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
        renderGrid();
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
    renderGrid();
    alert('新教練新增成功並已同步至資料庫！');
  } else {
    alert('請輸入有效或未重複的教練名稱！');
  }
});

nightOnlyCheckbox.addEventListener('change', (e) => {
  if (!isAdminLoggedIn) return;
  if (!bookings[currentDate]) {
    bookings[currentDate] = { eventTitle: '', nightOnly: false, hideAllSlots: false, slots: {} };
  }
  bookings[currentDate].nightOnly = e.target.checked;
  saveData();
  updateViewModeUI();
  renderGrid();
});

function updateViewModeUI() {
  const isNightOnly = bookings[currentDate] && bookings[currentDate].nightOnly;
  if (isMobileView) {
    modeIcon.className = 'fa-solid fa-desktop';
    modeText.innerText = '切換電腦模式';
    modeBadge.innerText = '手機清單模式';
    modeBadge.className = 'text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-medium border border-amber-500/40 shrink-0';
    mainContainer.className = 'bg-transparent rounded-none shadow-none border-none overflow-visible w-full';
    gridTable.className = 'block space-y-3 w-full';
  } else {
    modeIcon.className = 'fa-solid fa-mobile-screen-button';
    modeText.innerText = '切換手機模式';
    modeBadge.innerText = 'Excel 模式';
    modeBadge.className = 'text-[10px] bg-emerald-700/80 text-emerald-200 px-1.5 py-0.5 rounded font-normal border border-emerald-600 shrink-0';
    mainContainer.className = 'bg-white rounded-lg shadow-md border border-slate-300 overflow-x-auto flex-1 flex flex-col w-full';
    gridTable.className = isNightOnly
      ? 'divide-y divide-slate-200 flex-1 flex flex-col w-full min-w-0'
      : 'divide-y divide-slate-200 flex-1 flex flex-col w-full min-w-[1420px] lg:min-w-0';
  }
}

toggleViewModeBtn.addEventListener('click', () => {
  isMobileView = !isMobileView;
  userPinnedViewMode = true;
  localStorage.setItem('badminton_view_mode_pinned', 'true');
  localStorage.setItem('badminton_view_mode', isMobileView ? 'mobile' : 'desktop');
  updateViewModeUI();
  renderGrid();
});

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!userPinnedViewMode) {
      const shouldBeMobile = window.innerWidth < 768;
      if (shouldBeMobile !== isMobileView) {
        isMobileView = shouldBeMobile;
        updateViewModeUI();
        renderGrid();
      }
    }
  }, 150);
});

function renderDateTabs() {
  dateTabsBar.innerHTML = '';
  const curr = new Date(currentDate);
  for (let i = -3; i <= 3; i++) {
    const d = new Date(curr);
    d.setDate(d.getDate() + i);
    const dStr = d.toISOString().split('T')[0];
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const label = `${d.getMonth() + 1}/${d.getDate()} (${weekDays[d.getDay()]})`;
    const isActive = dStr === currentDate;

    const tab = document.createElement('button');
    tab.className = `px-3 py-1 rounded-t-md text-xs transition border-t border-x shrink-0 ${
      isActive
        ? 'bg-[#f7ff00] text-slate-950 border-amber-500 font-black shadow-md ring-2 ring-amber-400/90 scale-[1.03]'
        : 'bg-slate-200 hover:bg-slate-100 text-slate-600 font-medium border-transparent'
    }`;
    if (isActive) {
      tab.style.backgroundColor = '#f7ff00';
    }
    tab.innerText = label;
    tab.onclick = () => {
      currentDate = dStr;
      datePicker.value = currentDate;
      selectedCells.clear();
      setupFirestoreListener();
      renderDateTabs();
      updateActionBar();
    };
    dateTabsBar.appendChild(tab);
  }
}

function formatStudentNamesHtml(rawStudent) {
  const text = toHalfWidth(rawStudent);
  if (!text) return '';
  if (text.includes('/')) {
    const parts = text.split('/').map(s => toHalfWidth(s)).filter(Boolean);
    return parts.map((name, i) => i < parts.length - 1 ? `${name} /` : name).join('<br>');
  }
  return text;
}

function renderGrid() {
  gridTable.innerHTML = '';
  const dayData = bookings[currentDate] || { eventTitle: '', nightOnly: false, hideAllSlots: false, slots: {} };
  updateEventBannerDisplay();

  const isNightOnly = !!dayData.nightOnly;
  const isHiddenForUser = !!dayData.hideAllSlots && !isAdminLoggedIn;

  if (isHiddenForUser) {
    gridTable.innerHTML = `
      <div class="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50">
        <div class="bg-rose-100 p-4 rounded-full text-rose-600 mb-3 text-2xl">
          <i class="fa-solid fa-eye-slash"></i>
        </div>
        <h3 class="text-base font-bold text-slate-700 mb-1">今日時段暫不開放檢視與預約</h3>
        <p class="text-xs text-slate-500">管理員已暫時隱藏此日期的預約時段，請切換其他日期或稍後再試。</p>
      </div>
    `;
    return;
  }

  const activeSlots = getActiveTimeSlots();

  if (isMobileView) {
    COURTS.forEach((courtName, cIdx) => {
      const courtCard = document.createElement('div');
      courtCard.className = 'mb-4 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden';
      let subTitleInfo = isNightOnly ? '18:00 ~ 21:00 時段' : '07:00 ~ 21:00 時段';
      let cardHeaderHtml = `
        <div class="bg-emerald-900 text-white font-bold px-3 py-2 text-xs flex items-center justify-between">
          <span><i class="fa-solid fa-vector-square mr-1.5 text-amber-400"></i> ${courtName}</span>
          <span class="text-[10px] text-emerald-200 font-normal">${subTitleInfo}</span>
        </div>
        <div class="grid grid-cols-1 divide-y divide-slate-100">
      `;

      let cardSlotsHtml = '';
      activeSlots.forEach(({ time, originalIdx }) => {
        const slotKey = `${cIdx}_${originalIdx}`;
        const isSelected = selectedCells.has(slotKey);
        const booking = dayData.slots ? dayData.slots[slotKey] : null;

        let slotBg = 'bg-white hover:bg-slate-50';
        let statusText = '<span class="text-slate-400 text-xs">可預約</span>';

        if (booking) {
          if (booking.type === 'club') {
            slotBg = 'bg-amber-50 hover:bg-amber-100/80';
            statusText = `<span class="text-xs font-bold text-amber-800"><i class="fa-solid fa-users mr-1"></i>社團包場</span>`;
          } else if (booking.type === 'other') {
            slotBg = 'bg-purple-50 hover:bg-purple-100/80';
            statusText = `
              <div class="text-right break-words whitespace-normal leading-snug">
                <span class="text-xs font-bold text-purple-900"><i class="fa-solid fa-bookmark mr-1 text-purple-600"></i>${booking.otherNote || '其他用途'}</span>
              </div>
            `;
          } else {
            slotBg = 'bg-emerald-50 hover:bg-emerald-100/80';
            const coachStr = booking.coach ? `<span class="text-emerald-800 font-normal ml-1 inline-block">(${booking.coach})</span>` : '';
            statusText = `
              <div class="text-right break-words whitespace-normal leading-snug">
                <span class="text-xs font-bold text-emerald-900">${booking.student}</span>${coachStr}
                ${booking.timeNote ? `<div class="text-[11px] text-emerald-700 font-mono mt-0.5">${booking.timeNote}</div>` : ''}
              </div>
            `;
          }
        }

        if (isSelected) {
          slotBg = 'bg-emerald-200/90 border-l-4 border-emerald-600';
        }

        cardSlotsHtml += `
          <div class="px-3 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition ${slotBg}" data-key="${slotKey}">
            <div class="flex items-center gap-1.5 shrink-0">
              <div class="text-xs font-mono font-semibold text-slate-600">${time}</div>
              ${isSelected ? `<i class="fa-solid fa-circle-check text-emerald-700 text-xs"></i>` : ''}
            </div>
            <div class="flex-1 min-w-0 flex justify-end">${statusText}</div>
          </div>
        `;
      });

      courtCard.innerHTML = cardHeaderHtml + cardSlotsHtml + `</div>`;
      gridTable.appendChild(courtCard);
    });
  } else {
    const headerRow = document.createElement('div');
    headerRow.className = 'flex bg-slate-100 text-slate-700 font-semibold border-b border-slate-300 sticky-header';

    let headerHtml = `<div class="w-16 sm:w-24 xl:w-28 p-1.5 sm:p-2 text-center bg-slate-200 border-r border-slate-300 shrink-0 sticky-col font-black flex items-center justify-center text-xs sm:text-sm text-slate-800">場地 / 時間</div>`;
    activeSlots.forEach(({ time }) => {
      const shortTime = time.replace(' ~ ', '-');
      headerHtml += `<div class="flex-1 min-w-[96px] lg:min-w-0 p-1.5 sm:p-2 text-center border-r border-slate-200 text-xs sm:text-xs xl:text-sm font-black font-mono leading-tight text-slate-800 tracking-tight flex items-center justify-center">${shortTime}</div>`;
    });
    headerRow.innerHTML = headerHtml;
    gridTable.appendChild(headerRow);

    COURTS.forEach((courtName, cIdx) => {
      const row = document.createElement('div');
      row.className = 'flex flex-1 border-b border-slate-200 hover:bg-slate-50/50 transition min-h-[68px]';

      let rowHtml = `<div class="w-16 sm:w-24 xl:w-28 p-1.5 sm:p-2 text-center bg-slate-100 font-black text-slate-800 border-r border-slate-300 shrink-0 sticky-col flex items-center justify-center text-xs sm:text-sm xl:text-base">${courtName}</div>`;

      activeSlots.forEach(({ time, originalIdx }) => {
        const slotKey = `${cIdx}_${originalIdx}`;
        const isSelected = selectedCells.has(slotKey);
        const booking = dayData.slots ? dayData.slots[slotKey] : null;

        let cellClass = 'bg-white hover:bg-slate-100 cursor-pointer';
        let contentHtml = '';

        if (booking) {
          if (booking.type === 'club') {
            cellClass = 'bg-amber-100/90 hover:bg-amber-200/90 border-amber-300 text-amber-900 font-bold';
            contentHtml = `<div class="text-xs leading-snug break-words whitespace-normal">社團包場</div>`;
          } else if (booking.type === 'other') {
            cellClass = 'bg-purple-100/90 hover:bg-purple-200/90 border-purple-300 text-purple-900 font-bold';
            contentHtml = `
              <div class="text-xs leading-snug break-words whitespace-normal w-full">${booking.otherNote || '其他用途'}</div>
            `;
          } else {
            cellClass = 'bg-emerald-100/90 hover:bg-emerald-200/90 border-emerald-300 text-emerald-900';
            const formattedStudent = formatStudentNamesHtml(booking.student);
            const coachStr = booking.coach ? `<span class="text-[11px] xl:text-xs block opacity-90 text-emerald-800 font-normal leading-tight mt-0.5 break-words whitespace-normal">(${booking.coach})</span>` : '';
            contentHtml = `
              <div class="font-bold text-xs xl:text-sm leading-snug break-words whitespace-normal w-full">${formattedStudent}</div>
              ${coachStr}
              ${booking.timeNote ? `<div class="text-[10px] text-emerald-800 font-mono leading-tight mt-0.5 break-words whitespace-normal">${booking.timeNote}</div>` : ''}
            `;
          }
        } else {
          cellClass = 'bg-white hover:bg-slate-100 cursor-pointer';
          contentHtml = `<div class="text-xs text-slate-400 font-medium select-none">可預約</div>`;
        }

        if (isSelected) {
          cellClass += ' ring-2 ring-emerald-600 ring-inset bg-emerald-200/80';
        }

        rowHtml += `
          <div class="flex-1 min-w-[96px] lg:min-w-0 px-1.5 py-2 border-r border-slate-200 flex flex-col justify-center items-center text-center transition relative ${cellClass}" data-key="${slotKey}">
            ${contentHtml}
            ${isSelected ? `<i class="fa-solid fa-circle-check absolute top-1 right-1 text-emerald-700 text-[10px]"></i>` : ''}
          </div>
        `;
      });

      row.innerHTML = rowHtml;
      gridTable.appendChild(row);
    });
  }

  gridTable.querySelectorAll('[data-key]').forEach(cell => {
    cell.addEventListener('click', () => {
      const key = cell.dataset.key;
      const daySlots = (bookings[currentDate] && bookings[currentDate].slots) || {};

      if (daySlots[key]) {
        openEditModal(key, daySlots[key]);
      } else {
        if (!isAdminLoggedIn) {
          alert('非管理者僅供檢視，請先登入管理員身分進行預約操作！');
          return;
        }
        if (selectedCells.has(key)) {
          selectedCells.delete(key);
        } else {
          selectedCells.add(key);
        }
        updateActionBar();
        renderGrid();
      }
    });
  });
}

function updateActionBar() {
  if (isAdminLoggedIn && selectedCells.size > 0) {
    selectedCountEl.innerText = selectedCells.size;
    actionBar.classList.remove('translate-y-24', 'opacity-0');
  } else {
    actionBar.classList.add('translate-y-24', 'opacity-0');
  }
}

function renderAll() {
  datePicker.value = currentDate;
  updateAdminUIState();
  updateViewModeUI();
  renderDateTabs();
  renderPublicAnnouncementUI();
  startCountdownLoop();
  setupFirestoreListener();
  updateActionBar();
}

function openBatchModal() {
  if (!isAdminLoggedIn) return;
  currentEditKey = null;
  deleteBookingBtn.classList.add('hidden');
  saveBookingBtn.classList.remove('hidden');
  document.getElementById('modal-title').innerText = '新增批次預約';
  inputStudent.value = '';
  inputOtherNote.value = '';
  inputStudent.removeAttribute('disabled');
  selectCoach.removeAttribute('disabled');
  inputTimeNote.removeAttribute('disabled');
  inputOtherNote.removeAttribute('disabled');
  typePersonalBtn.removeAttribute('disabled');
  typeClubBtn.removeAttribute('disabled');
  typeOtherBtn.removeAttribute('disabled');

  renderCoachSelect('');
  inputTimeNote.value = '';
  setBookingType('personal');
  updateAutoGradePreview();

  let summaryHtml = '<div class="font-bold mb-1">已選擇以下時段格：</div>';
  selectedCells.forEach(key => {
    const [cIdx, tIdx] = key.split('_').map(Number);
    summaryHtml += `<div>• ${COURTS[cIdx]} - ${ALL_TIME_SLOTS[tIdx]}</div>`;
  });
  modalSlotsSummary.innerHTML = summaryHtml;
  bookingModal.classList.remove('hidden');
}

function openEditModal(key, data) {
  currentEditKey = key;
  const [cIdx, tIdx] = key.split('_').map(Number);
  modalSlotsSummary.innerHTML = `<div class="font-bold">${COURTS[cIdx]} - ${ALL_TIME_SLOTS[tIdx]}</div>`;
  setBookingType(data.type || 'personal');

  inputStudent.value = data.student || '';
  inputOtherNote.value = data.otherNote || '';
  renderCoachSelect(data.coach || '');
  inputTimeNote.value = data.timeNote || '';

  if (isAdminLoggedIn) {
    document.getElementById('modal-title').innerText = '編輯/取消預約';
    deleteBookingBtn.classList.remove('hidden');
    saveBookingBtn.classList.remove('hidden');
    cancelModalAction.innerText = '取消';

    inputStudent.removeAttribute('disabled');
    selectCoach.removeAttribute('disabled');
    inputTimeNote.removeAttribute('disabled');
    inputOtherNote.removeAttribute('disabled');
    typePersonalBtn.removeAttribute('disabled');
    typeClubBtn.removeAttribute('disabled');
    typeOtherBtn.removeAttribute('disabled');
  } else {
    document.getElementById('modal-title').innerText = '預約詳情 (唯讀)';
    deleteBookingBtn.classList.add('hidden');
    saveBookingBtn.classList.add('hidden');
    cancelModalAction.innerText = '關閉';

    inputStudent.setAttribute('disabled', 'disabled');
    selectCoach.setAttribute('disabled', 'disabled');
    inputTimeNote.setAttribute('disabled', 'disabled');
    inputOtherNote.setAttribute('disabled', 'disabled');
    typePersonalBtn.setAttribute('disabled', 'disabled');
    typeClubBtn.setAttribute('disabled', 'disabled');
    typeOtherBtn.setAttribute('disabled', 'disabled');
  }

  updateAutoGradePreview();
  bookingModal.classList.remove('hidden');
}

function setBookingType(type) {
  currentBookingType = type;

  typePersonalBtn.className = 'py-1.5 px-2 border border-slate-300 bg-white text-slate-600 rounded-lg text-xs font-medium text-center transition hover:bg-slate-50';
  typeClubBtn.className = 'py-1.5 px-2 border border-slate-300 bg-white text-slate-600 rounded-lg text-xs font-medium text-center transition hover:bg-slate-50';
  typeOtherBtn.className = 'py-1.5 px-2 border border-slate-300 bg-white text-slate-600 rounded-lg text-xs font-medium text-center transition hover:bg-slate-50';

  personalFields.classList.add('hidden');
  clubFields.classList.add('hidden');
  otherFields.classList.add('hidden');

  if (type === 'personal') {
    typePersonalBtn.className = 'py-1.5 px-2 border border-emerald-600 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium text-center transition';
    personalFields.classList.remove('hidden');
  } else if (type === 'club') {
    typeClubBtn.className = 'py-1.5 px-2 border border-amber-600 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium text-center transition';
    clubFields.classList.remove('hidden');
  } else if (type === 'other') {
    typeOtherBtn.className = 'py-1.5 px-2 border border-purple-600 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium text-center transition';
    otherFields.classList.remove('hidden');
  }
  updateAutoGradePreview();
}

saveBookingBtn.addEventListener('click', () => {
  if (!isAdminLoggedIn) return;
  if (!bookings[currentDate]) {
    bookings[currentDate] = { eventTitle: dayEventTitleInput.value, nightOnly: false, hideAllSlots: false, slots: {} };
  }

  let studentVal = '';
  if (currentBookingType === 'personal') studentVal = toHalfWidth(inputStudent.value);
  else if (currentBookingType === 'club') studentVal = '社團包場';
  else if (currentBookingType === 'other') studentVal = toHalfWidth(inputOtherNote.value) || '其他用途';

  const autoGrade = currentBookingType === 'personal' ? getBookingGradeFromMaster(studentVal, '') : '';

  const bookingPayload = {
    type: currentBookingType,
    student: studentVal,
    grade: autoGrade,
    coach: currentBookingType === 'personal' ? toHalfWidth(selectCoach.value) : '',
    timeNote: currentBookingType === 'personal' ? toHalfWidth(inputTimeNote.value) : '',
    otherNote: currentBookingType === 'other' ? toHalfWidth(inputOtherNote.value) : ''
  };

  if (currentBookingType === 'personal' && !bookingPayload.student) {
    alert('請填寫學員姓名！');
    return;
  }
  if (currentBookingType === 'other' && !bookingPayload.otherNote) {
    alert('請填寫其他用途備註！');
    return;
  }

  if (currentEditKey) {
    bookings[currentDate].slots[currentEditKey] = bookingPayload;
  } else {
    selectedCells.forEach(key => {
      bookings[currentDate].slots[key] = bookingPayload;
    });
    selectedCells.clear();
  }
  saveData();
  bookingModal.classList.add('hidden');
  renderGrid();
  updateActionBar();
});

deleteBookingBtn.addEventListener('click', () => {
  if (!isAdminLoggedIn) return;
  if (currentEditKey && bookings[currentDate] && bookings[currentDate].slots) {
    delete bookings[currentDate].slots[currentEditKey];
    saveData();
    bookingModal.classList.add('hidden');
    renderGrid();
  }
});

datePicker.addEventListener('change', (e) => {
  currentDate = e.target.value;
  selectedCells.clear();
  renderDateTabs();
  setupFirestoreListener();
  updateActionBar();
});

prevDayBtn.addEventListener('click', () => {
  const d = new Date(currentDate);
  d.setDate(d.getDate() - 1);
  currentDate = d.toISOString().split('T')[0];
  selectedCells.clear();
  renderDateTabs();
  setupFirestoreListener();
  updateActionBar();
});

nextDayBtn.addEventListener('click', () => {
  const d = new Date(currentDate);
  d.setDate(d.getDate() + 1);
  currentDate = d.toISOString().split('T')[0];
  selectedCells.clear();
  renderDateTabs();
  setupFirestoreListener();
  updateActionBar();
});

todayBtn.addEventListener('click', () => {
  currentDate = new Date().toISOString().split('T')[0];
  selectedCells.clear();
  renderDateTabs();
  setupFirestoreListener();
  updateActionBar();
});

clearDayBtn.addEventListener('click', () => {
  if (!isAdminLoggedIn) return;
  if (confirm('確定要清空當日所有的預約紀錄嗎？')) {
    if (bookings[currentDate]) {
      bookings[currentDate].slots = {};
      saveData();
      renderGrid();
    }
  }
});

cancelSelectionBtn.addEventListener('click', () => {
  selectedCells.clear();
  renderGrid();
  updateActionBar();
});

openBookingModalBtn.addEventListener('click', openBatchModal);
closeModalBtn.addEventListener('click', () => bookingModal.classList.add('hidden'));
cancelModalAction.addEventListener('click', () => bookingModal.classList.add('hidden'));

typePersonalBtn.addEventListener('click', () => { if (isAdminLoggedIn) setBookingType('personal'); });
typeClubBtn.addEventListener('click', () => { if (isAdminLoggedIn) setBookingType('club'); });
typeOtherBtn.addEventListener('click', () => { if (isAdminLoggedIn) setBookingType('other'); });

// 系統啟動監聽
window.addEventListener('firebase-init', () => { renderAll(); });
setTimeout(() => {
  if (!window.db) {
    loadLocalStorageFallback();
    renderAll();
    maybeAutoOpenAnnouncementModal();
  }
}, 500);