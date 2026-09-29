// ==========================================
// FEEDBACK INTELLIGENCE FRONTEND
// ==========================================


// ==========================================
// LOAD DASHBOARD
// ==========================================

async function loadDashboard() {

    try {

        console.log("Loading dashboard...");

        const response =
            await fetch("/api/summary");

        if (!response.ok) {

            throw new Error(
                `API error: ${response.status}`
            );

        }

        const data =
            await response.json();

        console.log(
            "Dashboard API response:",
            data
        );

        if (!data.success) {

            throw new Error(
                data.error ||
                "Unknown API error"
            );

        }


        // ==========================================
        // TOTAL FEEDBACK
        // ==========================================

        const totalFeedback =
            document.getElementById(
                "totalFeedback"
            );

        if (totalFeedback) {

            totalFeedback.textContent =
                data.memories || 0;

        }


        // ==========================================
        // SENTIMENT COUNTS
        // ==========================================

        /*
         IMPORTANT:

         Backend returns:

         {
             success: true,
             memories: 10,

             sentimentCounts: {
                 positive: 5,
                 negative: 3,
                 neutral: 2
             }
         }

         sentimentCounts is at TOP LEVEL.
        */

        const sentiment =
            data.sentimentCounts || {

                positive: 0,
                negative: 0,
                neutral: 0

            };


        // ==========================================
        // POSITIVE
        // ==========================================

        const positiveElement =
            document.getElementById(
                "positive"
            );

        if (positiveElement) {

            positiveElement.textContent =
                Number(
                    sentiment.positive || 0
                );

        }


        // ==========================================
        // NEGATIVE
        // ==========================================

        const negativeElement =
            document.getElementById(
                "negative"
            );

        if (negativeElement) {

            negativeElement.textContent =
                Number(
                    sentiment.negative || 0
                );

        }


        // ==========================================
        // NEUTRAL
        // ==========================================

        const neutralElement =
            document.getElementById(
                "neutral"
            );

        if (neutralElement) {

            neutralElement.textContent =
                Number(
                    sentiment.neutral || 0
                );

        }


        // ==========================================
        // INSIGHTS
        // ==========================================

        const insights =
            data.insights || {};


        // ==========================================
        // EMERGING ISSUES
        // ==========================================

        const problems =
            insights.emergingProblems || [];

        const issuesElement =
            document.getElementById(
                "issues"
            );

        if (issuesElement) {

            issuesElement.textContent =
                problems.length;

        }


        // ==========================================
        // TOP THEMES
        // ==========================================

        const themesContainer =
            document.getElementById(
                "themes"
            );

        if (
            themesContainer
        ) {

            if (
                insights.topThemes &&
                insights.topThemes.length > 0
            ) {

                themesContainer.innerHTML = "";

                insights.topThemes.forEach(
                    theme => {

                        const item =
                            document.createElement(
                                "div"
                            );

                        item.className =
                            "theme-item";

                        item.innerHTML = `
                            <span>
                                ${escapeHtml(
                                    theme.theme ||
                                    "Unknown theme"
                                )}
                            </span>

                            <strong>
                                ${Number(
                                    theme.mentions || 0
                                )}
                            </strong>
                        `;

                        themesContainer.appendChild(
                            item
                        );

                    }
                );

            }

            else {

                themesContainer.innerHTML =
                    "<p>No themes available.</p>";

            }

        }


        // ==========================================
        // OVERALL SENTIMENT
        // ==========================================

        const sentimentValue =
            document.getElementById(
                "sentimentValue"
            );

        if (sentimentValue) {

            sentimentValue.textContent =
                capitalize(
                    insights.overallSentiment ||
                    "Neutral"
                );

        }


        // ==========================================
        // TREND
        // ==========================================

        const trendMessage =
            document.getElementById(
                "trendMessage"
            );

        if (trendMessage) {

            trendMessage.textContent =
                "Dashboard performance complaints and other product issues are being analyzed from historical customer feedback.";

        }


        // ==========================================
        // EMERGING PROBLEMS
        // ==========================================

        const problemsContainer =
            document.getElementById(
                "problems"
            );

        if (
            problemsContainer
        ) {

            if (
                problems.length > 0
            ) {

                problemsContainer.innerHTML = "";

                problems.forEach(
                    problem => {

                        const item =
                            document.createElement(
                                "div"
                            );

                        item.className =
                            "problem-item";

                        item.innerHTML = `
                            ⚠️ ${escapeHtml(
                                problem
                            )}
                        `;

                        problemsContainer.appendChild(
                            item
                        );

                    }
                );

            }

            else {

                problemsContainer.innerHTML =
                    "<p>No emerging problems detected.</p>";

            }

        }


        // ==========================================
        // PRODUCT CHANGE
        // ==========================================

        const releaseAnalysis =
            document.getElementById(
                "releaseAnalysis"
            );

        if (releaseAnalysis) {

            releaseAnalysis.innerHTML = `
                <p>
                    Product feedback is being analyzed
                    against historical changes and releases.
                </p>
            `;

        }


        // ==========================================
        // CONSOLE RESULT
        // ==========================================

        console.log(
            "================================="
        );

        console.log(
            "✅ Dashboard loaded successfully."
        );

        console.log(
            "Positive:",
            sentiment.positive
        );

        console.log(
            "Negative:",
            sentiment.negative
        );

        console.log(
            "Neutral:",
            sentiment.neutral
        );

        console.log(
            "================================="
        );

    }

    catch (error) {

        console.error(
            "❌ Dashboard error:",
            error
        );


        // ==========================================
        // SHOW ERROR VALUES
        // ==========================================

        const totalFeedback =
            document.getElementById(
                "totalFeedback"
            );

        if (totalFeedback) {

            totalFeedback.textContent =
                "--";

        }


        const positive =
            document.getElementById(
                "positive"
            );

        if (positive) {

            positive.textContent =
                "--";

        }


        const negative =
            document.getElementById(
                "negative"
            );

        if (negative) {

            negative.textContent =
                "--";

        }


        const neutral =
            document.getElementById(
                "neutral"
            );

        if (neutral) {

            neutral.textContent =
                "--";

        }


        const issues =
            document.getElementById(
                "issues"
            );

        if (issues) {

            issues.textContent =
                "--";

        }

    }

}


// ==========================================
// ASK HINDSIGHT MEMORY
// ==========================================

async function askMemory() {

    const questionInput =
        document.getElementById(
            "question"
        );

    const answer =
        document.getElementById(
            "answer"
        );


    if (
        !questionInput ||
        !answer
    ) {

        console.error(
            "Question or answer element not found."
        );

        return;

    }


    const question =
        questionInput.value.trim();


    // ==========================================
    // EMPTY QUESTION
    // ==========================================

    if (!question) {

        answer.innerHTML =
            "<p>Please enter a question.</p>";

        return;

    }


    // ==========================================
    // LOADING
    // ==========================================

    answer.innerHTML =
        "<p>🧠 Searching Hindsight memory...</p>";


    try {

        const response =
            await fetch(
                "/api/ask",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            question:
                                question

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Ask API failed"
            );

        }


        if (!data.success) {

            throw new Error(
                data.error ||
                "Unable to get answer"
            );

        }


        // ==========================================
        // DISPLAY ANSWER
        // ==========================================

        answer.innerHTML = `

            <h3>
                🧠 AI Answer
            </h3>

            <p>
                ${escapeHtml(
                    data.answer ||
                    "No answer available."
                )}
            </p>

            <small>
                Based on
                ${Number(
                    data.memories || 0
                )}
                relevant Hindsight memories.
            </small>

        `;

    }

    catch (error) {

        console.error(
            "Ask error:",
            error
        );


        answer.innerHTML = `

            <p>
                ❌ ${escapeHtml(
                    error.message
                )}
            </p>

        `;

    }

}


// ==========================================
// ENTER KEY FOR ASK
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const question =
            document.getElementById(
                "question"
            );


        if (question) {

            question.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Enter"
                    ) {

                        event.preventDefault();

                        askMemory();

                    }

                }
            );

        }


        // Load dashboard
        loadDashboard();

    }
);


// ==========================================
// HELPER: CAPITALIZE
// ==========================================

function capitalize(text) {

    if (!text) {

        return "";

    }

    const value =
        String(text);

    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );

}


// ==========================================
// HELPER: ESCAPE HTML
// ==========================================

function escapeHtml(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        String(text);

    return div.innerHTML;

}