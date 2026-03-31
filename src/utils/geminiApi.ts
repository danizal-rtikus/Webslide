/**
 * Gemini API Integration for WebSlide via Supabase Edge Functions
 */
import { CATEGORIES } from '../config/categories';
import { supabase } from '../lib/supabase';

export interface SlideData {
  title: string;
  subtopic?: string;
  content: string[];
  type: 'content' | 'cover' | 'outline' | 'interactive' | 'visual' | 'references' | 'section-cover' | 'table' | 'chart';
  svgSnippet?: string;
  visualTheme?: string;
  tableData?: string[][];
  references?: string[];
  imageUrl?: string;
  imagePrompt?: string;
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

/**
 * Helper to call the Supabase Edge Function proxy for Gemini
 */
async function callGeminiProxy(action: string, payload: any) {
  const { data, error } = await supabase.functions.invoke('gemini-proxy', {
    body: { action, payload }
  });

  if (error) {
    console.error(`[Edge Function Error] ${action}:`, error);
    throw new Error(`Gagal menghubungi server AI: ${error.message}`);
  }

  if (data?.error) {
    throw new Error(`AI Error: ${data.error}`);
  }

  return data;
}

/**
 * Fetches all available models.
 */
export async function listAvailableModels(): Promise<GeminiModel[]> {
  try {
    const data = await callGeminiProxy('listModels', {});
    return (data.models || []).map((m: any) => ({
      name: m.name || '',
      version: m.version || '',
      displayName: m.displayName || m.name || 'Unknown Model',
      description: m.description || 'Tidak ada deskripsi tersedia.',
      supportedGenerationMethods: m.supportedGenerationMethods || []
    }));
  } catch (err: any) {
    console.warn("Gagal mengambil daftar model, menggunakan fallback.");
    return [];
  }
}

/**
 * Identifies chapters/topics from extracted text.
 */
export async function identifyChapters(text: string, category: string): Promise<{ title: string; author: string; course: string; chapters: Chapter[] }> {
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

  const data = await callGeminiProxy('generateContent', {
    model: "gemini-1.5-flash",
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { response_mime_type: "application/json" }
  });

  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resultText) throw new Error("Gagal mengurai respons AI.");
  
  return JSON.parse(resultText.replace(/```json\n?|```/g, '').trim());
}

/**
 * Generates a presentation skeleton from a prompt.
 */
export async function generateSkeletonFromPrompt(userPrompt: string, category: string): Promise<{ title: string; author: string; course: string; chapters: Chapter[] }> {
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

  const data = await callGeminiProxy('generateContent', {
    model: "gemini-1.5-flash",
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { response_mime_type: "application/json" }
  });

  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resultText) throw new Error("Gagal mengurai respons AI.");
  
  return JSON.parse(resultText.replace(/```json\n?|```/g, '').trim());
}

/**
 * Generates slides for a specific chapter.
 */
export async function generateChapterSlides(chapter: Chapter, text: string, category: string): Promise<SlideData[]> {
  const prompt = `
    Generate educational slides for this specific chapter: "${chapter.title}" for a "${category}" presentation.
    Description: ${chapter.summary}
    Target: ${chapter.suggestedSlides} slides.
    
    Category Context: ${category}. 
    Instruction: ${CATEGORIES.find(c => c.id === category)?.promptInstruction || 'Keep it professional and clear.'}
    
    CRITICAL FORMATTING RULES:
    1. ALWAYS START this chapter with a slide of type: "section-cover" using a matching visualTheme.
    2. Identify **KEY WORDS** (kata kunci utama) in each explanation and wrap them in <strong> tags.
    3. Identify **FOREIGN TERMS** (istilah asing) and wrap them in <em> tags.
    4. If the content contains data comparisons, statistics, or classification lists, USE type: "table" and provide a 2D array in "tableData".
    5. If describing a process, trend, or complex flux, USE type: "chart" or "visual" and provide custom "svgSnippet" or "visualTheme".
    6. Provide 1-3 relevant source references (URLs or names) for EACH slide in a "references" array property.
    7. ALWAYS include a final slide for this chapter with type: "references" that summarizes all important sources used in this chapter.
    
    Return a JSON array of SlideData objects.
    Use Indonesian (Bahasa Indonesia). Keep it professional.
    STRICTLY return just the array: [ {...}, {...} ]
    
    CONTEXT:
    ${text ? text.substring(0, 12000) : "No context provided. Use your internal knowledge."}
  `;

  const data = await callGeminiProxy('generateContent', {
    model: "gemini-1.5-pro",
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { response_mime_type: "application/json" }
  });

  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resultText) throw new Error("Gagal mengurai respons AI.");
  
  const parsed = JSON.parse(resultText.replace(/```json\n?|```/g, '').trim());
  return Array.isArray(parsed) ? parsed : (parsed.slides || []);
}

/**
 * Generates a full quiz.
 */
export async function generateQuizBatch(chapters: Chapter[], text: string): Promise<QuizQuestion[]> {
  const prompt = `
    Generate 10 multiple-choice quiz questions based on these topics:
    ${chapters.map(c => c.title).join(', ')}
    
    Return a JSON array of QuizQuestion objects (interface: q, o, a).
    Use Indonesian (Bahasa Indonesia).
    
    CONTEXT:
    ${text.substring(0, 10000)}
  `;

  const data = await callGeminiProxy('generateContent', {
    model: "gemini-1.5-flash",
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { response_mime_type: "application/json" }
  });

  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resultText) throw new Error("Gagal mengurai respons AI.");
  
  return JSON.parse(resultText.replace(/```json\n?|```/g, '').trim());
}

/**
 * Generates a visual description for Imagen.
 */
export async function generateVisualDescription(title: string, content: string): Promise<string> {
  const prompt = `
    Convert the following slide title and content into a SINGLE SENTENCE visual scene description for an AI image generator.
    RULES: No text, professional photography style.
    Slide Title: "${title}"
    Slide Content: "${content}"
    Visual Description:
  `;

  const data = await callGeminiProxy('generateContent', {
    model: "gemini-1.5-flash",
    contents: [{ parts: [{ text: prompt }] }]
  });

  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || `${title} scene`;
}

/**
 * Generates an image using Imagen 3/4.
 */
export async function generateImageImagen4(prompt: string): Promise<string | null> {
  const data = await callGeminiProxy('generateImage', {
    model: "imagen-3.0-generate-001",
    instances: [{ prompt }],
    parameters: { sampleCount: 1, aspectRatio: "16:9" }
  });

  const base64Data = data.predictions?.[0]?.bytesBase64Encoded;
  return base64Data ? `data:image/png;base64,${base64Data}` : null;
}
