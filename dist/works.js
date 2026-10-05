// 수강생 작품 활동 (Works) 인터랙션 및 필터링 스크립트
document.addEventListener('DOMContentLoaded', () => {
  const filterButtons = document.querySelectorAll('.works-filters button[data-filter]');
  const studentCards = document.querySelectorAll('.works-grid .student-card');
  const countDisplay = document.querySelector('.works-total-badge');

  if (!filterButtons.length || !studentCards.length) return;

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');

      const filterValue = btn.getAttribute('data-filter');
      let visibleCount = 0;

      studentCards.forEach(card => {
        const categories = (card.getAttribute('data-category') || '').split(' ');
        if (filterValue === 'all' || categories.includes(filterValue)) {
          card.removeAttribute('hidden');
          visibleCount++;
        } else {
          card.setAttribute('hidden', '');
        }
      });

      if (countDisplay) {
        countDisplay.textContent = `${String(visibleCount).padStart(2, '0')} ACTORS`;
      }
    });
  });
});
