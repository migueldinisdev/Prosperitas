import React from 'react';
import { Card } from '../../ui/Card';
import { BarChart } from '../../components/BarChart';

const data = [
  { name: 'Housing', value: 1800 },
  { name: 'Food', value: 650 },
  { name: 'Transport', value: 200 },
  { name: 'Entertainment', value: 350 },
  { name: 'Utilities', value: 150 },
  { name: 'Shopping', value: 400 },
  { name: 'Health', value: 180 },
];

export const BalanceCategorySpendingSection: React.FC = () => {
  return (
    <Card title="Spending by Category">
      <BarChart data={data} dataKey="value" color="#8b5cf6" height={300} />
    </Card>
  );
};