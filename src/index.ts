export type SnakeType = {
  d: number;
  oldStart: number;
  oldEnd: number;
  newStart: number;
  newEnd: number;
};

export type CallbackType = (
  oldStart: number,
  oldEnd: number,
  newStart: number,
  newEnd: number
) => void;

export type MappingCommonDataType = {
  [x: number]: number;
};

export type MappingDiffType = {
  index: number;
  text: string;
  hasPartner?: boolean;
};

export type objModif = {
  old: modifList;
  new: modifList;
};

type modifList = {
  [x: number | string]: string;
};

class LcsDiff {
  protected oldData: Array<string>;
  protected newData: Array<string>;

  constructor(oldData: Array<string>, newData: Array<string>) {
    this.oldData = oldData;
    this.newData = newData;
  }

  protected equal = (oldValue: string, newValue: string): boolean =>
    oldValue === newValue;
  protected indexEqual = (oldIndex: number, newIndex: number): boolean =>
    this.equal(this.oldData[oldIndex], this.newData[newIndex]);

  /**
   * Finds the "middle snake" in the edit graph between the two specified sub-sequences.
   * This is part of the O(ND) space-optimized bidirectional difference algorithm.
   * It runs a forward and a backward search simultaneously, looking for an intersection point.
   */
  protected findMiddleSnake = (
    aBegin: number,
    aFinish: number,
    bBegin: number,
    bFinish: number,
    maxDh: number
  ): SnakeType | null => {
    const lengthA: number = aFinish - aBegin;
    const lengthB: number = bFinish - bBegin;

    // Delta represents the difference in lengths of the two sequences
    const lengthDelta: number = lengthB - lengthA;
    const isOdd: boolean = lengthDelta % 2 !== 0;

    const contourLen: number = 2 * maxDh + 1;
    // arrForeContours and arrBackContours store the furthest reaching x-positions on diagonals k
    const arrForeContours: Array<number> = new Array<number>(contourLen);
    const arrBackContours: Array<number> = new Array<number>(contourLen);

    arrForeContours[maxDh + 1] = 0;
    arrBackContours[maxDh - 1] = 0;

    let d: number = 0;
    // Iterate through edit distance d
    while (d <= maxDh) {
      let k: number = -d;
      // Forward path search on diagonal k
      while (k <= d) {
        const dirB: boolean =
          k === -d ||
          (k !== d &&
            arrForeContours[maxDh + k - 1] < arrForeContours[maxDh + k + 1]);
        const preK: number = dirB ? k + 1 : k - 1;
        const preContour: number = arrForeContours[maxDh + preK];
        let oldStart: number = aBegin + preContour;
        let newStart: number = bBegin + preContour - preK;

        if (dirB) {
          ++newStart;
        } else {
          ++oldStart;
        }
        let oldEnd: number = oldStart;
        let newEnd: number = newStart;

        // Keep traversing matches (diagonals/snakes) without incrementing edit distance d
        while (
          oldEnd < aFinish &&
          newEnd < bFinish &&
          this.indexEqual(oldEnd, newEnd)
        ) {
          ++oldEnd;
          ++newEnd;
        }
        arrForeContours[maxDh + k] = oldEnd - aBegin;
        
        // If delta is odd, check if forward search overlaps with backward search
        if (isOdd) {
          const backK: number = k + lengthDelta;
          if (-d < backK && backK < d) {
            const backContour: number = arrBackContours[maxDh + backK];
            if (oldEnd + backContour >= aFinish) {
              return {
                d: 2 * d - 1,
                oldStart,
                oldEnd,
                newStart,
                newEnd,
              };
            }
          }
        }
        k += 2;
      }

      k = -d;
      // Backward path search on diagonal k
      while (k <= d) {
        const dirB: boolean =
          k === d ||
          (k !== -d &&
            arrBackContours[maxDh + k - 1] > arrBackContours[maxDh + k + 1]);
        const preK: number = dirB ? k - 1 : k + 1;
        const preContour: number = arrBackContours[maxDh + preK];

        let oldEnd: number = aFinish - preContour;
        let newEnd: number = bFinish - preContour - preK;

        if (dirB) {
          --newEnd;
        } else {
          --oldEnd;
        }

        let oldStart: number = oldEnd;
        let newStart: number = newEnd;

        // Keep traversing matches backwards
        while (
          oldStart > aBegin &&
          newStart > bBegin &&
          this.indexEqual(oldStart - 1, newStart - 1)
        ) {
          --oldStart;
          --newStart;
        }
        arrBackContours[maxDh + k] = aFinish - oldStart;
        
        // If delta is even, check if backward search overlaps with forward search
        if (!isOdd) {
          const foreK: number = k - lengthDelta;
          if (-d <= foreK && foreK <= d) {
            const foreContour: number = arrForeContours[maxDh + foreK];
            if (oldStart - foreContour <= aBegin) {
              return {
                d: 2 * d,
                oldStart,
                oldEnd,
                newStart,
                newEnd,
              };
            }
          }
        }
        k += 2;
      }
      ++d;
    }
    return null;
  };

  /**
   * Recursively scans the grid. It trims common prefix and suffix (which takes O(N) time),
   * then locates a middle snake on the mismatched middle portion, registers common segments,
   * and recursively splits the remaining subproblems.
   */
  protected scan = (
    oldBegin: number,
    oldFinish: number,
    newBegin: number,
    newFinish: number,
    callback?: CallbackType,
    dMax?: number
  ): number | null => {
    // 1. Trim common prefix
    while (
      oldBegin < oldFinish &&
      newBegin < newFinish &&
      this.indexEqual(oldBegin, newBegin)
    ) {
      const oldStart = oldBegin;
      const newStart = newBegin;
      while (
        oldBegin < oldFinish &&
        newBegin < newFinish &&
        this.indexEqual(oldBegin, newBegin)
      ) {
        oldBegin++;
        newBegin++;
      }
      if (callback) {
        callback(oldStart, oldBegin, newStart, newBegin);
      }
    }

    // 2. Trim common suffix
    let suffixLen = 0;
    while (
      oldBegin < oldFinish - suffixLen &&
      newBegin < newFinish - suffixLen &&
      this.indexEqual(oldFinish - 1 - suffixLen, newFinish - 1 - suffixLen)
    ) {
      suffixLen++;
    }

    const oldFinishM = oldFinish - suffixLen;
    const newFinishM = newFinish - suffixLen;

    const oldLength: number = oldFinishM - oldBegin;
    const newLength: number = newFinishM - newBegin;

    let d = 0;
    if (oldLength > 0 && newLength > 0) {
      if (dMax == undefined) {
        dMax = oldLength + newLength;
      }
      const maxDh: number = Math.ceil(dMax / 2);
      const middleSnake: SnakeType | null = this.findMiddleSnake(
        oldBegin,
        oldFinishM,
        newBegin,
        newFinishM,
        maxDh
      );

      if (middleSnake == null) return null;
      d = middleSnake.d;

      // Case 1: Edit distance is 0, meaning sequences are identical
      if (middleSnake.d === 0) {
        if (callback && middleSnake.oldEnd > middleSnake.oldStart) {
          callback(
            middleSnake.oldStart,
            middleSnake.oldEnd,
            middleSnake.newStart,
            middleSnake.newEnd
          );
        }
      } 
      // Case 2: Edit distance is 1, a single insertion or deletion
      else if (middleSnake.d === 1) {
        if (callback) {
          let l: number;
          if (oldLength < newLength) l = middleSnake.oldStart - oldBegin;
          else l = middleSnake.newStart - newBegin;

          if (l > 0) callback(oldBegin, oldBegin + 1, newBegin, newBegin + 1);
          if (middleSnake.oldEnd > middleSnake.oldStart)
            callback(
              middleSnake.oldStart,
              middleSnake.oldEnd,
              middleSnake.newStart,
              middleSnake.newEnd
            );
        }
      } 
      // Case 3: Recursively split subproblems around the middle snake
      else {
        // Find paths in the grid segment before the middle snake
        this.scan(
          oldBegin,
          middleSnake.oldStart,
          newBegin,
          middleSnake.newStart,
          callback
        );
        
        // Process the middle snake itself (common matched segment)
        if (callback && middleSnake.oldEnd > middleSnake.oldStart)
          callback(
            middleSnake.oldStart,
            middleSnake.oldEnd,
            middleSnake.newStart,
            middleSnake.newEnd
          );

        // Find paths in the grid segment after the middle snake
        this.scan(
          middleSnake.oldEnd,
          oldFinishM,
          middleSnake.newEnd,
          newFinishM,
          callback
        );
      }
    }

    // 3. Emit common suffix callback if one exists
    if (suffixLen > 0 && callback) {
      callback(oldFinishM, oldFinish, newFinishM, newFinish);
    }

    return d;
  };

  public scanCommon = (callback?: CallbackType, dMax?: number): number | null =>
    this.scan(0, this.oldData.length, 0, this.newData.length, callback, dMax);

  public getMappingCommon = (): Array<MappingCommonDataType> => {
    const arrA: Array<number> = [];
    const arrB: Array<number> = [];

    this.scanCommon((oldStart, oldEnd, newStart, newEnd) => {
      for (let i: number = oldStart; i < oldEnd; i++) {
        arrA.push(i);
      }
      for (let i: number = newStart; i < newEnd; i++) {
        arrB.push(i);
      }
    });
    const arrCommon: Array<number> = [...arrA, ...arrB];
    const arrRes: Array<MappingCommonDataType> = [];
    const half: number = arrCommon.length / 2;
    for (let y: number = 0; y < half; y++) {
      arrRes.push({
        [arrCommon[y]]: arrCommon[y + half],
      });
    }
    return arrRes;
  };

  public scanDiff = (callback?: CallbackType, dMax?: number): number | null => {
    if (!callback) {
      return this.scanCommon(undefined, dMax);
    }
    let oldIndex: number = 0;
    let newIndex: number = 0;
    const commonCallback: CallbackType = (
      oldStart: number,
      oldEnd: number,
      newStart: number,
      newEnd: number
    ) => {
      if (oldIndex < oldStart || newIndex < newStart) {
        callback(oldIndex, oldStart, newIndex, newStart);
      }
      oldIndex = oldEnd;
      return (newIndex = newEnd);
    };

    const commonResult = this.scanCommon(commonCallback, dMax);
    if (commonResult != null) {
      const oldLength: number = this.oldData.length;
      const newLength: number = this.newData.length;

      if (oldIndex < oldLength || newIndex < newLength) {
        callback(oldIndex, oldLength, newIndex, newLength);
      }
    }
    return commonResult;
  };

  public getMappingDiff = (): MappingDiffType[][][] => {
    const arrOld: Array<MappingDiffType>[] = [];
    const arrNew: Array<MappingDiffType>[] = [];
    this.scanDiff((oldStart, oldEnd, newStart, newEnd) => {
      const arrOfObjOld: Array<MappingDiffType> = [];
      for (let i: number = oldStart; i < oldEnd; i++) {
        arrOfObjOld.push({
          index: i,
          text: this.oldData[i],
        });
      }
      const arrOfObjNew: Array<MappingDiffType> = [];
      for (let i: number = newStart; i < newEnd; i++) {
        arrOfObjNew.push({
          index: i,
          text: this.newData[i],
        });
      }
      arrOld.push(arrOfObjOld);
      arrNew.push(arrOfObjNew);
      // console.log(
      //   " '%s' -> '%s'",
      //   this.oldData.slice(oldStart, oldEnd),
      //   this.newData.slice(newStart, newEnd)
      // );
    });
    return [arrOld, arrNew];
  };
}

export default LcsDiff;
