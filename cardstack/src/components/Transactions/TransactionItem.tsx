import React from 'react';
import { TransactionCoinRow } from './TransactionCoinRow';
import { BridgedTokenTransaction } from './BridgedTokenTransaction';
import { MerchantCreationTransaction } from './MerchantCreationTransaction';
import { PrepaidCardCreatedTransaction } from './PrepaidCardCreatedTransaction';
import { PrepaidCardPaymentTransaction } from './PrepaidCardPaymentTransaction';
import { PrepaidCardSplitTransaction } from './PrepaidCardSplitTransaction';
import { PrepaidCardTransferTransaction } from './PrepaidCardTransferTransaction';
import { TransactionTypes } from '@cardstack/types';
interface TransactionItemProps {
  item: any;
}

export const TransactionItem = (props: TransactionItemProps) => {
  const { item } = props;

  if (!item) {
    return null;
  }

  if (item.type === TransactionTypes.BRIDGED) {
    return <BridgedTokenTransaction {...props} />;
  } else if (item.type === TransactionTypes.PREPAID_CARD_CREATED) {
    return <PrepaidCardCreatedTransaction {...props} />;
  } else if (item.type === TransactionTypes.PREPAID_CARD_PAYMENT) {
    return <PrepaidCardPaymentTransaction {...props} />;
  } else if (item.type === TransactionTypes.PREPAID_CARD_SPLIT) {
    return <PrepaidCardSplitTransaction {...props} />;
  } else if (item.type === TransactionTypes.PREPAID_CARD_TRANSFER) {
    return <PrepaidCardTransferTransaction {...props} />;
  } else if (item.type === TransactionTypes.MERCHANT_CREATION) {
    return <MerchantCreationTransaction {...props} />;
  } else if (item.type && item.type !== TransactionTypes.ERC_20) {
    return null;
  }

  return <TransactionCoinRow {...props} />;
};
