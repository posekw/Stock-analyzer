<?php
/**
 * Valuation Engine Class
 * Implements multiple valuation methodologies
 */

if (!defined('ABSPATH')) {
    exit;
}

class SVP_Valuation_Engine
{

    // Constants
    const RISK_FREE_RATE = 4.25;
    const EQUITY_RISK_PREMIUM = 5.0;
    const DEFAULT_TERMINAL_GROWTH = 2.5;
    const DEFAULT_PROJECTION_YEARS = 5;

    /**
     * Calculate WACC using CAPM
     */
    public function calculate_wacc($beta, $risk_free_rate = null, $equity_risk_premium = null)
    {
        $risk_free_rate = $risk_free_rate ?? self::RISK_FREE_RATE;
        $equity_risk_premium = $equity_risk_premium ?? self::EQUITY_RISK_PREMIUM;

        $cost_of_equity = $risk_free_rate + ($beta * $equity_risk_premium);

        // Clamp to reasonable range (6% to 18%)
        return max(6, min(18, $cost_of_equity));
    }

    /**
     * Standard DCF Calculation
     */
    public function calculate_dcf($params)
    {
        $fcf = floatval($params['freeCashFlow'] ?? 0);
        $shares = floatval($params['sharesOutstanding'] ?? 0);
        $current_price = floatval($params['currentPrice'] ?? 0);
        $beta = floatval($params['beta'] ?? 1);
        $growth_rate = floatval($params['growthRate'] ?? 10);
        $wacc = floatval($params['wacc'] ?? $this->calculate_wacc($beta));
        $terminal_growth = floatval($params['terminalGrowth'] ?? self::DEFAULT_TERMINAL_GROWTH);
        $projection_years = intval($params['projectionYears'] ?? self::DEFAULT_PROJECTION_YEARS);

        // Validate inputs
        if ($fcf <= 0 || $shares <= 0) {
            return array(
                'method' => 'DCF',
                'fairValue' => 0,
                'upside' => -100,
                'error' => 'Invalid free cash flow or shares outstanding',
            );
        }

        if ($wacc <= $terminal_growth) {
            return array(
                'method' => 'DCF',
                'fairValue' => 0,
                'upside' => -100,
                'error' => 'WACC must be greater than terminal growth rate',
            );
        }

        $fcf_per_share = $fcf / $shares;
        $wacc_rate = $wacc / 100;
        $terminal_rate = $terminal_growth / 100;
        $initial_growth_rate = $growth_rate / 100;

        // Stage 1: Project FCF with growth fade
        $projected_fcf = array();
        $current_fcf = $fcf_per_share;

        for ($year = 1; $year <= $projection_years; $year++) {
            // Linear decay from initial growth to terminal growth
            $fade_ratio = ($projection_years - $year) / $projection_years;
            $year_growth = $terminal_rate + (($initial_growth_rate - $terminal_rate) * $fade_ratio);

            $current_fcf = $current_fcf * (1 + $year_growth);
            $projected_fcf[] = $current_fcf;
        }

        // Discount Stage 1 FCFs
        $pv_of_fcfs = 0;
        for ($i = 0; $i < $projection_years; $i++) {
            $pv_of_fcfs += $projected_fcf[$i] / pow(1 + $wacc_rate, $i + 1);
        }

        // Terminal Value (Gordon Growth Model)
        $terminal_fcf = end($projected_fcf);
        $terminal_value = ($terminal_fcf * (1 + $terminal_rate)) / ($wacc_rate - $terminal_rate);
        $pv_of_terminal = $terminal_value / pow(1 + $wacc_rate, $projection_years);

        // Fair Value
        $fair_value = $pv_of_fcfs + $pv_of_terminal;

        // Calculate upside
        $upside = $current_price > 0 ? (($fair_value / $current_price) - 1) * 100 : 0;

        return array(
            'method' => 'DCF',
            'fairValue' => round($fair_value, 2),
            'upside' => round($upside, 1),
            'currentPrice' => $current_price,
            'fcfPerShare' => round($fcf_per_share, 2),
            'assumptions' => array(
                'growthRate' => $growth_rate . '%',
                'terminalGrowth' => $terminal_growth . '%',
                'wacc' => round($wacc, 1) . '%',
                'projectionYears' => $projection_years,
            ),
            'projectedFCF' => array_map(function ($v) {
                return round($v, 2); }, $projected_fcf),
            'pvOfFCFs' => round($pv_of_fcfs, 2),
            'terminalValue' => round($terminal_value, 2),
            'pvOfTerminal' => round($pv_of_terminal, 2),
        );
    }

    /**
     * Graham Number (Asset-Based Valuation)
     */
    public function calculate_graham_number($eps, $book_value_per_share, $current_price = 0)
    {
        if ($eps <= 0 || $book_value_per_share <= 0) {
            return array(
                'method' => 'Graham Number',
                'fairValue' => 0,
                'upside' => -100,
                'error' => 'Requires positive EPS and Book Value',
            );
        }

        // Graham Number = sqrt(22.5 × EPS × BVPS)
        $graham_number = sqrt(22.5 * $eps * $book_value_per_share);

        $upside = $current_price > 0 ? (($graham_number / $current_price) - 1) * 100 : 0;

        return array(
            'method' => 'Graham Number',
            'fairValue' => round($graham_number, 2),
            'upside' => round($upside, 1),
            'assumptions' => array(
                'eps' => '$' . round($eps, 2),
                'bookValuePerShare' => '$' . round($book_value_per_share, 2),
                'impliedPE' => '15x',
                'impliedPB' => '1.5x',
            ),
            'note' => 'Conservative floor for value/defensive stocks',
        );
    }

    /**
     * Peter Lynch Fair Value (PEG-Based)
     */
    public function calculate_lynch_value($eps, $growth_rate, $dividend_yield = 0, $current_price = 0)
    {
        if ($eps <= 0 || $growth_rate <= 0) {
            return array(
                'method' => 'Lynch Fair Value',
                'fairValue' => 0,
                'upside' => -100,
                'error' => 'Requires positive EPS and growth',
            );
        }

        // Lynch adjustment: Growth + Dividend Yield
        $adjusted_growth = $growth_rate + $dividend_yield;

        // Fair P/E = Growth Rate
        $fair_pe = $adjusted_growth;
        $fair_value = $eps * $fair_pe;

        // Current PEG
        $current_pe = $current_price > 0 ? $current_price / $eps : 0;
        $peg_ratio = $current_pe > 0 ? $current_pe / $growth_rate : 0;

        // Lynch Score = (Growth + Dividend) / P/E
        $lynch_score = $current_pe > 0 ? $adjusted_growth / $current_pe : 0;

        $upside = $current_price > 0 ? (($fair_value / $current_price) - 1) * 100 : 0;

        return array(
            'method' => 'Lynch Fair Value',
            'fairValue' => round($fair_value, 2),
            'upside' => round($upside, 1),
            'assumptions' => array(
                'eps' => '$' . round($eps, 2),
                'growthRate' => $growth_rate . '%',
                'dividendYield' => round($dividend_yield, 1) . '%',
                'fairPE' => round($fair_pe, 1) . 'x',
                'pegRatio' => round($peg_ratio, 2),
                'lynchScore' => round($lynch_score, 2),
            ),
            'note' => $lynch_score > 1.5 ? 'Attractive by Lynch criteria' : 'Fairly valued',
        );
    }

    /**
     * Earnings Power Value (EPV)
     */
    public function calculate_epv($normalized_earnings, $shares_outstanding, $cost_of_equity, $current_price = 0)
    {
        if ($normalized_earnings <= 0 || $shares_outstanding <= 0) {
            return array(
                'method' => 'EPV',
                'fairValue' => 0,
                'upside' => -100,
                'error' => 'Requires positive normalized earnings',
            );
        }

        // EPV = Earnings / Cost of Capital
        $epv = $normalized_earnings / ($cost_of_equity / 100);
        $epv_per_share = $epv / $shares_outstanding;

        $upside = $current_price > 0 ? (($epv_per_share / $current_price) - 1) * 100 : 0;

        return array(
            'method' => 'Earnings Power Value',
            'fairValue' => round($epv_per_share, 2),
            'upside' => round($upside, 1),
            'assumptions' => array(
                'normalizedEarnings' => '$' . number_format($normalized_earnings / 1e9, 2) . 'B',
                'costOfEquity' => round($cost_of_equity, 1) . '%',
                'impliedPE' => round(1 / ($cost_of_equity / 100), 1) . 'x',
            ),
            'note' => 'Zero-growth floor (value if company stops growing)',
        );
    }

    /**
     * Dividend Discount Model (DDM)
     */
    public function calculate_ddm($dividend_per_share, $dividend_growth_rate, $cost_of_equity, $current_price = 0)
    {
        if ($dividend_per_share <= 0) {
            return null; // DDM only for dividend payers
        }

        $g = $dividend_growth_rate / 100;
        $r = $cost_of_equity / 100;

        if ($r <= $g) {
            return array(
                'method' => 'DDM',
                'fairValue' => 0,
                'upside' => 0,
                'error' => 'Cost of equity must exceed dividend growth rate',
            );
        }

        // D1 = D0 × (1 + g)
        $d1 = $dividend_per_share * (1 + $g);

        // Fair Value = D1 / (r - g)
        $fair_value = $d1 / ($r - $g);

        $upside = $current_price > 0 ? (($fair_value / $current_price) - 1) * 100 : 0;
        $dividend_yield = $current_price > 0 ? ($dividend_per_share / $current_price) * 100 : 0;

        return array(
            'method' => 'Dividend Discount Model',
            'fairValue' => round($fair_value, 2),
            'upside' => round($upside, 1),
            'assumptions' => array(
                'currentDividend' => '$' . round($dividend_per_share, 2),
                'dividendGrowth' => round($dividend_growth_rate, 1) . '%',
                'costOfEquity' => round($cost_of_equity, 1) . '%',
                'dividendYield' => round($dividend_yield, 2) . '%',
            ),
            'note' => 'Gordon Growth Model for dividend-paying stocks',
        );
    }

    /**
     * Reverse DCF - Calculate implied growth rate
     */
    public function calculate_reverse_dcf($current_price, $fcf_per_share, $wacc, $terminal_growth = null)
    {
        $terminal_growth = $terminal_growth ?? self::DEFAULT_TERMINAL_GROWTH;

        if ($current_price <= 0 || $fcf_per_share <= 0) {
            return array(
                'method' => 'Reverse DCF',
                'impliedGrowth' => 0,
                'error' => 'Invalid price or FCF',
            );
        }

        // Binary search for implied growth
        $low = -20;
        $high = 50;
        $implied_growth = 0;

        for ($i = 0; $i < 50; $i++) {
            $mid = ($low + $high) / 2;

            // Calculate DCF at this growth rate
            $result = $this->calculate_dcf(array(
                'freeCashFlow' => $fcf_per_share,
                'sharesOutstanding' => 1,
                'currentPrice' => $current_price,
                'growthRate' => $mid,
                'wacc' => $wacc,
                'terminalGrowth' => $terminal_growth,
            ));

            $calculated_value = $result['fairValue'];

            if (abs($calculated_value - $current_price) < 0.5) {
                $implied_growth = $mid;
                break;
            }

            if ($calculated_value > $current_price) {
                $high = $mid;
            } else {
                $low = $mid;
            }

            $implied_growth = $mid;
        }

        // Interpretation
        $interpretation = 'Market expects moderate growth';
        if ($implied_growth < 0) {
            $interpretation = 'Market expects earnings decline';
        } elseif ($implied_growth < 5) {
            $interpretation = 'Market expects minimal growth';
        } elseif ($implied_growth > 25) {
            $interpretation = 'Market expects exceptional growth (risky)';
        } elseif ($implied_growth > 15) {
            $interpretation = 'Market expects high growth';
        }

        return array(
            'method' => 'Reverse DCF',
            'impliedGrowth' => round($implied_growth, 1),
            'currentPrice' => $current_price,
            'interpretation' => $interpretation,
            'assumptions' => array(
                'wacc' => round($wacc, 1) . '%',
                'terminalGrowth' => $terminal_growth . '%',
                'fcfPerShare' => '$' . round($fcf_per_share, 2),
            ),
        );
    }

    /**
     * Comprehensive valuation using multiple methods
     */
    public function calculate_comprehensive_valuation($params)
    {
        $methods = array();

        // Extract common params
        $current_price = floatval($params['currentPrice'] ?? 0);
        $beta = floatval($params['beta'] ?? 1);
        $wacc = floatval($params['wacc'] ?? $this->calculate_wacc($beta));

        // 1. DCF
        if (!empty($params['freeCashFlow']) && !empty($params['sharesOutstanding'])) {
            $dcf = $this->calculate_dcf($params);
            if (isset($dcf['fairValue']) && $dcf['fairValue'] > 0) {
                $methods[] = $dcf;
            }
        }

        // 2. Graham Number
        if (!empty($params['eps']) && !empty($params['bookValuePerShare'])) {
            $graham = $this->calculate_graham_number(
                floatval($params['eps']),
                floatval($params['bookValuePerShare']),
                $current_price
            );
            if (isset($graham['fairValue']) && $graham['fairValue'] > 0) {
                $methods[] = $graham;
            }
        }

        // 3. Lynch Fair Value
        if (!empty($params['eps']) && !empty($params['growthRate'])) {
            $lynch = $this->calculate_lynch_value(
                floatval($params['eps']),
                floatval($params['growthRate']),
                floatval($params['dividendYield'] ?? 0),
                $current_price
            );
            if (isset($lynch['fairValue']) && $lynch['fairValue'] > 0) {
                $methods[] = $lynch;
            }
        }

        // 4. EPV
        if (!empty($params['netIncome']) && !empty($params['sharesOutstanding'])) {
            $epv = $this->calculate_epv(
                floatval($params['netIncome']),
                floatval($params['sharesOutstanding']),
                $wacc,
                $current_price
            );
            if (isset($epv['fairValue']) && $epv['fairValue'] > 0) {
                $methods[] = $epv;
            }
        }

        // 5. DDM (if dividends exist)
        if (!empty($params['dividendPerShare']) && $params['dividendPerShare'] > 0) {
            $ddm = $this->calculate_ddm(
                floatval($params['dividendPerShare']),
                floatval($params['dividendGrowthRate'] ?? 5),
                $wacc,
                $current_price
            );
            if ($ddm !== null && isset($ddm['fairValue']) && $ddm['fairValue'] > 0) {
                $methods[] = $ddm;
            }
        }

        // 6. Reverse DCF
        if (!empty($params['freeCashFlow']) && !empty($params['sharesOutstanding'])) {
            $fcf_per_share = floatval($params['freeCashFlow']) / floatval($params['sharesOutstanding']);
            $reverse_dcf = $this->calculate_reverse_dcf($current_price, $fcf_per_share, $wacc);
            $methods[] = $reverse_dcf;
        }

        // Calculate synthesis
        $fair_values = array_filter(array_map(function ($m) {
            return $m['fairValue'] ?? 0;
        }, $methods), function ($v) {
            return $v > 0; });

        $average_fair_value = !empty($fair_values) ? array_sum($fair_values) / count($fair_values) : 0;

        sort($fair_values);
        $median_fair_value = !empty($fair_values)
            ? $fair_values[floor(count($fair_values) / 2)]
            : 0;

        // Conservative fair value (apply 20% margin of safety)
        $conservative_fair_value = $median_fair_value * 0.8;

        // Calculate upside
        $upside = $current_price > 0 ? (($median_fair_value / $current_price) - 1) * 100 : 0;

        // Determine verdict
        $verdict = 'HOLD';
        if ($upside >= 50)
            $verdict = 'STRONG_BUY';
        elseif ($upside >= 20)
            $verdict = 'BUY';
        elseif ($upside >= -10)
            $verdict = 'HOLD';
        elseif ($upside >= -30)
            $verdict = 'SELL';
        else
            $verdict = 'STRONG_SELL';

        return array(
            'ticker' => $params['ticker'] ?? '',
            'currentPrice' => $current_price,
            'methods' => $methods,
            'synthesis' => array(
                'averageFairValue' => round($average_fair_value, 2),
                'medianFairValue' => round($median_fair_value, 2),
                'conservativeFairValue' => round($conservative_fair_value, 2),
                'upside' => round($upside, 1),
                'verdict' => $verdict,
            ),
        );
    }

    /**
     * Calculate sensitivity table
     */
    public function calculate_sensitivity_table($base_fcf_per_share, $center_wacc = 10, $center_growth = 10, $terminal_growth = 2.5)
    {
        $results = array();

        $wacc_range = array($center_wacc - 2, $center_wacc - 1, $center_wacc, $center_wacc + 1, $center_wacc + 2);
        $growth_range = array($center_growth - 4, $center_growth - 2, $center_growth, $center_growth + 2, $center_growth + 4);

        foreach ($wacc_range as $wacc) {
            foreach ($growth_range as $growth) {
                if ($wacc > $terminal_growth && $growth >= 0) {
                    $dcf = $this->calculate_dcf(array(
                        'freeCashFlow' => $base_fcf_per_share,
                        'sharesOutstanding' => 1,
                        'currentPrice' => 0,
                        'growthRate' => $growth,
                        'wacc' => $wacc,
                        'terminalGrowth' => $terminal_growth,
                    ));

                    $results[] = array(
                        'wacc' => $wacc,
                        'growth' => $growth,
                        'fairValue' => $dcf['fairValue'],
                    );
                }
            }
        }

        return $results;
    }
}
