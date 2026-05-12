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

  const forgotHint = document.getElementById("forgot-hint");
  const loginHint = document.getElementById("login-hint");
  const regHint = document.getElementById("reg-hint");

  const setForgotHint = (text, type = "info") => {
    if (!forgotHint) return;
    forgotHint.textContent = text || "";
    forgotHint.style.color =
      type === "error"
        ? "#f87171"
        : type === "success"
          ? "#34d399"
          : "var(--text-muted)";
  };

  const setLoginHint = (text, type = "info") => {
    if (!loginHint) return;
    loginHint.textContent = text || "";
    loginHint.style.color =
      type === "error"
        ? "#f87171"
        : type === "success"
          ? "#34d399"
          : "var(--text-muted)";
  };

  const setRegHint = (text, type = "info") => {
    if (!regHint) return;
    regHint.textContent = text || "";
    regHint.style.color =
      type === "error"
        ? "#f87171"
        : type === "success"
          ? "#34d399"
          : "var(--text-muted)";
  };

  const setupPasswordToggle = (inputId, buttonId) => {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    if (!input || !button) return;

    const setState = (show) => {
      input.type = show ? "text" : "password";
      button.setAttribute("aria-pressed", String(show));
      button.setAttribute(
        "aria-label",
        show ? "Hide password" : "Show password",
      );
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

  // Real-time email validation
  const forgotEmailInput = document.getElementById("forgot-email");
  if (forgotEmailInput) {
    forgotEmailInput.addEventListener("input", () => {
      const email = forgotEmailInput.value.trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setForgotHint("Please enter a valid email address", "error");
      } else {
        setForgotHint("", "info");
      }
    });
  }

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
      setLoginHint("Please fill in all fields", "error");
      return;
    }

    setLoginHint("", "info");
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    const res = await window.loginUser(email, password);

    if (res.success) {
      setLoginHint("Login successful! Redirecting...", "success");
      if (res.user.role === "admin") {
        setTimeout(() => {
          window.location.href = "../admin/admin.html";
        }, 1000);
      } else {
        setTimeout(() => {
          window.location.href = "../home/home.html";
        }, 1000);
      }
      return;
    }

    setLoginHint(res.message || "Login failed. Please try again.", "error");
    loginButton.disabled = false;
    loginButton.textContent = "Login";
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
      setRegHint(
        "Please fill in all mandatory fields (Name, Email, Password, University)",
        "error",
      );
      return;
    }

    if (password.length < 6) {
      setRegHint("Password must be at least 6 characters long", "error");
      return;
    }

    setRegHint("", "info");
    registerButton.disabled = true;
    registerButton.textContent = "Creating Account...";

    const res = await window.registerUser({
      name,
      email,
      password,
      phone,
      university,
    });

    if (res.success) {
      setRegHint("Account created successfully! You can now login.", "success");
      setTimeout(() => {
        showLoginView();
        setRegHint("", "info");
      }, 2000);
      return;
    }

    setRegHint("Registration Error: " + res.message, "error");
    registerButton.disabled = false;
    registerButton.textContent = "Register";
  });

  if (forgotButton) {
    forgotButton.addEventListener("click", async () => {
      console.log("Forgot password button clicked");
      const emailInput = document.getElementById("forgot-email");
      const email = emailInput ? emailInput.value.trim().toLowerCase() : "";

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        console.warn("Invalid email for reset:", email);
        setForgotHint("Please enter a valid email address", "error");
        return;
      }

      setForgotHint("", "info");
      forgotButton.disabled = true;
      forgotButton.textContent = "Sending...";

      try {
        console.log("Calling resetPasswordForEmail for:", email);
        if (typeof window.resetPasswordForEmail !== "function") {
          throw new Error(
            "Reset password function is not loaded. Please refresh the page.",
          );
        }
        const res = await window.resetPasswordForEmail(email);
        console.log("Reset password response:", res);

        if (res.success) {
          setForgotHint(
            res.message || "Check your email for the reset link.",
            "success",
          );
          setTimeout(() => {
            showLoginView();
            setForgotHint("", "info");
          }, 3000);
        } else {
          setForgotHint(
            res.message || "Error sending reset email. Please try again later.",
            "error",
          );
          forgotButton.disabled = false;
          forgotButton.textContent = "Send Reset Link";
        }
      } catch (err) {
        console.error("Forgot password flow error:", err);
        setForgotHint(
          "An unexpected error occurred. Please try again.",
          "error",
        );
        forgotButton.disabled = false;
        forgotButton.textContent = "Send Reset Link";
      }
    });
  }
});
