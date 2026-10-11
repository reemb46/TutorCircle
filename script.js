// TutorCircle starter script.
// The pages are static for now: this file only makes the tabs switch and
// sends the forms to the next page. Real data comes in a later sprint.

// Tabs: a button with data-tab="x" shows the element with id="x"
// and hides the other panels in the same group.
document.querySelectorAll('.tab').forEach(function (tab) {
  tab.addEventListener('click', function () {
    var group = tab.parentElement;
    group.querySelectorAll('.tab').forEach(function (other) {
      other.classList.remove('active');
      document.getElementById(other.dataset.tab).classList.add('hidden');
    });
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.remove('hidden');
  });
});

// Forms: a form with data-next="page.html" opens that page when submitted.
document.querySelectorAll('form[data-next]').forEach(function (form) {
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    window.location.href = form.dataset.next;
  });
});

// Buttons with data-message show a simple confirmation.
document.querySelectorAll('[data-message]').forEach(function (button) {
  button.addEventListener('click', function () {
    alert(button.dataset.message);
  });
});
