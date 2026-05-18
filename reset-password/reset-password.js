(() => {
  const btn          = document.getElementById("btn-update-pass");
  const newPassInput = document.getElementById("new-pass");
  const confirmInput = document.getElementById("confirm-pass");
  const hint         = document.getElementById("reset-hint");

  const eyeIcon    = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.6"/></svg>';
  const eyeOffIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4.5l18 18" stroke="currentColor" stroke-width="1.6"/><path d="M10.6 9.6A3.5 3.5 0 0 0 12 15.5c.5 0 1-.1 1.4-.3" stroke="currentColor" stroke-width="1.6"/><path d="M6.2 6.7C4 8.3 2.6 10.2 2 12c1 2.1 4.1 7 10 7 2 0 3.7-.6 5.1-1.4" stroke="currentColor" stroke-width="1.6"/><path d="M9.1 4.9C10 4.7 11 4.5 12 4.5c6.5 0 9.6 5.7 10 7-.3.7-1 2.1-2.4 3.6" stroke="currentColor" stroke-width="1.6"/></svg>';

  const setupPasswordToggle = (inputId, buttonId) => {
    const input  = document.getElementById(inputId);
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
    button.addEventListener("click", () => setState(input.type === "password"));
  };

  setupPasswordToggle("new-pass",     "toggle-new-pass");
  setupPasswordToggle("confirm-pass", "toggle-confirm-pass");

  // ── Password strength meter ───────────────────────────────────────────────────
  const strengthFill = document.getElementById("strength-fill");
  const strengthText = document.getElementById("strength-text");

  const calculatePasswordStrength = (password) => {
    if (!password) return { score: 0, label: "", class: "" };
    let score = 0;
    if (password.length >= 8)  score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return { score, label: "Weak",   class: "weak" };
    if (score <= 3) return { score, label: "Fair",   class: "fair" };
    return              { score, label: "Strong", class: "strong" };
  };

  const updatePasswordStrength = () => {
    const password = newPassInput?.value || "";
    const strength = calculatePasswordStrength(password);
    if (strengthFill && strengthText) {
      strengthFill.className = "strength-fill";
      if (password) {
        strengthFill.classList.add(strength.class);
        strengthText.textContent = strength.label;
      } else {
        strengthText.textContent = "";
      }
    }
  };

  if (newPassInput) newPassInput.addEventListener("input", updatePasswordStrength);

  // ── Hint helper ───────────────────────────────────────────────────────────────
  const setHint = (text, type = "info") => {
    if (!hint) return;
    hint.textContent = text || "";
    hint.style.color = type === "error" ? "#f87171" : type === "success" ? "#34d399" : "";
  };

  // ── Client-side token format validation ──────────────────────────────────────
  const isValidToken = (t) => typeof t === "string" && /^[a-f0-9]{64}$/.test(t);

  // ── Init: verify token from URL before showing the form ───────────────────────
  const init = async () => {
    const token = new URLSearchParams(window.location.search).get("token");

    if (!token || !isValidToken(token)) {
      setHint("No valid reset token found. Please check your email link.", "error");
      if (btn) btn.disabled = true;
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-reset-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        // Backend no longer returns the email — show a neutral ready message
        setHint("Token verified. Please enter your new password below.", "info");
      } else {
        setHint(data.error || "Reset link is invalid or expired. Please request a new one.", "error");
        if (btn) btn.disabled = true;
      }
    } catch (err) {
      console.error("Token verification network error:", err.message);
      setHint("Network error. Please check your connection and try again.", "error");
    }
  };

  // ── Submit new password ───────────────────────────────────────────────────────
  if (btn) {
    btn.addEventListener("click", async () => {
      const pwd     = newPassInput?.value.trim()  || "";
      const confirm = confirmInput?.value.trim()  || "";

      if (!pwd || !confirm) {
        setHint("Please fill both password fields.", "error");
        return;
      }

      // Use Security utility if loaded, otherwise inline check
      const sec      = window.Security;
      const pwdCheck = sec ? sec.validatePassword(pwd) : null;
      if (pwdCheck && !pwdCheck.valid) {
        setHint(pwdCheck.reason, "error");
        return;
      } else if (!pwdCheck && pwd.length < 8) {
        setHint("Password must be at least 8 characters.", "error");
        return;
      }

      if (pwd !== confirm) {
        setHint("Passwords do not match.", "error");
        return;
      }

      // Prevent double-submit
      if (sec && !sec.canSubmit("reset-password", 5000)) {
        setHint("Please wait before trying again.", "error");
        return;
      }

      const token = new URLSearchParams(window.location.search).get("token");
      if (!token || !isValidToken(token)) {
        setHint("Invalid reset link. No valid token found.", "error");
        return;
      }

      btn.disabled = true;
      btn.textContent = "Updating...";

      try {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword: pwd }),
        });
        const data = await response.json();

        if (response.ok) {
          setHint((data.message || "Password updated.") + " Redirecting to login...", "success");
          setTimeout(() => { window.location.href = "../auth/auth.html"; }, 2000);
        } else {
          setHint(data.error || "Error updating password.", "error");
          btn.disabled = false;
          btn.textContent = "Update Password";
        }
      } catch (err) {
        console.error("Password reset network error:", err.message);
        setHint("Network error. Please try again.", "error");
        btn.disabled = false;
        btn.textContent = "Update Password";
      }
    });
  }

  init();
})();
