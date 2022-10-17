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

type MappingCommonDataType = {
  [x: number]: number;
};

export type MappingDiffType = {
  index: number;
  text: string;
};

export type objModif = {
  old: modifList;
  new: modifList;
};

type modifList = {
  [x: number]: string;
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

  protected findMiddleSnake = (
    aBegin: number,
    aFinish: number,
    bBegin: number,
    bFinish: number,
    maxDh: number
  ): SnakeType | null => {
    const lengthA: number = aFinish - aBegin;
    const lengthB: number = bFinish - bBegin;

    const lengthDelta: number = lengthB - lengthA;
    const isOdd: boolean = lengthDelta % 2 !== 0;

    const contourLen: number = 2 * maxDh + 1;
    const arrForeContours: Array<number> = new Array<number>(contourLen);
    const arrBackContours: Array<number> = new Array<number>(contourLen);

    arrForeContours[maxDh + 1] = 0;
    arrBackContours[maxDh - 1] = 0;

    let d: number = 0;
    while (d <= maxDh) {
      let k: number = -d;
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

        while (
          oldEnd < aFinish &&
          newEnd < bFinish &&
          this.indexEqual(oldEnd, newEnd)
        ) {
          ++oldEnd;
          ++newEnd;
        }
        arrForeContours[maxDh + k] = oldEnd - aBegin;
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

        while (
          oldStart > aBegin &&
          newStart > bBegin &&
          this.indexEqual(oldStart - 1, newStart - 1)
        ) {
          --oldStart;
          --newStart;
        }
        arrBackContours[maxDh + k] = aFinish - oldStart;
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

  protected scan = (
    oldBegin: number,
    oldFinish: number,
    newBegin: number,
    newFinish: number,
    callback?: CallbackType,
    dMax?: number
  ): number | null => {
    const oldLength: number = oldFinish - oldBegin;
    const newLength: number = newFinish - newBegin;

    if (oldLength === 0 || newLength === 0) return 0;
    if (dMax == undefined) {
      //   console.log({ oldLength, newLength });
      dMax = +oldLength + +newLength;
    }
    // console.log({ dMax });

    const maxDh: number = Math.ceil(dMax !== undefined ? dMax / 2 : 0);
    const middleSnake: any = this.findMiddleSnake(
      oldBegin,
      oldFinish,
      newBegin,
      newFinish,
      maxDh
    );

    // console.log({ middleSnake });
    if (middleSnake == null) return null;
    if (middleSnake?.d === 0) {
      if (callback && middleSnake?.oldEnd > middleSnake?.oldStart) {
        callback(
          middleSnake?.oldStart,
          middleSnake?.oldEnd,
          middleSnake?.newStart,
          middleSnake?.newEnd
        );
      }
    } else if (middleSnake.d === 1) {
      if (callback) {
        let l: number;
        if (oldLength < newLength) l = middleSnake?.oldStart - oldBegin;
        else l = middleSnake?.newStart - newBegin;

        if (l > 0) callback(oldBegin, oldBegin + 1, newBegin, newBegin + 1);
        if (middleSnake?.oldEnd > middleSnake.oldStart)
          callback(
            middleSnake.oldStart,
            middleSnake.oldEnd,
            middleSnake.newStart,
            middleSnake.newEnd
          );
      }
    } else {
      this.scan(
        oldBegin,
        middleSnake?.oldStart,
        newBegin,
        middleSnake?.newStart,
        callback
      );
      if (callback && middleSnake?.oldEnd > middleSnake?.oldStart)
        callback(
          middleSnake?.oldStart,
          middleSnake?.oldEnd,
          middleSnake?.newStart,
          middleSnake?.newEnd
        );

      this.scan(
        middleSnake?.oldEnd,
        oldFinish,
        middleSnake?.newEnd,
        newFinish,
        callback
      );
    }
    return middleSnake?.d;
  };

  public scanCommon = (callback?: CallbackType, dMax?: number): number | null =>
    this.scan(0, this.oldData.length, 0, this.newData.length, callback, dMax);

  public getMappingCommon = (): Array<MappingCommonDataType> => {
    const arrCommon: Array<number> = [];
    this.scanCommon((oldStart, oldEnd, newStart, newEnd) => {
      for (let i: number = oldStart; i < oldEnd; i++) {
        arrCommon.push(i);
      }
      for (let i: number = newStart; i < newEnd; i++) {
        arrCommon.push(i);
      }
    });
    const arrRes: Array<MappingCommonDataType> = [];
    for (let index = 0; index < arrCommon.length; index += 2) {
      arrRes.push({
        [arrCommon[index]]: arrCommon[index + 1],
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

  public getMappingDiff = () => {
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
      console.log(
        " '%s' -> '%s'",
        this.oldData.slice(oldStart, oldEnd),
        this.newData.slice(newStart, newEnd)
      );
    });
    return [arrOld, arrNew];
  };
}

export default LcsDiff;
