import { beforeEach, describe, expect, it } from "vitest";
import { $getRoot, $getSelection, $isRangeSelection } from "lexical";
import {
  $isTableCellNode,
  $isTableSelection,
  TableCellHeaderStates,
} from "@lexical/table";
import {
  $canMerge,
  $canSplit,
  $cellAt,
  $cellsInRect,
  $clearCells,
  $columnCount,
  $deleteColumns,
  $deleteRows,
  $deleteTable,
  $getTableSelectionInfo,
  $insertColumn,
  $insertRow,
  $isHeaderColumn,
  $isHeaderRow,
  $mergeSelection,
  $moveColumn,
  $moveRow,
  $rowCount,
  $selectColumn,
  $selectRect,
  $selectRow,
  $selectWholeTable,
  $setCellAlignment,
  $setCellBackground,
  $setCellVerticalAlign,
  $setColumnWidth,
  $setColumnWidths,
  $splitSelection,
  $toggleHeaderColumn,
  $toggleHeaderRow,
  clampColumnWidth,
  sanitizeCellColor,
  TABLE_MAX_COL_WIDTH,
  TABLE_MIN_COL_WIDTH,
} from "./model";
import { deleteTableSafely } from "./actions";
import { $firstTable, grid, insertFilledTable, isConsistent, makeEditor, read, update } from "./test-utils";

beforeEach(() => {
  document.body.innerHTML = "";
});

function setup(rows = 3, cols = 3) {
  const editor = makeEditor();
  insertFilledTable(editor, rows, cols);
  return editor;
}

describe("rows", () => {
  it("inserts a row above and below", () => {
    const editor = setup();
    update(editor, () => $insertRow($firstTable(), 1, "before"));
    expect(grid(editor).map((r) => r[0])).toEqual(["r0c0", "", "r1c0", "r2c0"]);
    update(editor, () => $insertRow($firstTable(), 3, "after"));
    expect(grid(editor).map((r) => r[0])).toEqual(["r0c0", "", "r1c0", "r2c0", ""]);
    expect(isConsistent(editor)).toBe(true);
  });

  it("inserts several rows at once", () => {
    const editor = setup(2, 2);
    update(editor, () => $insertRow($firstTable(), 0, "after", 3));
    expect(grid(editor)).toHaveLength(5);
  });

  it("deletes a row and a range of rows", () => {
    const editor = setup(4, 2);
    update(editor, () => $deleteRows($firstTable(), 1, 1));
    expect(grid(editor).map((r) => r[0])).toEqual(["r0c0", "r2c0", "r3c0"]);
    update(editor, () => $deleteRows($firstTable(), 0, 1));
    expect(grid(editor).map((r) => r[0])).toEqual(["r3c0"]);
  });

  it("removes the table when every row is deleted, leaving a paragraph to type in", () => {
    const editor = setup(2, 2);
    update(editor, () => $deleteRows($firstTable(), 0, 1));
    read(editor, () => {
      expect($getRoot().getChildren().some((n) => n.getType() === "table")).toBe(false);
      expect($getRoot().getChildrenSize()).toBeGreaterThan(0);
    });
  });

  it("keeps the grid consistent when deleting a row crossed by a rowspan", () => {
    const editor = setup(3, 3);
    update(editor, () => {
      const t = $firstTable();
      $selectRect(t, { minRow: 0, maxRow: 1, minCol: 0, maxCol: 0 });
      $mergeSelection($getTableSelectionInfo()!);
    });
    update(editor, () => $deleteRows($firstTable(), 1, 1));
    expect(isConsistent(editor)).toBe(true);
    expect(grid(editor)).toHaveLength(2);
  });

  it("inserting beside a row crossed by a rowspan keeps the grid consistent", () => {
    const editor = setup(3, 3);
    update(editor, () => {
      $selectRect($firstTable(), { minRow: 0, maxRow: 1, minCol: 0, maxCol: 0 });
      $mergeSelection($getTableSelectionInfo()!);
    });
    update(editor, () => $insertRow($firstTable(), 1, "after"));
    expect(isConsistent(editor)).toBe(true);
    expect(grid(editor)).toHaveLength(4);
    update(editor, () => $insertRow($firstTable(), 0, "before"));
    expect(isConsistent(editor)).toBe(true);
  });
});

describe("columns", () => {
  it("inserts a column before and after", () => {
    const editor = setup(2, 3);
    update(editor, () => $insertColumn($firstTable(), 1, "before"));
    expect(grid(editor)[0]).toEqual(["r0c0", "", "r0c1", "r0c2"]);
    update(editor, () => $insertColumn($firstTable(), 3, "after"));
    expect(grid(editor)[0]).toEqual(["r0c0", "", "r0c1", "r0c2", ""]);
    expect(isConsistent(editor)).toBe(true);
  });

  it("deletes a column and a range of columns", () => {
    const editor = setup(2, 4);
    update(editor, () => $deleteColumns($firstTable(), 1, 1));
    expect(grid(editor)[0]).toEqual(["r0c0", "r0c2", "r0c3"]);
    update(editor, () => $deleteColumns($firstTable(), 0, 1));
    expect(grid(editor)[0]).toEqual(["r0c3"]);
  });

  it("removes the table when every column is deleted", () => {
    const editor = setup(2, 2);
    update(editor, () => $deleteColumns($firstTable(), 0, 1));
    read(editor, () => expect($getRoot().getChildren().some((n) => n.getType() === "table")).toBe(false));
  });

  it("keeps column widths aligned with their columns through insert and delete", () => {
    const editor = setup(2, 3);
    update(editor, () => $setColumnWidths($firstTable(), [100, 200, 300]));
    update(editor, () => $insertColumn($firstTable(), 0, "after"));
    const afterInsert = read(editor, () => $firstTable().getColWidths());
    expect(afterInsert).toHaveLength(4);
    expect(afterInsert![0]).toBe(100);
    expect(afterInsert!.slice(2)).toEqual([200, 300]);
    update(editor, () => $deleteColumns($firstTable(), 0, 0));
    const afterDelete = read(editor, () => $firstTable().getColWidths());
    expect(afterDelete).toHaveLength(3);
    expect(afterDelete!.slice(1)).toEqual([200, 300]);
  });

  it("inserts a column beside a merged cell without breaking the grid", () => {
    const editor = setup(3, 3);
    update(editor, () => {
      $selectRect($firstTable(), { minRow: 0, maxRow: 0, minCol: 0, maxCol: 1 });
      $mergeSelection($getTableSelectionInfo()!);
    });
    update(editor, () => $insertColumn($firstTable(), 1, "after"));
    expect(isConsistent(editor)).toBe(true);
    update(editor, () => $insertColumn($firstTable(), 0, "before"));
    expect(isConsistent(editor)).toBe(true);
  });
});

describe("delete table", () => {
  it("replaces the table with the neighbouring block's caret", () => {
    const editor = setup();
    update(editor, () => $deleteTable($firstTable()));
    read(editor, () => {
      expect($getRoot().getChildren().some((n) => n.getType() === "table")).toBe(false);
      expect($isRangeSelection($getSelection())).toBe(true);
    });
  });
});

describe("delete table with a multi-cell selection active", () => {
  it("removes it without tripping @lexical/table's observer", async () => {
    const editor = setup();
    update(editor, () => $selectWholeTable($firstTable()));
    const key = read(editor, () => $firstTable().getKey());
    await deleteTableSafely(editor, key);
    // The observer callback that used to throw is a microtask: let it run.
    await new Promise((r) => setTimeout(r, 0));
    read(editor, () => expect($getRoot().getChildren().some((n) => n.getType() === "table")).toBe(false));
  });
});

describe("selection info", () => {
  it("describes a caret as a single cell", () => {
    const editor = setup();
    update(editor, () => $cellAt($firstTable(), 1, 2)!.selectEnd());
    const info = read(editor, () => {
      const i = $getTableSelectionInfo()!;
      return { rect: i.rect, n: i.cells.length, range: i.isRange };
    });
    expect(info).toEqual({ rect: { minRow: 1, maxRow: 1, minCol: 2, maxCol: 2 }, n: 1, range: false });
  });

  it("describes a rectangular selection", () => {
    const editor = setup();
    update(editor, () => $selectRect($firstTable(), { minRow: 0, maxRow: 1, minCol: 1, maxCol: 2 }));
    const info = read(editor, () => {
      const i = $getTableSelectionInfo()!;
      return { rect: i.rect, n: i.cells.length, range: i.isRange, sel: $isTableSelection($getSelection()) };
    });
    expect(info).toEqual({ rect: { minRow: 0, maxRow: 1, minCol: 1, maxCol: 2 }, n: 4, range: true, sel: true });
  });

  it("selects a whole row, column and table", () => {
    const editor = setup(3, 4);
    update(editor, () => $selectRow($firstTable(), 1));
    expect(read(editor, () => $getTableSelectionInfo()!.cells.length)).toBe(4);
    update(editor, () => $selectColumn($firstTable(), 2));
    expect(read(editor, () => $getTableSelectionInfo()!.cells.length)).toBe(3);
    update(editor, () => $selectWholeTable($firstTable()));
    expect(read(editor, () => $getTableSelectionInfo()!.cells.length)).toBe(12);
  });

  it("is null outside a table", () => {
    const editor = makeEditor();
    expect(read(editor, () => $getTableSelectionInfo())).toBeNull();
  });
});

describe("header toggles", () => {
  it("toggles the header row on and off", () => {
    const editor = setup();
    expect(read(editor, () => $isHeaderRow($firstTable()))).toBe(false);
    expect(update(editor, () => $toggleHeaderRow($firstTable()))).toBe(true);
    expect(read(editor, () => $isHeaderRow($firstTable()))).toBe(true);
    expect(update(editor, () => $toggleHeaderRow($firstTable()))).toBe(false);
    expect(read(editor, () => $isHeaderRow($firstTable()))).toBe(false);
  });

  it("toggles the header column independently of the row", () => {
    const editor = setup();
    update(editor, () => $toggleHeaderRow($firstTable()));
    update(editor, () => $toggleHeaderColumn($firstTable()));
    read(editor, () => {
      const t = $firstTable();
      expect($isHeaderRow(t)).toBe(true);
      expect($isHeaderColumn(t)).toBe(true);
      // The corner is both.
      expect($cellAt(t, 0, 0)!.getHeaderStyles()).toBe(TableCellHeaderStates.BOTH);
      expect($cellAt(t, 1, 0)!.getHeaderStyles()).toBe(TableCellHeaderStates.COLUMN);
    });
    update(editor, () => $toggleHeaderRow($firstTable()));
    read(editor, () => {
      const t = $firstTable();
      expect($isHeaderRow(t)).toBe(false);
      expect($isHeaderColumn(t)).toBe(true);
      expect($cellAt(t, 0, 0)!.getHeaderStyles()).toBe(TableCellHeaderStates.COLUMN);
    });
  });
});

describe("merge and split", () => {
  it("merges a rectangle, concatenating content, and splits it back", () => {
    const editor = setup(3, 3);
    update(editor, () => $selectRect($firstTable(), { minRow: 0, maxRow: 1, minCol: 0, maxCol: 1 }));
    expect(read(editor, () => $canMerge($getTableSelectionInfo()))).toBe(true);
    update(editor, () => $mergeSelection($getTableSelectionInfo()!));
    read(editor, () => {
      const t = $firstTable();
      const merged = $cellAt(t, 0, 0)!;
      expect(merged.getColSpan()).toBe(2);
      expect(merged.getRowSpan()).toBe(2);
      expect(merged.getTextContent()).toContain("r0c0");
      expect(merged.getTextContent()).toContain("r1c1");
    });
    expect(isConsistent(editor)).toBe(true);
    update(editor, () => $cellAt($firstTable(), 0, 0)!.selectEnd());
    expect(read(editor, () => $canSplit($getTableSelectionInfo()))).toBe(true);
    expect(update(editor, () => $splitSelection($getTableSelectionInfo()!))).toBe(1);
    read(editor, () => {
      const t = $firstTable();
      expect($cellAt(t, 0, 0)!.getColSpan()).toBe(1);
      expect($cellAt(t, 1, 1)!.getRowSpan()).toBe(1);
    });
    expect(isConsistent(editor)).toBe(true);
  });

  it("refuses to merge a single cell and cannot split an unmerged one", () => {
    const editor = setup();
    update(editor, () => $cellAt($firstTable(), 0, 0)!.selectEnd());
    expect(read(editor, () => $canMerge($getTableSelectionInfo()))).toBe(false);
    expect(read(editor, () => $canSplit($getTableSelectionInfo()))).toBe(false);
    expect(update(editor, () => $mergeSelection($getTableSelectionInfo()!))).toBeNull();
    expect(update(editor, () => $splitSelection($getTableSelectionInfo()!))).toBe(0);
  });

  it("a selection that clips a merged cell grows to include all of it", () => {
    const editor = setup(3, 3);
    update(editor, () => {
      $selectRect($firstTable(), { minRow: 0, maxRow: 0, minCol: 0, maxCol: 1 });
      $mergeSelection($getTableSelectionInfo()!);
    });
    // Select column 1 only: it crosses the merged cell, so the rectangle must widen to column 0.
    update(editor, () => $selectColumn($firstTable(), 1));
    read(editor, () => {
      const info = $getTableSelectionInfo()!;
      expect(info.rect.minCol).toBe(0);
    });
  });

  it("splits several merged cells in one go", () => {
    const editor = setup(2, 4);
    update(editor, () => {
      $selectRect($firstTable(), { minRow: 0, maxRow: 0, minCol: 0, maxCol: 1 });
      $mergeSelection($getTableSelectionInfo()!);
    });
    update(editor, () => {
      $selectRect($firstTable(), { minRow: 0, maxRow: 0, minCol: 2, maxCol: 3 });
      $mergeSelection($getTableSelectionInfo()!);
    });
    update(editor, () => $selectRow($firstTable(), 0));
    expect(update(editor, () => $splitSelection($getTableSelectionInfo()!))).toBe(2);
    expect(isConsistent(editor)).toBe(true);
    expect(grid(editor)[0]).toHaveLength(4);
  });
});

describe("cell formatting", () => {
  it("sets and clears a background over a selection", () => {
    const editor = setup();
    update(editor, () => {
      $selectRect($firstTable(), { minRow: 0, maxRow: 1, minCol: 0, maxCol: 1 });
      $setCellBackground($getTableSelectionInfo()!.cells, "#ffcdd2");
    });
    read(editor, () => {
      const t = $firstTable();
      expect($cellAt(t, 0, 0)!.getBackgroundColor()).toBe("#ffcdd2");
      expect($cellAt(t, 1, 1)!.getBackgroundColor()).toBe("#ffcdd2");
      expect($cellAt(t, 2, 2)!.getBackgroundColor()).toBeNull();
    });
    update(editor, () => $setCellBackground($getTableSelectionInfo()!.cells, null));
    read(editor, () => expect($cellAt($firstTable(), 0, 0)!.getBackgroundColor()).toBeNull());
  });

  it("rejects colours that could carry extra CSS", () => {
    expect(sanitizeCellColor("#fff59d")).toBe("#fff59d");
    expect(sanitizeCellColor("rgb(1, 2, 3)")).toBe("rgb(1, 2, 3)");
    expect(sanitizeCellColor("red;background:url(x)")).toBeNull();
    expect(sanitizeCellColor("url(javascript:1)")).toBeNull();
    expect(sanitizeCellColor("transparent")).toBeNull();
    expect(sanitizeCellColor("red")).toBeNull();
    expect(sanitizeCellColor("")).toBeNull();
    expect(sanitizeCellColor(null)).toBeNull();
  });

  it("aligns the cell and the blocks inside it", () => {
    const editor = setup();
    update(editor, () => {
      $cellAt($firstTable(), 0, 0)!.selectEnd();
      $setCellAlignment($getTableSelectionInfo()!.cells, "center");
    });
    read(editor, () => {
      const cell = $cellAt($firstTable(), 0, 0)!;
      expect(cell.getFormatType()).toBe("center");
      expect((cell.getFirstChild() as { getFormatType(): string }).getFormatType()).toBe("center");
      expect($cellAt($firstTable(), 0, 1)!.getFormatType()).toBe("");
    });
  });

  it("stores vertical alignment, treating top as the unset default", () => {
    const editor = setup();
    update(editor, () => {
      $cellAt($firstTable(), 0, 0)!.selectEnd();
      $setCellVerticalAlign($getTableSelectionInfo()!.cells, "middle");
    });
    read(editor, () => expect($cellAt($firstTable(), 0, 0)!.getVerticalAlign()).toBe("middle"));
    update(editor, () => $setCellVerticalAlign($getTableSelectionInfo()!.cells, "bottom"));
    read(editor, () => expect($cellAt($firstTable(), 0, 0)!.getVerticalAlign()).toBe("bottom"));
    update(editor, () => $setCellVerticalAlign($getTableSelectionInfo()!.cells, "top"));
    read(editor, () => expect($cellAt($firstTable(), 0, 0)!.getVerticalAlign()).toBeUndefined());
    const json = JSON.stringify(editor.getEditorState().toJSON());
    expect(json).not.toContain("verticalAlign");
  });

  it("clears the contents of the selected cells but keeps the structure", () => {
    const editor = setup(2, 2);
    update(editor, () => {
      $selectRow($firstTable(), 0);
      $clearCells($getTableSelectionInfo()!.cells);
    });
    expect(grid(editor)).toEqual([["", ""], ["r1c0", "r1c1"]]);
    read(editor, () => {
      const cell = $cellAt($firstTable(), 0, 0)!;
      expect(cell.getChildrenSize()).toBe(1);
      expect($isTableCellNode(cell)).toBe(true);
    });
  });
});

describe("column widths", () => {
  it("clamps to the minimum and maximum", () => {
    expect(clampColumnWidth(5)).toBe(TABLE_MIN_COL_WIDTH);
    expect(clampColumnWidth(99999)).toBe(TABLE_MAX_COL_WIDTH);
    expect(clampColumnWidth(123.6)).toBe(124);
    expect(clampColumnWidth(NaN)).toBe(TABLE_MIN_COL_WIDTH);
  });

  it("serialises widths as whole numbers, one per column, and drops them on reset", () => {
    const editor = setup(2, 3);
    update(editor, () => $setColumnWidths($firstTable(), [100.4, 10, 5000]));
    const json = JSON.parse(JSON.stringify(editor.getEditorState().toJSON()));
    const table = json.root.children.find((n: { type: string }) => n.type === "table");
    expect(table.colWidths).toEqual([100, TABLE_MIN_COL_WIDTH, TABLE_MAX_COL_WIDTH]);
    update(editor, () => $setColumnWidths($firstTable(), null));
    const reset = JSON.parse(JSON.stringify(editor.getEditorState().toJSON()));
    expect("colWidths" in reset.root.children.find((n: { type: string }) => n.type === "table")).toBe(false);
  });

  it("setting one column seeds the others from the measured widths", () => {
    const editor = setup(2, 3);
    update(editor, () => $setColumnWidth($firstTable(), 1, 250, [90, 90, 90]));
    expect(read(editor, () => $firstTable().getColWidths())).toEqual([90, 250, 90]);
    update(editor, () => $setColumnWidth($firstTable(), 0, 10));
    expect(read(editor, () => $firstTable().getColWidths())).toEqual([TABLE_MIN_COL_WIDTH, 250, 90]);
  });

  it("ignores an out-of-range column", () => {
    const editor = setup(2, 2);
    update(editor, () => $setColumnWidth($firstTable(), 7, 100, [90, 90]));
    expect(read(editor, () => $firstTable().getColWidths())).toBeUndefined();
  });
});

describe("moving rows and columns", () => {
  it("moves a row down and up", () => {
    const editor = setup(3, 2);
    expect(update(editor, () => $moveRow($firstTable(), 0, 2))).toBe(true);
    expect(grid(editor).map((r) => r[0])).toEqual(["r1c0", "r2c0", "r0c0"]);
    expect(update(editor, () => $moveRow($firstTable(), 2, 0))).toBe(true);
    expect(grid(editor).map((r) => r[0])).toEqual(["r0c0", "r1c0", "r2c0"]);
  });

  it("moves a column and carries its width", () => {
    const editor = setup(2, 3);
    update(editor, () => $setColumnWidths($firstTable(), [100, 200, 300]));
    expect(update(editor, () => $moveColumn($firstTable(), 0, 2))).toBe(true);
    expect(grid(editor)[0]).toEqual(["r0c1", "r0c2", "r0c0"]);
    expect(read(editor, () => $firstTable().getColWidths())).toEqual([200, 300, 100]);
  });

  it("refuses out-of-range moves and tables with merged cells", () => {
    const editor = setup(3, 3);
    expect(update(editor, () => $moveRow($firstTable(), 0, 9))).toBe(false);
    expect(update(editor, () => $moveColumn($firstTable(), 1, 1))).toBe(false);
    update(editor, () => {
      $selectRect($firstTable(), { minRow: 0, maxRow: 0, minCol: 0, maxCol: 1 });
      $mergeSelection($getTableSelectionInfo()!);
    });
    expect(update(editor, () => $moveRow($firstTable(), 1, 2))).toBe(false);
    expect(update(editor, () => $moveColumn($firstTable(), 0, 2))).toBe(false);
  });
});

describe("grid helpers", () => {
  it("counts rows and columns through spans", () => {
    const editor = setup(3, 4);
    update(editor, () => {
      $selectRect($firstTable(), { minRow: 0, maxRow: 0, minCol: 0, maxCol: 3 });
      $mergeSelection($getTableSelectionInfo()!);
    });
    read(editor, () => {
      expect($rowCount($firstTable())).toBe(3);
      expect($columnCount($firstTable())).toBe(4);
      expect($cellsInRect($firstTable(), { minRow: 0, maxRow: 0, minCol: 0, maxCol: 3 })).toHaveLength(1);
    });
  });
});
