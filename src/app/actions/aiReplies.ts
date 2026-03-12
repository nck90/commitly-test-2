"use server";

import Groq from "groq-sdk";

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

export async function generateSuggestedReplies(contextText: string, requireDecision = false) {
    if (!groq) {
        // Fallback Mock Replies if API key is missing
        return requireDecision 
            ? ["좋지 않습니다, 원안대로 먼저 진행해주세요.", "이해했습니다. 말씀하신 대로 진행 부탁드립니다.", "일정에 영향이 없다면 제안해주신 방향으로 갑시다."]
            : ["공유해주셔서 감사합니다. 확인했습니다.", "수고 많으셨습니다. 다음 단계도 잘 부탁드립니다.", "내용 확인했습니다. 감사합니다."];
    }

    try {
        const prompt = `당신은 IT 외주 발주처(Client)가 개발팀의 메시지를 보고 선택할 수 있는 "빠른 답장(Quick Reply)" 3가지를 추천해주는 AI입니다.

개발팀의 메시지:
"""
${contextText.slice(0, 1000)}
"""

요구사항:
1. 발주처(고객) 입장에서 개발팀에게 보낼 답장이어야 합니다.
2. 각 답장은 1~2문장 이내로 짧고 명확해야 합니다.
${requireDecision ? '3. 상대방이 "결정"이나 "선택"을 요구한 상황이므로, 승인/거절/조건부 승인 등 방향성을 결정하는 답변 위주로 3개를 작성해야 합니다.' 
                  : '3. 단순 상황 공유이므로 부드러운 수신 확인, 격려, 또는 가벼운 피드백 형태의 답변 3개를 작성해야 합니다.'}

배열(Array) 형태의 순수 JSON 텍스트만 문자열 배열로 응답하세요. 예시: ["확인했습니다.", "그대로 진행해주세요.", "조금 더 고민해볼게요."]`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant",
            temperature: 0.2,
            max_tokens: 300,
            response_format: { type: "json_object" }
        });

        const rawResponse = chatCompletion.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(rawResponse);

        let result = [];
        if (Array.isArray(parsed)) {
            result = parsed;
        } else if (parsed.replies && Array.isArray(parsed.replies)) {
            result = parsed.replies;
        } else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            result = parsed.suggestions;
        }

        // Return top 3
        return result.length >= 3 ? result.slice(0, 3) : [
            "확인했습니다. 수고 많으셨습니다.",
            "말씀하신 대로 진행 부탁드립니다.",
            "이와 관련해서 짧게 논의할 수 있을까요?"
        ];

    } catch (e) {
        console.error("Groq AI API Failed for Suggested Replies:", e);
        return requireDecision 
            ? ["좋지 않습니다, 원안대로 먼저 진행해주세요.", "이해했습니다. 말씀하신 대로 진행 부탁드립니다.", "일정에 영향이 없다면 제안해주신 방향으로 갑시다."]
            : ["네, 공유해주셔서 감사합니다.", "수고 많으십니다. 이대로 진행해주세요.", "이 부분에 대해서 시 한 번 검토가 필요해 보입니다."];
    }
}

export async function summarizePRForClient(prTitle: string, prBody: string | null = "") {
    if (!groq) {
        return "개발팀에서 새로운 기능 업데이트(Pull Request)를 반영했습니다.";
    }

    try {
        const prompt = `당신은 IT 외주 프로젝트의 친절한 PM(Project Manager)입니다.
개발자가 작성한 어려운 깃허브 Pull Request(코드 병합 요청) 제목과 내용을 보고, 비개발자인 발주처(클라이언트)가 이해하기 쉬운 1~2문장의 '결과 중심적'인 한국어 요약 메시지로 번역해주세요.

PR 제목: ${prTitle}
PR 본문: ${prBody ? prBody.slice(0, 500) : "내용 없음"}

요구사항:
1. "코드 리팩토링", "컴포넌트 분리", "옵티마이즈", "버그 픽스", "PR" 같은 기술적인 전문 용어를 최대한 배제하세요.
2. 예시: "메인 페이지의 로딩 속도를 개선하고, 화면 깨짐 현상을 수정했습니다." 또는 "로그인 기능을 완성하여 업데이트했습니다."
3. 반드시 번역된 1~2문장의 순수 텍스트 결과물만 출력하세요. 부가적인 인사말이나 설명은 절대 넣지 마세요.`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.1-8b-instant",
            temperature: 0.3,
            max_tokens: 200,
        });

        return chatCompletion.choices[0]?.message?.content?.trim() || "개발팀에서 새로운 기능 업데이트를 반영했습니다.";

    } catch (e) {
        console.error("Groq AI API Failed for PR Summary:", e);
        return "개발팀에서 새로운 기능 업데이트를 반영했습니다.";
    }
}
