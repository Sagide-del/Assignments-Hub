/* ============================================================================
   assignment-renderer.js — shared exam-paper rendering + taking logic
   ----------------------------------------------------------------------------
   Renders a full exam-taking experience (or, once submitted, a read-only
   result review) from an assignment fetched via GET /assignments/:id
   (flat `questions` + metadata-only `sections`) and, if one exists, the
   student's own submission from GET /assignments/:id/submissions.

   Usage (see frontend/student-dashboard/index.html for the real wiring):

     const handle = AssignmentRenderer.mount({
       container: document.getElementById('examContainer'),
       assignment: assignmentFromApi,
       existingSubmission: submissionFromApi || null,
       studentId: currentUser.id,
       apiOrigin: 'https://api.example.com',
       callbacks: {
         onUploadFile: async (file) => ({ url, filename }),   // POST /uploads/single
         onSaveDraft: async (answers, timeSpentSeconds) => {}, // POST .../submissions {isDraft:true}
         onSubmit:    async (answers, timeSpentSeconds) => {}, // POST .../submissions {isDraft:false}
       },
     });
     // handle.destroy() when the host page navigates away / closes the modal.

   Depends only on the DOM, Font Awesome icons (already loaded by every
   dashboard page), and assignment-styles.css. No dependency on shared/api.js
   — the host page injects its own callbacks so this file stays reusable
   anywhere an assignment needs to be rendered (today: Student Dashboard's
   exam-taking modal; tomorrow, potentially a Teacher Dashboard preview).
   ========================================================================= */

(function () {
  'use strict';

  // ==========================================================================
  // IndexedDB local draft cache
  // ----------------------------------------------------------------------------
  // A lightweight local safety net so a page refresh/crash between autosave
  // ticks never loses a student's in-progress answers. The server-side DRAFT
  // submission (see backend/src/submissions) is still the real source of
  // truth once it catches up — this only covers the gap before that.
  // ==========================================================================
  const DB_NAME = 'assignments_hub_exam_drafts';
  const DB_VERSION = 1;
  const STORE_NAME = 'drafts';

  function openDraftDB() {
    return new Promise((resolve) => {
      if (!('indexedDB' in window)) { resolve(null); return; }
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null); // degrade gracefully — this is a nice-to-have, not required
      } catch {
        resolve(null);
      }
    });
  }

  async function saveLocalDraft(id, payload) {
    const db = await openDraftDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put({ id, ...payload, savedAt: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async function loadLocalDraft(id) {
    const db = await openDraftDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async function clearLocalDraft(id) {
    const db = await openDraftDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function letterFor(index) {
    return String.fromCharCode(65 + index); // 0 -> A, 1 -> B, ...
  }

  function formatClock(totalSeconds) {
    const s = Math.max(0, Math.round(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  }

  function debounce(fn, delay) {
    let handle = null;
    return (...args) => {
      clearTimeout(handle);
      handle = setTimeout(() => fn(...args), delay);
    };
  }

  function showToast(message, type) {
    const existing = document.querySelector('.exam-toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'exam-toast';
    const colors = { success: '#2d8f5a', error: '#e53e3e', info: '#212428' };
    el.style.borderLeftColor = colors[type] || colors.info;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  function isAnswerEmpty(v) {
    return v === undefined || v === null || v === '' || v === '{}' || v === '[]';
  }

  // ==========================================================================
  // Reusable loading / empty states
  // ==========================================================================
  function renderSkeleton(container, lineCount) {
    const lines = Array.from({ length: lineCount || 6 }, (_, i) => {
      const width = i % 3 === 0 ? '40%' : i % 3 === 1 ? '90%' : '70%';
      return `<div class="exam-skeleton-line" style="width:${width};"></div>`;
    }).join('');
    container.innerHTML = `<div class="exam-skeleton">${lines}</div>`;
  }

  function renderEmptyState(container, opts) {
    const { icon, title, message } = opts || {};
    container.innerHTML = `
      <div class="exam-empty-state">
        <i class="fas ${icon || 'fa-file-circle-question'}"></i>
        <h3 style="color:var(--primary,#212428);margin-bottom:6px;">${escapeHtml(title || 'Nothing here yet')}</h3>
        <p>${escapeHtml(message || '')}</p>
      </div>
    `;
  }

  // ==========================================================================
  // Main renderer
  // ==========================================================================
  function mount(config) {
    const { container, assignment, existingSubmission, apiOrigin, studentId, callbacks } = config || {};
    if (!container) throw new Error('AssignmentRenderer.mount requires a container element');
    if (!assignment) throw new Error('AssignmentRenderer.mount requires an assignment');

    const cb = callbacks || {};
    const draftId = `a${assignment.id}_s${studentId || 'anon'}`;
    const isFinalized = !!existingSubmission && existingSubmission.status !== 'DRAFT';

    const questions = (assignment.questions || []).slice().sort((a, b) => a.order - b.order);
    const sections = (assignment.sections || []).slice().sort((a, b) => a.order - b.order);
    const answers = new Map(); // questionId -> string answer

    let timeSpentSeconds = (existingSubmission && existingSubmission.timeSpentSeconds) || 0;
    let tickHandle = null;
    let destroyed = false;
    let submitting = false;

    // ---- group questions by section (null section => flat list, backward
    // compatible with assignments built via the manual question-builder form) ----
    function groupedQuestions() {
      if (sections.length === 0) return [{ section: null, questions }];
      const bySection = new Map(sections.map((s) => [s.id, []]));
      const ungrouped = [];
      questions.forEach((q) => {
        if (q.sectionId != null && bySection.has(q.sectionId)) bySection.get(q.sectionId).push(q);
        else ungrouped.push(q);
      });
      const groups = sections.map((s) => ({ section: s, questions: bySection.get(s.id) }));
      if (ungrouped.length) groups.push({ section: null, questions: ungrouped });
      return groups;
    }

    function seedAnswers() {
      ((existingSubmission && existingSubmission.answers) || []).forEach((a) => {
        if (a.studentAnswer) answers.set(a.questionId, a.studentAnswer);
      });
    }

    // ========================================================================
    // Question-type renderers
    // ========================================================================
    function renderMcq(q) {
      const opts = Array.isArray(q.options) ? q.options : [];
      const current = answers.get(q.id);
      return `
        <div class="exam-mcq-options" role="radiogroup" aria-label="${escapeHtml(q.questionText)}">
          ${opts.map((opt, i) => `
            <label class="exam-mcq-option ${current === opt ? 'selected' : ''}" data-question-id="${q.id}">
              <span class="exam-mcq-letter">${letterFor(i)}</span>
              <input type="radio" name="q_${q.id}" value="${escapeHtml(opt)}" ${current === opt ? 'checked' : ''} class="exam-input" data-question-id="${q.id}" data-type="MULTIPLE_CHOICE" />
              <span>${escapeHtml(opt)}</span>
            </label>
          `).join('')}
        </div>
      `;
    }

    function renderTrueFalse(q) {
      const current = answers.get(q.id);
      return `
        <div class="exam-tf-options" role="radiogroup" aria-label="${escapeHtml(q.questionText)}">
          ${['true', 'false'].map((val) => `
            <label class="exam-tf-option ${current === val ? 'selected' : ''}" data-question-id="${q.id}">
              <input type="radio" name="q_${q.id}" value="${val}" ${current === val ? 'checked' : ''} class="exam-input exam-sr-only" data-question-id="${q.id}" data-type="TRUE_FALSE" />
              <i class="fas ${val === 'true' ? 'fa-check' : 'fa-times'}"></i> ${val === 'true' ? 'True' : 'False'}
            </label>
          `).join('')}
        </div>
      `;
    }

    function renderFillBlank(q) {
      const current = answers.get(q.id) || '';
      return `
        <div class="exam-fill-blank">
          <input type="text" class="exam-input" data-question-id="${q.id}" data-type="FILL_BLANK" value="${escapeHtml(current)}" placeholder="Type your answer..." />
        </div>
      `;
    }

    function renderEssay(q) {
      const current = answers.get(q.id) || '';
      return `
        <div class="exam-essay-toolbar no-print">
          <button type="button" data-cmd="bold" title="Bold"><i class="fas fa-bold"></i></button>
          <button type="button" data-cmd="italic" title="Italic"><i class="fas fa-italic"></i></button>
          <button type="button" data-cmd="underline" title="Underline"><i class="fas fa-underline"></i></button>
          <button type="button" data-cmd="insertUnorderedList" title="Bullet list"><i class="fas fa-list-ul"></i></button>
          <button type="button" data-cmd="insertOrderedList" title="Numbered list"><i class="fas fa-list-ol"></i></button>
        </div>
        <div class="exam-essay-editor exam-input" contenteditable="true" data-question-id="${q.id}" data-type="ESSAY" data-placeholder="Type your answer here..." role="textbox" aria-multiline="true" aria-label="${escapeHtml(q.questionText)}">${current}</div>
        <div class="exam-essay-wordcount" data-wordcount-for="${q.id}">0 words</div>
        <details class="exam-working-space no-print">
          <summary><i class="fas fa-calculator"></i> Working space (optional — for your own use, not graded)</summary>
          <textarea placeholder="Show your working here..." aria-label="Working space (not graded)"></textarea>
        </details>
      `;
    }

    function renderMatching(q) {
      const opts = q.options || {};
      const left = opts.left || [];
      const right = opts.right || [];
      let current = {};
      try { current = JSON.parse(answers.get(q.id) || '{}'); } catch { current = {}; }
      return `
        <table class="exam-matching-table" aria-label="${escapeHtml(q.questionText)}">
          <tbody>
            ${left.map((l, i) => `
              <tr class="exam-matching-row">
                <td>${escapeHtml(l)}</td>
                <td>
                  <select class="exam-input" data-question-id="${q.id}" data-type="MATCHING" data-left-index="${i}" aria-label="Match for ${escapeHtml(l)}">
                    <option value="">— Select —</option>
                    ${right.map((r, ri) => `<option value="${ri}" ${String(current[i]) === String(ri) ? 'selected' : ''}>${escapeHtml(r)}</option>`).join('')}
                  </select>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    function renderOrdering(q) {
      const baseOptions = Array.isArray(q.options) ? q.options : [];
      let order = baseOptions;
      const saved = answers.get(q.id);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === baseOptions.length) order = parsed;
        } catch { /* keep baseOptions */ }
      }
      return `
        <ul class="exam-ordering-list" data-question-id="${q.id}" data-type="ORDERING" aria-label="${escapeHtml(q.questionText)} — reorder with the arrows or by dragging">
          ${order.map((item, i) => `
            <li class="exam-ordering-item" draggable="true" data-value="${escapeHtml(item)}">
              <i class="fas fa-grip-vertical exam-ordering-handle no-print" aria-hidden="true"></i>
              <span class="exam-ordering-index">${i + 1}</span>
              <span>${escapeHtml(item)}</span>
              <span class="exam-ordering-buttons no-print">
                <button type="button" data-move="up" aria-label="Move '${escapeHtml(item)}' up"><i class="fas fa-chevron-up"></i></button>
                <button type="button" data-move="down" aria-label="Move '${escapeHtml(item)}' down"><i class="fas fa-chevron-down"></i></button>
              </span>
            </li>
          `).join('')}
        </ul>
      `;
    }

    function renderFileUpload(q) {
      const current = answers.get(q.id);
      return `
        <div class="exam-file-upload">
          <input type="file" class="exam-file-input" data-question-id="${q.id}" aria-label="Upload file for: ${escapeHtml(q.questionText)}" />
          <div class="exam-file-status" data-question-id="${q.id}">${current ? '<i class="fas fa-check-circle" style="color:#2d8f5a;"></i> File uploaded' : 'No file uploaded yet.'}</div>
        </div>
      `;
    }

    const RENDERERS = {
      MULTIPLE_CHOICE: renderMcq,
      TRUE_FALSE: renderTrueFalse,
      FILL_BLANK: renderFillBlank,
      ESSAY: renderEssay,
      MATCHING: renderMatching,
      ORDERING: renderOrdering,
      FILE_UPLOAD: renderFileUpload,
    };

    function renderQuestion(q, globalIndex) {
      const answered = !isAnswerEmpty(answers.get(q.id));
      const renderer = RENDERERS[q.questionType] || renderEssay;
      return `
        <div class="exam-question ${answered ? 'exam-question-answered' : ''}" id="exam-q-${q.id}" data-question-id="${q.id}">
          <div class="exam-question-head">
            <div class="exam-question-number">Q${globalIndex}. ${escapeHtml(q.questionText)}</div>
            <span class="exam-question-points">${q.points} mark${q.points === 1 ? '' : 's'}</span>
          </div>
          ${q.hint ? `<div class="exam-question-hint"><i class="fas fa-lightbulb"></i> ${escapeHtml(q.hint)}</div>` : ''}
          <div class="exam-answer-area">${renderer(q)}</div>
        </div>
      `;
    }

    function sectionMarks(group) {
      return (group.questions || []).reduce((sum, q) => sum + (q.points || 0), 0);
    }

    function renderSections() {
      let counter = 0;
      return groupedQuestions().map((group) => {
        const body = group.questions.map((q) => { counter += 1; return renderQuestion(q, counter); }).join('');
        if (!group.section) {
          return group.questions.length ? `<div class="exam-section">${body}</div>` : '';
        }
        return `
          <div class="exam-section">
            <div class="exam-section-header">
              <div>
                <div class="exam-section-name">${escapeHtml(group.section.name)}</div>
                ${group.section.description ? `<div class="exam-section-desc">${escapeHtml(group.section.description)}</div>` : ''}
              </div>
              <div class="exam-section-marks">${sectionMarks(group)} marks</div>
            </div>
            ${body}
          </div>
        `;
      }).join('');
    }

    function renderHeader() {
      return `
        <div class="exam-header">
          <div class="exam-title">${escapeHtml(assignment.title)}</div>
          <div class="exam-meta">
            <span><i class="fas fa-book"></i> ${escapeHtml(assignment.subject || '')}</span>
            <span><i class="fas fa-graduation-cap"></i> ${escapeHtml(assignment.grade || '')}</span>
            ${assignment.timeAllowedMinutes ? `<span><i class="fas fa-clock"></i> ${assignment.timeAllowedMinutes} minutes</span>` : ''}
            <span><i class="fas fa-star"></i> ${assignment.maxPoints || 0} marks total</span>
            ${assignment.dueDate ? `<span><i class="fas fa-calendar"></i> Due ${new Date(assignment.dueDate).toLocaleDateString()}</span>` : ''}
          </div>
          ${assignment.description ? `<div class="exam-description">${escapeHtml(assignment.description)}</div>` : ''}
          ${assignment.instructions ? `<div class="exam-instructions"><strong><i class="fas fa-circle-info"></i> Instructions</strong>${escapeHtml(assignment.instructions)}</div>` : ''}
        </div>
      `;
    }

    function renderStatusBar() {
      const total = questions.length;
      return `
        <div class="exam-status-bar no-print">
          <div class="exam-timer" data-role="timer"><i class="fas fa-stopwatch"></i> <span data-role="timer-text">00:00</span></div>
          <div class="exam-progress-wrap">
            <div class="exam-progress-label"><span>Progress</span><span data-role="progress-text">0 / ${total} answered</span></div>
            <div class="exam-progress-bar"><div class="fill" data-role="progress-fill" style="width:0%;"></div></div>
          </div>
          <div class="exam-autosave-status" data-role="autosave-status"><i class="fas fa-check-circle"></i> <span>Saved</span></div>
        </div>
      `;
    }

    function renderActionBar() {
      return `
        <div class="exam-action-bar no-print">
          <button type="button" class="btn btn-outline" data-action="save-draft"><i class="fas fa-save"></i> Save Draft (Ctrl+S)</button>
          <button type="button" class="btn btn-primary" data-action="submit" style="margin-left:auto;"><i class="fas fa-paper-plane"></i> Submit Assignment</button>
        </div>
      `;
    }

    function renderResultView() {
      const isGraded = existingSubmission.status === 'GRADED';
      const answersByQ = new Map(((existingSubmission.answers) || []).map((a) => [a.questionId, a]));
      const reviewRows = questions.map((q, i) => {
        const a = answersByQ.get(q.id);
        if (!a) return '';
        return `
          <div class="exam-answer-review">
            <strong>Q${i + 1}.</strong> ${escapeHtml(q.questionText)}<br/>
            <span style="color:var(--text-secondary,#4a5568);">Your answer:</span> ${a.studentAnswer ? escapeHtml(a.studentAnswer).slice(0, 300) : '<em>(none)</em>'}
            ${a.pointsAwarded != null ? `<br/><strong>Score:</strong> ${a.pointsAwarded} / ${q.points}` : ''}
            ${a.feedback ? `<br/><span style="color:var(--text-secondary,#4a5568);"><i class="fas fa-comment"></i> ${escapeHtml(a.feedback)}</span>` : ''}
          </div>
        `;
      }).join('');

      container.innerHTML = `
        <div class="exam-paper">
          ${renderHeader()}
          <div class="exam-result-banner ${isGraded ? '' : 'pending'}">
            <i class="fas ${isGraded ? 'fa-check-circle' : 'fa-hourglass-half'}" style="font-size:32px;color:${isGraded ? '#065f46' : '#92400e'};"></i>
            <h3 style="margin-top:8px;">${isGraded ? 'Graded' : 'Submitted — awaiting grading'}</h3>
            <p>Submitted ${existingSubmission.completedAt ? new Date(existingSubmission.completedAt).toLocaleString() : ''}${existingSubmission.isLate ? ' <span class="badge badge-warning">Late</span>' : ''}</p>
            ${isGraded ? `<div class="exam-result-score">${existingSubmission.score} ${assignment.maxPoints ? `/ ${assignment.maxPoints}` : ''} marks</div>` : ''}
            ${existingSubmission.feedback ? `<div class="exam-answer-review" style="margin-top:12px;"><strong>Overall feedback:</strong> ${escapeHtml(existingSubmission.feedback)}</div>` : ''}
          </div>
          ${reviewRows}
        </div>
      `;
    }

    // ========================================================================
    // Behavior
    // ========================================================================
    function collectAnswers() {
      return Array.from(answers.entries())
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([questionId, answer]) => ({ questionId, answer: String(answer) }));
    }

    function answeredCount() {
      return questions.filter((q) => !isAnswerEmpty(answers.get(q.id))).length;
    }

    function updateProgress() {
      const total = questions.length;
      const answered = answeredCount();
      const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
      const fill = container.querySelector('[data-role="progress-fill"]');
      const text = container.querySelector('[data-role="progress-text"]');
      if (fill) fill.style.width = pct + '%';
      if (text) text.textContent = `${answered} / ${total} answered`;
    }

    function markAnswered(questionId) {
      const el = container.querySelector(`.exam-question[data-question-id="${questionId}"]`);
      if (!el) return;
      el.classList.toggle('exam-question-answered', !isAnswerEmpty(answers.get(questionId)));
    }

    function setAutosaveStatus(state) {
      const el = container.querySelector('[data-role="autosave-status"]');
      if (!el) return;
      el.classList.toggle('saving', state === 'saving');
      const icon = state === 'saving' ? 'fa-circle-notch fa-spin' : state === 'error' ? 'fa-triangle-exclamation' : 'fa-check-circle';
      const text = state === 'saving' ? 'Saving...' : state === 'error' ? 'Could not save — retrying' : 'Saved';
      el.innerHTML = `<i class="fas ${icon}"></i> <span>${text}</span>`;
    }

    const persistLocal = () => saveLocalDraft(draftId, { answers: collectAnswers(), timeSpentSeconds });

    const autosaveToServer = debounce(async () => {
      if (destroyed || isFinalized) return;
      setAutosaveStatus('saving');
      try {
        if (cb.onSaveDraft) await cb.onSaveDraft(collectAnswers(), timeSpentSeconds);
        if (!destroyed) setAutosaveStatus('saved');
      } catch (err) {
        console.error('Autosave failed:', err);
        if (!destroyed) setAutosaveStatus('error');
      }
    }, 2500);

    function onAnswerChange(questionId, value) {
      answers.set(questionId, value);
      markAnswered(questionId);
      updateProgress();
      persistLocal();
      autosaveToServer();
    }

    function updateSelectedStyling(questionId, changedEl) {
      container.querySelectorAll(`[data-question-id="${questionId}"].exam-mcq-option, [data-question-id="${questionId}"].exam-tf-option`)
        .forEach((opt) => opt.classList.remove('selected'));
      const wrapper = changedEl.closest('.exam-mcq-option, .exam-tf-option');
      if (wrapper) wrapper.classList.add('selected');
    }

    function reindexOrderingList(list) {
      const questionId = Number(list.dataset.questionId);
      const items = [...list.querySelectorAll('.exam-ordering-item')];
      items.forEach((item, i) => { item.querySelector('.exam-ordering-index').textContent = String(i + 1); });
      onAnswerChange(questionId, JSON.stringify(items.map((item) => item.dataset.value)));
    }

    function wireInputs() {
      container.addEventListener('change', (e) => {
        const fileInput = e.target.closest('.exam-file-input');
        if (fileInput && fileInput.files[0]) {
          handleFileUpload(fileInput);
          return;
        }

        const el = e.target.closest('.exam-input');
        if (!el) return;
        const questionId = Number(el.dataset.questionId);
        const type = el.dataset.type;

        if (type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE') {
          onAnswerChange(questionId, el.value);
          updateSelectedStyling(questionId, el);
        } else if (type === 'FILL_BLANK') {
          onAnswerChange(questionId, el.value);
        } else if (type === 'MATCHING') {
          let current = {};
          try { current = JSON.parse(answers.get(questionId) || '{}'); } catch { current = {}; }
          const leftIndex = el.dataset.leftIndex;
          if (el.value === '') delete current[leftIndex]; else current[leftIndex] = el.value;
          onAnswerChange(questionId, JSON.stringify(current));
        }
      });

      container.addEventListener('input', (e) => {
        const el = e.target.closest('.exam-essay-editor');
        if (!el) return;
        const questionId = Number(el.dataset.questionId);
        onAnswerChange(questionId, el.innerHTML);
        const words = (el.textContent || '').trim().split(/\s+/).filter(Boolean).length;
        const wc = container.querySelector(`[data-wordcount-for="${questionId}"]`);
        if (wc) wc.textContent = `${words} word${words === 1 ? '' : 's'}`;
      });

      container.addEventListener('click', (e) => {
        const toolbarBtn = e.target.closest('.exam-essay-toolbar button');
        if (toolbarBtn) {
          e.preventDefault();
          document.execCommand(toolbarBtn.dataset.cmd, false, undefined);
          return;
        }

        const moveBtn = e.target.closest('.exam-ordering-buttons button');
        if (moveBtn) {
          const item = moveBtn.closest('.exam-ordering-item');
          const list = moveBtn.closest('.exam-ordering-list');
          const dir = moveBtn.dataset.move;
          if (dir === 'up' && item.previousElementSibling) list.insertBefore(item, item.previousElementSibling);
          else if (dir === 'down' && item.nextElementSibling) list.insertBefore(item.nextElementSibling, item);
          reindexOrderingList(list);
          return;
        }

        if (e.target.closest('[data-action="save-draft"]')) { saveDraftNow(); return; }
        if (e.target.closest('[data-action="submit"]')) { confirmAndSubmit(); return; }
      });

      // Ordering — native HTML5 drag-and-drop (buttons above are the
      // keyboard/touch-friendly fallback for the same reordering).
      container.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.exam-ordering-item');
        if (!item) return;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      container.addEventListener('dragend', (e) => {
        const item = e.target.closest('.exam-ordering-item');
        if (item) item.classList.remove('dragging');
      });
      container.addEventListener('dragover', (e) => {
        const list = e.target.closest('.exam-ordering-list');
        if (!list) return;
        e.preventDefault();
        const dragging = list.querySelector('.exam-ordering-item.dragging');
        if (!dragging) return;
        const siblings = [...list.querySelectorAll('.exam-ordering-item:not(.dragging)')];
        const after = siblings.reduce((closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = e.clientY - box.top - box.height / 2;
          return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
        if (after == null) list.appendChild(dragging); else list.insertBefore(dragging, after);
      });
      container.addEventListener('drop', (e) => {
        const list = e.target.closest('.exam-ordering-list');
        if (!list) return;
        e.preventDefault();
        reindexOrderingList(list);
      });
    }

    async function handleFileUpload(input) {
      const questionId = Number(input.dataset.questionId);
      const statusEl = container.querySelector(`.exam-file-status[data-question-id="${questionId}"]`);
      const file = input.files[0];
      if (statusEl) statusEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading ${escapeHtml(file.name)}...`;
      try {
        if (!cb.onUploadFile) throw new Error('Upload not configured');
        const result = await cb.onUploadFile(file);
        onAnswerChange(questionId, result.url);
        if (statusEl) statusEl.innerHTML = `<i class="fas fa-check-circle" style="color:#2d8f5a;"></i> ${escapeHtml(result.filename || file.name)} uploaded`;
      } catch (err) {
        if (statusEl) statusEl.innerHTML = `<span style="color:#e53e3e;"><i class="fas fa-exclamation-circle"></i> ${escapeHtml(err.message)}</span>`;
      }
    }

    async function saveDraftNow() {
      setAutosaveStatus('saving');
      try {
        if (cb.onSaveDraft) await cb.onSaveDraft(collectAnswers(), timeSpentSeconds);
        setAutosaveStatus('saved');
        showToast('Draft saved.', 'success');
      } catch (err) {
        setAutosaveStatus('error');
        showToast('Could not save draft: ' + err.message, 'error');
      }
    }

    async function confirmAndSubmit() {
      if (submitting) return;
      const total = questions.length;
      const unanswered = total - answeredCount();
      const message = unanswered > 0
        ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit anyway? You won't be able to change your answers after submitting.`
        : "Submit this assignment? You won't be able to change your answers after submitting.";
      if (!window.confirm(message)) return;
      await doSubmit();
    }

    async function doSubmit() {
      submitting = true;
      const submitBtn = container.querySelector('[data-action="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...'; }
      try {
        if (cb.onSubmit) await cb.onSubmit(collectAnswers(), timeSpentSeconds);
        await clearLocalDraft(draftId);
        stopTimer();
        showToast('Assignment submitted!', 'success');
      } catch (err) {
        showToast('Could not submit: ' + err.message, 'error');
        submitting = false;
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Assignment'; }
      }
    }

    // ---- timer: counts down if the exam has a time limit, otherwise counts up ----
    function startTimer() {
      const timerEl = container.querySelector('[data-role="timer"]');
      const textEl = container.querySelector('[data-role="timer-text"]');
      const countdownSeconds = assignment.timeAllowedMinutes ? assignment.timeAllowedMinutes * 60 : null;
      // startedAt is preserved server-side across draft resaves (see
      // SubmissionsService.create), so resuming a draft later continues the
      // same countdown rather than resetting it.
      const startedAtMs = existingSubmission && existingSubmission.startedAt
        ? new Date(existingSubmission.startedAt).getTime()
        : Date.now();

      tickHandle = setInterval(async () => {
        const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
        timeSpentSeconds = elapsed;

        if (countdownSeconds != null) {
          const remaining = countdownSeconds - elapsed;
          if (remaining <= 0) {
            if (textEl) textEl.textContent = '00:00';
            stopTimer();
            if (!submitting && !isFinalized) {
              showToast("Time's up — submitting automatically.", 'info');
              await doSubmit();
            }
            return;
          }
          if (textEl) textEl.textContent = formatClock(remaining);
          if (timerEl) timerEl.classList.toggle('exam-timer-low', remaining <= 60);
        } else if (textEl) {
          textEl.textContent = formatClock(elapsed);
        }
      }, 1000);
    }

    function stopTimer() {
      if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
    }

    function onKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveDraftNow();
      }
    }

    // ========================================================================
    // Init
    // ========================================================================
    async function init() {
      if (isFinalized) {
        renderResultView();
        return;
      }

      if (questions.length === 0) {
        renderEmptyState(container, {
          icon: 'fa-file-circle-question',
          title: 'No questions yet',
          message: 'This assignment has no questions attached — check back later or contact your teacher.',
        });
        return;
      }

      seedAnswers();

      // A more recent local draft (e.g. the tab closed before the last
      // autosave reached the server) takes precedence over the server copy.
      try {
        const local = await loadLocalDraft(draftId);
        if (local && Array.isArray(local.answers)) {
          local.answers.forEach((a) => answers.set(a.questionId, a.answer));
          if (local.timeSpentSeconds) timeSpentSeconds = Math.max(timeSpentSeconds, local.timeSpentSeconds);
        }
      } catch (err) {
        console.warn('Could not read local draft cache:', err);
      }

      container.innerHTML = `
        <div class="exam-paper">
          ${renderHeader()}
          ${renderStatusBar()}
          ${renderSections()}
          ${renderActionBar()}
        </div>
      `;

      wireInputs();
      updateProgress();
      startTimer();
      document.addEventListener('keydown', onKeydown);

      // Establishes startedAt server-side immediately, rather than waiting
      // for the first debounced autosave, so the timer's "resume where you
      // left off" behavior is correct even if the student closes the tab
      // before typing anything.
      if (!existingSubmission) autosaveToServer();
    }

    function destroy() {
      destroyed = true;
      stopTimer();
      document.removeEventListener('keydown', onKeydown);
    }

    init();

    return { destroy };
  }

  window.AssignmentRenderer = { mount, renderSkeleton, renderEmptyState };
})();
