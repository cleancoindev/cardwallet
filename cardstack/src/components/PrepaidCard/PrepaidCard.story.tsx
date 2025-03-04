import { storiesOf } from '@storybook/react-native';
import React from 'react';
import { text, number } from '@storybook/addon-knobs';

import { PrepaidCard } from './PrepaidCard';
import { SmallPrepaidCard } from './SmallPrepaidCard';

storiesOf('Prepaid Card', module)
  .add('Default', () => {
    return (
      <PrepaidCard
        address={text('Identifier', '0xbeA3123457eF8')}
        issuer={text('Issuer', 'Cardstack')}
        issuingToken=""
        spendFaceValue={number('Spendable Balance (xDai)', 2500)}
        tokens={
          [
            {
              native: {
                balance: {
                  display: text('USD Balance', '$25'),
                },
              },
            },
          ] as any
        }
        reloadable
        type="prepaid-card"
        networkName="xDai Chain"
        nativeCurrency="USD"
        currencyConversionRates={{}}
      />
    );
  })
  .add('Small', () => {
    return (
      <SmallPrepaidCard
        id={text('Identifier', '0xbeA3123457eF8')}
        spendableBalance={number('Spendable Balance (xDai)', 2500)}
      />
    );
  });
