import { GameState, Intent, Item } from './types';
export type { GameState }; // GameState 타입을 다른 파일에서 import 할 수 있도록 export 합니다.

/**
 * 게임의 초기 상태를 정의합니다.
 */
export const initialGameState: GameState = {
  items: {
    // [수정] 방의 주요 가구들을 더 구체적으로 묘사
    desk: {
      id: 'desk',
      name: '오래된 나무 책상',
      description: '방 한가운데에 놓인 낡은 나무 책상입니다. 서랍이 여러 개 달려 있고, 위에는 두꺼운 책 한 권과 낡은 열쇠가 놓여 있습니다.',
    },
    bookshelf: {
      id: 'bookshelf',
      name: '벽면의 책장',
      description: '방의 왼쪽 벽을 가득 채운 거대한 책장입니다. 오래된 책들이 빽빽하게 꽂혀 있어 손댈 엄두가 나지 않습니다.',
    },
    chair: {
      id: 'chair',
      name: '나무 의자',
      description: '책상 앞에 놓인 평범한 나무 의자입니다. 특별한 점은 없어 보입니다.',
    },

    // [수정] 서랍을 '열린 서랍'과 '잠긴 서랍'으로 분리
    open_drawer: {
      id: 'open_drawer',
      name: '열린 서랍',
      description: '책상 오른쪽에 달린 서랍 중 하나가 이미 열려 있습니다. 안을 들여다보니 텅 비어있습니다.',
    },
    locked_drawer: {
      id: 'locked_drawer',
      name: '잠긴 서랍',
      description: '책상 중앙에 달린 서랍입니다. 자물쇠로 단단히 잠겨 있습니다.',
      isLocked: true,
      contains: ['book'] // 이 서랍 안에 '책'이 들어있음
    },

    // [수정] 열쇠의 위치와 설명을 그림에 맞게 변경
    key: {
      id: 'key',
      name: '작은 열쇠',
      description: '책상 위에 놓인 낡고 녹슨 작은 열쇠입니다. 어딘가의 잠금을 해제할 수 있을 것 같습니다.',
      canBeTaken: true,
      unlocks: 'locked_drawer', // '잠긴 서랍'을 열 수 있음
    },
    
    // [추가] 바닥에 떨어진 종이를 새로운 객체로 추가
    paper_floor: {
        id: 'paper_floor',
        name: '바닥의 종이',
        description: '책상 아래, 열린 서랍 근처 바닥에 낡은 종이 한 장이 떨어져 있습니다.',
        canBeTaken: true,
        clue: {
            content: '종이를 줍자, 익숙하지 않은 문자로 [ जन्मतिथ: १९०८ ] 라고 적혀 있습니다.',
            isDiscovered: false,
        }
    },

    // [수정] 책의 위치가 '잠긴 서랍 안'으로 변경됨, isHidden 추가
    book: {
        id: 'book',
        name: '두꺼운 책',
        description: '표지에 [헤르만 헤세]라고 적힌 두꺼운 책입니다. 잠긴 서랍 안에서 발견했습니다.',
        isHidden: true, // 처음에는 보이지 않음
        clue: {
            content: '책 안을 살펴보자, [죽음은 형태의 변화일 뿐]이라는 문장이 밑줄 그어져 있고, 그 옆에 작은 글씨로 [0451]이라고 쓰여 있습니다.',
            isDiscovered: false,
        }
    },

    // [유지] 최종 목표인 금고는 그대로 유지
    safe: {
      id: 'safe',
      name: '벽에 걸린 금고',
      description: '벽에 단단히 고정된 작은 금고입니다. 4자리 비밀번호를 입력해야 합니다.',
      isLocked: true,
    },
  },
  inventory: [],
  // [수정] 방 전체 설명을 컨셉 아트에 맞게 업데이트
  roomDescription: '당신은 낡은 책상과 거대한 책장이 있는 작가의 서재에 갇혔습니다. 벽에는 금고가 걸려 있고, 문은 잠겨있습니다. 탈출하려면 방 안의 단서들을 조합해 비밀번호를 찾아야 합니다.',
  lastMessage: null,
  isEscaped: false,
};

/**
 * 사용자의 의도(Intent)를 받아 게임 상태(GameState)를 업데이트합니다.
 */
export function updateState(currentState: GameState, intent: Intent): GameState {
  const newState = JSON.parse(JSON.stringify(currentState));
  const { action, object, secondaryObject } = intent;
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
        if (targetItem.isTaken) {
            newState.lastMessage = `당신은 이미 ${targetItem.name}을(를) 가지고 있습니다.`;
        } else {
            targetItem.isTaken = true;
            newState.inventory.push(object);
            newState.lastMessage = `${targetItem.name}을(를) 획득했습니다.`;
        }
      } else if (targetItem) {
        newState.lastMessage = `${targetItem.name}은(는) 획득할 수 없는 아이템입니다.`;
      } else {
        newState.lastMessage = '무엇을 주우시겠습니까?';
      }
      break;

    case 'open': {
        const targetToOpen = newState.items[object];
        if (!targetToOpen) {
            newState.lastMessage = `${object}(을)를 찾을 수 없습니다.`;
        } else if (targetToOpen.isLocked) {
            newState.lastMessage = `${targetToOpen.name}은(는) 잠겨있습니다.`;
        } else if (targetToOpen.contains && targetToOpen.contains.length > 0) {
            const containedItemId = targetToOpen.contains[0];
            const containedItem = newState.items[containedItemId];
            if (containedItem && containedItem.isHidden) {
                containedItem.isHidden = false;
                newState.lastMessage = `${targetToOpen.name}을(를) 열자 안에서 ${containedItem.name}을(를) 발견했습니다.`;
            } else {
                 newState.lastMessage = `${targetToOpen.name} 안에는 아무것도 없습니다.`;
            }
        } else if (targetToOpen.clue) {
            targetToOpen.clue.isDiscovered = true;
            newState.lastMessage = `${targetToOpen.name}을(를) 열자 다음을 발견했습니다: ${targetToOpen.clue.content}`;
        } else {
            newState.lastMessage = `${targetToOpen.name} 안에는 아무것도 없습니다.`;
        }
        break;
    }

    case 'unlock':
        if (secondaryObject) {
            const toolItem = newState.items[object];
            const targetToUnlock = newState.items[secondaryObject];

            if (!toolItem || !newState.inventory.includes(toolItem.id)) {
                newState.lastMessage = `당신은 ${toolItem?.name || object}을(를) 가지고 있지 않습니다.`;
            } else if (!targetToUnlock) {
                newState.lastMessage = `${secondaryObject}은(는) 존재하지 않는 아이템입니다.`;
            } else if (toolItem.unlocks === targetToUnlock.id && targetToUnlock.isLocked) {
                targetToUnlock.isLocked = false;
                newState.lastMessage = `딸깍, 하는 소리와 함께 ${targetToUnlock.name}의 잠금이 해제되었습니다. 이제 열 수 있을 것 같습니다.`;
            } else if (toolItem.unlocks !== targetToUnlock.id) {
                newState.lastMessage = `${toolItem.name}(으)로는 ${targetToUnlock.name}을(를) 열 수 없습니다.`;
            } else {
                newState.lastMessage = `${targetToUnlock.name}은(는) 이미 열려있습니다.`;
            }
        } else {
            const targetToUnlock = newState.items['safe'];
            if (object === '0451' && targetToUnlock.isLocked) {
                targetToUnlock.isLocked = false;
                newState.isEscaped = true;
                newState.lastMessage = '비밀번호가 맞았습니다! 금고 문이 열리면서 숨겨진 비상 열쇠를 발견했습니다. 당신은 서재를 탈출했습니다! 제작자의 이메일: skaparty@gmail.com 커피챗 환영.';
            } else if (targetToUnlock.isLocked) {
                newState.lastMessage = '비밀번호가 틀렸습니다.';
            } else {
                newState.lastMessage = '금고는 이미 열려있습니다.';
            }
        }
        break;

    case 'hint': {
        const { items, inventory } = newState;
        if (items.locked_drawer.isLocked && !inventory.includes('key')) {
            newState.lastMessage = "힌트: 책상 위에 열쇠가 있습니다. 저 열쇠는 어디에 쓰는 걸까요?";
        } else if (items.locked_drawer.isLocked && inventory.includes('key')) {
            newState.lastMessage = "힌트: 가지고 있는 열쇠로 잠긴 서랍을 열 수 있을 것 같습니다.";
        } else if (!items.locked_drawer.isLocked && items.book.isHidden) {
            newState.lastMessage = "힌트: 잠긴 서랍이 열렸습니다. 안을 자세히 살펴보세요 ('잠긴 서랍 열어').";
        } else if (!items.book.isHidden && !items.book.clue.isDiscovered) {
             newState.lastMessage = "힌트: 서랍에서 책을 발견했습니다. 책 안에 중요한 단서가 있을지도 모릅니다 ('책 봐').";
        } else if (items.safe.isLocked && items.book.clue.isDiscovered) {
            newState.lastMessage = "힌트: 책에서 발견한 4자리 숫자는 어디에 쓰는 걸까요? 비밀번호를 입력할 만한 장치가 보입니다.";
        } else {
            newState.lastMessage = "힌트: 모든 단서를 찾은 것 같습니다. 이제 탈출구는 하나 뿐입니다!";
        }
        break;
    }
    
    default:
      newState.lastMessage = '알 수 없는 행동입니다.';
      break;
  }

  return newState;
} 