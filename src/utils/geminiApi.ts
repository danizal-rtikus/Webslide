/**
 * Gemini API Integration for WebSlide
 */
import { CATEGORIES, Category } from '../config/categories';

export interface SlideData {
  title: string;
  subtopic?: string;
  content: string[];
  type: 'content' | 'cover' | 'outline' | 'interactive' | 'visual' | 'references' | 'section-cover' | 'table' | 'chart';
  svgSnippet?: string; // Potential AI-generated SVG for visualization
  visualTheme?: string; // Predefined theme for SVG library
  tableData?: string[][]; // 2D Array for tabular data
  references?: string[]; // Source references for this slide
  imageUrl?: string; // Generated AI image (e.g. results from Imagen 4)
  imagePrompt?: string; // Prompt for generating image
}

export interface QuizQuestion {
  q: string;
  o: string[];
  a: number;
}

export interface WebSlideJson {
  title: string;
  author: string;
  course: string;
  slides: SlideData[];
  quiz: QuizQuestion[];
}

export interface Chapter {
  id: string;
  title: string;
  summary: string;
  suggestedSlides: number;
}

export interface GeminiModel {
  name: string;
  version: string;
  displayName: string;
  description: string;
  supportedGenerationMethods: string[];
}

const MODEL_CANDIDATES = [
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-1.5-pro",
  "gemini-2.5-pro",
  "gemini-3-pro-preview",
  "gemini-pro"
];

/**
 * Fetches all available models for the provided API Key.
 */
export async function listAvailableModels(apiKey: string): Promise<GeminiModel[]> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || "Gagal mengambil daftar model.");
    }
    const data = await response.json();
    return (data.models || []).map((m: any) => ({
      name: m.name || '',
      version: m.version || '',
      displayName: m.displayName || m.name || 'Unknown Model',
      description: m.description || 'Tidak ada deskripsi tersedia.',
      supportedGenerationMethods: m.supportedGenerationMethods || []
    }));
  } catch (err: any) {
    throw new Error(err.message || "Bermasalah saat menghubungi Google AI API.");
  }
}

/**
 * Helper to parse and handle Gemini API errors.
 */
async function handleApiError(response: Response, model: string): Promise<string> {
  const errorData = await response.json().catch(() => ({}));
  const msg = errorData.error?.message || "Terjadi kesalahan pada AI.";
  
  if (msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate limit") || errorData.error?.status === "RESOURCE_EXHAUSTED") {
    console.warn(`[API Strategy] Model ${model} mencapai limit. Mencoba beralih ke model lain...`);
    return "Batas kuota gratis (60-detik/Harian) tercapai. Harap tunggu sebentar.";
  }
  return msg;
}

/**
 * Sends extracted text to Gemini to generate structured WebSlide data.
 */
export async function generateWebSlideData(text: string, apiKey: string): Promise<WebSlideJson> {
  const prompt = `
    You are an expert educational content creator. I will provide you with text extracted from a PDF.
    Your task is to transform this text into a modern, interactive WebSlide presentation JSON.
    
    Requirements:
    1. Create a logical flow of slides (around 10-15 slides).
    2. Slide types can be: 'cover', 'outline', 'content', 'interactive' (for accordion cards), 'visual' (if you can suggest a simple SVG).
    3. For 'interactive' slides, provide 2-3 items.
    4. Generate exactly 10 Multiple Choice Questions (MCQs) for the evaluation section at the end.
    5. The language MUST be in Indonesian (Bahasa Indonesia).
    6. Ensure the tone is academic yet modern.
    
    Output Format (JSON strictly):
    {
      "title": "Presentation Title",
      "author": "Author Name (detect from text or use 'User')",
      "course": "Course Name (detect from text)",
      "slides": [
        { "type": "cover", "title": "...", "content": ["..."] },
        { "type": "outline", "title": "Daftar Isi", "content": ["Item 1", "Item 2"] },
        { "type": "content", "subtopic": "...", "title": "...", "content": ["point 1", "point 2"] },
        { "type": "interactive", "title": "Key Concepts", "content": ["Concept 1|Description 1", "Concept 2|Description 2"] },
        { "type": "visual", "title": "Process Flow", "content": ["Step 1", "Step 2"], "svgSnippet": "...optional SVG code..." }
      ],
      "quiz": [
        { "q": "Question Text", "o": ["A...", "B...", "C...", "D...", "E..."], "a": 0 }
      ]
    }

    TEXT FROM PDF:
    ${text.substring(0, 12000)}
  `;

  let lastError = "";

  for (const model of MODEL_CANDIDATES) {
    try {
      console.log(`Trying model: ${model}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json"
          }
        })
      });

      if (!response.ok) {
        lastError = await handleApiError(response, model);
        console.warn(`Model ${model} failed: ${lastError}`);
        continue; // Try next model
      }

      const data = await response.json();
      let resultText = data.candidates[0].content.parts[0].text;
      
      // Cleanup for potential markdown
      resultText = resultText.replace(/```json\n?|```/g, '').trim();
      
      return JSON.parse(resultText) as WebSlideJson;

    } catch (err: any) {
      console.error(`Error with model ${model}:`, err);
      lastError = err.message;
    }
  }

  throw new Error(`Semua model AI gagal: ${lastError}. Silakan cek API Key atau coba lagi nanti.`);
}

/**
 * Identifies chapters/topics from extracted text.
 */
export async function identifyChapters(text: string, apiKey: string, category: string): Promise<{ title: string; author: string; course: string; chapters: Chapter[] }> {
  const prompt = `
    Analyze this educational text for a "${category}" presentation and identify:
    1. A suitable Presentation Title.
    2. Author Name (if found, otherwise "Dosen Pengampu" or relevant to category).
    3. Course/Subject/Program Name.
    4. Main chapters/topics.
    
    Category Context: ${category}. 
    Style Instruction: ${CATEGORIES.find(c => c.id === category)?.promptInstruction || 'Educational and academic.'}
    
    Return a JSON object with: 
    { "title": "...", "author": "...", "course": "...", "chapters": [ { "id": "...", "title": "...", "summary": "...", "suggestedSlides": ... } ] }
    Max 8 chapters. Language: Indonesian (Bahasa Indonesia).
    
    TEXT:
    ${text.substring(0, 10000)}
  `;

  let lastError = "";
  for (const model of MODEL_CANDIDATES) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });

      if (!response.ok) {
        lastError = await handleApiError(response, model);
        continue;
      }

      const data = await response.json();
      let resultText = data.candidates[0].content.parts[0].text;
      resultText = resultText.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(resultText);
    } catch (err: any) {
      lastError = err.message;
    }
  }
  throw new Error(`Gagal mengidentifikasi bab: ${lastError}`);
}

/**
 * Generates a presentation skeleton (chapters) from a simple text prompt (Quick Mode).
 */
export async function generateSkeletonFromPrompt(userPrompt: string, apiKey: string, category: string): Promise<{ title: string; author: string; course: string; chapters: Chapter[] }> {
  const prompt = `
    Create a comprehensive presentation outline/skeleton based on this user prompt: "${userPrompt}"
    Focus on the category: "${category}".
    Style Instruction: ${CATEGORIES.find(c => c.id === category)?.promptInstruction || 'Educational and structured.'}
    
    You must identify:
    1. A catchy Presentation Title.
    2. Author Name (use "WebSlide AI" or a suitable persona).
    3. Course/Program name.
    4. 5-8 logical chapters/topics to cover the subject thoroughly.
    
    Return a JSON object with: 
    { "title": "...", "author": "...", "course": "...", "chapters": [ { "id": "...", "title": "...", "summary": "...", "suggestedSlides": ... } ] }
    Use Indonesian (Bahasa Indonesia).
  `;

  let lastError = "";
  for (const model of MODEL_CANDIDATES) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });

      if (!response.ok) {
        lastError = await handleApiError(response, model);
        continue;
      }

      const data = await response.json();
      let resultText = data.candidates[0].content.parts[0].text;
      resultText = resultText.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(resultText);
    } catch (err: any) {
      lastError = err.message;
    }
  }
  throw new Error(`Gagal membuat outline dari prompt: ${lastError}`);
}

/**
 * Generates slides for a specific chapter in Batch Mode.
 */
export async function generateChapterSlides(chapter: Chapter, text: string, apiKey: string, category: string): Promise<SlideData[]> {
  const prompt = `
    Generate educational slides for this specific chapter: "${chapter.title}" for a "${category}" presentation.
    Description: ${chapter.summary}
    Target: ${chapter.suggestedSlides} slides.
    
    Category Context: ${category}. 
    Instruction: ${CATEGORIES.find(c => c.id === category)?.promptInstruction || 'Keep it professional and clear.'}
    
    IMPORTANT: If the CONTEXT below is empty or insufficient, use your OWN INTERNAL KNOWLEDGE to research and generate high-quality, accurate content based on the chapter title and summary provided above.
    
    CRITICAL FORMATTING RULES:
    1. ALWAYS START this chapter with a slide of type: "section-cover" using a matching visualTheme.
    2. Identify **KEY WORDS** (kata kunci utama) in each explanation and wrap them in <strong> tags.
    3. Identify **FOREIGN TERMS** (istilah asing) and wrap them in <em> tags.
    4. If the content contains data comparisons, statistics, or classification lists, USE type: "table" and provide a 2D array in "tableData".
    5. If describing a process, trend, or complex flux, USE type: "chart" or "visual" and provide custom "svgSnippet" or "visualTheme".
    6. Provide 1-3 relevant source references (URLs or names) for EACH slide in a "references" array property.
    7. ALWAYS include a final slide for this chapter with type: "references" that summarizes all important sources used in this chapter.
    
    Return a JSON array of SlideData objects.
    Interface: {
      title: string,
      content: string[] (points/paragraphs),
      type: "section-cover" | "content" | "table" | "chart" | "interactive" | "visual" | "references",
      subtopic?: string,
      visualTheme?: string (data-transfer, cloud-sync, ai-process, growth-chart, idea-bulb, secure-vault, education-cap, server-network),
      svgSnippet?: string (custom SVG code),
      tableData?: string[][] (for type: table),
      references?: string[] (for the footer)
    }
    
    Use Indonesian (Bahasa Indonesia). Keep it professional.
    STRICTLY return just the array: [ {...}, {...} ]
    
    CONTEXT:
    ${text ? text.substring(0, 12000) : "No context provided. Use your internal knowledge."}
  `;

  let lastError = "";
  for (const model of MODEL_CANDIDATES) {
    try {
      console.log(`Generating Chapter: ${chapter.title} using ${model}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });

      if (!response.ok) {
        lastError = await handleApiError(response, model);
        continue;
      }

      const data = await response.json();
      let resultText = data.candidates[0].content.parts[0].text;
      resultText = resultText.replace(/```json\n?|```/g, '').trim();
      
      const parsed = JSON.parse(resultText);
      // Handle if AI returns { "slides": [] } instead of []
      const slides = Array.isArray(parsed) ? parsed : (parsed.slides || parsed.data || []);
      console.log(`Successfully generated ${slides.length} slides for ${chapter.title}`);
      return slides as SlideData[];
    } catch (err: any) {
      console.error(`Chapter generation failed for ${model}:`, err);
      lastError = err.message;
    }
  }
  
  // FINAL FALLBACK: If all models fail or return 0 slides, provide a manual fallback slide
  // based on the chapter summary to avoid 1/0 generation results.
  console.warn(`All AI attempts failed for chapter ${chapter.title}. Using manual fallback slides.`);
  return [
    {
      title: chapter.title,
      type: 'section-cover',
      content: [chapter.summary || "Penjelasan mendalam mengenai topik ini."],
      visualTheme: 'idea-bulb'
    },
    {
      title: "Materi Utama: " + chapter.title,
      type: 'content',
      content: [
        `Bab ini membahas tentang **${chapter.title}**.`,
        "Gunakan sumber referensi eksternal untuk memperdalam pemahaman Anda tentang topik ini.",
        "Materi ini sedang diproses lebih lanjut oleh sistem AI kami."
      ],
      references: ["Internal AI Knowledge Base"]
    }
  ];
}

/**
 * Generates a full quiz based on selected context.
 */
export async function generateQuizBatch(chapters: Chapter[], text: string, apiKey: string): Promise<QuizQuestion[]> {
  const prompt = `
    Generate 10 multiple-choice quiz questions based on these topics:
    ${chapters.map(c => c.title).join(', ')}
    
    Return a JSON array of QuizQuestion objects (interface: q (question), o (array of 4 options), a (index of correct answer 0-3)).
    Use Indonesian (Bahasa Indonesia).
    
    CONTEXT:
    ${text.substring(0, 10000)}
  `;

  for (const model of MODEL_CANDIDATES) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });

      if (!response.ok) {
        console.warn(`Quiz generation failed for ${model}:`, await handleApiError(response, model));
        continue;
      }

      const data = await response.json();
      let resultText = data.candidates[0].content.parts[0].text;
      resultText = resultText.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(resultText) as QuizQuestion[];
    } catch (err) { }
  }
  return [];
}

/**
 * Generates a pure visual description for a slide to avoid text hallucinations in Imagen 4.
 */
export async function generateVisualDescription(title: string, content: string, apiKey: string): Promise<string> {
  const model = "gemini-1.5-flash"; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const prompt = `
    You are a visual design expert. 
    Convert the following slide title and content into a SINGLE SENTENCE visual scene description for an AI image generator.
    
    RULES:
    1. Describe the scene, objects, lighting, and composition.
    2. ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO TYPOGRAPHY should be in the scene.
    3. Output ONLY the visual description sentence. Do NOT include any introductory or meta text.
    4. Focus on realistic, high-quality professional photography style.
    
    Slide Title: "${title}"
    Slide Content: "${content}"
    
    Visual Description:
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    
    if (!response.ok) return `${title} in a professional setting`;
    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return result || `${title} in a professional setting`;
  } catch (err) {
    return `${title} in a professional setting`;
  }
}

/**
 * Generates an image using a specific model (e.g., Imagen 3/4).
 */
export async function generateImageImagen4(prompt: string, apiKey: string, preferredModelId?: string): Promise<string | null> {
  // Candidate list prioritized by user's verified available models
  const candidates = preferredModelId 
    ? [preferredModelId, "imagen-4.0-fast-generate-001", "imagen-4.0-generate-001", "imagen-3.0-generate-001"] 
    : ["imagen-4.0-fast-generate-001", "imagen-4.0-generate-001", "imagen-3.0-generate-001"];
  
  for (const modelId of candidates) {
    try {
      // Clean model name (remove 'models/' prefix if present for the template)
      const cleanId = modelId.startsWith('models/') ? modelId.split('/')[1] : modelId;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanId}:predict?key=${apiKey}`;
      
      console.log(`[Image Generation] Attempting ${cleanId}...`);
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "16:9",
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Image Generation] Model ${cleanId} failed:`, errText);
        continue; // Try next candidate
      }

      const data = await response.json();
      const base64Data = data.predictions?.[0]?.bytesBase64Encoded;
      if (base64Data) {
        console.log(`[Image Generation] Success with ${cleanId}`);
        return `data:image/png;base64,${base64Data}`;
      }
    } catch (err) {
      console.error(`[Image Generation] Error with ${modelId}:`, err);
    }
  }
  return null;
}
