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
