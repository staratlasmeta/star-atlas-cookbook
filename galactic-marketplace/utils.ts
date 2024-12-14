import { Order } from "@staratlas/galactic-marketplace";

// TODO: Should this be re-exported in galactic-marketplace it's defined in `utils.ts` but not exported again
export const getOrderSide = (orderAccount: Order) => {
    if (
      JSON.stringify(orderAccount.data.orderSide) === JSON.stringify({ buy: {} })
    ) {
      return 'BuySide';
    }

    return 'SellSide';
};
