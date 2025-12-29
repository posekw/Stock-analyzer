"use client";

import React from 'react';
import { useValuationStore } from '@/stores/valuationStore';
import { ChevronDown, ChevronUp } from 'lucide-react';

const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num.toLocaleString();
};

export default function RawFinancials() {
    const { financials, companyName } = useValuationStore();
    const [isOpen, setIsOpen] = React.useState(false);

    if (!financials || !financials.income || financials.income.length === 0) {
        return null;
    }

    const years = financials.income.map(i => i.date.substring(0, 4));

    return (
        <div className="w-full max-w-4xl mx-auto mt-8 p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-xl">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between text-lg font-semibold text-gray-100 hover:text-blue-400 transition-colors"
            >
                <span>Deep Dive: {companyName || 'Stock'} Historical Data ({years.length} Years)</span>
                {isOpen ? <ChevronUp /> : <ChevronDown />}
            </button>

            {isOpen && (
                <div className="mt-6 space-y-8 overflow-x-auto">
                    {/* Income Statement */}
                    <div>
                        <h3 className="text-md font-bold text-blue-300 mb-3">Income Statement</h3>
                        <table className="w-full text-sm text-left table-fixed">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="py-2 text-gray-400 w-1/3">Metric</th>
                                    {years.map(year => <th key={year} className="py-2 text-right text-gray-300 w-1/6">{year}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                <tr>
                                    <td className="py-2">Revenue</td>
                                    {financials.income.map((item, i) => <td key={i} className="py-2 text-right font-mono">{formatNumber(item.revenue)}</td>)}
                                </tr>
                                <tr>
                                    <td className="py-2">Cost of Revenue</td>
                                    {financials.income.map((item, i) => <td key={i} className="py-2 text-right font-mono">{formatNumber(item.costOfRevenue)}</td>)}
                                </tr>
                                <tr className="font-semibold bg-white/5">
                                    <td className="py-2 pl-2">Gross Profit</td>
                                    {financials.income.map((item, i) => <td key={i} className="py-2 text-right font-mono text-green-400">{formatNumber(item.grossProfit)}</td>)}
                                </tr>
                                <tr>
                                    <td className="py-2">Net Income</td>
                                    {financials.income.map((item, i) => <td key={i} className="py-2 text-right font-mono">{formatNumber(item.netIncome)}</td>)}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Balance Sheet */}
                    <div>
                        <h3 className="text-md font-bold text-purple-300 mb-3">Balance Sheet Highlights</h3>
                        <table className="w-full text-sm text-left table-fixed">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="py-2 text-gray-400 w-1/3">Metric</th>
                                    {years.map(year => <th key={year} className="py-2 text-right text-gray-300 w-1/6">{year}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                <tr>
                                    <td className="py-2">Cash & Equivalents</td>
                                    {financials.balance.map((item, i) => <td key={i} className="py-2 text-right font-mono">{formatNumber(item.cashAndCashEquivalents)}</td>)}
                                </tr>
                                <tr>
                                    <td className="py-2">Total Assets</td>
                                    {financials.balance.map((item, i) => <td key={i} className="py-2 text-right font-mono">{formatNumber(item.totalAssets)}</td>)}
                                </tr>
                                <tr>
                                    <td className="py-2">Total Debt</td>
                                    {financials.balance.map((item, i) => <td key={i} className="py-2 text-right font-mono text-red-300">{formatNumber(item.totalDebt)}</td>)}
                                </tr>
                                <tr className="font-semibold bg-white/5">
                                    <td className="py-2 pl-2">Stockholders Equity</td>
                                    {financials.balance.map((item, i) => <td key={i} className="py-2 text-right font-mono">{formatNumber(item.totalStockholdersEquity)}</td>)}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Cash Flow */}
                    <div>
                        <h3 className="text-md font-bold text-emerald-300 mb-3">Cash Flow Statement</h3>
                        <table className="w-full text-sm text-left table-fixed">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="py-2 text-gray-400 w-1/3">Metric</th>
                                    {years.map(year => <th key={year} className="py-2 text-right text-gray-300 w-1/6">{year}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                <tr>
                                    <td className="py-2">Operating Cash Flow</td>
                                    {financials.cashflow.map((item, i) => <td key={i} className="py-2 text-right font-mono">{formatNumber(item.operatingCashFlow)}</td>)}
                                </tr>
                                <tr>
                                    <td className="py-2">CapEx</td>
                                    {financials.cashflow.map((item, i) => <td key={i} className="py-2 text-right font-mono text-red-300">{formatNumber(item.capitalExpenditure)}</td>)}
                                </tr>
                                <tr className="font-semibold bg-white/5">
                                    <td className="py-2 pl-2">Free Cash Flow</td>
                                    {financials.cashflow.map((item, i) => <td key={i} className="py-2 text-right font-mono text-emerald-400">{formatNumber(item.freeCashFlow)}</td>)}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-4 text-center">Data Source: Yahoo Finance Fundamentals Time Series</p>
                </div>
            )}
        </div>
    );
}
