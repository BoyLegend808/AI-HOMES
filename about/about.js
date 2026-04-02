document.addEventListener('DOMContentLoaded', () => {
  const logoText = document.querySelector('.logo-text');
  if (logoText && window.innerWidth > 480) {
    logoText.style.display = 'inline-block';
  }
});