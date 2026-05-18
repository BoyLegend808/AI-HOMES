document.addEventListener("DOMContentLoaded", () => {
  const loginView  = document.getElementById("login-view");
  const regView    = document.getElementById("reg-view");
  const goToReg    = document.getElementById("go-to-reg");
  const goToLogin  = document.getElementById("go-to-login");
  const goToForgot = document.getElementById("go-to-forgot");
  const backToLogin    = document.getElementById("back-to-login");
  const forgotView     = document.getElementById("forgot-view");
  const loginButton    = document.getElementById("btn-login");
  const registerButton = document.getElementById("btn-reg");
  const forgotButton   = document.getElementById("btn-forgot");

  const eyeIcon    = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.6"/></svg>';
  const eyeOffIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4.5l18 18" stroke="currentColor" stroke-width="1.6"/><path d="M10.6 9.6A3.5 3.5 0 0 0 12 15.5c.5 0 1-.1 1.4-.3" stroke="currentColor" stroke-width="1.6"/><path d="M6.2 6.7C4 8.3 2.6 10.2 2 12c1 2.1 4.1 7 10 7 2 0 3.7-.6 5.1-1.4" stroke="currentColor" stroke-width="1.6"/><path d="M9.1 4.9C10 4.7 11 4.5 12 4.5c6.5 0 9.6 5.7 10 7-.3.7-1 2.1-2.4 3.6" stroke="currentColor" stroke-width="1.6"/></svg>';

  if (!loginView || !regView || !goToReg || !goToLogin || !loginButton || !registerButton) return;

  // ── Hint helpers ─────────────────────────────────────────────────────────────
  const forgotHint = document.getElementById("forgot-hint");
  const loginHint  = document.getElementById("login-hint");
  const regHint    = document.getElementById("reg-hint");

  const makeHintSetter = (el) => (text, type = "info") => {
    if (!el) return;
    el.textContent = text || "";
    el.style.color = type === "error" ? "#f87171" : type === "success" ? "#34d399" : "var(--text-muted)";
    el.style.display = text ? "block" : "";
    el.style.visibility = text ? "visible" : "";
    el.style.opacity = text ? "1" : "";
  };

  const setForgotHint = makeHintSetter(forgotHint);
  const setLoginHint  = makeHintSetter(loginHint);
  const setRegHint    = makeHintSetter(regHint);

  // ── Password toggle ───────────────────────────────────────────────────────────
  const setupPasswordToggle = (inputId, buttonId) => {
    const input  = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    if (!input || !button) return;
    const setState = (show) => {
      input.type = show ? "text" : "password";
      button.setAttribute("aria-pressed", String(show));
      button.setAttribute("aria-label", show ? "Hide password" : "Show password");
      button.title   = show ? "Hide password" : "Show password";
      button.innerHTML = show ? eyeOffIcon : eyeIcon;
    };
    setState(false);
    button.addEventListener("click", () => setState(input.type === "password"));
  };

  setupPasswordToggle("login-pass",  "toggle-login-pass");
  setupPasswordToggle("reg-pass",    "toggle-reg-pass");

  // ── Real-time email validation on forgot form ─────────────────────────────────
  const forgotEmailInput = document.getElementById("forgot-email");
  if (forgotEmailInput) {
    forgotEmailInput.addEventListener("input", () => {
      const email = forgotEmailInput.value.trim();
      if (email && !window.Security?.isValidEmail(email)) {
        setForgotHint("Please enter a valid email address", "error");
      } else {
        setForgotHint("", "info");
      }
    });
  }

  // ── View switchers ────────────────────────────────────────────────────────────
  const showRegisterView = () => {
    loginView.classList.add("hidden");
    regView.classList.remove("hidden");
  };

  const showLoginView = () => {
    regView.classList.add("hidden");
    loginView.classList.remove("hidden");
    if (forgotView) forgotView.classList.add("hidden");
    setLoginHint("", "info");
    setRegHint("", "info");
    setForgotHint("", "info");
  };

  const showForgotView = () => {
    loginView.classList.add("hidden");
    regView.classList.add("hidden");
    if (forgotView) forgotView.classList.remove("hidden");
  };

  goToReg.addEventListener("click", showRegisterView);
  goToLogin.addEventListener("click", showLoginView);
  if (goToForgot)  goToForgot.addEventListener("click", showForgotView);
  if (backToLogin) backToLogin.addEventListener("click", showLoginView);

  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") === "register") showRegisterView();
  if (params.get("mode") === "forgot")   showForgotView();

  // ── Login ─────────────────────────────────────────────────────────────────────
  loginButton.addEventListener("click", async () => {
    const rawEmail    = document.getElementById("login-email")?.value || "";
    const rawPassword = document.getElementById("login-pass")?.value  || "";

    const email    = window.Security ? window.Security.sanitizeEmail(rawEmail) : rawEmail.trim().toLowerCase();
    const password = rawPassword.trim();

    if (!email || !password) {
      setLoginHint("Please fill in all fields.", "error");
      return;
    }

    if (window.Security && !window.Security.isValidEmail(email)) {
      setLoginHint("Please enter a valid email address.", "error");
      return;
    }

    // Client-side submit guard — prevents accidental double-submit
    if (window.Security && !window.Security.canSubmit("login", 2000)) {
      setLoginHint("Please wait before trying again.", "error");
      return;
    }

    setLoginHint("", "info");
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    const res = await window.loginUser(email, password);

    if (res.success) {
      setLoginHint("Login successful! Redirecting...", "success");
      setTimeout(() => {
        window.location.href = res.user.role === "admin"
          ? "../admin/admin.html"
          : "../home/home.html";
      }, 1000);
      return;
    }

    setLoginHint(res.message || "Login failed. Please try again.", "error");
    loginButton.disabled = false;
    loginButton.textContent = "Login";
  });

  // ── Register ──────────────────────────────────────────────────────────────────
  registerButton.addEventListener("click", async () => {
    const rawName  = document.getElementById("reg-name")?.value  || "";
    const rawEmail = document.getElementById("reg-email")?.value || "";
    const rawPass  = document.getElementById("reg-pass")?.value  || "";
    const rawPhone = document.getElementById("reg-phone")?.value || "";
    const rawUni   = document.getElementById("reg-uni")?.value   || "";

    const sec = window.Security;

    const name       = sec ? sec.sanitizeInput(rawName, 100) : rawName.trim();
    const email      = sec ? sec.sanitizeEmail(rawEmail)     : rawEmail.trim().toLowerCase();
    const password   = rawPass.trim();
    const phone      = sec ? sec.sanitizeInput(rawPhone, 20) : rawPhone.trim();
    const university = sec ? sec.sanitizeInput(rawUni, 100)  : rawUni.trim();

    if (!name || !email || !password || !university) {
      setRegHint("Please fill in all mandatory fields (Name, Email, Password, University).", "error");
      return;
    }

    if (sec && !sec.isValidEmail(email)) {
      setRegHint("Please enter a valid email address.", "error");
      return;
    }

    // Validate password strength — must match backend (8+ chars, letter + number)
    const pwdCheck = sec ? sec.validatePassword(password) : null;
    if (pwdCheck && !pwdCheck.valid) {
      setRegHint(pwdCheck.reason, "error");
      return;
    } else if (!pwdCheck && password.length < 8) {
      setRegHint("Password must be at least 8 characters.", "error");
      return;
    }

    if (sec && !sec.canSubmit("register", 3000)) {
      setRegHint("Please wait before trying again.", "error");
      return;
    }

    setRegHint("", "info");
    registerButton.disabled = true;
    registerButton.textContent = "Creating Account...";

    const res = await window.registerUser({ name, email, password, phone, university });

    if (res.success) {
      setRegHint("Account created successfully! You can now login.", "success");
      setTimeout(() => { showLoginView(); setRegHint("", "info"); }, 2000);
      return;
    }

    setRegHint("Registration Error: " + (res.message || "Unknown error."), "error");
    registerButton.disabled = false;
    registerButton.textContent = "Register";
  });

  // ── Forgot Password ───────────────────────────────────────────────────────────
  if (forgotButton) {
    forgotButton.addEventListener("click", async () => {
      const rawEmail = document.getElementById("forgot-email")?.value || "";
      const sec      = window.Security;
      const email    = sec ? sec.sanitizeEmail(rawEmail) : rawEmail.trim().toLowerCase();

      if (!email || (sec ? !sec.isValidEmail(email) : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        setForgotHint("Please enter a valid email address.", "error");
        return;
      }

      // Client-side rate guard — 10 s cool-off between forgot-password clicks
      if (sec && !sec.canSubmit("forgot-password", 10000)) {
        setForgotHint("Please wait before requesting another reset link.", "error");
        return;
      }

      setForgotHint("", "info");
      forgotButton.disabled = true;
      forgotButton.textContent = "Sending...";

      try {
        if (typeof window.resetPasswordForEmail !== "function") {
          throw new Error("Reset password function is not loaded. Please refresh the page.");
        }

        const res = await window.resetPasswordForEmail(email);

        if (res.success === true) {
          setForgotHint(res.message || "Check your email for the reset link.", "success");
          if (window.showToast) window.showToast(res.message || "Reset link sent!", "success");

          forgotButton.disabled = false;
          forgotButton.textContent = "Send Reset Link";

          setTimeout(() => {
            if (!forgotView?.classList.contains("hidden")) {
              showLoginView();
              setForgotHint("", "info");
            }
          }, 6000);
        } else {
          const errMsg = res.message || "Error sending reset email. Please try again later.";
          setForgotHint(errMsg, "error");
          if (window.showToast) window.showToast(errMsg, "error");
          forgotButton.disabled = false;
          forgotButton.textContent = "Send Reset Link";
        }
      } catch (err) {
        // Never log the email — just the error type
        console.error("Forgot password flow error:", err.message || err);
        setForgotHint("An unexpected error occurred. Please try again.", "error");
        forgotButton.disabled = false;
        forgotButton.textContent = "Send Reset Link";
      }
    });
  }
});
