"""Domain errors raised by services."""

from __future__ import annotations


class DomainError(Exception):
    """Base class for business-rule violations."""


class NotFoundError(DomainError):
    pass


class CapacityExceededError(DomainError):
    """Raised when issuing would exceed authorized shares."""


class InsufficientSharesError(DomainError):
    """Raised when a holder does not have enough shares to transfer/cancel."""
