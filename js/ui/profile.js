const defaultProfile = {
    name: "Student Name",
    email: "student@example.com",
    course: "Computer Science Engineering",
    account: "Student"
};

const avatar = document.getElementById("avatar");
const displayName = document.getElementById("displayName");
const displayEmail = document.getElementById("displayEmail");
const displayCourse = document.getElementById("displayCourse");
const infoName = document.getElementById("infoName");
const infoEmail = document.getElementById("infoEmail");
const infoCourse = document.getElementById("infoCourse");
const infoAccount = document.getElementById("infoAccount");
const accountBadge = document.getElementById("accountBadge");

const totalSubmissions = document.getElementById("totalSubmissions");
const totalWords = document.getElementById("totalWords");
const averageWords = document.getElementById("averageWords");
const submissionList = document.getElementById("submissionList");

const editBtn = document.getElementById("editBtn");
const editForm = document.getElementById("editForm");
const nameInput = document.getElementById("nameInput");
const emailInput = document.getElementById("emailInput");
const courseInput = document.getElementById("courseInput");
const accountInput = document.getElementById("accountInput");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const message = document.getElementById("message");

let profile;
try {
    profile = JSON.parse(localStorage.getItem("profile")) || { ...defaultProfile };
} catch (error) {
    profile = { ...defaultProfile };
}

let submissions;
try {
    submissions = JSON.parse(localStorage.getItem("submissions")) || [];
} catch (error) {
    submissions = [];
}

function displayProfile(user = profile) {
    const { name, email, course, account = "Student" } = user;

    displayName.textContent = name;
    displayEmail.textContent = email;
    displayCourse.textContent = course;

    infoName.textContent = name;
    infoEmail.textContent = email;
    infoCourse.textContent = course;
    infoAccount.textContent = account;
    accountBadge.textContent = `${account} Account`;

    const firstLetter = name.trim().charAt(0).toUpperCase();
    avatar.textContent = firstLetter || "S";
}

function calculateStatistics(list = []) {
    let words = 0;
    for (let i = 0; i < list.length; i++) {
        words += Number(list[i].words) || 0;
    }

    const count = list.length;
    const average = count > 0 ? Math.round(words / count) : 0;

    totalSubmissions.textContent = count;
    totalWords.textContent = words;
    averageWords.textContent = average;
}

function showSubmissions(list = []) {
    submissionList.innerHTML = "";

    if (list.length === 0) {
        submissionList.innerHTML = `
            <div class="note" style="border-left-color: #cbd5e1;">
                No assignments submitted yet.
            </div>
        `;
        return;
    }

    const recent = list.slice(-5).reverse();
    recent.forEach((submission) => {
        const item = document.createElement("div");
        item.className = "submission-item";

        const title = submission.title || "Untitled Assignment";
        const date = submission.date || "Date unavailable";

        item.innerHTML = `
            <div>
                <div class="submission-title">${title}</div>
                <div class="submission-date">${date}</div>
            </div>
            <span class="status">Submitted</span>
        `;
        submissionList.appendChild(item);
    });
}

editBtn.addEventListener("click", () => {
    editForm.style.display = "block";
    nameInput.value = profile.name;
    emailInput.value = profile.email;
    courseInput.value = profile.course;
    accountInput.value = profile.account || "Student";
    message.className = "message";
    nameInput.focus();
});

cancelBtn.addEventListener("click", () => {
    editForm.style.display = "none";
    message.className = "message";
});

saveBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const course = courseInput.value.trim();
    const account = accountInput.value;

    if (name === "" || email === "" || course === "") {
        message.textContent = "Please fill all fields.";
        message.className = "message error";
        return;
    }

    if (!email.includes("@")) {
        message.textContent = "Please enter a valid email address.";
        message.className = "message error";
        return;
    }

    profile = { name, email, course, account };
    localStorage.setItem("profile", JSON.stringify(profile));

    displayProfile(profile);
    message.textContent = `Profile saved successfully.`;
    message.className = "message success";

    setTimeout(() => {
        editForm.style.display = "none";
        message.className = "message";
    }, 1000);
});

window.addEventListener("load", () => {
    displayProfile(profile);
    calculateStatistics(submissions);
    showSubmissions(submissions);
    sessionStorage.setItem("profilePageVisited", "true");
});