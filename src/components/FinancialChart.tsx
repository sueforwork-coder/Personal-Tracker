import React from 'react';
import { FinancialTable } from './FinancialTable';
import { IncomeLog } from '../types';

interface FinancialChartProps {
  incomeLogs: IncomeLog[];
}

export const FinancialChart: React.FC<FinancialChartProps> = ({ incomeLogs }) => {
  return <FinancialTable incomeLogs={incomeLogs} />;
};

export default FinancialChart;
