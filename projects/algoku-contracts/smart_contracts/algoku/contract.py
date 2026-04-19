import typing

from algopy import (
    ARC4Contract,
    Asset,
    Bytes,
    FixedBytes,
    Global,
    OpUpFeeSource,
    Txn,
    UInt64,
    arc4,
    ensure_budget,
    gtxn,
    itxn,
    op,
    uenumerate,
)

ROW = "101010101010101010202020202020202020303030303030303030404040404040404040505050505050505050606060606060606060707070707070707070808080808080808080909090909090909090"  # noqa: E501
COLUMN = "102030405060708090102030405060708090102030405060708090102030405060708090102030405060708090102030405060708090102030405060708090102030405060708090102030405060708090"  # noqa: E501
BOX = "101010202020303030101010202020303030101010202020303030404040505050606060404040505050606060404040505050606060707070808080909090707070808080909090707070808080909090"  # noqa: E501
GROUP = "01ff01ff01ff01ff01ff01ff01ff01ff01ff"


class Algoku(ARC4Contract):
    """A smart contract for validating sudoku solutions and minting NFTs."""

    @arc4.abimethod()
    def is_valid_solution(
        self,
        puzzle: FixedBytes[typing.Literal[11]],
        solution: FixedBytes[typing.Literal[81]],
    ) -> bool:
        """Checks whether the solution is valid and the puzzle mask has a plausible clue count.

        Args:
            puzzle: 81-bit bitmask (11 bytes, big-endian bit order) marking which cells were given as clues.
            solution: The sudoku solution as 81 bytes, each cell holding a value in 1-9.

        Returns:
            True if the solution is a valid sudoku and 17 <= popcount(puzzle) <= 40, else False.
        """
        ensure_budget(5000, fee_source=OpUpFeeSource.GroupCredit)
        rows = columns = boxes = Bytes.from_hex(GROUP)
        clues = UInt64(0)
        for i, byte in uenumerate(solution):
            cell = op.btoi(byte)
            clues += op.getbit(puzzle, i)
            rows = op.setbit_bytes(rows, op.btoi(Bytes.from_hex(ROW)[i]) - cell, False)
            columns = op.setbit_bytes(columns, op.btoi(Bytes.from_hex(COLUMN)[i]) - cell, False)
            boxes = op.setbit_bytes(boxes, op.btoi(Bytes.from_hex(BOX)[i]) - cell, False)
        return op.bitlen(rows | columns | boxes) == 0 and clues >= UInt64(17) and clues <= UInt64(40)

    @arc4.abimethod()
    def mint(
        self,
        puzzle: FixedBytes[typing.Literal[11]],
        solution: FixedBytes[typing.Literal[81]],
        mbr_payment: gtxn.PaymentTransaction,
    ) -> UInt64:
        """Mints an NFT for a valid, unique sudoku solution.

        Each unique solution can only be minted once — uniqueness is enforced by
        a box keyed on sha256(solution). The minted NFT encodes (solution || mask)
        in its URL field and records the solver address in its reserve field;
        claim() later transfers to the address stored there.

        Args:
            puzzle: 81-bit bitmask marking which cells were given as clues.
            solution: The sudoku solution as 81 bytes, each cell holding 1-9.
            mbr_payment: Payment covering the box + ASA MBR (~0.1185 ALGO).

        Returns:
            The created ASA's asset ID.
        """
        ensure_budget(10_000, fee_source=OpUpFeeSource.GroupCredit)

        assert mbr_payment.receiver == Global.current_application_address, "mbr payment must be addressed to the app"

        assert self.is_valid_solution(puzzle, solution), "invalid solution"

        key = op.sha256(solution.bytes)
        _existing, already_minted = op.Box.get(key)
        assert not already_minted, "puzzle already solved"

        nft = (
            itxn.AssetConfig(
                total=1,
                decimals=0,
                asset_name=b"Algoku",
                unit_name=b"ALGOKU",
                url=solution.bytes + puzzle.bytes,
                reserve=Txn.sender,
                manager=Global.zero_address,
                freeze=Global.zero_address,
                clawback=Global.zero_address,
                fee=0,
            )
            .submit()
            .created_asset
        )

        op.Box.put(key, op.itob(nft.id))

        return nft.id

    @arc4.abimethod()
    def claim(self, asset: Asset) -> None:
        """Transfers a minted NFT to the address recorded in its reserve field.

        The reserve field is set at mint time to the solver's address, so this
        method is self-authorizing — it always sends the asset to its intended
        recipient regardless of who calls it. Caller must ensure the recipient
        has already opted in to the asset.
        """
        itxn.AssetTransfer(
            xfer_asset=asset,
            asset_receiver=asset.reserve,
            asset_amount=1,
            fee=0,
        ).submit()
