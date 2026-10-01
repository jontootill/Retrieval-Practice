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
  const yearSelect = document.getElementById("year-select"); // Your year <select> element
  const yearBadge = document.getElementById("year-badge");
  const yearText = document.getElementById("current-year-text");
  const changeYearBtn = document.getElementById("change-year-btn");

  // 1. Check if a year is already saved in localStorage
  const savedYear = localStorage.getItem("selectedYear");
  const savedYearName = localStorage.getItem("selectedYearName");

  if (savedYear) {
    yearSelect.value = savedYear;
    updateYearBanner(savedYearName);
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