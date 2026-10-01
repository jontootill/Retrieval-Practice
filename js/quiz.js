const SUBJECT_MAP = { 1: "biology.json", 2: "chemistry.json", 3: "physics.json" };

let questions = [];
let currentIndex = 0;
let stats = { red: 0, yellow: 0, green: 0 };

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const subjectId = parseInt(params.get("subject"), 10) || 1;
    const yearId = parseInt(params.get("year"), 10);
    const topicId = parseInt(params.get("topic"), 10);
    const subtopic = params.get("subtopic");

    const fileName = SUBJECT_MAP[subjectId];
    
    try {
        // 1. Fetch Curriculum to inspect linkedSubtopics
        const currRes = await fetch("data/curriculum.json");
        const curriculum = await currRes.json();

        // 2. Fetch the Question Bank (e.g., biology.json)
        const res = await fetch(`data/${fileName}`);
        const data = await res.json();

        // 3. Build target subtopic list
        let targetSubtopicIds = [];

        if (subtopic && subtopic !== "all") {
            const selectedId = Number(subtopic);
            targetSubtopicIds.push(selectedId);

            // Find the subtopic definition inside curriculum.json
            const subtopicObj = curriculum.subtopics?.find(st => Number(st.id) === selectedId);

            // Add backward-linked subtopic IDs if present
            if (subtopicObj && Array.isArray(subtopicObj.linkedSubtopics)) {
                targetSubtopicIds.push(...subtopicObj.linkedSubtopics.map(Number));
            }
        }

        // 4. Filter Questions
        let filtered = data.filter(q => {
            // When a specific subtopic (or linked subtopics) is selected, filter strictly by subtopic ID.
            // Do NOT filter by q.year or q.topic here so linked Year 8 questions aren't discarded!
            if (targetSubtopicIds.length > 0) {
                return targetSubtopicIds.includes(Number(q.subtopic));
            }

            // Fallback: If "All Subtopics" selected, match Topic and Year Group
            let match = true;
            if (topicId) match = match && Number(q.topic) === Number(topicId);
            if (yearId)  match = match && Number(q.year) === Number(yearId);
            return match;
        });

        // 5. Handle empty results cleanly
        if (filtered.length === 0) {
            document.getElementById("quizWrapper").innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h2>No questions found</h2>
                    <p style="margin: 15px 0; color: #64748b;">
                        There are no questions added for this specific topic yet.
                    </p>
                    <a href="index.html"><button>Back to Topic Selection</button></a>
                </div>
            `;
            return;
        }

        // 6. Shuffle & select up to 10 questions
        questions = filtered.sort(() => 0.5 - Math.random()).slice(0, 10);
        showQuestion();

    } catch (e) {
        console.error("Error loading questions", e);
        document.getElementById("quizWrapper").innerHTML = "<h2>Error loading quiz questions.</h2>";
    }
});

function showQuestion() {
    const q = questions[currentIndex];
    if (!q) return;

    document.getElementById("flashcard").classList.remove("flipped");
    document.getElementById("ratingBox").classList.add("hidden");

    document.getElementById("progress").textContent = `Question ${currentIndex + 1} of ${questions.length}`;
    document.getElementById("qText").textContent = q.question;
    document.getElementById("aText").textContent = q.answer;
}

function flipCard() {
    const card = document.getElementById("flashcard");
    card.classList.toggle("flipped");
    if (card.classList.contains("flipped")) {
        document.getElementById("ratingBox").classList.remove("hidden");
    }
}

function rate(color) {
    stats[color]++;
    currentIndex++;

    if (currentIndex < questions.length) {
        showQuestion();
    } else {
        showSummary();
    }
}

function showSummary() {
    document.getElementById("quizWrapper").innerHTML = `
        <div style="text-align:center;">
            <h2>🎉 Quiz Complete!</h2>
            <p style="margin:15px 0;">Here is your score breakdown:</p>
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <div style="flex:1; background:#dcfce7; padding:15px; border-radius:8px; color:#166534;">🟢 Got it<br><strong>${stats.green}</strong></div>
                <div style="flex:1; background:#fef3c7; padding:15px; border-radius:8px; color:#92400e;">🟡 Practice<br><strong>${stats.yellow}</strong></div>
                <div style="flex:1; background:#fee2e2; padding:15px; border-radius:8px; color:#991b1b;">🔴 Re-learn<br><strong>${stats.red}</strong></div>
            </div>
            <a href="index.html"><button>Return to Topics</button></a>
        </div>
    `;
}