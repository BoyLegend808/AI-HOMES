(() => {
  const btn = document.getElementById("btn-update-pass");
  const newPassInput = document.getElementById("new-pass");
  const confirmInput = document.getElementById("confirm-pass");
  const hint = document.getElementById("reset-hint");

  const eyeIcon =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="1.6"/></svg>';
  const eyeOffIcon =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4.5l18 18" stroke="currentColor" stroke-width="1.6"/><path d="M10.6 9.6A3.5 3.5 0 0 0 12 15.5c.5 0 1-.1 1.4-.3" stroke="currentColor" stroke-width="1.6"/><path d="M6.2 6.7C4 8.3 2.6 10.2 2 12c1 2.1 4.1 7 10 7 2 0 3.7-.6 5.1-1.4" stroke="currentColor" stroke-width="1.6"/><path d="M9.1 4.9C10 4.7 11 4.5 12 4.5c6.5 0 9.6 5.7 10 7-.3.7-1 2.1-2.4 3.6" stroke="currentColor" stroke-width="1.6"/></svg>';

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

  setupPasswordToggle("new-pass", "toggle-new-pass");
  setupPasswordToggle("confirm-pass", "toggle-confirm-pass");

  const strengthFill = document.getElementById("strength-fill");
  const strengthText = document.getElementById("strength-text");

  const calculatePasswordStrength = (password) => {
    let score = 0;
    if (!password) return { score: 0, label: "" };

    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: "Weak", class: "weak" };
    if (score <= 4) return { score, label: "Fair", class: "fair" };
    return { score, label: "Strong", class: "strong" };
  };

  const updatePasswordStrength = () => {
    const password = newPassInput ? newPassInput.value : "";
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

  if (newPassInput) {
    newPassInput.addEventListener("input", updatePasswordStrength);
  }

  const setHint = (text, type = "info") => {
    if (!hint) return;
    hint.textContent = text || "";
    hint.style.color =
      type === "error" ? "#f87171" : type === "success" ? "#34d399" : "";
  };

  const init = async () => {
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (!token) {
      setHint("No reset token found. Please check your email link.", "error");
      btn.disabled = true;
      return;
    }

    // Verify token is valid
    try {
      const response = await fetch("/api/auth/verify-reset-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();

      if (response.ok) {
        setHint(
          `Please enter your new password below. Reset link for: ${data.email}`,
          "info",
        );
      } else {
        setHint(
          data.error ||
            "Reset link is invalid or expired. Please request a new one.",
          "error",
        );
        btn.disabled = true;
      }
    } catch (error) {
      console.error("Token verification failed:", error);
      setHint("Network error. Please try again.", "error");
    }
  };

  if (btn) {
    btn.addEventListener("click", async () => {
      const pwd = newPassInput ? newPassInput.value.trim() : "";
      const confirm = confirmInput ? confirmInput.value.trim() : "";
      if (!pwd || !confirm) {
        setHint("Please fill both password fields.", "error");
        return;
      }
      if (pwd.length < 6) {
        setHint("Password should be at least 6 characters.", "error");
        return;
      }
      if (pwd !== confirm) {
        setHint("Passwords do not match.", "error");
        return;
      }

      btn.disabled = true;
      btn.textContent = "Updating...";

      // Get token from URL (as per the guide)
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");

      if (!token) {
        setHint("Invalid reset link. No token found.", "error");
        btn.disabled = false;
        btn.textContent = "Update Password";
        return;
      }

      // Call the API endpoint
      try {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword: pwd }),
        });
        const data = await response.json();

        if (response.ok) {
          setHint(data.message + " Redirecting to login...", "success");
          setTimeout(() => {
            window.location.href = "../auth/auth.html";
          }, 2000);
        } else {
          setHint(data.error || "Error updating password.", "error");
        }
      } catch (error) {
        setHint("Network error. Please try again.", "error");
      }

      btn.disabled = false;
      btn.textContent = "Update Password";
    });
  }

  init();
})();
