// const Groq = require("groq-sdk");

// const groq = new Groq({
//   apiKey: process.env.GROQ_API_KEY,
// });

// async function synthesizeThemes(feedback) {
//   try {
//     const feedbackText = feedback
//       .map((item, index) => {
//         return `${index + 1}. ${item.message}
// Theme: ${item.theme}
// Category: ${item.category}
// Sentiment: ${item.sentiment}
// Severity: ${item.severity}`;
//       })
//       .join("\n\n");

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
// You are a product feedback synthesis expert.

// Group similar feedback into broader recurring themes.

// Return ONLY valid JSON in this format:

// {
//   "themes": [
//     {
//       "name": "short theme name",
//       "count": 0,
//       "sentiment": "positive | negative | neutral | mixed",
//       "severity": "low | medium | high | critical",
//       "summary": "short explanation",
//       "feedbackIndexes": [1, 2]
//     }
//   ]
// }

// Rules:
// - Combine similar issues even when their wording is different.
// - Do not create a separate theme for every feedback.
// - Use clear product-level theme names.
// - Count how many feedback items belong to each theme.
// - feedbackIndexes must contain the original feedback numbers.
// - Sort themes from most important to least important.
// - Consider frequency, negative sentiment, and severity.
// - Do not invent information.
//           `,
//         },
//         {
//           role: "user",
//           content: feedbackText,
//         },
//       ],
//     });

//     const content = completion.choices[0].message.content;

//     console.log("🧠 Theme synthesis response:", content);

//     return JSON.parse(content);

//   } catch (error) {
//     console.error("❌ Theme synthesis failed:");
//     console.error(error);

//     return null;
//   }
// }

// module.exports = synthesizeThemes;



// services/synthesisService.js

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
// Convert individual AI themes into
// broader product-level themes
// ==========================================
function getCanonicalTheme(item) {
  const theme = normalizeText(item.theme);
  const message = normalizeText(item.message);
  const combined = `${theme} ${message}`;

  // ----------------------------------------
  // Dashboard Performance
  // ----------------------------------------
  if (
    combined.includes("dashboard") &&
    (
      combined.includes("slow") ||
      combined.includes("loading") ||
      combined.includes("load") ||
      combined.includes("freeze") ||
      combined.includes("freezes") ||
      combined.includes("performance") ||
      combined.includes("lag") ||
      combined.includes("frustrat")
    )
  ) {
    return "Dashboard Performance";
  }

  // ----------------------------------------
  // Export Issues
  // ----------------------------------------
  if (
    combined.includes("export") ||
    combined.includes("download") ||
    combined.includes("report generation")
  ) {
    return "Export Issues";
  }

  // ----------------------------------------
  // Notification Overload
  // ----------------------------------------
  if (
    combined.includes("notification") ||
    combined.includes("notifications") ||
    combined.includes("alert overload")
  ) {
    return "Notification Overload";
  }

  // ----------------------------------------
  // Positive UI/UX
  // ----------------------------------------
  if (
    (
      combined.includes("design") ||
      combined.includes("ui") ||
      combined.includes("ux") ||
      combined.includes("interface") ||
      combined.includes("navigation")
    ) &&
    (
      item.sentiment === "positive" ||
      combined.includes("love") ||
      combined.includes("great") ||
      combined.includes("good") ||
      combined.includes("excellent")
    )
  ) {
    return "Positive UI/UX";
  }

  // ----------------------------------------
  // Framework Quality
  // ----------------------------------------
  if (
    combined.includes("framework") ||
    combined.includes("architecture") ||
    combined.includes("code quality")
  ) {
    return "Framework Quality";
  }

  // ----------------------------------------
  // Feature Requests
  // ----------------------------------------
  if (
    combined.includes("feature request") ||
    combined.includes("would like") ||
    combined.includes("please add") ||
    combined.includes("should add") ||
    combined.includes("add a feature")
  ) {
    return "Feature Requests";
  }

  // ----------------------------------------
  // Security
  // ----------------------------------------
  if (
    combined.includes("security") ||
    combined.includes("privacy") ||
    combined.includes("password") ||
    combined.includes("authentication")
  ) {
    return "Security";
  }

  // ----------------------------------------
  // Pricing
  // ----------------------------------------
  if (
    combined.includes("price") ||
    combined.includes("pricing") ||
    combined.includes("expensive") ||
    combined.includes("cost")
  ) {
    return "Pricing";
  }

  // ----------------------------------------
  // Support
  // ----------------------------------------
  if (
    combined.includes("support") ||
    combined.includes("customer service") ||
    combined.includes("help desk")
  ) {
    return "Support";
  }

  // ----------------------------------------
  // Fallback
  // ----------------------------------------
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
// Find majority sentiment
// ==========================================
function getMajoritySentiment(items) {
  const counts = {
    positive: 0,
    negative: 0,
    neutral: 0,
    mixed: 0,
  };

  items.forEach(item => {
    if (counts[item.sentiment] !== undefined) {
      counts[item.sentiment]++;
    }
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])[0][0];
}


// ==========================================
// Find highest severity
// ==========================================
function getHighestSeverity(items) {
  const severityRank = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  let highest = "low";

  items.forEach(item => {
    const severity = item.severity || "low";

    if (
      (severityRank[severity] || 1) >
      (severityRank[highest] || 1)
    ) {
      highest = severity;
    }
  });

  return highest;
}


// ==========================================
// Create product-level summary
// ==========================================
function createSummary(
  theme,
  items,
  sentiment,
  severity
) {
  const count = items.length;

  const itemWord = count === 1
    ? "feedback item"
    : "feedback items";

  if (sentiment === "negative") {
    return `${count} ${itemWord} report ${theme.toLowerCase()} issues, with ${severity} severity.`;
  }

  if (sentiment === "positive") {
    return `${count} ${itemWord} show positive feedback about ${theme.toLowerCase()}.`;
  }

  if (sentiment === "mixed") {
    return `${count} ${itemWord} contain mixed feedback about ${theme.toLowerCase()}.`;
  }

  return `${count} ${itemWord} relate to ${theme.toLowerCase()}.`;
}


// ==========================================
// Main synthesis function
// ==========================================
async function synthesizeThemes(feedback) {
  try {
    if (!feedback || feedback.length === 0) {
      return {
        themes: [],
      };
    }

    // ======================================
    // Group feedback into canonical themes
    // ======================================
    const groups = {};

    feedback.forEach(item => {
      const canonicalTheme =
        getCanonicalTheme(item);

      if (
        !canonicalTheme ||
        canonicalTheme === "Uncategorized"
      ) {
        return;
      }

      if (!groups[canonicalTheme]) {
        groups[canonicalTheme] = [];
      }

      groups[canonicalTheme].push(item);
    });


    // ======================================
    // Convert groups into dashboard themes
    // ======================================
    const themes = Object.entries(groups).map(
      ([theme, items]) => {

        const sentiment =
          getMajoritySentiment(items);

        const severity =
          getHighestSeverity(items);

        return {
          name: theme,

          count: items.length,

          sentiment,

          severity,

          summary: createSummary(
            theme,
            items,
            sentiment,
            severity
          ),

          feedbackIndexes: items.map(
            item => feedback.indexOf(item) + 1
          ),
        };
      }
    );


    // ======================================
    // Sort by importance
    // ======================================
    const severityRank = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };

    themes.sort((a, b) => {

      // Critical/high issues first
      const severityDifference =
        (severityRank[b.severity] || 1) -
        (severityRank[a.severity] || 1);

      if (severityDifference !== 0) {
        return severityDifference;
      }

      // Then frequency
      return b.count - a.count;
    });


    // ======================================
    // Return top 8 themes
    // ======================================
    return {
      themes: themes.slice(0, 8),
    };

  } catch (error) {

    console.error(
      "Theme synthesis failed:"
    );

    console.error(error);

    // IMPORTANT:
    // Never break the dashboard if analytics
    // processing fails.
    return {
      themes: [],
    };
  }
}


module.exports = synthesizeThemes;