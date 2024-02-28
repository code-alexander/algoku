# flake8: noqa
# fmt: off
# mypy: disable-error-code="no-any-return, no-untyped-call"
# This file was automatically generated by algokit-client-generator.
# DO NOT MODIFY IT BY HAND.
# requires: algokit-utils@^1.2.0
import base64
import dataclasses
import decimal
import typing
from abc import ABC, abstractmethod

import algokit_utils
import algosdk
from algosdk.v2client import models
from algosdk.atomic_transaction_composer import (
    AtomicTransactionComposer,
    AtomicTransactionResponse,
    SimulateAtomicTransactionResponse,
    TransactionSigner,
    TransactionWithSigner
)

_APP_SPEC_JSON = r"""{
    "hints": {
        "is_valid_solution(byte[])bool": {
            "call_config": {
                "no_op": "CALL"
            }
        }
    },
    "source": {
        "approval": "I3ByYWdtYSB2ZXJzaW9uIDEwCgpzbWFydF9jb250cmFjdHMuYWxnb2t1LmNvbnRyYWN0LkFsZ29rdS5hcHByb3ZhbF9wcm9ncmFtOgogICAgLy8gc21hcnRfY29udHJhY3RzL2FsZ29rdS9jb250cmFjdC5weToxNwogICAgLy8gY2xhc3MgQWxnb2t1KEFSQzRDb250cmFjdCk6CiAgICB0eG4gTnVtQXBwQXJncwogICAgYnogbWFpbl9iYXJlX3JvdXRpbmdANQogICAgbWV0aG9kICJpc192YWxpZF9zb2x1dGlvbihieXRlW10pYm9vbCIKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDAKICAgIG1hdGNoIG1haW5faXNfdmFsaWRfc29sdXRpb25fcm91dGVAMgogICAgZXJyIC8vIHJlamVjdCB0cmFuc2FjdGlvbgoKbWFpbl9pc192YWxpZF9zb2x1dGlvbl9yb3V0ZUAyOgogICAgLy8gc21hcnRfY29udHJhY3RzL2FsZ29rdS9jb250cmFjdC5weToxOAogICAgLy8gQGFyYzQuYWJpbWV0aG9kKCkKICAgIHR4biBPbkNvbXBsZXRpb24KICAgICEKICAgIGFzc2VydCAvLyBPbkNvbXBsZXRpb24gaXMgTm9PcAogICAgdHhuIEFwcGxpY2F0aW9uSUQKICAgIGFzc2VydCAvLyBpcyBub3QgY3JlYXRpbmcKICAgIC8vIHNtYXJ0X2NvbnRyYWN0cy9hbGdva3UvY29udHJhY3QucHk6MTcKICAgIC8vIGNsYXNzIEFsZ29rdShBUkM0Q29udHJhY3QpOgogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMQogICAgZXh0cmFjdCAyIDAKICAgIC8vIHNtYXJ0X2NvbnRyYWN0cy9hbGdva3UvY29udHJhY3QucHk6MTgKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCgpCiAgICBjYWxsc3ViIGlzX3ZhbGlkX3NvbHV0aW9uCiAgICBieXRlIDB4MDAKICAgIGludCAwCiAgICB1bmNvdmVyIDIKICAgIHNldGJpdAogICAgYnl0ZSAweDE1MWY3Yzc1CiAgICBzd2FwCiAgICBjb25jYXQKICAgIGxvZwogICAgaW50IDEKICAgIHJldHVybgoKbWFpbl9iYXJlX3JvdXRpbmdANToKICAgIC8vIHNtYXJ0X2NvbnRyYWN0cy9hbGdva3UvY29udHJhY3QucHk6MTcKICAgIC8vIGNsYXNzIEFsZ29rdShBUkM0Q29udHJhY3QpOgogICAgdHhuIE9uQ29tcGxldGlvbgogICAgIQogICAgYXNzZXJ0IC8vIHJlamVjdCB0cmFuc2FjdGlvbgogICAgdHhuIEFwcGxpY2F0aW9uSUQKICAgICEKICAgIGFzc2VydCAvLyBpcyBjcmVhdGluZwogICAgaW50IDEKICAgIHJldHVybgoKCi8vIHNtYXJ0X2NvbnRyYWN0cy5hbGdva3UuY29udHJhY3QuQWxnb2t1LmlzX3ZhbGlkX3NvbHV0aW9uKGdyaWQ6IGJ5dGVzKSAtPiB1aW50NjQ6CmlzX3ZhbGlkX3NvbHV0aW9uOgogICAgLy8gc21hcnRfY29udHJhY3RzL2FsZ29rdS9jb250cmFjdC5weToxOC0xOQogICAgLy8gQGFyYzQuYWJpbWV0aG9kKCkKICAgIC8vIGRlZiBpc192YWxpZF9zb2x1dGlvbihzZWxmLCBncmlkOiBCeXRlcykgLT4gYm9vbDoKICAgIHByb3RvIDEgMQogICAgLy8gc21hcnRfY29udHJhY3RzL2FsZ29rdS9jb250cmFjdC5weToyOAogICAgLy8gZW5zdXJlX2J1ZGdldCg1MDAwLCBmZWVfc291cmNlPU9wVXBGZWVTb3VyY2UuR3JvdXBDcmVkaXQpCiAgICBpbnQgNTAwMAogICAgaW50IDAKICAgIGNhbGxzdWIgZW5zdXJlX2J1ZGdldAogICAgLy8gc21hcnRfY29udHJhY3RzL2FsZ29rdS9jb250cmFjdC5weToyOQogICAgLy8gYXNzZXJ0IGdyaWQubGVuZ3RoID09IDgxLCAiR3JpZCBtdXN0IGJlIDgxIGJ5dGVzIGxvbmcuIgogICAgZnJhbWVfZGlnIC0xCiAgICBsZW4KICAgIGR1cAogICAgaW50IDgxCiAgICA9PQogICAgYXNzZXJ0IC8vIEdyaWQgbXVzdCBiZSA4MSBieXRlcyBsb25nLgogICAgLy8gc21hcnRfY29udHJhY3RzL2FsZ29rdS9jb250cmFjdC5weTozMAogICAgLy8gcm93cyA9IGNvbHVtbnMgPSBib3hlcyA9IEJ5dGVzLmZyb21faGV4KEdST1VQKQogICAgYnl0ZSAweDAxZmYwMWZmMDFmZjAxZmYwMWZmMDFmZjAxZmYwMWZmMDFmZgogICAgZHVwbiAyCiAgICBpbnQgMAoKaXNfdmFsaWRfc29sdXRpb25fZm9yX2hlYWRlckAxOgogICAgLy8gc21hcnRfY29udHJhY3RzL2FsZ29rdS9jb250cmFjdC5weTozMQogICAgLy8gZm9yIGksIGJ5dGUgaW4gdWVudW1lcmF0ZShncmlkKToKICAgIGZyYW1lX2RpZyA0CiAgICBmcmFtZV9kaWcgMAogICAgPAogICAgYnogaXNfdmFsaWRfc29sdXRpb25fYWZ0ZXJfZm9yQDQKICAgIGZyYW1lX2RpZyAtMQogICAgZnJhbWVfZGlnIDQKICAgIGR1cAogICAgY292ZXIgMgogICAgaW50IDEKICAgIGV4dHJhY3QzCiAgICAvLyBzbWFydF9jb250cmFjdHMvYWxnb2t1L2NvbnRyYWN0LnB5OjMyCiAgICAvLyBjZWxsID0gb3AuYnRvaShieXRlKQogICAgYnRvaQogICAgc3dhcAogICAgLy8gc21hcnRfY29udHJhY3RzL2FsZ29rdS9jb250cmFjdC5weTozMwogICAgLy8gcm93cyA9IG9wLnNldGJpdF9ieXRlcyhyb3dzLCBvcC5idG9pKEJ5dGVzLmZyb21faGV4KFJPVylbaV0pIC0gY2VsbCwgMCkKICAgIGR1cAogICAgaW50IDEKICAgICsKICAgIGJ5dGUgMHgxMDEwMTAxMDEwMTAxMDEwMTAyMDIwMjAyMDIwMjAyMDIwMjAzMDMwMzAzMDMwMzAzMDMwMzA0MDQwNDA0MDQwNDA0MDQwNDA1MDUwNTA1MDUwNTA1MDUwNTA2MDYwNjA2MDYwNjA2MDYwNjA3MDcwNzA3MDcwNzA3MDcwNzA4MDgwODA4MDgwODA4MDgwODA5MDkwOTA5MDkwOTA5MDkwOTAKICAgIGRpZyAyCiAgICBkaWcgMgogICAgc3Vic3RyaW5nMwogICAgYnRvaQogICAgZGlnIDMKICAgIC0KICAgIGZyYW1lX2RpZyAzCiAgICBzd2FwCiAgICBpbnQgMAogICAgc2V0Yml0CiAgICBmcmFtZV9idXJ5IDMKICAgIC8vIHNtYXJ0X2NvbnRyYWN0cy9hbGdva3UvY29udHJhY3QucHk6MzUKICAgIC8vIGNvbHVtbnMsIG9wLmJ0b2koQnl0ZXMuZnJvbV9oZXgoQ09MVU1OKVtpXSkgLSBjZWxsLCAwCiAgICBieXRlIDB4MTAyMDMwNDA1MDYwNzA4MDkwMTAyMDMwNDA1MDYwNzA4MDkwMTAyMDMwNDA1MDYwNzA4MDkwMTAyMDMwNDA1MDYwNzA4MDkwMTAyMDMwNDA1MDYwNzA4MDkwMTAyMDMwNDA1MDYwNzA4MDkwMTAyMDMwNDA1MDYwNzA4MDkwMTAyMDMwNDA1MDYwNzA4MDkwMTAyMDMwNDA1MDYwNzA4MDkwCiAgICBkaWcgMgogICAgZGlnIDIKICAgIHN1YnN0cmluZzMKICAgIGJ0b2kKICAgIGRpZyAzCiAgICAtCiAgICAvLyBzbWFydF9jb250cmFjdHMvYWxnb2t1L2NvbnRyYWN0LnB5OjM0LTM2CiAgICAvLyBjb2x1bW5zID0gb3Auc2V0Yml0X2J5dGVzKAogICAgLy8gICAgIGNvbHVtbnMsIG9wLmJ0b2koQnl0ZXMuZnJvbV9oZXgoQ09MVU1OKVtpXSkgLSBjZWxsLCAwCiAgICAvLyApCiAgICBmcmFtZV9kaWcgMgogICAgc3dhcAogICAgLy8gc21hcnRfY29udHJhY3RzL2FsZ29rdS9jb250cmFjdC5weTozNQogICAgLy8gY29sdW1ucywgb3AuYnRvaShCeXRlcy5mcm9tX2hleChDT0xVTU4pW2ldKSAtIGNlbGwsIDAKICAgIGludCAwCiAgICAvLyBzbWFydF9jb250cmFjdHMvYWxnb2t1L2NvbnRyYWN0LnB5OjM0LTM2CiAgICAvLyBjb2x1bW5zID0gb3Auc2V0Yml0X2J5dGVzKAogICAgLy8gICAgIGNvbHVtbnMsIG9wLmJ0b2koQnl0ZXMuZnJvbV9oZXgoQ09MVU1OKVtpXSkgLSBjZWxsLCAwCiAgICAvLyApCiAgICBzZXRiaXQKICAgIGZyYW1lX2J1cnkgMgogICAgLy8gc21hcnRfY29udHJhY3RzL2FsZ29rdS9jb250cmFjdC5weTozNwogICAgLy8gYm94ZXMgPSBvcC5zZXRiaXRfYnl0ZXMoYm94ZXMsIG9wLmJ0b2koQnl0ZXMuZnJvbV9oZXgoQk9YKVtpXSkgLSBjZWxsLCAwKQogICAgYnl0ZSAweDEwMTAxMDIwMjAyMDMwMzAzMDEwMTAxMDIwMjAyMDMwMzAzMDEwMTAxMDIwMjAyMDMwMzAzMDQwNDA0MDUwNTA1MDYwNjA2MDQwNDA0MDUwNTA1MDYwNjA2MDQwNDA0MDUwNTA1MDYwNjA2MDcwNzA3MDgwODA4MDkwOTA5MDcwNzA3MDgwODA4MDkwOTA5MDcwNzA3MDgwODA4MDkwOTA5MAogICAgdW5jb3ZlciAyCiAgICBkaWcgMgogICAgc3Vic3RyaW5nMwogICAgYnRvaQogICAgdW5jb3ZlciAyCiAgICAtCiAgICBmcmFtZV9kaWcgMQogICAgc3dhcAogICAgaW50IDAKICAgIHNldGJpdAogICAgZnJhbWVfYnVyeSAxCiAgICBmcmFtZV9idXJ5IDQKICAgIGIgaXNfdmFsaWRfc29sdXRpb25fZm9yX2hlYWRlckAxCgppc192YWxpZF9zb2x1dGlvbl9hZnRlcl9mb3JANDoKICAgIC8vIHNtYXJ0X2NvbnRyYWN0cy9hbGdva3UvY29udHJhY3QucHk6MzgKICAgIC8vIHJldHVybiBvcC5iaXRsZW4ocm93cyB8IGNvbHVtbnMgfCBib3hlcykgPT0gMAogICAgZnJhbWVfZGlnIDMKICAgIGZyYW1lX2RpZyAyCiAgICBifAogICAgZnJhbWVfZGlnIDEKICAgIGJ8CiAgICBiaXRsZW4KICAgICEKICAgIGZyYW1lX2J1cnkgMAogICAgcmV0c3ViCgoKLy8gcHV5YXB5LmVuc3VyZV9idWRnZXQocmVxdWlyZWRfYnVkZ2V0OiB1aW50NjQsIGZlZV9zb3VyY2U6IHVpbnQ2NCkgLT4gdm9pZDoKZW5zdXJlX2J1ZGdldDoKICAgIC8vIDxwdXlhPi9wdXlhcHkucHk6MTEtMTcKICAgIHByb3RvIDIgMAogICAgLy8gPHB1eWE+L3B1eWFweS5weToxOAogICAgZnJhbWVfZGlnIC0yCiAgICBpbnQgMTAKICAgICsKCmVuc3VyZV9idWRnZXRfd2hpbGVfdG9wQDE6CiAgICAvLyA8cHV5YT4vcHV5YXB5LnB5OjE5CiAgICBmcmFtZV9kaWcgMAogICAgZ2xvYmFsIE9wY29kZUJ1ZGdldAogICAgPgogICAgYnogZW5zdXJlX2J1ZGdldF9hZnRlcl93aGlsZUA3CiAgICAvLyA8cHV5YT4vcHV5YXB5LnB5OjIwCiAgICBpdHhuX2JlZ2luCiAgICAvLyA8cHV5YT4vcHV5YXB5LnB5OjIxCiAgICBpbnQgYXBwbAogICAgaXR4bl9maWVsZCBUeXBlRW51bQogICAgLy8gPHB1eWE+L3B1eWFweS5weToyMgogICAgaW50IERlbGV0ZUFwcGxpY2F0aW9uCiAgICBpdHhuX2ZpZWxkIE9uQ29tcGxldGlvbgogICAgLy8gPHB1eWE+L3B1eWFweS5weToyMwogICAgYnl0ZSAweDA2ODEwMQogICAgaXR4bl9maWVsZCBBcHByb3ZhbFByb2dyYW0KICAgIC8vIDxwdXlhPi9wdXlhcHkucHk6MjQKICAgIGJ5dGUgMHgwNjgxMDEKICAgIGl0eG5fZmllbGQgQ2xlYXJTdGF0ZVByb2dyYW0KICAgIC8vIDxwdXlhPi9wdXlhcHkucHk6MjUtMjkKICAgIGZyYW1lX2RpZyAtMQogICAgc3dpdGNoIGVuc3VyZV9idWRnZXRfc3dpdGNoX2Nhc2VfMEAzIGVuc3VyZV9idWRnZXRfc3dpdGNoX2Nhc2VfMUA0CiAgICBiIGVuc3VyZV9idWRnZXRfc3dpdGNoX2Nhc2VfbmV4dEA2CgplbnN1cmVfYnVkZ2V0X3N3aXRjaF9jYXNlXzBAMzoKICAgIC8vIDxwdXlhPi9wdXlhcHkucHk6MjcKICAgIGludCAwCiAgICBpdHhuX2ZpZWxkIEZlZQogICAgYiBlbnN1cmVfYnVkZ2V0X3N3aXRjaF9jYXNlX25leHRANgoKZW5zdXJlX2J1ZGdldF9zd2l0Y2hfY2FzZV8xQDQ6CiAgICAvLyA8cHV5YT4vcHV5YXB5LnB5OjI5CiAgICBnbG9iYWwgTWluVHhuRmVlCiAgICBpdHhuX2ZpZWxkIEZlZQoKZW5zdXJlX2J1ZGdldF9zd2l0Y2hfY2FzZV9uZXh0QDY6CiAgICAvLyA8cHV5YT4vcHV5YXB5LnB5OjMwCiAgICBpdHhuX3N1Ym1pdAogICAgYiBlbnN1cmVfYnVkZ2V0X3doaWxlX3RvcEAxCgplbnN1cmVfYnVkZ2V0X2FmdGVyX3doaWxlQDc6CiAgICByZXRzdWIK",
        "clear": "I3ByYWdtYSB2ZXJzaW9uIDEwCgpzbWFydF9jb250cmFjdHMuYWxnb2t1LmNvbnRyYWN0LkFsZ29rdS5jbGVhcl9zdGF0ZV9wcm9ncmFtOgogICAgLy8gc21hcnRfY29udHJhY3RzL2FsZ29rdS9jb250cmFjdC5weToxNwogICAgLy8gY2xhc3MgQWxnb2t1KEFSQzRDb250cmFjdCk6CiAgICBpbnQgMQogICAgcmV0dXJuCg=="
    },
    "state": {
        "global": {
            "num_byte_slices": 0,
            "num_uints": 0
        },
        "local": {
            "num_byte_slices": 0,
            "num_uints": 0
        }
    },
    "schema": {
        "global": {
            "declared": {},
            "reserved": {}
        },
        "local": {
            "declared": {},
            "reserved": {}
        }
    },
    "contract": {
        "name": "Algoku",
        "methods": [
            {
                "name": "is_valid_solution",
                "args": [
                    {
                        "type": "byte[]",
                        "name": "grid",
                        "desc": "The sudoku grid as an 81-byte array."
                    }
                ],
                "returns": {
                    "type": "bool",
                    "desc": "True if the grid is a valid sudoku solution, else False."
                },
                "desc": "Checks whether the grid is a valid sudoku solution."
            }
        ],
        "networks": {}
    },
    "bare_call_config": {
        "no_op": "CREATE"
    }
}"""
APP_SPEC = algokit_utils.ApplicationSpecification.from_json(_APP_SPEC_JSON)
_TReturn = typing.TypeVar("_TReturn")


class _ArgsBase(ABC, typing.Generic[_TReturn]):
    @staticmethod
    @abstractmethod
    def method() -> str:
        ...


_TArgs = typing.TypeVar("_TArgs", bound=_ArgsBase[typing.Any])


@dataclasses.dataclass(kw_only=True)
class _TArgsHolder(typing.Generic[_TArgs]):
    args: _TArgs


def _filter_none(value: dict | typing.Any) -> dict | typing.Any:
    if isinstance(value, dict):
        return {k: _filter_none(v) for k, v in value.items() if v is not None}
    return value


def _as_dict(data: typing.Any, *, convert_all: bool = True) -> dict[str, typing.Any]:
    if data is None:
        return {}
    if not dataclasses.is_dataclass(data):
        raise TypeError(f"{data} must be a dataclass")
    if convert_all:
        result = dataclasses.asdict(data)
    else:
        result = {f.name: getattr(data, f.name) for f in dataclasses.fields(data)}
    return _filter_none(result)


def _convert_transaction_parameters(
    transaction_parameters: algokit_utils.TransactionParameters | None,
) -> algokit_utils.TransactionParametersDict:
    return typing.cast(algokit_utils.TransactionParametersDict, _as_dict(transaction_parameters))


def _convert_call_transaction_parameters(
    transaction_parameters: algokit_utils.TransactionParameters | None,
) -> algokit_utils.OnCompleteCallParametersDict:
    return typing.cast(algokit_utils.OnCompleteCallParametersDict, _as_dict(transaction_parameters))


def _convert_create_transaction_parameters(
    transaction_parameters: algokit_utils.TransactionParameters | None,
    on_complete: algokit_utils.OnCompleteActionName,
) -> algokit_utils.CreateCallParametersDict:
    result = typing.cast(algokit_utils.CreateCallParametersDict, _as_dict(transaction_parameters))
    on_complete_enum = on_complete.replace("_", " ").title().replace(" ", "") + "OC"
    result["on_complete"] = getattr(algosdk.transaction.OnComplete, on_complete_enum)
    return result


def _convert_deploy_args(
    deploy_args: algokit_utils.DeployCallArgs | None,
) -> algokit_utils.ABICreateCallArgsDict | None:
    if deploy_args is None:
        return None

    deploy_args_dict = typing.cast(algokit_utils.ABICreateCallArgsDict, _as_dict(deploy_args))
    if isinstance(deploy_args, _TArgsHolder):
        deploy_args_dict["args"] = _as_dict(deploy_args.args)
        deploy_args_dict["method"] = deploy_args.args.method()

    return deploy_args_dict


@dataclasses.dataclass(kw_only=True)
class IsValidSolutionArgs(_ArgsBase[bool]):
    """Checks whether the grid is a valid sudoku solution."""

    grid: bytes | bytearray
    """The sudoku grid as an 81-byte array."""

    @staticmethod
    def method() -> str:
        return "is_valid_solution(byte[])bool"


@dataclasses.dataclass(kw_only=True)
class SimulateOptions:
    allow_more_logs: bool = dataclasses.field(default=False)
    allow_empty_signatures: bool = dataclasses.field(default=False)
    extra_opcode_budget: int = dataclasses.field(default=0)
    exec_trace_config: models.SimulateTraceConfig | None         = dataclasses.field(default=None)


class Composer:

    def __init__(self, app_client: algokit_utils.ApplicationClient, atc: AtomicTransactionComposer):
        self.app_client = app_client
        self.atc = atc

    def build(self) -> AtomicTransactionComposer:
        return self.atc

    def simulate(self, options: SimulateOptions | None = None) -> SimulateAtomicTransactionResponse:
        request = models.SimulateRequest(
            allow_more_logs=options.allow_more_logs,
            allow_empty_signatures=options.allow_empty_signatures,
            extra_opcode_budget=options.extra_opcode_budget,
            exec_trace_config=options.exec_trace_config,
            txn_groups=[]
        ) if options else None
        result = self.atc.simulate(self.app_client.algod_client, request)
        return result

    def execute(self) -> AtomicTransactionResponse:
        return self.app_client.execute_atc(self.atc)

    def is_valid_solution(
        self,
        *,
        grid: bytes | bytearray,
        transaction_parameters: algokit_utils.TransactionParameters | None = None,
    ) -> "Composer":
        """Checks whether the grid is a valid sudoku solution.
        
        Adds a call to `is_valid_solution(byte[])bool` ABI method
        
        :param bytes | bytearray grid: The sudoku grid as an 81-byte array.
        :param algokit_utils.TransactionParameters transaction_parameters: (optional) Additional transaction parameters
        :returns Composer: This Composer instance"""

        args = IsValidSolutionArgs(
            grid=grid,
        )
        self.app_client.compose_call(
            self.atc,
            call_abi_method=args.method(),
            transaction_parameters=_convert_call_transaction_parameters(transaction_parameters),
            **_as_dict(args, convert_all=True),
        )
        return self

    def create_bare(
        self,
        *,
        on_complete: typing.Literal["no_op"] = "no_op",
        transaction_parameters: algokit_utils.CreateTransactionParameters | None = None,
    ) -> "Composer":
        """Adds a call to create an application using the no_op bare method
        
        :param typing.Literal[no_op] on_complete: On completion type to use
        :param algokit_utils.CreateTransactionParameters transaction_parameters: (optional) Additional transaction parameters
        :returns Composer: This Composer instance"""

        self.app_client.compose_create(
            self.atc,
            call_abi_method=False,
            transaction_parameters=_convert_create_transaction_parameters(transaction_parameters, on_complete),
        )
        return self

    def clear_state(
        self,
        transaction_parameters: algokit_utils.TransactionParameters | None = None,
        app_args: list[bytes] | None = None,
    ) -> "Composer":
        """Adds a call to the application with on completion set to ClearState
    
        :param algokit_utils.TransactionParameters transaction_parameters: (optional) Additional transaction parameters
        :param list[bytes] | None app_args: (optional) Application args to pass"""
    
        self.app_client.compose_clear_state(self.atc, _convert_transaction_parameters(transaction_parameters), app_args)
        return self


class AlgokuClient:
    """A class for interacting with the Algoku app providing high productivity and
    strongly typed methods to deploy and call the app"""

    @typing.overload
    def __init__(
        self,
        algod_client: algosdk.v2client.algod.AlgodClient,
        *,
        app_id: int = 0,
        signer: TransactionSigner | algokit_utils.Account | None = None,
        sender: str | None = None,
        suggested_params: algosdk.transaction.SuggestedParams | None = None,
        template_values: algokit_utils.TemplateValueMapping | None = None,
        app_name: str | None = None,
    ) -> None:
        ...

    @typing.overload
    def __init__(
        self,
        algod_client: algosdk.v2client.algod.AlgodClient,
        *,
        creator: str | algokit_utils.Account,
        indexer_client: algosdk.v2client.indexer.IndexerClient | None = None,
        existing_deployments: algokit_utils.AppLookup | None = None,
        signer: TransactionSigner | algokit_utils.Account | None = None,
        sender: str | None = None,
        suggested_params: algosdk.transaction.SuggestedParams | None = None,
        template_values: algokit_utils.TemplateValueMapping | None = None,
        app_name: str | None = None,
    ) -> None:
        ...

    def __init__(
        self,
        algod_client: algosdk.v2client.algod.AlgodClient,
        *,
        creator: str | algokit_utils.Account | None = None,
        indexer_client: algosdk.v2client.indexer.IndexerClient | None = None,
        existing_deployments: algokit_utils.AppLookup | None = None,
        app_id: int = 0,
        signer: TransactionSigner | algokit_utils.Account | None = None,
        sender: str | None = None,
        suggested_params: algosdk.transaction.SuggestedParams | None = None,
        template_values: algokit_utils.TemplateValueMapping | None = None,
        app_name: str | None = None,
    ) -> None:
        """
        AlgokuClient can be created with an app_id to interact with an existing application, alternatively
        it can be created with a creator and indexer_client specified to find existing applications by name and creator.
        
        :param AlgodClient algod_client: AlgoSDK algod client
        :param int app_id: The app_id of an existing application, to instead find the application by creator and name
        use the creator and indexer_client parameters
        :param str | Account creator: The address or Account of the app creator to resolve the app_id
        :param IndexerClient indexer_client: AlgoSDK indexer client, only required if deploying or finding app_id by
        creator and app name
        :param AppLookup existing_deployments:
        :param TransactionSigner | Account signer: Account or signer to use to sign transactions, if not specified and
        creator was passed as an Account will use that.
        :param str sender: Address to use as the sender for all transactions, will use the address associated with the
        signer if not specified.
        :param TemplateValueMapping template_values: Values to use for TMPL_* template variables, dictionary keys should
        *NOT* include the TMPL_ prefix
        :param str | None app_name: Name of application to use when deploying, defaults to name defined on the
        Application Specification
            """

        self.app_spec = APP_SPEC
        
        # calling full __init__ signature, so ignoring mypy warning about overloads
        self.app_client = algokit_utils.ApplicationClient(  # type: ignore[call-overload, misc]
            algod_client=algod_client,
            app_spec=self.app_spec,
            app_id=app_id,
            creator=creator,
            indexer_client=indexer_client,
            existing_deployments=existing_deployments,
            signer=signer,
            sender=sender,
            suggested_params=suggested_params,
            template_values=template_values,
            app_name=app_name,
        )

    @property
    def algod_client(self) -> algosdk.v2client.algod.AlgodClient:
        return self.app_client.algod_client

    @property
    def app_id(self) -> int:
        return self.app_client.app_id

    @app_id.setter
    def app_id(self, value: int) -> None:
        self.app_client.app_id = value

    @property
    def app_address(self) -> str:
        return self.app_client.app_address

    @property
    def sender(self) -> str | None:
        return self.app_client.sender

    @sender.setter
    def sender(self, value: str) -> None:
        self.app_client.sender = value

    @property
    def signer(self) -> TransactionSigner | None:
        return self.app_client.signer

    @signer.setter
    def signer(self, value: TransactionSigner) -> None:
        self.app_client.signer = value

    @property
    def suggested_params(self) -> algosdk.transaction.SuggestedParams | None:
        return self.app_client.suggested_params

    @suggested_params.setter
    def suggested_params(self, value: algosdk.transaction.SuggestedParams | None) -> None:
        self.app_client.suggested_params = value

    def is_valid_solution(
        self,
        *,
        grid: bytes | bytearray,
        transaction_parameters: algokit_utils.TransactionParameters | None = None,
    ) -> algokit_utils.ABITransactionResponse[bool]:
        """Checks whether the grid is a valid sudoku solution.
        
        Calls `is_valid_solution(byte[])bool` ABI method
        
        :param bytes | bytearray grid: The sudoku grid as an 81-byte array.
        :param algokit_utils.TransactionParameters transaction_parameters: (optional) Additional transaction parameters
        :returns algokit_utils.ABITransactionResponse[bool]: True if the grid is a valid sudoku solution, else False."""

        args = IsValidSolutionArgs(
            grid=grid,
        )
        result = self.app_client.call(
            call_abi_method=args.method(),
            transaction_parameters=_convert_call_transaction_parameters(transaction_parameters),
            **_as_dict(args, convert_all=True),
        )
        return result

    def create_bare(
        self,
        *,
        on_complete: typing.Literal["no_op"] = "no_op",
        transaction_parameters: algokit_utils.CreateTransactionParameters | None = None,
    ) -> algokit_utils.TransactionResponse:
        """Creates an application using the no_op bare method
        
        :param typing.Literal[no_op] on_complete: On completion type to use
        :param algokit_utils.CreateTransactionParameters transaction_parameters: (optional) Additional transaction parameters
        :returns algokit_utils.TransactionResponse: The result of the transaction"""

        result = self.app_client.create(
            call_abi_method=False,
            transaction_parameters=_convert_create_transaction_parameters(transaction_parameters, on_complete),
        )
        return result

    def clear_state(
        self,
        transaction_parameters: algokit_utils.TransactionParameters | None = None,
        app_args: list[bytes] | None = None,
    ) -> algokit_utils.TransactionResponse:
        """Calls the application with on completion set to ClearState
    
        :param algokit_utils.TransactionParameters transaction_parameters: (optional) Additional transaction parameters
        :param list[bytes] | None app_args: (optional) Application args to pass
        :returns algokit_utils.TransactionResponse: The result of the transaction"""
    
        return self.app_client.clear_state(_convert_transaction_parameters(transaction_parameters), app_args)

    def deploy(
        self,
        version: str | None = None,
        *,
        signer: TransactionSigner | None = None,
        sender: str | None = None,
        allow_update: bool | None = None,
        allow_delete: bool | None = None,
        on_update: algokit_utils.OnUpdate = algokit_utils.OnUpdate.Fail,
        on_schema_break: algokit_utils.OnSchemaBreak = algokit_utils.OnSchemaBreak.Fail,
        template_values: algokit_utils.TemplateValueMapping | None = None,
        create_args: algokit_utils.DeployCallArgs | None = None,
        update_args: algokit_utils.DeployCallArgs | None = None,
        delete_args: algokit_utils.DeployCallArgs | None = None,
    ) -> algokit_utils.DeployResponse:
        """Deploy an application and update client to reference it.
        
        Idempotently deploy (create, update/delete if changed) an app against the given name via the given creator
        account, including deploy-time template placeholder substitutions.
        To understand the architecture decisions behind this functionality please see
        <https://github.com/algorandfoundation/algokit-cli/blob/main/docs/architecture-decisions/2023-01-12_smart-contract-deployment.md>
        
        ```{note}
        If there is a breaking state schema change to an existing app (and `on_schema_break` is set to
        'ReplaceApp' the existing app will be deleted and re-created.
        ```
        
        ```{note}
        If there is an update (different TEAL code) to an existing app (and `on_update` is set to 'ReplaceApp')
        the existing app will be deleted and re-created.
        ```
        
        :param str version: version to use when creating or updating app, if None version will be auto incremented
        :param algosdk.atomic_transaction_composer.TransactionSigner signer: signer to use when deploying app
        , if None uses self.signer
        :param str sender: sender address to use when deploying app, if None uses self.sender
        :param bool allow_delete: Used to set the `TMPL_DELETABLE` template variable to conditionally control if an app
        can be deleted
        :param bool allow_update: Used to set the `TMPL_UPDATABLE` template variable to conditionally control if an app
        can be updated
        :param OnUpdate on_update: Determines what action to take if an application update is required
        :param OnSchemaBreak on_schema_break: Determines what action to take if an application schema requirements
        has increased beyond the current allocation
        :param dict[str, int|str|bytes] template_values: Values to use for `TMPL_*` template variables, dictionary keys
        should *NOT* include the TMPL_ prefix
        :param algokit_utils.DeployCallArgs | None create_args: Arguments used when creating an application
        :param algokit_utils.DeployCallArgs | None update_args: Arguments used when updating an application
        :param algokit_utils.DeployCallArgs | None delete_args: Arguments used when deleting an application
        :return DeployResponse: details action taken and relevant transactions
        :raises DeploymentError: If the deployment failed"""

        return self.app_client.deploy(
            version,
            signer=signer,
            sender=sender,
            allow_update=allow_update,
            allow_delete=allow_delete,
            on_update=on_update,
            on_schema_break=on_schema_break,
            template_values=template_values,
            create_args=_convert_deploy_args(create_args),
            update_args=_convert_deploy_args(update_args),
            delete_args=_convert_deploy_args(delete_args),
        )

    def compose(self, atc: AtomicTransactionComposer | None = None) -> Composer:
        return Composer(self.app_client, atc or AtomicTransactionComposer())