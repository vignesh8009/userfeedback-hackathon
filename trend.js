require("dotenv").config();

const Groq = require("groq-sdk");
const { HindsightClient } = require("@vectorize-io/hindsight-client");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const hindsight = new HindsightClient({
    baseUrl: process.env.HINDSIGHT_BASE_URL,
    apiKey: process.env.HINDSIGHT_API_KEY
});

const bankId = process.env.BANK_ID;


// ========================================
// GET HISTORICAL MEMORIES
// ========================================

async function getHistoricalFeedback() {

    const result = await hindsight.recall(
        bankId,
        `
        Find historical customer feedback about
        dashboard performance, dashboard loading,
        dashboard freezing and dashboard speed.

        Pay special attention to dates and changes
        over time.
        `
    );

    return result.results;
}


// ========================================
// ANALYZE TREND WITH GROQ
// ========================================

async function analyzeTrend(memories) {

    const feedbackText = memories
        .map((memory, index) => {

            return `Memory ${index + 1}:
${memory.text}`;

        })
        .join("\n\n");


    const response =
        await groq.chat.completions.create({

            model: "openai/gpt-oss-120b",

            messages: [

                {
                    role: "system",

                    content: `
You are a product analytics agent.

Analyze the historical customer feedback.

Determine whether dashboard performance
is improving, worsening, or remaining stable.

Look at:

- dates
- frequency of complaints
- severity
- sentiment
- repeated issues

Return ONLY valid JSON:

{
  "trend": "improving | worsening | stable",
  "confidence": "low | medium | high",
  "earliestFeedback": "short description",
  "latestFeedback": "short description",
  "evidence": [],
  "summary": "short explanation"
}
`
                },

                {
                    role: "user",

                    content: `
Historical customer feedback:

${feedbackText}
`
                }

            ],

            temperature: 0
        });


    return JSON.parse(
        response.choices[0].message.content
    );
}


// ========================================
// MAIN
// ========================================

async function main() {

    console.log(
        "\n🧠 RECALLING HISTORICAL FEEDBACK..."
    );


    const memories =
        await getHistoricalFeedback();


    console.log(
        `\nFound ${memories.length} relevant memories.`
    );


    if (memories.length === 0) {

        console.log(
            "No historical feedback found."
        );

        return;
    }


    console.log(
        "\n📈 ANALYZING TREND..."
    );


    const trend =
        await analyzeTrend(memories);


    console.log(
        "\n=========================================="
    );

    console.log(
        "          📈 TREND ANALYSIS"
    );

    console.log(
        "=========================================="
    );


    console.log(
        JSON.stringify(trend, null, 2)
    );


    console.log(
        "\n=========================================="
    );

    console.log(
        "✅ TREND ANALYSIS COMPLETE"
    );

    console.log(
        "=========================================="
    );
}


main().catch(error => {

    console.error("\n❌ ERROR:");
    console.error(error);

});