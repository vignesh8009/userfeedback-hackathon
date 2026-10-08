// const Groq = require("groq-sdk");

// const groq = new Groq({
//   apiKey: process.env.GROQ_API_KEY,
// });

// async function analyzeCorrelations(feedback, changes) {
//   try {
//     const feedbackText = feedback
//       .map((item, index) => {
//         return `
// Feedback ${index + 1}:
// Date: ${item.createdAt}
// Message: ${item.message}
// Theme: ${item.theme}
// Category: ${item.category}
// Sentiment: ${item.sentiment}
// Severity: ${item.severity}
// `;
//       })
//       .join("\n");

//     const changesText = changes
//       .map((change, index) => {
//         return `
// Product Change ${index + 1}:
// Title: ${change.title}
// Description: ${change.description}
// Type: ${change.changeType}
// Version: ${change.version}
// Release Date: ${change.releaseDate}
// `;
//       })
//       .join("\n");

//     const completion = await groq.chat.completions.create({
//       model: "openai/gpt-oss-20b",
//       temperature: 0,

//       response_format: {
//         type: "json_object",
//       },

//       messages: [
//         {
//           role: "system",
//           content: `
// You are a product analytics expert.

// Analyze whether product changes are correlated with changes in user feedback.

// Return ONLY valid JSON:

// {
//   "correlations": [
//     {
//       "productChange": "change title",
//       "version": "version",
//       "relatedTheme": "feedback theme",
//       "direction": "increased | decreased | unchanged",
//       "confidence": 0,
//       "evidence": "short explanation",
//       "warning": "Correlation does not prove causation."
//     }
//   ]
// }

// Rules:
// - Compare feedback before and after each product change.
// - Look for themes appearing or increasing after a release.
// - Consider sentiment and severity.
// - Only report meaningful correlations.
// - Do not claim that a product change caused an issue.
// - Use the exact product change title and version.
// - confidence must be between 0 and 1.
// - Keep evidence concise.
//           `,
//         },
//         {
//           role: "user",
//           content: `
// PRODUCT CHANGES:
// ${changesText}

// USER FEEDBACK:
// ${feedbackText}
//           `,
//         },
//       ],
//     });

//     const content = completion.choices[0].message.content;

//     console.log("🔗 Correlation analysis response:", content);

//     return JSON.parse(content);

//   } catch (error) {
//     console.error("❌ Correlation analysis failed:");
//     console.error(error);

//     return null;
//   }
// }

// module.exports = analyzeCorrelations;



// services/correlationService.js


// ==========================================
// Normalize text
// ==========================================
function normalizeText(text) {
  if (!text) {
    return "";
  }

  return text
    .toString()
    .trim()
    .toLowerCase();
}


// ==========================================
// Convert feedback into product-level themes
// ==========================================
function getCanonicalTheme(item) {
  const theme = normalizeText(item.theme);
  const message = normalizeText(item.message);
  const combined = `${theme} ${message}`;

  // Dashboard Performance
  if (
    combined.includes("dashboard") &&
    (
      combined.includes("slow") ||
      combined.includes("loading") ||
      combined.includes("load") ||
      combined.includes("freeze") ||
      combined.includes("performance") ||
      combined.includes("lag")
    )
  ) {
    return "Dashboard Performance";
  }

  // Export Issues
  if (
    combined.includes("export") ||
    combined.includes("download")
  ) {
    return "Export Issues";
  }

  // Notification Overload
  if (
    combined.includes("notification") ||
    combined.includes("notifications")
  ) {
    return "Notification Overload";
  }

  // Positive UI/UX
  if (
    (
      combined.includes("design") ||
      combined.includes("ui") ||
      combined.includes("ux") ||
      combined.includes("interface") ||
      combined.includes("navigation")
    ) &&
    item.sentiment === "positive"
  ) {
    return "Positive UI/UX";
  }

  // Framework Quality
  if (
    combined.includes("framework") ||
    combined.includes("architecture")
  ) {
    return "Framework Quality";
  }

  if (theme) {
    return theme
      .split(" ")
      .map(
        word =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
      )
      .join(" ");
  }

  return "Uncategorized";
}


// ==========================================
// Severity ranking
// ==========================================
const severityRank = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};


// ==========================================
// Calculate average sentiment
// ==========================================
function averageSentiment(items) {
  if (!items.length) {
    return 0;
  }

  const total = items.reduce(
    (sum, item) =>
      sum + Number(item.sentimentScore || 0),
    0
  );

  return total / items.length;
}


// ==========================================
// Analyze correlations
// ==========================================
async function analyzeCorrelations(
  feedback,
  changes
) {
  try {

    if (
      !feedback ||
      feedback.length === 0 ||
      !changes ||
      changes.length === 0
    ) {
      return {
        correlations: [],
      };
    }


    // ======================================
    // Sort feedback by date
    // ======================================
    const sortedFeedback = [...feedback].sort(
      (a, b) =>
        new Date(a.createdAt) -
        new Date(b.createdAt)
    );


    const correlations = [];


    // ======================================
    // Analyze every product change
    // ======================================
    for (const change of changes) {

      const releaseDate =
        new Date(change.releaseDate);


      // ------------------------------------
      // 14-day comparison window
      // ------------------------------------
      const WINDOW =
        14 * 24 * 60 * 60 * 1000;


      const beforeStart =
        new Date(
          releaseDate.getTime() - WINDOW
        );


      const afterEnd =
        new Date(
          releaseDate.getTime() + WINDOW
        );


      // ------------------------------------
      // Feedback BEFORE release
      // ------------------------------------
      const beforeFeedback =
        sortedFeedback.filter(item => {

          const date =
            new Date(item.createdAt);

          return (
            date >= beforeStart &&
            date < releaseDate
          );
        });


      // ------------------------------------
      // Feedback AFTER release
      // ------------------------------------
      const afterFeedback =
        sortedFeedback.filter(item => {

          const date =
            new Date(item.createdAt);

          return (
            date >= releaseDate &&
            date <= afterEnd
          );
        });


      // ------------------------------------
      // Group themes
      // ------------------------------------
      const beforeThemes = {};
      const afterThemes = {};


      beforeFeedback.forEach(item => {

        const theme =
          getCanonicalTheme(item);

        if (
          theme &&
          theme !== "Uncategorized"
        ) {
          beforeThemes[theme] =
            (beforeThemes[theme] || 0) + 1;
        }
      });


      afterFeedback.forEach(item => {

        const theme =
          getCanonicalTheme(item);

        if (
          theme &&
          theme !== "Uncategorized"
        ) {
          afterThemes[theme] =
            (afterThemes[theme] || 0) + 1;
        }
      });


      // ------------------------------------
      // All themes
      // ------------------------------------
      const allThemes =
        new Set([
          ...Object.keys(beforeThemes),
          ...Object.keys(afterThemes),
        ]);


      for (const theme of allThemes) {

        const beforeCount =
          beforeThemes[theme] || 0;

        const afterCount =
          afterThemes[theme] || 0;


        // Ignore themes with no change
        if (
          beforeCount === 0 &&
          afterCount === 0
        ) {
          continue;
        }


        // ----------------------------------
        // Direction
        // ----------------------------------
        let direction = "unchanged";

        if (afterCount > beforeCount) {
          direction = "increased";
        }
        else if (
          afterCount < beforeCount
        ) {
          direction = "decreased";
        }


        // ----------------------------------
        // Find actual feedback
        // ----------------------------------
        const themeBefore =
          beforeFeedback.filter(
            item =>
              getCanonicalTheme(item) ===
              theme
          );


        const themeAfter =
          afterFeedback.filter(
            item =>
              getCanonicalTheme(item) ===
              theme
          );


        // ----------------------------------
        // Sentiment
        // ----------------------------------
        const beforeSentiment =
          averageSentiment(themeBefore);

        const afterSentiment =
          averageSentiment(themeAfter);


        const sentimentChange =
          afterSentiment -
          beforeSentiment;


        // ----------------------------------
        // Only meaningful correlations
        // ----------------------------------
        if (
          direction === "unchanged" ||
          (
            beforeCount === 0 &&
            afterCount === 0
          )
        ) {
          continue;
        }


        // ----------------------------------
        // Confidence
        // ----------------------------------
        let confidence = 0.55;


        if (beforeCount > 0) {
          confidence += 0.05;
        }


        if (afterCount > 0) {
          confidence += 0.05;
        }


        if (afterCount >= 2) {
          confidence += 0.10;
        }


        if (sentimentChange < -0.2) {
          confidence += 0.10;
        }


        confidence =
          Math.min(
            0.9,
            Number(
              confidence.toFixed(2)
            )
          );


        // ----------------------------------
        // Evidence
        // ----------------------------------
        let evidence = "";


        if (
          direction === "increased"
        ) {

          evidence =
            `${theme} feedback increased from ${beforeCount} before the release to ${afterCount} after the release.`;

        }
        else if (
          direction === "decreased"
        ) {

          evidence =
            `${theme} feedback decreased from ${beforeCount} before the release to ${afterCount} after the release.`;

        }


        // ----------------------------------
        // Add correlation
        // ----------------------------------
        correlations.push({

          productChange:
            change.title,

          version:
            change.version || "N/A",

          relatedTheme:
            theme,

          direction,

          confidence,

          evidence,

          warning:
            "Correlation does not prove causation.",

        });

      }
    }


    // ======================================
    // Sort strongest correlations first
    // ======================================
    correlations.sort(
      (a, b) =>
        b.confidence -
        a.confidence
    );


    return {
      correlations:
        correlations.slice(0, 10),
    };


  } catch (error) {

    console.error(
      "Correlation analysis failed:"
    );

    console.error(error);


    return {
      correlations: [],
    };

  }
}


module.exports = analyzeCorrelations;