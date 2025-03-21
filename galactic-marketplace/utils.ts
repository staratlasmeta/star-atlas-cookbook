import { Order } from "@staratlas/galactic-marketplace";

// This is re-exported of the function found in galactic-marketplace it's defined in `utils.ts` but not exported again
export const getOrderSide = (orderAccount: Order) => {
    if (
        JSON.stringify(orderAccount.data.orderSide) ===
        JSON.stringify({ buy: {} })
    ) {
        return "BuySide";
    }

    return "SellSide";
};
