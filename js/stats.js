// ==========================================
// 練習時間統計報表與 Excel (.xlsx) 匯出模組
// ==========================================
function getDateRangeArray(start, end) {
  let arr = [];
  let dt = new Date(start);
  let endDt = new Date(end);
  while (dt <= endDt) {
    arr.push(dt.toISOString().split('T')[0]);
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
}

function getStatsTargetDates() {
  const range = statsRangeSelect.value;
  if (range === 'current') {
    const singleD = statsSingleDateInput.value || currentDate;
    return [singleD];
  } else {
    const start = statsStartDateInput.value;
    const end = statsEndDateInput.value;
    if (start && end && start <= end) {
      return getDateRangeArray(start, end);
    }
    return [];
  }
}

function syncStatsRangeVisibility() {
  const range = statsRangeSelect.value;
  if (range === 'current') {
    singleDateSwitcher.classList.remove('hidden');
    customDateRangeWrapper.classList.add('hidden');
  } else {
    singleDateSwitcher.classList.add('hidden');
    customDateRangeWrapper.classList.remove('hidden');
  }
}

openStatsBtn.addEventListener('click', async () => {
  if (!isAdminLoggedIn) return;
  statsSingleDateInput.value = currentDate;
  if (!statsStartDateInput.value) statsStartDateInput.value = currentDate;
  if (!statsEndDateInput.value) statsEndDateInput.value = currentDate;

  syncStatsRangeVisibility();

  const targetDates = getStatsTargetDates();
  if (targetDates.length > 0) {
    statsLoadingOverlay.classList.remove('hidden');
    await fetchMissingDatesData(targetDates);
    statsLoadingOverlay.classList.add('hidden');
  }

  populateStatsTargetSelect();
  renderStatsData();
  statsModal.classList.remove('hidden');
});

closeStatsModalBtn.addEventListener('click', () => statsModal.classList.add('hidden'));
closeStatsBtnBottom.addEventListener('click', () => statsModal.classList.add('hidden'));

statsTypeSelect.addEventListener('change', () => {
  populateStatsTargetSelect();
  renderStatsData();
});

statsTargetSelect.addEventListener('change', renderStatsData);

async function handleStatsDateOrRangeChange() {
  syncStatsRangeVisibility();
  const targetDates = getStatsTargetDates();
  if (targetDates.length > 0) {
    statsLoadingOverlay.classList.remove('hidden');
    await fetchMissingDatesData(targetDates);
    statsLoadingOverlay.classList.add('hidden');
  }
  populateStatsTargetSelect();
  renderStatsData();
}

statsRangeSelect.addEventListener('change', handleStatsDateOrRangeChange);
statsSingleDateInput.addEventListener('change', handleStatsDateOrRangeChange);
statsStartDateInput.addEventListener('change', handleStatsDateOrRangeChange);
statsEndDateInput.addEventListener('change', handleStatsDateOrRangeChange);

statsPrevDayBtn.addEventListener('click', () => {
  const baseStr = statsSingleDateInput.value || currentDate;
  const d = new Date(baseStr);
  d.setDate(d.getDate() - 1);
  statsSingleDateInput.value = d.toISOString().split('T')[0];
  handleStatsDateOrRangeChange();
});

statsNextDayBtn.addEventListener('click', () => {
  const baseStr = statsSingleDateInput.value || currentDate;
  const d = new Date(baseStr);
  d.setDate(d.getDate() + 1);
  statsSingleDateInput.value = d.toISOString().split('T')[0];
  handleStatsDateOrRangeChange();
});

function populateStatsTargetSelect() {
  const type = statsTypeSelect.value;
  const prevSelected = statsTargetSelect.value;
  statsTargetSelect.innerHTML = '';

  if (type === 'coach') {
    coachList.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.innerText = c.name;
      if (c.name === prevSelected) opt.selected = true;
      statsTargetSelect.appendChild(opt);
    });
  } else {
    const studentSet = new Set();
    const targetDates = getStatsTargetDates();

    targetDates.forEach(date => {
      const dayData = bookings[date];
      if (!dayData || !dayData.slots) return;
      Object.values(dayData.slots).forEach(slot => {
        if (slot.type === 'personal' && slot.student) {
          const names = toHalfWidth(slot.student).split('/').map(n => toHalfWidth(n)).filter(n => n !== '');
          names.forEach(n => studentSet.add(n));
        }
      });
    });

    if (studentSet.size === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.innerText = '-- 此日期/區間無學員紀錄 --';
      statsTargetSelect.appendChild(opt);
    } else {
      studentSet.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.innerText = s;
        if (s === prevSelected) opt.selected = true;
        statsTargetSelect.appendChild(opt);
      });
    }
  }
}

async function renderStatsData() {
  const type = statsTypeSelect.value;
  const target = statsTargetSelect.value;
  const targetDates = getStatsTargetDates();

  statsTargetLabel.innerText = target || '(無選項)';
  statsTableBody.innerHTML = '';

  if (!target) {
    statsCount1on1.innerText = '0';
    statsCount1on2.innerText = '0';
    statsTotalFee.innerText = '$0';
    displayRate1on1.innerText = '600';
    displayRate1on2.innerText = '400';
    statsTableBody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-slate-400">目前無資料</td></tr>';
    return;
  }

  if (targetDates.length > 0) {
    statsLoadingOverlay.classList.remove('hidden');
    await fetchMissingDatesData(targetDates);
    statsLoadingOverlay.classList.add('hidden');
  }

  let matchedSlots = [];
  let count1on1 = 0;
  let count1on2 = 0;
  let totalCalculatedFee = 0;

  targetDates.forEach(dStr => {
    const dayData = bookings[dStr];
    if (!dayData || !dayData.slots) return;
    const daySlots = dayData.slots;
    Object.keys(daySlots).forEach(sKey => {
      const slot = daySlots[sKey];
      if (slot.type === 'personal' && slot.student) {
        const rawStudentStr = toHalfWidth(slot.student);
        const hasSlash = rawStudentStr.includes('/');
        const studentList = hasSlash ? rawStudentStr.split('/').map(n => toHalfWidth(n)).filter(n => n !== '') : [rawStudentStr];
        const noteStr = slot.timeNote || '';

        const is1on2 = hasSlash;
        const coachObj = getCoachObj(slot.coach);
        const unitRate = is1on2 ? coachObj.rate2 : coachObj.rate1;

        studentList.forEach(singleStudent => {
          const isMatch = (type === 'coach' && toHalfWidth(slot.coach) === toHalfWidth(target)) || (type === 'student' && singleStudent === toHalfWidth(target));
          if (isMatch) {
            const [cIdx, tIdx] = sKey.split('_').map(Number);
            const slotTypeLabel = is1on2 ? '1對2' : '1對1';
            const resolvedGrade = getSingleStudentGrade(singleStudent, slot.grade || '');

            if (is1on2) count1on2 += 1;
            else count1on1 += 1;

            totalCalculatedFee += unitRate;

            matchedSlots.push({
              date: dStr,
              court: COURTS[cIdx],
              time: ALL_TIME_SLOTS[tIdx],
              student: singleStudent,
              rawStudent: rawStudentStr,
              coach: slot.coach || '無',
              typeLabel: slotTypeLabel,
              unitRate: unitRate,
              is1on2: is1on2,
              grade: resolvedGrade,
              timeNote: noteStr || '-'
            });
          }
        });
      }
    });
  });

  matchedSlots.sort((a, b) => a.date.localeCompare(b.date));

  if (type === 'coach') {
    const activeCoachObj = getCoachObj(target);
    displayRate1on1.innerText = activeCoachObj.rate1;
    displayRate1on2.innerText = activeCoachObj.rate2;
  } else {
    displayRate1on1.innerText = '依各教練設定';
    displayRate1on2.innerText = '依各教練設定';
  }

  statsCount1on1.innerText = count1on1;
  statsCount1on2.innerText = count1on2;
  statsTotalFee.innerText = `$${totalCalculatedFee.toLocaleString()}`;

  if (matchedSlots.length === 0) {
    statsTableBody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-slate-400">查無相關預約個練紀錄</td></tr>';
  } else {
    matchedSlots.forEach(item => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-amber-50/50 transition';
      tr.innerHTML = `
        <td class="p-2 border-r font-mono">${item.date}</td>
        <td class="p-2 border-r font-bold">${item.court}</td>
        <td class="p-2 border-r font-mono">${item.time}</td>
        <td class="p-2 border-r font-bold text-emerald-900">${item.student} ${item.grade ? `<span class="text-[10px] text-indigo-600 font-normal">(${item.grade})</span>` : ''}</td>
        <td class="p-2 border-r text-indigo-900">${item.coach}</td>
        <td class="p-2 border-r font-medium">
          <span class="px-1.5 py-0.5 rounded text-[11px] ${item.is1on2 ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}">
            ${item.typeLabel} ($${item.unitRate})
          </span>
        </td>
        <td class="p-2 text-slate-500 font-mono">${item.timeNote}</td>
      `;
      statsTableBody.appendChild(tr);
    });
  }
}

exportExcelBtn.addEventListener('click', async () => {
  const range = statsRangeSelect.value;
  const targetDates = getStatsTargetDates();

  if (targetDates.length > 0) {
    statsLoadingOverlay.classList.remove('hidden');
    await fetchMissingDatesData(targetDates);
    statsLoadingOverlay.classList.add('hidden');
  }

  const type = statsTypeSelect.value;
  const target = statsTargetSelect.value;

  let allSlots = [];
  targetDates.forEach(dStr => {
    const dayData = bookings[dStr];
    if (!dayData || !dayData.slots) return;
    Object.keys(dayData.slots).forEach(sKey => {
      const slot = dayData.slots[sKey];
      if (slot.type === 'personal' && slot.student) {
        const rawStudentStr = toHalfWidth(slot.student);
        const hasSlash = rawStudentStr.includes('/');
        const studentList = hasSlash ? rawStudentStr.split('/').map(n => toHalfWidth(n)).filter(n => n !== '') : [rawStudentStr];
        const is1on2 = hasSlash;
        const coachName = slot.coach || '無';
        const coachObj = getCoachObj(coachName);
        const unitRate = is1on2 ? coachObj.rate2 : coachObj.rate1;

        studentList.forEach(singleStudent => {
          const isMatch = (type === 'coach' && toHalfWidth(coachName) === toHalfWidth(target)) || (type === 'student' && singleStudent === toHalfWidth(target));
          if (isMatch) {
            const [cIdx, tIdx] = sKey.split('_').map(Number);
            const dObj = new Date(dStr);
            const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
            const monthDayStr = `${dObj.getMonth() + 1}/${dObj.getDate()}(${weekDays[dObj.getDay()]})`;
            const timeDisplay = (slot.timeNote && slot.timeNote.trim() !== '') ? slot.timeNote.trim() : ALL_TIME_SLOTS[tIdx].replace(/\s~\s/g, '-');
            const otherStudents = studentList.filter(n => n !== singleStudent);
            const partnerNote = (is1on2 && otherStudents.length > 0) ? ` (with ${otherStudents.join('/')})` : '';
            const formattedTime = `${monthDayStr} ${timeDisplay}${partnerNote}`;
            const resolvedGrade = getSingleStudentGrade(singleStudent, slot.grade || '');

            allSlots.push({
              date: dStr,
              student: singleStudent,
              coach: coachName,
              grade: resolvedGrade,
              formattedTime: formattedTime,
              is1on2: is1on2,
              unitRate: unitRate
            });
          }
        });
      }
    });
  });

  if (allSlots.length === 0) {
    alert('目前無符合條件的個練統計紀錄可供匯出！');
    return;
  }

  allSlots.sort((a, b) => a.date.localeCompare(b.date));

  const groupMap = {};
  allSlots.forEach(item => {
    const mapKey = `${item.student}__${item.coach}`;
    if (!groupMap[mapKey]) {
      groupMap[mapKey] = {
        student: item.student,
        coach: item.coach,
        grade: item.grade,
        times: [],
        hr1on1: 0,
        hr1on2: 0,
        totalFee: 0
      };
    }
    if (item.grade && !groupMap[mapKey].grade) {
      groupMap[mapKey].grade = item.grade;
    }
    groupMap[mapKey].times.push(item.formattedTime);
    if (item.is1on2) {
      groupMap[mapKey].hr1on2 += 1;
    } else {
      groupMap[mapKey].hr1on1 += 1;
    }
    groupMap[mapKey].totalFee += item.unitRate;
  });

  const sortedGroups = Object.values(groupMap).sort((a, b) => {
    const rankA = getGradeRank(a.grade);
    const rankB = getGradeRank(b.grade);
    if (rankA !== rankB) return rankA - rankB;
    return a.student.localeCompare(b.student, 'zh-Hant');
  });

  const activeSingleDate = statsSingleDateInput.value || currentDate;
  const dateTitleStr = range === 'custom'
    ? `${statsStartDateInput.value} ~ ${statsEndDateInput.value}`
    : activeSingleDate;
  const fileDateSuffix = range === 'custom'
    ? `${statsStartDateInput.value}_${statsEndDateInput.value}`
    : activeSingleDate;

  const excelRows = [
    [null, '請教練或家長溝通好，自行登記個練訓練時間，並由雙方確認訓練時間, 費用無誤後，於每月1日晚上21：00前停止登記前一個月的時數。'],
    [null, '麻煩大家務必配合，再次感謝協助每個月協助場地紀錄表的前會長 信維爸爸、每月協助登記及帳務處理的姜宸媽媽、峻誠媽媽，辛苦了。'],
    [null, null],
    [null, null],
    [null, dateTitleStr],
    [null, '姓名', '訓練時間', null, null, null, null, null, '一對一（hr）', '一對二（hr）', '費用', '教練']
  ];

  sortedGroups.forEach(sData => {
    let rowData = [null, sData.student];
    for (let i = 0; i < 6; i++) {
      rowData.push(sData.times[i] || null);
    }
    rowData.push(sData.hr1on1 > 0 ? sData.hr1on1 : null);
    rowData.push(sData.hr1on2 > 0 ? sData.hr1on2 : null);
    rowData.push(sData.totalFee);
    rowData.push(sData.coach);
    excelRows.push(rowData);
  });

  const ws = XLSX.utils.aoa_to_sheet(excelRows);
  ws['!cols'] = [
    { wch: 3 }, { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 },
    { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "個練統計表");
  XLSX.writeFile(wb, `個練統計表_${target}_${fileDateSuffix}.xlsx`);
});

exportAllStudentsExcelBtn.addEventListener('click', async () => {
  const range = statsRangeSelect.value;
  const targetDates = getStatsTargetDates();

  if (targetDates.length > 0) {
    statsLoadingOverlay.classList.remove('hidden');
    await fetchMissingDatesData(targetDates);
    statsLoadingOverlay.classList.add('hidden');
  }

  let allSlots = [];
  targetDates.forEach(dStr => {
    const dayData = bookings[dStr];
    if (!dayData || !dayData.slots) return;
    Object.keys(dayData.slots).forEach(sKey => {
      const slot = dayData.slots[sKey];
      if (slot.type === 'personal' && slot.student) {
        const rawStudentStr = toHalfWidth(slot.student);
        const hasSlash = rawStudentStr.includes('/');
        const studentList = hasSlash ? rawStudentStr.split('/').map(n => toHalfWidth(n)).filter(n => n !== '') : [rawStudentStr];
        const is1on2 = hasSlash;
        const coachName = slot.coach || '無';
        const coachObj = getCoachObj(coachName);
        const unitRate = is1on2 ? coachObj.rate2 : coachObj.rate1;

        studentList.forEach(singleStudent => {
          const [cIdx, tIdx] = sKey.split('_').map(Number);
          const dObj = new Date(dStr);
          const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
          const monthDayStr = `${dObj.getMonth() + 1}/${dObj.getDate()}(${weekDays[dObj.getDay()]})`;
          const timeDisplay = (slot.timeNote && slot.timeNote.trim() !== '') ? slot.timeNote.trim() : ALL_TIME_SLOTS[tIdx].replace(/\s~\s/g, '-');
          const otherStudents = studentList.filter(n => n !== singleStudent);
          const partnerNote = (is1on2 && otherStudents.length > 0) ? ` (with ${otherStudents.join('/')})` : '';
          const formattedTime = `${monthDayStr} ${timeDisplay}${partnerNote}`;
          const resolvedGrade = getSingleStudentGrade(singleStudent, slot.grade || '');

          allSlots.push({
            date: dStr,
            student: singleStudent,
            coach: coachName,
            grade: resolvedGrade,
            formattedTime: formattedTime,
            is1on2: is1on2,
            unitRate: unitRate
          });
        });
      }
    });
  });

  if (allSlots.length === 0) {
    alert('選取的時間區間內查無任何個練學員紀錄！');
    return;
  }

  allSlots.sort((a, b) => a.date.localeCompare(b.date));

  const groupMap = {};
  allSlots.forEach(item => {
    const mapKey = `${item.student}__${item.coach}`;
    if (!groupMap[mapKey]) {
      groupMap[mapKey] = {
        student: item.student,
        coach: item.coach,
        grade: item.grade,
        times: [],
        hr1on1: 0,
        hr1on2: 0,
        totalFee: 0
      };
    }
    if (item.grade && !groupMap[mapKey].grade) {
      groupMap[mapKey].grade = item.grade;
    }
    groupMap[mapKey].times.push(item.formattedTime);
    if (item.is1on2) {
      groupMap[mapKey].hr1on2 += 1;
    } else {
      groupMap[mapKey].hr1on1 += 1;
    }
    groupMap[mapKey].totalFee += item.unitRate;
  });

  const sortedGroups = Object.values(groupMap).sort((a, b) => {
    const rankA = getGradeRank(a.grade);
    const rankB = getGradeRank(b.grade);
    if (rankA !== rankB) return rankA - rankB;
    return a.student.localeCompare(b.student, 'zh-Hant');
  });

  const activeSingleDate = statsSingleDateInput.value || currentDate;
  const dateRangeLabel = range === 'custom'
    ? `${statsStartDateInput.value} ~ ${statsEndDateInput.value}`
    : `當日 (${activeSingleDate})`;
  const fileDateSuffix = range === 'custom'
    ? `${statsStartDateInput.value}_${statsEndDateInput.value}`
    : activeSingleDate;

  const excelRows = [
    [null, '請教練或家長溝通好，自行登記個練訓練時間，並由雙方確認訓練時間、費用無誤後，於每月1日晚上21：00前停止登記前一個月的時數。'],
    [null, '麻煩大家務必配合，再次感謝協助每個月協助場地紀錄表的前會長 信維爸爸、每月協助登記及帳務處理的姜宸媽媽、峻誠媽媽，辛苦了。'],
    [null, null],
    [null, null],
    [null, `羽球隊個人練習總表 (${dateRangeLabel})`],
    [null, '姓名', '訓練時間', null, null, null, null, null, '一對一（hr）', '一對二（hr）', '費用', '教練']
  ];

  sortedGroups.forEach(sData => {
    let rowData = [null, sData.student];
    for (let i = 0; i < 6; i++) {
      rowData.push(sData.times[i] || null);
    }
    rowData.push(sData.hr1on1 > 0 ? sData.hr1on1 : null);
    rowData.push(sData.hr1on2 > 0 ? sData.hr1on2 : null);
    rowData.push(sData.totalFee);
    rowData.push(sData.coach);
    excelRows.push(rowData);
  });

  const ws = XLSX.utils.aoa_to_sheet(excelRows);
  ws['!cols'] = [
    { wch: 3 }, { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 },
    { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "全體學員總表");
  XLSX.writeFile(wb, `全體學員個練總表_${fileDateSuffix}.xlsx`);
});