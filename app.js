(() => {
  "use strict";

  const STORAGE_KEY = "vardiya-plani-web-v1";
  const TARGET_MINUTES = 45 * 60;
  const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  const DAY_LONG_NAMES = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
  const SHIFT_IDS = ["morning", "afternoon", "full", "off"];
  const WORK_SHIFT_IDS = SHIFT_IDS.slice(0, 3);
  const SHIFTS = {
    morning: { label: "Sabah", short: "S", time: "08:45–17:00", minutes: 435 },
    afternoon: { label: "Öğlen", short: "Ö", time: "14:00–21:15", minutes: 375 },
    full: { label: "Full", short: "F", time: "08:45–21:15", minutes: 660 },
    off: { label: "İzin", short: "İ", time: "Çalışma yok", minutes: 0 },
  };

  const DEFAULT_EMPLOYEES = ["Oğuz", "Ekrem", "Faruk", "Deniz"].map((name, index) => ({
    id: `person-${index + 1}`,
    name,
    allowed: [...WORK_SHIFT_IDS],
    offPreference: "auto",
  }));

  const elements = {
    employeeSettings: document.querySelector("#employeeSettings"),
    weekRange: document.querySelector("#weekRange"),
    weekYear: document.querySelector("#weekYear"),
    previousWeek: document.querySelector("#previousWeek"),
    nextWeek: document.querySelector("#nextWeek"),
    currentWeek: document.querySelector("#currentWeek"),
    generateSchedule: document.querySelector("#generateSchedule"),
    clearSchedule: document.querySelector("#clearSchedule"),
    resetSettings: document.querySelector("#resetSettings"),
    scheduleContent: document.querySelector("#scheduleContent"),
    issues: document.querySelector("#issues"),
    shiftDialog: document.querySelector("#shiftDialog"),
    dialogTitle: document.querySelector("#dialogTitle"),
    dialogSubtitle: document.querySelector("#dialogSubtitle"),
    shiftOptions: document.querySelector("#shiftOptions"),
    closeDialog: document.querySelector("#closeDialog"),
    toast: document.querySelector("#toast"),
  };

  const stored = loadStoredState();
  const state = {
    weekStart: toIsoDate(getMonday(new Date())),
    employees: sanitizeEmployees(stored.employees),
    schedules: stored.schedules && typeof stored.schedules === "object" ? stored.schedules : {},
    editing: null,
    toastTimer: null,
  };

  function cloneDefaults() {
    return DEFAULT_EMPLOYEES.map((employee) => ({ ...employee, allowed: [...employee.allowed] }));
  }

  function sanitizeEmployees(employees) {
    if (!Array.isArray(employees) || employees.length !== 4) return cloneDefaults();

    return employees.map((employee, index) => {
      const fallback = DEFAULT_EMPLOYEES[index];
      const allowed = Array.isArray(employee.allowed)
        ? employee.allowed.filter((shiftId) => WORK_SHIFT_IDS.includes(shiftId))
        : [...fallback.allowed];
      const offPreference = employee.offPreference === "auto"
        || Number.isInteger(Number(employee.offPreference)) && Number(employee.offPreference) >= 0 && Number(employee.offPreference) <= 6
        ? String(employee.offPreference)
        : "auto";

      return {
        id: fallback.id,
        name: String(employee.name || fallback.name).slice(0, 24),
        allowed,
        offPreference,
      };
    });
  }

  function loadStoredState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        employees: state.employees,
        schedules: state.schedules,
      }));
    } catch {
      showToast("Tarayıcı kaydı kullanılamadı.");
    }
  }

  function parseIsoDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function toIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getMonday(date) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    const day = copy.getDay() || 7;
    copy.setDate(copy.getDate() - day + 1);
    return copy;
  }

  function addDays(dateOrIso, amount) {
    const date = typeof dateOrIso === "string" ? parseIsoDate(dateOrIso) : new Date(dateOrIso);
    date.setDate(date.getDate() + amount);
    return date;
  }

  function getWeekDates() {
    return DAY_NAMES.map((_, index) => toIsoDate(addDays(state.weekStart, index)));
  }

  function formatDayMonth(isoDate) {
    return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" })
      .format(parseIsoDate(isoDate))
      .replace(".", "");
  }

  function formatLongDate(isoDate) {
    return new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" })
      .format(parseIsoDate(isoDate));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `${hours}s ${remainder}d` : `${hours}s`;
  }

  function getCurrentSchedule() {
    return state.schedules[state.weekStart];
  }

  function render() {
    renderWeekHeading();
    renderEmployeeSettings();
    renderSchedule();
  }

  function renderWeekHeading() {
    const dates = getWeekDates();
    const start = parseIsoDate(dates[0]);
    const end = parseIsoDate(dates[6]);
    elements.weekRange.textContent = `${formatDayMonth(dates[0])} – ${formatDayMonth(dates[6])}`;
    elements.weekYear.textContent = start.getFullYear() === end.getFullYear()
      ? String(start.getFullYear())
      : `${start.getFullYear()} – ${end.getFullYear()}`;
  }

  function renderEmployeeSettings() {
    elements.employeeSettings.innerHTML = state.employees.map((employee) => `
      <div class="employee-setting-row" data-employee-id="${employee.id}">
        <input
          class="name-input"
          type="text"
          maxlength="24"
          aria-label="Personel adı"
          value="${escapeHtml(employee.name)}"
        />
        <div class="allowed-shifts" aria-label="${escapeHtml(employee.name)} çalışabileceği vardiyalar">
          ${WORK_SHIFT_IDS.map((shiftId) => `
            <label class="shift-toggle" title="${SHIFTS[shiftId].label}">
              <input
                type="checkbox"
                data-shift-id="${shiftId}"
                ${employee.allowed.includes(shiftId) ? "checked" : ""}
                aria-label="${SHIFTS[shiftId].label} vardiyasında çalışabilir"
              />
              <span class="toggle-${shiftId}">${SHIFTS[shiftId].short}</span>
            </label>
          `).join("")}
        </div>
        <select class="off-select" aria-label="${escapeHtml(employee.name)} izin günü">
          <option value="auto" ${employee.offPreference === "auto" ? "selected" : ""}>Otomatik</option>
          ${DAY_LONG_NAMES.map((day, index) => `
            <option value="${index}" ${employee.offPreference === String(index) ? "selected" : ""}>${day}</option>
          `).join("")}
        </select>
      </div>
    `).join("");
  }

  function renderSchedule() {
    const schedule = getCurrentSchedule();
    elements.clearSchedule.hidden = !schedule;

    if (!schedule?.assignments) {
      elements.issues.innerHTML = "";
      elements.scheduleContent.innerHTML = `
        <div class="empty-state">
          <div>
            <div class="empty-calendar" aria-hidden="true">7</div>
            <h3>Bu haftanın planı hazır değil</h3>
            <p>Soldaki izin ve vardiya tercihlerini kontrol edip “Planı oluştur” düğmesine basın.</p>
          </div>
        </div>
      `;
      return;
    }

    const issues = validateSchedule(schedule.assignments);
    renderIssues(issues);
    renderScheduleGrid(schedule.assignments);
  }

  function renderIssues(issues) {
    if (!issues.length) {
      elements.issues.innerHTML = '<p class="issue issue-success">Plan temel kuralları sağlıyor.</p>';
      return;
    }

    elements.issues.innerHTML = issues.slice(0, 5).map((issue) => `
      <p class="issue issue-${issue.level}">${escapeHtml(issue.message)}</p>
    `).join("");
  }

  function renderScheduleGrid(assignments) {
    const dates = getWeekDates();
    const totals = getEmployeeTotals(assignments);
    const coverage = getCoverage(assignments);
    const cells = [];

    cells.push('<div class="grid-cell grid-header">Personel</div>');
    dates.forEach((date, dayIndex) => {
      cells.push(`
        <div class="grid-cell grid-header day-header">
          <span>${DAY_NAMES[dayIndex]}</span>
          <strong>${parseIsoDate(date).getDate()}</strong>
        </div>
      `);
    });
    cells.push('<div class="grid-cell grid-header">Toplam</div>');

    state.employees.forEach((employee) => {
      const minutes = totals[employee.id] || 0;
      cells.push(`
        <div class="grid-cell person-cell">
          <strong>${escapeHtml(employee.name)}</strong>
          <small>${minutes >= 44 * 60 && minutes <= 46 * 60 ? "hedefte" : "kontrol et"}</small>
        </div>
      `);

      dates.forEach((date) => {
        const shiftId = assignments[date]?.[employee.id] || "off";
        const shift = SHIFTS[shiftId] || SHIFTS.off;
        cells.push(`
          <div class="grid-cell">
            <button
              class="shift-cell shift-${shiftId}"
              type="button"
              data-date="${date}"
              data-employee-id="${employee.id}"
              title="${escapeHtml(employee.name)} · ${formatLongDate(date)} · ${shift.label}"
              aria-label="${escapeHtml(employee.name)}, ${formatLongDate(date)}: ${shift.label}. Değiştirmek için tıklayın."
            >${shift.short}</button>
          </div>
        `);
      });

      cells.push(`
        <div class="grid-cell total-cell">
          <span>${formatMinutes(minutes)}</span>
          <small>haftalık</small>
        </div>
      `);
    });

    [
      { label: "Açılış", key: "opening" },
      { label: "Kapanış", key: "closing" },
    ].forEach((row) => {
      cells.push(`<div class="grid-cell coverage-label">${row.label}</div>`);
      dates.forEach((date) => {
        const count = coverage[date][row.key];
        cells.push(`
          <div class="grid-cell coverage-cell ${count >= 2 ? "coverage-good" : "coverage-bad"}">
            ${count} kişi
          </div>
        `);
      });
      cells.push('<div class="grid-cell coverage-cell">—</div>');
    });

    elements.scheduleContent.innerHTML = `
      <div class="schedule-wrap">
        <div class="schedule-grid" role="table" aria-label="Haftalık vardiya planı">
          ${cells.join("")}
        </div>
      </div>
      <div class="schedule-legend" aria-label="Vardiya açıklamaları">
        ${SHIFT_IDS.map((shiftId) => `
          <span class="legend-item">
            <span class="legend-badge shift-${shiftId}">${SHIFTS[shiftId].short}</span>
            ${SHIFTS[shiftId].label}
          </span>
        `).join("")}
        <span class="legend-note">Vardiyayı değiştirmek için hücreye tıklayın.</span>
      </div>
    `;
  }

  function getEmployeeTotals(assignments) {
    const totals = Object.fromEntries(state.employees.map((employee) => [employee.id, 0]));
    getWeekDates().forEach((date) => {
      state.employees.forEach((employee) => {
        const shiftId = assignments[date]?.[employee.id] || "off";
        totals[employee.id] += SHIFTS[shiftId]?.minutes || 0;
      });
    });
    return totals;
  }

  function getCoverage(assignments) {
    return Object.fromEntries(getWeekDates().map((date) => {
      let opening = 0;
      let closing = 0;
      state.employees.forEach((employee) => {
        const shiftId = assignments[date]?.[employee.id] || "off";
        if (shiftId === "morning" || shiftId === "full") opening += 1;
        if (shiftId === "afternoon" || shiftId === "full") closing += 1;
      });
      return [date, { opening, closing }];
    }));
  }

  function validateSchedule(assignments) {
    const issues = [];
    const dates = getWeekDates();
    const totals = getEmployeeTotals(assignments);
    const coverage = getCoverage(assignments);

    dates.forEach((date, dayIndex) => {
      if (coverage[date].opening < 2) {
        issues.push({ level: "error", message: `${DAY_LONG_NAMES[dayIndex]} açılışında yalnızca ${coverage[date].opening} personel var.` });
      }
      if (coverage[date].closing < 2) {
        issues.push({ level: "error", message: `${DAY_LONG_NAMES[dayIndex]} kapanışında yalnızca ${coverage[date].closing} personel var.` });
      }
      const offCount = state.employees.filter((employee) => (assignments[date]?.[employee.id] || "off") === "off").length;
      if (offCount > 1) {
        issues.push({ level: "warning", message: `${DAY_LONG_NAMES[dayIndex]} günü ${offCount} personel izinli; bu yalnızca ekstrem durumlarda önerilir.` });
      }
    });

    state.employees.forEach((employee) => {
      const shifts = dates.map((date) => assignments[date]?.[employee.id] || "off");
      const offCount = shifts.filter((shiftId) => shiftId === "off").length;
      if (offCount !== 1) {
        issues.push({ level: "warning", message: `${employee.name} için haftalık izin sayısı ${offCount}.` });
      }
      if (totals[employee.id] < 44 * 60 || totals[employee.id] > 46 * 60) {
        issues.push({ level: "warning", message: `${employee.name} toplam ${formatMinutes(totals[employee.id])} çalışıyor; hedef yaklaşık 45 saat.` });
      }
      for (let index = 1; index < shifts.length; index += 1) {
        if (shifts[index] === "full" && shifts[index - 1] === "full") {
          issues.push({ level: "warning", message: `${employee.name} art arda iki gün Full çalışıyor.` });
          break;
        }
      }
    });

    return issues;
  }

  function generateSchedule() {
    const dates = getWeekDates();
    const offDays = resolveOffDays();
    let beam = [{
      assignments: {},
      minutes: Object.fromEntries(state.employees.map((employee) => [employee.id, 0])),
      lastShift: {},
      score: 0,
    }];

    dates.forEach((date, dayIndex) => {
      const offIds = new Set(state.employees.filter((employee) => offDays[employee.id] === dayIndex).map((employee) => employee.id));
      const candidates = buildDayCandidates(offIds);
      const nextBeam = [];

      beam.forEach((partial) => {
        candidates.forEach((candidate) => {
          const minutes = { ...partial.minutes };
          const lastShift = { ...partial.lastShift };
          let score = partial.score + candidate.baseScore;

          state.employees.forEach((employee) => {
            const shiftId = candidate.assignments[employee.id];
            minutes[employee.id] += SHIFTS[shiftId].minutes;

            if (shiftId === "full" && partial.lastShift[employee.id] === "full") score += 230;
            if (shiftId !== "off" && partial.lastShift[employee.id] === shiftId) score += 3;

            if (offDays[employee.id] === dayIndex + 1) score += shiftId === "morning" ? -18 : 16;
            if (offDays[employee.id] === dayIndex - 1) score += shiftId === "afternoon" ? -18 : 16;
            lastShift[employee.id] = shiftId;
          });

          const progressTarget = TARGET_MINUTES * ((dayIndex + 1) / 7);
          state.employees.forEach((employee) => {
            score += ((minutes[employee.id] - progressTarget) ** 2) / 1600;
          });

          nextBeam.push({
            assignments: { ...partial.assignments, [date]: candidate.assignments },
            minutes,
            lastShift,
            score,
          });
        });
      });

      nextBeam.sort((a, b) => a.score - b.score);
      beam = nextBeam.slice(0, 500);
    });

    beam.forEach((result) => {
      state.employees.forEach((employee) => {
        result.score += ((result.minutes[employee.id] - TARGET_MINUTES) ** 2) / 70;
      });
    });
    beam.sort((a, b) => a.score - b.score);

    state.schedules[state.weekStart] = {
      assignments: beam[0].assignments,
      generatedAt: new Date().toISOString(),
    };
    saveState();
    renderSchedule();
    showToast("Haftalık plan oluşturuldu.");
  }

  function resolveOffDays() {
    const result = {};
    const dayLoads = Array(7).fill(0);

    state.employees.forEach((employee) => {
      if (employee.offPreference !== "auto") {
        const day = Number(employee.offPreference);
        result[employee.id] = day;
        dayLoads[day] += 1;
      }
    });

    const weekSeed = Math.floor(parseIsoDate(state.weekStart).getTime() / (7 * 24 * 60 * 60 * 1000));
    state.employees.forEach((employee, employeeIndex) => {
      if (employee.offPreference !== "auto") return;
      const start = Math.abs(weekSeed + employeeIndex) % 7;
      const rankedDays = Array.from({ length: 7 }, (_, offset) => (start + offset) % 7)
        .sort((a, b) => dayLoads[a] - dayLoads[b] || ((a - start + 7) % 7) - ((b - start + 7) % 7));
      result[employee.id] = rankedDays[0];
      dayLoads[rankedDays[0]] += 1;
    });

    return result;
  }

  function buildDayCandidates(offIds) {
    const options = state.employees.map((employee) => {
      if (offIds.has(employee.id)) return ["off"];
      return employee.allowed.length ? employee.allowed : ["off"];
    });
    const combinations = [];

    function visit(employeeIndex, assignments) {
      if (employeeIndex === state.employees.length) {
        let opening = 0;
        let closing = 0;
        let fullCount = 0;
        let workingCount = 0;

        state.employees.forEach((employee) => {
          const shiftId = assignments[employee.id];
          if (shiftId === "morning" || shiftId === "full") opening += 1;
          if (shiftId === "afternoon" || shiftId === "full") closing += 1;
          if (shiftId === "full") fullCount += 1;
          if (shiftId !== "off") workingCount += 1;
        });

        const openingDeficit = Math.max(0, 2 - opening);
        const closingDeficit = Math.max(0, 2 - closing);
        const coverageExcess = Math.max(0, opening - 2) + Math.max(0, closing - 2);
        combinations.push({
          assignments: { ...assignments },
          valid: openingDeficit === 0 && closingDeficit === 0,
          baseScore: (openingDeficit + closingDeficit) * 10000 + coverageExcess * 60 + fullCount * 25 + (4 - workingCount) * 2,
        });
        return;
      }

      const employee = state.employees[employeeIndex];
      options[employeeIndex].forEach((shiftId) => {
        assignments[employee.id] = shiftId;
        visit(employeeIndex + 1, assignments);
      });
    }

    visit(0, {});
    const valid = combinations.filter((candidate) => candidate.valid);
    const candidates = valid.length ? valid : combinations;
    return candidates.sort((a, b) => a.baseScore - b.baseScore).slice(0, 18);
  }

  function openShiftDialog(date, employeeId) {
    const employee = state.employees.find((person) => person.id === employeeId);
    if (!employee) return;
    state.editing = { date, employeeId };
    elements.dialogTitle.textContent = employee.name;
    elements.dialogSubtitle.textContent = formatLongDate(date);
    elements.shiftOptions.innerHTML = SHIFT_IDS.map((shiftId) => {
      const shift = SHIFTS[shiftId];
      const disabled = shiftId !== "off" && !employee.allowed.includes(shiftId);
      return `
        <button
          class="shift-option shift-${shiftId}"
          type="button"
          data-shift-id="${shiftId}"
          ${disabled ? "disabled" : ""}
        >
          <span class="option-letter">${shift.short}</span>
          <span><strong>${shift.label}</strong><small>${shift.time}</small></span>
          <span class="option-arrow" aria-hidden="true">›</span>
        </button>
      `;
    }).join("");

    if (typeof elements.shiftDialog.showModal === "function") elements.shiftDialog.showModal();
    else elements.shiftDialog.setAttribute("open", "");
  }

  function closeShiftDialog() {
    state.editing = null;
    if (typeof elements.shiftDialog.close === "function") elements.shiftDialog.close();
    else elements.shiftDialog.removeAttribute("open");
  }

  function updateAssignment(shiftId) {
    const schedule = getCurrentSchedule();
    if (!state.editing || !schedule?.assignments || !SHIFT_IDS.includes(shiftId)) return;
    schedule.assignments[state.editing.date][state.editing.employeeId] = shiftId;
    saveState();
    closeShiftDialog();
    renderSchedule();
    showToast("Vardiya güncellendi.");
  }

  function changeWeek(amount) {
    state.weekStart = toIsoDate(addDays(state.weekStart, amount * 7));
    renderWeekHeading();
    renderSchedule();
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("visible");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 2200);
  }

  elements.employeeSettings.addEventListener("input", (event) => {
    const row = event.target.closest("[data-employee-id]");
    if (!row || !event.target.classList.contains("name-input")) return;
    const employee = state.employees.find((person) => person.id === row.dataset.employeeId);
    if (!employee) return;
    employee.name = event.target.value.trimStart().slice(0, 24) || "Personel";
    saveState();
  });

  elements.employeeSettings.addEventListener("change", (event) => {
    const row = event.target.closest("[data-employee-id]");
    if (!row) return;
    const employee = state.employees.find((person) => person.id === row.dataset.employeeId);
    if (!employee) return;

    if (event.target.matches('[type="checkbox"][data-shift-id]')) {
      const shiftId = event.target.dataset.shiftId;
      employee.allowed = event.target.checked
        ? [...new Set([...employee.allowed, shiftId])]
        : employee.allowed.filter((item) => item !== shiftId);
    }
    if (event.target.classList.contains("off-select")) employee.offPreference = event.target.value;
    saveState();
  });

  elements.scheduleContent.addEventListener("click", (event) => {
    const button = event.target.closest(".shift-cell");
    if (button) openShiftDialog(button.dataset.date, button.dataset.employeeId);
  });

  elements.shiftOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-shift-id]");
    if (button && !button.disabled) updateAssignment(button.dataset.shiftId);
  });

  elements.previousWeek.addEventListener("click", () => changeWeek(-1));
  elements.nextWeek.addEventListener("click", () => changeWeek(1));
  elements.currentWeek.addEventListener("click", () => {
    state.weekStart = toIsoDate(getMonday(new Date()));
    renderWeekHeading();
    renderSchedule();
  });
  elements.generateSchedule.addEventListener("click", generateSchedule);
  elements.closeDialog.addEventListener("click", closeShiftDialog);
  elements.shiftDialog.addEventListener("cancel", () => { state.editing = null; });

  elements.clearSchedule.addEventListener("click", () => {
    if (!window.confirm("Bu haftanın planı silinsin mi?")) return;
    delete state.schedules[state.weekStart];
    saveState();
    renderSchedule();
    showToast("Haftalık plan silindi.");
  });

  elements.resetSettings.addEventListener("click", () => {
    if (!window.confirm("Personel ve izin ayarları başlangıç hâline dönsün mü?")) return;
    state.employees = cloneDefaults();
    delete state.schedules[state.weekStart];
    saveState();
    render();
    showToast("Ayarlar sıfırlandı.");
  });

  render();
})();
