## About Diff-Algo-Switch

Diff Algo Switch is package to find differences between two array of string by implementing "An O(ND) Difference Algorithm and its Variations" (Myers, 1986)

## How to Use

1. Create new instance of Class LcsDiff. Give two arrays of string as constructor parameters.

```tsx
import LcsDiff, {
  MappingDiffType,
  MappingCommonDataType,
} from "diff-algo-switch";

const arrOldData: Array<string> = [
  "Jakarta",
  "Bandung",
  "Surabaya",
  "Medan",
  "Ambon",
];

const arrNewData: Array<string> = [
  "Jakarta",
  "Surabaya",
  "Malang",
  "Makassar",
  "Ambon",
  "Bali",
];

const diff: LcsDiff = new LcsDiff(arrOldData, arrNewData);
```

1. Access to available useful methods

- scanDiff

Methods that require 1 parameter. The parameter is a callback function that need 4 parameter

The callback will be called for each edit/different slice

```tsx
diff.scanDiff((oldBegin: number, oldEnd: number, newBegin: number, newEnd: number)=>{
        console.log(arrOldData.slice(oldBegin, oldEnd),"->",arrNewData.slice(newBegin, newEnd))
    })

//result
[ 'Bandung' ] -> []
[ 'Medan' ] -> [ 'Malang', 'Makassar' ]
[] -> [ 'Bali' ]
```

- scanCommon

Methods that require 1 parameter. The parameter is a callback function that need 4 parameter

The callback will be called for each same / common slice

```tsx
diff.scanCommon((oldBegin: number, oldEnd: number, newBegin: number, newEnd: number)=>{
        console.log(arrOldData.slice(oldBegin,oldEnd),"->",arrNewData.slice(newBegin,newEnd))
    })

//result
[ 'Jakarta' ] -> [ 'Jakarta' ]
[ 'Surabaya' ] -> [ 'Surabaya' ]
[ 'Ambon' ] -> [ 'Ambon' ]
```

- getMappingDiff

Method to get mapping of different item in both list

```tsx
const mappingDiff: MappingDiffType[][][] = diff.getMappingDiff();

mappingDiff.forEach((data) => {
  console.log(data);
});

//result

[[{ index: 1, text: "Bandung" }], [{ index: 3, text: "Medan" }], []][
  ([],
  [
    { index: 2, text: "Malang" },
    { index: 3, text: "Makassar" },
  ],
  [{ index: 5, text: "Bali" }])
];
```

- getMappingCommon

Method to get mapping of same item in both list

```tsx
const mappingCommon: MappingCommonDataType[] = diff.getMappingCommon();

mappingCommon.forEach((data) => {
  console.log(data);
});

//result

	{ '0': 0 }
	{ '2': 1 }
	{ '4': 4 }

```
