Let's explore how to validate a [sudoku](https://en.wikipedia.org/wiki/Sudoku) in an Algorand smart contract.

We'll write the smart contract code in [Algorand Python](https://github.com/algorandfoundation/puya/tree/main).

### Sudoku Basics

![A typical Sudoku puzzle, with nine rows and nine columns that intersect at square spaces. Some of the cells are filled with a number; others are blank cells to be solved.](https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Sudoku_Puzzle_by_L2G-20050714_standardized_layout.svg/2560px-Sudoku_Puzzle_by_L2G-20050714_standardized_layout.svg.png align="left")

A sudoku grid has 81 cells (9 rows and 9 columns).

A solution is valid if:

* Each row contains the numbers 1-9 with no repetition
    
* Each column contains the numbers 1-9 with no repetition
    
* Each box (3 x 3 subgrid) contains the numbers 1-9 with no repetition
    

So we can say that there are three groups of constraints: row constraints, column constraints, and box constraints.

Each cell in the grid belongs to exactly one row, one column, and one box.

### Representing a Sudoku

A sudoku grid in Python is normally represented with a nested array or matrix:

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1709082052216/a73ad42e-b3bb-4660-901f-11c65b1840dc.png align="center")

Since we're working with basic types in the AVM, we'll represent the grid as a byte array with 81 bytes (one byte per cell).

The binary representation of a cell that has the value `1` is `00000001`; the value `9` is `00001001`.

We could reduce the grid representation to 4 bits per cell, but that would make iteration and accessing a cell by index more complicated.

### Indexing

Working with a one-dimensional array makes the indexing a bit less intuitive.

To help visualise the indices:

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1709082228561/a1144e8b-5445-45b2-ba58-f5ff2a253751.png align="center")

The first part of the problem is figuring out which row, column, and box each cell belongs to.

Cell `0` belongs to row `0`, column `0` and box `0`. But how do we work this out for *any* given cell index?

To find the row number, we can floor divide by 9:

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1709082521036/30bc7b37-9d8c-42b1-b758-6632c2b4419b.png align="center")

To find the column number:

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1709082559522/b5b5b71a-ed69-4ca0-a105-67f1313d64eb.png align="center")

And to find the box number:

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1709082668924/3c38b02c-3f4e-45bd-bf62-9f38c4f07d31.png align="center")

### Representing Constraints

There are 27 constraint groups (9 rows, 9 columns, and 9 boxes).

We can represent each group with a [9-bit bitmask](https://www.youtube.com/watch?v=2SuvO4Gi7uY).

If a group contains no values (e.g. an empty row), its bitmask should be `111111111`.

If a group contains all the numbers from 1-9, its bitmask should be `000000000`.

In other words, each `1` bit in the bitmask represents an unknown value.

We will store the 9 row constraints, 9 column constraints, and 9 box constraints in three separate byte arrays.

Since each bitmask needs 9 bits, we'll use two bytes per mask:

`111111111` --&gt; `0000000111111111`

So each of these three arrays has a length of 18 bytes (144 bits).

### Updating Constraint Bitmasks

The general idea is to loop through each cell in the grid, check its value, and update the corresponding row, column, and box constraints.

If we find the number `1` in box `0`, we want to update each of its constraint bitmasks from:

`0000000111111111` --&gt; `0000000111111110`

For now let's use Python strings to represent each set of constraints:

```python-repl
>>> rows = columns = boxes = f"{511:016b}" * 9
>>> print(rows)
000000011111111100000001111111110000000111111111000000011111111100000001111111110000000111111111000000011111111100000001111111110000000111111111
```

At grid index `0` we find the number `1`:

```python-repl
>>> i = 0
>>> cell = grid[i]
>>> print(f"{cell=}")
cell=1
```

Calculating the indices:

```python-repl
>>> row = i // 9
>>> column = i % 9
>>> box = i // 27 * 3 + i % 9 // 3
>>> print(f"{row=}, {column=}, {box=}")
row=0, column=0, box=0
```

So we need to update the zeroth row, column, and box bitmasks.

Remembering that each bitmask takes up two bytes (16 bits), the index of the bit we need to clear is:

```python-repl
>>> idx = lambda i, cell: i + 1 * 16 - cell
>>> row_bit = idx(row, cell)
>>> column_bit = idx(column, cell)
>>> box_bit = idx(box, cell)
>>> print(f"{row_bit=}", f"{column_bit=}", f"{box_bit=}")
row_bit=15 column_bit=15 box_bit=15
```

To clear it from the row constraint:

```python-repl
>>> rows_before = rows
>>> rows = rows[:row_bit] + "0" + rows[row_bit + 1:]
>>> print(rows_before)
>>> print("-->")
>>> print(rows)
000000011111111100000001111111110000000111111111000000011111111100000001111111110000000111111111000000011111111100000001111111110000000111111111
-->
000000011111111000000001111111110000000111111111000000011111111100000001111111110000000111111111000000011111111100000001111111110000000111111111
```

We can see that the 16th bit has flipped:

000000011111111\*\*<mark>1</mark>\*\*...

\--&gt;

000000011111111\*\*<mark>0</mark>\*\*...

So we just need to rinse and repeat that process for the column and box constraints.

### Complexity

Since smart contracts run in a very constrained environment, we want to validate the solution using as few operations as possible.

Looping over the grid once of course means 81 iterations. Even simple operations like calculating the box indices start adding up, so let's try to reduce them by creating lookup arrays.

We will precompute the index of the last bit in the bitmask array for each subgroup:

```python
row_idx = lambda i: (i // 9 + 1) * 16
column_idx = lambda i: (i % 9 + 1) * 16
box_idx = lambda i: (i // 27 * 3 + i % 9 // 3 + 1) * 16
group_idx = lambda _: 511

to_bytes = lambda l, n: b"".join(map(lambda x: x.to_bytes(n, "big"), l)).hex()

ROW = to_bytes([row_idx(i) for i in range(81)], 1)
COLUMN = to_bytes([column_idx(i) for i in range(81)], 1)
BOX = to_bytes([box_idx(i) for i in range(81)], 1)
GROUP = to_bytes([group_idx(i) for i in range(9)], 2)
```

Then we can declare these values as constants in the smart contract:

```python
ROW = "101010101010101010202020202020202020303030303030303030404040404040404040505050505050505050606060606060606060707070707070707070808080808080808080909090909090909090"
COLUMN = "102030405060708090102030405060708090102030405060708090102030405060708090102030405060708090102030405060708090102030405060708090102030405060708090102030405060708090"
BOX = "101010202020303030101010202020303030101010202020303030404040505050606060404040505050606060404040505050606060707070808080909090707070808080909090707070808080909090"
GROUP = "01ff01ff01ff01ff01ff01ff01ff01ff01ff"
```

`GROUP` is just the starting value for each of the constraint arrays (9 lots of `0000000111111111`).

### The Final Validation

Once we've looped over each cell and updated the constraints, we should be left with three constraint arrays where all bits are set to `0`.

We can use the bitwise OR operator to combine the three:

```python
rows | columns | boxes
```

If there are any `1`s in the result, the solution isn't valid.

There are a few ways to check this but I've opted for the following in Algorand Python:

```python
op.bitlen(rows | columns | boxes) == 0
```

### The Smart Contract Code

The full source code is available on [GitHub](https://github.com/code-alexander/algoku/tree/main).

```python
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
```

The contract still goes beyond the default limit of 700 operations, so I've used the 'op up' utility to increase the budget.

### Writing Tests

```python
"""Test the Algoku contract."""

import algokit_utils
import pytest
from algokit_utils import TransactionParameters, get_localnet_default_account
from algokit_utils.config import config
from algosdk.v2client.algod import AlgodClient
from algosdk.v2client.indexer import IndexerClient

from smart_contracts.artifacts.algoku.client import AlgokuClient


@pytest.fixture(scope="session")
def app_client(algod_client: AlgodClient, indexer_client: IndexerClient) -> AlgokuClient:
    config.configure(
        debug=True,
        # trace_all=True,
    )

    client = AlgokuClient(
        algod_client,
        creator=get_localnet_default_account(algod_client),
        indexer_client=indexer_client,
    )

    client.deploy(
        on_schema_break=algokit_utils.OnSchemaBreak.AppendApp,
        on_update=algokit_utils.OnUpdate.AppendApp,
    )
    return client


@pytest.fixture(scope="session")
def txn_params(algod_client: AlgodClient) -> TransactionParameters:
    """Gets suggested parameters for a transaction.

    Args:
        algod_client (AlgodClient): The Algod client.

    Returns:
        SuggestedParams: The suggested parameters.
    """
    sp = algod_client.suggested_params()
    sp.fee = 10000
    sp.flat_fee = True
    return TransactionParameters(suggested_params=sp)


@pytest.mark.parametrize(
    "grid",
    [
        "953168742862734951417952836746893125281645397395271468138529674574386219629417583",
        "256734198891265374347198652514683729728519436963427581135942867689371245472856913",
        "964532178187694235235817964629451783573986412841273596416728359352169847798345621",
        "123675948456982371789314562964157283517238496832496157271849635395761824648523719",
        "123745689456819237789263514897452361632198745541637928315924876274586193968371452",
    ],
)
def test_valid_solution(
    app_client: AlgokuClient,
    txn_params: TransactionParameters,
    grid: str,
):
    """Test that the is_valid_solution() method returns True for a valid solution.

    The grid is passed as a string to prevent ruff formatting each element as a separate line.

    Args:
        app_client (AlgokuClient): The Algoku client.
        txn_params (TransactionParameters): The transaction parameters to use.
        grid (str): The grid to test.
    """

    grid = list(map(int, grid))
    assert app_client.is_valid_solution(grid=grid, transaction_parameters=txn_params).return_value is True


@pytest.mark.parametrize(
    "grid",
    [
        "953168742862734951417952836746893125281645397395271468138529674574386219629417582",
        "256734198891265374347198652414683729728519436963427581135942867689371245472856913",
        "964532178187594235235817964629451783573986412841273596416728359352169847798345621",
        "423675948456982371789314562964157283517238496832496157271849635395761824648523719",
        "723745689456819237789263514897452361632198745541637928315924876274586193968371452",
    ],
)
def test_invalid_solution(
    app_client: AlgokuClient,
    txn_params: TransactionParameters,
    grid: str,
):
    """Test that the is_valid_solution() method returns False for an invalid solution.

    The grid is passed as a string to prevent ruff formatting each element as a separate line.

    Args:
        app_client (AlgokuClient): The Algoku client.
        txn_params (TransactionParameters): The transaction parameters to use.
        grid (str): The grid to test.
    """

    grid = list(map(int, grid))
    assert app_client.is_valid_solution(grid=grid, transaction_parameters=txn_params).return_value is False
```
