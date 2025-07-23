import { GameState, Intent, Item } from './types';
export type { GameState };

/**
 * 게임의 초기 상태를 정의합니다. (미술관 큐레이터 시나리오)
 */
export const initialGameState: GameState = {
  items: {
    safe: {
      id: 'safe',
      name: '벽의 디지털 금고',
      aliases: ['금고', '디지털 금고', 'safe'],
      concept: '비밀번호를 입력하여 여는 잠금 장치',
      description: '유일한 탈출구로 보이는 디지털 금고입니다. 9개의 숫자가 적힌 패트가 있고, 숫자를 하나씩 누를 때 마다 하나씩 표시 됩니다. 4자리 비밀번호를 입력해야 합니다.',
      isLocked: true,
    },
    paintings: {
      id: 'paintings',
      name: '벽에 걸린 6개의 그림',
      aliases: ['그림', '그림들', '여섯개의 그림', 'paintings'],
      concept: '벽에 걸린 여러 개의 미술 작품',
      description: '벽에 6개의 작은 그림이 무작위로 걸려있습니다. 백조 2마리, 나비 8마리, 고양이 4마리, 토끼 1마리, 강아지 3마리, 물고기 7마리가 그려져 있습니다.',
    },
    desk_memo: {
      id: 'desk_memo',
      name: '책상 위의 메모',
      aliases: ['메모', '쪽지', 'memo'],
      concept: '무언가 적혀있는 종이 조각',
      canBeTaken: true,
      description: '책상 위에 놓인 메모입니다.',
      clue: {
        content: '메모에는 "내 취향으로는... 가을 > 겨울 > 봄 > 여름 순이지. 더운 건 정말 싫거든! 🥵" 라고 적혀 있습니다.',
        isDiscovered: false,
      },
    },
    animal_songs_poem: {
      id: 'animal_songs_poem',
      name: '『동물들의 노래』 시집',
      aliases: ['시집', '동물들의 노래', '책'],
      concept: '동물에 대한 시가 담긴 책',
      description: '책장에 꽂힌 시집입니다. 북마크가 꽂혀 있습니다.',
      clue: {
        content: '북마크가 꽂힌 페이지가 펼쳐져 있습니다. \n\n🦢 따뜻한 호수에서 백조들이 사랑 노래 부르고\n🦋 뜨거운 햇빛을 견디며 나비들이 나풀나풀 춤추네\n🐱 선선한 바람 부는 날 고양이들이 평화롭게 낮잠 자고\n🐰 토끼는 추워서 털옷을 꼭 껴입었나봐',
        isDiscovered: false,
      },
    },
    animal_counting_book: {
        id: 'animal_counting_book',
        name: '『동물 세기 놀이』 책',
        aliases: ['동물책', '세기놀이책', '어린이책'],
        concept: '숫자 세기에 대한 어린이용 책',
        description: '책장에 『동물 세기 놀이』라는 어린이 책이 펼쳐져 있습니다.',
        clue: {
            content: '펼쳐진 페이지에는 "그림 속 동물을 세어보고 순서대로 숫자를 적어보세요!" 라고 쓰여 있습니다.',
            isDiscovered: false,
        }
    },
    desk: { id: 'desk', name: '개인 책상', aliases: ['책상', 'desk'], concept: '글을 쓰거나 작업하는 가구', description: '큐레이터가 사용한 것으로 보이는 깔끔한 책상입니다.'},
    bookshelf: { id: 'bookshelf', name: '서재 책장', aliases: ['책장', 'bookshelf'], concept: '책을 보관하는 선반', description: '다양한 미술 서적과 시집이 꽂혀있는 책장입니다.'},
  },
  inventory: [],
  roomDescription: `미술관 큐레이터 김예린, 48시간 전 의문사. \n\n
당신은 정부 비밀요원입니다. 김예린이 국제 예술품 밀매 조직과 연관되어 있다는 정보를 입수하고 그녀의 서재에 잠입했습니다. \n
삐삐삐! 갑자기 경보가 울리며 문이 봉쇄됩니다.\n
이어폰 속 본부 음성:\n
"요원, 적들이 온다. 15분 안에 금고 속 증거를 찾아 탈출하라!"\n
벽의 디지털 금고, 4자리 비밀번호가 필요합니다.`,
  lastMessage: null,
  isEscaped: false,
  player: {
    abilities: ['관찰', '추론'],
  },
};

/**
 * 사용자의 의도(Intent)를 받아 게임 상태(GameState)를 업데이트합니다.
 */
export function updateState(currentState: GameState, intent: Intent): GameState {
  const newState = JSON.parse(JSON.stringify(currentState));
  const { action, object } = intent;
  const targetItem = newState.items[object];
  
  newState.lastMessage = null;

  switch (action) {
    case 'look':
      if (object === 'room' || object === 'around') {
          let description = newState.roomDescription;
          const visibleItems = (Object.values(newState.items) as Item[])
            .filter(item => !item.isTaken && !item.isHidden)
            .map(item => item.name);
          
          if(visibleItems.length > 0) {
              description += `\n\n당신은 주변에서 ${visibleItems.join(', ')} 등을 발견했습니다.`;
          }
          newState.lastMessage = description;
      } else if (targetItem) {
        let description = targetItem.description;
        if (targetItem.clue && !targetItem.isLocked) {
          targetItem.clue.isDiscovered = true;
          description += `\n${targetItem.clue.content}`;
        }
        newState.lastMessage = description;
      } else {
        newState.lastMessage = '무엇을 보시겠습니까?';
      }
      break;

    case 'take':
        if (targetItem && targetItem.canBeTaken) {
            if (newState.inventory.includes(object)) {
                newState.lastMessage = `당신은 이미 ${targetItem.name}을(를) 가지고 있습니다.`;
            } else {
                targetItem.isTaken = true;
                newState.inventory.push(object);
                newState.lastMessage = `${targetItem.name}을(를) 획득했습니다. 이제 인벤토리에서 확인할 수 있습니다.`;
            }
        } else if (targetItem) {
            newState.lastMessage = `${targetItem.name}은(는) 획득할 수 없는 아이템입니다.`;
        } else {
            newState.lastMessage = '무엇을 주우시겠습니까?';
        }
        break;

    case 'inventory': {
        if (newState.inventory.length === 0) {
            newState.lastMessage = '주머니는 텅 비어있다.';
        } else {
            const itemNames = newState.inventory.map((id: string) => newState.items[id].name);
            newState.lastMessage = `주머니에는 ${itemNames.join(', ')}(이)가 들어있다.`;
        }
        break;
    }
    
    // 이 시나리오에서는 열거나 잠금 해제할 아이템이 금고 외에는 없습니다.
    // open, unlock은 간소화하거나 금고에만 집중합니다.
    case 'open':
    case 'unlock':
        const targetToUnlock = newState.items['safe'];
        // 비밀번호를 직접 입력하는 경우
        if (object === '4128') {
             // 핵심 단서들을 모두 발견했는지 확인하여 퍼즐을 풀었다고 간주합니다.
            if (newState.items.desk_memo.clue.isDiscovered && newState.items.animal_songs_poem.clue.isDiscovered) {
                targetToUnlock.isLocked = false;
                newState.isEscaped = true;
                newState.lastMessage = '비밀번호가 맞았습니다! 금고 문이 열리면서 숨겨진 비상 열쇠를 발견했습니다. 당신은 서재를 탈출했습니다!\n\n개발자 연락처: skaparty@gmail.com 커피챗 환영';
            } else {
                newState.lastMessage = '올바른 비밀번호인 것 같지만, 아직 풀리지 않은 수수께끼가 있습니다. 방을 좀 더 둘러보세요.';
            }
        } else if (targetToUnlock.isLocked) {
            newState.lastMessage = '비밀번호가 틀렸습니다.';
        } else {
            newState.lastMessage = '금고는 이미 열려있습니다.';
        }
        break;

    case 'hint': {
        const { items } = newState;
        if (!items.paintings.clue?.isDiscovered) { // 편의상 description 확인을 isDiscovered로 간주
             newState.lastMessage = "힌트: 벽에 걸린 6개의 그림이 눈에 띕니다. 자세히 살펴보는 것부터 시작하는 게 좋겠습니다. ('그림 봐')";
        } else if (!items.desk_memo.clue?.isDiscovered) {
            newState.lastMessage = "힌트: 그림 속 동물들의 순서에는 규칙이 있는 것 같습니다. 책상 위에 놓인 메모에 중요한 단서가 있을지도 모릅니다. ('메모 봐')";
        } else if (!items.animal_songs_poem.clue?.isDiscovered) {
            newState.lastMessage = "힌트: 메모에서 계절의 순서를 알아냈습니다. 이제 어떤 동물이 어떤 계절을 상징하는지 알아야 합니다. 책장에 꽂힌 시집을 확인해보세요. ('시집 봐')";
        } else {
            newState.lastMessage = "힌트: 모든 단서를 찾았습니다! 메모의 계절 순서대로, 시집에 나온 동물의 숫자를 조합하면 비밀번호가 될 것입니다.";
        }
        break;
    }
    
    default:
      newState.lastMessage = '알 수 없는 행동입니다.';
      break;
  }

  return newState;
} 