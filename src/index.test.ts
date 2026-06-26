import LcsDiff, { MappingCommonDataType, MappingDiffType } from "./index";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type Slice = { oldBegin: number; oldEnd: number; newBegin: number; newEnd: number };

function collectCommon(old: string[], next: string[]): Slice[] {
  const result: Slice[] = [];
  new LcsDiff(old, next).scanCommon((oldBegin, oldEnd, newBegin, newEnd) => {
    result.push({ oldBegin, oldEnd, newBegin, newEnd });
  });
  return result;
}

function collectDiff(old: string[], next: string[]): Slice[] {
  const result: Slice[] = [];
  new LcsDiff(old, next).scanDiff((oldBegin, oldEnd, newBegin, newEnd) => {
    result.push({ oldBegin, oldEnd, newBegin, newEnd });
  });
  return result;
}

/** Flatten all matched items from the old array via scanCommon */
function flatCommonItems(old: string[], next: string[]): string[] {
  const items: string[] = [];
  new LcsDiff(old, next).scanCommon((oB, oE) => {
    for (let i = oB; i < oE; i++) items.push(old[i]);
  });
  return items;
}

/** Flatten all removed and added items from scanDiff */
function flatDiffItems(old: string[], next: string[]): { removed: string[]; added: string[] } {
  const removed: string[] = [];
  const added: string[] = [];
  new LcsDiff(old, next).scanDiff((oB, oE, nB, nE) => {
    for (let i = oB; i < oE; i++) removed.push(old[i]);
    for (let i = nB; i < nE; i++) added.push(next[i]);
  });
  return { removed, added };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("LcsDiff", () => {

  // ── EDGE CASES ─────────────────────────────────────────────────────────────
  describe("Edge cases", () => {
    test("both arrays empty: scanCommon emits nothing", () => {
      expect(collectCommon([], [])).toEqual([]);
    });

    test("both arrays empty: scanDiff emits nothing", () => {
      expect(collectDiff([], [])).toEqual([]);
    });

    test("old empty, new non-empty: scanCommon emits nothing", () => {
      expect(collectCommon([], ["a", "b"])).toEqual([]);
    });

    test("old empty, new non-empty: scanDiff emits whole new array as addition", () => {
      const diffs = collectDiff([], ["a", "b"]);
      expect(diffs.length).toBeGreaterThan(0);
      const allAdded = diffs.flatMap((d) =>
        Array.from({ length: d.newEnd - d.newBegin }, (_, i) => ["a", "b"][d.newBegin + i])
      );
      expect(allAdded.sort()).toEqual(["a", "b"]);
    });

    test("old non-empty, new empty: scanCommon emits nothing", () => {
      expect(collectCommon(["a", "b"], [])).toEqual([]);
    });

    test("old non-empty, new empty: scanDiff emits whole old array as deletion", () => {
      const diffs = collectDiff(["a", "b"], []);
      const { removed } = flatDiffItems(["a", "b"], []);
      expect(removed.sort()).toEqual(["a", "b"]);
    });

    test("single-element identical: scanCommon emits it", () => {
      expect(collectCommon(["x"], ["x"])).toEqual([
        { oldBegin: 0, oldEnd: 1, newBegin: 0, newEnd: 1 },
      ]);
    });

    test("single-element different: scanCommon emits nothing", () => {
      expect(collectCommon(["a"], ["b"])).toEqual([]);
    });

    test("single-element different: scanDiff captures the change", () => {
      const { removed, added } = flatDiffItems(["a"], ["b"]);
      expect(removed).toContain("a");
      expect(added).toContain("b");
    });
  });

  // ── IDENTICAL ARRAYS ───────────────────────────────────────────────────────
  describe("Identical arrays", () => {
    const arr = ["a", "b", "c", "d"];

    test("scanCommon covers all elements in order", () => {
      expect(flatCommonItems(arr, arr)).toEqual(["a", "b", "c", "d"]);
    });

    test("scanDiff emits no diffs", () => {
      expect(collectDiff(arr, arr)).toEqual([]);
    });

    test("getMappingCommon maps each index to itself", () => {
      const mapping = new LcsDiff(arr, arr).getMappingCommon();
      const flat: Record<number, number> = {};
      for (const m of mapping) {
        const [k, v] = Object.entries(m)[0];
        flat[Number(k)] = v as number;
      }
      expect(flat[0]).toBe(0);
      expect(flat[1]).toBe(1);
      expect(flat[2]).toBe(2);
      expect(flat[3]).toBe(3);
    });

    test("getMappingDiff returns empty groups", () => {
      const [arrOld, arrNew] = new LcsDiff(arr, arr).getMappingDiff();
      expect(arrOld).toEqual([]);
      expect(arrNew).toEqual([]);
    });
  });

  // ── COMPLETELY DIFFERENT ARRAYS ────────────────────────────────────────────
  describe("Completely different arrays", () => {
    const old = ["a", "b", "c"];
    const next = ["x", "y", "z"];

    test("scanCommon emits nothing", () => {
      expect(collectCommon(old, next)).toEqual([]);
    });

    test("scanDiff reports all items changed", () => {
      const { removed, added } = flatDiffItems(old, next);
      expect(removed.sort()).toEqual(["a", "b", "c"]);
      expect(added.sort()).toEqual(["x", "y", "z"]);
    });

    test("getMappingCommon returns empty array", () => {
      expect(new LcsDiff(old, next).getMappingCommon()).toEqual([]);
    });
  });

  // ── PREFIX-ONLY MATCH ──────────────────────────────────────────────────────
  describe("Common prefix only", () => {
    const old = ["a", "b", "c", "X"];
    const next = ["a", "b", "c", "Y"];

    test("scanCommon yields the three matching prefix items", () => {
      expect(flatCommonItems(old, next)).toEqual(["a", "b", "c"]);
    });

    test("scanDiff reports only the differing tail", () => {
      const { removed, added } = flatDiffItems(old, next);
      expect(removed).toEqual(["X"]);
      expect(added).toEqual(["Y"]);
    });
  });

  // ── SUFFIX-ONLY MATCH ──────────────────────────────────────────────────────
  describe("Common suffix only", () => {
    const old = ["X", "a", "b", "c"];
    const next = ["Y", "a", "b", "c"];

    test("scanCommon yields the three matching suffix items", () => {
      expect(flatCommonItems(old, next)).toEqual(["a", "b", "c"]);
    });

    test("scanDiff reports only the differing head", () => {
      const { removed, added } = flatDiffItems(old, next);
      expect(removed).toEqual(["X"]);
      expect(added).toEqual(["Y"]);
    });
  });

  // ── README EXAMPLE ─────────────────────────────────────────────────────────
  describe("README example (cities)", () => {
    const old = ["Jakarta", "Bandung", "Surabaya", "Medan", "Ambon"];
    const next = ["Jakarta", "Surabaya", "Malang", "Makassar", "Ambon", "Bali"];

    test("scanCommon yields Jakarta, Surabaya, Ambon", () => {
      expect(flatCommonItems(old, next)).toEqual(["Jakarta", "Surabaya", "Ambon"]);
    });

    test("scanDiff yields removed items: Bandung and Medan", () => {
      const { removed } = flatDiffItems(old, next);
      expect(removed.sort()).toEqual(["Bandung", "Medan"].sort());
    });

    test("scanDiff yields added items: Malang, Makassar, Bali", () => {
      const { added } = flatDiffItems(old, next);
      expect(added.sort()).toEqual(["Bali", "Makassar", "Malang"].sort());
    });

    test("getMappingCommon maps Jakarta(0), Surabaya(2), Ambon(4)", () => {
      const mapping = new LcsDiff(old, next).getMappingCommon();
      const flat: Record<number, number> = {};
      for (const m of mapping) {
        const [k, v] = Object.entries(m)[0];
        flat[Number(k)] = v as number;
      }
      // Jakarta: old[0] == new[0]
      expect(flat[0]).toBe(0);
      // Surabaya: old[2] == new[1]
      expect(flat[2]).toBe(1);
      // Ambon: old[4] == new[4]
      expect(flat[4]).toBe(4);
    });

    test("getMappingDiff returns correct old/new groups", () => {
      const [arrOld, arrNew] = new LcsDiff(old, next).getMappingDiff();
      const oldTexts = arrOld.flatMap((g) => g.map((i: MappingDiffType) => i.text)).sort();
      const newTexts = arrNew.flatMap((g) => g.map((i: MappingDiffType) => i.text)).sort();
      expect(oldTexts).toEqual(["Bandung", "Medan"].sort());
      expect(newTexts).toEqual(["Bali", "Makassar", "Malang"].sort());
    });
  });

  // ── PURE INSERTION ─────────────────────────────────────────────────────────
  describe("Pure insertion", () => {
    const old = ["a", "c"];
    const next = ["a", "b", "c"];

    test("scanCommon finds a and c", () => {
      expect(flatCommonItems(old, next)).toEqual(["a", "c"]);
    });

    test("scanDiff reports b as added with no removals", () => {
      const { removed, added } = flatDiffItems(old, next);
      expect(removed).toEqual([]);
      expect(added).toEqual(["b"]);
    });
  });

  // ── PURE DELETION ──────────────────────────────────────────────────────────
  describe("Pure deletion", () => {
    const old = ["a", "b", "c"];
    const next = ["a", "c"];

    test("scanCommon finds a and c", () => {
      expect(flatCommonItems(old, next)).toEqual(["a", "c"]);
    });

    test("scanDiff reports b as removed with no additions", () => {
      const { removed, added } = flatDiffItems(old, next);
      expect(removed).toEqual(["b"]);
      expect(added).toEqual([]);
    });
  });

  // ── MULTIPLE NON-CONTIGUOUS EDITS ─────────────────────────────────────────
  describe("Multiple non-contiguous edits", () => {
    const old = ["a", "b", "c", "d", "e"];
    const next = ["a", "X", "c", "Y", "e"];

    test("scanCommon finds a, c, e", () => {
      expect(flatCommonItems(old, next)).toEqual(["a", "c", "e"]);
    });

    test("scanDiff finds b→X and d→Y", () => {
      const { removed, added } = flatDiffItems(old, next);
      expect(removed.sort()).toEqual(["b", "d"]);
      expect(added.sort()).toEqual(["X", "Y"]);
    });
  });

  // ── REPEATED ELEMENTS ──────────────────────────────────────────────────────
  describe("Repeated elements", () => {
    const old = ["a", "a", "b", "a"];
    const next = ["a", "b", "a", "a"];

    test("common items are all a valid subset", () => {
      const items = flatCommonItems(old, next);
      expect(items.length).toBeGreaterThanOrEqual(3);
      items.forEach((item) => expect(["a", "b"]).toContain(item));
    });

    test("removed + common counts cover all old elements", () => {
      const { removed } = flatDiffItems(old, next);
      const common = flatCommonItems(old, next);
      expect(removed.length + common.length).toBe(old.length);
    });

    test("added + common counts cover all new elements", () => {
      const { added } = flatDiffItems(old, next);
      const common = flatCommonItems(old, next);
      expect(added.length + common.length).toBe(next.length);
    });
  });

  // ── LARGE ARRAYS (performance + correctness) ───────────────────────────────
  describe("Large arrays", () => {
    const size = 500;
    const base = Array.from({ length: size }, (_, i) => `line-${i}`);

    test("fully identical large arrays: scanCommon covers all", () => {
      expect(flatCommonItems(base, base).length).toBe(size);
    });

    test("single change in middle of large array: minimal diff", () => {
      const modified = [...base];
      modified[250] = "CHANGED";
      const { removed, added } = flatDiffItems(base, modified);
      expect(removed).toEqual(["line-250"]);
      expect(added).toEqual(["CHANGED"]);
    });

    test("single insertion in large array: nothing removed", () => {
      const withInsert = [...base.slice(0, 250), "INSERTED", ...base.slice(250)];
      const { removed, added } = flatDiffItems(base, withInsert);
      expect(removed).toEqual([]);
      expect(added).toEqual(["INSERTED"]);
    });

    test("single deletion in large array: nothing added", () => {
      const withDelete = [...base.slice(0, 250), ...base.slice(251)];
      const { removed, added } = flatDiffItems(base, withDelete);
      expect(removed).toEqual(["line-250"]);
      expect(added).toEqual([]);
    });
  });

  // ── CONSISTENCY INVARIANTS ─────────────────────────────────────────────────
  describe("Consistency invariants", () => {
    const cases: [string, string[], string[]][] = [
      ["both-empty", [], []],
      ["old-empty", [], ["a", "b"]],
      ["new-empty", ["a", "b"], []],
      ["identical", ["x", "y"], ["x", "y"]],
      ["full-replace", ["a", "b"], ["c", "d"]],
      ["readme-cities",
        ["Jakarta", "Bandung", "Surabaya", "Medan", "Ambon"],
        ["Jakarta", "Surabaya", "Malang", "Makassar", "Ambon", "Bali"]],
    ];

    test.each(cases)("%s: |common| + |removed| === |old|", (_, old, next) => {
      expect(flatCommonItems(old, next).length + flatDiffItems(old, next).removed.length)
        .toBe(old.length);
    });

    test.each(cases)("%s: |common| + |added| === |new|", (_, old, next) => {
      expect(flatCommonItems(old, next).length + flatDiffItems(old, next).added.length)
        .toBe(next.length);
    });

    test.each(cases)(
      "%s: every common item exists in both arrays",
      (_, old, next) => {
        const oldSet = new Set(old);
        const newSet = new Set(next);
        flatCommonItems(old, next).forEach((item) => {
          expect(oldSet.has(item)).toBe(true);
          expect(newSet.has(item)).toBe(true);
        });
      }
    );

    test.each(cases)(
      "%s: old indices from scanCommon and scanDiff are non-overlapping and fully cover old array",
      (_, old, next) => {
        const diff = new LcsDiff(old, next);
        const covered = new Set<number>();

        diff.scanCommon((oB, oE) => {
          for (let i = oB; i < oE; i++) {
            expect(covered.has(i)).toBe(false); // no overlap
            covered.add(i);
          }
        });
        diff.scanDiff((oB, oE) => {
          for (let i = oB; i < oE; i++) {
            expect(covered.has(i)).toBe(false); // no overlap with common
            covered.add(i);
          }
        });
        expect(covered.size).toBe(old.length);
      }
    );
  });

  // ── getMappingCommon structure ─────────────────────────────────────────────
  describe("getMappingCommon structure", () => {
    test("returns array of single-key objects", () => {
      const mapping = new LcsDiff(["a", "b"], ["a"]).getMappingCommon();
      mapping.forEach((entry) => {
        expect(Object.keys(entry).length).toBe(1);
      });
    });

    test("old indices are valid", () => {
      const old = ["Jakarta", "Bandung", "Surabaya", "Medan", "Ambon"];
      const next = ["Jakarta", "Surabaya", "Malang", "Makassar", "Ambon", "Bali"];
      const mapping = new LcsDiff(old, next).getMappingCommon();
      for (const entry of mapping) {
        const oldIdx = Number(Object.keys(entry)[0]);
        expect(oldIdx).toBeGreaterThanOrEqual(0);
        expect(oldIdx).toBeLessThan(old.length);
      }
    });

    test("new indices are valid", () => {
      const old = ["Jakarta", "Bandung", "Surabaya", "Medan", "Ambon"];
      const next = ["Jakarta", "Surabaya", "Malang", "Makassar", "Ambon", "Bali"];
      const mapping = new LcsDiff(old, next).getMappingCommon();
      for (const entry of mapping) {
        const newIdx = Object.values(entry)[0] as number;
        expect(newIdx).toBeGreaterThanOrEqual(0);
        expect(newIdx).toBeLessThan(next.length);
      }
    });

    test("matched items are actually equal strings", () => {
      const old = ["a", "b", "c"];
      const next = ["a", "X", "c"];
      const mapping = new LcsDiff(old, next).getMappingCommon();
      for (const entry of mapping) {
        const [oldIdx, newIdx] = [Number(Object.keys(entry)[0]), Object.values(entry)[0] as number];
        expect(old[oldIdx]).toBe(next[newIdx]);
      }
    });
  });

  // ── getMappingDiff structure ───────────────────────────────────────────────
  describe("getMappingDiff structure", () => {
    test("returns a 2-element tuple [oldGroups, newGroups]", () => {
      const result = new LcsDiff(["a", "b"], ["a", "c"]).getMappingDiff();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    test("each item in groups has index (number) and text (string)", () => {
      const [arrOld, arrNew] = new LcsDiff(["a", "b"], ["a", "c"]).getMappingDiff();
      [...arrOld, ...arrNew].forEach((group) => {
        group.forEach((item: MappingDiffType) => {
          expect(typeof item.index).toBe("number");
          expect(typeof item.text).toBe("string");
        });
      });
    });

    test("old group texts match old[index]", () => {
      const old = ["a", "b", "c"];
      const next = ["a", "X", "c"];
      const [arrOld] = new LcsDiff(old, next).getMappingDiff();
      arrOld.forEach((group) => {
        group.forEach((item: MappingDiffType) => {
          expect(item.text).toBe(old[item.index]);
        });
      });
    });

    test("new group texts match next[index]", () => {
      const old = ["a", "b", "c"];
      const next = ["a", "X", "c"];
      const [, arrNew] = new LcsDiff(old, next).getMappingDiff();
      arrNew.forEach((group) => {
        group.forEach((item: MappingDiffType) => {
          expect(item.text).toBe(next[item.index]);
        });
      });
    });

    test("getMappingDiff and getMappingCommon old indices are non-overlapping and cover all old items", () => {
      const old = ["a", "b", "c", "d"];
      const next = ["a", "X", "c", "d"];
      const diff = new LcsDiff(old, next);
      const [arrOld] = diff.getMappingDiff();
      const common = diff.getMappingCommon();

      const diffOldIdxs = new Set(arrOld.flat().map((i: MappingDiffType) => i.index));
      const commonOldIdxs = new Set(common.map((m: MappingCommonDataType) => Number(Object.keys(m)[0])));

      // Non-overlapping
      for (const idx of diffOldIdxs) {
        expect(commonOldIdxs.has(idx)).toBe(false);
      }
      // Full coverage
      expect(diffOldIdxs.size + commonOldIdxs.size).toBe(old.length);
    });
  });

  // ── scanDiff without callback ──────────────────────────────────────────────
  describe("scanDiff without callback", () => {
    test("returns same edit distance as scanCommon", () => {
      const diff = new LcsDiff(["a", "b", "c"], ["a", "X", "c"]);
      expect(diff.scanDiff()).toBe(diff.scanCommon());
    });

    test("returns 0 for identical arrays", () => {
      const diff = new LcsDiff(["a", "b"], ["a", "b"]);
      expect(diff.scanDiff()).toBe(0);
    });
  });

  // ── CASE SENSITIVITY ──────────────────────────────────────────────────────
  describe("Case sensitivity", () => {
    test("'A' and 'a' are treated as different", () => {
      expect(flatCommonItems(["A"], ["a"])).toEqual([]);
    });

    test("same-cased strings match correctly", () => {
      expect(flatCommonItems(["Hello"], ["Hello"])).toEqual(["Hello"]);
    });

    test("case difference is detected as a diff", () => {
      const { removed, added } = flatDiffItems(["Hello"], ["hello"]);
      expect(removed).toEqual(["Hello"]);
      expect(added).toEqual(["hello"]);
    });
  });

  // ── WHITESPACE AND SPECIAL CHARACTERS ─────────────────────────────────────
  describe("Whitespace and special characters", () => {
    test("strings with spaces compare exactly", () => {
      expect(flatCommonItems(["hello world"], ["hello world"])).toEqual(["hello world"]);
    });

    test("trailing space makes strings different", () => {
      expect(flatCommonItems(["hello "], ["hello"])).toEqual([]);
    });

    test("unicode strings compare correctly", () => {
      expect(flatCommonItems(["こんにちは"], ["こんにちは"])).toEqual(["こんにちは"]);
    });

    test("empty string elements are handled correctly", () => {
      expect(flatCommonItems(["", "a"], ["", "a"])).toEqual(["", "a"]);
    });

    test("empty string vs non-empty is a diff", () => {
      const { removed, added } = flatDiffItems([""], ["a"]);
      expect(removed).toContain("");
      expect(added).toContain("a");
    });

    test("special characters are compared exactly", () => {
      expect(flatCommonItems(["<br/>", "&amp;"], ["<br/>", "&amp;"])).toEqual(["<br/>", "&amp;"]);
    });
  });
});
