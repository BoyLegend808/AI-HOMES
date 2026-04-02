
/* Extracted from contact.html */
document.addEventListener('DOMContentLoaded', () => {
      // Show logo text on inner pages
      const lt = document.querySelector('.logo-text');
      if(lt && window.innerWidth > 480) lt.style.display = 'inline-block';
    });

    function submitContact() {
      const name = document.getElementById('c-name').value;
      const email = document.getElementById('c-email').value;
      const msg = document.getElementById('c-message').value;

      if(!name || !email || !msg) {
        alert("Please fill in all fields.");
        return;
      }

      // Simulate sending
      alert("Thanks for reaching out, " + name + "! Our team will reply shortly via email.");
      document.getElementById('c-name').value = '';
      document.getElementById('c-email').value = '';
      document.getElementById('c-message').value = '';
    }
