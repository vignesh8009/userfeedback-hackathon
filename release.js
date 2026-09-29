require("dotenv").config();

const { HindsightClient } = require("@vectorize-io/hindsight-client");

const hindsight = new HindsightClient({
    baseUrl: process.env.HINDSIGHT_BASE_URL,
    apiKey: process.env.HINDSIGHT_API_KEY
});

const bankId = process.env.BANK_ID;


// ========================================
// PRODUCT RELEASE
// ========================================

const release = {

    date: "2026-09-10",

    version: "Dashboard v2",

    description:
        "New dashboard design and performance improvements released."

};


// ========================================
// STORE PRODUCT CHANGE IN HINDSIGHT
// ========================================

async function storeRelease() {

    console.log("\n🚀 STORING PRODUCT RELEASE...\n");


    const memory = `
PRODUCT CHANGE

Release Date:
${release.date}

Version:
${release.version}

Description:
${release.description}

Product Area:
Dashboard
`;


    await hindsight.retain(
        bankId,
        memory
    );


    console.log(
        "✅ Product release stored in Hindsight!"
    );

}


storeRelease().catch(error => {

    console.error("\n❌ ERROR:");

    console.error(error);

});