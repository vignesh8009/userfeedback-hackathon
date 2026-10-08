// const Groq = require("groq-sdk");

// const groq = new Groq({
//   apiKey: process.env.GROQ_API_KEY,
// });

// async function analyzeTrends(feedback) {
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
// Sentiment Score: ${item.sentimentScore}
// Severity: ${item.severity}
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
// You are an expert product analytics system.

// Analyze customer feedback over time and identify important trends.

// Return ONLY valid JSON using this format:

// {
//   "overallTrend": "improving | worsening | stable | mixed",
//   "confidence": 0,
//   "summary": "short explanation",
//   "trends": [
//     {
//       "theme": "short theme name",
//       "direction": "improving | worsening | stable",
//       "confidence": 0,
//       "reason": "short explanation",
//       "severity": "low | medium | high | critical"
//     }
//   ]
// }

// Rules:
// - Compare earlier and later feedback.
// - Look for increasing or decreasing complaints.
// - Consider sentiment and severity.
// - Identify themes that appear repeatedly.
// - Do not invent information.
// - confidence must be between 0 and 1.
// - Keep explanations concise.
//           `,
//         },
//         {
//           role: "user",
//           content: feedbackText,
//         },
//       ],
//     });

//     const content = completion.choices[0].message.content;

//     console.log("📈 Trend analysis response:", content);

//     return JSON.parse(content);

//   } catch (error) {
//     console.error("❌ Trend analysis failed:");
//     console.error(error);

//     return null;
//   }
// }

// module.exports = analyzeTrends;

// services/trendService.js


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
// Average sentiment
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
// Highest severity
// ==========================================
function highestSeverity(items) {
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
// Analyze feedback trends
// ==========================================
async function analyzeTrends(feedback) {
  try {

    if (!feedback || feedback.length === 0) {
      return {
        overallTrend: "stable",
        confidence: 0,
        summary:
          "No feedback available for trend analysis.",
        trends: [],
      };
    }


    // ======================================
    // Sort using ACTUAL dates
    // ======================================
    const sortedFeedback = [...feedback]
      .filter(item => item.createdAt)
      .sort(
        (a, b) =>
          new Date(a.createdAt) -
          new Date(b.createdAt)
      );


    if (sortedFeedback.length < 2) {
      return {
        overallTrend: "stable",
        confidence: 0.3,
        summary:
          "Not enough dated feedback to determine a trend.",
        trends: [],
      };
    }


    // ======================================
    // Find actual time range
    // ======================================
    const firstDate =
      new Date(sortedFeedback[0].createdAt);

    const lastDate =
      new Date(
        sortedFeedback[
          sortedFeedback.length - 1
        ].createdAt
      );


    const timeDifference =
      lastDate.getTime() -
      firstDate.getTime();


    // ======================================
    // Split by DATE midpoint
    // ======================================
    const midpointTime =
      firstDate.getTime() +
      timeDifference / 2;


    const earlierFeedback =
      sortedFeedback.filter(
        item =>
          new Date(item.createdAt).getTime() <=
          midpointTime
      );


    const laterFeedback =
      sortedFeedback.filter(
        item =>
          new Date(item.createdAt).getTime() >
          midpointTime
      );


    if (
      earlierFeedback.length === 0 ||
      laterFeedback.length === 0
    ) {
      return {
        overallTrend: "stable",
        confidence: 0.3,
        summary:
          "Not enough feedback across different time periods to determine a trend.",
        trends: [],
      };
    }


    // ======================================
    // Calculate duration of each period
    // ======================================
    const earlierStart =
      new Date(
        earlierFeedback[0].createdAt
      );

    const earlierEnd =
      new Date(
        earlierFeedback[
          earlierFeedback.length - 1
        ].createdAt
      );

    const laterStart =
      new Date(
        laterFeedback[0].createdAt
      );

    const laterEnd =
      new Date(
        laterFeedback[
          laterFeedback.length - 1
        ].createdAt
      );


    const DAY = 24 * 60 * 60 * 1000;


    const earlierDays =
      Math.max(
        1,
        (earlierEnd - earlierStart) / DAY + 1
      );


    const laterDays =
      Math.max(
        1,
        (laterEnd - laterStart) / DAY + 1
      );


    // ======================================
    // Group all feedback by product theme
    // ======================================
    const themeGroups = {};


    sortedFeedback.forEach(item => {

      const theme =
        getCanonicalTheme(item);

      if (
        !theme ||
        theme === "Uncategorized"
      ) {
        return;
      }

      if (!themeGroups[theme]) {
        themeGroups[theme] = [];
      }

      themeGroups[theme].push(item);
    });


    // ======================================
    // Analyze each theme
    // ======================================
    const trends = Object.entries(
      themeGroups
    ).map(([theme, items]) => {

      const earlier =
        items.filter(item =>
          earlierFeedback.includes(item)
        );


      const later =
        items.filter(item =>
          laterFeedback.includes(item)
        );


      // ------------------------------------
      // Frequency normalized by time
      // ------------------------------------
      const earlierRate =
        earlier.length / earlierDays;

      const laterRate =
        later.length / laterDays;


      // ------------------------------------
      // Sentiment
      // ------------------------------------
      const earlierSentiment =
        averageSentiment(earlier);

      const laterSentiment =
        averageSentiment(later);


      const sentimentChange =
        laterSentiment -
        earlierSentiment;


      const rateChange =
        laterRate -
        earlierRate;


      // ------------------------------------
      // Determine whether theme is mainly
      // positive or negative
      // ------------------------------------
      const negativeCount =
        items.filter(
          item =>
            item.sentiment === "negative"
        ).length;


      const positiveCount =
        items.filter(
          item =>
            item.sentiment === "positive"
        ).length;


      const mainlyNegative =
        negativeCount >= positiveCount;


      let direction = "stable";

      let reason =
        "Feedback levels remained relatively consistent.";


      // ====================================
      // Negative issue
      // ====================================
      if (mainlyNegative) {

        if (
          rateChange > 0.05 ||
          sentimentChange < -0.15
        ) {

          direction = "worsening";

          reason =
            "Negative feedback for this theme increased in the later time period.";
        }

        else if (
          rateChange < -0.05 ||
          sentimentChange > 0.15
        ) {

          direction = "improving";

          reason =
            "Negative feedback for this theme decreased in the later time period.";
        }

        else {

          direction = "stable";

          reason =
            "Negative feedback for this theme remained relatively consistent.";
        }

      }


      // ====================================
      // Positive theme
      // ====================================
      else {

        if (
          rateChange > 0.05 ||
          sentimentChange > 0.15
        ) {

          direction = "improving";

          reason =
            "Positive feedback for this theme increased in the later time period.";
        }

        else if (
          rateChange < -0.05 ||
          sentimentChange < -0.15
        ) {

          direction = "worsening";

          reason =
            "Positive feedback for this theme decreased in the later time period.";
        }

        else {

          direction = "stable";

          reason =
            "Positive feedback for this theme remained relatively consistent.";
        }

      }


      // ====================================
      // Confidence
      // ====================================
      let confidence =
        Math.min(
          0.95,
          0.5 + items.length * 0.05
        );


      // Less confidence if theme only appears
      // in one period.
      if (
        earlier.length === 0 ||
        later.length === 0
      ) {
        confidence =
          Math.min(confidence, 0.6);
      }


      return {

        theme,

        direction,

        confidence:
          Number(
            confidence.toFixed(2)
          ),

        reason,

        severity:
          highestSeverity(items),
      };

    });


    // ======================================
    // Sort important trends first
    // ======================================
    trends.sort((a, b) => {

      const directionRank = {
        worsening: 3,
        improving: 2,
        stable: 1,
      };


      const directionDifference =
        (directionRank[b.direction] || 1) -
        (directionRank[a.direction] || 1);


      if (directionDifference !== 0) {
        return directionDifference;
      }


      return (
        (severityRank[b.severity] || 1) -
        (severityRank[a.severity] || 1)
      );

    });


    // ======================================
    // Overall trend
    // ======================================
    const worseningCount =
      trends.filter(
        trend =>
          trend.direction === "worsening"
      ).length;


    const improvingCount =
      trends.filter(
        trend =>
          trend.direction === "improving"
      ).length;


    const stableCount =
      trends.filter(
        trend =>
          trend.direction === "stable"
      ).length;


    let overallTrend = "stable";

    let summary =
      "Feedback patterns remained relatively stable.";


    if (
      worseningCount > improvingCount &&
      worseningCount > stableCount
    ) {

      overallTrend = "worsening";

      summary =
        "Negative feedback themes are increasing or becoming more concerning over time.";

    }

    else if (
      improvingCount > worseningCount &&
      improvingCount > stableCount
    ) {

      overallTrend = "improving";

      summary =
        "Feedback patterns show more improvement in the later time period.";

    }

    else if (
      worseningCount > 0 &&
      improvingCount > 0
    ) {

      overallTrend = "mixed";

      summary =
        "Some feedback themes are worsening while others are improving.";

    }


    // ======================================
    // Overall confidence
    // ======================================
    const confidence =
      trends.length === 0
        ? 0
        : Number(
            (
              trends.reduce(
                (sum, trend) =>
                  sum + trend.confidence,
                0
              ) / trends.length
            ).toFixed(2)
          );


    return {
      overallTrend,

      confidence,

      summary,

      trends:
        trends.slice(0, 8),
    };


  } catch (error) {

    console.error(
      "Trend analysis failed:"
    );

    console.error(error);


    return {
      overallTrend: "stable",
      confidence: 0,
      summary:
        "Trend analysis is temporarily unavailable.",
      trends: [],
    };

  }
}


module.exports = analyzeTrends;