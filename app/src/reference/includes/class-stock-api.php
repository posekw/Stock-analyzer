<?php
/**
 * Stock API Class
 * Handles all external API calls for stock data
 */

if (!defined('ABSPATH')) {
    exit;
}

class SVP_Stock_API
{
    private $api_key;

    public function __construct($api_key = '')
    {
        $this->api_key = $api_key;
    }

    /**
     * Make HTTP request with proper headers
     */
    private function make_request($url)
    {
        $response = wp_remote_get($url, array(
            'timeout' => 30,
            'sslverify' => false,  // Sometimes needed for local development
            'headers' => array(
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language' => 'en-US,en;q=0.5',
                'Accept-Encoding' => 'gzip, deflate',
                'Connection' => 'keep-alive',
                'Upgrade-Insecure-Requests' => '1',
            ),
        ));

        if (is_wp_error($response)) {
            error_log('SVP Stock API Error: ' . $response->get_error_message());
            return $response;
        }

        $status_code = wp_remote_retrieve_response_code($response);
        if ($status_code !== 200) {
            error_log('SVP Stock API HTTP Error: ' . $status_code);
            return new WP_Error('http_error', 'HTTP Error: ' . $status_code);
        }

        return wp_remote_retrieve_body($response);
    }

    /**
     * Get stock quote data
     */
    public function get_stock_data($ticker)
    {
        $ticker = strtoupper(sanitize_text_field($ticker));

        // Try Yahoo Finance API
        $quote_url = "https://query1.finance.yahoo.com/v8/finance/chart/{$ticker}?interval=1d&range=5d";

        $body = $this->make_request($quote_url);

        if (is_wp_error($body)) {
            // Return demo data if API fails
            return $this->get_demo_stock_data($ticker);
        }

        $data = json_decode($body, true);

        if (!isset($data['chart']['result'][0])) {
            // Return demo data if parsing fails
            return $this->get_demo_stock_data($ticker);
        }

        $result = $data['chart']['result'][0];
        $meta = $result['meta'];
        $indicators = $result['indicators']['quote'][0] ?? array();

        // Get fundamental data
        $fundamentals = $this->get_fundamentals($ticker);

        return array(
            'ticker' => $ticker,
            'currentPrice' => $meta['regularMarketPrice'] ?? 0,
            'previousClose' => $meta['previousClose'] ?? 0,
            'open' => isset($indicators['open']) && !empty($indicators['open']) ? $indicators['open'][count($indicators['open']) - 1] : 0,
            'high' => isset($indicators['high']) && !empty($indicators['high']) ? $indicators['high'][count($indicators['high']) - 1] : 0,
            'low' => isset($indicators['low']) && !empty($indicators['low']) ? $indicators['low'][count($indicators['low']) - 1] : 0,
            'volume' => isset($indicators['volume']) && !empty($indicators['volume']) ? $indicators['volume'][count($indicators['volume']) - 1] : 0,
            'currency' => $meta['currency'] ?? 'USD',
            'exchange' => $meta['exchangeName'] ?? '',
            'instrumentType' => $meta['instrumentType'] ?? 'EQUITY',
            'change' => ($meta['regularMarketPrice'] ?? 0) - ($meta['previousClose'] ?? 0),
            'changePercent' => $meta['previousClose'] ? ((($meta['regularMarketPrice'] ?? 0) - $meta['previousClose']) / $meta['previousClose']) * 100 : 0,
            'fundamentals' => $fundamentals,
            'source' => 'live',
        );
    }

    /**
     * Get demo stock data when API fails
     */
    private function get_demo_stock_data($ticker)
    {
        // Demo data based on common tickers
        $demo_stocks = array(
            'AAPL' => array('price' => 195.50, 'change' => 2.35, 'marketCap' => 3000000000000, 'pe' => 32, 'fcf' => 110000000000, 'shares' => 15500000000, 'beta' => 1.28),
            'MSFT' => array('price' => 378.50, 'change' => 1.85, 'marketCap' => 2800000000000, 'pe' => 35, 'fcf' => 60000000000, 'shares' => 7400000000, 'beta' => 0.89),
            'GOOGL' => array('price' => 140.25, 'change' => -0.75, 'marketCap' => 1750000000000, 'pe' => 25, 'fcf' => 55000000000, 'shares' => 12500000000, 'beta' => 1.05),
            'AMZN' => array('price' => 155.80, 'change' => 1.20, 'marketCap' => 1600000000000, 'pe' => 60, 'fcf' => 25000000000, 'shares' => 10300000000, 'beta' => 1.15),
            'TSLA' => array('price' => 252.40, 'change' => -3.60, 'marketCap' => 800000000000, 'pe' => 75, 'fcf' => 4500000000, 'shares' => 3170000000, 'beta' => 2.05),
            'NVDA' => array('price' => 490.50, 'change' => 8.25, 'marketCap' => 1200000000000, 'pe' => 65, 'fcf' => 8000000000, 'shares' => 2450000000, 'beta' => 1.68),
            'META' => array('price' => 355.20, 'change' => 2.80, 'marketCap' => 900000000000, 'pe' => 28, 'fcf' => 35000000000, 'shares' => 2550000000, 'beta' => 1.22),
        );

        // Get demo data or generate random
        if (isset($demo_stocks[$ticker])) {
            $demo = $demo_stocks[$ticker];
        } else {
            // Generate random demo data for unknown tickers
            $demo = array(
                'price' => rand(50, 500) + (rand(0, 99) / 100),
                'change' => (rand(-500, 500) / 100),
                'marketCap' => rand(10, 500) * 1000000000,
                'pe' => rand(10, 50),
                'fcf' => rand(1, 50) * 1000000000,
                'shares' => rand(500, 5000) * 1000000,
                'beta' => rand(50, 200) / 100,
            );
        }

        $price = $demo['price'];
        $change = $demo['change'];
        $prevClose = $price - $change;

        return array(
            'ticker' => $ticker,
            'currentPrice' => $price,
            'previousClose' => $prevClose,
            'open' => $prevClose + (rand(-100, 100) / 100),
            'high' => $price + rand(1, 5),
            'low' => $price - rand(1, 5),
            'volume' => rand(10000000, 100000000),
            'currency' => 'USD',
            'exchange' => 'NASDAQ',
            'instrumentType' => 'EQUITY',
            'change' => $change,
            'changePercent' => ($change / $prevClose) * 100,
            'fundamentals' => array(
                'marketCap' => $demo['marketCap'],
                'enterpriseValue' => $demo['marketCap'] * 1.1,
                'trailingPE' => $demo['pe'],
                'forwardPE' => $demo['pe'] * 0.9,
                'priceToBook' => rand(2, 15),
                'priceToSales' => rand(2, 10),
                'evToEbitda' => rand(10, 25),
                'evToRevenue' => rand(3, 10),
                'beta' => $demo['beta'],
                'dividendYield' => rand(0, 300) / 100,
                'dividendRate' => rand(0, 5),
                'payoutRatio' => rand(0, 50),
                'profitMargin' => rand(10, 40),
                'operatingMargin' => rand(15, 45),
                'returnOnEquity' => rand(15, 50),
                'returnOnAssets' => rand(5, 25),
                'revenueGrowth' => rand(5, 30),
                'earningsGrowth' => rand(5, 40),
                'totalRevenue' => $demo['marketCap'] / $demo['pe'] * rand(3, 8),
                'ebitda' => $demo['fcf'] * 1.5,
                'freeCashFlow' => $demo['fcf'],
                'operatingCashFlow' => $demo['fcf'] * 1.3,
                'totalDebt' => $demo['marketCap'] * 0.2,
                'totalCash' => $demo['marketCap'] * 0.1,
                'sharesOutstanding' => $demo['shares'],
                'bookValuePerShare' => $price / rand(2, 10),
                'earningsPerShare' => $price / $demo['pe'],
                'sector' => 'Technology',
                'industry' => 'Software',
                'description' => 'Demo data - API temporarily unavailable',
            ),
            'source' => 'demo',
        );
    }

    /**
     * Get fundamental data for valuation
     */
    public function get_fundamentals($ticker)
    {
        $url = "https://query2.finance.yahoo.com/v10/finance/quoteSummary/{$ticker}?modules=defaultKeyStatistics,financialData,summaryDetail";

        $body = $this->make_request($url);

        if (is_wp_error($body)) {
            return $this->get_default_fundamentals();
        }

        $data = json_decode($body, true);

        if (!isset($data['quoteSummary']['result'][0])) {
            return $this->get_default_fundamentals();
        }

        $result = $data['quoteSummary']['result'][0];
        $keyStats = $result['defaultKeyStatistics'] ?? array();
        $financialData = $result['financialData'] ?? array();
        $summaryDetail = $result['summaryDetail'] ?? array();

        return array(
            'marketCap' => $this->extract_raw($summaryDetail['marketCap'] ?? array()),
            'enterpriseValue' => $this->extract_raw($keyStats['enterpriseValue'] ?? array()),
            'trailingPE' => $this->extract_raw($summaryDetail['trailingPE'] ?? array()),
            'forwardPE' => $this->extract_raw($summaryDetail['forwardPE'] ?? array()),
            'priceToBook' => $this->extract_raw($keyStats['priceToBook'] ?? array()),
            'priceToSales' => $this->extract_raw($summaryDetail['priceToSalesTrailing12Months'] ?? array()),
            'evToEbitda' => $this->extract_raw($keyStats['enterpriseToEbitda'] ?? array()),
            'evToRevenue' => $this->extract_raw($keyStats['enterpriseToRevenue'] ?? array()),
            'beta' => $this->extract_raw($keyStats['beta'] ?? array()) ?: 1.0,
            'dividendYield' => $this->extract_raw($summaryDetail['dividendYield'] ?? array()) * 100,
            'dividendRate' => $this->extract_raw($summaryDetail['dividendRate'] ?? array()),
            'payoutRatio' => $this->extract_raw($summaryDetail['payoutRatio'] ?? array()) * 100,
            'profitMargin' => $this->extract_raw($financialData['profitMargins'] ?? array()) * 100,
            'operatingMargin' => $this->extract_raw($financialData['operatingMargins'] ?? array()) * 100,
            'returnOnEquity' => $this->extract_raw($financialData['returnOnEquity'] ?? array()) * 100,
            'returnOnAssets' => $this->extract_raw($financialData['returnOnAssets'] ?? array()) * 100,
            'revenueGrowth' => $this->extract_raw($financialData['revenueGrowth'] ?? array()) * 100,
            'earningsGrowth' => $this->extract_raw($financialData['earningsGrowth'] ?? array()) * 100,
            'totalRevenue' => $this->extract_raw($financialData['totalRevenue'] ?? array()),
            'ebitda' => $this->extract_raw($financialData['ebitda'] ?? array()),
            'freeCashFlow' => $this->extract_raw($financialData['freeCashflow'] ?? array()),
            'operatingCashFlow' => $this->extract_raw($financialData['operatingCashflow'] ?? array()),
            'totalDebt' => $this->extract_raw($financialData['totalDebt'] ?? array()),
            'totalCash' => $this->extract_raw($financialData['totalCash'] ?? array()),
            'sharesOutstanding' => $this->extract_raw($keyStats['sharesOutstanding'] ?? array()),
            'bookValuePerShare' => $this->extract_raw($keyStats['bookValue'] ?? array()),
            'earningsPerShare' => $this->extract_raw($summaryDetail['trailingEps'] ?? $keyStats['trailingEps'] ?? array()),
            'sector' => '',
            'industry' => '',
            'description' => '',
        );
    }

    /**
     * Get technical analysis data
     */
    public function get_technicals($ticker, $timeframe = '1Y')
    {
        $ticker = strtoupper(sanitize_text_field($ticker));

        // Map timeframe to Yahoo Finance parameters
        $ranges = array(
            '1M' => '1mo',
            '3M' => '3mo',
            '6M' => '6mo',
            '1Y' => '1y',
            '2Y' => '2y',
            '5Y' => '5y',
            '10Y' => '10y',
            'MAX' => 'max',
        );

        $range = $ranges[$timeframe] ?? '1y';
        $interval = '1d';
        if (in_array($timeframe, array('1Y', '2Y')))
            $interval = '1wk';
        if (in_array($timeframe, array('5Y', '10Y', 'MAX')))
            $interval = '1mo';

        $url = "https://query1.finance.yahoo.com/v8/finance/chart/{$ticker}?interval={$interval}&range={$range}";

        $body = $this->make_request($url);

        if (is_wp_error($body)) {
            return $this->get_demo_technicals($ticker, $timeframe);
        }

        $data = json_decode($body, true);

        if (!isset($data['chart']['result'][0])) {
            return $this->get_demo_technicals($ticker, $timeframe);
        }

        $result = $data['chart']['result'][0];
        $meta = $result['meta'];
        $timestamps = $result['timestamp'] ?? array();
        $quotes = $result['indicators']['quote'][0] ?? array();

        // Build chart data
        $chartData = array();
        foreach ($timestamps as $i => $ts) {
            if (isset($quotes['close'][$i]) && $quotes['close'][$i] !== null) {
                $chartData[] = array(
                    'date' => date('Y-m-d', $ts),
                    'timestamp' => $ts,
                    'open' => round($quotes['open'][$i] ?? 0, 2),
                    'high' => round($quotes['high'][$i] ?? 0, 2),
                    'low' => round($quotes['low'][$i] ?? 0, 2),
                    'close' => round($quotes['close'][$i] ?? 0, 2),
                    'volume' => $quotes['volume'][$i] ?? 0,
                );
            }
        }

        if (empty($chartData)) {
            return $this->get_demo_technicals($ticker, $timeframe);
        }

        return $this->build_technicals_response($ticker, $timeframe, $chartData, $meta['regularMarketPrice'] ?? 0, 'live');
    }

    /**
     * Get demo technicals data
     */
    private function get_demo_technicals($ticker, $timeframe)
    {
        // Generate demo chart data
        $days = array('1M' => 22, '3M' => 66, '6M' => 130, '1Y' => 52, '2Y' => 104, '5Y' => 60, '10Y' => 120);
        $numPoints = $days[$timeframe] ?? 52;

        $basePrice = rand(50, 300);
        $chartData = array();
        $currentDate = time();

        for ($i = $numPoints; $i >= 0; $i--) {
            $dayOffset = $i * ($timeframe === '1M' ? 86400 : ($timeframe === '1Y' ? 604800 : 2592000));
            $date = $currentDate - $dayOffset;

            $volatility = rand(-5, 5);
            $trend = ($numPoints - $i) * 0.1;  // Slight upward trend
            $price = $basePrice + $trend + $volatility;

            $chartData[] = array(
                'date' => date('Y-m-d', $date),
                'timestamp' => $date,
                'open' => round($price - rand(0, 3), 2),
                'high' => round($price + rand(1, 5), 2),
                'low' => round($price - rand(1, 5), 2),
                'close' => round($price, 2),
                'volume' => rand(5000000, 50000000),
            );
        }

        $currentPrice = end($chartData)['close'];

        return $this->build_technicals_response($ticker, $timeframe, $chartData, $currentPrice, 'demo');
    }

    /**
     * Build technicals response
     */
    private function build_technicals_response($ticker, $timeframe, $chartData, $currentPrice, $source)
    {
        $closes = array_column($chartData, 'close');
        $highs = array_column($chartData, 'high');
        $lows = array_column($chartData, 'low');

        return array(
            'ticker' => $ticker,
            'currentPrice' => $currentPrice,
            'timeframe' => $timeframe,
            'chart' => $chartData,
            'movingAverages' => $this->calculate_moving_averages($closes),
            'rsi' => $this->calculate_rsi($closes),
            'macd' => $this->calculate_macd($closes),
            'bollingerBands' => $this->calculate_bollinger_bands($closes),
            'pivotPoints' => $this->calculate_pivot_points($highs, $lows, $closes),
            'supportResistance' => $this->calculate_support_resistance($highs, $lows, $closes),
            'source' => $source,
        );
    }

    /**
     * Get news for a ticker
     */
    public function get_news($ticker, $count = 10)
    {
        $ticker = strtoupper(sanitize_text_field($ticker));

        $url = "https://query2.finance.yahoo.com/v1/finance/search?q={$ticker}&newsCount={$count}&enableNavLinks=false";

        $body = $this->make_request($url);

        if (is_wp_error($body)) {
            return $this->get_demo_news($ticker);
        }

        $data = json_decode($body, true);

        $news = array();

        if (isset($data['news'])) {
            foreach ($data['news'] as $item) {
                $news[] = array(
                    'title' => $item['title'] ?? '',
                    'link' => $item['link'] ?? '#',
                    'publisher' => $item['publisher'] ?? '',
                    'publishedAt' => isset($item['providerPublishTime']) ? date('Y-m-d H:i:s', $item['providerPublishTime']) : '',
                    'thumbnail' => $item['thumbnail']['resolutions'][0]['url'] ?? '',
                    'relatedTickers' => $item['relatedTickers'] ?? array(),
                );
            }
        }

        if (empty($news)) {
            return $this->get_demo_news($ticker);
        }

        return array(
            'ticker' => $ticker,
            'news' => $news,
            'count' => count($news),
            'source' => 'live',
        );
    }

    /**
     * Get demo news
     */
    private function get_demo_news($ticker)
    {
        $demo_news = array(
            array(
                'title' => "{$ticker} Reports Strong Quarterly Earnings, Beats Analyst Expectations",
                'link' => '#',
                'publisher' => 'Financial Times',
                'publishedAt' => date('Y-m-d H:i:s', time() - 3600),
                'thumbnail' => '',
                'relatedTickers' => array($ticker),
            ),
            array(
                'title' => "Analysts Upgrade {$ticker} Stock Rating to 'Buy'",
                'link' => '#',
                'publisher' => 'Reuters',
                'publishedAt' => date('Y-m-d H:i:s', time() - 7200),
                'thumbnail' => '',
                'relatedTickers' => array($ticker),
            ),
            array(
                'title' => "{$ticker} Announces New Product Launch for Next Quarter",
                'link' => '#',
                'publisher' => 'Bloomberg',
                'publishedAt' => date('Y-m-d H:i:s', time() - 14400),
                'thumbnail' => '',
                'relatedTickers' => array($ticker),
            ),
            array(
                'title' => "Market Watch: {$ticker} Shows Positive Momentum Amid Sector Rally",
                'link' => '#',
                'publisher' => 'MarketWatch',
                'publishedAt' => date('Y-m-d H:i:s', time() - 28800),
                'thumbnail' => '',
                'relatedTickers' => array($ticker),
            ),
            array(
                'title' => "Institutional Investors Increase Holdings in {$ticker}",
                'link' => '#',
                'publisher' => 'CNBC',
                'publishedAt' => date('Y-m-d H:i:s', time() - 43200),
                'thumbnail' => '',
                'relatedTickers' => array($ticker),
            ),
        );

        return array(
            'ticker' => $ticker,
            'news' => $demo_news,
            'count' => count($demo_news),
            'source' => 'demo',
        );
    }

    /**
     * Helper: Extract raw value from Yahoo Finance data structure
     */
    private function extract_raw($data)
    {
        if (is_array($data) && isset($data['raw'])) {
            return $data['raw'];
        }
        if (is_numeric($data)) {
            return $data;
        }
        return 0;
    }

    /**
     * Get default fundamentals when API fails
     */
    private function get_default_fundamentals()
    {
        return array(
            'marketCap' => 0,
            'enterpriseValue' => 0,
            'trailingPE' => 0,
            'forwardPE' => 0,
            'priceToBook' => 0,
            'priceToSales' => 0,
            'evToEbitda' => 0,
            'evToRevenue' => 0,
            'beta' => 1.0,
            'dividendYield' => 0,
            'dividendRate' => 0,
            'payoutRatio' => 0,
            'profitMargin' => 0,
            'operatingMargin' => 0,
            'returnOnEquity' => 0,
            'returnOnAssets' => 0,
            'revenueGrowth' => 0,
            'earningsGrowth' => 0,
            'totalRevenue' => 0,
            'ebitda' => 0,
            'freeCashFlow' => 0,
            'operatingCashFlow' => 0,
            'totalDebt' => 0,
            'totalCash' => 0,
            'sharesOutstanding' => 0,
            'bookValuePerShare' => 0,
            'earningsPerShare' => 0,
            'sector' => '',
            'industry' => '',
            'description' => '',
        );
    }

    /**
     * Calculate Moving Averages
     */
    private function calculate_moving_averages($closes)
    {
        $count = count($closes);

        return array(
            'sma20' => $count >= 20 ? round(array_sum(array_slice($closes, -20)) / 20, 2) : null,
            'sma50' => $count >= 50 ? round(array_sum(array_slice($closes, -50)) / 50, 2) : null,
            'sma200' => $count >= 200 ? round(array_sum(array_slice($closes, -200)) / 200, 2) : null,
            'ema12' => $this->calculate_ema($closes, 12),
            'ema26' => $this->calculate_ema($closes, 26),
        );
    }

    /**
     * Calculate EMA
     */
    private function calculate_ema($data, $period)
    {
        if (count($data) < $period)
            return null;

        $multiplier = 2 / ($period + 1);
        $ema = array_sum(array_slice($data, 0, $period)) / $period;

        for ($i = $period; $i < count($data); $i++) {
            $ema = ($data[$i] - $ema) * $multiplier + $ema;
        }

        return round($ema, 2);
    }

    /**
     * Calculate RSI
     */
    private function calculate_rsi($closes, $period = 14)
    {
        if (count($closes) < $period + 1) {
            return array('value' => 50, 'signal' => 'NEUTRAL');
        }

        $gains = array();
        $losses = array();

        for ($i = 1; $i < count($closes); $i++) {
            $diff = $closes[$i] - $closes[$i - 1];
            $gains[] = $diff > 0 ? $diff : 0;
            $losses[] = $diff < 0 ? abs($diff) : 0;
        }

        $avgGain = array_sum(array_slice($gains, -$period)) / $period;
        $avgLoss = array_sum(array_slice($losses, -$period)) / $period;

        if ($avgLoss == 0) {
            $rsi = 100;
        } else {
            $rs = $avgGain / $avgLoss;
            $rsi = 100 - (100 / (1 + $rs));
        }

        $rsi = round($rsi, 2);

        $signal = 'NEUTRAL';
        if ($rsi >= 70)
            $signal = 'OVERBOUGHT';
        if ($rsi <= 30)
            $signal = 'OVERSOLD';

        return array('value' => $rsi, 'signal' => $signal);
    }

    /**
     * Calculate MACD
     */
    private function calculate_macd($closes)
    {
        $ema12 = $this->calculate_ema($closes, 12);
        $ema26 = $this->calculate_ema($closes, 26);

        if ($ema12 === null || $ema26 === null) {
            return array('macd' => 0, 'signal' => 0, 'histogram' => 0);
        }

        $macd = round($ema12 - $ema26, 2);
        $signalLine = $macd * 0.8;

        return array(
            'macd' => $macd,
            'signal' => round($signalLine, 2),
            'histogram' => round($macd - $signalLine, 2),
        );
    }

    /**
     * Calculate Bollinger Bands
     */
    private function calculate_bollinger_bands($closes, $period = 20, $stdDev = 2)
    {
        if (count($closes) < $period) {
            $last = end($closes) ?: 100;
            return array('upper' => $last * 1.1, 'middle' => $last, 'lower' => $last * 0.9);
        }

        $slice = array_slice($closes, -$period);
        $sma = array_sum($slice) / $period;

        $variance = 0;
        foreach ($slice as $val) {
            $variance += pow($val - $sma, 2);
        }
        $variance /= $period;
        $std = sqrt($variance);

        return array(
            'upper' => round($sma + ($stdDev * $std), 2),
            'middle' => round($sma, 2),
            'lower' => round($sma - ($stdDev * $std), 2),
        );
    }

    /**
     * Calculate Pivot Points
     */
    private function calculate_pivot_points($highs, $lows, $closes)
    {
        if (empty($highs) || empty($lows) || empty($closes)) {
            return array('pp' => 0, 'r1' => 0, 'r2' => 0, 'r3' => 0, 's1' => 0, 's2' => 0, 's3' => 0);
        }

        $high = end($highs);
        $low = end($lows);
        $close = end($closes);

        $pp = round(($high + $low + $close) / 3, 2);

        return array(
            'pp' => $pp,
            'r1' => round(2 * $pp - $low, 2),
            'r2' => round($pp + ($high - $low), 2),
            'r3' => round($high + 2 * ($pp - $low), 2),
            's1' => round(2 * $pp - $high, 2),
            's2' => round($pp - ($high - $low), 2),
            's3' => round($low - 2 * ($high - $pp), 2),
        );
    }

    /**
     * Calculate Support and Resistance levels
     */
    private function calculate_support_resistance($highs, $lows, $closes)
    {
        if (count($closes) < 5) {
            $last = end($closes) ?: 100;
            return array(
                'support' => array(round($last * 0.95, 2), round($last * 0.90, 2), round($last * 0.85, 2)),
                'resistance' => array(round($last * 1.05, 2), round($last * 1.10, 2), round($last * 1.15, 2)),
            );
        }

        $supports = array();
        $resistances = array();

        for ($i = 2; $i < count($closes) - 2; $i++) {
            if (
                $lows[$i] < $lows[$i - 1] && $lows[$i] < $lows[$i - 2] &&
                $lows[$i] < $lows[$i + 1] && $lows[$i] < $lows[$i + 2]
            ) {
                $supports[] = $lows[$i];
            }

            if (
                $highs[$i] > $highs[$i - 1] && $highs[$i] > $highs[$i - 2] &&
                $highs[$i] > $highs[$i + 1] && $highs[$i] > $highs[$i + 2]
            ) {
                $resistances[] = $highs[$i];
            }
        }

        // Ensure we have some values
        if (empty($supports)) {
            $last = end($closes) ?: 100;
            $supports = array($last * 0.95, $last * 0.90, $last * 0.85);
        }
        if (empty($resistances)) {
            $last = end($closes) ?: 100;
            $resistances = array($last * 1.05, $last * 1.10, $last * 1.15);
        }

        $supports = array_unique($supports);
        $resistances = array_unique($resistances);

        sort($supports);
        rsort($resistances);

        return array(
            'support' => array_map(function ($v) {
                return round($v, 2);
            }, array_slice($supports, -3)),
            'resistance' => array_map(function ($v) {
                return round($v, 2);
            }, array_slice($resistances, 0, 3)),
        );
    }
}
