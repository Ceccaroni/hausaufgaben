(function(){
  function showCompletionToast() {
    const phrases = window.FEEDBACK_PHRASES || [];
    const msg = phrases[Math.floor(Math.random() * phrases.length)] || "Aufgabe erledigt ✓";
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('toast-hidden');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      toast.style.transition = 'none';
    }
    setTimeout(() => {
      toast.classList.add('toast-hidden');
    }, 2500);
  }
  window.showCompletionToast = showCompletionToast;
})();
