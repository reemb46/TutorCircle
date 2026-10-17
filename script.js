// TutorCircle starter script.
// The pages show sample data only: nothing is saved yet. This file adds the
// small interactions each page needs. A real backend comes in a later sprint.

// Short message in the bottom corner.
function toast(message) {
  var box = document.getElementById('toast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast';
    box.setAttribute('role', 'status');
    document.body.appendChild(box);
  }
  box.textContent = message;
  box.hidden = false;
  clearTimeout(box.timer);
  box.timer = setTimeout(function () { box.hidden = true; }, 3500);
}

// Tabs: a button with data-tab="x" shows the panel with id="x" and hides the others in its group.
document.querySelectorAll('.tab[data-tab]').forEach(function (tab) {
  tab.addEventListener('click', function () {
    tab.parentElement.querySelectorAll('.tab[data-tab]').forEach(function (other) {
      other.classList.remove('active');
      document.getElementById(other.dataset.tab).classList.add('hidden');
    });
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.remove('hidden');
  });
});

// Forms with data-next="page.html" open that page. Sign up sends tutors to data-next-tutor instead.
document.querySelectorAll('form[data-next]').forEach(function (form) {
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var role = form.querySelector('input[name="role"]:checked');
    window.location.href = (role && role.value === 'tutor' && form.dataset.nextTutor) || form.dataset.next;
  });
});

// Forms with data-done="message" show the message and clear the form.
document.querySelectorAll('form[data-done]').forEach(function (form) {
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    toast(form.dataset.done);
    form.reset();
    if (form.dataset.hideAfter !== undefined) form.classList.add('hidden');
  });
});

// Forms with data-append="#list" add the typed text to that list (questions, announcements, decisions).
document.querySelectorAll('form[data-append]').forEach(function (form) {
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var field = form.querySelector('textarea, input[type="text"]');
    var text = field.value.trim();
    if (!text) return;
    var item = document.createElement('li');
    item.textContent = (form.dataset.prefix || '') + text;
    var when = document.createElement('small');
    when.textContent = 'Just now';
    item.appendChild(when);
    document.querySelector(form.dataset.append).prepend(item);
    form.reset();
    toast(form.dataset.message || 'Posted.');
  });
});

// Buttons with data-message show a short confirmation.
document.querySelectorAll('[data-message]').forEach(function (button) {
  button.addEventListener('click', function () { toast(button.dataset.message); });
});

// Buttons with data-toggle="#id" show or hide that element.
document.querySelectorAll('[data-toggle]').forEach(function (button) {
  button.addEventListener('click', function () {
    document.querySelector(button.dataset.toggle).classList.toggle('hidden');
  });
});

// Buttons with data-status="Approved" data-kind="ok" change the status pill in the same table row.
document.querySelectorAll('[data-status]').forEach(function (button) {
  button.addEventListener('click', function () {
    var pill = button.closest('tr').querySelector('.pill');
    pill.textContent = button.dataset.status;
    pill.className = 'pill ' + (button.dataset.kind || '');
    toast('Status changed to ' + button.dataset.status + '.');
  });
});

// Buttons with data-remove-row ask first, then remove their table row (cancel a booking).
document.querySelectorAll('[data-remove-row]').forEach(function (button) {
  button.addEventListener('click', function () {
    if (!confirm(button.dataset.removeRow)) return;
    button.closest('tr').remove();
    toast('Done. Your place is free for someone else.');
  });
});

// Find a session: search box and filters hide sessions and tutors that do not match.
var search = document.getElementById('search-text');
if (search) {
  var filters = document.querySelectorAll('.filters select');
  var applyFilters = function () {
    var words = search.value.trim().toLowerCase();
    var shown = 0;
    document.querySelectorAll('[data-session]').forEach(function (card) {
      var ok = card.textContent.toLowerCase().indexOf(words) !== -1;
      filters.forEach(function (select) {
        if (select.value && card.dataset[select.name] !== select.value) ok = false;
      });
      card.classList.toggle('hidden', !ok);
      if (ok) shown++;
    });
    document.querySelectorAll('[data-tutor]').forEach(function (card) {
      card.classList.toggle('hidden', card.textContent.toLowerCase().indexOf(words) === -1);
    });
    document.getElementById('no-results').classList.toggle('hidden', shown > 0);
  };
  search.addEventListener('input', applyFilters);
  filters.forEach(function (select) { select.addEventListener('change', applyFilters); });
  document.getElementById('search-form').addEventListener('submit', function (event) {
    event.preventDefault();
    applyFilters();
  });
}

// Session page: book and cancel change the place count; the room or link shows only after booking.
var places = document.getElementById('places');
if (places) {
  var booked = false;
  var update = function () {
    places.textContent = places.dataset.count + ' / ' + places.dataset.capacity + ' booked';
    document.getElementById('book').disabled = booked;
    document.getElementById('cancel').disabled = !booked;
    document.getElementById('location').textContent = booked ? places.dataset.location : 'Shown after you book';
  };
  document.getElementById('book').addEventListener('click', function () {
    if (Number(places.dataset.count) >= Number(places.dataset.capacity)) { toast('This session is full.'); return; }
    places.dataset.count = Number(places.dataset.count) + 1;
    booked = true;
    update();
    toast('Place booked. We will remind you 1 day before.');
  });
  document.getElementById('cancel').addEventListener('click', function () {
    places.dataset.count = Number(places.dataset.count) - 1;
    booked = false;
    update();
    toast('Booking cancelled. Your place is free for someone else.');
  });
  update();
}
