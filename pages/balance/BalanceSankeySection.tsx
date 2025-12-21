import React from 'react';
import { Card } from '../../ui/Card';
import { SankeyChart } from '../../components/SankeyChart';

const sankeyData = {
  income: 4200,
  expenses: [
    { category: 'Housing', value: 1800 },
    { category: 'Food & Drink', value: 650 },
    { category: 'Transport', value: 200 },
    { category: 'Entertainment', value: 350 },
    { category: 'Utilities', value: 150 },
    { category: 'Shopping', value: 300 },
  ],
  savings: 1750,
};

export const BalanceSankeySection: React.FC = () => {
  return (
    <Card title="Cash Flow Analysis">
      <SankeyChart data={sankeyData} height={400} />
    </Card>
  );
};
