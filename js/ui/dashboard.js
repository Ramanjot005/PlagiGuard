let currentData = {
    totalSubmissions: 24,
    flaggedPairs: 7,
    highestSimilarity: 92,
    averageSimilarity: 38
};

function renderStats(data = currentData) {
    document.getElementById('total-submissions').textContent = data.totalSubmissions;
    document.getElementById('flagged-pairs').textContent = data.flaggedPairs;
    document.getElementById('highest-similarity').textContent = data.highestSimilarity + '%';
    document.getElementById('average-similarity').textContent = data.averageSimilarity + '%';
}

function renderRecentActivity(data = sampleActivity) {
    const tbody = document.getElementById('recent-activity-body');
    tbody.innerHTML = '';
    
    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.student}</strong></td>
            <td>${item.assignment}</td>
            <td>${item.date}</td>
            <td><strong style="color: ${item.similarity > 75 ? 'var(--danger)' : 'var(--warning)'}">${item.similarity}%</strong></td>
            <td><span class="badge badge-review">Review</span></td>
            <td><button class="btn btn-primary" onclick="openSubmissionModal(${item.id})" style="padding: 0.4rem 1rem; font-size: 0.85rem;">View</button></td>
        `;
        tbody.appendChild(row);
    });
}

function renderSuspiciousPairs(data = samplePairs) {
    const container = document.getElementById('suspicious-pairs');
    container.innerHTML = '';
    
    data.forEach(pair => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.marginBottom = '1rem';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>${pair.student1}</strong> ↔ <strong>${pair.student2}</strong>
                    <p style="margin-top:4px; color:var(--text-muted); font-size:0.95rem;">${pair.assignment}</p>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:1.75rem; font-weight:700; color:var(--danger);">${pair.similarity}%</div>
                    <span class="badge badge-danger">High Similarity</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function openSubmissionModal(id) {
    const modal = document.getElementById('submissionModal');
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('submissionModal').style.display = 'none';
}

function showToast(message, type = "info") {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = type === 'success' ? 'var(--success)' : 'var(--primary)';
    toast.textContent = message;
    document.body.appendChild(toast);
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 2800);
}

// Sample data for demo
const sampleActivity = [
    { id: 1, student: "Aarav Sharma", assignment: "Data Structures Assignment", date: "Today", similarity: 87 },
    { id: 2, student: "Meera Patel", assignment: "Algorithm Analysis", date: "Yesterday", similarity: 76 },
    { id: 3, student: "Vihaan Rao", assignment: "Database Systems", date: "2 days ago", similarity: 64 }
];

const samplePairs = [
    { student1: "Aarav Sharma", student2: "Riya Kapoor", assignment: "Data Structures", similarity: 87 },
    { student1: "Aditya Singh", student2: "Anika Mehra", assignment: "Machine Learning", similarity: 81 }
];

// Initialize dashboard
window.addEventListener('load', () => {
    if (document.getElementById('total-submissions')) {
        renderStats();
        renderRecentActivity();
        renderSuspiciousPairs();
    }
});