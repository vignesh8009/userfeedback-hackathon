require("dotenv").config();

const { HindsightClient } = require("@vectorize-io/hindsight-client");

const hindsight = new HindsightClient({
    baseUrl: process.env.HINDSIGHT_BASE_URL,
    apiKey: process.env.HINDSIGHT_API_KEY
});

const bankId = process.env.BANK_ID;


// ========================================
// HISTORICAL CUSTOMER FEEDBACK
// ========================================

const historicalFeedback = [

    {
        date: "2026-09-01",
        source: "App Review",
        text: "The dashboard is slightly slow when I open it."
    },

    {
        date: "2026-09-05",
        source: "Customer Support",
        text: "Dashboard takes a few seconds to load."
    },

    {
        date: "2026-09-10",
        source: "Survey",
        text: "The dashboard has become slower recently."
    },

    {
        date: "2026-09-12",
        source: "App Review",
        text: "Dashboard loading is frustrating and sometimes freezes."
    },

    {
        date: "2026-09-15",
        source: "Customer Support",
        text: "The dashboard is extremely slow on my laptop."
    },

    {
        date: "2026-09-18",
        source: "Survey",
        text: "The new dashboard looks good but performance is poor."
    },

    {
        date: "2026-09-22",
        source: "App Review",
        text: "Dashboard keeps freezing and takes too long to load."
    },

    {
        date: "2026-09-25",
        source: "Customer Support",
        text: "The dashboard is extremely slow after the latest update."
    },

    {
        date: "2026-09-27",
        source: "Survey",
        text: "Dashboard performance is terrible and very frustrating."
    }

];


// ========================================
// STORE HISTORICAL FEEDBACK
// ========================================

async function storeHistoricalFeedback() {

    console.log("\n📅 STORING HISTORICAL FEEDBACK...\n");

    for (const item of historicalFeedback) {

        const memory = `
CUSTOMER FEEDBACK

Date:
${item.date}

Source:
${item.source}

Feedback:
${item.text}

Product Area:
Dashboard

Topic:
Dashboard Performance
`;

        try {

            await hindsight.retain(
                bankId,
                memory
            );

            console.log(
                `✅ Stored: ${item.date} | ${item.source}`
            );

        } catch (error) {

            console.error(
                `❌ Failed: ${item.date}`,
                error.message
            );

        }
    }

    console.log(
        "\n✅ HISTORICAL FEEDBACK STORED!"
    );
}


// ========================================
// RUN
// ========================================

storeHistoricalFeedback().catch(error => {

    console.error("\n❌ ERROR:");
    console.error(error);

});