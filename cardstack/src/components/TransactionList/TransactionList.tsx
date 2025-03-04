import React from 'react';
import { RefreshControl, SectionList } from 'react-native';

import { TransactionItem } from '../Transactions/TransactionItem';
import { TransactionListLoading } from './TransactionListLoading';
import { useTransactions } from '@cardstack/services';
import { colors } from '@cardstack/theme';
import {
  CenteredContainer,
  Container,
  ScrollView,
  Text,
} from '@cardstack/components';

interface TransactionListProps {
  Header: JSX.Element;
  accountAddress: string;
}

export const TransactionList = ({ Header }: TransactionListProps) => {
  const {
    isLoadingTransactions,
    sections,
    refetch,
    refetchLoading,
  } = useTransactions();

  if (isLoadingTransactions) {
    return (
      <ScrollView
        backgroundColor="backgroundBlue"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {Header}
        <TransactionListLoading />
      </ScrollView>
    );
  }

  return (
    <SectionList
      ListEmptyComponent={<ListEmptyComponent />}
      ListHeaderComponent={Header}
      contentContainerStyle={{ paddingBottom: 40 }}
      renderItem={props => <TransactionItem {...props} />}
      sections={sections}
      renderSectionHeader={({ section: { title } }) => (
        <Container
          paddingVertical={2}
          paddingHorizontal={5}
          width="100%"
          backgroundColor="backgroundBlue"
        >
          <Text size="medium" color="white">
            {title}
          </Text>
        </Container>
      )}
      refreshControl={
        <RefreshControl
          tintColor="white"
          refreshing={refetchLoading}
          onRefresh={refetch}
        />
      }
      style={{ backgroundColor: colors.backgroundBlue }}
    />
  );
};

const ListEmptyComponent = () => (
  <CenteredContainer width="100%" height={100} flex={1}>
    <Text color="grayText" textAlign="center">
      No transactions
    </Text>
  </CenteredContainer>
);
