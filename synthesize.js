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
// GET MEMORIES FROM HINDSIGHT
// ========================================

async function getFeedbackMemories() {

    const result = await hindsight.recall(
        bankId,
        `
        Find all customer feedback about:
        dashboard performance,
        dashboard freezing,
        report export problems,
        notifications,
        and other product complaints.

        Include related feedback and repeated problems.
        `
    );

    return result.results;
}


// ========================================
// SYNTHESIZE FEEDBACK USING GROQ
// ========================================

async function synthesizeFeedback(memories) {

    const feedbackText = memories
        .map((memory, index) => {
            return `Feedback ${index + 1}:\n${memory.text}`;
        })
        .join("\n\n");


    const response = await groq.chat.completions.create({

        model: "openai/gpt-oss-120b",

        messages: [

            {
                role: "system",

                content: `
You are a product feedback intelligence agent.

Analyze the collected customer feedback.

Identify:

1. Most common themes
2. Number of mentions for each theme
3. Overall sentiment
4. High severity issues
5. Emerging problems
6. Recommended areas for investigation

Return ONLY valid JSON using this format:

{
  "topThemes": [
    {
      "theme": "theme name",
      "mentions": 0,
      "sentiment": "positive | negative | mixed",
      "severity": "low | medium | high"
    }
  ],
  "overallSentiment": "positive | negative | mixed | neutral",
  "highSeverityIssues": [],
  "emergingProblems": [],
  "recommendedActions": []
}
`
            },

            {
                role: "user",

                content: `
Here are the customer feedback memories:

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

    console.log("\n🧠 RECALLING FEEDBACK FROM HINDSIGHT...\n");


    const memories =
        await getFeedbackMemories();


    console.log(
        `Found ${memories.length} relevant memories.`
    );


    if (memories.length === 0) {

        console.log(
            "No feedback memories found."
        );

        return;
    }


    console.log(
        "\n🤖 SYNTHESIZING FEEDBACK...\n"
    );


    const insights =
        await synthesizeFeedback(memories);


    console.log(
        "=========================================="
    );

    console.log(
        "       📊 FEEDBACK INTELLIGENCE"
    );

    console.log(
        "=========================================="
    );


    console.log(
        JSON.stringify(insights, null, 2)
    );


    console.log(
        "\n=========================================="
    );

    console.log(
        "✅ SYNTHESIS COMPLETE"
    );

    console.log(
        "=========================================="
    );
}


main().catch(error => {

    console.error("\n❌ ERROR:");
    console.error(error);

});