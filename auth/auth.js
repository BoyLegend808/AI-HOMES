document.addEventListener("DOMContentLoaded", () => {
  const loginView = document.getElementById("login-view");
  const regView = document.getElementById("reg-view");
  const goToReg = document.getElementById("go-to-reg");
  const goToLogin = document.getElementById("go-to-login");
  const goToForgot = document.getElementById("go-to-forgot");
  const backToLogin = document.getElementById("back-to-login");
  const forgotView = document.getElementById("forgot-view");
  const loginButton = document.getElementById("btn-login");
  const registerButton = document.getElementById("btn-reg");
  const forgotButton = document.getElementById("btn-forgot");
  const eyeIcon =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.6"/></svg>';
  const eyeOffIcon =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4.5l18 18" stroke="currentColor" stroke-width="1.6"/><path d="M10.6 9.6A3.5 3.5 0 0 0 12 15.5c.5 0 1-.1 1.4-.3" stroke="currentColor" stroke-width="1.6"/><path d="M6.2 6.7C4 8.3 2.6 10.2 2 12c1 2.1 4.1 7 10 7 2 0 3.7-.6 5.1-1.4" stroke="currentColor" stroke-width="1.6"/><path d="M9.1 4.9C10 4.7 11 4.5 12 4.5c6.5 0 9.6 5.7 10 7-.3.7-1 2.1-2.4 3.6" stroke="currentColor" stroke-width="1.6"/></svg>';

  if (
    !loginView ||
    !regView ||
    !goToReg ||
    !goToLogin ||
    !loginButton ||
    !registerButton
  ) {
    return;
  }

  const setupPasswordToggle = (inputId, buttonId) => {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    if (!input || !button) return;

    const setState = (show) => {
      input.type = show ? "text" : "password";
      button.setAttribute("aria-pressed", String(show));
      button.setAttribute("aria-label", show ? "Hide password" : "Show password");
      button.title = show ? "Hide password" : "Show password";
      button.innerHTML = show ? eyeOffIcon : eyeIcon;
    };

    setState(false);
    button.addEventListener("click", () => {
      setState(input.type === "password");
    });
  };

  setupPasswordToggle("login-pass", "toggle-login-pass");
  setupPasswordToggle("reg-pass", "toggle-reg-pass");

  const showRegisterView = () => {
    loginView.classList.add("hidden");
    regView.classList.remove("hidden");
  };

  const showLoginView = () => {
    regView.classList.add("hidden");
    loginView.classList.remove("hidden");
    if (forgotView) forgotView.classList.add("hidden");
  };

  const showForgotView = () => {
    loginView.classList.add("hidden");
    regView.classList.add("hidden");
    if (forgotView) forgotView.classList.remove("hidden");
  };

  goToReg.addEventListener("click", showRegisterView);
  goToLogin.addEventListener("click", showLoginView);
  if (goToForgot) goToForgot.addEventListener("click", showForgotView);
  if (backToLogin) backToLogin.addEventListener("click", showLoginView);

  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") === "register") {
    showRegisterView();
  }

  if (params.get("mode") === "forgot") {
    showForgotView();
  }

  loginButton.addEventListener("click", async () => {
    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-pass");
    const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    if (!email || !password) {
      alert("Fill all fields");
      return;
    }

    const res = await window.loginUser(email, password);

    if (res.success) {
      if (res.user.role === "admin") {
        window.location.href = "../admin/admin.html";
      } else {
        window.location.href = "../home/home.html";
      }
      return;
    }

    alert(res.message);
  });

  registerButton.addEventListener("click", async () => {
    const nameInput = document.getElementById("reg-name");
    const emailInput = document.getElementById("reg-email");
    const passwordInput = document.getElementById("reg-pass");
    const phoneInput = document.getElementById("reg-phone");
    const universityInput = document.getElementById("reg-uni");

    const name = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";
    const phone = phoneInput ? phoneInput.value.trim() : "";
    const university = universityInput ? universityInput.value.trim() : "";

    if (!name || !email || !password || !university) {
      alert(
        "Please fill in all mandatory fields (Name, Email, Password, University)",
      );
      return;
    }

    const res = await window.registerUser({
      name,
      email,
      password,
      phone,
      university,
    });

    if (res.success) {
      alert("Account Created! You can now login.");
      showLoginView();
      return;
    }

    alert("Registration Error: " + res.message);
  });


      const emailInput = document.getElementById("forgot-email");
      const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
      
      // VALIDATE EMAIL
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email
