import React from 'react';
import { Card } from '../../ui/Card';
import { BarChart } from '../../components/BarChart';

const data = [
  { name: 'Housing', value: 1800 },
  { name: 'Food', value: 650 },
  { name: 'Transp', value: 200 },
  { name: 'Ent', value: 350 },
  { name: 'Utils', value: 150 },
];

export const BalanceCategorySpendingSection: React.FC = () => {
  return (
    <Card title="Spending by Category">
      <BarChart data={data} dataKey="value" color="#8b5cf6" height={250} />
    </Card>
  );
};