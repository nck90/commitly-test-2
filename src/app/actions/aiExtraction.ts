"use server";

import Groq from "groq-sdk";

// Helper to get PDF parser to avoid ESM/CJS issues in Next.js Server Actions
async function getPdfParser() {
    try {
        // @ts-ignore
        const pdf = await import('pdf-parse');
        return pdf.default || pdf;
    } catch (e) {
        console.error("[AI] Failed to load pdf-parse:", e);
        return null;
    }
}

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

/**
 * Parses files and text to extract project information.
 * Supports PDF through pdf-parse and other text files.
 */
export async function analyzeProjectDocuments(formData: FormData) {
    console.log("[AI] Starting multi-document analysis...");
    
    try {
        const textContent = formData.get("text") as string || "";
        const files = formData.getAll("files") as File[];
        
        let combinedText = textContent;
        const pdfParser = await getPdfParser();
        
        for (const file of files) {
            console.log(`[AI] Processing file: ${file.name} (${file.type})`);
            
            if (file.type === "application/pdf") {
                if (pdfParser) {
                    try {
                        const buffer = Buffer.from(await file.arrayBuffer());
                        const data = await (pdfParser as any)(buffer);
                        combinedText += `\n--- Content from PDF: ${file.name} ---\n${data.text}\n`;
                    } catch (err: any) {
                        console.error(`[AI] Error parsing PDF ${file.name}:`, err.message);
                        combinedText += `\n--- Error parsing PDF: ${file.name} ---\n`;
                    }
                } else {
                    combinedText += `\n--- File: ${file.name} (PDF parser not available) ---\n`;
                }
            } else if (file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
                const text = await file.text();
                combinedText += `\n--- Content from File: ${file.name} ---\n${text}\n`;
            } else {
                combinedText += `\n--- Metadata: ${file.name} (Non-text file) ---\n`;
            }
        }

        if (combinedText.trim().length < 10) {
            console.warn("[AI] No significant text found for analysis. Using empty extraction.");
            return { budgetRange: "", timeline: "", features: [], milestones: [] };
        }

        return await extractProjectInfoFromText(combinedText);

    } catch (error: any) {
        console.error("[AI] Document Analysis Error:", error.message);
        throw new Error("문서 분석 중 오류가 발생했습니다: " + error.message);
    }
}

export async function extractProjectInfoFromText(text: string) {
    console.log("[AI] Starting extraction for text length:", text.length);
    
    if (!groq) {
        console.warn("[AI] GROQ_API_KEY is not set. Falling back to mock extraction.");
        return getMockExtraction(text);
    }

    try {
        const prompt = `
당신은 IT 외주 기획/계약서 분석 전문가입니다. 주어진 텍스트 문서를 정밀하게 분석하여 다음 네 가지 핵심 정보를 JSON 포맷으로 추출하세요.

1. "budgetRange": 프로젝트 예상 예산 구간을 다음 중 하나로 정확히 일치시켜 배정하세요. ( "1000-3000", "3000-5000", "5000-10000", "10000+" )
   - 1000-3000: 1,000만원 ~ 3,000만원 사이
   - 3000-5000: 3,000만원 ~ 5,000만원 사이
   - 5000-10000: 5,000만원 ~ 1억원 사이
   - 10000+: 1억원 이상
   - 문서에 예산 언급이 없다면 빈 문자열("")로 두세요.

2. "timeline": 프로젝트 개발 기간 구간을 다음 중 하나로 배정하세요. ( "1-2", "3-4", "5-6", "6+" )
   - 1-2: 1~2개월
   - 3-4: 3~4개월
   - 5-6: 5~6개월
   - 6+: 6개월 이상
   - 문서에 기간 언급이 없다면 빈 문자열("")로 두세요.

3. "features": 개발팀이 수행해야 할 주요 기능 개발 태스크들을 5~8개 정도 추출하여 각각 15자 내외의 명확한 한글 태스크로 만드세요. 
   - 예: "Google Social Login 구현", "사용자 프로필 편집 기능", "Stripe 결제 모듈 연동"

4. "milestones": 프로젝트 일정표(마일스톤)를 4~6개 추출하세요. 문서에 일정, 단계, 스프린트 등의 정보가 있으면 이를 기반으로 생성하세요. 없으면 빈 배열([])을 반환하세요.
   각 마일스톤은 {"title": "마일스톤 이름", "description": "간략 설명", "weekOffset": 주차 오프셋 (프로젝트 시작일 기준, 0부터 시작)} 형태여야 합니다.
   - 예: [{"title": "킥오프 및 요구분석", "description": "요구사항 수집 완료", "weekOffset": 0}, {"title": "디자인 완성", "description": "UI/UX 설계 승인", "weekOffset": 4}]

분석할 문서 내용:
"""
${text.slice(0, 15000)}
"""

응답 지침:
- 반드시 다음 JSON 형식 그대로 응답해야 합니다.
- 부가 설명, Markdown 코드 블록(json 등), 인사말을 절대 포함하지 마세요. 오직 순수한 JSON 객체만 반환하세요.
- 예산이나 기간이 확실하지 않으면 빈 문자열("")을 반환하여 사용자가 수동으로 선택하게 하세요.
- 일정 정보가 문서에 없으면 milestones는 빈 배열([])로 두세요.

{
  "budgetRange": "3000-5000",
  "timeline": "3-4",
  "features": ["Task 1", "Task 2", ...],
  "milestones": [{"title": "...", "description": "...", "weekOffset": 0}, ...]
}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            max_tokens: 1000,
            response_format: { type: "json_object" }
        });

        const rawResponse = chatCompletion.choices[0]?.message?.content || "{}";
        console.log("[AI] Raw Response:", rawResponse);
        
        const parsed = JSON.parse(rawResponse);
        
        const result = {
            budgetRange: parsed.budgetRange || "",
            timeline: parsed.timeline || "",
            features: Array.isArray(parsed.features) ? parsed.features : [],
            milestones: Array.isArray(parsed.milestones) ? parsed.milestones : []
        };

        console.log("[AI] Extraction Successful:", result);
        return result;

    } catch (e: any) {
        console.error("[AI] API or Parsing Failed:", e.message);
        return getMockExtraction(text);
    }
}

function getMockExtraction(text: string) {
    let budgetRange = "";
    let timeline = "";
    const lowerText = text.toLowerCase();

    if (lowerText.includes("1000") || lowerText.includes("천만")) budgetRange = "1000-3000";
    else if (lowerText.includes("3000") || lowerText.includes("삼천만")) budgetRange = "3000-5000";
    else if (lowerText.includes("5000") || lowerText.includes("오천만")) budgetRange = "5000-10000";
    else if (lowerText.includes("1억") || lowerText.includes("10000+")) budgetRange = "10000+";

    if (lowerText.includes("1달") || lowerText.includes("1개월") || lowerText.includes("2달")) timeline = "1-2";
    else if (lowerText.includes("3달") || lowerText.includes("3개월") || lowerText.includes("4달")) timeline = "3-4";
    else if (lowerText.includes("5달") || lowerText.includes("5개월") || lowerText.includes("6달")) timeline = "5-6";
    else if (lowerText.includes("6개월") || lowerText.includes("장기")) timeline = "6+";

    return {
        budgetRange,
        timeline,
        features: [],
        milestones: []
    };
}

export async function generateFeatureDescription(featureName: string, contextText: string) {
    if (!groq) {
        console.warn("[AI] GROQ_API_KEY is not set. Returning mock description.");
        return `해당 기능(**${featureName}**)은 프로젝트 요구사항에 따라 구현될 예정입니다. 상세 내용은 기획서를 참고해주세요.\n\n- [ ] 기본 동작 확인\n- [ ] UI/UX 명세 적용`;
    }

    try {
        const prompt = `
당신은 IT 프로젝트의 시니어 프로덕트 매니저(PM)입니다.
다음은 전체 프로젝트의 기획/요구사항 문서 전문(또는 발췌본)입니다:

<Project Context>
${contextText.slice(0, 15000)}
</Project Context>

위 컨텍스트를 바탕으로, 프로젝트의 여러 기능 중 하나인 **"${featureName}"** 에 대한 상세 명세 및 기대 효과를 Markdown 형식으로 작성해주세요.
만약 컨텍스트에 해당 기능에 대한 직접적인 언급이 부족하더라도, 일반적인 IT 서비스 구조를 추론하여 그럴듯하게 작성해 주시기 바랍니다.

응답 형식 지침 (반드시 지켜주세요):
- 최상위 제목은 '# 기능 개요' 와 같이 사용하지 말고, '### ' (가장 큰 제목을 H3로) 를 사용하세요. 그리고 '#' 기호 뒤에는 반드시 공백을 1칸 띄우세요.
- 리스트는 '-' (하이픈) 기호를 사용하여 들여쓰기와 함께 구조적으로 작성하세요. '-' 기호 뒤에도 공백을 1칸 띄우세요.
- 코드 블록이나 백틱(\`\`\`)으로 전체를 감싸지 마세요. 바로 마크다운 텍스트부터 출력하세요.

(작성 예시)
### 1. 기능 개요 및 목적
(1~2 문단으로 작성)

### 2. 주요 요구사항 및 상세 스펙
- (요구사항 1)
- (요구사항 2)

### 3. 사용자 경험(UX) 및 기대 효과
- (기대 효과 1)

### 4. 기술적 고려사항 또는 예외 처리 (선택)
- (고려사항 1)
`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_tokens: 1500,
        });

        const description = chatCompletion.choices[0]?.message?.content || "";
        return description.trim();

    } catch (e: any) {
        console.error("[AI] Feature Description Generation Failed:", e.message);
        throw new Error("AI 설명 생성 실패: " + e.message);
    }
}
