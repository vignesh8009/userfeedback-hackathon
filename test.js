require("dotenv").config();

const { HindsightClient } = require("@vectorize-io/hindsight-client");

const client = new HindsightClient({
    baseUrl: process.env.HINDSIGHT_BASE_URL,
    apiKey: process.env.HINDSIGHT_API_KEY
});

async function main() {

    const bankId = process.env.BANK_ID;

    console.log("Connecting to Hindsight...");

    // Store customer feedback
    await client.retain(
        bankId,
        `
        Customer Feedback:
        "The dashboard is very slow and takes too long to load.
        This is frustrating."

        Source: Customer Support
        Product Area: Dashboard
        Date: 2026-09-28
        `
    );

    console.log("✅ Feedback stored in Hindsight!");

    // Search memory
    const result = await client.recall(
        bankId,
        "What problems have customers reported about the dashboard?"
    );

    console.log("\n🧠 HINDSIGHT MEMORY:");

    result.results.forEach((memory) => {
        console.log("-", memory.text);
    });
}

main().catch((error) => {
    console.error("❌ Error:", error.message);
});