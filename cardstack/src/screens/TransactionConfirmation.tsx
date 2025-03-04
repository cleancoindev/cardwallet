import React from 'react';
import { GasSpeedButton } from '../../../src/components/gas';
import { useTransactionConfirmation } from '@cardstack/hooks';
import { Container, TransactionConfirmationSheet } from '@cardstack/components';

const TransactionConfirmation = () => {
  const {
    data,
    loading,
    isMessageRequest,
    dappUrl,
    message,
    onCancel,
    onConfirm,
    methodName,
    messageRequest,
  } = useTransactionConfirmation();

  return (
    <Container flex={1} width="100%">
      <TransactionConfirmationSheet
        data={data}
        dappUrl={dappUrl}
        message={message}
        onCancel={onCancel}
        onConfirm={onConfirm}
        methodName={methodName}
        loading={loading}
        messageRequest={messageRequest}
      />
      <Container height={150}>
        {!isMessageRequest && (
          <Container>
            <GasSpeedButton type="transaction" />
          </Container>
        )}
      </Container>
    </Container>
  );
};

export default TransactionConfirmation;
