import { GoogleGenerativeAI, GenerateContentResult } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const imageUrl = body.imageUrl;
    const availableCategories: string[] = body.availableCategories || [];
    const availableSubCategories: string[] = body.availableSubCategories || [];

    // ✅ NEW — special category hint fields
    const productTypeHint: string | null = body.productTypeHint || null;
    const specialCategoryName: string | null = body.specialCategoryName || null;
    const specialCategoryDescription: string | null = body.specialCategoryDescription || null;

    if (!imageUrl) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    // Fetch and convert image to Base64
    const imageResp = await fetch(imageUrl);
    const arrayBuffer = await imageResp.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    // Fetch available models
    const modelListResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );
    const modelsData = await modelListResponse.json();

    // Filter for stable, vision-capable models
    const validModels = modelsData.models
      .filter((m: any) => 
        m.name.includes("gemini") && 
        m.supportedGenerationMethods.includes("generateContent") &&
        !m.name.includes("robotics") &&
        !m.name.includes("computer-use") &&
        !m.name.includes("vision-at-release")
      )
      .map((m: any) => m.name.split("models/")[1])
      .reverse();

    // ✅ Main category instruction
    const categoryLine = availableCategories.length > 0
      ? `MUST be exactly one of: [${availableCategories.map((c: string) => `"${c}"`).join(", ")}]`
      : `Choose best fit (e.g., 'Fancy Items', 'Clothes', 'Shoes', 'Beauty')`;

    // ✅ Sub category instruction  
    const subCategoryLine = availableSubCategories.length > 0
      ? `MUST be exactly one of: [${availableSubCategories.map((s: string) => `"${s}"`).join(", ")}]. Pick closest match to the product.`
      : `Specific sub-category (e.g., 'Casual Shoes', 'Handmade Jewelry')`;

    // ✅ Build special context block if hint/special category given
    const specialContext = specialCategoryName
      ? `
IMPORTANT CONTEXT:
- This product belongs to a SPECIAL CATEGORY called "${specialCategoryName}".
${specialCategoryDescription ? `- Category theme: "${specialCategoryDescription}"` : ""}
${productTypeHint ? `- The seller specifically says this is a: "${productTypeHint}". Use this exact product type in the name.` : ""}
- Generate the name and description with this context in mind.
- The product name MUST include the product type prominently (e.g. "${productTypeHint || specialCategoryName}").
- Description should be stylish, detailed, and appeal to someone wanting to buy or customize this item.
`
      : productTypeHint
      ? `IMPORTANT: The seller says this product is specifically a "${productTypeHint}". Use this in the name and description.`
      : "";

    const prompt = `
Context: Expert e-commerce manager and SEO specialist for 'LoverSmart'.
Identify the product in the image accurately and provide details for Google SEO.
${specialContext}
Return ONLY a raw JSON object (no markdown, no code blocks, no explanation) with these exact fields:
1. "name": Simple 2-3 word product name${productTypeHint ? ` (must include "${productTypeHint}")` : ""}.
2. "description": SEO friendly short description (max 30 words).
3. "tags": An array of 5-8 SEO keywords (e.g., ["fancy watch", "gold plated", "luxury gift"]).
4. "mainCategory": ${categoryLine}
5. "subCategory": ${subCategoryLine}

Return ONLY this JSON, nothing else:
{"name": "", "description": "", "tags": [], "mainCategory": "", "subCategory": ""}`;

    for (const modelName of validModels) {
      try {
        console.log(`🚀 Trying: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT_REACHED")), 7000)
        );

        const generatePromise = model.generateContent([
          prompt,
          { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
        ]);

        const result = await Promise.race([generatePromise, timeoutPromise]) as GenerateContentResult;

        if (result && result.response) {
          const responseText = result.response.text();
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? jsonMatch[0] : null;
          
          if (jsonStr) {
            console.log(`✅ Success with ${modelName}`);
            return NextResponse.json(JSON.parse(jsonStr));
          }
        }
      } catch (err: any) {
        if (err.message === "TIMEOUT_REACHED") {
          console.warn(`⏳ ${modelName} timed out.`);
        } else {
          console.warn(`⚠️ ${modelName} failed:`, err.message);
        }
        continue;
      }
    }

    throw new Error("All models failed or timed out.");
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "AI Processing Failed", details: error.message }, { status: 500 });
  }
}