from puyapy import (
    ARC4Contract,
    Bytes,
    OpUpFeeSource,
    arc4,
    ensure_budget,
    op,
    uenumerate,
)

ROW = "101010101010101010202020202020202020303030303030303030404040404040404040505050505050505050606060606060606060707070707070707070808080808080808080909090909090909090"  # noqa: E501
COLUMN = "102030405060708090102030405060708090102030405060708090102030405060708090102030405060708090102030405060708090102030405060708090102030405060708090102030405060708090"  # noqa: E501
BOX = "101010202020303030101010202020303030101010202020303030404040505050606060404040505050606060404040505050606060707070808080909090707070808080909090707070808080909090"  # noqa: E501
GROUP = "01ff01ff01ff01ff01ff01ff01ff01ff01ff"


class Algoku(ARC4Contract):
    """A smart contract for validating sudoku solutions."""

    @arc4.abimethod()
    def is_valid_solution(self, grid: Bytes) -> bool:
        """Checks whether the grid is a valid sudoku solution.

        Args:
            grid (Bytes): The sudoku grid as an 81-byte array.

        Returns:
            bool: True if the grid is a valid sudoku solution, else False.
        """
        ensure_budget(5000, fee_source=OpUpFeeSource.GroupCredit)
        assert grid.length == 81, "Grid must be 81 bytes long."
        rows = columns = boxes = Bytes.from_hex(GROUP)
        for i, byte in uenumerate(grid):
            cell = op.btoi(byte)
            rows = op.setbit_bytes(rows, op.btoi(Bytes.from_hex(ROW)[i]) - cell, 0)
            columns = op.setbit_bytes(columns, op.btoi(Bytes.from_hex(COLUMN)[i]) - cell, 0)
            boxes = op.setbit_bytes(boxes, op.btoi(Bytes.from_hex(BOX)[i]) - cell, 0)
        return op.bitlen(rows | columns | boxes) == 0
