// ==========================================
// 輸出 Excel (.xlsx) 報表功能（單一對象 / 全體學員總表）
// ==========================================
function buildSortedExcelGroups(targetDates, filterType = null, filterTarget = null) {
  let allSlots = [];

  targetDates.forEach(dStr => {
    const dayData = bookings[dStr];
    if (!dayData || !dayData.slots) return;

    Object.keys(dayData.slots).forEach(sKey => {
      const slot = dayData.slots[sKey];
      if (slot.type === 'personal' && slot.student) {
        const rawStudentStr = toHalfWidth(slot.student);
        const hasSlash = rawStudentStr.includes('/');
        const studentList = hasSlash
          ? rawStudentStr.split('/').map(n => toHalfWidth(n)).filter(n => n !== '')
          : [rawStudentStr];
        const is1on2 = hasSlash;
        const coachName = slot.coach || '無';
        const coachObj = getCoachObj(coachName);
        const unitRate = is1on2 ? coachObj.rate2 : coachObj.rate1;

        studentList.forEach(singleStudent => {
          if (filterType && filterTarget) {
            const isMatch =
              (filterType === 'coach' && toHalfWidth(coachName) === toHalfWidth(filterTarget)) ||
              (filterType === 'student' && singleStudent === toHalfWidth(filterTarget));
            if (!isMatch) return;
          }

          const [, tIdx] = sKey.split('_').map(Number);
          const dObj = new Date(dStr);
          const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
          const monthDayStr = `${dObj.getMonth() + 1}/${dObj.getDate()}(${weekDays[dObj.getDay()]})`;
          const timeDisplay = (slot.timeNote && slot.timeNote.trim() !== '')
            ? slot.timeNote.trim()
            : ALL_TIME_SLOTS[tIdx].replace(/\s~\s/g, '-');
          const otherStudents = studentList.filter(n => n !== singleStudent);
          const partnerNote = (is1on2 && otherStudents.length > 0) ? ` (with ${otherStudents.join('/')})` : '';
          const formattedTime = `${monthDayStr} ${timeDisplay}${partnerNote}`;
          const resolvedGrade = getSingleStudentGrade(singleStudent, slot.grade || '');

          allSlots.push({
            date: dStr,
            student: singleStudent,
            coach: coachName,
            grade: resolvedGrade,
            formattedTime,
            is1on2,
            unitRate
          });
        });
      }
    });
  });

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

  return Object.values(groupMap).sort((a, b) => {
    const rankA = getGradeRank(a.grade);
    const rankB = getGradeRank(b.grade);
    if (rankA !== rankB) return rankA - rankB;
    return a.student.localeCompare(b.student, 'zh-Hant');
  });
}

function downloadExcelWorkbook(sortedGroups, titleRowText, sheetName, fileName) {
  const excelRows = [
    [null, '請教練或家長溝通好，自行登記個練訓練時間，並由雙方確認訓練時間、費用無誤後，於每月1日晚上21：00前停止登記前一個月的時數。'],
    [null, '麻煩大家務必配合，再次感謝協助每個月協助場地紀錄表的前會長 信維爸爸、每月協助登記及帳務處理的姜宸媽媽、峻誠媽媽，辛苦了。'],
    [null, null],
    [null, null],
    [null, titleRowText],
    [null, '姓名', '訓練時間', null, null, null, null, null, '一對一（hr）', '一對二（hr）', '費用', '教練']
  ];

  sortedGroups.forEach(sData => {
    const rowData = [null, sData.student];
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
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

// 匯出當前篩選對象報表
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
  const sortedGroups = buildSortedExcelGroups(targetDates, type, target);

  if (sortedGroups.length === 0) {
    alert('目前無符合條件的個練統計紀錄可供匯出！');
    return;
  }

  const activeSingleDate = statsSingleDateInput.value || currentDate;
  const dateTitleStr = range === 'custom'
    ? `${statsStartDateInput.value} ~ ${statsEndDateInput.value}`
    : activeSingleDate;
  const fileDateSuffix = range === 'custom'
    ? `${statsStartDateInput.value}_${statsEndDateInput.value}`
    : activeSingleDate;

  downloadExcelWorkbook(
    sortedGroups,
    dateTitleStr,
    '個練統計表',
    `個練統計表_${target}_${fileDateSuffix}.xlsx`
  );
});

// 匯出全體學員總表
exportAllStudentsExcelBtn.addEventListener('click', async () => {
  const range = statsRangeSelect.value;
  const targetDates = getStatsTargetDates();

  if (targetDates.length > 0) {
    statsLoadingOverlay.classList.remove('hidden');
    await fetchMissingDatesData(targetDates);
    statsLoadingOverlay.classList.add('hidden');
  }

  const sortedGroups = buildSortedExcelGroups(targetDates);

  if (sortedGroups.length === 0) {
    alert('選取的時間區間內查無任何個練學員紀錄！');
    return;
  }

  const activeSingleDate = statsSingleDateInput.value || currentDate;
  const dateRangeLabel = range === 'custom'
    ? `${statsStartDateInput.value} ~ ${statsEndDateInput.value}`
    : `當日 (${activeSingleDate})`;
  const fileDateSuffix = range === 'custom'
    ? `${statsStartDateInput.value}_${statsEndDateInput.value}`
    : activeSingleDate;

  downloadExcelWorkbook(
    sortedGroups,
    `羽球隊個人練習總表 (${dateRangeLabel})`,
    '全體學員總表',
    `全體學員個練總表_${fileDateSuffix}.xlsx`
  );
});