document.addEventListener('DOMContentLoaded', () => {
  const btnOpen  = document.getElementById('settings-btn');
  const btnClose = document.getElementById('settings-close');
  const overlay  = document.getElementById('settings-overlay');

  btnOpen.addEventListener('click', () => {
    overlay.classList.remove('overlay-hidden');
  });

  btnClose.addEventListener('click', () => {
    overlay.classList.add('overlay-hidden');
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.add('overlay-hidden');
    }
  });
});
