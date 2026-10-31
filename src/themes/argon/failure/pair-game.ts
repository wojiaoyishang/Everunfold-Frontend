export type PairGame = ReturnType<typeof createPairGame>;

/** Self-contained so the same engine also runs in the dependency-free HTTP fallback. */
export function createPairGame(random: () => number = Math.random) {
  let deck: number[] = [];
  let revealed: number[] = [];
  let matched: number[] = [];
  let moves = 0;
  const snapshot = () => ({
    deck: [...deck],
    revealed: [...revealed],
    matched: [...matched],
    moves,
    complete: matched.length === 8,
    pending: revealed.length === 2,
  });
  return {
    snapshot,
    restart() {
      deck = [0, 1, 2, 3, 0, 1, 2, 3];
      for (let index = deck.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [deck[index], deck[other]] = [deck[other], deck[index]];
      }
      revealed = [];
      matched = [];
      moves = 0;
      return snapshot();
    },
    flip(index: number) {
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= deck.length ||
        revealed.length === 2 ||
        revealed.includes(index) ||
        matched.includes(index)
      )
        return snapshot();
      revealed.push(index);
      if (revealed.length === 2) {
        moves++;
        if (deck[revealed[0]] === deck[revealed[1]]) {
          matched.push(...revealed);
          revealed = [];
        }
      }
      return snapshot();
    },
    conceal() {
      revealed = [];
      return snapshot();
    },
  };
}
