const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function analyzeFeedback(message) {
  try {
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",

      temperature: 0,

      response_format: {
        type: "json_object",
      },

      messages: [
        {
          role: "system",
          content: `
You are an expert user-feedback analysis system.

Analyze the user's feedback and return ONLY valid JSON.

The JSON must contain exactly these fields:

{
  "sentiment": "positive | negative | neutral | mixed",
  "sentimentScore": number between -1 and 1,
  "theme": "short main theme",
  "category": "short category",
  "severity": "low | medium | high | critical",
  "confidence": number between 0 and 1,
  "analysis": "short explanation"
}

Rules:

- sentiment describes the emotional tone.
- sentimentScore:
  - -1 = extremely negative
  - 0 = neutral
  - 1 = extremely positive
- theme should identify the main recurring issue or topic.
- category should describe the type of feedback, such as:
  Performance, Bug, Feature Request, UI/UX, Reliability,
  Notifications, Security, Pricing, Support, Other.
- severity describes how important the issue is.
- confidence represents how confident you are in the classification.
- Do not invent facts that are not present in the feedback.
- Keep the analysis concise.
          `,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const content = completion.choices[0].message.content;

    console.log("🤖 AI response:", content);

    const result = JSON.parse(content);

    return {
      sentiment: result.sentiment,
      sentimentScore: Number(result.sentimentScore),
      theme: result.theme,
      category: result.category,
      severity: result.severity,
      confidence: Number(result.confidence),
      analysis: result.analysis,
    };

  } catch (error) {
    console.error("❌ AI analysis failed:");
    console.error(error);

    return null;
  }
}

module.exports = analyzeFeedback;