require("dotenv").config();

const express = require("express");
const path = require("path");
const Groq = require("groq-sdk");
const { HindsightClient } = require("@vectorize-io/hindsight-client");

// ======================================================
// CONNECTIONS
// ======================================================

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const hindsight = new HindsightClient({
    baseUrl: process.env.HINDSIGHT_BASE_URL,
    apiKey: process.env.HINDSIGHT_API_KEY
});

const bankId = process.env.BANK_ID;

// ======================================================
// EXPRESS
// ======================================================

const app = express();

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "frontend")
    )
);

// ======================================================
// CLEAN JSON
// ======================================================

function cleanJsonResponse(content) {

    if (!content) {
        throw new Error("Empty Groq response.");
    }

    let cleaned = String(content).trim();

    cleaned = cleaned
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (
        firstBrace !== -1 &&
        lastBrace !== -1 &&
        lastBrace > firstBrace
    ) {
        cleaned =
            cleaned.substring(
                firstBrace,
                lastBrace + 1
            );
    }

    return cleaned;
}

// ======================================================
// ANALYZE NEW FEEDBACK
// ======================================================

async function analyzeFeedback(feedback) {

    const response =
        await groq.chat.completions.create({

            model: "openai/gpt-oss-120b",

            messages: [

                {
                    role: "system",

                    content: `
You are a customer feedback classifier.

Analyze the customer feedback.

Return ONLY JSON.

Use exactly:

{
  "sentiment": "positive",
  "theme": "theme",
  "productArea": "area",
  "severity": "low",
  "summary": "summary"
}

Rules:

sentiment MUST be exactly:
positive
negative
neutral

severity MUST be exactly:
low
medium
high

Do not add any other fields.
Do not use markdown.
`
                },

                {
                    role: "user",

                    content:
                        `Customer feedback:\n${feedback}`
                }

            ],

            temperature: 0
        });

    const content =
        cleanJsonResponse(
            response.choices[0].message.content
        );

    const analysis =
        JSON.parse(content);

    analysis.sentiment =
        String(
            analysis.sentiment || "neutral"
        )
            .toLowerCase()
            .trim();

    analysis.severity =
        String(
            analysis.severity || "medium"
        )
            .toLowerCase()
            .trim();

    if (
        ![
            "positive",
            "negative",
            "neutral"
        ].includes(
            analysis.sentiment
        )
    ) {
        analysis.sentiment = "neutral";
    }

    if (
        ![
            "low",
            "medium",
            "high"
        ].includes(
            analysis.severity
        )
    ) {
        analysis.severity = "medium";
    }

    return analysis;
}

// ======================================================
// STORE FEEDBACK
// ======================================================

async function storeFeedback(
    feedback,
    analysis
) {

    const memory = `
CUSTOMER FEEDBACK

Feedback:
${feedback}

Sentiment:
${analysis.sentiment}

Theme:
${analysis.theme}

Product Area:
${analysis.productArea}

Severity:
${analysis.severity}

Summary:
${analysis.summary}

Date:
${new Date().toISOString().split("T")[0]}
`;

    await hindsight.retain(
        bankId,
        memory
    );

    console.log(
        "🧠 Feedback stored."
    );

    console.log(
        "Sentiment:",
        analysis.sentiment
    );
}

// ======================================================
// GET MEMORIES
// ======================================================

async function getFeedbackMemories() {

    const result =
        await hindsight.recall(
            bankId,

            `
Find all customer feedback.

Include positive, negative, and neutral feedback.

Include:

- customer complaints
- customer praise
- suggestions
- feature requests
- dashboard feedback
- performance feedback
- report export feedback
- notification feedback
- usability feedback
- product feedback

Return all relevant customer feedback memories.
`
        );

    return result.results || [];
}

// ======================================================
// EXTRACT MEMORY TEXT
// ======================================================

function getMemoryText(memory) {

    if (!memory) {
        return "";
    }

    if (typeof memory === "string") {
        return memory;
    }

    return String(
        memory.text ||
        memory.content ||
        memory.memory ||
        memory.data?.text ||
        memory.data?.content ||
        ""
    );
}

// ======================================================
// AI SENTIMENT COUNTING
// ======================================================

async function calculateSentimentCounts(
    memories
) {

    let positive = 0;
    let negative = 0;
    let neutral = 0;

    console.log("\n=================================");
    console.log("🧠 AI SENTIMENT ANALYSIS");
    console.log("Memories:", memories.length);
    console.log("=================================\n");

    /*
       Process memories in batches.

       This avoids sending an extremely large prompt
       to Groq and prevents JSON validation failures.
    */

    const batchSize = 15;

    for (
        let start = 0;
        start < memories.length;
        start += batchSize
    ) {

        const batch =
            memories.slice(
                start,
                start + batchSize
            );

        const feedbackText =
            batch
                .map(
                    (memory, index) => {

                        return `
ITEM ${index + 1}

${getMemoryText(memory)}
`;

                    }
                )
                .join("\n");


        try {

            const response =
                await groq.chat.completions.create({

                    model:
                        "openai/gpt-oss-120b",

                    messages: [

                        {
                            role: "system",

                            content: `
You are a customer feedback sentiment classifier.

Classify EVERY item.

Return ONLY valid JSON.

Use this exact format:

{
  "items": [
    {
      "sentiment": "positive"
    }
  ]
}

Rules:

- There MUST be exactly one item for every input item.
- Keep the same order.
- sentiment MUST be exactly one of:
  positive
  negative
  neutral

Sentiment rules:

positive:
The customer expresses satisfaction, appreciation,
liking, praise, happiness, or approval.

negative:
The customer expresses frustration, annoyance,
complaint, poor experience, slowness, failure,
problem, dislike, or dissatisfaction.

neutral:
The feedback is factual without a clear positive
or negative opinion.

If feedback contains both positive and negative:
choose the dominant customer sentiment.

Return JSON only.
`
                        },

                        {
                            role: "user",

                            content:
                                feedbackText
                        }

                    ],

                    temperature: 0
                });


            const content =
                cleanJsonResponse(
                    response.choices[0]
                        .message
                        .content
                );

            const result =
                JSON.parse(content);


            if (
                !result.items ||
                !Array.isArray(
                    result.items
                )
            ) {
                throw new Error(
                    "Invalid sentiment result."
                );
            }


            // ------------------------------------------
            // Count classifications
            // ------------------------------------------

            for (
                let i = 0;
                i < batch.length;
                i++
            ) {

                const item =
                    result.items[i];

                const sentiment =
                    String(
                        item?.sentiment ||
                        "neutral"
                    )
                        .toLowerCase()
                        .trim();


                if (
                    sentiment ===
                    "positive"
                ) {

                    positive++;

                }

                else if (
                    sentiment ===
                    "negative"
                ) {

                    negative++;

                }

                else {

                    neutral++;

                }

            }


            console.log(
                `Processed ${Math.min(
                    start + batch.length,
                    memories.length
                )}/${memories.length}`
            );

        }

        catch (error) {

            console.error(
                "⚠️ Sentiment batch failed:",
                error.message
            );

            /*
               If Groq fails for a batch, classify
               using simple fallback rules.
            */

            for (const memory of batch) {

                const text =
                    getMemoryText(memory)
                        .toLowerCase();


                const positiveWords = [
                    "love",
                    "loves",
                    "like",
                    "likes",
                    "appreciate",
                    "appreciates",
                    "excellent",
                    "great",
                    "good",
                    "happy",
                    "satisfied",
                    "amazing",
                    "positive",
                    "beautiful",
                    "easy to use"
                ];

                const negativeWords = [
                    "slow",
                    "slower",
                    "slowly",
                    "terrible",
                    "bad",
                    "poor",
                    "fail",
                    "fails",
                    "failure",
                    "failing",
                    "frustrat",
                    "annoy",
                    "problem",
                    "issue",
                    "freez",
                    "unable",
                    "overwhelming",
                    "unnecessary",
                    "complaint"
                ];


                let positiveScore = 0;
                let negativeScore = 0;


                for (
                    const word of
                    positiveWords
                ) {

                    if (
                        text.includes(word)
                    ) {
                        positiveScore++;
                    }

                }


                for (
                    const word of
                    negativeWords
                ) {

                    if (
                        text.includes(word)
                    ) {
                        negativeScore++;
                    }

                }


                if (
                    positiveScore >
                    negativeScore
                ) {

                    positive++;

                }

                else if (
                    negativeScore >
                    positiveScore
                ) {

                    negative++;

                }

                else {

                    neutral++;

                }

            }

        }

    }


    console.log("\n=================================");
    console.log("📊 FINAL SENTIMENT COUNTS");
    console.log("=================================");
    console.log("🟢 Positive:", positive);
    console.log("🔴 Negative:", negative);
    console.log("⚪ Neutral :", neutral);
    console.log(
        "📊 Counted:",
        positive +
        negative +
        neutral
    );
    console.log(
        "📦 Memories:",
        memories.length
    );
    console.log("=================================\n");


    return {

        positive,
        negative,
        neutral

    };
}

// ======================================================
// SYNTHESIZE FEEDBACK
// ======================================================

async function synthesizeFeedback(
    memories
) {

    if (
        !memories ||
        memories.length === 0
    ) {

        return {

            topThemes: [],

            overallSentiment:
                "neutral",

            highSeverityIssues: [],

            emergingProblems: [],

            recommendedActions: []

        };

    }


    /*
       Limit synthesis input so Groq does not
       fail because of an oversized/invalid request.
    */

    const feedbackText =
        memories
            .slice(0, 30)
            .map(
                (memory, index) => {

                    return `
Feedback ${index + 1}:

${getMemoryText(memory)}
`;

                }
            )
            .join("\n");


    try {

        const response =
            await groq.chat.completions.create({

                model:
                    "openai/gpt-oss-120b",

                messages: [

                    {
                        role: "system",

                        content: `
You are a product feedback intelligence agent.

Analyze the feedback.

Return ONLY valid JSON.

Use exactly:

{
  "topThemes": [],
  "overallSentiment": "neutral",
  "highSeverityIssues": [],
  "emergingProblems": [],
  "recommendedActions": []
}

Rules:

topThemes must be an array.

Each topThemes item must contain:

{
  "theme": "string",
  "mentions": 0,
  "sentiment": "positive",
  "severity": "low"
}

mentions must be a number.

overallSentiment must be:
positive, negative, or neutral.

All other arrays must contain strings.

Do not use markdown.
`
                    },

                    {
                        role: "user",

                        content:
                            feedbackText
                    }

                ],

                temperature: 0
            });


        const content =
            cleanJsonResponse(
                response.choices[0]
                    .message
                    .content
            );

        return JSON.parse(content);

    }

    catch (error) {

        console.error(
            "⚠️ Groq synthesis failed:",
            error.message
        );

        // Return safe dashboard data
        return {

            topThemes: [],

            overallSentiment:
                "neutral",

            highSeverityIssues: [],

            emergingProblems: [],

            recommendedActions: []

        };

    }
}

// ======================================================
// TEST API
// ======================================================

app.get(
    "/api/test",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Backend is connected!"

        });

    }
);

// ======================================================
// SUMMARY API
// ======================================================

app.get(
    "/api/summary",
    async (req, res) => {

        try {

            console.log(
                "\n🧠 Dashboard requested feedback summary..."
            );


            // ------------------------------------------
            // GET HINDSIGHT MEMORIES
            // ------------------------------------------

            const memories =
                await getFeedbackMemories();

            console.log(
                `Found ${memories.length} memories in Hindsight.`
            );


            // ------------------------------------------
            // AI SENTIMENT COUNT
            // ------------------------------------------

            const sentimentCounts =
                await calculateSentimentCounts(
                    memories
                );


            // ------------------------------------------
            // NO MEMORIES
            // ------------------------------------------

            if (
                memories.length === 0
            ) {

                return res.json({

                    success: true,

                    memories: 0,

                    sentimentCounts: {

                        positive: 0,

                        negative: 0,

                        neutral: 0

                    },

                    insights: {

                        topThemes: [],

                        overallSentiment:
                            "neutral",

                        highSeverityIssues: [],

                        emergingProblems: [],

                        recommendedActions: []

                    }

                });

            }


            // ------------------------------------------
            // SYNTHESIS
            // ------------------------------------------

            const insights =
                await synthesizeFeedback(
                    memories
                );


            // ------------------------------------------
            // ADD COUNTS
            // ------------------------------------------

            insights.sentimentCounts =
                sentimentCounts;


            // ------------------------------------------
            // SEND RESPONSE
            // ------------------------------------------

            res.json({

                success: true,

                memories:
                    memories.length,

                sentimentCounts:
                    sentimentCounts,

                insights:
                    insights

            });

        }

        catch (error) {

            console.error(
                "\n❌ Summary API error:"
            );

            console.error(
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// ADD CUSTOMER FEEDBACK
// ======================================================

app.post(
    "/api/feedback",
    async (req, res) => {

        try {

            const feedback =
                req.body.feedback;


            if (
                !feedback ||
                typeof feedback !== "string" ||
                feedback.trim() === ""
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Feedback is required."

                });

            }


            console.log(
                "\n📥 NEW CUSTOMER FEEDBACK"
            );

            console.log(
                feedback
            );


            // ------------------------------------------
            // AI ANALYSIS
            // ------------------------------------------

            const analysis =
                await analyzeFeedback(
                    feedback
                );


            console.log(
                "\n📊 AI ANALYSIS:"
            );

            console.log(
                JSON.stringify(
                    analysis,
                    null,
                    2
                )
            );


            // ------------------------------------------
            // STORE
            // ------------------------------------------

            await storeFeedback(
                feedback,
                analysis
            );


            // ------------------------------------------
            // RESPONSE
            // ------------------------------------------

            res.json({

                success: true,

                feedback:
                    feedback,

                analysis:
                    analysis

            });

        }

        catch (error) {

            console.error(
                "\n❌ Feedback API error:"
            );

            console.error(
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// ASK MEMORY
// ======================================================

app.post(
    "/api/ask",
    async (req, res) => {

        try {

            const question =
                req.body.question;


            if (
                !question ||
                typeof question !== "string" ||
                question.trim() === ""
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Question is required."

                });

            }


            const result =
                await hindsight.recall(
                    bankId,
                    question
                );


            const memories =
                result.results || [];


            if (
                memories.length === 0
            ) {

                return res.json({

                    success: true,

                    answer:
                        "I could not find relevant customer feedback in memory.",

                    memories: 0

                });

            }


            const memoryText =
                memories
                    .map(
                        (memory, index) => {

                            return `
Memory ${index + 1}:

${getMemoryText(memory)}
`;

                        }
                    )
                    .join("\n");


            const response =
                await groq.chat.completions.create({

                    model:
                        "openai/gpt-oss-120b",

                    messages: [

                        {
                            role: "system",

                            content: `
You are a customer feedback intelligence assistant.

Answer using ONLY the provided customer feedback.

Do not invent information.

Give a concise and useful answer.
`
                        },

                        {
                            role: "user",

                            content: `
QUESTION:

${question}

CUSTOMER FEEDBACK:

${memoryText}
`
                        }

                    ],

                    temperature: 0.2

                });


            const answer =
                response
                    .choices[0]
                    .message
                    .content;


            res.json({

                success: true,

                answer:
                    answer,

                memories:
                    memories.length

            });

        }

        catch (error) {

            console.error(
                "❌ Ask API error:",
                error.message
            );

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ======================================================
// ROOT
// ======================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "frontend",
                "index.html"
            )
        );

    }
);

// ======================================================
// START SERVER
// ======================================================

const PORT = 3000;

app.listen(
    PORT,
    () => {

        console.log(
            "\n================================="
        );

        console.log(
            "🚀 FEEDBACK INTELLIGENCE SERVER"
        );

        console.log(
            "================================="
        );

        console.log(
            `🌐 Dashboard: http://localhost:${PORT}`
        );

        console.log(
            `🧪 Test API: http://localhost:${PORT}/api/test`
        );

        console.log(
            `🧠 Summary API: http://localhost:${PORT}/api/summary`
        );

        console.log(
            `📥 Feedback API: http://localhost:${PORT}/api/feedback`
        );

        console.log(
            `❓ Ask API: http://localhost:${PORT}/api/ask`
        );

        console.log(
            "=================================\n"
        );

    }
);