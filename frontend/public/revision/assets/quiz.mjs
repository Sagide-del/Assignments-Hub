export function scoreQuiz(answers, correctAnswers) {
  return correctAnswers.reduce((score, answer, index) => score + Number(answers[index] === answer), 0);
}

// These events stay inside the page. No personal information, answers, cookies,
// storage or network analytics are collected by this module.
export function emitLearningEvent(name, resource) {
  window.dispatchEvent(new CustomEvent('assignmenthub:learning', {
    detail: { name, resource },
  }));
}

export function initializeQuiz(doc = document) {
  const form = doc.querySelector('[data-quiz]');
  if (!form) return;
  const questions = [...form.querySelectorAll('fieldset')];
  const result = doc.querySelector('#quiz-result');
  const submit = form.querySelector('[type="submit"]');
  let started = false;
  let completed = false;
  form.addEventListener('change', () => {
    if (!started) {
      emitLearningEvent('quiz_start', form.dataset.quiz);
      started = true;
    }
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (completed || !form.reportValidity()) return;
    const answers = questions.map((question) => Number(question.querySelector('input:checked').value));
    const correct = questions.map((question) => Number(question.dataset.answer));
    const score = scoreQuiz(answers, correct);
    result.textContent = `You scored ${score} out of ${questions.length}. ${score === questions.length ? 'Well done! Try another topic.' : 'Read the worked answers below, then try again.'} This practice score is not saved to an account.`;
    result.hidden = false;
    questions.forEach((question, index) => {
      const feedback = question.querySelector('[data-feedback]');
      feedback.textContent = answers[index] === correct[index] ? 'Correct.' : `Review this question. Correct answer: ${question.querySelectorAll('input')[correct[index]].nextElementSibling.textContent}.`;
      feedback.hidden = false;
      question.querySelectorAll('input').forEach((input) => { input.disabled = true; });
    });
    doc.querySelectorAll('.worked-answer').forEach((answer) => { answer.open = true; });
    submit.disabled = true;
    completed = true;
    result.focus();
    emitLearningEvent('quiz_complete', form.dataset.quiz);
  });
  form.addEventListener('reset', () => {
    questions.forEach((question) => {
      question.querySelectorAll('input').forEach((input) => { input.disabled = false; });
      question.querySelector('[data-feedback]').hidden = true;
    });
    doc.querySelectorAll('.worked-answer').forEach((answer) => { answer.open = false; });
    result.hidden = true;
    submit.disabled = false;
    started = false;
    completed = false;
    questions[0].querySelector('input').focus();
  });
}

if (typeof document !== 'undefined') {
  initializeQuiz();
  document.querySelectorAll('[data-register]').forEach((link) => {
    link.addEventListener('click', () => emitLearningEvent('registration_click', link.dataset.register));
  });
}
