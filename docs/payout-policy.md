# Payout Policy

Tokolink keeps merchant balance from ledger entries, not from mutable balance fields.

## Fee

- Platform fee is 1.5% of product subtotal.
- Shipping cost is excluded from platform fee.
- Fee is snapshotted on each order and recorded as a ledger entry.

## Balance availability

- Paid order ledger entries become available after H+2 from payment time.
- Canceled, refunded, or disputed orders are excluded from available balance.
- Requested or processing withdrawals reduce available balance to prevent double withdrawal.

## Withdrawal

- Minimum withdrawal amount is Rp50.000.
- Merchants can request withdrawal from dashboard.
- Withdrawal statuses: requested, processing, paid, rejected.
- MVP payout processing is manual outside Tokolink system.
- Merchants receive email when withdrawal is requested and when status changes.
