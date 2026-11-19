// ==========================================
// 公告系統、富文本工具列、圖片拖拉縮放與倒數計時器
// ==========================================
let currentAdminImageWidth = 240;
let currentAdminImageLayout = 'bottom';
let currentAdminImageAlign = 'center';

function sanitizeAnnouncementHtml(html) {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  temp.querySelectorAll('script, iframe, object, embed, link, style').forEach(el => el.remove());
  temp.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || (name === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:'))) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return temp.innerHTML;
}

function escapeHtmlText(text) {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function hasActiveEditorSelection() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  return adminAnnContentEditor.contains(range.commonAncestorContainer);
}

function wrapSelectionWithSpanStyle(styleObj) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  if (!adminAnnContentEditor.contains(range.commonAncestorContainer)) return false;

  const span = document.createElement('span');
  Object.entries(styleObj).forEach(([k, v]) => {
    span.style[k] = v;
  });
  try {
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.addRange(newRange);
    return true;
  } catch (e) {
    return false;
  }
}

annFontSizeSelect.addEventListener('change', () => {
  const chosenSize = annFontSizeSelect.value;
  if (hasActiveEditorSelection()) {
    wrapSelectionWithSpanStyle({ fontSize: chosenSize });
  } else {
    adminAnnContentEditor.style.fontSize = chosenSize;
  }
  adminAnnContentEditor.focus();
});

function applyTextColorChoice(hexColor) {
  annCustomColorPicker.value = hexColor;
  if (hasActiveEditorSelection()) {
    wrapSelectionWithSpanStyle({ color: hexColor });
  } else {
    adminAnnContentEditor.style.color = hexColor;
  }
  adminAnnContentEditor.focus();
}

document.querySelectorAll('.ann-color-swatch').forEach(btn => {
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    applyTextColorChoice(btn.dataset.color);
  });
});

annCustomColorPicker.addEventListener('input', (e) => {
  applyTextColorChoice(e.target.value);
});

annBoldBtn.addEventListener('mousedown', (e) => {
  e.preventDefault();
  if (hasActiveEditorSelection()) {
    document.execCommand('bold', false, null);
  } else {
    const isBold = adminAnnContentEditor.style.fontWeight === '700';
    adminAnnContentEditor.style.fontWeight = isBold ? '400' : '700';
  }
  adminAnnContentEditor.focus();
});

annUnderlineBtn.addEventListener('mousedown', (e) => {
  e.preventDefault();
  if (hasActiveEditorSelection()) {
    document.execCommand('underline', false, null);
  }
  adminAnnContentEditor.focus();
});

annHighlightBtn.addEventListener('mousedown', (e) => {
  e.preventDefault();
  if (hasActiveEditorSelection()) {
    wrapSelectionWithSpanStyle({ backgroundColor: '#fef08a', padding: '0 2px', borderRadius: '3px' });
  }
  adminAnnContentEditor.focus();
});

annClearFormatBtn.addEventListener('click', () => {
  const plain = adminAnnContentEditor.innerText;
  adminAnnContentEditor.innerHTML = escapeHtmlText(plain);
  adminAnnContentEditor.style.fontSize = '14px';
  adminAnnContentEditor.style.color = '#334155';
  adminAnnContentEditor.style.fontWeight = '400';
  annFontSizeSelect.value = '14px';
  annCustomColorPicker.value = '#334155';
  adminAnnContentEditor.focus();
});

function setAdminImageSize(pxWidth) {
  const clamped = Math.max(80, Math.min(600, Math.round(Number(pxWidth) || 240)));
  currentAdminImageWidth = clamped;
  adminAnnResizableBox.style.width = `${clamped}px`;
  adminAnnImgWidthSlider.value = Math.min(560, clamped);
  adminAnnImgSizeBadge.innerText = `${clamped} px`;
}

function updateAdminLayoutAndAlignUI() {
  document.querySelectorAll('.ann-layout-btn').forEach(btn => {
    const active = btn.dataset.layout === currentAdminImageLayout;
    btn.className = `ann-layout-btn px-2 py-1 rounded border text-[11px] font-bold transition ${
      active
        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
    }`;
  });

  document.querySelectorAll('.ann-align-btn').forEach(btn => {
    const active = btn.dataset.align === currentAdminImageAlign;
    btn.className = `ann-align-btn px-2 py-1 rounded border text-[11px] font-bold transition ${
      active
        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
    }`;
  });

  if (currentAdminImageLayout === 'left' || currentAdminImageLayout === 'right') {
    annAlignControls.classList.add('opacity-40', 'pointer-events-none');
  } else {
    annAlignControls.classList.remove('opacity-40', 'pointer-events-none');
  }
}

document.querySelectorAll('.ann-layout-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentAdminImageLayout = btn.dataset.layout;
    updateAdminLayoutAndAlignUI();
  });
});

document.querySelectorAll('.ann-align-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentAdminImageAlign = btn.dataset.align;
    updateAdminLayoutAndAlignUI();
  });
});

adminAnnImgWidthSlider.addEventListener('input', (e) => {
  setAdminImageSize(e.target.value);
});

adminAnnImgResetSizeBtn.addEventListener('click', () => {
  setAdminImageSize(240);
});

function bindDragResizeHandle(handleEl) {
  let isResizing = false;
  let startX = 0;
  let startWidth = 240;

  const onStart = (clientX) => {
    isResizing = true;
    startX = clientX;
    startWidth = adminAnnResizableBox.getBoundingClientRect().width || currentAdminImageWidth;
    document.body.style.userSelect = 'none';
  };

  const onMove = (clientX) => {
    if (!isResizing) return;
    const deltaX = clientX - startX;
    setAdminImageSize(startWidth + deltaX);
  };

  const onEnd = () => {
    if (!isResizing) return;
    isResizing = false;
    document.body.style.userSelect = '';
  };

  handleEl.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onStart(e.clientX);
  });

  window.addEventListener('mousemove', (e) => {
    if (isResizing) onMove(e.clientX);
  });

  window.addEventListener('mouseup', onEnd);

  handleEl.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
      e.preventDefault();
      e.stopPropagation();
      onStart(e.touches[0].clientX);
    }
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (isResizing && e.touches && e.touches[0]) {
      onMove(e.touches[0].clientX);
    }
  }, { passive: true });

  window.addEventListener('touchend', onEnd);
}

bindDragResizeHandle(adminAnnResizeHandleSe);
bindDragResizeHandle(adminAnnResizeHandleE);

function getAnnouncementSignature(ann) {
  if (!ann) return '';
  const raw = `${ann.title || ''}||${ann.sticker || ''}||${ann.contentHtml || ann.content || ''}||${ann.imageUrl || ''}||${ann.imageWidth || ''}||${ann.imageLayout || ''}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `ann_${hash}_${raw.length}`;
}

function syncDismissPreferenceFromCheckbox() {
  const sig = getAnnouncementSignature(boardSettings.announcement);
  if (!sig) return;
  if (dontShowSameAnnCheckbox.checked) {
    localStorage.setItem('badminton_dismissed_ann_sig', sig);
  } else {
    if (localStorage.getItem('badminton_dismissed_ann_sig') === sig) {
      localStorage.removeItem('badminton_dismissed_ann_sig');
    }
  }
}

function syncCheckboxFromDismissPreference() {
  const sig = getAnnouncementSignature(boardSettings.announcement);
  const dismissedSig = localStorage.getItem('badminton_dismissed_ann_sig');
  dontShowSameAnnCheckbox.checked = (!!sig && dismissedSig === sig);
}

dontShowSameAnnCheckbox.addEventListener('change', syncDismissPreferenceFromCheckbox);

function renderPublicAnnouncementUI() {
  const ann = boardSettings.announcement || {};
  const cd = boardSettings.countdown || {};

  const showAnnBar = ann.enabled !== false;
  const showCdBar = cd.enabled !== false && !!cd.targetDateTime;

  if (!showAnnBar && !showCdBar) {
    publicTopNoticeBar.classList.add('hidden');
  } else {
    publicTopNoticeBar.classList.remove('hidden');
  }

  if (showAnnBar) {
    topAnnouncementSummary.classList.remove('hidden');
    topAnnouncementSticker.innerText = ann.sticker || '📢';
    topAnnouncementText.innerText = ann.title || '點擊查看教練團簡介與最新消息';
  } else {
    topAnnouncementSummary.classList.add('hidden');
  }

  if (showCdBar) {
    topCountdownBox.classList.remove('hidden');
    modalCountdownCard.classList.remove('hidden');
    topCountdownTitle.innerText = `${cd.title || '活動倒數'}：`;
    modalCountdownTitle.innerText = cd.title || '距離下次重要活動倒數';
  } else {
    topCountdownBox.classList.add('hidden');
    modalCountdownCard.classList.add('hidden');
  }

  modalAnnouncementSticker.innerText = ann.sticker || '🏸';
  modalAnnouncementTitle.innerText = ann.title || '球隊最新公告';
  modalAnnouncementUpdated.innerText = ann.updatedAt ? `更新時間：${ann.updatedAt}` : '';

  modalAnnouncementBody.style.fontSize = ann.contentFontSize || '14px';
  modalAnnouncementBody.style.color = ann.contentColor || '#334155';
  if (ann.contentHtml && ann.contentHtml.trim() !== '') {
    modalAnnouncementBody.innerHTML = sanitizeAnnouncementHtml(ann.contentHtml);
  } else {
    modalAnnouncementBody.innerText = ann.content || '暫無公告內容。';
  }

  const layout = ann.imageLayout || 'bottom';
  const align = ann.imageAlign || 'center';
  const imgWidth = Number(ann.imageWidth) || 240;

  modalAnnouncementContentLayout.className = 'flex gap-3.5';
  if (layout === 'top') {
    modalAnnouncementContentLayout.classList.add('flex-col-reverse');
  } else if (layout === 'left') {
    modalAnnouncementContentLayout.classList.add('flex-col', 'sm:flex-row-reverse', 'sm:items-start');
  } else if (layout === 'right') {
    modalAnnouncementContentLayout.classList.add('flex-col', 'sm:flex-row', 'sm:items-start');
  } else {
    modalAnnouncementContentLayout.classList.add('flex-col');
  }

  if (ann.imageUrl && ann.imageUrl.trim() !== '') {
    modalAnnouncementImage.src = ann.imageUrl.trim();
    modalAnnouncementImage.style.width = `${imgWidth}px`;
    modalAnnouncementImage.style.maxWidth = '100%';
    modalAnnouncementImageWrap.classList.remove('hidden');

    modalAnnouncementImageWrap.classList.remove('self-start', 'self-center', 'self-end');
    if (layout === 'bottom' || layout === 'top') {
      if (align === 'left') modalAnnouncementImageWrap.classList.add('self-start');
      else if (align === 'right') modalAnnouncementImageWrap.classList.add('self-end');
      else modalAnnouncementImageWrap.classList.add('self-center');
    } else {
      modalAnnouncementImageWrap.classList.add('self-center', 'sm:self-start');
    }
  } else {
    modalAnnouncementImageWrap.classList.add('hidden');
  }

  if (ann.showCoaches !== false && coachList.length > 0) {
    modalCoachIntroSection.classList.remove('hidden');
    modalCoachCardsGrid.innerHTML = '';
    coachList.forEach(coach => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-start gap-2.5 hover:border-emerald-400 transition';
      card.innerHTML = `
        <div class="text-2xl bg-emerald-50 border border-emerald-200 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
          ${coach.avatar || '🏸'}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-1.5 mb-1">
            <span class="font-black text-xs sm:text-sm text-slate-900">${coach.name}</span>
            <span class="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">${coach.tag || '專業指導'}</span>
          </div>
          <p class="text-[11px] text-slate-600 leading-relaxed">${coach.bio || '歡迎預約一對一或一對二個人練習指導。'}</p>
        </div>
      `;
      modalCoachCardsGrid.appendChild(card);
    });
  } else {
    modalCoachIntroSection.classList.add('hidden');
  }
}

function updateCountdownTick() {
  const cd = boardSettings.countdown || {};
  if (cd.enabled === false || !cd.targetDateTime) return;

  const targetMs = new Date(cd.targetDateTime).getTime();
  if (isNaN(targetMs)) {
    topCountdownTimer.innerText = '日期格式錯誤';
    modalCountdownTimer.innerText = '日期格式錯誤';
    return;
  }

  const diff = targetMs - Date.now();
  if (diff <= 0) {
    const endText = cd.endMessage || '🎉 活動已正式開始！';
    topCountdownTimer.innerText = endText;
    modalCountdownTimer.innerText = endText;
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  const formatted = `${days} 天 ${String(hours).padStart(2, '0')} 時 ${String(mins).padStart(2, '0')} 分 ${String(secs).padStart(2, '0')} 秒`;
  topCountdownTimer.innerText = formatted;
  modalCountdownTimer.innerText = formatted;
}

function startCountdownLoop() {
  updateCountdownTick();
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(updateCountdownTick, 1000);
}

function openPublicAnnouncementModalManual() {
  renderPublicAnnouncementUI();
  syncCheckboxFromDismissPreference();
  publicAnnouncementModal.classList.remove('hidden');
}

function closePublicAnnouncementModal() {
  syncDismissPreferenceFromCheckbox();
  publicAnnouncementModal.classList.add('hidden');
}

function maybeAutoOpenAnnouncementModal() {
  if (hasShownAutoPopupThisSession) return;
  const ann = boardSettings.announcement || {};
  if (ann.autoPopup !== false) {
    const currentSig = getAnnouncementSignature(ann);
    const dismissedSig = localStorage.getItem('badminton_dismissed_ann_sig');
    if (currentSig && dismissedSig === currentSig) {
      hasShownAutoPopupThisSession = true;
      return;
    }
    hasShownAutoPopupThisSession = true;
    renderPublicAnnouncementUI();
    syncCheckboxFromDismissPreference();
    publicAnnouncementModal.classList.remove('hidden');
  }
}

openPublicAnnouncementBtn.addEventListener('click', openPublicAnnouncementModalManual);
topAnnouncementSummary.addEventListener('click', openPublicAnnouncementModalManual);
closePublicAnnouncementBtn.addEventListener('click', closePublicAnnouncementModal);
confirmPublicAnnouncementBtn.addEventListener('click', closePublicAnnouncementModal);

function updateAdminImagePreview(srcValue, fileLabel = '') {
  const cleanSrc = (srcValue || '').trim();
  if (cleanSrc) {
    adminAnnImagePreview.src = cleanSrc;
    adminAnnImagePreviewWrap.classList.remove('hidden');
    adminAnnClearImageBtn.classList.remove('hidden');
    setAdminImageSize(currentAdminImageWidth);
    updateAdminLayoutAndAlignUI();
    if (fileLabel) {
      adminAnnFileStatus.innerText = fileLabel;
    } else if (cleanSrc.startsWith('data:image/')) {
      adminAnnFileStatus.innerText = '已載入本機圖片';
    } else {
      adminAnnFileStatus.innerText = '已輸入外部圖片網址';
    }
  } else {
    adminAnnImagePreview.src = '';
    adminAnnImagePreviewWrap.classList.add('hidden');
    adminAnnClearImageBtn.classList.add('hidden');
    adminAnnFileStatus.innerText = '尚未選擇本機檔案';
  }
}

function compressLocalImageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('讀取檔案失敗'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('無法解析圖片格式'));
      img.onload = () => {
        const maxDim = 900;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = '';
        if (file.type === 'image/png') {
          dataUrl = canvas.toDataURL('image/png');
          if (dataUrl.length > 450000) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          }
        } else {
          dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        }
        resolve(dataUrl);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

adminAnnImageFile.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('請選擇圖片格式的檔案（如 JPG、PNG、WEBP、GIF）！');
    return;
  }

  adminAnnFileStatus.innerText = '正在讀取並最佳化圖片...';
  try {
    const compressedDataUrl = await compressLocalImageToDataUrl(file);
    adminAnnImageUrl.value = compressedDataUrl;
    updateAdminImagePreview(compressedDataUrl, `已選取：${file.name}`);
  } catch (err) {
    alert('讀取本機圖片失敗，請確認檔案是否損毀或換一張圖片試試！');
    adminAnnFileStatus.innerText = '讀取失敗';
  } finally {
    adminAnnImageFile.value = '';
  }
});

adminAnnImageUrl.addEventListener('input', () => {
  updateAdminImagePreview(adminAnnImageUrl.value);
});

adminAnnClearImageBtn.addEventListener('click', () => {
  adminAnnImageUrl.value = '';
  adminAnnImageFile.value = '';
  updateAdminImagePreview('');
});

openBoardManageBtn.addEventListener('click', () => {
  if (!isAdminLoggedIn) return;
  const ann = boardSettings.announcement || {};
  const cd = boardSettings.countdown || {};

  adminCountdownEnabled.checked = cd.enabled !== false;
  adminCountdownTitle.value = cd.title || '';
  adminCountdownDatetime.value = cd.targetDateTime || getDefaultCountdownTarget();
  adminCountdownEndmsg.value = cd.endMessage || '🎉 活動已正式開始，大家加油！🏸';

  adminAnnEnabled.checked = ann.enabled !== false;
  adminAnnAutopopup.checked = ann.autoPopup !== false;
  adminAnnSticker.value = ann.sticker || '🏸';
  adminAnnTitle.value = ann.title || '';

  const baseFontSize = ann.contentFontSize || '14px';
  const baseColor = ann.contentColor || '#334155';
  adminAnnContentEditor.style.fontSize = baseFontSize;
  adminAnnContentEditor.style.color = baseColor;
  annFontSizeSelect.value = baseFontSize;
  annCustomColorPicker.value = baseColor;

  if (ann.contentHtml && ann.contentHtml.trim() !== '') {
    adminAnnContentEditor.innerHTML = sanitizeAnnouncementHtml(ann.contentHtml);
  } else {
    adminAnnContentEditor.innerText = ann.content || '';
  }

  currentAdminImageWidth = Number(ann.imageWidth) || 240;
  currentAdminImageLayout = ann.imageLayout || 'bottom';
  currentAdminImageAlign = ann.imageAlign || 'center';

  adminAnnImageUrl.value = ann.imageUrl || '';
  updateAdminImagePreview(ann.imageUrl || '');
  adminAnnShowCoaches.checked = ann.showCoaches !== false;

  stickerPickerGrid.innerHTML = '';
  STICKER_CATALOG.forEach(st => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'px-2 py-1 bg-slate-50 hover:bg-sky-100 border border-slate-200 hover:border-sky-400 rounded-lg text-xs flex items-center gap-1 transition';
    btn.innerHTML = `<span class="text-base">${st.icon}</span><span class="text-[11px] font-medium text-slate-700">${st.label}</span>`;
    btn.addEventListener('click', () => {
      adminAnnSticker.value = st.icon;
      adminAnnContentEditor.focus();
      document.execCommand('insertText', false, ` ${st.icon}`);
    });
    stickerPickerGrid.appendChild(btn);
  });

  adminCoachProfilesList.innerHTML = '';
  coachList.forEach((coach, idx) => {
    const row = document.createElement('div');
    row.className = 'bg-white p-2.5 rounded-lg border border-emerald-200 space-y-2';
    row.innerHTML = `
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-black text-xs text-emerald-900 w-20 shrink-0">${coach.name}</span>
        <div class="flex items-center gap-1">
          <span class="text-[11px] text-slate-500">貼圖:</span>
          <input type="text" value="${coach.avatar || '🏸'}" class="w-10 text-center text-sm p-1 border border-slate-300 rounded admin-coach-avatar" data-idx="${idx}">
        </div>
        <div class="flex items-center gap-1 flex-1 min-w-[140px]">
          <span class="text-[11px] text-slate-500 shrink-0">專長標籤:</span>
          <input type="text" value="${coach.tag || ''}" placeholder="例如：單打步伐與網前控球" class="w-full text-xs p-1 border border-slate-300 rounded admin-coach-tag" data-idx="${idx}">
        </div>
      </div>
      <div>
        <input type="text" value="${coach.bio || ''}" placeholder="輸入教練簡介說明..." class="w-full text-xs p-1.5 bg-slate-50 border border-slate-300 rounded admin-coach-bio" data-idx="${idx}">
      </div>
    `;
    adminCoachProfilesList.appendChild(row);
  });

  boardManageModal.classList.remove('hidden');
});

closeBoardManageBtn.addEventListener('click', () => boardManageModal.classList.add('hidden'));
cancelBoardManageBtn.addEventListener('click', () => boardManageModal.classList.add('hidden'));

saveBoardManageBtn.addEventListener('click', async () => {
  if (!isAdminLoggedIn) return;

  const now = new Date();
  const updatedTimeStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const cleanHtml = sanitizeAnnouncementHtml(adminAnnContentEditor.innerHTML.trim());
  const plainText = adminAnnContentEditor.innerText.trim();

  boardSettings = {
    announcement: {
      enabled: adminAnnEnabled.checked,
      autoPopup: adminAnnAutopopup.checked,
      sticker: adminAnnSticker.value.trim() || '🏸',
      title: adminAnnTitle.value.trim() || '球隊最新公告',
      content: plainText,
      contentHtml: cleanHtml,
      contentFontSize: adminAnnContentEditor.style.fontSize || annFontSizeSelect.value || '14px',
      contentColor: adminAnnContentEditor.style.color || annCustomColorPicker.value || '#334155',
      imageUrl: adminAnnImageUrl.value.trim(),
      imageWidth: currentAdminImageWidth,
      imageLayout: currentAdminImageLayout,
      imageAlign: currentAdminImageAlign,
      showCoaches: adminAnnShowCoaches.checked,
      updatedAt: updatedTimeStr
    },
    countdown: {
      enabled: adminCountdownEnabled.checked,
      title: adminCountdownTitle.value.trim() || '活動倒數',
      targetDateTime: adminCountdownDatetime.value,
      endMessage: adminCountdownEndmsg.value.trim() || '🎉 活動已正式開始！'
    }
  };

  adminCoachProfilesList.querySelectorAll('.admin-coach-avatar').forEach(inp => {
    const idx = Number(inp.dataset.idx);
    if (coachList[idx]) coachList[idx].avatar = inp.value.trim() || '🏸';
  });
  adminCoachProfilesList.querySelectorAll('.admin-coach-tag').forEach(inp => {
    const idx = Number(inp.dataset.idx);
    if (coachList[idx]) coachList[idx].tag = inp.value.trim() || '專業指導';
  });
  adminCoachProfilesList.querySelectorAll('.admin-coach-bio').forEach(inp => {
    const idx = Number(inp.dataset.idx);
    if (coachList[idx]) coachList[idx].bio = inp.value.trim();
  });

  saveCoachData();
  await saveBoardSettings();
  renderPublicAnnouncementUI();
  startCountdownLoop();

  boardManageModal.classList.add('hidden');
  alert('公告、教練簡介與倒數計時器已儲存並同步發布！');
});