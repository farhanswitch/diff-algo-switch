import mdiff from 'mdiff'

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
  hasPartner?: boolean;
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

  public scanCommon = (callback?: CallbackType, dMax?: number): number | null => mdiff(this.oldData,this.newData).scanCommon(callback)

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

  public scanDiff = (callback?: CallbackType, dMax?: number): number | null => mdiff(this.oldData,this.newData).scanDiff(callback);

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
