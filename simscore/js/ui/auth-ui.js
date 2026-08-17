/* =========================================================
   auth-ui.js
   Login + Signup screen behaviour.

   IMPORTANT (team rule):
   This file ONLY checks that the form is filled correctly and
   shows / hides messages. It does NOT save users, it does NOT
   create sessions and it does NOT touch storage.
   When the form is valid it simply calls:

        window.AuthService.login(data)      (login page)
        window.AuthService.signup(data)     (signup page)

   The logic team writes AuthService in another file.
   ========================================================= */

/* ---------- 1. Field level helpers ---------- */

/* Shows a red border and a message under one input */
function setFieldError(input, message) {
  const field = input.closest(".field");

  if (field === null) {
    return;
  }

  field.classList.add("has-error");

  const errorBox = field.querySelector(".error-msg");
  if (errorBox) {
    errorBox.textContent = message;
  }
}

/* Removes the red border again */
function clearFieldError(input) {
  const field = input.closest(".field");

  if (field) {
    field.classList.remove("has-error");
  }
}

/* Clears every error in a form */
function clearAllErrors(form) {
  const fields = form.querySelectorAll(".field");

  fields.forEach(function (field) {
    field.classList.remove("has-error");
  });

  const formAlert = form.querySelector(".form-alert");
  if (formAlert) {
    formAlert.classList.add("hidden");
  }
}

/* Big message on top of the form */
function showFormAlert(form, message, type) {
  const box = form.querySelector(".form-alert");

  if (box === null) {
    return;
  }

  box.className = "alert alert-" + (type ? type : "danger") + " form-alert mb-4";
  box.textContent = message;
}


/* ---------- 2. Simple validation rules ---------- */

function isEmptyValue(value) {
  return value.trim().length === 0;
}

/* A very simple email check: something@something.something */
function isEmailValid(value) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return pattern.test(value.trim());
}

/* Password strength: at least 8 characters, 1 letter and 1 number */
function isPasswordValid(value) {
  if (value.length < 8) {
    return false;
  }

  const hasLetter = /[A-Za-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);

  return hasLetter && hasNumber;
}


/* ---------- 3. Show / hide password button ---------- */
function setupPasswordToggles() {
  const buttons = document.querySelectorAll(".toggle-btn");

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      const inputId = button.getAttribute("data-target");
      const input = document.getElementById(inputId);

      if (input === null) {
        return;
      }

      if (input.type === "password") {
        input.type = "text";
        button.textContent = "Hide";
      } else {
        input.type = "password";
        button.textContent = "Show";
      }
    });
  });
}


/* ---------- 4. Password strength bar (signup page) ---------- */
function setupStrengthMeter() {
  const input = document.getElementById("signupPassword");
  const bar = document.getElementById("strengthBar");
  const label = document.getElementById("strengthText");

  if (input === null || bar === null) {
    return;
  }

  input.addEventListener("input", function () {
    const value = input.value;
    let score = 0;

    if (value.length >= 8) { score = score + 1; }
    if (/[A-Z]/.test(value)) { score = score + 1; }
    if (/[0-9]/.test(value)) { score = score + 1; }
    if (/[^A-Za-z0-9]/.test(value)) { score = score + 1; }

    const percentList = [0, 25, 50, 75, 100];
    const textList = ["Too short", "Weak", "Fair", "Good", "Strong"];
    const colorList = ["#e6eaf2", "#cf4b34", "#e5a13a", "#3b5bdb", "#1a7f4b"];

    bar.style.width = percentList[score] + "%";
    bar.style.background = colorList[score];

    if (label) {
      label.textContent = value.length === 0 ? "" : textList[score];
    }
  });
}


/* ---------- 5. Loading state on the submit button ---------- */
function setButtonLoading(button, isLoading, normalText) {
  if (isLoading) {
    button.disabled = true;
    button.innerHTML = '<span class="btn-spinner"></span> Please wait...';
  } else {
    button.disabled = false;
    button.textContent = normalText;
  }
}


/* ---------- 6. LOGIN FORM ---------- */
function setupLoginForm() {
  const form = document.getElementById("loginForm");

  if (form === null) {
    return;
  }

  const emailInput = document.getElementById("loginEmail");
  const passwordInput = document.getElementById("loginPassword");
  const submitButton = document.getElementById("loginSubmit");

  // remove the red border as soon as the user starts typing again
  [emailInput, passwordInput].forEach(function (input) {
    input.addEventListener("input", function () {
      clearFieldError(input);
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault(); // we handle the form ourselves

    clearAllErrors(form);

    let isValid = true;

    if (isEmptyValue(emailInput.value)) {
      setFieldError(emailInput, "Email is required.");
      isValid = false;
    } else if (!isEmailValid(emailInput.value)) {
      setFieldError(emailInput, "Please enter a valid email address.");
      isValid = false;
    }

    if (isEmptyValue(passwordInput.value)) {
      setFieldError(passwordInput, "Password is required.");
      isValid = false;
    }

    if (!isValid) {
      // move the cursor to the first wrong field
      const firstError = form.querySelector(".has-error .input");
      if (firstError) {
        firstError.focus();
      }
      return;
    }

    // the form is fine -> hand the data to the logic team
    const data = {
      email: emailInput.value.trim(),
      password: passwordInput.value,
      remember: document.getElementById("rememberMe").checked
    };

    setButtonLoading(submitButton, true, "Sign in");

    // AuthService is written by the logic team.
    // If it does not exist yet we just show a message so the
    // UI can still be demonstrated.
    if (window.AuthService && typeof window.AuthService.login === "function") {
      window.AuthService.login(data, function (result) {
        setButtonLoading(submitButton, false, "Sign in");

        if (result.success) {
          UI.toast("Welcome back!", "ok");
          window.location.href = "dashboard.html";
        } else {
          showFormAlert(form, result.message, "danger");
        }
      });
    } else {
      setTimeout(function () {
        setButtonLoading(submitButton, false, "Sign in");
        UI.toast("UI only: auth service is not connected yet.", "warn");
      }, 600);
    }
  });
}


/* ---------- 7. SIGNUP FORM ---------- */
function setupSignupForm() {
  const form = document.getElementById("signupForm");

  if (form === null) {
    return;
  }

  const nameInput = document.getElementById("signupName");
  const emailInput = document.getElementById("signupEmail");
  const roleInput = document.getElementById("signupRole");
  const passwordInput = document.getElementById("signupPassword");
  const confirmInput = document.getElementById("signupConfirm");
  const termsInput = document.getElementById("agreeTerms");
  const submitButton = document.getElementById("signupSubmit");

  const inputList = [nameInput, emailInput, passwordInput, confirmInput];

  inputList.forEach(function (input) {
    input.addEventListener("input", function () {
      clearFieldError(input);
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    clearAllErrors(form);

    let isValid = true;

    // full name
    if (isEmptyValue(nameInput.value)) {
      setFieldError(nameInput, "Full name is required.");
      isValid = false;
    } else if (nameInput.value.trim().length < 3) {
      setFieldError(nameInput, "Name must be at least 3 characters.");
      isValid = false;
    } else if (nameInput.value.trim().length > 60) {
      setFieldError(nameInput, "Name cannot be longer than 60 characters.");
      isValid = false;
    }

    // email
    if (!isEmailValid(emailInput.value)) {
      setFieldError(emailInput, "Please enter a valid email address.");
      isValid = false;
    }

    // password
    if (!isPasswordValid(passwordInput.value)) {
      setFieldError(
        passwordInput,
        "Use at least 8 characters with one letter and one number."
      );
      isValid = false;
    }

    // confirm password
    if (confirmInput.value !== passwordInput.value) {
      setFieldError(confirmInput, "Both passwords must match.");
      isValid = false;
    }

    // terms checkbox
    if (!termsInput.checked) {
      showFormAlert(form, "Please accept the terms to continue.", "warn");
      isValid = false;
    }

    if (!isValid) {
      const firstError = form.querySelector(".has-error .input");
      if (firstError) {
        firstError.focus();
      }
      return;
    }

    const data = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      role: roleInput.value,
      password: passwordInput.value
    };

    setButtonLoading(submitButton, true, "Create account");

    if (window.AuthService && typeof window.AuthService.signup === "function") {
      window.AuthService.signup(data, function (result) {
        setButtonLoading(submitButton, false, "Create account");

        if (result.success) {
          UI.toast("Account created successfully.", "ok");
          window.location.href = "dashboard.html";
        } else {
          showFormAlert(form, result.message, "danger");
        }
      });
    } else {
      setTimeout(function () {
        setButtonLoading(submitButton, false, "Create account");
        UI.toast("UI only: auth service is not connected yet.", "warn");
      }, 600);
    }
  });
}


/* ---------- 8. Run on page load ---------- */
document.addEventListener("DOMContentLoaded", function () {
  setupPasswordToggles();
  setupStrengthMeter();
  setupLoginForm();
  setupSignupForm();
});
