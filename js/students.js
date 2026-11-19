// ==========================================
// 學員姓名、年級總表管理、自動帶入與預約匯入
// ==========================================
let studentGradeMap = JSON.parse(localStorage.getItem('badminton_student_grades_v1')) || {
  '以家': '三年級',
  '峻誠': '四年級',
  '展誠': '二年級',
  '宇澄': '一年級'
};

function saveStudentGradeData() {
  localStorage.setItem('badminton_student_grades_v1', JSON.stringify(studentGradeMap));
  if (window.db) {
    const gradeDocRef = window.fsDoc(window.db, "settings", "studentGrades");
    window.fsSetDoc(gradeDocRef, { map: studentGradeMap }).catch(err => console.error("學員年級總表儲存失敗:", err));
  }
}

function getSingleStudentGrade(studentName, fallbackGrade = '') {
  const cleanName = toHalfWidth(studentName);
  if (!cleanName) return '';
  if (Object.prototype.hasOwnProperty.call(studentGradeMap, cleanName)) {
    return studentGradeMap[cleanName] || '';
  }
  return fallbackGrade || '';
}

function getBookingGradeFromMaster(studentStr, fallbackGrade = '') {
  const raw = toHalfWidth(studentStr);
  if (!raw) return '';
  if (raw.includes('/')) {
    const names = raw.split('/').map(n => toHalfWidth(n)).filter(n => n !== '');
    const grades = names.map(n => getSingleStudentGrade(n, '')).filter(g => g !== '');
    return grades.length > 0 ? grades.join('/') : (fallbackGrade || '');
  }
  return getSingleStudentGrade(raw, fallbackGrade);
}

function setupStudentGradeFirestoreListener() {
  if (!window.db) return;
  if (studentGradeUnsubscribe) studentGradeUnsubscribe();

  const gradeDocRef = window.fsDoc(window.db, "settings", "studentGrades");
  studentGradeUnsubscribe = window.fsOnSnapshot(gradeDocRef, (docSnap) => {
    if (docSnap.exists() && docSnap.data().map && typeof docSnap.data().map === 'object') {
      studentGradeMap = docSnap.data().map;
      localStorage.setItem('badminton_student_grades_v1', JSON.stringify(studentGradeMap));
      if (!studentGradeModal.classList.contains('hidden')) {
        renderStudentGradeList();
      }
      updateAutoGradePreview();
    } else {
      saveStudentGradeData();
    }
  }, (err) => {
    console.error("學員年級總表 Firestore 監聽失敗:", err);
  });
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