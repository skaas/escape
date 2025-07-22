import { GameState, Intent, Item } from './types';
export type { GameState }; // GameState 타입을 다른 파일에서 import 할 수 있도록 export 합니다.

/**
 * 게임의 초기 상태를 정의합니다.
 */
export const initialGameState: GameState = {
  items: {
    desk: {
      id: 'desk',
      name: '오래된 책상',
      description: '방 한가운데에 놓인 낡은 책상입니다. 서랍이 하나 달려 있습니다.',
    },
    drawer: {
      id: 'drawer',
      name: '책상 서랍',
      description: '책상에 달린 작은 서랍입니다.',
      isLocked: true,
      clue: {
        content: '서랍 안에서 낡은 종이를 발견했습니다. [ जन्मतिथ: १९०८ ] 라고 적혀 있습니다.',
        isDiscovered: false,
      },
    },
    key: {
      id: 'key',
      name: '작은 열쇠',
      description: '낡고 녹슨 작은 열쇠입니다. 어딘가의 잠금을 해제할 수 있을 것 같습니다.',
      canBeTaken: true,
      unlocks: 'drawer',
    },
    book: {
        id: 'book',
        name: '두꺼운 책',
        description: '표지에 [헤르만 헤세]라고 적힌 두꺼운 책입니다. 책갈피가 꽂혀 있습니다.',
        clue: {
            content: '책갈피가 꽂힌 페이지를 펼치자, [죽음은 형태의 변화일 뿐]이라는 문장이 밑줄 그어져 있고, 그 옆에 작은 글씨로 [0451]이라고 쓰여 있습니다.',
            isDiscovered: false,
        }
    },
    safe: {
      id: 'safe',
      name: '벽에 걸린 금고',
      description: '벽에 단단히 고정된 작은 금고입니다. 4자리 비밀번호를 입력해야 합니다.',
      isLocked: true,
    },
  },
  inventory: [],
  roomDescription: '당신은 낡은 책상과 책장이 있는 작가의 서재에 갇혔습니다. 문은 잠겨있고, 탈출하려면 방 안의 단서들을 조합해 비밀번호를 찾아야 합니다.',
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
            .filter(item => !item.isTaken)
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
                newState.lastMessage = '비밀번호가 맞았습니다! 금고 문이 열리면서 숨겨진 비상 열쇠를 발견했습니다. 당신은 서재를 탈출했습니다!';
            } else if (targetToUnlock.isLocked) {
                newState.lastMessage = '비밀번호가 틀렸습니다.';
            } else {
                newState.lastMessage = '금고는 이미 열려있습니다.';
            }
        }
        break;

    case 'hint': {
        const { items, inventory } = newState;
        if (items.drawer.isLocked && !inventory.includes('key')) {
            newState.lastMessage = "힌트: 방 어딘가에 잠긴 서랍을 열 수 있는 물건이 숨겨져 있을 것 같습니다.";
        } else if (items.drawer.isLocked && inventory.includes('key')) {
            newState.lastMessage = "힌트: 가지고 있는 열쇠를 사용할 만한 곳이 있지 않을까요? 예를 들면... 서랍이라던가.";
        } else if (!items.drawer.isLocked && !items.drawer.clue.isDiscovered) {
            newState.lastMessage = "힌트: 서랍이 열렸습니다. 안을 자세히 살펴보세요 ('서랍 열어' 또는 '서랍 봐').";
        } else if (items.safe.isLocked && !items.book.clue.isDiscovered) {
            newState.lastMessage = "힌트: 이 방의 주인은 작가였습니다. 책을 좋아했겠죠. 방에 있는 책을 살펴보는 건 어떨까요?";
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