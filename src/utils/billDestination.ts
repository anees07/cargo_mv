import type { Bill, Destination, OperationItem } from "../types";
import { replaceBillDestinationCode } from "./numbering";

function moveLineDestination(item: OperationItem, destinationId: string): OperationItem {
  return {
    ...item,
    destinationId,
  };
}

export function moveDraftBillDestination(
  bill: Bill,
  destination: Pick<Destination, "id" | "destinationCode">,
  updatedAt: string,
): Bill {
  return {
    ...bill,
    destinationId: destination.id,
    billNumber: replaceBillDestinationCode(bill.billNumber, destination.destinationCode),
    items: bill.items?.map(item => moveLineDestination(item, destination.id)),
    offloadedItems: bill.offloadedItems?.map(item => moveLineDestination(item, destination.id)),
    updatedAt,
  };
}
