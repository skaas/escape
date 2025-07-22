import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GameState, Intent } from '@/lib/types';
import { updateState } from '@/lib/state-engine';

interface RequestBody {
  apiKey: string;
  userInput: string | null;
  currentState: GameState;
}

/**
 * 게임 로직을 처리하는 API 라우트입니다.
 */
export async function POST(req: NextRequest) {
  try {
    const { apiKey: clientApiKey, userInput, currentState } = await req.json() as RequestBody;

    const apiKey = process.env.NODE_ENV === 'production'
      ? process.env.OPENAI_API_KEY
      : clientApiKey;

    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API 키가 설정되지 않았습니다.' }, { status: 400 });
    }

    if (typeof userInput !== 'string' || !currentState) {
      return NextResponse.json({ error: '유효한 사용자 입력과 현재 상태가 필요합니다.' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });

    const intent = await recognizeIntentWithLLM(openai, userInput);
    const newState = updateState(currentState, intent);
    const narrative = await generateNarrativeWithLLM(openai, newState, userInput);

    return NextResponse.json({ newState, narrative });

  } catch (error: unknown) { // 'any' 대신 'unknown' 사용
    console.error('API Error:', error);
    if (error instanceof OpenAI.APIError) {
        return NextResponse.json({ error: `OpenAI API 오류: ${error.message}` }, { status: error.status });
    }
    // instanceof Error로 더 일반적인 에러도 처리
    if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: '내부 서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * OpenAI API를 호출하여 사용자의 자연어 입력으로부터 의도를 추출합니다.
 */
async function recognizeIntentWithLLM(openai: OpenAI, userInput: string): Promise<Intent> {
    const systemPrompt = `
        당신은 텍스트 어드벤처 게임의 의도 분석 AI입니다. 사용자의 입력을 분석하여 정해진 JSON 형식으로 변환해야 합니다.
        사용자의 입력은 한국어, 영어 등 다양한 언어로 들어올 수 있습니다.
        
        반환해야 하는 JSON 형식:
        { "action": "ACTION_TYPE", "object": "OBJECT_ID", "secondaryObject": "OBJECT_ID" (선택 사항) }

        ACTION_TYPE 종류:
        - "look": 보기, 관찰하기 (예: "주변을 둘러봐", "책상을 살펴봐")
        - "take": 집기, 획득하기 (예: "열쇠를 집어", "get the key")
        - "open": 열기 (예: "서랍을 열어줘")
        - "unlock": 잠금 해제하기 (예: "열쇠로 서랍을 열어", "1234 입력")
        - "use": 사용하기 (예: "열쇠를 서랍에 사용해")
        - "enter": 입력하기 (주로 비밀번호)
        - "hint": 힌트 요청하기

        OBJECT_ID는 게임에 존재하는 사물의 ID여야 합니다. 주요 사물 ID: desk, drawer, key, book, safe, room.
        사용자가 '방'이나 '주변'을 본다고 하면 object는 "room"으로 설정하세요.
        4자리 숫자가 포함되면 비밀번호 입력으로 간주하고 action을 "unlock"으로 설정하세요.

        예시:
        - "책상 위에 뭐가 있어?" -> { "action": "look", "object": "desk" }
        - "take the small key" -> { "action": "take", "object": "key" }
        - "열쇠로 잠긴 서랍을 열어" -> { "action": "unlock", "object": "key", "secondaryObject": "drawer" }
        - "비밀번호 0451" -> { "action": "unlock", "object": "0451" }
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("LLM's intent recognition response is empty.");
    }
    const result: Intent = JSON.parse(content);
    return result;
}


/**
 * 현재 게임 상태와 사용자 입력을 바탕으로 다음 내러티브를 생성합니다.
 */
async function generateNarrativeWithLLM(openai: OpenAI, state: GameState, userInput: string): Promise<string> {
    const stateSummary = `
        현재 방: ${state.roomDescription}
        보유 아이템: ${state.inventory.length > 0 ? state.inventory.map(id => state.items[id].name).join(', ') : '없음'}
        마지막 행동 결과: ${state.lastMessage || '없음'}
    `;

    const systemPrompt = `
        당신은 천재적인 소설가이자 방탈출 게임의 게임 마스터입니다. 주어진 게임 상태와 플레이어의 행동을 바탕으로 다음 상황을 아주 생생하고 몰입감 있게 묘사해야 합니다.
        플레이어의 행동 결과를 설명하고, 앞으로 무엇을 더 탐색할 수 있을지 암시를 주세요.
        답변은 항상 한국어로, 2~3문장의 짧고 간결한 산문 형식으로 작성하세요.
        
        규칙:
        - isDiscovered: false 인 단서는 절대 묘사하면 안 됩니다.
        - JSON 형식이나 코드, 리스트를 절대 사용하지 마세요. 오직 소설처럼 서술하세요.
        - 플레이어에게 직접적으로 말을 걸지 말고, 3인칭 관찰자 시점으로 상황을 묘사하세요.
    `;
    
    const userContent = `
        # 게임 현재 상태
        ${stateSummary}
        
        # 플레이어의 마지막 행동
        "${userInput}"
        
        # 이 다음 상황을 묘사해주세요.
    `;

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
        ],
        temperature: 0.7,
        max_tokens: 200,
    });

    return response.choices[0].message.content || '아무 일도 일어나지 않았다.';
} 