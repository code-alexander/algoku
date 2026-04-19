import os

import algokit_utils
import pytest
from algokit_utils import (
    AlgoAmount,
    AlgorandClient,
    AssetOptInParams,
    CommonAppCallParams,
    PaymentParams,
    SigningAccount,
)

from smart_contracts.artifacts.algoku.algoku_client import (
    AlgokuClient,
    AlgokuFactory,
)

MINT_MBR_MICROALGO = 118_500

VALID_SOLUTIONS = [
    "953168742862734951417952836746893125281645397395271468138529674574386219629417583",
    "256734198891265374347198652514683729728519436963427581135942867689371245472856913",
    "964532178187694235235817964629451783573986412841273596416728359352169847798345621",
    "123675948456982371789314562964157283517238496832496157271849635395761824648523719",
    "123745689456819237789263514897452361632198745541637928315924876274586193968371452",
]

INVALID_SOLUTIONS = [
    "953168742862734951417952836746893125281645397395271468138529674574386219629417582",
    "256734198891265374347198652414683729728519436963427581135942867689371245472856913",
    "964532178187594235235817964629451783573986412841273596416728359352169847798345621",
    "423675948456982371789314562964157283517238496832496157271849635395761824648523719",
    "723745689456819237789263514897452361632198745541637928315924876274586193968371452",
]


def _solution_bytes(s: str) -> bytes:
    return bytes(int(c) for c in s)


def _mask_with_clues(n: int) -> bytes:
    """11-byte mask with the first n bits set (big-endian bit order, matching AVM getbit)."""
    assert 0 <= n <= 81
    mask = bytearray(11)
    for i in range(n):
        mask[i // 8] |= 0x80 >> (i % 8)
    return bytes(mask)


@pytest.fixture()
def deployer(algorand_client: AlgorandClient) -> SigningAccount:
    account = algorand_client.account.from_environment("DEPLOYER")
    algorand_client.account.ensure_funded_from_environment(
        account_to_fund=account.address,
        min_spending_balance=AlgoAmount.from_algo(10),
    )
    return account


@pytest.fixture()
def algoku_client(
    algorand_client: AlgorandClient, deployer: SigningAccount
) -> AlgokuClient:
    factory = algorand_client.client.get_typed_app_factory(
        AlgokuFactory, default_sender=deployer.address
    )
    result = factory.send.create.bare(
        params=algokit_utils.CommonAppCallCreateParams(note=os.urandom(8)),
    )
    client = result[0]
    algorand_client.send.payment(
        PaymentParams(
            sender=deployer.address,
            receiver=client.app_address,
            amount=AlgoAmount.from_micro_algo(100_000),
            note=os.urandom(8),
        )
    )
    return client


def _call_params() -> CommonAppCallParams:
    # ensure_budget(5000, OpUpFeeSource.GroupCredit) spawns inner app-creation
    # txns that need their fees paid from the outer group credit.
    return CommonAppCallParams(extra_fee=AlgoAmount.from_micro_algo(10_000))


@pytest.mark.parametrize("solution_str", VALID_SOLUTIONS)
def test_valid_solution(algoku_client: AlgokuClient, solution_str: str) -> None:
    result = algoku_client.send.is_valid_solution(
        args=(_mask_with_clues(30), _solution_bytes(solution_str)),
        params=_call_params(),
    )
    assert result.abi_return is True


@pytest.mark.parametrize("solution_str", INVALID_SOLUTIONS)
def test_invalid_solution(algoku_client: AlgokuClient, solution_str: str) -> None:
    result = algoku_client.send.is_valid_solution(
        args=(_mask_with_clues(30), _solution_bytes(solution_str)),
        params=_call_params(),
    )
    assert result.abi_return is False


def test_minimum_clues_accepted(algoku_client: AlgokuClient) -> None:
    result = algoku_client.send.is_valid_solution(
        args=(_mask_with_clues(17), _solution_bytes(VALID_SOLUTIONS[0])),
        params=_call_params(),
    )
    assert result.abi_return is True


def test_maximum_clues_accepted(algoku_client: AlgokuClient) -> None:
    result = algoku_client.send.is_valid_solution(
        args=(_mask_with_clues(40), _solution_bytes(VALID_SOLUTIONS[0])),
        params=_call_params(),
    )
    assert result.abi_return is True


def test_too_few_clues_rejected(algoku_client: AlgokuClient) -> None:
    result = algoku_client.send.is_valid_solution(
        args=(_mask_with_clues(16), _solution_bytes(VALID_SOLUTIONS[0])),
        params=_call_params(),
    )
    assert result.abi_return is False


def test_too_many_clues_rejected(algoku_client: AlgokuClient) -> None:
    result = algoku_client.send.is_valid_solution(
        args=(_mask_with_clues(41), _solution_bytes(VALID_SOLUTIONS[0])),
        params=_call_params(),
    )
    assert result.abi_return is False


def _mbr_payment(
    algorand_client: AlgorandClient,
    deployer: SigningAccount,
    algoku_client: AlgokuClient,
    amount_micro: int = MINT_MBR_MICROALGO,
) -> object:
    return algorand_client.create_transaction.payment(
        PaymentParams(
            sender=deployer.address,
            receiver=algoku_client.app_address,
            amount=AlgoAmount.from_micro_algo(amount_micro),
        )
    )


def _mint_call_params() -> CommonAppCallParams:
    return CommonAppCallParams(extra_fee=AlgoAmount.from_micro_algo(20_000))


@pytest.mark.parametrize("solution_str", VALID_SOLUTIONS)
def test_mint_happy_path(
    algoku_client: AlgokuClient,
    algorand_client: AlgorandClient,
    deployer: SigningAccount,
    solution_str: str,
) -> None:
    result = algoku_client.send.mint(
        args=(
            _mask_with_clues(30),
            _solution_bytes(solution_str),
            _mbr_payment(algorand_client, deployer, algoku_client),
        ),
        params=_mint_call_params(),
    )
    assert isinstance(result.abi_return, int)
    assert result.abi_return > 0


def test_mint_rejects_duplicate_solution(
    algoku_client: AlgokuClient,
    algorand_client: AlgorandClient,
    deployer: SigningAccount,
) -> None:
    solution = _solution_bytes(VALID_SOLUTIONS[1])
    mask = _mask_with_clues(30)

    first = algoku_client.send.mint(
        args=(mask, solution, _mbr_payment(algorand_client, deployer, algoku_client)),
        params=_mint_call_params(),
    )
    assert first.abi_return is not None and first.abi_return > 0

    with pytest.raises(Exception):
        algoku_client.send.mint(
            args=(mask, solution, _mbr_payment(algorand_client, deployer, algoku_client)),
            params=_mint_call_params(),
        )


def test_mint_rejects_insufficient_mbr(
    algoku_client: AlgokuClient,
    algorand_client: AlgorandClient,
    deployer: SigningAccount,
) -> None:
    with pytest.raises(Exception):
        algoku_client.send.mint(
            args=(
                _mask_with_clues(30),
                _solution_bytes(VALID_SOLUTIONS[2]),
                _mbr_payment(algorand_client, deployer, algoku_client, amount_micro=MINT_MBR_MICROALGO - 1),
            ),
            params=_mint_call_params(),
        )


def test_mint_rejects_invalid_solution(
    algoku_client: AlgokuClient,
    algorand_client: AlgorandClient,
    deployer: SigningAccount,
) -> None:
    with pytest.raises(Exception):
        algoku_client.send.mint(
            args=(
                _mask_with_clues(30),
                _solution_bytes(INVALID_SOLUTIONS[0]),
                _mbr_payment(algorand_client, deployer, algoku_client),
            ),
            params=_mint_call_params(),
        )


def test_claim_transfers_nft_to_solver(
    algoku_client: AlgokuClient,
    algorand_client: AlgorandClient,
    deployer: SigningAccount,
) -> None:
    mint_result = algoku_client.send.mint(
        args=(
            _mask_with_clues(30),
            _solution_bytes(VALID_SOLUTIONS[3]),
            _mbr_payment(algorand_client, deployer, algoku_client),
        ),
        params=_mint_call_params(),
    )
    asset_id = mint_result.abi_return
    assert asset_id is not None and asset_id > 0

    algorand_client.send.asset_opt_in(
        AssetOptInParams(sender=deployer.address, asset_id=asset_id)
    )

    algoku_client.send.claim(
        args=(asset_id,),
        params=CommonAppCallParams(extra_fee=AlgoAmount.from_micro_algo(2_000)),
    )

    asset_info = algorand_client.client.algod.account_asset_info(deployer.address, asset_id)
    assert asset_info["asset-holding"]["amount"] == 1
