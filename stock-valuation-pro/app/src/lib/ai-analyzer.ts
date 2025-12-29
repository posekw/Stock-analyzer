import { LLMProvider } from '@/stores/settingsStore';

export interface NewsArticle {
    uuid: string;
    title: string;
    link: string;
    publisher: string;
    publishTime: number | Date | string;
    thumbnail: string | null;
    relatedTickers: string[];
}

export interface FairPriceImpact {
    direction: 'UP' | 'DOWN' | 'NEUTRAL';
    percentageEstimate: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    reasoning: string;
}
export interface TradingSignal {
    fairValueRange: { min: number, max: number };
    supportLevel: { min: number, max: number };
    resistanceLevel: { min: number, max: number };
    strategy: string;
}

export interface NewsAnalysisResult {
    summary: string;
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    sentimentScore: number; // -100 to +100
    fairPriceImpact: FairPriceImpact;
    tradingSignal?: TradingSignal;
    keyInsights: string[];
    risks: string[];
    catalysts: string[];
    analyzedAt: string;
    model: string;
    isSimulated?: boolean;
}

const ANALYSIS_PROMPT = (ticker: string, currentPrice: number, newsContent: string) => `
You are a senior equity research analyst with 20+ years of experience. Analyze the following news articles for ${ticker}.

CURRENT MARKET DATA:
• Current Market Price: $${currentPrice > 0 ? currentPrice.toFixed(2) : 'Unknown'}

INSTRUCTIONS:
1. Analyze the provided news articles below
2. Assess how the news affects the stock's fair value
3. ESTIMATE the stock's Fair Value Range (Intrinsic Value) based on fundamentals.
4. IDENTIFY key Support (Buy Zone) and Resistance levels based on technical analysis or price action.
5. Provide sentiment, key insights, risks, and catalysts.

IMPORTANT: You must respond with ONLY valid JSON, no other text.

Provide your analysis in this exact JSON format:
{
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "sentimentScore": <number from -100 to +100>,
  "fairPriceImpact": {
    "direction": "UP" | "DOWN" | "NEUTRAL",
    "percentageEstimate": <estimated impact on fair value as percentage, e.g. 5 for +5%>,
    "confidence": "HIGH" | "MEDIUM" | "LOW",
    "reasoning": "Brief explanation of how the news affects valuation"
  },
  "tradingSignal": {
    "fairValueRange": { "min": <number>, "max": <number> },
    "supportLevel": { "min": <number>, "max": <number> },
    "resistanceLevel": { "min": <number>, "max": <number> },
    "strategy": "Actionable trading advice, e.g. 'Accumulate between $180-$185' or 'Wait for pullback'"
  },
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "risks": ["risk 1", "risk 2"],
  "catalysts": ["catalyst 1", "catalyst 2"],
  "summary": "2-3 paragraph comprehensive summary of the news analysis and your recommendation"
}

NEWS ARTICLES PROVIDED:
${newsContent}

Remember: Respond with ONLY the JSON object, no markdown code blocks or other text.
`;



async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a senior equity research analyst. Always respond with valid JSON only.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 2000,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
    // Dynamic Model Discovery: Fetch valid models for this specific API key first
    let attempts: { version: string, model: string }[] = [];

    try {
        const discoveryUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const discoveryParams = { method: 'GET', headers: { 'Content-Type': 'application/json' } };
        const discoveryRes = await fetch(discoveryUrl, discoveryParams);

        if (discoveryRes.ok) {
            const data = await discoveryRes.json();
            const validModels = (data.models || [])
                .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
                .map((m: any) => m.name.replace('models/', ''));

            // Sort models to prefer newer models with better quota availability
            validModels.sort((a: string, b: string) => {
                const getScore = (name: string) => {
                    // Prioritize gemini-3-flash (newest, often has more quota)
                    if (name.includes('gemini-3-flash')) return 15;
                    // Then gemini-2.5-flash-lite (lighter, less quota usage)
                    if (name.includes('2.5-flash-lite')) return 12;
                    // Then other 2.5 flash variants
                    if (name.includes('2.5-flash')) return 10;
                    if (name.includes('1.5-flash')) return 8;
                    if (name.includes('1.5-pro')) return 6;
                    if (name.includes('flash')) return 4;
                    return 1;
                };
                return getScore(b) - getScore(a);
            });

            if (validModels.length > 0) {
                // creating a unique set of models to try
                attempts = validModels.slice(0, 3).map((m: string) => ({ version: 'v1beta', model: m }));
                console.log('Dynamically discovered Gemini models:', attempts);
            }
        }
    } catch (e) {
        console.warn('Failed to discover Gemini models, using fallback list', e);
    }

    // Fallback hardcoded list if discovery failed or found nothing
    if (attempts.length === 0) {
        attempts = [
            { version: 'v1beta', model: 'gemini-3-flash' },
            { version: 'v1beta', model: 'gemini-2.5-flash-lite' },
            { version: 'v1beta', model: 'gemini-1.5-flash' },
        ];
    }

    // Execute calls
    let lastError: Error | null = null;
    const errors: string[] = [];

    for (const { version, model } of attempts) {
        try {
            const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 4000
                    }
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    console.log(`Gemini: Success with ${version}/${model}`);
                    return text;
                }
            } else {
                const errorData = await response.json();
                const errorMsg = errorData.error?.message || `${version}/${model} status ${response.status}`;

                // Log and continue instead of throwing immediately
                errors.push(`${model}: ${errorMsg}`);
                console.warn(`Gemini ${version}/${model} failed:`, errorMsg);

                // Only track specific quota errors for final reporting
                if (errorMsg.toLowerCase().includes('quota')) {
                    lastError = new Error('Gemini API quota exceeded');
                } else {
                    lastError = new Error(errorMsg);
                }
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Network error';
            errors.push(`${model}: ${msg}`);
            lastError = e instanceof Error ? e : new Error('Unknown error');
        }
    }

    // Provide helpful error message
    const errorDetails = errors.slice(0, 2).join(' | ');
    throw new Error(`Gemini Analysis Failed. Details: ${errorDetails}. Hint: Check API key permissions.`);
}

function parseAnalysisResponse(response: string): Omit<NewsAnalysisResult, 'analyzedAt' | 'model'> {
    // Robust JSON extraction using Regex to find the first { ... } block
    let cleaned = response.trim();

    // Attempt to find the first JSON object if there's extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleaned = jsonMatch[0];
    }

    try {
        const parsed = JSON.parse(cleaned);

        // Helper to normalize sentiment
        const normalizeSentiment = (val: string): 'BULLISH' | 'BEARISH' | 'NEUTRAL' => {
            const up = (val || '').toUpperCase();
            if (up.includes('BULL')) return 'BULLISH';
            if (up.includes('BEAR')) return 'BEARISH';
            return 'NEUTRAL';
        };

        const sentiment = normalizeSentiment(parsed.sentiment);

        // Safe extraction of nested objects
        const impact = parsed.fairPriceImpact || {};

        return {
            summary: parsed.summary || 'Summary not found in response.',
            sentiment,
            sentimentScore: typeof parsed.sentimentScore === 'number' ? parsed.sentimentScore : 0,
            fairPriceImpact: {
                direction: ['UP', 'DOWN'].includes((impact.direction || '').toUpperCase())
                    ? (impact.direction || '').toUpperCase() as 'UP' | 'DOWN'
                    : 'NEUTRAL',
                percentageEstimate: typeof impact.percentageEstimate === 'number' ? impact.percentageEstimate : 0,
                confidence: ['HIGH', 'MEDIUM', 'LOW'].includes((impact.confidence || '').toUpperCase())
                    ? (impact.confidence || '').toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW'
                    : 'LOW',
                reasoning: impact.reasoning || 'No specific price impact reasoning provided.',
            },
            tradingSignal: parsed.tradingSignal ? {
                fairValueRange: {
                    min: typeof parsed.tradingSignal.fairValueRange?.min === 'number' ? parsed.tradingSignal.fairValueRange.min : 0,
                    max: typeof parsed.tradingSignal.fairValueRange?.max === 'number' ? parsed.tradingSignal.fairValueRange.max : 0,
                },
                supportLevel: {
                    min: typeof parsed.tradingSignal.supportLevel?.min === 'number' ? parsed.tradingSignal.supportLevel.min : 0,
                    max: typeof parsed.tradingSignal.supportLevel?.max === 'number' ? parsed.tradingSignal.supportLevel.max : 0,
                },
                resistanceLevel: {
                    min: typeof parsed.tradingSignal.resistanceLevel?.min === 'number' ? parsed.tradingSignal.resistanceLevel.min : 0,
                    max: typeof parsed.tradingSignal.resistanceLevel?.max === 'number' ? parsed.tradingSignal.resistanceLevel.max : 0,
                },
                strategy: parsed.tradingSignal.strategy || 'No strategy provided.',
            } : undefined,
            keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
            risks: Array.isArray(parsed.risks) ? parsed.risks : [],
            catalysts: Array.isArray(parsed.catalysts) ? parsed.catalysts : [],
        };
    } catch (parseError) {
        console.warn('JSON Parse failed, attempting Regex Scrape:', parseError);

        // --- HYBRID REGEX FALLBACK ---
        // If JSON fails, try to scrape fields directly from the string

        // 1. Extract Sentiment
        let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
        const sentMatch = response.match(/"sentiment"\s*:\s*"(\w+)"/i);
        if (sentMatch) {
            const val = sentMatch[1].toUpperCase();
            if (val.includes('BULL')) sentiment = 'BULLISH';
            else if (val.includes('BEAR')) sentiment = 'BEARISH';
        }

        // 2. Extract Summary
        let summary = 'Could not extract summary from response.';
        const sumMatch = response.match(/"summary"\s*:\s*"([^"]+)"/); // Simple scraping
        if (sumMatch) {
            summary = sumMatch[1];
        } else {
            // Fallback: take the first long text block
            const parts = response.split('"');
            const longPart = parts.find(p => p.length > 50);
            if (longPart) summary = longPart;
        }
        // 3. Extract Percentage Estimate
        let percentageEstimate = 0;
        const pctMatch = response.match(/"percentageEstimate"\s*:\s*(-?\d+(\.\d+)?)/);
        if (pctMatch) {
            percentageEstimate = parseFloat(pctMatch[1]);
        }

        // 4. Extract Sentiment Score
        let sentimentScore = 0;
        const scoreMatch = response.match(/"sentimentScore"\s*:\s*(-?\d+)/);
        if (scoreMatch) {
            sentimentScore = parseInt(scoreMatch[1]);
        }

        return {
            summary: summary + ' (Note: Partially parsed content)',
            sentiment,
            sentimentScore,
            fairPriceImpact: {
                direction: percentageEstimate > 0 ? 'UP' : percentageEstimate < 0 ? 'DOWN' : 'NEUTRAL',
                percentageEstimate,
                confidence: 'LOW',
                reasoning: 'Could not parse detailed reasoning.',
            },
            keyInsights: ['Data parsing incomplete due to API format issue.'],
            risks: [],
            catalysts: [],
        } as any;
    }
}

export async function translateAnalysis(analysis: NewsAnalysisResult, apiKey: string, completionFn: any): Promise<NewsAnalysisResult> {
    const prompt = `
    You are a professional financial translator. Translate the following stock analysis JSON content into professional Arabic.
    
    IMPORTANT RULES:
    1. Translate 'summary', 'keyInsights', 'risks', 'catalysts', 'fairPriceImpact.reasoning', and 'tradingSignal.strategy' into Arabic.
    2. DO NOT translate 'sentiment' (keep as BULLISH/BEARISH/NEUTRAL).
    3. DO NOT translate 'fairPriceImpact.direction' (keep as UP/DOWN/NEUTRAL).
    4. DO NOT translate 'fairPriceImpact.confidence'.
    5. Keep numbers and percentages as is.
    6. Return ONLY the JSON object.

    Input JSON:
    ${JSON.stringify(analysis, null, 2)}
    `;

    try {
        let translatedText = '';
        if (apiKey.startsWith('sk-')) {
            translatedText = await callOpenAI(prompt, apiKey);
        } else {
            translatedText = await callGemini(prompt, apiKey);
        }

        // Clean markdown code blocks if present
        let cleaned = translatedText.replace(/```json/g, '').replace(/```/g, '').trim();

        // Find the first '{' and last '}' to ensure valid JSON
        const firstOpen = cleaned.indexOf('{');
        const lastClose = cleaned.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose !== -1) {
            cleaned = cleaned.substring(firstOpen, lastClose + 1);
        }

        const translatedJson = JSON.parse(cleaned);

        // Merge with original to ensure safety
        return {
            ...analysis,
            summary: translatedJson.summary || analysis.summary,
            keyInsights: Array.isArray(translatedJson.keyInsights) ? translatedJson.keyInsights : analysis.keyInsights,
            risks: Array.isArray(translatedJson.risks) ? translatedJson.risks : analysis.risks,
            catalysts: Array.isArray(translatedJson.catalysts) ? translatedJson.catalysts : analysis.catalysts,
            fairPriceImpact: {
                ...analysis.fairPriceImpact,
                reasoning: translatedJson.fairPriceImpact?.reasoning || analysis.fairPriceImpact.reasoning
            },
            tradingSignal: analysis.tradingSignal ? {
                ...analysis.tradingSignal,
                strategy: translatedJson.tradingSignal?.strategy || analysis.tradingSignal.strategy
            } : undefined
        };

    } catch (error) {
        console.error('Translation failed:', error);
        throw new Error('Failed to translate analysis: ' + (error instanceof Error ? error.message : String(error)));
    }
}

export async function analyzeNews(
    news: NewsArticle[],
    ticker: string,
    currentPrice: number,
    provider: LLMProvider,
    apiKey: string
): Promise<NewsAnalysisResult> {
    if (!news || news.length === 0) {
        throw new Error('No news articles to analyze');
    }

    if (!apiKey) {
        throw new Error('API key is required');
    }

    // Format news content for the prompt
    const newsContent = news
        .map((article, index) => {
            const date = new Date(article.publishTime).toLocaleDateString();
            return `[${index + 1}] ${article.title}\n   Source: ${article.publisher} | Date: ${date}`;
        })
        .join('\n\n');

    const prompt = ANALYSIS_PROMPT(ticker, currentPrice, newsContent);

    let rawResponse: string;
    let model: string;

    try {
        if (provider === 'openai') {
            rawResponse = await callOpenAI(prompt, apiKey);
            model = 'GPT-4o-mini';
        } else if (provider === 'gemini') {
            rawResponse = await callGemini(prompt, apiKey);
            model = 'Gemini 3.0 Flash';
        } else {
            throw new Error(`Unsupported provider: ${provider}`);
        }

        const analysis = parseAnalysisResponse(rawResponse);

        return {
            ...analysis,
            analyzedAt: new Date().toISOString(),
            model,
        };
    } catch (error) {
        console.warn('AI Analysis failed, falling back to local simulation:', error);
        return generateSimulatedAnalysis(news, ticker, error instanceof Error ? error.message : 'API Error');
    }
}

function generateSimulatedAnalysis(news: NewsArticle[], ticker: string, errorMessage: string): NewsAnalysisResult {
    // Simple keyword-based sentiment analysis
    const bullishKeywords = ['up', 'rise', 'surgy', 'growth', 'profit', 'beat', 'record', 'high', 'buy', 'outperform', 'upgrade', 'strong', 'gain', 'positive', 'soars', 'jumps'];
    const bearishKeywords = ['down', 'drop', 'fall', 'loss', 'miss', 'low', 'sell', 'underperform', 'downgrade', 'weak', 'decline', 'negative', 'crash', 'slump', 'plunges', 'tumbles'];

    let score = 0;
    const insights: string[] = [];
    const usedTitles: string[] = [];

    news.forEach(n => {
        const title = n.title.toLowerCase();
        let hit = false;

        bullishKeywords.forEach(k => {
            if (title.includes(k) && !hit) {
                score += 10;
                hit = true;
                if (usedTitles.length < 4) {
                    insights.push(`Positive signal: "${n.title}"`);
                    usedTitles.push(n.title);
                }
            }
        });

        if (!hit) {
            bearishKeywords.forEach(k => {
                if (title.includes(k) && !hit) {
                    score -= 10;
                    hit = true;
                    if (usedTitles.length < 4) {
                        insights.push(`Negative signal: "${n.title}"`);
                        usedTitles.push(n.title);
                    }
                }
            });
        }
    });

    // Clamp score
    score = Math.max(-100, Math.min(100, score));

    const sentiment = score >= 20 ? 'BULLISH' : score <= -20 ? 'BEARISH' : 'NEUTRAL';
    const impactDir = score >= 20 ? 'UP' : score <= -20 ? 'DOWN' : 'NEUTRAL';
    const impactPct = Math.round(Math.abs(score) / 10);

    const friendlyError = errorMessage.includes('quota')
        ? 'API key quota validation failed'
        : `External AI error: ${errorMessage}`;

    return {
        summary: `⚠️ **Analysis generated locally (Fallback Mode)**\n\nThe AI service encountered an error (${friendlyError}).\n\nThis simplified analysis is based on keyword matching from ${news.length} recent headlines. Actual AI analysis provides deeper insights when the API is available.`,
        sentiment,
        sentimentScore: score,
        fairPriceImpact: {
            direction: impactDir,
            percentageEstimate: impactPct,
            confidence: 'LOW',
            reasoning: 'Rough estimate based on headline keyword frequency (Fallback Mode)',
        },
        keyInsights: insights.length > 0 ? insights : ['No strong sentiment keywords found in recent headlines.'],
        risks: ['Analysis limited to headline keywords.', 'Check API key or quota status.'],
        catalysts: ['Reconnect API for deeper analysis.'],
        analyzedAt: new Date().toISOString(),
        model: 'Local Simulation (Fallback)',
        isSimulated: true,
    };
}
