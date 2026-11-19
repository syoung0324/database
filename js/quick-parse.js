// ==========================================
// 管理者特殊欄位：快速文字自動預約 / 取消功能
// ==========================================
openQuickParseBtn.addEventListener('click', () => {
  if (!isAdminLoggedIn) return;
  quickParseResult.classList.add('hidden');
  quickParseResult.innerHTML = '';
  quickParseModal.classList.remove('hidden');
  quickParseTextarea.focus();
});

closeQuickParseBtn.addEventListener('click', () => quickParseModal.classList.add('hidden'));
cancelQuickParseBtn.addEventListener('click', () => quickParseModal.classList.add('hidden'));

clearQuickParseBtn.addEventListener('click', () => {
  quickParseTextarea.value = '';
  quickParseResult.classList.add('hidden');
  quickParseResult.innerHTML = '';
  quickParseTextarea.focus();
});

fillQuickExampleBtn.addEventListener('click', () => {
  quickParseTextarea.value = '瑀珊（張教練）\n11/7 （六）07:00-08:00\n11/14 (六) 07:00-08:00\n11/21 (六) 07:00-08:00 (新增)';
  quickParseTextarea.focus();
});

function resolveCoachName(rawCoach) {
  if (!rawCoach) return '';
  const clean = toHalfWidth(rawCoach);
  if (!clean) return '';
  const exact = coachList.find(c => toHalfWidth(c.name) === clean);
  if (exact) return exact.name;
  const withSuffix = coachList.find(c => toHalfWidth(c.name) === `${clean}教練`);
  if (withSuffix) return withSuffix.name;
  return clean;
}

function normalizePersonKey(str) {
  return toHalfWidth(str).replace(/\s+/g, '');
}

submitQuickParseBtn.addEventListener('click', async () => {
  if (!isAdminLoggedIn) return;
  const rawText = quickParseTextarea.value;
  const lines = rawText
    .split(/\r?\n/)
    .map(l => toHalfWidth(l))
    .filter(l => l !== '');

  if (lines.length === 0) {
    alert('請先貼上預約文字內容！');
    return;
  }

  submitQuickParseBtn.disabled = true;
  submitQuickParseBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 處理中...';

  const baseYear = parseInt(currentDate.split('-')[0], 10) || new Date().getFullYear();
  let currentStudent = '';
  let currentCoach = '';
  const tasks = [];
  const logs = [];

  const scheduleRegex = /^(\d{1,2})\s*\/\s*(\d{1,2})\s*(?:\([^)]*\))?\s*(\d{1,2})\s*:\s*(\d{2})\s*-\s*(\d{1,2})\s*:\s*(\d{2})\s*(?:\(([^)]*)\))?\s*(.*)$/;
  const looksLikeDateOrTimeRegex = /^(\d{1,2}\s*\/\s*\d{1,2}|\d{1,2}\s*:\s*\d{2})/;

  lines.forEach((line, idx) => {
    const match = line.match(scheduleRegex);
    if (match) {
      const month = parseInt(match[1], 10);
      const day = parseInt(match[2], 10);
      const startH = parseInt(match[3], 10);
      const startM = parseInt(match[4], 10);
      const endH = parseInt(match[5], 10);
      const endM = parseInt(match[6], 10);
      const parenAfterTime = toHalfWidth(match[7] || '');
      const extraTail = toHalfWidth(match[8] || '');

      let taskStudent = currentStudent;
      let taskCoach = currentCoach;
      let actionTextPool = `${parenAfterTime} ${extraTail}`.trim();

      const inlinePersonMatch = extraTail.match(/^([^\s()]+(?:\s*\/\s*[^\s()]+)*)\s*\(([^()]+)\)\s*(.*)$/);
      if (inlinePersonMatch && !/^(新增|取消|場地\s*[1-3])$/.test(inlinePersonMatch[1])) {
        taskStudent = toHalfWidth(inlinePersonMatch[1]);
        taskCoach = resolveCoachName(inlinePersonMatch[2]);
        actionTextPool = `${parenAfterTime} ${inlinePersonMatch[3] || ''}`.trim();
      }

      if (!taskStudent) {
        logs.push({ ok: false, msg: `第 ${idx + 1} 行「${line}」缺少「選手姓名(教練名)」，請先在上方填寫選手姓名。` });
        return;
      }

      const dTest = new Date(baseYear, month - 1, day);
      if (dTest.getMonth() !== month - 1 || dTest.getDate() !== day) {
        logs.push({ ok: false, msg: `第 ${idx + 1} 行日期「${month}/${day}」無效，已略過。` });
        return;
      }
      const targetDateStr = `${baseYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      let action = 'add';
      if (actionTextPool.includes('取消')) {
        action = 'cancel';
      } else if (actionTextPool.includes('新增') || parenAfterTime === '') {
        action = 'add';
      } else if (parenAfterTime && !/場地\s*[1-3]/.test(parenAfterTime)) {
        logs.push({ ok: false, msg: `第 ${idx + 1} 行無法辨識動作「(${parenAfterTime})」，請填寫 (新增) 或 (取消)。` });
        return;
      }

      let specifiedCourtIdx = null;
      const courtMatch = actionTextPool.match(/場地\s*([1-3])/);
      if (courtMatch) {
        specifiedCourtIdx = parseInt(courtMatch[1], 10) - 1;
      }

      const startSlotIdx = startH - 7;
      if (startSlotIdx < 0 || startSlotIdx >= ALL_TIME_SLOTS.length) {
        logs.push({ ok: false, msg: `第 ${idx + 1} 行時間「${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}」超出開放時段 (07:00-21:00)。` });
        return;
      }

      let slotIndices = [startSlotIdx];
      let timeNote = '';
      const isExactHour = (startM === 0 && endM === 0 && endH > startH);
      if (isExactHour) {
        const duration = endH - startH;
        slotIndices = [];
        for (let k = 0; k < duration; k++) {
          if (startSlotIdx + k < ALL_TIME_SLOTS.length) {
            slotIndices.push(startSlotIdx + k);
          }
        }
      } else {
        timeNote = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}-${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      }

      tasks.push({
        lineNum: idx + 1,
        targetDate: targetDateStr,
        displayDate: `${month}/${day}`,
        displayTime: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}-${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
        student: taskStudent,
        coach: taskCoach,
        action,
        slotIndices,
        timeNote,
        specifiedCourtIdx
      });
    } else if (looksLikeDateOrTimeRegex.test(line)) {
      logs.push({ ok: false, msg: `第 ${idx + 1} 行「${line}」日期或時間格式無法辨識（請確認格式如 11/7 (六) 07:00-08:00），已略過。` });
    } else {
      const headerMatch = line.match(/^(.+?)\s*(?:\(([^()]+)\))?$/);
      if (headerMatch) {
        const parsedStudent = toHalfWidth(headerMatch[1]);
        const parsedCoachRaw = toHalfWidth(headerMatch[2] || '');
        if (parsedStudent) {
          currentStudent = parsedStudent;
          currentCoach = resolveCoachName(parsedCoachRaw);
        }
      }
    }
  });

  const uniqueDates = [...new Set(tasks.map(t => t.targetDate))];
  await fetchMissingDatesData(uniqueDates);

  const modifiedDates = new Set();

  tasks.forEach(task => {
    if (!bookings[task.targetDate]) {
      bookings[task.targetDate] = { eventTitle: '', nightOnly: false, hideAllSlots: false, slots: {} };
    }
    if (!bookings[task.targetDate].slots) {
      bookings[task.targetDate].slots = {};
    }

    const daySlots = bookings[task.targetDate].slots;
    const candidateCourts = task.specifiedCourtIdx !== null ? [task.specifiedCourtIdx] : [0, 1, 2];
    const coachDisplay = task.coach ? `(${task.coach})` : '';
    const autoGrade = getBookingGradeFromMaster(task.student, '');
    const normTaskStudent = normalizePersonKey(task.student);
    const normTaskCoach = normalizePersonKey(task.coach);

    if (task.action === 'add') {
      const duplicatedSlots = [];
      const remainingSlotIndices = [];

      task.slotIndices.forEach(sIdx => {
        let foundCourt = null;
        for (let c = 0; c < COURTS.length; c++) {
          const existing = daySlots[`${c}_${sIdx}`];
          if (
            existing &&
            existing.type === 'personal' &&
            normalizePersonKey(existing.student) === normTaskStudent &&
            normalizePersonKey(existing.coach || '') === normTaskCoach
          ) {
            foundCourt = c;
            break;
          }
        }
        if (foundCourt !== null) {
          duplicatedSlots.push(`${ALL_TIME_SLOTS[sIdx].replace(/\s~\s/g, '-')}(${COURTS[foundCourt]})`);
        } else {
          remainingSlotIndices.push(sIdx);
        }
      });

      if (remainingSlotIndices.length === 0) {
        logs.push({
          ok: false,
          msg: `⚠️ ${task.displayDate} ${duplicatedSlots.join('、')}【${task.student}${coachDisplay}】已存在相同預約，未重複新增其他場地。`
        });
        return;
      }

      if (duplicatedSlots.length > 0) {
        logs.push({
          ok: false,
          msg: `⚠️ ${task.displayDate} ${duplicatedSlots.join('、')}【${task.student}${coachDisplay}】已存在預約，已略過該時段。`
        });
      }

      let chosenCourtForAll = null;
      for (const cIdx of candidateCourts) {
        const allFree = remainingSlotIndices.every(sIdx => !daySlots[`${cIdx}_${sIdx}`]);
        if (allFree) {
          chosenCourtForAll = cIdx;
          break;
        }
      }

      if (chosenCourtForAll !== null) {
        remainingSlotIndices.forEach(sIdx => {
          daySlots[`${chosenCourtForAll}_${sIdx}`] = {
            type: 'personal',
            student: task.student,
            grade: autoGrade,
            coach: task.coach,
            timeNote: task.timeNote,
            otherNote: ''
          };
        });
        modifiedDates.add(task.targetDate);
        logs.push({
          ok: true,
          msg: `✅ 已新增：${task.displayDate} ${task.displayTime}｜${COURTS[chosenCourtForAll]}｜${task.student}${coachDisplay}${autoGrade ? ` [${autoGrade}]` : ''}`
        });
      } else {
        let bookedCourts = [];
        let failedSlots = [];
        remainingSlotIndices.forEach(sIdx => {
          const freeCourt = candidateCourts.find(cIdx => !daySlots[`${cIdx}_${sIdx}`]);
          if (freeCourt !== undefined) {
            daySlots[`${freeCourt}_${sIdx}`] = {
              type: 'personal',
              student: task.student,
              grade: autoGrade,
              coach: task.coach,
              timeNote: task.timeNote,
              otherNote: ''
            };
            bookedCourts.push(`${ALL_TIME_SLOTS[sIdx].replace(/\s~\s/g, '-')}(${COURTS[freeCourt]})`);
            modifiedDates.add(task.targetDate);
          } else {
            failedSlots.push(ALL_TIME_SLOTS[sIdx].replace(/\s~\s/g, '-'));
          }
        });

        if (bookedCourts.length > 0) {
          logs.push({ ok: true, msg: `✅ 部分新增：${task.displayDate}｜${bookedCourts.join('、')}｜${task.student}${coachDisplay}` });
        }
        if (failedSlots.length > 0) {
          logs.push({ ok: false, msg: `❌ ${task.displayDate} ${failedSlots.join('、')} 所有場地皆已額滿，無法預約【${task.student}${coachDisplay}】。` });
        }
      }
    } else if (task.action === 'cancel') {
      let cancelledCount = 0;
      let cancelledDetails = [];

      task.slotIndices.forEach(sIdx => {
        for (const cIdx of candidateCourts) {
          const key = `${cIdx}_${sIdx}`;
          const existing = daySlots[key];
          if (
            existing &&
            existing.type === 'personal' &&
            normalizePersonKey(existing.student) === normTaskStudent
          ) {
            if (!normTaskCoach || normalizePersonKey(existing.coach || '') === normTaskCoach) {
              delete daySlots[key];
              cancelledCount++;
              cancelledDetails.push(`${COURTS[cIdx]}`);
              modifiedDates.add(task.targetDate);
              break;
            }
          }
        }
      });

      if (cancelledCount > 0) {
        logs.push({
          ok: true,
          msg: `🗑️ 已取消：${task.displayDate} ${task.displayTime}｜${[...new Set(cancelledDetails)].join('、')}｜${task.student}${coachDisplay}`
        });
      } else {
        logs.push({
          ok: false,
          msg: `⚠️ 找不到可取消的預約：${task.displayDate} ${task.displayTime}｜${task.student}${coachDisplay}`
        });
      }
    }
  });

  for (const dStr of modifiedDates) {
    saveData(dStr);
  }

  quickParseResult.innerHTML = '';
  if (logs.length === 0) {
    quickParseResult.innerHTML = '<div class="text-slate-500">未偵測到可執行的日期時段行，請確認格式是否包含「日期 時間」。</div>';
  } else {
    logs.forEach(item => {
      const div = document.createElement('div');
      div.className = `p-1.5 rounded border ${item.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium' : 'bg-rose-50 border-rose-200 text-rose-800'}`;
      div.innerText = item.msg;
      quickParseResult.appendChild(div);
    });
  }
  quickParseResult.classList.remove('hidden');

  submitQuickParseBtn.disabled = false;
  submitQuickParseBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> 執行自動預約 / 取消';

  if (modifiedDates.size > 0) {
    const firstModifiedDate = [...modifiedDates][0];
    if (firstModifiedDate !== currentDate) {
      currentDate = firstModifiedDate;
      datePicker.value = currentDate;
      selectedCells.clear();
      renderDateTabs();
      setupFirestoreListener();
      updateActionBar();
    } else {
      renderGrid();
    }
  }
});