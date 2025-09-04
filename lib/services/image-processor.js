/**
 * Enhanced Image Processing Service
 * Processes and analyzes images of homework questions with robust error handling
 */
const { getOpenAIClient } = require("../config/openai");

/**
 * Analyze image of homework or academic content
 * @param {string} imageUrl - URL of the image to analyze
 * @returns {object} - Analysis results
 */
async function analyzeImage(imageUrl) {
  if (!imageUrl) {
    return {
      success: false,
      error: "No image URL provided",
    };
  }

  try {
    console.log(`Processing image: ${imageUrl.substring(0, 50)}...`);
    const openai = getOpenAIClient();

    // Step 1: Extract text content using Vision model
    console.log("Step 1: Extracting text from image");
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at reading academic content from images, especially homework questions, equations, and diagrams. Extract all text content accurately, preserving mathematical notation and formatting as clearly as possible.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text content from this homework or academic image. Preserve equations, problem structure, and any visible text. For mathematical notation, use clear text representations like 'x²' for x-squared, '∫' for integral symbol, etc.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const extractedText = visionResponse.choices[0].message.content;
    console.log(`Extracted ${extractedText.length} characters of text`);

    // Step 2: Structured analysis of the content
    console.log("Step 2: Analyzing extracted text");
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `Analyze this extracted homework text and provide structured information.
          
Return JSON with these fields:
- subject: The academic subject (Mathematics, Physical Sciences, etc.)
- topic: The specific topic within that subject
- question_count: Number of distinct questions or problems
- questions: Array of individual question texts (extract each separate question)
- grade_level: Estimated grade level (8-12)
- difficulty: Estimated difficulty (easy, medium, hard)`,
        },
        {
          role: "user",
          content: extractedText,
        },
      ],
      response_format: { type: "json_object" },
    });

    const structuredData = JSON.parse(
      analysisResponse.choices[0].message.content
    );
    console.log(
      `Analysis complete - detected ${structuredData.question_count} questions in ${structuredData.subject}`
    );

    return {
      success: true,
      text: extractedText,
      structured_data: structuredData,
    };
  } catch (error) {
    console.error("Image processing error:", error);

    // Provide more specific error messaging
    let errorMessage = "Failed to process image";
    if (error.status === 400) {
      errorMessage = "Invalid image format or URL";
    } else if (error.status === 429) {
      errorMessage = "Rate limit exceeded - please try again shortly";
    } else if (error.message && error.message.includes("parsing")) {
      errorMessage = "Failed to parse image content";
    }

    return {
      success: false,
      error: errorMessage,
      original_error: error.message,
    };
  }
}

module.exports = {
  analyzeImage,
};
