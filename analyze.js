require("dotenv").config();

const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function analyzeFeedback(feedback) {

    const response = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",

        messages: [
            {
                role: "system",
                content: `
You are a product feedback analysis AI.

Analyze customer feedback and return ONLY valid JSON.

The JSON must contain:

{
  "sentiment": "positive | negative | neutral",
  "theme": "main feedback theme",
  "productArea": "affected product area",
  "severity": "low | medium | high",
  "summary": "short summary"
}
`
            },
            {
                role: "user",
                content: `Analyze this customer feedback:

"${feedback}"`
            }
        ],

        temperature: 0
    });

    return response.choices[0].message.content;
}

async function main() {

    const feedback =
        "The dashboard is very slow and takes too long to load. This is frustrating.";

    console.log("Customer Feedback:");
    console.log(feedback);

    const result = await analyzeFeedback(feedback);

    console.log("\n🤖 AI ANALYSIS:");
    console.log(result);
}

main().catch(error => {
    console.error("\n❌ ERROR:");
    console.error(error);
});