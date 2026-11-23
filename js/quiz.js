const SUBJECT_MAP = {
    1: "biology.json",
    2: "chemistry.json",
    3: "physics.json",
    4: "working_scientifically.json", // Update filename if yours differs
    5: "geography.json",
    6: "PE.json"
};

let questions = [];
let currentIndex = 0;
let stats = { red: 0, yellow: 0, green: 0, skipped: 0 };
let currentQuizLog = [];

// Load user progress from LocalStorage or initialize
let userProgress = JSON.parse(localStorage.getItem('quiz_user_progress')) || {};
let subtopicMap = {}; // Maps subtopic ID to Name/Title

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const subjectId = parseInt(params.get("subject"), 10) || 1;
    const yearId = parseInt(params.get("year"), 10);
    const topicId = parseInt(params.get("topic"), 10);
    const subtopic = params.get("subtopic");
    const routeParam = parseInt(params.get("route"), 10);
    const normalizedRoute = Number.isNaN(routeParam) ? 0 : routeParam;
    const tierParam = parseInt(params.get("tier"), 10) || 0;

    const fileName = SUBJECT_MAP[subjectId];
    if (!fileName) {
        document.getElementById("quizWrapper").innerHTML = "<h2>Unknown subject selected.</h2>";
        return;
    }

    try {
        // 1. Fetch Curriculum & build complete lookup map for subtopics
        const currRes = await fetch("data/curriculum.json");
        const curriculum = await currRes.json();
        buildSubtopicMap(curriculum);

        // Look up subject config from curriculum.json (with safe fallback)
        const subjectConfig = Array.isArray(curriculum.subjects)
            ? curriculum.subjects.find(s => Number(s.id) === subjectId)
            : null;

        const appliesToYear = subjectConfig && Array.isArray(subjectConfig.routeTierYearIds)
            ? subjectConfig.routeTierYearIds.map(Number).includes(yearId)
            : [10, 11].includes(yearId);

        const subjectHasRoutes = Boolean(subjectConfig?.hasRoutes);
        const subjectHasTiers = Boolean(subjectConfig?.hasTiers);

        const filterByRoute = subjectHasRoutes && appliesToYear;
        const filterByTier = subjectHasTiers && appliesToYear && tierParam > 0;

        // 2. Fetch Question Bank
        const res = await fetch(`data/${fileName}`);
        const data = await res.json();

        console.log("Total PE items:", data.length, "Sample:", data[0]);
    console.log("Year 10 count:", data.filter(q => Number(q.year) === 10).length);
    console.log("Topic 77 count:", data.filter(q => Number(q.topic) === 77).length);

        // 3. Build target subtopic list
        let targetSubtopicIds = [];

        if (subtopic && subtopic !== "all") {
            const selectedId = Number(subtopic);
            targetSubtopicIds.push(selectedId);

            // Recursively search for linkedSubtopics in curriculum
            const subtopicObj = findSubtopicById(curriculum, selectedId);
            if (subtopicObj && Array.isArray(subtopicObj.linkedSubtopics)) {
                targetSubtopicIds.push(...subtopicObj.linkedSubtopics.map(Number));
            }
        }

        // 4. Filter Questions
        let filtered = data.filter(q => {
            if (targetSubtopicIds.length > 0) {
                if (!targetSubtopicIds.includes(Number(q.subtopic))) return false;
            } else {
                if (topicId && Number(q.topic) !== Number(topicId)) return false;
                if (yearId && Number(q.year) !== Number(yearId)) return false;
            }

            // Route filtering:
            // - Only applied to subjects with exam routes in applicable years (e.g., Y10/Y11 sciences)
            // - Route 0 questions apply to both routes (and KS3)
            // - Route 1 matches route 1 or 0
            // - Route 2 matches route 2 or 0
            if (filterByRoute) {
                const qRoute = Number(q.route);
                if (normalizedRoute === 2) {
                    if (qRoute !== 2 && qRoute !== 0) return false;
                } else if (normalizedRoute === 1) {
                    if (qRoute !== 1 && qRoute !== 0) return false;
                } else {
                    if (qRoute !== 0 && !Number.isNaN(qRoute)) return false;
                }
            }

            // Tier filtering: only when active
            if (filterByTier) {
                const qTier = Number(q.tier);
                // Match selected tier (1 or 2); allow 0 or missing tier so general/shared questions aren't dropped
                if (qTier !== 0 && !Number.isNaN(qTier) && qTier !== tierParam) {
                    return false;
                }
            }

            return true;
        });

        // 5. Handle empty results
        if (filtered.length === 0) {
            document.getElementById("quizWrapper").innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h2>No questions found</h2>
                    <p style="margin: 15px 0; color: #64748b;">
                        There are no questions added for this specific topic yet.
                    </p>
                    <a href="index.html"><button class="control-btn secondary">Back to Topic Selection</button></a>
                </div>
            `;
            return;
        }

        // Initialize Weak Spots UI
        updateWeakSpotsUI();

        // 6. Shuffle & select up to 10 questions
        questions = filtered.sort(() => 0.5 - Math.random()).slice(0, 10);
        showQuestion();

    } catch (e) {
        console.error("Error loading questions", e);
        document.getElementById("quizWrapper").innerHTML = "<h2>Error loading quiz questions.</h2>";
    }
});

// Helper function to extract all subtopic IDs and Names from any curriculum structure
function buildSubtopicMap(node) {
    if (!node) return;
    
    if (Array.isArray(node)) {
        node.forEach(item => buildSubtopicMap(item));
        return;
    }

    // If node represents a subtopic
    if (node.id !== undefined && (node.title || node.name) && !node.topics && !node.subtopics) {
        subtopicMap[Number(node.id)] = node.title || node.name;
    }

    // Traverse nested objects / arrays
    for (const key in node) {
        if (typeof node[key] === 'object' && node[key] !== null) {
            buildSubtopicMap(node[key]);
        }
    }
}

// Helper function to find subtopic object by ID anywhere in curriculum JSON
function findSubtopicById(node, id) {
    if (!node) return null;
    if (Array.isArray(node)) {
        for (const item of node) {
            const found = findSubtopicById(item, id);
            if (found) return found;
        }
        return null;
    }
    if (Number(node.id) === Number(id) && !node.topics && !node.subtopics) {
        return node;
    }
    for (const key in node) {
        if (typeof node[key] === 'object' && node[key] !== null) {
            const found = findSubtopicById(node[key], id);
            if (found) return found;
        }
    }
    return null;
}

// Safe Question Display
function showQuestion() {
    if (currentIndex >= questions.length) {
        renderQuizSummary();
        return;
    }

    const q = questions[currentIndex];
    if (!q) return;

    const flashcard = document.getElementById("flashcard");
    if (flashcard) flashcard.classList.remove("flipped");
    
    const ratingBox = document.getElementById("ratingBox");
    if (ratingBox) ratingBox.classList.add("hidden");

    const progressEl = document.getElementById("progress");
    if (progressEl) progressEl.textContent = `Question ${currentIndex + 1} of ${questions.length}`;
    
    const qText = document.getElementById("qText");
    if (qText) qText.textContent = q.question || q.prompt || "";

    const aText = document.getElementById("aText");
    if (aText) aText.textContent = q.answer || q.correctAnswer || "";

    const prevBtn = document.getElementById("prevBtn");
    if (prevBtn) prevBtn.disabled = false;
}

function flipCard() {
    const card = document.getElementById("flashcard");
    if (!card) return;

    card.classList.toggle("flipped");
    const ratingBox = document.getElementById("ratingBox");

    if (card.classList.contains("flipped") && ratingBox) {
        ratingBox.classList.remove("hidden");
    }
}

function advanceQuestion() {
    currentIndex++;

    if (currentIndex < questions.length) {
        showQuestion();
    } else {
        renderQuizSummary();
    }
}

function goBack() {
    window.location.href = "index.html";
}

function skipQuestion() {
    const currentQ = questions[currentIndex];

    if (currentQ) {
        recordAnswer(currentQ, 'skipped');
        if (currentQ.subtopic) {
            recordQuestionOutcome(currentQ.subtopic, 'skipped');
        }
    }

    advanceQuestion();
}

function rate(color) {
    const currentQ = questions[currentIndex];

    if (currentQ) {
        const outcome = (color === 'green') ? 'correct' : (color === 'red') ? 'incorrect' : 'skipped';
        stats[color] = (stats[color] || 0) + 1;

        recordAnswer(currentQ, outcome);
        if (currentQ.subtopic) {
            recordQuestionOutcome(currentQ.subtopic, outcome);
        }
    }

    advanceQuestion();
}

function recordAnswer(questionObj, status) {
    currentQuizLog.push({
        question: questionObj.question || questionObj.prompt,
        answer: questionObj.answer || questionObj.correctAnswer,
        status: status
    });
}

// Function to render the final summary dashboard with clickable card breakdowns
function renderQuizSummary() {
    const relearnItems = currentQuizLog.filter(q => q.status === 'incorrect');
    const practiceItems = currentQuizLog.filter(q => q.status === 'skipped');
    const gotItItems = currentQuizLog.filter(q => q.status === 'correct');

    const container = document.getElementById('quizWrapper');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h2>🎉 Quiz Complete!</h2>
            <p style="color: #64748b; margin-bottom: 20px;">Here is your score breakdown. Click on any box to review questions:</p>

            <!-- Cards Layout: Red on Left, Yellow Middle, Green on Right -->
            <div style="display: flex; gap: 12px; justify-content: center; margin-bottom: 20px;">
                
                <!-- 🔴 Re-learn Card -->
                <div onclick="toggleReviewList('relearn-list')" 
                     style="flex: 1; background: #fce8e6; border: 2px solid #fad2cf; padding: 16px 12px; border-radius: 10px; cursor: pointer; transition: transform 0.15s ease;"
                     onmouseover="this.style.transform='translateY(-2px)';" 
                     onmouseout="this.style.transform='translateY(0)';">
                    <span style="font-size: 1.1rem; font-weight: 600; color: #c5221f;">🔴 Re-learn</span>
                    <h3 style="margin: 8px 0 0 0; color: #c5221f; font-size: 1.8rem;">${relearnItems.length}</h3>
                </div>

                <!-- 🟡 Practice Card -->
                <div onclick="toggleReviewList('practice-list')" 
                     style="flex: 1; background: #fef7e0; border: 2px solid #fde293; padding: 16px 12px; border-radius: 10px; cursor: pointer; transition: transform 0.15s ease;"
                     onmouseover="this.style.transform='translateY(-2px)';" 
                     onmouseout="this.style.transform='translateY(0)';">
                    <span style="font-size: 1.1rem; font-weight: 600; color: #b06000;">🟡 Practice</span>
                    <h3 style="margin: 8px 0 0 0; color: #b06000; font-size: 1.8rem;">${practiceItems.length}</h3>
                </div>

                <!-- 🟢 Got it Card -->
                <div onclick="toggleReviewList('got-it-list')" 
                     style="flex: 1; background: #e6f4ea; border: 2px solid #a8dab5; padding: 16px 12px; border-radius: 10px; cursor: pointer; transition: transform 0.15s ease;"
                     onmouseover="this.style.transform='translateY(-2px)';" 
                     onmouseout="this.style.transform='translateY(0)';">
                    <span style="font-size: 1.1rem; font-weight: 600; color: #137333;">🟢 Got it</span>
                    <h3 style="margin: 8px 0 0 0; color: #137333; font-size: 1.8rem;">${gotItItems.length}</h3>
                </div>

            </div>

            <!-- Expandable Review Panels -->
            <div id="relearn-list" class="review-panel hidden" style="display: none; text-align: left; background: #ffffff; border: 1px solid #fad2cf; padding: 16px; border-radius: 8px; margin-bottom: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <h4 style="margin-top: 0; color: #c5221f;">🔴 Re-learn Questions (${relearnItems.length})</h4>
                ${buildReviewHTML(relearnItems)}
            </div>

            <div id="practice-list" class="review-panel hidden" style="display: none; text-align: left; background: #ffffff; border: 1px solid #fde293; padding: 16px; border-radius: 8px; margin-bottom: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <h4 style="margin-top: 0; color: #b06000;">🟡 Practice Questions (${practiceItems.length})</h4>
                ${buildReviewHTML(practiceItems)}
            </div>

            <div id="got-it-list" class="review-panel hidden" style="display: none; text-align: left; background: #ffffff; border: 1px solid #a8dab5; padding: 16px; border-radius: 8px; margin-bottom: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <h4 style="margin-top: 0; color: #137333;">🟢 Got It Questions (${gotItItems.length})</h4>
                ${buildReviewHTML(gotItItems)}
            </div>

            <button onclick="window.location.href='index.html'" class="control-btn secondary" style="width: 100%; padding: 14px; font-size: 1rem; border-radius: 8px; margin-top: 10px; cursor: pointer;">
                Return to Topics
            </button>
        </div>
    `;
}

// Builds the question and answer item layout for expandable breakdown panels
function buildReviewHTML(items) {
    if (!items || items.length === 0) {
        return '<p style="color: #64748b; margin: 0; font-style: italic;">No questions in this category.</p>';
    }
    return items.map((item, idx) => {
        const questionText = item.question || item.prompt || `Question ${idx + 1}`;
        const correctAnswer = item.answer || item.correctAnswer || 'N/A';

        return `
            <div style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                <strong style="color: #1e293b;">Q${idx + 1}: ${questionText}</strong><br>
                <span style="color: #475569; font-size: 0.9rem;">
                    Answer: <strong>${correctAnswer}</strong>
                </span>
            </div>
        `;
    }).join('');
}

// Toggles accordion panel visibility (showing one section at a time)
function toggleReviewList(elementId) {
    const panels = document.querySelectorAll('.review-panel');
    panels.forEach(p => {
        if (p.id === elementId) {
            const isHidden = p.style.display === 'none' || p.classList.contains('hidden');
            p.style.display = isHidden ? 'block' : 'none';
            p.classList.toggle('hidden', !isHidden);
        } else {
            p.style.display = 'none';
            p.classList.add('hidden');
        }
    });
}

// WEAK SPOTS TRACKING
function recordQuestionOutcome(subtopicId, status) {
    const key = String(subtopicId);
    if (!userProgress[key]) {
        userProgress[key] = { correct: 0, incorrect: 0, skipped: 0, total: 0 };
    }

    userProgress[key][status] = (userProgress[key][status] || 0) + 1;
    userProgress[key].total = (userProgress[key].total || 0) + 1;

    localStorage.setItem('quiz_user_progress', JSON.stringify(userProgress));
    updateWeakSpotsUI();
}

function updateWeakSpotsUI() {
    const weakSpots = getTopWeakSpots();

    const countBadge = document.getElementById('weak-spots-count');
    if (countBadge) {
        countBadge.innerText = weakSpots.length;
    }

    const listElement = document.getElementById('weak-spots-list');
    if (listElement) {
        if (weakSpots.length === 0) {
            listElement.innerHTML = '<li><em>No weak spots recorded yet!</em></li>';
        } else {
            listElement.innerHTML = weakSpots.map(item => {
                const title = subtopicMap[Number(item.subtopicId)] || `Subtopic ${item.subtopicId}`;
                const accuracy = Math.round((item.stats.correct / item.stats.total) * 100) || 0;
                return `
                    <li style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: left;">
                        <strong style="color: #1e293b; font-size: 0.9rem;">${title}</strong><br>
                        <small style="color: #64748b; font-size: 0.8rem;">
                            ${accuracy}% accuracy (${item.stats.incorrect} wrong, ${item.stats.skipped} skipped)
                        </small>
                    </li>
                `;
            }).join('');
        }
    }
}

function getTopWeakSpots(minAttempts = 1, topN = 3) {
    return Object.entries(userProgress)
        .map(([subtopicId, stats]) => {
            const weaknessScore = (stats.incorrect + (0.5 * stats.skipped)) / stats.total;
            return { subtopicId, weaknessScore, stats };
        })
        .filter(item => item.stats.total >= minAttempts && item.weaknessScore > 0.2)
        .sort((a, b) => b.weaknessScore - a.weaknessScore)
        .slice(0, topN);
}

function toggleWeakSpotsDropdown() {
    const menu = document.getElementById('weak-spots-menu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

document.addEventListener('click', (event) => {
    const container = document.getElementById('weak-spots-container');
    const menu = document.getElementById('weak-spots-menu');
    if (container && menu && !container.contains(event.target)) {
        menu.classList.add('hidden');
    }
});

// Clear cached state when navigating back or reloading from BFCache
window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        currentIndex = 0;
        currentQuizLog = [];
        if (typeof showQuestion === 'function' && questions.length > 0) {
            showQuestion();
        }
    }
});