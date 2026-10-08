const { HindsightClient } = require("@vectorize-io/hindsight-client");

const hindsight = new HindsightClient({
  baseUrl: process.env.HINDSIGHT_API_URL,
  apiKey: process.env.HINDSIGHT_API_KEY,
});

const BANK_ID = "user-feedback";

async function storeFeedbackMemory(feedback, analysis) {
  try {
    const memory = `
User Feedback:
${feedback}

AI Analysis:
Sentiment: ${analysis.sentiment}
Theme: ${analysis.theme}
Category: ${analysis.category}
Severity: ${analysis.severity}
Analysis: ${analysis.analysis}
    `.trim();

    await hindsight.retain(
      BANK_ID,
      memory
    );

    console.log("🧠 Feedback stored in Hindsight");

    return true;
  } catch (error) {
    console.error("❌ Hindsight retain failed:");
    console.error(error.message);

    return false;
  }
}

async function recallFeedbackMemories(query) {
  try {
    const result = await hindsight.recall(
      BANK_ID,
      query
    );

    console.log("🧠 Hindsight memories recalled");

    return result;
  } catch (error) {
    console.error("❌ Hindsight recall failed:");
    console.error(error.message);

    return [];
  }
}

module.exports = {
  storeFeedbackMemory,
  recallFeedbackMemories,
};