document.addEventListener('DOMContentLoaded', () => {
  const filterButtons = document.querySelectorAll('.reviews-filters button');
  const reviewCards = document.querySelectorAll('.review-card');
  const totalBadge = document.querySelector('.reviews-total-badge');

  if (filterButtons.length && reviewCards.length) {
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        const filter = button.getAttribute('data-filter');

        // 버튼 활성화 토글
        filterButtons.forEach(btn => {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');

        // 카드 필터링
        let visibleCount = 0;
        reviewCards.forEach(card => {
          const category = card.getAttribute('data-category') || '';
          if (filter === 'all' || category.includes(filter)) {
            card.style.display = 'flex';
            visibleCount++;
          } else {
            card.style.display = 'none';
          }
        });

        if (totalBadge) {
          totalBadge.textContent = `${String(visibleCount).padStart(2, '0')} REVIEWS`;
        }
      });
    });
  }
});
