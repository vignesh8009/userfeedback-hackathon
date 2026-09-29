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
// RECALL PRODUCT CHANGE + FEEDBACK
// ========================================

async function getRelevantMemories() {

    const result = await hindsight.recall(
        bankId,
        `
        Find:

        1. Product releases or product changes
        2. Customer feedback about dashboard performance
        3. Feedback before and after Dashboard v2
        4. Dates associated with the feedback

        Compare the timeline around the Dashboard v2 release.
        `
    );

    return result.results;

}


// ========================================
// ANALYZE CORRELATION
// ========================================

async function analyzeCorrelation(memories) {


    const memoryText = memories

        .map((memory, index) => {

            return `
Memory ${index + 1}:

${memory.text}
`;

        })

        .join("\n");


    const response =
        await groq.chat.completions.create({

            model: "openai/gpt-oss-120b",

            messages: [

                {

                    role: "system",

                    content: `
You are a product intelligence analyst.

Analyze the relationship between the product release
and customer feedback.

Determine whether there is evidence of a
POTENTIAL CORRELATION.

Do NOT claim that the release definitely caused
the problem.

Compare:

- Feedback before release
- Feedback after release
- Frequency
- Severity
- Sentiment
- Timing

Return ONLY valid JSON:

{
  "release": "",
  "potentialCorrelation": true,
  "confidence": "low | medium | high",
  "beforeRelease": {
    "summary": "",
    "complaintLevel": "low | medium | high"
  },
  "afterRelease": {
    "summary": "",
    "complaintLevel": "low | medium | high"
  },
  "evidence": [],
  "conclusion": "",
  "recommendedInvestigation": []
}
`

                },

                {

                    role: "user",

                    content: `
Here are the memories:

${memoryText}
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
        "\n🧠 RECALLING RELEASE + FEEDBACK HISTORY..."
    );


    const memories =
        await getRelevantMemories();


    console.log(
        `\nFound ${memories.length} relevant memories.`
    );


    if (memories.length === 0) {

        console.log(
            "No relevant memories found."
        );

        return;

    }


    console.log(
        "\n🔎 ANALYZING POTENTIAL CORRELATION..."
    );


    const result =
        await analyzeCorrelation(memories);


    console.log(
        "\n=========================================="
    );


    console.log(
        "       🚀 PRODUCT CHANGE ANALYSIS"
    );


    console.log(
        "=========================================="
    );


    console.log(
        JSON.stringify(result, null, 2)
    );


    console.log(
        "\n=========================================="
    );


    console.log(
        "✅ ANALYSIS COMPLETE"
    );


    console.log(
        "=========================================="

    );

}


main().catch(error => {

    console.error("\n❌ ERROR:");

    console.error(error);

});