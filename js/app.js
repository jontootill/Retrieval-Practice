let CURRICULUM = null;

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

function updateHeaderBadge() {
    const yearSelect = document.getElementById('yearSelect');
    const routeSelect = document.getElementById('routeSelect');
    const tierSelect = document.getElementById('tierSelect');
    const yearText = document.getElementById('current-year-text');
    const subjectSelect = document.getElementById('subjectSelect');

    const yearVal = yearSelect ? yearSelect.value : '';

    if (yearVal) {
        let badgeLabel = `Year ${yearVal}`;
        
        // Add Route & Tier for Key Stage 4 (Years 10 & 11)
        if (parseInt(yearVal) >= 10) {
            const routeName = routeSelect && routeSelect.value === '2' ? 'Triple' : 'Combined';
            const tierName = tierSelect && tierSelect.value === '2' ? 'Higher' : 'Foundation';
            badgeLabel = `Year ${yearVal} - ${routeName} (${tierName})`;
        }

        if (yearText) yearText.textContent = badgeLabel;
        if (subjectSelect) subjectSelect.disabled = false;
    } else {
        if (yearText) yearText.textContent = 'Select Profile';
        if (subjectSelect) subjectSelect.disabled = true;
    }
}

// Event Listeners for Profile Selectors
document.addEventListener('DOMContentLoaded', () => {
    const yearSelect = document.getElementById('yearSelect');
    const routeSelect = document.getElementById('routeSelect');
    const tierSelect = document.getElementById('tierSelect');
    const gcseFields = document.getElementById('gcseFields');

    if (yearSelect) {
        yearSelect.addEventListener('change', () => {
            const yearVal = parseInt(yearSelect.value);
            
            // Show/hide Route & Tier dropdowns depending on Year Group
            if (gcseFields) {
                if (yearVal >= 10) {
                    gcseFields.classList.remove('hidden');
                } else {
                    gcseFields.classList.add('hidden');
                }
            }
            updateHeaderBadge();
        });
    }

    if (routeSelect) routeSelect.addEventListener('change', updateHeaderBadge);
    if (tierSelect) tierSelect.addEventListener('change', updateHeaderBadge);
    
    // Initialize state on load
    updateHeaderBadge();
});

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Sync header badge on initial page load
    syncHeaderYear();

    // 2. Fetch Curriculum JSON
    try {
        const res = await fetch("data/curriculum.json");
        CURRICULUM = await res.json();
    } catch (e) {
        console.error("Could not load curriculum.json", e);
    }

    // 3. Element References (Using matching camelCase IDs)
    const yearSelect = document.getElementById("yearSelect");
    const gcseFields = document.getElementById("gcseFields");
    const subjectSelect = document.getElementById("subjectSelect");
    const topicSelect = document.getElementById("topicSelect");
    const subtopicSelect = document.getElementById("subtopicSelect");
    const startBtn = document.getElementById("startBtn");
    const changeYearBtn = document.getElementById("change-year-btn");

    // 4. Restore saved year if present in localStorage
    const savedYear = localStorage.getItem("selectedYear");
    if (yearSelect && savedYear) {
        yearSelect.value = savedYear;
        const yr = parseInt(savedYear, 10);
        if (gcseFields) {
            if (yr >= 10) gcseFields.classList.remove("hidden");
            else gcseFields.classList.add("hidden");
        }
        if (subjectSelect) subjectSelect.disabled = isNaN(yr);
    }

    // 5. Year Change Listener
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

            // Immediately update top badge
            syncHeaderYear();

            // Toggle GCSE fields
            if (gcseFields) {
                if (yr >= 10) {
                    gcseFields.classList.remove("hidden");
                } else {
                    gcseFields.classList.add("hidden");
                }
            }

            if (subjectSelect) subjectSelect.disabled = isNaN(yr);
            populateTopics();
        });
    }

    // 6. Header 'Change Year' Button Listener
    if (changeYearBtn) {
        changeYearBtn.addEventListener("click", () => {
            localStorage.removeItem("selectedYear");
            localStorage.removeItem("selectedYearName");
            if (yearSelect) yearSelect.value = "";
            if (gcseFields) gcseFields.classList.add("hidden");
            if (subjectSelect) subjectSelect.disabled = true;

            syncHeaderYear();
            populateTopics();
        });
    }

    if (subjectSelect) subjectSelect.addEventListener("change", populateTopics);
    if (topicSelect) topicSelect.addEventListener("change", populateSubtopics);

    // 7. Filter topics by subject and year selected
    function populateTopics() {
        if (!yearSelect || !subjectSelect || !topicSelect || !subtopicSelect) return;

        const year = parseInt(yearSelect.value, 10);
        const subjectId = parseInt(subjectSelect.value, 10);

        topicSelect.innerHTML = '<option value="">-- Select Topic --</option>';
        subtopicSelect.innerHTML = '<option value="all">All Subtopics</option>';
        subtopicSelect.disabled = true;

        if (!CURRICULUM || !CURRICULUM.topics) return;

        const filtered = CURRICULUM.topics.filter(
            t => Number(t.subjectId) === subjectId && Number(t.year) === year
        );

        filtered.forEach(t => {
            topicSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });

        topicSelect.disabled = filtered.length === 0;
        if (typeof checkStart === "function") checkStart();
    }
})

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

// Function to update profile selection and hide target profile box
function handleYearSelection(selectedYear) {
    const profileBox = document.getElementById('target-profile-box');
    const yearBadge = document.getElementById('year-badge');
    const yearText = document.getElementById('current-year-text');
    const subjectSelect = document.getElementById('subjectSelect');

    if (selectedYear) {
        // Hide profile box and enable subject selection
        if (profileBox) profileBox.classList.add('hidden');
        if (yearBadge) yearBadge.classList.remove('hidden');
        if (yearText) yearText.textContent = `Year ${selectedYear}`;
        if (subjectSelect) subjectSelect.disabled = false;
    } else {
        if (profileBox) profileBox.classList.remove('hidden');
        if (yearBadge) yearBadge.classList.add('hidden');
        if (subjectSelect) subjectSelect.disabled = true;
    }
}

// Add event listener to year select dropdown
document.addEventListener("DOMContentLoaded", () => {
    const yearSelect = document.getElementById("yearSelect");
    if (yearSelect) {
        yearSelect.addEventListener("change", (e) => {
            handleYearSelection(e.target.value);
        });
    }
});

function populateSubtopics() {
    const topicId = parseInt(topicSelect.value, 10);

    subtopicSelect.innerHTML = '<option value="all">All Subtopics</option>';

    if (!CURRICULUM || !CURRICULUM.subtopics || isNaN(topicId)) {
        subtopicSelect.disabled = true;
        checkStart();
        return;
    }

    // Compare numbers to numbers
    const filtered = CURRICULUM.subtopics.filter(
        st => Number(st.topicId) === topicId
    );

    filtered.forEach(st => {
        subtopicSelect.innerHTML += `<option value="${st.id}">${st.name}</option>`;
    });

    subtopicSelect.disabled = false;
    checkStart();
}

    function checkStart() {
        startBtn.disabled = !subjectSelect.value || !topicSelect.value;
    }

    startBtn.addEventListener("click", () => {
        const year = yearSelect.value;
        const subject = subjectSelect.value;
        const topic = topicSelect.value;
        const subtopic = subtopicSelect.value;
        const route = document.getElementById("routeSelect").value;
        const tier = document.getElementById("tierSelect").value;

        window.location.href = `quiz.html?subject=${subject}&year=${year}&topic=${topic}&subtopic=${subtopic}&route=${route}&tier=${tier}`;
    });

function resetTopics() {
    if (typeof populateTopics === "function") {
        populateTopics();
    }
}

document.addEventListener("DOMContentLoaded", () => {
  // Use camelCase to match index.html
  const yearSelect = document.getElementById("yearSelect"); 
  const yearBadge = document.getElementById("year-badge");
  const yearText = document.getElementById("current-year-text");
  const changeYearBtn = document.getElementById("change-year-btn");

  // 1. Check if a year is already saved in localStorage
  const savedYear = localStorage.getItem("selectedYear");
  const savedYearName = localStorage.getItem("selectedYearName");

  // Safe check before setting .value
  if (savedYear && yearSelect) {
    yearSelect.value = savedYear;
    if (typeof updateYearBanner === "function") {
      updateYearBanner(savedYearName);
    }
  }

  // 2. Event listener when user selects/changes the year
  yearSelect.addEventListener("change", (e) => {
    const selectedValue = e.target.value;
    const selectedText = e.target.options[e.target.selectedIndex].text;

    if (selectedValue) {
      localStorage.setItem("selectedYear", selectedValue);
      localStorage.setItem("selectedYearName", selectedText);
      updateYearBanner(selectedText);
    } else {
      localStorage.removeItem("selectedYear");
      localStorage.removeItem("selectedYearName");
      hideYearBanner();
    }
    
    // Call your existing function to populate topics for the chosen year
    if (typeof populateTopics === "function") {
      populateTopics();
    }
  });

  // 3. Reset button inside the header banner
  if (changeYearBtn) {
    changeYearBtn.addEventListener("click", () => {
      localStorage.removeItem("selectedYear");
      localStorage.removeItem("selectedYearName");
      yearSelect.value = "";
      hideYearBanner();
      
      if (typeof populateTopics === "function") {
        populateTopics();
      }
    });
  }

  function updateYearBanner(name) {
    if (yearBadge && yearText) {
      yearText.textContent = name;
      yearBadge.classList.remove("hidden");
    }
  }

  function hideYearBanner() {
    if (yearBadge) {
      yearBadge.classList.add("hidden");
    }
  }
});

function updateProfileDisplay() {
    const yearSelect = document.getElementById('yearSelect');
    const routeSelect = document.getElementById('routeSelect');
    const tierSelect = document.getElementById('tierSelect');
    
    const profileBox = document.getElementById('target-profile-box');
    const yearBadge = document.getElementById('year-badge');
    const yearText = document.getElementById('current-year-text');
    const subjectSelect = document.getElementById('subjectSelect');

    const yearVal = yearSelect ? yearSelect.value : '';

    if (yearVal) {
        let badgeLabel = `Year ${yearVal}`;
        
        // Include Route & Tier details for Year 10 and 11
        if (parseInt(yearVal) >= 10) {
            const routeName = routeSelect && routeSelect.value === '2' ? 'Triple' : 'Combined';
            const tierName = tierSelect && tierSelect.value === '2' ? 'Higher' : 'Foundation';
            badgeLabel = `Year ${yearVal} - ${routeName} (${tierName})`;
        }

        if (yearText) yearText.textContent = badgeLabel;
        if (profileBox) profileBox.classList.add('hidden');
        if (yearBadge) yearBadge.classList.remove('hidden');
        if (subjectSelect) subjectSelect.disabled = false;
    } else {
        if (profileBox) profileBox.classList.remove('hidden');
        if (yearBadge) yearBadge.classList.add('hidden');
        if (subjectSelect) subjectSelect.disabled = true;
    }
}

// Event handlers
document.addEventListener('DOMContentLoaded', () => {
    const yearSelect = document.getElementById('yearSelect');
    const routeSelect = document.getElementById('routeSelect');
    const tierSelect = document.getElementById('tierSelect');
    const gcseFields = document.getElementById('gcseFields');

    if (yearSelect) {
        yearSelect.addEventListener('change', () => {
            const yearVal = parseInt(yearSelect.value);
            if (gcseFields) {
                if (yearVal >= 10) {
                    gcseFields.classList.remove('hidden');
                } else {
                    gcseFields.classList.add('hidden');
                }
            }
            updateProfileDisplay();
        });
    }

    if (routeSelect) routeSelect.addEventListener('change', updateProfileDisplay);
    if (tierSelect) tierSelect.addEventListener('change', updateProfileDisplay);
});