// ==========================================
// 全域常數、狀態變數、共用工具與 Firestore 監聽
// ==========================================
const COURTS = ['場地1', '場地2', '場地3'];
const ALL_TIME_SLOTS = [
  '07:00 ~ 08:00', '08:00 ~ 09:00', '09:00 ~ 10:00', '10:00 ~ 11:00',
  '11:00 ~ 12:00', '12:00 ~ 13:00', '13:00 ~ 14:00', '14:00 ~ 15:00',
  '15:00 ~ 16:00', '16:00 ~ 17:00', '17:00 ~ 18:00', '18:00 ~ 19:00',
  '19:00 ~ 20:00', '20:00 ~ 21:00'
];
const GRADE_OPTIONS = ['幼兒園', '一年級', '二年級', '三年級', '四年級', '五年級', '六年級', '國中'];

const STICKER_CATALOG = [
  { icon: '🏸', label: '羽球魂' },
  { icon: '🏆', label: '比賽加油' },
  { icon: '🔥', label: '熱血特訓' },
  { icon: '📢', label: '重要公告' },
  { icon: '⏰', label: '準時集合' },
  { icon: '💪', label: '體能強化' },
  { icon: '🎉', label: '恭喜晉級' },
  { icon: '⚠️', label: '場地異動' },
  { icon: '💧', label: '記得補水' },
  { icon: '🥇', label: '金牌教練' },
  { icon: '⚡', label: '敏捷步伐' },
  { icon: '🤝', label: '團隊合作' }
];

function toHalfWidth(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/\u3000/g, ' ')
    .replace(/[～~–—−‐‑‒―]/g, '-')
    .replace(/[、，]/g, ',')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

let currentDate = new Date().toISOString().split('T')[0];
let selectedCells = new Set();
let bookings = {};
let currentEditKey = null;
let currentBookingType = 'personal';

let userPinnedViewMode = localStorage.getItem('badminton_view_mode_pinned') === 'true';
let isMobileView = userPinnedViewMode
  ? localStorage.getItem('badminton_view_mode') === 'mobile'
  : window.innerWidth < 768;

let isAdminLoggedIn = false;
let unsubscribe = null;
let coachUnsubscribe = null;
let studentGradeUnsubscribe = null;
let boardUnsubscribe = null;
let onlineUnsubscribe = null;
let presenceInterval = null;
let countdownInterval = null;
let hasShownAutoPopupThisSession = false;

const tabSessionId = sessionStorage.getItem('badminton_tab_session_id') ||
  `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
sessionStorage.setItem('badminton_tab_session_id', tabSessionId);

function getDefaultCountdownTarget() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T09:00`;
}

let boardSettings = JSON.parse(localStorage.getItem('badminton_board_settings_v1')) || {
  announcement: {
    enabled: true,
    autoPopup: true,
    title: '歡迎來到羽球場預約與練習統計系統！',
    sticker: '🏸',
    content: '1. 請學員提前 10 分鐘到場完成暖身與裝備檢查。\n2. 如需調整個人練習時段，請提前聯繫指導教練或管理員。\n3. 歡迎點擊下方教練卡片認識我們的教練團！',
    contentHtml: '',
    contentFontSize: '14px',
    contentColor: '#334155',
    imageUrl: '',
    imageWidth: 240,
    imageLayout: 'bottom',
    imageAlign: 'center',
    showCoaches: true,
    updatedAt: ''
  },
  countdown: {
    enabled: true,
    title: '距離下次重要賽事 / 檢定倒數',
    targetDateTime: getDefaultCountdownTarget(),
    endMessage: '🎉 活動已正式開始，大家加油！🏸'
  }
};

// ==========================================
// DOM Elements 參照
// ==========================================
const datePicker = document.getElementById('date-picker');
const prevDayBtn = document.getElementById('prev-day-btn');
const nextDayBtn = document.getElementById('next-day-btn');
const todayBtn = document.getElementById('today-btn');
const clearDayBtn = document.getElementById('clear-day-btn');
const dateTabsBar = document.getElementById('date-tabs-bar');
const dayEventTitleInput = document.getElementById('day-event-title');
const marqueeContainer = document.getElementById('marquee-container');
const dayEventMarquee = document.getElementById('day-event-marquee');
const marqueeText = document.getElementById('marquee-text');

const publicTopNoticeBar = document.getElementById('public-top-notice-bar');
const topAnnouncementSummary = document.getElementById('top-announcement-summary');
const topAnnouncementSticker = document.getElementById('top-announcement-sticker');
const topAnnouncementText = document.getElementById('top-announcement-text');
const topCountdownBox = document.getElementById('top-countdown-box');
const topCountdownTitle = document.getElementById('top-countdown-title');
const topCountdownTimer = document.getElementById('top-countdown-timer');

const openPublicAnnouncementBtn = document.getElementById('open-public-announcement-btn');
const publicAnnouncementModal = document.getElementById('public-announcement-modal');
const closePublicAnnouncementBtn = document.getElementById('close-public-announcement-btn');
const confirmPublicAnnouncementBtn = document.getElementById('confirm-public-announcement-btn');
const dontShowSameAnnCheckbox = document.getElementById('dont-show-same-ann-checkbox');
const modalAnnouncementSticker = document.getElementById('modal-announcement-sticker');
const modalAnnouncementTitle = document.getElementById('modal-announcement-title');
const modalAnnouncementUpdated = document.getElementById('modal-announcement-updated');
const modalAnnouncementContentLayout = document.getElementById('modal-announcement-content-layout');
const modalAnnouncementBody = document.getElementById('modal-announcement-body');
const modalAnnouncementImageWrap = document.getElementById('modal-announcement-image-wrap');
const modalAnnouncementImage = document.getElementById('modal-announcement-image');
const modalCountdownCard = document.getElementById('modal-countdown-card');
const modalCountdownTitle = document.getElementById('modal-countdown-title');
const modalCountdownTimer = document.getElementById('modal-countdown-timer');
const modalCoachIntroSection = document.getElementById('modal-coach-intro-section');
const modalCoachCardsGrid = document.getElementById('modal-coach-cards-grid');

const openBoardManageBtn = document.getElementById('open-board-manage-btn');
const boardManageModal = document.getElementById('board-manage-modal');
const closeBoardManageBtn = document.getElementById('close-board-manage-btn');
const cancelBoardManageBtn = document.getElementById('cancel-board-manage-btn');
const saveBoardManageBtn = document.getElementById('save-board-manage-btn');
const adminCountdownEnabled = document.getElementById('admin-countdown-enabled');
const adminCountdownTitle = document.getElementById('admin-countdown-title');
const adminCountdownDatetime = document.getElementById('admin-countdown-datetime');
const adminCountdownEndmsg = document.getElementById('admin-countdown-endmsg');
const adminAnnEnabled = document.getElementById('admin-ann-enabled');
const adminAnnAutopopup = document.getElementById('admin-ann-autopopup');
const adminAnnSticker = document.getElementById('admin-ann-sticker');
const adminAnnTitle = document.getElementById('admin-ann-title');
const stickerPickerGrid = document.getElementById('sticker-picker-grid');

const adminAnnContentEditor = document.getElementById('admin-ann-content-editor');
const annFontSizeSelect = document.getElementById('ann-font-size-select');
const annCustomColorPicker = document.getElementById('ann-custom-color-picker');
const annBoldBtn = document.getElementById('ann-bold-btn');
const annUnderlineBtn = document.getElementById('ann-underline-btn');
const annHighlightBtn = document.getElementById('ann-highlight-btn');
const annClearFormatBtn = document.getElementById('ann-clear-format-btn');

const adminAnnImageFile = document.getElementById('admin-ann-image-file');
const adminAnnFileStatus = document.getElementById('admin-ann-file-status');
const adminAnnClearImageBtn = document.getElementById('admin-ann-clear-image-btn');
const adminAnnImageUrl = document.getElementById('admin-ann-image-url');
const adminAnnImagePreviewWrap = document.getElementById('admin-ann-image-preview-wrap');
const adminAnnImagePreview = document.getElementById('admin-ann-image-preview');
const adminAnnResizableBox = document.getElementById('admin-ann-resizable-box');
const adminAnnResizeHandleSe = document.getElementById('admin-ann-resize-handle-se');
const adminAnnResizeHandleE = document.getElementById('admin-ann-resize-handle-e');
const adminAnnImgWidthSlider = document.getElementById('admin-ann-img-width-slider');
const adminAnnImgSizeBadge = document.getElementById('admin-ann-img-size-badge');
const adminAnnImgResetSizeBtn = document.getElementById('admin-ann-img-reset-size-btn');
const annAlignControls = document.getElementById('ann-align-controls');

const adminAnnShowCoaches = document.getElementById('admin-ann-show-coaches');
const adminCoachProfilesList = document.getElementById('admin-coach-profiles-list');

const openQuickParseBtn = document.getElementById('open-quick-parse-btn');
const quickParseModal = document.getElementById('quick-parse-modal');
const closeQuickParseBtn = document.getElementById('close-quick-parse-btn');
const cancelQuickParseBtn = document.getElementById('cancel-quick-parse-btn');
const clearQuickParseBtn = document.getElementById('clear-quick-parse-btn');
const fillQuickExampleBtn = document.getElementById('fill-quick-example-btn');
const submitQuickParseBtn = document.getElementById('submit-quick-parse-btn');
const quickParseTextarea = document.getElementById('quick-parse-textarea');
const quickParseResult = document.getElementById('quick-parse-result');

const manageStudentsBtn = document.getElementById('manage-students-btn');
const studentGradeModal = document.getElementById('student-grade-modal');
const closeStudentGradeModalBtn = document.getElementById('close-student-grade-modal-btn');
const importStudentsFromBookingsBtn = document.getElementById('import-students-from-bookings-btn');
const studentGradeSearch = document.getElementById('student-grade-search');
const studentGradeFilter = document.getElementById('student-grade-filter');
const studentGradeList = document.getElementById('student-grade-list');
const newStudentGradeName = document.getElementById('new-student-grade-name');
const newStudentGradeSelect = document.getElementById('new-student-grade-select');
const addStudentGradeBtn = document.getElementById('add-student-grade-btn');

const openStatsBtn = document.getElementById('open-stats-btn');
const nightOnlyCheckbox = document.getElementById('night-only-checkbox');
const nightToggleWrapper = document.getElementById('night-toggle-wrapper');
const hideDayCheckbox = document.getElementById('hide-day-checkbox');
const hideDayToggleWrapper = document.getElementById('hide-day-toggle-wrapper');
const manageCoachesBtn = document.getElementById('manage-coaches-btn');
const gridTable = document.getElementById('grid-table');
const mainContainer = document.getElementById('main-container');

const toggleViewModeBtn = document.getElementById('toggle-view-mode-btn');
const modeIcon = document.getElementById('mode-icon');
const modeText = document.getElementById('mode-text');
const modeBadge = document.getElementById('mode-badge');

const adminLoginBtn = document.getElementById('admin-login-btn');
const adminLockIcon = document.getElementById('admin-lock-icon');
const adminBtnText = document.getElementById('admin-btn-text');
const loginModal = document.getElementById('login-modal');
const closeLoginBtn = document.getElementById('close-login-btn');
const adminPasswordInput = document.getElementById('admin-password-input');
const submitLoginBtn = document.getElementById('submit-login-btn');

const coachManageModal = document.getElementById('coach-manage-modal');
const closeCoachModalBtn = document.getElementById('close-coach-modal-btn');
const coachManageList = document.getElementById('coach-manage-list');
const newCoachInput = document.getElementById('new-coach-input');
const newCoach1on1 = document.getElementById('new-coach-1on1');
const newCoach1on2 = document.getElementById('new-coach-1on2');
const addCoachSubmitBtn = document.getElementById('add-coach-submit-btn');

const statsModal = document.getElementById('stats-modal');
const closeStatsModalBtn = document.getElementById('close-stats-modal-btn');
const closeStatsBtnBottom = document.getElementById('close-stats-btn-bottom');
const exportExcelBtn = document.getElementById('export-excel-btn');
const exportAllStudentsExcelBtn = document.getElementById('export-all-students-excel-btn');
const statsTypeSelect = document.getElementById('stats-type-select');
const statsTargetSelect = document.getElementById('stats-target-select');
const statsRangeSelect = document.getElementById('stats-range-select');
const singleDateSwitcher = document.getElementById('single-date-switcher');
const statsPrevDayBtn = document.getElementById('stats-prev-day-btn');
const statsSingleDateInput = document.getElementById('stats-single-date');
const statsNextDayBtn = document.getElementById('stats-next-day-btn');
const customDateRangeWrapper = document.getElementById('custom-date-range-wrapper');
const statsStartDateInput = document.getElementById('stats-start-date');
const statsEndDateInput = document.getElementById('stats-end-date');
const displayRate1on1 = document.getElementById('display-rate-1on1');
const displayRate1on2 = document.getElementById('display-rate-1on2');

const statsTargetLabel = document.getElementById('stats-target-label');
const statsCount1on1 = document.getElementById('stats-count-1on1');
const statsCount1on2 = document.getElementById('stats-count-1on2');
const statsTotalFee = document.getElementById('stats-total-fee');
const statsTableBody = document.getElementById('stats-table-body');
const statsLoadingOverlay = document.getElementById('stats-loading-overlay');

const actionBar = document.getElementById('action-bar');
const selectedCountEl = document.getElementById('selected-count');
const openBookingModalBtn = document.getElementById('open-booking-modal-btn');
const cancelSelectionBtn = document.getElementById('cancel-selection-btn');

const bookingModal = document.getElementById('booking-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalAction = document.getElementById('cancel-modal-action');
const saveBookingBtn = document.getElementById('save-booking-btn');
const deleteBookingBtn = document.getElementById('delete-booking-btn');

const typePersonalBtn = document.getElementById('type-personal-btn');
const typeClubBtn = document.getElementById('type-club-btn');
const typeOtherBtn = document.getElementById('type-other-btn');

const personalFields = document.getElementById('personal-fields');
const clubFields = document.getElementById('club-fields');
const otherFields = document.getElementById('other-fields');

const inputStudent = document.getElementById('input-student');
const autoGradePreview = document.getElementById('auto-grade-preview');
const autoGradePreviewText = document.getElementById('auto-grade-preview-text');
const quickOpenGradeMasterBtn = document.getElementById('quick-open-grade-master-btn');
const selectCoach = document.getElementById('select-coach');
const inputTimeNote = document.getElementById('input-time-note');
const inputOtherNote = document.getElementById('input-other-note');
const modalSlotsSummary = document.getElementById('modal-slots-summary');

// ==========================================
// 公告持久化與共用 Firestore 監聽
// ==========================================
function saveBoardSettings() {
  localStorage.setItem('badminton_board_settings_v1', JSON.stringify(boardSettings));
  if (window.db) {
    const boardDocRef = window.fsDoc(window.db, "settings", "board");
    return window.fsSetDoc(boardDocRef, boardSettings).catch(err => {
      console.error("公告與倒數設定儲存失敗:", err);
      alert('雲端儲存時發生錯誤（可能是圖片檔案過大），請嘗試選取較小的圖片或移除圖片後再試！');
    });
  }
  return Promise.resolve();
}

function setupOnlinePresence() {
  if (!window.db || !window.fsCollection) return;

  const myPresenceRef = window.fsDoc(window.db, "online_users", tabSessionId);
  const sendHeartbeat = () => {
    window.fsSetDoc(myPresenceRef, { lastSeen: Date.now() }).catch(() => {});
  };

  sendHeartbeat();
  if (presenceInterval) clearInterval(presenceInterval);
  presenceInterval = setInterval(sendHeartbeat, 25000);

  window.addEventListener('beforeunload', () => {
    if (window.fsDeleteDoc) {
      window.fsDeleteDoc(myPresenceRef).catch(() => {});
    }
  });

  if (onlineUnsubscribe) onlineUnsubscribe();
  const onlineColRef = window.fsCollection(window.db, "online_users");
  onlineUnsubscribe = window.fsOnSnapshot(onlineColRef, (snapshot) => {
    const now = Date.now();
    let activeCount = 0;
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const lastSeen = data && data.lastSeen ? data.lastSeen : 0;
      if (now - lastSeen < 75000) {
        activeCount++;
      } else if (now - lastSeen > 180000 && window.fsDeleteDoc) {
        window.fsDeleteDoc(docSnap.ref).catch(() => {});
      }
    });
    document.getElementById('online-user-count').innerText = Math.max(1, activeCount);
  }, (err) => {
    console.error("線上人數監聽失敗:", err);
  });
}

function setupBoardFirestoreListener() {
  if (!window.db) {
    renderPublicAnnouncementUI();
    startCountdownLoop();
    maybeAutoOpenAnnouncementModal();
    return;
  }
  if (boardUnsubscribe) boardUnsubscribe();

  const boardDocRef = window.fsDoc(window.db, "settings", "board");
  boardUnsubscribe = window.fsOnSnapshot(boardDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      boardSettings = {
        announcement: { ...boardSettings.announcement, ...(data.announcement || {}) },
        countdown: { ...boardSettings.countdown, ...(data.countdown || {}) }
      };
      localStorage.setItem('badminton_board_settings_v1', JSON.stringify(boardSettings));
    } else {
      saveBoardSettings();
    }
    renderPublicAnnouncementUI();
    startCountdownLoop();
    maybeAutoOpenAnnouncementModal();
  }, (err) => {
    console.error("公告與倒數設定監聽失敗:", err);
    renderPublicAnnouncementUI();
    startCountdownLoop();
  });
}

function setupFirestoreListener() {
  if (!window.db) {
    loadLocalStorageFallback();
    renderAll();
    return;
  }
  if (unsubscribe) unsubscribe();

  setupCoachFirestoreListener();
  setupStudentGradeFirestoreListener();
  setupBoardFirestoreListener();
  setupOnlinePresence();

  if (!bookings[currentDate]) {
    bookings[currentDate] = { eventTitle: '', nightOnly: false, hideAllSlots: false, slots: {} };
  }

  const docRef = window.fsDoc(window.db, "bookings", currentDate);
  unsubscribe = window.fsOnSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      bookings[currentDate] = docSnap.data();
    } else {
      if (currentDate === new Date().toISOString().split('T')[0] && Object.keys(bookings[currentDate].slots || {}).length === 0) {
        bookings[currentDate] = {
          eventTitle: '期中考要認真喔',
          nightOnly: false,
          hideAllSlots: false,
          slots: {
            '0_11': { student: '以家/非非', coach: '彭教練', timeNote: '18:20-19:20', type: 'personal', grade: '三年級' },
            '0_12': { student: '峻誠', coach: '彭教練', timeNote: '', type: 'personal', grade: '四年級' },
            '1_11': { student: '展誠', coach: '彭教練', timeNote: '', type: 'personal', grade: '二年級' },
            '2_12': { student: '宇澄', coach: '盧教練', timeNote: '19:00-20:00', type: 'personal', grade: '一年級' }
          }
        };
        saveData();
      } else {
        bookings[currentDate] = { eventTitle: '', nightOnly: false, hideAllSlots: false, slots: {} };
      }
    }

    nightOnlyCheckbox.checked = !!bookings[currentDate].nightOnly;
    hideDayCheckbox.checked = !!bookings[currentDate].hideAllSlots;
    updateViewModeUI();
    renderGrid();
    updateEventBannerDisplay();
  }, (error) => {
    console.error("Firestore 監聽失敗:", error);
    loadLocalStorageFallback();
    renderAll();
  });
}

function saveData(targetDate = currentDate) {
  if (window.db) {
    const docRef = window.fsDoc(window.db, "bookings", targetDate);
    window.fsSetDoc(docRef, bookings[targetDate] || { eventTitle: '', nightOnly: false, hideAllSlots: false, slots: {} }).catch(err => console.error(err));
  }
  localStorage.setItem('badminton_excel_bookings', JSON.stringify(bookings));
}

function loadLocalStorageFallback() {
  const saved = localStorage.getItem('badminton_excel_bookings');
  if (saved) {
    try { bookings = JSON.parse(saved); } catch (e) { bookings = {}; }
  }
  if (!bookings[currentDate]) {
    bookings[currentDate] = { eventTitle: '', nightOnly: false, hideAllSlots: false, slots: {} };
  }
  nightOnlyCheckbox.checked = !!bookings[currentDate].nightOnly;
  hideDayCheckbox.checked = !!bookings[currentDate].hideAllSlots;
}

async function fetchMissingDatesData(targetDates) {
  if (!window.db) return;
  const fetchPromises = targetDates.map(async (dStr) => {
    if (!bookings[dStr]) {
      try {
        const docRef = window.fsDoc(window.db, "bookings", dStr);
        const docSnap = await window.fsGetDoc(docRef);
        if (docSnap.exists()) {
          bookings[dStr] = docSnap.data();
        } else {
          bookings[dStr] = { eventTitle: '', nightOnly: false, hideAllSlots: false, slots: {} };
        }
      } catch (e) {
        console.error(`讀取日期 ${dStr} 資料失敗:`, e);
      }
    }
  });
  await Promise.all(fetchPromises);
}

function getGradeRank(gradeStr) {
  if (!gradeStr) return 99;
  if (gradeStr.includes('幼') || gradeStr.includes('幼兒園')) return 0;
  if (gradeStr.includes('一') || gradeStr.includes('1') || gradeStr.includes('小一')) return 1;
  if (gradeStr.includes('二') || gradeStr.includes('2') || gradeStr.includes('小二')) return 2;
  if (gradeStr.includes('三') || gradeStr.includes('3') || gradeStr.includes('小三')) return 3;
  if (gradeStr.includes('四') || gradeStr.includes('4') || gradeStr.includes('小四')) return 4;
  if (gradeStr.includes('五') || gradeStr.includes('5') || gradeStr.includes('小五')) return 5;
  if (gradeStr.includes('六') || gradeStr.includes('6') || gradeStr.includes('小六')) return 6;
  if (gradeStr.includes('國') || gradeStr.includes('中')) return 7;
  return 50;
}