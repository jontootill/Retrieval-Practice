let CURRICULUM = null;

// Helper: find subject config object from CURRICULUM.subjects
function getSubjectConfig(subjectId) {
    if (!CURRICULUM || !Array.isArray(CURRICULUM.subjects)) return null;
    const idNum = Number(subjectId);
    if (!idNum) return null;
    return CURRICULUM.subjects.find(s => Number(s.id) === idNum) || null;
}

// Helper: determine whether Route & Tier dropdowns should be shown
function shouldShowRouteAndTier(subjectId, yearValue) {
    const yearNum = Number(yearValue);
    if (!subjectId || !yearNum) return false;

    const subject = getSubjectConfig(subjectId);
    if (!subject) {
        // Fallback if curriculum hasn't loaded yet: Biology(1), Chemistry(2), Physics(3) in Y10-Y11
        return [1, 2, 3].includes(Number(subjectId)) && [10, 11].includes(yearNum);
    }

    const hasFlag = Boolean(subject.hasRoutes || subject.hasTiers);
    const allowedYears = Array.isArray(subject.routeTierYearIds)
        ? subject.routeTierYearIds.map(Number)
        : [10, 11];

    return hasFlag && allowedYears.includes(yearNum);
}

// Function to update header banner across any page
function syncHeaderYear() {
    const yearBadge = document.getElementById("year-badge");
    const yearText = document.getElementById("current-year-text");
    const savedYearName = localStorage.getItem("selectedYearName");

    if (savedYearName && yearBadge && yearText) {
        yearText.textContent = savedYearName;
        yearBadge.classList.remove("hidden");
    } else if (yearBadge) {
        yearBadge.classList.add("hidden");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const subjectSelect = document.getElementById("subjectSelect");
    const yearSelect = document.getElementById("yearSelect");
    const gcseFields = document.getElementById("gcseFields");
    const routeSelect = document.getElementById("routeSelect");
    const tierSelect = document.getElementById("tierSelect");
    const topicSelect = document.getElementById("topicSelect");
    const subtopicSelect = document.getElementById("subtopicSelect");
    const startBtn = document.getElementById("startBtn");
    const changeYearBtn = document.getElementById("change-year-btn");
    const yearBadge = document.getElementById("year-badge");
    const yearText = document.getElementById("current-year-text");

    // 1. Load curriculum.json
    try {
        const res = await fetch("data/curriculum.json");
        CURRICULUM = await res.json();
    } catch (e) {
        console.error("Could not load curriculum.json", e);
    }

    // Helper: update header badge & toggle Route/Tier fields
    function updateProfileUI() {
        const subjectVal = subjectSelect ? subjectSelect.value : "";
        const yearVal = yearSelect ? yearSelect.value : "";
        const showExamFields = shouldShowRouteAndTier(subjectVal, yearVal);

        // Year dropdown is only enabled once a Subject is selected
        if (yearSelect) {
            yearSelect.disabled = !subjectVal;
        }

        // Toggle Route & Tier container
        if (gcseFields) {
            if (showExamFields) {
                gcseFields.classList.remove("hidden");
            } else {
                gcseFields.classList.add("hidden");
            }
        }

        // Update header badge
        if (yearBadge && yearText) {
            if (yearVal) {
                const subjectObj = getSubjectConfig(subjectVal);
                const subjectLabel = subjectObj ? subjectObj.name : "";
                let label = subjectLabel
                    ? `${subjectLabel} · Year ${yearVal}`
                    : `Year ${yearVal}`;

                if (showExamFields) {
                    const routeText = routeSelect?.options[routeSelect.selectedIndex]?.text || "";
                    const tierText = tierSelect?.options[tierSelect.selectedIndex]?.text || "";
                    if (routeText && tierText) {
                        label += ` (${routeText}, ${tierText})`;
                    }
                }

                yearText.textContent = label;
                yearBadge.classList.remove("hidden");
            } else {
                yearText.textContent = "Select Profile";
                yearBadge.classList.remove("hidden");
            }
        }

        if (typeof checkStart === "function") {
            checkStart();
        }
    }

    // Helper: populate topics for selected Subject + Year
    function populateTopics() {
        if (!yearSelect || !subjectSelect || !topicSelect || !subtopicSelect) return;

        const year = parseInt(yearSelect.value, 10);
        const subjectId = parseInt(subjectSelect.value, 10);

        topicSelect.innerHTML = '<option value="">-- Select Topic --</option>';
        topicSelect.disabled = true;

        subtopicSelect.innerHTML = '<option value="all">All Subtopics</option>';
        subtopicSelect.disabled = true;

        if (!CURRICULUM || !Array.isArray(CURRICULUM.topics) || isNaN(subjectId) || isNaN(year)) {
            if (typeof checkStart === "function") checkStart();
            return;
        }

        const filtered = CURRICULUM.topics.filter(
            t => Number(t.subjectId) === subjectId && Number(t.year) === year
        );

        filtered.forEach(t => {
            topicSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });

        topicSelect.disabled = filtered.length === 0;
        if (typeof checkStart === "function") checkStart();
    }

    // 2. Subject Change Listener (Step 1)
    if (subjectSelect) {
        subjectSelect.addEventListener("change", () => {
            // Reset downstream selections when subject changes
            if (yearSelect) {
                yearSelect.value = "";
                yearSelect.disabled = !subjectSelect.value;
            }
            if (topicSelect) {
                topicSelect.innerHTML = '<option value="">-- Select Topic --</option>';
                topicSelect.disabled = true;
            }
            if (subtopicSelect) {
                subtopicSelect.innerHTML = '<option value="all">All Subtopics</option>';
                subtopicSelect.disabled = true;
            }

            localStorage.removeItem("selectedYear");
            localStorage.removeItem("selectedYearName");

            updateProfileUI();
        });
    }

    // 3. Year Change Listener (Step 2)
    if (yearSelect) {
        yearSelect.addEventListener("change", (e) => {
            const yr = parseInt(e.target.value, 10);
            const selectedText = e.target.options[e.target.selectedIndex]?.text;

            if (!isNaN(yr)) {
                localStorage.setItem("selectedYear", yr);
                localStorage.setItem("selectedYearName", selectedText);
            } else {
                localStorage.removeItem("selectedYear");
                localStorage.removeItem("selectedYearName");
            }

            updateProfileUI();
            populateTopics();
        });
    }

    // 4. Route & Tier Listeners
    if (routeSelect) routeSelect.addEventListener("change", updateProfileUI);
    if (tierSelect) tierSelect.addEventListener("change", updateProfileUI);

    // 5. Topic & Subtopic Listeners
    if (topicSelect) topicSelect.addEventListener("change", populateSubtopics);

    // 6. Optional Header 'Change Year' Button Listener
    if (changeYearBtn) {
        changeYearBtn.addEventListener("click", () => {
            localStorage.removeItem("selectedYear");
            localStorage.removeItem("selectedYearName");
            if (yearSelect) yearSelect.value = "";
            if (topicSelect) {
                topicSelect.innerHTML = '<option value="">-- Select Topic --</option>';
                topicSelect.disabled = true;
            }
            if (subtopicSelect) {
                subtopicSelect.innerHTML = '<option value="all">All Subtopics</option>';
                subtopicSelect.disabled = true;
            }
            updateProfileUI();
        });
    }

// 7. Start Quiz Button
if (startBtn) {
    startBtn.addEventListener("click", () => {
        const subject = subjectSelect ? subjectSelect.value : "";
        const year = yearSelect ? yearSelect.value : "";
        const topic = topicSelect ? topicSelect.value : "";
        const subtopic = subtopicSelect ? subtopicSelect.value : "all";

        const yearNum = Number(year);
        const showExamFields = shouldShowRouteAndTier(subject, yearNum);

        let route = "0";
        if (yearNum >= 10) {
            // Year 10 & 11 default to route 1; only use route 2 when Separate is shown and selected
            route = showExamFields && routeSelect ? routeSelect.value : "1";
        }

        const tier = showExamFields && tierSelect ? tierSelect.value : "0";

        window.location.href = `quiz.html?subject=${subject}&year=${year}&topic=${topic}&subtopic=${subtopic}&route=${route}&tier=${tier}`;
    });
}

    // Initial state on load
    updateProfileUI();
});

function populateSubtopics() {
    const topicSelect = document.getElementById("topicSelect");
    const subtopicSelect = document.getElementById("subtopicSelect");
    if (!topicSelect || !subtopicSelect) return;

    const topicId = parseInt(topicSelect.value, 10);

    subtopicSelect.innerHTML = '<option value="all">All Subtopics</option>';

    if (!CURRICULUM || !Array.isArray(CURRICULUM.subtopics) || isNaN(topicId)) {
        subtopicSelect.disabled = true;
        if (typeof checkStart === "function") checkStart();
        return;
    }

    const filtered = CURRICULUM.subtopics.filter(
        st => Number(st.topicId) === topicId
    );

    filtered.forEach(st => {
        subtopicSelect.innerHTML += `<option value="${st.id}">${st.name}</option>`;
    });

    subtopicSelect.disabled = false;
    if (typeof checkStart === "function") checkStart();
}

function checkStart() {
    const subjectSelect = document.getElementById("subjectSelect");
    const topicSelect = document.getElementById("topicSelect");
    const startBtn = document.getElementById("startBtn");
    if (!startBtn || !subjectSelect || !topicSelect) return;

    startBtn.disabled = !subjectSelect.value || !topicSelect.value;
}

function resetTopics() {
    if (typeof populateTopics === "function") {
        populateTopics();
    }
}

// Global tracking for the current quiz session
let currentQuizLog = [];

// Call this inside your button handler functions for Got it / Practice / Re-learn
function recordAnswer(questionObj, status) {
    // status: 'correct' (Got it), 'skipped' (Practice), 'incorrect' (Re-learn)
    currentQuizLog.push({
        question: questionObj.question || questionObj.prompt,
        answer: questionObj.answer || questionObj.correctAnswer,
        status: status
    });
}

// Function to render the final summary dashboard with clickable card breakdowns
function renderQuizSummary() {
    const gotItItems = currentQuizLog.filter(q => q.status === 'correct');
    const practiceItems = currentQuizLog.filter(q => q.status === 'skipped');
    const relearnItems = currentQuizLog.filter(q => q.status === 'incorrect');

    const container = document.getElementById('quiz-container');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h2>🎉 Quiz Complete!</h2>
            <p style="color: #64748b;">Here is your score breakdown. Click on any box to review questions:</p>

            <div style="display: flex; gap: 12px; justify-content: center; margin: 20px 0;">
                <div onclick="toggleReviewList('got-it-list')" style="flex: 1; background: #e6f4ea; border: 1px solid #a8dab5; padding: 15px; border-radius: 8px; cursor: pointer;">
                    <span style="font-size: 1.2rem;">🟢 Got it</span>
                    <h3 style="margin: 5px 0 0 0; color: #137333;">${gotItItems.length}</h3>
                </div>

                <div onclick="toggleReviewList('practice-list')" style="flex: 1; background: #fef7e0; border: 1px solid #fde293; padding: 15px; border-radius: 8px; cursor: pointer;">
                    <span style="font-size: 1.2rem;">🟡 Practice</span>
                    <h3 style="margin: 5px 0 0 0; color: #b06000;">${practiceItems.length}</h3>
                </div>

                <div onclick="toggleReviewList('relearn-list')" style="flex: 1; background: #fce8e6; border: 1px solid #fad2cf; padding: 15px; border-radius: 8px; cursor: pointer;">
                    <span style="font-size: 1.2rem;">🔴 Re-learn</span>
                    <h3 style="margin: 5px 0 0 0; color: #c5221f;">${relearnItems.length}</h3>
                </div>
            </div>

            <!-- Expandable Review Lists -->
            <div id="got-it-list" class="review-panel hidden" style="text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="margin-top: 0; color: #137333;">🟢 Got It Questions (${gotItItems.length})</h4>
                ${buildReviewHTML(gotItItems)}
            </div>

            <div id="practice-list" class="review-panel hidden" style="text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="margin-top: 0; color: #b06000;">🟡 Practice Questions (${practiceItems.length})</h4>
                ${buildReviewHTML(practiceItems)}
            </div>

            <div id="relearn-list" class="review-panel hidden" style="text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="margin-top: 0; color: #c5221f;">🔴 Re-learn Questions (${relearnItems.length})</h4>
                ${buildReviewHTML(relearnItems)}
            </div>

            <button onclick="window.location.href='index.html'" class="primary-btn" style="padding: 12px 24px; font-size: 1rem; margin-top: 10px;">
                Return to Topics
            </button>
        </div>
    `;
}

function buildReviewHTML(items) {
    if (items.length === 0) return '<p style="color: #64748b; margin: 0;">No questions in this category.</p>';
    return items.map((item, idx) => `
        <div style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <strong>Q${idx + 1}: ${item.question}</strong><br>
            <span style="color: #475569;">Answer: ${item.answer}</span>
        </div>
    `).join('');
}

function toggleReviewList(elementId) {
    const panels = document.querySelectorAll('.review-panel');
    panels.forEach(p => {
        if (p.id === elementId) {
            p.classList.toggle('hidden');
        } else {
            p.classList.add('hidden');
        }
    });
}